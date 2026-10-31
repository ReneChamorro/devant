import { addDays, DEMO_FAMILIES, formatDayCap, sessionsForDate, startOfWeek, studentsForSession, todayCaracas } from "./schedule";
import type { Availability, Session } from "./schedule";
import { loadAll, loadResponses } from "./store";

export type FamilyDay = {
  date: string;
  label: string;
  items: { session: Session; studentIds: string[] }[];
};

export type FamilyData = {
  familyName: string;
  kids: { id: string; name: string }[];
  days: FamilyDay[];
  /** `${sessionId}:${studentId}` to what the family already answered. */
  answers: Record<string, Availability>;
};

/** Everything a family may see. Call only after the PIN was verified. */
export async function buildFamilyData(token: string): Promise<FamilyData | null> {
  const family = DEMO_FAMILIES[token];
  if (!family) return null;

  const { templates, students, productions } = await loadAll();
  const kids = students.filter((s) => family.studentIds.includes(s.id)).map(({ id, name }) => ({ id, name }));
  const kidIds = new Set(kids.map((k) => k.id));
  const monday = startOfWeek(todayCaracas());

  const days: FamilyDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const items = sessionsForDate(templates, date, false, productions)
      .map((session) => ({
        session,
        studentIds: studentsForSession(session, students, productions)
          .map((s) => s.id)
          .filter((id) => kidIds.has(id)),
      }))
      .filter((x) => x.studentIds.length > 0);
    return { date, label: formatDayCap(date, { weekday: "long", day: "numeric", month: "long" }), items };
  });

  const answers: Record<string, Availability> = {};
  for (const r of await loadResponses()) {
    if (r.availability && kidIds.has(r.studentId)) answers[`${r.sessionId}:${r.studentId}`] = r.availability;
  }

  return { familyName: family.name, kids, days, answers };
}

/** True when this student is really expected at this session (guards against forged ids). */
export async function isExpectedAt(sessionId: string, studentId: string): Promise<boolean> {
  const [templateId, date] = sessionId.split("@");
  if (!templateId || !date) return false;
  const { templates, students, productions } = await loadAll();
  const session = sessionsForDate(templates, date, false, productions).find((s) => s.id === sessionId);
  if (!session) return false;
  return studentsForSession(session, students, productions).some((s) => s.id === studentId);
}
