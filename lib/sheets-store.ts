import { google, sheets_v4 } from "googleapis";

import { DEFAULT_SETTINGS_ROW, SHEET_HEADERS, SHEET_TITLES } from "@/lib/sheets-schema";
import type { BootstrapPayload, DailyDiary, Settings } from "@/lib/types";

type BuildContext = {
  sheets: sheets_v4.Sheets;
  drive: ReturnType<typeof google.drive>;
  email: string;
};

type SheetName = keyof typeof SHEET_HEADERS;
type SpreadsheetCacheEntry = {
  spreadsheetId: string;
  sheetIds: Partial<Record<SheetName, number>>;
};

const SPREADSHEET_TITLE_PREFIX = "Exam Planner";
const spreadsheetCache = new Map<string, SpreadsheetCacheEntry>();

function spreadsheetTitleFor(email: string) {
  return `${SPREADSHEET_TITLE_PREFIX} - ${email}`;
}

function getCachedSpreadsheet(email: string) {
  return spreadsheetCache.get(email);
}

function setCachedSpreadsheet(email: string, value: SpreadsheetCacheEntry) {
  spreadsheetCache.set(email, value);
  return value;
}

async function findSpreadsheetId(ctx: BuildContext) {
  const cached = getCachedSpreadsheet(ctx.email);
  if (cached?.spreadsheetId) {
    return cached.spreadsheetId;
  }

  const result = await ctx.drive.files.list({
    q: [
      "mimeType='application/vnd.google-apps.spreadsheet'",
      `name='${spreadsheetTitleFor(ctx.email).replace(/'/g, "\\'")}'`,
      "trashed=false",
    ].join(" and "),
    fields: "files(id,name)",
    pageSize: 1,
  });

  const spreadsheetId = result.data.files?.[0]?.id;
  if (spreadsheetId) {
    setCachedSpreadsheet(ctx.email, { spreadsheetId, sheetIds: {} });
  }

  return spreadsheetId;
}

async function createSpreadsheet(ctx: BuildContext) {
  const created = await ctx.sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: spreadsheetTitleFor(ctx.email),
      },
      sheets: SHEET_TITLES.map((title) => ({ properties: { title } })),
    },
  });

  const spreadsheetId = created.data.spreadsheetId;

  if (!spreadsheetId) {
    throw new Error("SPREADSHEET_CREATE_FAILED");
  }

  const sheetIds = Object.fromEntries(
    (created.data.sheets ?? [])
      .map((sheet) => [sheet.properties?.title, sheet.properties?.sheetId] as const)
      .filter((entry): entry is [string, number] => Boolean(entry[0]) && entry[1] !== undefined),
  ) as Partial<Record<SheetName, number>>;

  await ctx.sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        ...SHEET_TITLES.map((title) => ({
          range: `${title}!1:1`,
          values: [SHEET_HEADERS[title] as unknown as string[]],
        })),
        {
          range: "Settings!A2:C2",
          values: [[DEFAULT_SETTINGS_ROW.id, DEFAULT_SETTINGS_ROW.subjects, DEFAULT_SETTINGS_ROW.dailyTargetMinutes]],
        },
      ],
    },
  });

  setCachedSpreadsheet(ctx.email, { spreadsheetId, sheetIds });
  return spreadsheetId;
}

async function getSpreadsheetMetadata(sheets: sheets_v4.Sheets, spreadsheetId: string) {
  return sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.sheetId,sheets.properties.title",
  });
}

async function ensureSpreadsheetStructure(ctx: BuildContext, spreadsheetId: string) {
  const spreadsheet = await getSpreadsheetMetadata(ctx.sheets, spreadsheetId);
  const existingSheets = new Map<SheetName, number>();

  for (const sheet of spreadsheet.data.sheets ?? []) {
    const title = sheet.properties?.title as SheetName | undefined;
    const sheetId = sheet.properties?.sheetId;
    if (title && sheetId !== undefined && sheetId !== null) {
      existingSheets.set(title, sheetId);
    }
  }

  const missingTitles = SHEET_TITLES.filter((title) => !existingSheets.has(title));

  if (missingTitles.length > 0) {
    await ctx.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: missingTitles.map((title) => ({
          addSheet: {
            properties: { title },
          },
        })),
      },
    });
  }

  const finalSpreadsheet = missingTitles.length > 0
    ? await getSpreadsheetMetadata(ctx.sheets, spreadsheetId)
    : spreadsheet;

  const sheetIds = Object.fromEntries(
    (finalSpreadsheet.data.sheets ?? [])
      .map((sheet) => [sheet.properties?.title, sheet.properties?.sheetId] as const)
      .filter((entry): entry is [string, number] => Boolean(entry[0]) && entry[1] !== undefined && entry[1] !== null),
  ) as Partial<Record<SheetName, number>>;

  const headerRanges = SHEET_TITLES.map((title) => `${title}!1:1`);
  const headerResponse = await ctx.sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: headerRanges,
  });

  const updates = SHEET_TITLES.flatMap((title, index) => {
    const current = headerResponse.data.valueRanges?.[index]?.values?.[0] ?? [];
    const expected = [...SHEET_HEADERS[title]];
    if (current.join("|") === expected.join("|")) {
      return [];
    }
    return [{ range: `${title}!1:1`, values: [expected] }];
  });

  if (updates.length > 0) {
    await ctx.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: updates,
      },
    });
  }

  setCachedSpreadsheet(ctx.email, { spreadsheetId, sheetIds });
  return { spreadsheetId, sheetIds };
}

async function getSpreadsheetId(ctx: BuildContext, ensureStructure = false) {
  const cached = getCachedSpreadsheet(ctx.email);
  if (cached?.spreadsheetId && !ensureStructure) {
    return cached.spreadsheetId;
  }

  let spreadsheetId = cached?.spreadsheetId ?? await findSpreadsheetId(ctx);

  if (!spreadsheetId) {
    spreadsheetId = await createSpreadsheet(ctx);
  }

  if (ensureStructure) {
    await ensureSpreadsheetStructure(ctx, spreadsheetId);
  } else if (!cached) {
    setCachedSpreadsheet(ctx.email, { spreadsheetId, sheetIds: {} });
  }

  return spreadsheetId;
}

function objectToRow<T extends Record<string, unknown>>(sheetTitle: SheetName, value: T) {
  return SHEET_HEADERS[sheetTitle].map((header) => {
    const cell = value[header];
    if (Array.isArray(cell)) {
      return cell.join(",");
    }
    return String(cell ?? "");
  });
}

function rowToObject<T>(headers: readonly string[], row: string[]): T {
  return headers.reduce((acc, header, index) => {
    (acc as Record<string, unknown>)[header] = row[index] ?? "";
    return acc;
  }, {} as T);
}

function mapSheetRows<T>(headers: readonly string[], rows: string[][] = []) {
  return rows.map((row) => rowToObject<T>(headers, row));
}

function mapBootstrap(data: {
  plans: Array<Record<string, string>>;
  logs: Array<Record<string, string>>;
  todos: Array<Record<string, string>>;
  exams: Array<Record<string, string>>;
  diaryEntries: Array<Record<string, string>>;
  settings: Array<Record<string, string>>;
  spreadsheetId: string;
}): BootstrapPayload {
  const settingsRow = data.settings[0] ?? {
    id: DEFAULT_SETTINGS_ROW.id,
    subjects: DEFAULT_SETTINGS_ROW.subjects,
    dailyTargetMinutes: DEFAULT_SETTINGS_ROW.dailyTargetMinutes,
  };

  return {
    plans: data.plans.map((row) => ({
      id: row.id,
      date: row.date,
      subject: row.subject,
      plannedMinutes: Number(row.plannedMinutes || 0),
      startTime: row.startTime || "",
      endTime: row.endTime || "",
      note: row.note || "",
    })),
    logs: data.logs.map((row) => ({
      id: row.id,
      date: row.date,
      subject: row.subject,
      actualMinutes: Number(row.actualMinutes || 0),
      startTime: row.startTime || "",
      endTime: row.endTime || "",
      review: row.review || "",
      planId: row.planId || "",
    })),
    todos: data.todos.map((row) => ({
      id: row.id,
      title: row.title,
      status: (row.status || "todo") as "todo" | "doing" | "done",
      priority: (row.priority || "medium") as "low" | "medium" | "high",
      createdAt: row.createdAt,
      dueDate: row.dueDate || "",
      subject: row.subject || "",
    })),
    exams: data.exams.map((row) => ({
      id: row.id,
      name: row.name,
      examDate: row.examDate,
      registrationStart: row.registrationStart || "",
      registrationEnd: row.registrationEnd || "",
      memo: row.memo || "",
      importance: (row.importance || "normal") as "normal" | "important" | "critical",
    })),
    diaryEntries: data.diaryEntries.map((row) => ({
      id: row.id,
      date: row.date,
      title: row.title || "",
      content: row.content || "",
      mood: (row.mood || undefined) as DailyDiary["mood"],
    })),
    settings: {
      id: settingsRow.id,
      subjects: settingsRow.subjects ? settingsRow.subjects.split(",").map((subject) => subject.trim()).filter(Boolean) : [],
      dailyTargetMinutes: Number(settingsRow.dailyTargetMinutes || 0),
    },
    spreadsheetId: data.spreadsheetId,
  };
}

export async function buildBootstrapData(ctx: BuildContext) {
  const spreadsheetId = await getSpreadsheetId(ctx, true);
  const response = await ctx.sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: [
      "DailyPlans!A2:Z",
      "StudyLogs!A2:Z",
      "Todos!A2:Z",
      "Exams!A2:Z",
      "DailyDiary!A2:Z",
      "Settings!A2:Z",
    ],
  });

  const ranges = response.data.valueRanges ?? [];
  const plans = mapSheetRows<Record<string, string>>(SHEET_HEADERS.DailyPlans, ranges[0]?.values as string[][] | undefined);
  const logs = mapSheetRows<Record<string, string>>(SHEET_HEADERS.StudyLogs, ranges[1]?.values as string[][] | undefined);
  const todos = mapSheetRows<Record<string, string>>(SHEET_HEADERS.Todos, ranges[2]?.values as string[][] | undefined);
  const exams = mapSheetRows<Record<string, string>>(SHEET_HEADERS.Exams, ranges[3]?.values as string[][] | undefined);
  const diaryEntries = mapSheetRows<Record<string, string>>(SHEET_HEADERS.DailyDiary, ranges[4]?.values as string[][] | undefined);
  const settings = mapSheetRows<Record<string, string>>(SHEET_HEADERS.Settings, ranges[5]?.values as string[][] | undefined);

  return mapBootstrap({
    plans,
    logs,
    todos,
    exams,
    diaryEntries,
    settings,
    spreadsheetId,
  });
}

async function locateRowIndex(sheets: sheets_v4.Sheets, spreadsheetId: string, sheetTitle: SheetName, id: string) {
  const rows = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!A2:Z`,
  });
  const values = rows.data.values ?? [];
  const relativeIndex = values.findIndex((row) => row[0] === id);

  if (relativeIndex === -1) {
    throw new Error("ROW_NOT_FOUND");
  }

  return relativeIndex + 2;
}

async function getSheetId(ctx: BuildContext, spreadsheetId: string, sheetTitle: SheetName) {
  const cached = getCachedSpreadsheet(ctx.email);
  const cachedSheetId = cached?.sheetIds?.[sheetTitle];
  if (cachedSheetId !== undefined) {
    return cachedSheetId;
  }

  const metadata = await ensureSpreadsheetStructure(ctx, spreadsheetId);
  const sheetId = metadata.sheetIds[sheetTitle];

  if (sheetId === undefined) {
    throw new Error("SHEET_NOT_FOUND");
  }

  return sheetId;
}

export async function createRecord<T extends Record<string, unknown>>(
  input: BuildContext & { sheetTitle: string; value: T },
) {
  const spreadsheetId = await getSpreadsheetId(input, false);
  const sheetTitle = input.sheetTitle as SheetName;
  await input.sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetTitle}!A:Z`,
    valueInputOption: "RAW",
    requestBody: {
      values: [objectToRow(sheetTitle, input.value)],
    },
  });

  return { ok: true, spreadsheetId };
}

export async function updateRecord<T extends Record<string, unknown>>(
  input: BuildContext & { sheetTitle: string; id: string; value: T },
) {
  const spreadsheetId = await getSpreadsheetId(input, false);
  const sheetTitle = input.sheetTitle as SheetName;
  const rowIndex = await locateRowIndex(input.sheets, spreadsheetId, sheetTitle, input.id);

  await input.sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetTitle}!A${rowIndex}:Z${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [objectToRow(sheetTitle, input.value)],
    },
  });

  return { ok: true, spreadsheetId };
}

export async function deleteRecord(
  input: BuildContext & { sheetTitle: string; id: string },
) {
  const spreadsheetId = await getSpreadsheetId(input, false);
  const sheetTitle = input.sheetTitle as SheetName;
  const rowIndex = await locateRowIndex(input.sheets, spreadsheetId, sheetTitle, input.id);
  const sheetId = await getSheetId(input, spreadsheetId, sheetTitle);

  await input.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });

  return { ok: true, spreadsheetId };
}

export async function upsertDiary<T extends Record<string, unknown>>(
  input: BuildContext & { value: T },
) {
  const spreadsheetId = await getSpreadsheetId(input, false);
  const diary = input.value as unknown as DailyDiary;
  const rows = await ctxReadSheet(input.sheets, spreadsheetId, "DailyDiary");
  const existing = rows.find((row) => row.date === diary.date);

  if (!existing) {
    await input.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "DailyDiary!A:Z",
      valueInputOption: "RAW",
      requestBody: {
        values: [objectToRow("DailyDiary", diary as unknown as Record<string, unknown>)],
      },
    });
    return { ok: true, spreadsheetId };
  }

  const rowIndex = await locateRowIndex(input.sheets, spreadsheetId, "DailyDiary", existing.id);
  await input.sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `DailyDiary!A${rowIndex}:Z${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [objectToRow("DailyDiary", { ...diary, id: existing.id })],
    },
  });

  return { ok: true, spreadsheetId };
}

async function ctxReadSheet(sheets: sheets_v4.Sheets, spreadsheetId: string, sheetTitle: SheetName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!A2:Z`,
  });

  return mapSheetRows<Record<string, string>>(SHEET_HEADERS[sheetTitle], response.data.values as string[][] | undefined);
}

export async function upsertSettings<T extends Record<string, unknown>>(
  input: BuildContext & { value: T },
) {
  const spreadsheetId = await getSpreadsheetId(input, false);
  const settings = input.value as unknown as Settings;
  const rowIndex = 2;
  await input.sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Settings!A${rowIndex}:C${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[settings.id, settings.subjects.join(","), String(settings.dailyTargetMinutes)]],
    },
  });

  return { ok: true, spreadsheetId };
}
