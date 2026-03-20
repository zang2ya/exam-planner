import { NextResponse } from "next/server";

import { upsertSettingsRecord } from "@/lib/google-sheets";
import { settingsSchema } from "@/lib/validations";

export async function PATCH(request: Request) {
  try {
    const parsed = settingsSchema.parse(await request.json());
    const payload = { ...parsed, id: parsed.id || "settings_default" };
    await upsertSettingsRecord(payload);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "INVALID_REQUEST" }, { status: 400 });
  }
}
