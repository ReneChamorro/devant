import type { AttendanceRecord, AttendanceStatus, ClassKind, SessionAttendance } from "./schedule";

/*
  Pure helpers over saved roll calls. A student with no record in a saved session was present.
  Excused absences still count as absences in reports (the academy can tell them apart).
*/

export type HistoryEntry = {
  session: SessionAttendance;
  status: AttendanceStatus;
  note?: string;
};

export const isAbsence = (s: AttendanceStatus) => s === "absent" || s === "excused";

const byTime = (a: SessionAttendance, b: SessionAttendance) =>
  (a.date + a.start).localeCompare(b.date + b.start);

/** Every saved session where the student was expected, oldest first. */
export function studentHistory(
  studentId: string,
  taken: SessionAttendance[],
  records: AttendanceRecord[],
  filter?: (s: SessionAttendance) => boolean,
): HistoryEntry[] {
  const recs = new Map(records.filter((r) => r.studentId === studentId).map((r) => [r.sessionId, r]));
  return taken
    .filter((t) => t.expected.some((e) => e.id === studentId) && (!filter || filter(t)))
    .sort(byTime)
    .map((session) => {
      const r = recs.get(session.sessionId);
      return { session, status: r?.status ?? "present", note: r?.note };
    });
}

/** Absences in a row at the end of the history (most recent first counting backwards). */
export function absenceStreak(history: HistoryEntry[]): number {
  let n = 0;
  for (let i = history.length - 1; i >= 0 && isAbsence(history[i].status); i--) n++;
  return n;
}

export type Summary = {
  expected: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  /** Present or late, over expected. null when there is nothing to measure. */
  rate: number | null;
};

export function summarize(history: HistoryEntry[]): Summary {
  const s: Summary = { expected: history.length, present: 0, late: 0, absent: 0, excused: 0, rate: null };
  for (const h of history) s[h.status]++;
  if (s.expected > 0) s.rate = Math.round(((s.present + s.late) / s.expected) * 100);
  return s;
}

/** Streak and last note for the roll call being prepared. Sessions are the same kind and earlier than `beforeKey` (date + start). */
export function watchFor(
  studentId: string,
  kind: ClassKind,
  beforeKey: string,
  taken: SessionAttendance[],
  records: AttendanceRecord[],
) {
  const history = studentHistory(studentId, taken, records, (t) => t.kind === kind && t.date + t.start < beforeKey);
  const last = history[history.length - 1];
  return {
    streak: absenceStreak(history),
    lastExcusedNote: last?.status === "excused" ? last.note : undefined,
  };
}

export type ReportRow = { id: string; name: string } & Summary;

export type ReportFilter = {
  /** YYYY-MM, or empty for every month. */
  month?: string;
  type?: "all" | "class" | "rehearsal";
  danceId?: string;
};

/** One row per student who was expected in at least one matching saved session. */
export function buildReport(
  taken: SessionAttendance[],
  records: AttendanceRecord[],
  filter: ReportFilter,
): ReportRow[] {
  const match = (t: SessionAttendance) =>
    (!filter.month || t.date.startsWith(filter.month)) &&
    (filter.type === "class" ? t.kind !== "ensayo" : filter.type === "rehearsal" ? t.kind === "ensayo" : true) &&
    (!filter.danceId || !!t.danceIds?.includes(filter.danceId));

  const people = new Map<string, string>();
  for (const t of taken.filter(match)) for (const e of t.expected) people.set(e.id, e.name);

  return [...people]
    .map(([id, name]) => ({ id, name, ...summarize(studentHistory(id, taken, records, match)) }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** CSV with BOM and semicolons-safe quoting so Excel opens accents correctly. */
export function toCsv(rows: ReportRow[]): string {
  const head = ["Alumna", "Sesiones", "Presente", "Tarde", "Ausente", "Justificada", "Asistencia %"];
  const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [r.name, r.expected, r.present, r.late, r.absent, r.excused, r.rate ?? ""].map(esc).join(","));
  return "﻿" + [head.map(esc).join(","), ...lines].join("\r\n") + "\r\n";
}
