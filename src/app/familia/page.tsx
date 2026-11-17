import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { ListSkeleton } from "@/components/list-skeleton";
import { requireFamilyViewer } from "@/lib/family-auth";
import { loadChoreographies, loadProductions } from "@/lib/store";
import { buildFamilyWeek } from "@/lib/family";
import { addDays, formatDayCap, isValidISODate, KIND_INFO, startOfWeek, todayCaracas } from "@/lib/schedule";
import { logoutFamilyAction } from "./actions";

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default function FamiliaPage({ searchParams }: PageProps<"/familia">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl">Mi semana</h1>
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <FamiliaBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function FamiliaBody({ searchParams }: { searchParams: PageProps<"/familia">["searchParams"] }) {
  await connection();
  const viewer = await requireFamilyViewer();
  const sp = await searchParams;

  const rawDate = first(sp.fecha);
  const weekStart = startOfWeek(isValidISODate(rawDate) ? rawDate : todayCaracas());
  const kidParam = first(sp.hija);

  const all = await buildFamilyWeek(viewer.family, weekStart);

  // Dances where one of the family's students is in the cast, with whether the choreography is ready.
  const [productions, choreos] = await Promise.all([loadProductions(), loadChoreographies()]);
  const dances = [...productions]
    .sort((a, b) => Number(b.active) - Number(a.active))
    .flatMap((p) =>
      p.dances
        .map((d) => ({
          id: d.id,
          name: d.name,
          production: p.name,
          kids: all.kids.filter((k) => d.studentIds.includes(k.id)).map((k) => k.name),
          ready: (choreos.find((c) => c.danceId === d.id)?.formations.length ?? 0) > 0,
        }))
        .filter((d) => d.kids.length > 0),
    );
  const kidId = all.kids.some((k) => k.id === kidParam) ? kidParam : undefined;
  const { kids, days } = kidId ? await buildFamilyWeek(viewer.family, weekStart, kidId) : all;
  const base = (extra: Record<string, string>) => {
    const q = new URLSearchParams({ ...(kidId ? { hija: kidId } : {}), ...extra });
    return `/familia?${q.toString()}`;
  };

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <p className="text-muted">
          Hola, <strong className="text-ink">{viewer.guardian.name}</strong>. Familia {viewer.family.name}.
        </p>
        <form action={logoutFamilyAction}>
          <button type="submit" className="btn btn-ghost !min-h-10 !px-4 text-sm">Cerrar sesión</button>
        </form>
      </div>

      {all.kids.length === 0 ? (
        <p className="card px-5 py-8 text-center text-muted">
          La academia todavía no ha vinculado a ninguna bailarina con tu familia. Avísale a la profesora.
        </p>
      ) : (
        <>
          {all.kids.length > 1 && (
            <nav aria-label="Bailarina" className="mb-6 flex flex-wrap gap-2">
              <Link
                href={base({ fecha: weekStart })}
                aria-current={!kidId ? "true" : undefined}
                className={`btn !min-h-11 text-sm ${!kidId ? "border-gold bg-gold text-gold-ink" : "btn-ghost text-muted"}`}
              >
                Todas
              </Link>
              {all.kids.map((k) => (
                <Link
                  key={k.id}
                  href={`/familia?${new URLSearchParams({ hija: k.id, fecha: weekStart }).toString()}`}
                  aria-current={kidId === k.id ? "true" : undefined}
                  className={`btn !min-h-11 text-sm ${kidId === k.id ? "border-gold bg-gold text-gold-ink" : "btn-ghost text-muted"}`}
                >
                  {k.name}
                </Link>
              ))}
            </nav>
          )}

          {dances.length > 0 && (
            <section aria-labelledby="bailes" className="mb-10">
              <h2 id="bailes" className="mb-3 text-xl">Bailes</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {dances.map((d) => (
                  <li key={d.id}>
                    <Link href={`/familia/baile/${d.id}`} className="card block p-4 transition-[border-color] duration-150 hover:border-gold">
                      <p className="font-semibold text-ink">{d.name}</p>
                      <p className="text-sm text-muted">{d.production}</p>
                      <p className="text-sm text-muted">{d.kids.join(", ")}</p>
                      <p className={`mt-1 text-sm ${d.ready ? "text-gold-text" : "text-muted"}`}>
                        {d.ready ? "Ver coreograma" : "Coreograma en preparación"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mb-8 flex items-center justify-between gap-3">
            <Link href={base({ fecha: addDays(weekStart, -7) })} className="btn btn-ghost !px-3" aria-label="Semana anterior">
              <CaretLeft size={20} aria-hidden="true" />
            </Link>
            <p className="text-center font-semibold">
              {formatDayCap(weekStart, { day: "numeric", month: "long" })} al {formatDayCap(addDays(weekStart, 6), { day: "numeric", month: "long" })}
            </p>
            <Link href={base({ fecha: addDays(weekStart, 7) })} className="btn btn-ghost !px-3" aria-label="Semana siguiente">
              <CaretRight size={20} aria-hidden="true" />
            </Link>
          </div>

          <div className="space-y-10">
            {days.map((day) => (
              <section key={day.date} aria-labelledby={`d-${day.date}`}>
                <h2 id={`d-${day.date}`} className="mb-3 text-xl">{day.label}</h2>
                {day.items.length === 0 ? (
                  <p className="card px-5 py-4 text-muted">Sin actividades.</p>
                ) : (
                  <ul className="space-y-3">
                    {day.items.map(({ session, kidNames }) => (
                      <li key={session.id} className="card space-y-2 p-4 sm:p-5">
                        <p className="tabular text-sm text-muted">
                          {session.start} a {session.end}
                          {session.room && ` · ${session.room}`}
                        </p>
                        <h3 className="!font-sans text-lg font-semibold !text-ink">
                          {session.title} <span className="chip ml-1 align-middle">{KIND_INFO[session.kind].label}</span>
                        </h3>
                        {session.danceNames && session.danceNames.length > 0 && (
                          <p className="text-sm text-ink">Bailes: {session.danceNames.join(", ")}</p>
                        )}
                        {kids.length > 1 && <p className="text-sm text-muted">{kidNames.join(", ")}</p>}
                        {session.note && <p className="text-sm text-gold-text">{session.note}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
