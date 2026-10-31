import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { FamilyWeek, type FamilyDay } from "@/components/family-week";
import { ListSkeleton } from "@/components/list-skeleton";
import {
  addDays,
  DEMO_FAMILIES,
  formatDayCap,
  sessionsForDate,
  startOfWeek,
  studentsForSession,
  todayCaracas,
} from "@/lib/schedule";
import { loadAll } from "@/lib/store";

export default function FamilyPage({ params }: PageProps<"/f/[token]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl">Mi semana</h1>
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <FamilyBody params={params} />
      </Suspense>
    </div>
  );
}

async function FamilyBody({ params }: { params: PageProps<"/f/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  const family = DEMO_FAMILIES[token];
  if (!family) notFound();

  const { templates, students, productions } = await loadAll();
  const kids = students.filter((s) => family.studentIds.includes(s.id)).map(({ id, name }) => ({ id, name }));
  const monday = startOfWeek(todayCaracas());

  const days: FamilyDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const items = sessionsForDate(templates, date, false, productions)
      .map((session) => ({
        session,
        studentIds: studentsForSession(session, students, productions)
          .map((s) => s.id)
          .filter((id) => family.studentIds.includes(id)),
      }))
      .filter((x) => x.studentIds.length > 0);
    return { date, label: formatDayCap(date, { weekday: "long", day: "numeric", month: "long" }), items };
  });

  return (
    <>
      <DemoBanner>Las respuestas no se guardan todavía. PIN de ejemplo: {family.pin}.</DemoBanner>
      <FamilyWeek familyName={family.name} pin={family.pin} kids={kids} days={days} />
    </>
  );
}
