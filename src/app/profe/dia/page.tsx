import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { CaretLeft, CaretRight, Plus } from "@phosphor-icons/react/dist/ssr";
import { DayRoster, type RosterEntry } from "@/components/day-roster";
import { ListSkeleton } from "@/components/list-skeleton";
import { TeacherNav } from "@/components/teacher-nav";
import { requireTeacher } from "@/lib/auth";
import {
  addDays,
  dancesOfStudent,
  formatDayCap,
  isValidISODate,
  sessionsForDate,
  studentsForSession,
  todayCaracas,
} from "@/lib/schedule";
import { loadAll } from "@/lib/store";

export const metadata = { title: "Vista del día" };

const AVAIL = ["yes", "yes", "yes", "maybe", "no", "none"] as const;

/** Deterministic demo answers until family responses are stored. */
function demoAvail(sessionId: string, studentId: string) {
  let h = 0;
  for (const c of sessionId + studentId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVAIL[h % AVAIL.length];
}

export default function DiaPage({ searchParams }: PageProps<"/profe/dia">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl">Vista del día</h1>
      <Suspense fallback={<ListSkeleton rows={2} />}>
        <DayBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function DayBody({ searchParams }: { searchParams: PageProps<"/profe/dia">["searchParams"] }) {
  await connection();
  const teacher = await requireTeacher();
  const sp = await searchParams;
  const raw = Array.isArray(sp.fecha) ? sp.fecha[0] : sp.fecha;
  const date = isValidISODate(raw) ? raw : todayCaracas();

  const { templates, students, productions } = await loadAll();
  const entries: RosterEntry[] = sessionsForDate(templates, date, true, productions).map((session) => ({
    session,
    students: studentsForSession(session, students, productions).map((st) => ({
      ...st,
      avail: demoAvail(session.id, st.id),
      dances: dancesOfStudent(st.id, session.danceIds, productions),
    })),
  }));

  return (
    <>
      <TeacherNav current="dia" name={teacher.name} />
      <p className="mb-6 text-sm text-muted">
        La disponibilidad y la asistencia son de ejemplo y todavía no se guardan. El horario sí se guarda.
      </p>

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

      <div className="mt-8">
        <Link href={`/profe/horario?nuevo=1&fecha=${date}`} className="btn btn-ghost">
          <Plus size={20} aria-hidden="true" /> Agregar actividad este día
        </Link>
      </div>
    </>
  );
}
