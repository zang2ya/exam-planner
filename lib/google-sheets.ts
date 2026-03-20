import { google, sheets_v4 } from "googleapis";

import { auth } from "@/lib/auth";
import { buildBootstrapData, createRecord, deleteRecord, updateRecord, upsertDiary, upsertSettings } from "@/lib/sheets-store";

function getOAuthClient(accessToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  client.setCredentials({ access_token: accessToken });
  return client;
}

export async function getGoogleClients() {
  const session = await auth();

  if (!session?.accessToken || !session.user?.email) {
    throw new Error("UNAUTHORIZED");
  }

  const oauth2Client = getOAuthClient(session.accessToken);
  const sheets = google.sheets({ version: "v4", auth: oauth2Client });
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  return {
    sheets,
    drive,
    email: session.user.email,
  };
}

export async function getBootstrap() {
  const { sheets, drive, email } = await getGoogleClients();
  return buildBootstrapData({ sheets, drive, email });
}

export async function createSheetRecord<T extends Record<string, unknown>>(sheetTitle: string, value: T) {
  const { sheets, drive, email } = await getGoogleClients();
  return createRecord({ sheets, drive, email, sheetTitle, value });
}

export async function updateSheetRecord<T extends Record<string, unknown>>(sheetTitle: string, id: string, value: T) {
  const { sheets, drive, email } = await getGoogleClients();
  return updateRecord({ sheets, drive, email, sheetTitle, id, value });
}

export async function deleteSheetRecord(sheetTitle: string, id: string) {
  const { sheets, drive, email } = await getGoogleClients();
  return deleteRecord({ sheets, drive, email, sheetTitle, id });
}

export async function upsertDiaryRecord<T extends Record<string, unknown>>(value: T) {
  const { sheets, drive, email } = await getGoogleClients();
  return upsertDiary({ sheets, drive, email, value });
}

export async function upsertSettingsRecord<T extends Record<string, unknown>>(value: T) {
  const { sheets, drive, email } = await getGoogleClients();
  return upsertSettings({ sheets, drive, email, value });
}

export type SheetsClient = sheets_v4.Sheets;
