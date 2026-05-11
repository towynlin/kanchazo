import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/require-auth";
import { ok, err, handleZodError } from "@/lib/api/response";
import { createTeam, getTeamsByUser, addTeamMember } from "@/lib/db/queries/teams";
import { getTeamMembership } from "@/lib/db/queries/teams";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  timeZone: z.string().optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const teams = await getTeamsByUser(auth.user.id);
  return ok(teams);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { name, timeZone } = createSchema.parse(body);

    const team = await createTeam({
      name,
      timeZone: timeZone ?? "America/New_York",
      createdByUserId: auth.user.id,
    });
    // Creator becomes a coach automatically
    await addTeamMember({ teamId: team.id, userId: auth.user.id, role: "coach" });

    return ok(team, 201);
  } catch (e) {
    return handleZodError(e);
  }
}
