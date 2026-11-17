import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { CaretLeft, CaretRight, Plus } from "@phosphor-icons/react/dist/ssr";
import { AttendanceList, type RosterEntry } from "@/components/attendance-list";
import { ListSkeleton } from "@/components/list-skeleton";
import { TeacherNav } from "@/components/teacher-nav";
import { requireTeacher } from "@/lib/auth";
import { watchFor } from "@/lib/attendance";
import {
  addDays,
  dancesOfStudent,
  formatDayCap,
  isValidISODate,
  sessionsForDate,
  studentsForSession,
  todayCaracas,
} from "@/lib/schedule";
import { loadAll, loadAttendance } from "@/lib/store";

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
  const today = todayCaracas();
  const date = isValidISODate(raw) ? raw : today;

  const [{ templates, students, productions }, { taken, records }] = await Promise.all([loadAll(), loadAttendance()]);

  const entries: RosterEntry[] = sessionsForDate(templates, date, true, productions).map((session) => {
    const expected = studentsForSession(session, students, productions);
    const header = taken.find((t) => t.sessionId === session.id) ?? null;
    const initial: RosterEntry["initial"] = {};
    for (const r of records) {
      if (r.sessionId === session.id) initial[r.studentId] = { status: r.status, note: r.note };
    }

    const attention: string[] = [];
    const rows = expected.map((st) => {
      const w = watchFor(st.id, session.kind, session.date + session.start, taken, records);
      const parts: string[] = [];
      if (w.streak >= 2) parts.push(`${w.streak} faltas seguidas`);
      if (w.lastExcusedNote) parts.push(`justificada la última vez: ${w.lastExcusedNote}`);
      if (session.kind === "ensayo") {
        if (w.streak >= 2) attention.push(`${st.name}: ${w.streak} faltas seguidas`);
        if (w.lastExcusedNote) attention.push(`${st.name}: justificada la última vez (${w.lastExcusedNote})`);
      }
      return {
        id: st.id,
        name: st.name,
        dances: dancesOfStudent(st.id, session.danceIds, productions),
        watch: parts.length ? parts.join(". ") : undefined,
      };
    });

    return {
      session,
      students: rows,
      saved: header ? { takenBy: header.takenBy, takenAt: header.takenAt, updatedAt: header.updatedAt } : null,
      initial,
      isPast: date < today,
      isFuture: date > today,
      attention,
    };
  });

  return (
    <>
      <TeacherNav current="dia" name={teacher.name} />
      <p className="mb-6 max-w-[60ch] text-sm text-muted">
        Todas las alumnas aparecen como presentes. Marca solo a quien llegó tarde, faltó o tiene falta justificada, y guarda la lista.
      </p>

      <div className="mb-8 flex items-center justify-between gap-3">
        <Link href={`/profe/dia?fecha=${addDays(date, -1)}`} className="btn btn-ghost !px-3" aria-label="Día anterior">
          <CaretLeft size={20} aria-hidden="true" />
        </Link>
        <p className="text-center font-semibold">
          {formatDayCap(date, { weekday: "long", day: "numeric", month: "long" })}
          {date === today && <span className="chip ml-2 align-middle">Hoy</span>}
        </p>
        <Link href={`/profe/dia?fecha=${addDays(date, 1)}`} className="btn btn-ghost !px-3" aria-label="Día siguiente">
          <CaretRight size={20} aria-hidden="true" />
        </Link>
      </div>

      <AttendanceList key={date} entries={entries} />

      <div className="mt-8">
        <Link href={`/profe/horario?nuevo=1&fecha=${date}`} className="btn btn-ghost">
          <Plus size={20} aria-hidden="true" /> Agregar actividad este día
        </Link>
      </div>
    </>
  );
}
