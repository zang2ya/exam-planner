import { NextResponse } from "next/server";

import { upsertDiaryRecord } from "@/lib/google-sheets";
import { createId } from "@/lib/utils";
import { diarySchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const parsed = diarySchema.parse(await request.json());
    const payload = { ...parsed, id: parsed.id || createId("diary") };
    await upsertDiaryRecord(payload);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "INVALID_REQUEST" }, { status: 400 });
  }
}
