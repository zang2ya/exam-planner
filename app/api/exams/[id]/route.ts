import { NextResponse } from "next/server";

import { deleteSheetRecord, updateSheetRecord } from "@/lib/google-sheets";
import { examSchema } from "@/lib/validations";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = examSchema.parse(await request.json());
    const payload = { ...parsed, id };
    await updateSheetRecord("Exams", id, payload);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "INVALID_REQUEST" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteSheetRecord("Exams", id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DELETE_FAILED" }, { status: 400 });
  }
}
