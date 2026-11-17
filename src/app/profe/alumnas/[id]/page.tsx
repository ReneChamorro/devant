import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { ListSkeleton } from "@/components/list-skeleton";
import { TeacherNav } from "@/components/teacher-nav";
import { requireTeacher } from "@/lib/auth";
import { studentHistory, summarize } from "@/lib/attendance";
import { ATTENDANCE_LABEL, formatDayCap, KIND_INFO, type AttendanceStatus } from "@/lib/schedule";
import { loadAttendance, loadStudents } from "@/lib/store";

export const metadata = { title: "Ficha de la alumna" };

const TONE: Record<AttendanceStatus, string> = {
  present: "text-ok",
  late: "text-warn",
  absent: "text-bad",
  excused: "text-gold-text",
};

export default function FichaPage({ params }: PageProps<"/profe/alumnas/[id]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <FichaBody params={params} />
      </Suspense>
    </div>
  );
}

async function FichaBody({ params }: { params: PageProps<"/profe/alumnas/[id]">["params"] }) {
  await connection();
  const teacher = await requireTeacher();
  const { id } = await params;
  const [students, { taken, records }] = await Promise.all([loadStudents(), loadAttendance()]);
  const student = students.find((s) => s.id === id);
  if (!student) notFound();

  const history = studentHistory(id, taken, records);
  const all = summarize(history);
  const classes = summarize(history.filter((h) => h.session.kind !== "ensayo"));
  const rehearsals = summarize(history.filter((h) => h.session.kind === "ensayo"));
  const recent = [...history].reverse();

  const tile = (label: string, s: ReturnType<typeof summarize>) => (
    <div className="card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="tabular text-2xl font-semibold text-ink">{s.rate === null ? "Sin datos" : `${s.rate}%`}</p>
      <p className="tabular text-sm text-muted">{s.expected} sesiones</p>
    </div>
  );

  return (
    <>
      <h1 className="mb-2 text-4xl">{student.name}</h1>
      <p className="mb-6 text-muted">{KIND_INFO[student.level].label}</p>
      <TeacherNav current="alumnas" name={teacher.name} />

      <Link href="/profe/alumnas" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <CaretLeft size={16} aria-hidden="true" /> Todas las alumnas
      </Link>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {tile("Asistencia total", all)}
        {tile("Clases", classes)}
        {tile("Ensayos", rehearsals)}
      </div>

      <p className="tabular mb-8 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="text-ok">{all.present} presentes</span>
        <span className="text-warn">{all.late} tarde</span>
        <span className="text-bad">{all.absent} ausentes</span>
        <span className="text-gold-text">{all.excused} justificadas</span>
      </p>

      <h2 className="mb-4 text-2xl">Historial</h2>
      {recent.length === 0 ? (
        <p className="card px-5 py-8 text-center text-muted">
          Todavía no hay listas guardadas con esta alumna. Aparecerá aquí cuando la profe guarde una lista.
        </p>
      ) : (
        <ul className="space-y-2">
          {recent.map((h) => (
            <li key={h.session.sessionId} className="card flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              <div>
                <p className="font-medium">
                  {h.session.title}
                  {h.session.danceNames && h.session.danceNames.length > 0 && (
                    <span className="text-muted"> · {h.session.danceNames.join(", ")}</span>
                  )}
                </p>
                <p className="tabular text-sm text-muted">
                  {formatDayCap(h.session.date, { weekday: "short", day: "numeric", month: "long" })} · {h.session.start}
                </p>
                {h.note && <p className="text-sm text-ink">{h.note}</p>}
              </div>
              <p className={`text-sm font-semibold ${TONE[h.status]}`}>{ATTENDANCE_LABEL[h.status]}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
