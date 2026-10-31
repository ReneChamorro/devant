import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { CaretLeft, CaretRight, Plus } from "@phosphor-icons/react/dist/ssr";
import { DayRoster, type RosterEntry } from "@/components/day-roster";
import type { Attendance as Mark } from "@/lib/schedule";
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
import { loadAll, loadResponses } from "@/lib/store";

export const metadata = { title: "Vista del día" };

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

  const [{ templates, students, productions }, responses] = await Promise.all([loadAll(), loadResponses()]);
  const byKey = new Map(responses.map((r) => [`${r.sessionId}:${r.studentId}`, r]));
  const marks: Record<string, Mark> = {};
  for (const r of responses) if (r.attendance) marks[`${r.sessionId}:${r.studentId}`] = r.attendance;
  const entries: RosterEntry[] = sessionsForDate(templates, date, true, productions).map((session) => ({
    session,
    students: studentsForSession(session, students, productions).map((st) => ({
      ...st,
      avail: byKey.get(`${session.id}:${st.id}`)?.availability ?? "none",
      dances: dancesOfStudent(st.id, session.danceIds, productions),
    })),
  }));

  return (
    <>
      <TeacherNav current="dia" name={teacher.name} />
      <p className="mb-6 text-sm text-muted">
        Lo que responden las familias aparece aquí. Hasta que respondan, cada alumna figura como sin respuesta.
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

      <DayRoster key={date} entries={entries} initialMarks={marks} />

      <div className="mt-8">
        <Link href={`/profe/horario?nuevo=1&fecha=${date}`} className="btn btn-ghost">
          <Plus size={20} aria-hidden="true" /> Agregar actividad este día
        </Link>
      </div>
    </>
  );
}
