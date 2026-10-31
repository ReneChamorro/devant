import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, Ticket } from "@phosphor-icons/react/dist/ssr";
import { ListSkeleton } from "@/components/list-skeleton";
import { PhotoSlot } from "@/components/photo-slot";
import { Reveal } from "@/components/reveal";
import { SessionList } from "@/components/session-list";
import { formatDayCap, sessionsForDate, todayCaracas } from "@/lib/schedule";
import { ACTIVE_SEASON, SEASONS } from "@/lib/season";

const tile = "card p-6 sm:p-7";

async function TodayList() {
  await connection();
  const today = todayCaracas();
  return (
    <>
      <p className="mb-3 text-sm font-semibold text-muted">
        {formatDayCap(today, { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <SessionList sessions={sessionsForDate(today)} emptyText="Hoy no hay clases ni ensayos." />
    </>
  );
}

export default function Home() {
  const production = SEASONS[ACTIVE_SEASON];

  return (
    <>
      {/* Hero: asymmetric split, fits the first viewport */}
      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.15fr_0.85fr] md:py-14">
        <div className="space-y-6">
          <h1 className="text-4xl leading-[1.15] sm:text-5xl lg:text-6xl">Elegancia en movimiento</h1>
          <p className="max-w-[48ch] text-lg text-muted">
            Ballet clásico para niñas y jóvenes en Chacao, Caracas. Clases desde los 3 años en todos los niveles.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/inscripciones" className="btn btn-gold">
              Inscripciones abiertas
            </Link>
            <Link href="/calendario" className="btn btn-ghost">
              Ver calendario
            </Link>
          </div>
        </div>
        <PhotoSlot label="alumnas en el salón de clases" ratio="4 / 5" className="max-h-[70dvh] w-full md:justify-self-end" />
      </section>

      {/* En cartelera: full-width band, season aware */}
      {production.slug && (
        <section aria-labelledby="cartelera" className="border-y border-line bg-surface/60">
          <Reveal className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gold-text">En cartelera</p>
              <h2 id="cartelera" className="text-3xl sm:text-4xl">{production.production}</h2>
              <p className="text-muted">
                Sábado 21 y domingo 22 de noviembre, 4:00 PM. Teatro Don Bosco de Altamira, Caracas.
              </p>
            </div>
            <a href="https://www.aballetdevant.com" className="btn btn-gold">
              <Ticket size={20} aria-hidden="true" /> Comprar entradas
            </a>
          </Reveal>
        </section>
      )}

      {/* Niveles: 5 items, 5 cells, mixed sizes */}
      <section aria-labelledby="niveles" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal className="mb-10 max-w-2xl space-y-3">
          <h2 id="niveles" className="text-3xl sm:text-4xl">Un nivel para cada bailarina</h2>
          <p className="text-muted">Del primer plié al trabajo en puntas, con profesoras que acompañan cada etapa.</p>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-6">
          <Reveal className={`${tile} md:col-span-4 bg-[linear-gradient(135deg,rgba(212,175,55,0.14),transparent_70%)]`}>
            <h3 className="text-2xl">Infantil</h3>
            <p className="mt-2 max-w-[44ch] text-muted">Desde los 3 años. Ritmo, postura y juego para enamorarse del ballet desde el primer día.</p>
          </Reveal>
          <Reveal delay={0.05} className={`${tile} md:col-span-2`}>
            <h3 className="text-2xl">Básico</h3>
            <p className="mt-2 text-muted">Barra, centro y las bases de la técnica clásica.</p>
          </Reveal>
          <Reveal delay={0.05} className={`${tile} md:col-span-2`}>
            <h3 className="text-2xl">Intermedio</h3>
            <p className="mt-2 text-muted">Giros, saltos y preparación para puntas.</p>
          </Reveal>
          <Reveal delay={0.1} className={`${tile} md:col-span-2`}>
            <h3 className="text-2xl">Avanzado</h3>
            <p className="mt-2 text-muted">Técnica completa, adagio y allegro de nivel escénico.</p>
          </Reveal>
          <Reveal delay={0.1} className={`${tile} md:col-span-2 bg-[linear-gradient(160deg,var(--brand),transparent_90%)]`}>
            <h3 className="text-2xl">Puntas y pas de deux</h3>
            <p className="mt-2 text-muted">Zapatillas de punta y trabajo en pareja, con aprobación de la profesora.</p>
          </Reveal>
        </div>
        <Link href="/clases" className="mt-8 inline-flex items-center gap-2 font-semibold text-gold-text hover:underline">
          Ver todas las clases <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      {/* Calendario del día: real component, not a fake screenshot */}
      <section aria-labelledby="hoy" className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[0.8fr_1.2fr]">
        <Reveal className="space-y-4 self-start">
          <h2 id="hoy" className="text-3xl sm:text-4xl">Lo que pasa hoy en Devant</h2>
          <p className="text-muted">
            Clases y ensayos del día, siempre al día. Las familias reciben su enlace personal para avisar si asisten.
          </p>
          <Link href="/calendario" className="btn btn-ghost">Ver la semana completa</Link>
        </Reveal>
        <Reveal delay={0.08}>
          <Suspense fallback={<ListSkeleton />}>
            <TodayList />
          </Suspense>
        </Reveal>
      </section>
    </>
  );
}
