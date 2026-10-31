import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { DayRoster, type RosterEntry } from "@/components/day-roster";
import { DemoBanner } from "@/components/demo-banner";
import { ListSkeleton } from "@/components/list-skeleton";
import {
  addDays,
  formatDayCap,
  isValidISODate,
  sessionsForDate,
  studentsForSession,
  todayCaracas,
} from "@/lib/schedule";

const AVAIL = ["yes", "yes", "yes", "maybe", "no", "none"] as const;

/** Deterministic demo answers so the page is stable between reloads. */
function demoAvail(sessionId: string, studentId: string) {
  let h = 0;
  for (const c of sessionId + studentId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVAIL[h % AVAIL.length];
}

export default function DiaPage({ searchParams }: PageProps<"/profe/dia">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl">Vista del día</h1>
      <DemoBanner>
        Disponibilidad y asistencia de ejemplo. Aún no se guardan; la base de datos llega en la siguiente fase.
      </DemoBanner>
      <Suspense fallback={<ListSkeleton rows={2} />}>
        <DayBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function DayBody({ searchParams }: { searchParams: PageProps<"/profe/dia">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const raw = Array.isArray(sp.fecha) ? sp.fecha[0] : sp.fecha;
  const date = isValidISODate(raw) ? raw : todayCaracas();

  const entries: RosterEntry[] = sessionsForDate(date).map((session) => ({
    session,
    students: studentsForSession(session).map((st) => ({ ...st, avail: demoAvail(session.id, st.id) })),
  }));

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-3">
        <Link href={`/profe/dia?fecha=${addDays(date, -1)}`} className="btn btn-ghost !px-3" aria-label="Día anterior">
          <CaretLeft size={20} aria-hidden="true" />
        </Link>
        <p className="text-center font-semibold">
          {formatDayCap(date, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <Link href={`/profe/dia?fecha=${addDays(date, 1)}`} className="btn btn-ghost !px-3" aria-label="Día siguiente">
          <CaretRight size={20} aria-hidden="true" />
        </Link>
      </div>

      <DayRoster key={date} entries={entries} />
    </>
  );
}
