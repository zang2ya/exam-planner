import { NextResponse } from "next/server";

import { createSheetRecord } from "@/lib/google-sheets";
import { createId } from "@/lib/utils";
import { examSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const parsed = examSchema.parse(await request.json());
    const payload = { ...parsed, id: parsed.id || createId("exam") };
    await createSheetRecord("Exams", payload);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "INVALID_REQUEST" }, { status: 400 });
  }
}
