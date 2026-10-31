import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Pause, PencilSimple, Play, Plus } from "@phosphor-icons/react/dist/ssr";
import { DeleteButton } from "@/components/delete-button";
import { ListSkeleton } from "@/components/list-skeleton";
import { TeacherNav } from "@/components/teacher-nav";
import { TemplateForm } from "@/components/template-form";
import { requireTeacher } from "@/lib/auth";
import {
  formatDayCap,
  isValidISODate,
  KIND_INFO,
  summarizeDays,
  type Template,
} from "@/lib/schedule";
import { loadProductions, loadTemplates } from "@/lib/store";
import { deleteTemplateAction, togglePauseAction } from "../actions";

export const metadata = { title: "Horario" };

export default function HorarioPage({ searchParams }: PageProps<"/profe/horario">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl">Horario</h1>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <HorarioBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function when(t: Template) {
  return t.date ? formatDayCap(t.date, { weekday: "long", day: "numeric", month: "long" }) : summarizeDays(t.days);
}

async function HorarioBody({ searchParams }: { searchParams: PageProps<"/profe/horario">["searchParams"] }) {
  await connection();
  const teacher = await requireTeacher();
  const sp = await searchParams;
  const [all, productions] = await Promise.all([loadTemplates(), loadProductions()]);

  const editId = first(sp.editar);
  const editing = editId ? all.find((t) => t.id === editId) : undefined;
  const wantsNew = first(sp.nuevo) === "1";
  const prefillDate = first(sp.fecha);

  const weekly = all.filter((t) => !t.date).sort((a, b) => a.start.localeCompare(b.start));
  const once = all.filter((t) => t.date).sort((a, b) => (a.date! + a.start).localeCompare(b.date! + b.start));

  const showForm = !!editing || wantsNew;

  return (
    <>
      <TeacherNav current="horario" name={teacher.name} />

      {showForm ? (
        <div className="mb-10">
          <TemplateForm
            key={editing?.id ?? `nuevo-${prefillDate ?? ""}`}
            teacherName={teacher.name}
            productions={productions}
            initial={
              editing ?? {
                kind: "basico",
                date: isValidISODate(prefillDate) ? prefillDate : undefined,
              }
            }
          />
        </div>
      ) : (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[52ch] text-muted">
            Lo que cambies aquí se ve al instante en el calendario público y en la semana de cada familia.
          </p>
          <Link href="/profe/horario?nuevo=1" className="btn btn-gold">
            <Plus size={20} aria-hidden="true" /> Nueva actividad
          </Link>
        </div>
      )}

      <section aria-labelledby="semanal" className="mb-10">
        <h2 id="semanal" className="mb-4 text-2xl">Cada semana</h2>
        <ul className="space-y-3">
          {weekly.map((t) => (
            <Row key={t.id} t={t} />
          ))}
          {weekly.length === 0 && <li className="card px-5 py-8 text-center text-muted">Aún no hay actividades semanales.</li>}
        </ul>
      </section>

      <section aria-labelledby="puntuales">
        <h2 id="puntuales" className="mb-4 text-2xl">Fechas puntuales</h2>
        <ul className="space-y-3">
          {once.map((t) => (
            <Row key={t.id} t={t} />
          ))}
          {once.length === 0 && (
            <li className="card px-5 py-8 text-center text-muted">
              Sin actividades de una sola fecha. Úsalas para un ensayo general o una clase extra.
            </li>
          )}
        </ul>
      </section>
    </>
  );
}

function Row({ t }: { t: Template }) {
  return (
    <li className={`card space-y-3 p-4 sm:p-5 ${t.paused ? "opacity-75" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="!font-sans text-lg font-semibold !text-ink">
            {t.title} <span className="chip ml-1 align-middle">{KIND_INFO[t.kind].label}</span>
            {t.paused && <span className="chip ml-1 align-middle text-warn">En pausa</span>}
          </h3>
          <p className="tabular text-sm text-muted">
            {when(t)} · {t.start} a {t.end}
            {t.room && ` · ${t.room}`}
          </p>
          <p className="text-sm text-muted">{t.teacher ? t.teacher : "Profesor por asignar"}</p>
          {t.note && <p className="text-sm text-gold-text">{t.note}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/profe/horario?editar=${t.id}`} className="btn btn-ghost !min-h-10 !px-3 text-sm">
          <PencilSimple size={18} aria-hidden="true" /> Editar
        </Link>
        <form action={togglePauseAction}>
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="paused" value={t.paused ? "0" : "1"} />
          <button type="submit" className="btn btn-ghost !min-h-10 !px-3 text-sm">
            {t.paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
            {t.paused ? "Reanudar" : "Pausar"}
          </button>
        </form>
        <form action={deleteTemplateAction}>
          <input type="hidden" name="id" value={t.id} />
          <DeleteButton label={`Eliminar ${t.title}`} />
        </form>
      </div>
    </li>
  );
}
