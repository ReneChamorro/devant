import { Suspense } from "react";
import { connection } from "next/server";
import { DeleteButton } from "@/components/delete-button";
import { ListSkeleton } from "@/components/list-skeleton";
import { TeacherNav } from "@/components/teacher-nav";
import { requireTeacher } from "@/lib/auth";
import { KIND_INFO, LEVEL_KINDS } from "@/lib/schedule";
import { loadStudents } from "@/lib/store";
import { addStudentAction, deleteStudentAction, updateStudentAction } from "../actions";

export const metadata = { title: "Alumnas" };

const input = "min-h-12 rounded-xl border border-line bg-bg px-4 text-ink";

export default function AlumnasPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl">Alumnas</h1>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <AlumnasBody />
      </Suspense>
    </div>
  );
}

async function AlumnasBody() {
  await connection();
  const teacher = await requireTeacher();
  const students = await loadStudents();

  return (
    <>
      <TeacherNav current="alumnas" name={teacher.name} />
      <p className="mb-8 max-w-[58ch] text-muted">
        Esta lista es la que aparece al elegir el elenco de cada baile. Las alumnas que ves por defecto son de ejemplo; reemplázalas por las reales.
      </p>

      <form action={addStudentAction} className="card mb-10 flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-0 flex-1 space-y-2">
          <label htmlFor="nueva" className="block text-sm font-medium">Nombre y apellido</label>
          <input id="nueva" name="name" required maxLength={80} autoComplete="off" className={`${input} w-full`} />
        </div>
        <div className="space-y-2">
          <label htmlFor="nivel" className="block text-sm font-medium">Nivel</label>
          <select id="nivel" name="level" defaultValue="basico" className={input}>
            {LEVEL_KINDS.map((k) => (
              <option key={k} value={k}>{KIND_INFO[k].label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-gold">Agregar alumna</button>
      </form>

      {LEVEL_KINDS.map((level) => {
        const group = students.filter((s) => s.level === level).sort((a, b) => a.name.localeCompare(b.name, "es"));
        if (group.length === 0) return null;
        return (
          <section key={level} aria-labelledby={`lvl-${level}`} className="mb-8">
            <h2 id={`lvl-${level}`} className="mb-3 text-xl">
              {KIND_INFO[level].label} <span className="tabular text-base text-muted">({group.length})</span>
            </h2>
            <ul className="space-y-2">
              {group.map((s) => (
                <li key={s.id} className="card flex flex-wrap items-center gap-2 p-3">
                  <form action={updateStudentAction} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <label htmlFor={`nm-${s.id}`} className="sr-only">Nombre</label>
                    <input id={`nm-${s.id}`} name="name" defaultValue={s.name} required maxLength={80} className={`${input} min-w-0 flex-1`} />
                    <label htmlFor={`lv-${s.id}`} className="sr-only">Nivel</label>
                    <select id={`lv-${s.id}`} name="level" defaultValue={s.level} className={input}>
                      {LEVEL_KINDS.map((k) => (
                        <option key={k} value={k}>{KIND_INFO[k].label}</option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn-ghost !min-h-10 !px-4 text-sm">Guardar</button>
                  </form>
                  <form action={deleteStudentAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <DeleteButton label={`Eliminar a ${s.name}`} />
                  </form>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {students.length === 0 && (
        <p className="card px-5 py-8 text-center text-muted">Aún no hay alumnas. Agrega la primera arriba.</p>
      )}
    </>
  );
}
