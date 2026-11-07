// CSV export for playtest feedback.
// Free comments are arbitrary text typed by testers, so every cell is
// treated as hostile: quoted for CSV, and defused for spreadsheets.

import type { PlaytestFeedback } from './types';

export const CSV_COLUMNS = [
  'id',
  'createdAt',
  'playSessionId',
  'route',
  'continueInterest',
  'galdFutureInterest',
  'reunionRecognition',
  'worldImpactFeeling',
  'archiveInterest',
  'memorableMoment',
  'freeComment',
  // Round 2. Blank for feedback collected before these existed.
  'moreLivesInterest',
  'nextCuriosity',
  'lostFrequency',
  'wishComment',
  // Round 3. Blank for feedback collected before these existed.
  'reunionMeaning',
  'mugenMoment',
  'aliveMoment',
  'unnaturalMoment',
  'boringMoment',
  'confusingMoment',
] as const;

/** Excel and friends read a leading = + - @ (or tab / CR) as a formula. */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

export function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  // Defuse formulas by prefixing a single quote, the conventional fix.
  const safe = FORMULA_TRIGGERS.some((t) => raw.startsWith(t)) ? `'${raw}` : raw;
  // Always quote, and double any embedded quote: newlines in a comment
  // then stay inside their cell.
  return `"${safe.replace(/"/g, '""')}"`;
}

/** UTF-8 BOM keeps Japanese readable when Excel opens the file. */
export const UTF8_BOM = '﻿';

export function feedbackToCsv(feedback: PlaytestFeedback[]): string {
  const header = CSV_COLUMNS.map(escapeCsvCell).join(',');
  const rows = feedback.map((item) =>
    CSV_COLUMNS.map((column) => escapeCsvCell(item[column])).join(','),
  );
  return UTF8_BOM + [header, ...rows].join('\r\n') + '\r\n';
}
