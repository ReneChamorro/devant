import { addDays, formatDayCap, sessionsForDate, studentsForSession } from "./schedule";
import type { Family, Session } from "./schedule";
import { loadAll } from "./store";

export type FamilyDay = {
  date: string;
  label: string;
  items: { session: Session; kidNames: string[] }[];
};

export type FamilyWeekData = {
  kids: { id: string; name: string }[];
  days: FamilyDay[];
};

/** Read-only week for the family's students (or one of them). Families never write anything. */
export async function buildFamilyWeek(family: Family, weekStart: string, onlyKidId?: string): Promise<FamilyWeekData> {
  const { templates, students, productions } = await loadAll();
  const kids = students.filter((s) => family.studentIds.includes(s.id)).map(({ id, name }) => ({ id, name }));
  const shown = onlyKidId ? kids.filter((k) => k.id === onlyKidId) : kids;
  const shownIds = new Set(shown.map((k) => k.id));

  const days: FamilyDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const items = sessionsForDate(templates, date, false, productions)
      .map((session) => {
        const ids = studentsForSession(session, students, productions)
          .map((s) => s.id)
          .filter((id) => shownIds.has(id));
        return { session, kidNames: shown.filter((k) => ids.includes(k.id)).map((k) => k.name) };
      })
      .filter((x) => x.kidNames.length > 0);
    return { date, label: formatDayCap(date, { weekday: "long", day: "numeric", month: "long" }), items };
  });

  return { kids, days };
}
