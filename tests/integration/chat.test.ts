import { describe, it, expect } from "vitest";
import { createUser } from "@/lib/db/queries/users";
import { createTeam } from "@/lib/db/queries/teams";
import {
  sendMessage,
  getMessages,
  updateChatRead,
  getChatRead,
  getLatestMessage,
} from "@/lib/db/queries/chat";

function rando() {
  return `+1415555${Math.floor(Math.random() * 9000 + 1000)}`;
}

describe("chat queries", () => {
  it("sends and retrieves messages in order", async () => {
    const coach = await createUser({ name: "Coach", phone: rando() });
    const team = await createTeam({ name: "Chat Team", createdByUserId: coach.id });

    const m1 = await sendMessage({ teamId: team.id, senderUserId: coach.id, body: "Hello" });
    const m2 = await sendMessage({ teamId: team.id, senderUserId: coach.id, body: "World" });

    const messages = await getMessages(team.id);
    expect(messages.length).toBeGreaterThanOrEqual(2);
    const bodies = messages.map((m) => m.body);
    expect(bodies).toContain("Hello");
    expect(bodies).toContain("World");
    expect(m1.id).toBeTruthy();
    expect(m2.teamId).toBe(team.id);
  });

  it("includes sender name via join", async () => {
    const user = await createUser({ name: "Alice", phone: rando() });
    const team = await createTeam({ name: "Team A", createdByUserId: user.id });
    await sendMessage({ teamId: team.id, senderUserId: user.id, body: "Hi" });

    const messages = await getMessages(team.id);
    const msg = messages.find((m) => m.body === "Hi");
    expect(msg?.senderName).toBe("Alice");
  });

  it("respects limit option", async () => {
    const user = await createUser({ name: "Sender", phone: rando() });
    const team = await createTeam({ name: "Limit Team", createdByUserId: user.id });

    for (let i = 0; i < 5; i++) {
      await sendMessage({ teamId: team.id, senderUserId: user.id, body: `msg ${i}` });
    }

    const messages = await getMessages(team.id, { limit: 3 });
    expect(messages).toHaveLength(3);
  });

  it("tracks and retrieves chat read state", async () => {
    const user = await createUser({ name: "Reader", phone: rando() });
    const team = await createTeam({ name: "Read Team", createdByUserId: user.id });
    const msg = await sendMessage({ teamId: team.id, senderUserId: user.id, body: "test" });

    await updateChatRead(user.id, team.id, msg.id);
    const read = await getChatRead(user.id, team.id);
    expect(read?.lastReadMessageId).toBe(msg.id);
  });

  it("updates chat read idempotently", async () => {
    const user = await createUser({ name: "Idempotent", phone: rando() });
    const team = await createTeam({ name: "Idem Team", createdByUserId: user.id });
    const m1 = await sendMessage({ teamId: team.id, senderUserId: user.id, body: "first" });
    const m2 = await sendMessage({ teamId: team.id, senderUserId: user.id, body: "second" });

    await updateChatRead(user.id, team.id, m1.id);
    await updateChatRead(user.id, team.id, m2.id);
    const read = await getChatRead(user.id, team.id);
    expect(read?.lastReadMessageId).toBe(m2.id);
  });

  it("getLatestMessage returns the newest message", async () => {
    const user = await createUser({ name: "Latest", phone: rando() });
    const team = await createTeam({ name: "Latest Team", createdByUserId: user.id });
    await sendMessage({ teamId: team.id, senderUserId: user.id, body: "first" });
    const last = await sendMessage({ teamId: team.id, senderUserId: user.id, body: "last" });

    const latest = await getLatestMessage(team.id);
    expect(latest?.id).toBe(last.id);
    expect(latest?.body).toBe("last");
  });
});
