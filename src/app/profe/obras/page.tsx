import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { ListSkeleton } from "@/components/list-skeleton";
import { TeacherNav } from "@/components/teacher-nav";
import { requireTeacher } from "@/lib/auth";
import { loadProductions } from "@/lib/store";
import { addProductionAction, setActiveProductionAction } from "../actions";

export const metadata = { title: "Obras y bailes" };

export default function ObrasPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl">Obras y bailes</h1>
      <Suspense fallback={<ListSkeleton rows={2} />}>
        <ObrasBody />
      </Suspense>
    </div>
  );
}

async function ObrasBody() {
  await connection();
  const teacher = await requireTeacher();
  const productions = await loadProductions();

  return (
    <>
      <TeacherNav current="obras" name={teacher.name} />
      <p className="mb-8 max-w-[56ch] text-muted">
        Cada obra tiene sus bailes y cada baile su elenco. Elige la obra que se está montando ahora.
      </p>

      <ul className="mb-10 space-y-3">
        {productions.map((p) => {
          const cast = new Set(p.dances.flatMap((d) => d.studentIds));
          return (
            <li key={p.id} className="card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
              <div className="space-y-1">
                <h2 className="!font-sans text-xl font-semibold !text-ink">
                  {p.name} {p.active && <span className="chip ml-1 align-middle text-gold-text">En montaje</span>}
                </h2>
                <p className="tabular text-sm text-muted">
                  {p.dances.length} {p.dances.length === 1 ? "baile" : "bailes"} · {cast.size}{" "}
                  {cast.size === 1 ? "alumna" : "alumnas"} en el elenco
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/profe/obras/${p.id}`} className="btn btn-gold !min-h-10 !px-4 text-sm">
                  Bailes y elenco
                </Link>
                {!p.active && (
                  <form action={setActiveProductionAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="btn btn-ghost !min-h-10 !px-4 text-sm">Poner en montaje</button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
        {productions.length === 0 && (
          <li className="card px-5 py-8 text-center text-muted">Aún no hay obras. Crea la primera abajo.</li>
        )}
      </ul>

      <form action={addProductionAction} className="card max-w-md space-y-3 p-5">
        <div className="space-y-2">
          <label htmlFor="obra" className="block text-sm font-medium">Nueva obra</label>
          <input
            id="obra"
            name="name"
            required
            maxLength={80}
            placeholder="El Corsario"
            className="min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-ink"
          />
        </div>
        <button type="submit" className="btn btn-ghost">Crear obra</button>
      </form>
    </>
  );
}
