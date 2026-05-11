import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function handleZodError(e: unknown) {
  if (e instanceof ZodError) {
    return err(e.errors.map((x) => x.message).join("; "), 400);
  }
  console.error(e);
  return err("Internal server error", 500);
}
