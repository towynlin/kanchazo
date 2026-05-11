import { WebSocketServer, type WebSocket } from "ws";
import { Client } from "pg";
import type { IncomingMessage, Server } from "http";
import { hashToken } from "@/lib/auth/tokens";
import { findSessionByTokenHash } from "@/lib/db/queries/sessions";
import { parse as parseCookie } from "cookie";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

interface TeamSocket {
  ws: WebSocket;
  userId: string;
  teamId: string;
}

const connections = new Map<string, Set<TeamSocket>>();
let pgClient: Client | null = null;

function getConnectionsForTeam(teamId: string): Set<TeamSocket> {
  if (!connections.has(teamId)) connections.set(teamId, new Set());
  return connections.get(teamId)!;
}

async function startPgListener() {
  if (pgClient) return;
  pgClient = new Client({ connectionString: process.env.DATABASE_URL });
  await pgClient.connect();

  pgClient.on("notification", (msg) => {
    const teamId = msg.channel.replace("chat:", "");
    const sockets = connections.get(teamId);
    if (!sockets || sockets.size === 0) return;
    for (const conn of sockets) {
      if (conn.ws.readyState === conn.ws.OPEN) {
        conn.ws.send(msg.payload ?? "{}");
      }
    }
  });

  pgClient.on("error", async () => {
    pgClient = null;
    setTimeout(startPgListener, 5000);
  });
}

async function authenticateRequest(req: IncomingMessage): Promise<string | null> {
  const cookieHeader = req.headers.cookie ?? "";
  const cookies = parseCookie(cookieHeader);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (!rawToken) return null;

  const hash = hashToken(rawToken);
  const session = await findSessionByTokenHash(hash);
  return session?.userId ?? null;
}

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    if (url.pathname !== "/api/ws") {
      socket.destroy();
      return;
    }

    const teamId = url.searchParams.get("team");
    if (!teamId) {
      socket.destroy();
      return;
    }

    const userId = await authenticateRequest(req);
    if (!userId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, userId, teamId);
    });
  });

  wss.on("connection", async (ws: WebSocket, _req: IncomingMessage, userId: string, teamId: string) => {
    const conn: TeamSocket = { ws, userId, teamId };
    const teamConns = getConnectionsForTeam(teamId);
    teamConns.add(conn);

    // Subscribe to this team's Postgres channel if not already
    const channel = `chat:${teamId}`;
    try {
      await startPgListener();
      await pgClient?.query(`LISTEN "${channel}"`);
    } catch {
      // Non-fatal; messages still flow via POST
    }

    ws.on("close", () => {
      teamConns.delete(conn);
    });

    ws.on("error", () => {
      teamConns.delete(conn);
    });
  });

  return wss;
}
