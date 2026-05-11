import { NextResponse } from "next/server";
import { pool } from "@/lib/db/client";

export async function GET() {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return NextResponse.json({ ok: true, db: true });
  } catch {
    return NextResponse.json({ ok: false, db: false }, { status: 503 });
  }
}
