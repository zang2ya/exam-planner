import { NextResponse } from "next/server";

import { getBootstrap } from "@/lib/google-sheets";

export async function GET() {
  try {
    const payload = await getBootstrap();
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
