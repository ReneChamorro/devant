import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { CastPicker } from "@/components/cast-picker";
import { DeleteButton } from "@/components/delete-button";
import { ListSkeleton } from "@/components/list-skeleton";
import { TeacherNav } from "@/components/teacher-nav";
import { requireTeacher } from "@/lib/auth";
import { loadProductions, loadStudents } from "@/lib/store";
import {
  addDanceAction,
  deleteDanceAction,
  deleteProductionAction,
  renameDanceAction,
} from "../../actions";

export const metadata = { title: "Bailes y elenco" };

export default function ObraPage({ params }: PageProps<"/profe/obras/[id]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <ObraBody params={params} />
      </Suspense>
    </div>
  );
}

async function ObraBody({ params }: { params: PageProps<"/profe/obras/[id]">["params"] }) {
  await connection();
  const teacher = await requireTeacher();
  const { id } = await params;
  const [productions, students] = await Promise.all([loadProductions(), loadStudents()]);
  const prod = productions.find((p) => p.id === id);
  if (!prod) notFound();

  const inCast = new Set(prod.dances.flatMap((d) => d.studentIds));
  const without = students.filter((s) => s.level !== "baby-ballet" && !inCast.has(s.id)).length;

  return (
    <>
      <h1 className="mb-2 text-4xl">{prod.name}</h1>
      <p className="mb-6">
        {prod.active ? <span className="chip text-gold-text">En montaje</span> : <span className="chip">No está en montaje</span>}
      </p>
      <TeacherNav current="obras" name={teacher.name} />

      <Link href="/profe/obras" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <CaretLeft size={16} aria-hidden="true" /> Todas las obras
      </Link>

      <p className="tabular mb-8 text-muted">
        {prod.dances.length} {prod.dances.length === 1 ? "baile" : "bailes"} · {inCast.size} en el elenco ·{" "}
        {without} sin baile asignado (sin contar baby ballet)
      </p>

      <ul className="mb-8 space-y-3">
        {prod.dances.map((d) => (
          <li key={d.id} className="card">
            <details className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <span className="!font-sans text-lg font-semibold">{d.name}</span>
                <span className="tabular text-sm text-muted">
                  {d.studentIds.length} {d.studentIds.length === 1 ? "alumna" : "alumnas"}
                </span>
              </summary>
              <div className="space-y-6 border-t border-line px-4 py-5 sm:px-5">
                <CastPicker productionId={prod.id} danceId={d.id} students={students} initial={d.studentIds} />

                <div className="flex flex-wrap items-end gap-4 border-t border-line pt-5">
                  <form action={renameDanceAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="productionId" value={prod.id} />
                    <input type="hidden" name="danceId" value={d.id} />
                    <div className="space-y-2">
                      <label htmlFor={`n-${d.id}`} className="block text-sm font-medium">Nombre del baile</label>
                      <input
                        id={`n-${d.id}`}
                        name="name"
                        defaultValue={d.name}
                        required
                        maxLength={80}
                        className="min-h-12 w-64 max-w-full rounded-xl border border-line bg-bg px-4 text-ink"
                      />
                    </div>
                    <button type="submit" className="btn btn-ghost">Renombrar</button>
                  </form>
                  <form action={deleteDanceAction}>
                    <input type="hidden" name="productionId" value={prod.id} />
                    <input type="hidden" name="danceId" value={d.id} />
                    <DeleteButton label={`Eliminar el baile ${d.name}`} />
                  </form>
                </div>
              </div>
            </details>
          </li>
        ))}
        {prod.dances.length === 0 && (
          <li className="card px-5 py-8 text-center text-muted">Esta obra aún no tiene bailes. Agrega el primero abajo.</li>
        )}
      </ul>

      <form action={addDanceAction} className="card mb-12 flex max-w-xl flex-wrap items-end gap-3 p-5">
        <input type="hidden" name="productionId" value={prod.id} />
        <div className="min-w-0 flex-1 space-y-2">
          <label htmlFor="baile" className="block text-sm font-medium">Nuevo baile</label>
          <input
            id="baile"
            name="name"
            required
            maxLength={80}
            placeholder="Mirlitones"
            className="min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-ink"
          />
        </div>
        <button type="submit" className="btn btn-gold">Agregar baile</button>
      </form>

      <form action={deleteProductionAction} className="border-t border-line pt-6">
        <input type="hidden" name="id" value={prod.id} />
        <DeleteButton label={`Eliminar la obra ${prod.name}`} />
        <p className="mt-2 text-sm text-muted">Elimina la obra con todos sus bailes y elencos.</p>
      </form>
    </>
  );
}
