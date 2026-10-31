import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { ListSkeleton } from "@/components/list-skeleton";
import { SessionList } from "@/components/session-list";
import {
  addDays,
  formatDayCap,
  isValidISODate,
  sessionsForDate,
  startOfWeek,
  todayCaracas,
} from "@/lib/schedule";
import { loadProductions, loadTemplates } from "@/lib/store";

export const metadata: Metadata = {
  title: "Calendario",
  description: "Clases y ensayos de la semana en la Academia de Ballet Clásico Devant.",
};

export default function CalendarioPage({ searchParams }: PageProps<"/calendario">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <header className="mb-8 space-y-3">
        <h1 className="text-4xl sm:text-5xl">Calendario</h1>
        <p className="text-muted">
          Clases y ensayos de la semana. Los horarios pueden cambiar; la profesora avisa por WhatsApp.
        </p>
      </header>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <CalendarBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CalendarBody({ searchParams }: { searchParams: PageProps<"/calendario">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const raw = Array.isArray(sp.fecha) ? sp.fecha[0] : sp.fecha;
  const today = todayCaracas();
  const selected = isValidISODate(raw) ? raw : today;
  const weekStart = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [templates, productions] = await Promise.all([loadTemplates(), loadProductions()]);
  const sessions = sessionsForDate(templates, selected, false, productions);

  const rehearsals = sessions.filter((s) => s.kind === "ensayo");
  const classes = sessions.filter((s) => s.kind !== "ensayo");

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href={`/calendario?fecha=${addDays(weekStart, -7)}`}
          className="btn btn-ghost !px-3"
          aria-label="Semana anterior"
        >
          <CaretLeft size={20} aria-hidden="true" />
        </Link>
        <p className="text-center font-semibold">
          {formatDayCap(days[0], { day: "numeric", month: "long" })} al {formatDayCap(days[6], { day: "numeric", month: "long" })}
        </p>
        <Link
          href={`/calendario?fecha=${addDays(weekStart, 7)}`}
          className="btn btn-ghost !px-3"
          aria-label="Semana siguiente"
        >
          <CaretRight size={20} aria-hidden="true" />
        </Link>
      </div>

      <nav aria-label="Días de la semana" className="mb-10 grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((d) => {
          const isSel = d === selected;
          const count = sessionsForDate(templates, d).length;
          return (
            <Link
              key={d}
              href={`/calendario?fecha=${d}`}
              aria-current={isSel ? "date" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center rounded-xl border px-1 py-2 text-center transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] ${
                isSel ? "border-gold bg-gold text-gold-ink" : "border-line bg-surface hover:border-gold"
              }`}
            >
              <span className="text-xs font-medium uppercase">{formatDayCap(d, { weekday: "short" }).replace(".", "")}</span>
              <span className="tabular text-lg font-semibold leading-tight">{formatDayCap(d, { day: "numeric" })}</span>
              <span className={`text-[0.7rem] ${isSel ? "" : "text-muted"}`}>{count > 0 ? `${count} act.` : "libre"}</span>
            </Link>
          );
        })}
      </nav>

      <h2 className="mb-4 text-2xl">
        {formatDayCap(selected, { weekday: "long", day: "numeric", month: "long" })}{" "}
        {selected === today && <span className="chip ml-2 align-middle !normal-case">Hoy</span>}
      </h2>

      {sessions.length === 0 ? (
        <SessionList sessions={[]} />
      ) : (
        <div className="space-y-8">
          {classes.length > 0 && (
            <section aria-labelledby="clases-dia">
              <h3 id="clases-dia" className="mb-3 !font-sans text-sm font-semibold !text-muted">Clases</h3>
              <SessionList sessions={classes} />
            </section>
          )}
          {rehearsals.length > 0 && (
            <section aria-labelledby="ensayos-dia">
              <h3 id="ensayos-dia" className="mb-3 !font-sans text-sm font-semibold !text-muted">Ensayos</h3>
              <SessionList sessions={rehearsals} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
