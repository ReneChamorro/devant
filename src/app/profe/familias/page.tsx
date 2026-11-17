import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { GuardianForm } from "@/components/guardian-form";
import { ListSkeleton } from "@/components/list-skeleton";
import { StudentPicker } from "@/components/student-picker";
import { TeacherNav } from "@/components/teacher-nav";
import { requireTeacher } from "@/lib/auth";
import { FAMILIES_ENABLED } from "@/lib/site";
import { loadFamilies, loadGuardians, loadStudents } from "@/lib/store";
import {
  addFamilyAction,
  deleteFamilyAction,
  deleteGuardianAction,
  saveFamilyStudentsAction,
  setFamilyActiveAction,
  setGuardianRevokedAction,
} from "../actions";

export const metadata = { title: "Familias" };

function when(iso?: string) {
  if (!iso) return "Aún no ha entrado";
  return `Último acceso: ${new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))}`;
}

export default function FamiliasPage() {
  if (!FAMILIES_ENABLED) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl">Familias</h1>
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <FamiliasBody />
      </Suspense>
    </div>
  );
}

async function FamiliasBody() {
  await connection();
  const teacher = await requireTeacher();
  const [families, guardians, students] = await Promise.all([loadFamilies(), loadGuardians(), loadStudents()]);

  return (
    <>
      <TeacherNav current="familias" name={teacher.name} />
      <p className="mb-8 max-w-[62ch] text-muted">
        Cada adulto entra con su correo: pide un código en la web y lo recibe en su bandeja. Aquí registras a la familia, a cada adulto con su correo y las alumnas que le corresponden. Las familias solo ven; no escriben nada.
      </p>

      <ul className="mb-10 space-y-4">
        {families.map((f) => {
          const adults = guardians.filter((g) => g.familyId === f.id);
          const kids = students.filter((s) => f.studentIds.includes(s.id));
          return (
            <li key={f.id} className="card">
              <details>
                <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <span className="!font-sans text-lg font-semibold">
                    Familia {f.name}
                    {!f.active && <span className="chip ml-2 align-middle text-warn">Desactivada</span>}
                  </span>
                  <span className="tabular text-sm text-muted">
                    {adults.length} {adults.length === 1 ? "adulto" : "adultos"} · {kids.length}{" "}
                    {kids.length === 1 ? "alumna" : "alumnas"}
                  </span>
                </summary>

                <div className="space-y-8 border-t border-line px-4 py-5 sm:px-5">
                  <section aria-labelledby={`ad-${f.id}`} className="space-y-3">
                    <h2 id={`ad-${f.id}`} className="text-xl">Adultos</h2>
                    {adults.length === 0 ? (
                      <p className="text-sm text-muted">Aún no hay adultos. Agrega al menos uno para que la familia pueda entrar.</p>
                    ) : (
                      <ul className="space-y-2">
                        {adults.map((g) => (
                          <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
                            <div>
                              <p className="font-medium">
                                {g.name} <span className="text-sm text-muted">({g.relation})</span>
                                {g.revokedAt && <span className="chip ml-2 align-middle text-warn">Sin acceso</span>}
                              </p>
                              <p className="text-sm text-muted">{g.email}</p>
                              <p className="text-sm text-muted">{when(g.lastLoginAt)}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <form action={setGuardianRevokedAction}>
                                <input type="hidden" name="id" value={g.id} />
                                <input type="hidden" name="revoked" value={g.revokedAt ? "0" : "1"} />
                                <button type="submit" className="btn btn-ghost !min-h-10 !px-3 text-sm">
                                  {g.revokedAt ? "Dar acceso" : "Quitar acceso"}
                                </button>
                              </form>
                              <form action={deleteGuardianAction}>
                                <input type="hidden" name="id" value={g.id} />
                                <DeleteButton label={`Eliminar a ${g.name}`} />
                              </form>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <GuardianForm familyId={f.id} />
                  </section>

                  <section aria-labelledby={`st-${f.id}`} className="space-y-3 border-t border-line pt-6">
                    <h2 id={`st-${f.id}`} className="text-xl">Alumnas de esta familia</h2>
                    <StudentPicker
                      students={students}
                      initial={f.studentIds}
                      action={saveFamilyStudentsAction}
                      hidden={{ familyId: f.id }}
                      idPrefix={f.id}
                      submitLabel="Guardar alumnas"
                    />
                  </section>

                  <div className="flex flex-wrap gap-3 border-t border-line pt-6">
                    <form action={setFamilyActiveAction}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="active" value={f.active ? "0" : "1"} />
                      <button type="submit" className="btn btn-ghost">
                        {f.active ? "Desactivar familia" : "Reactivar familia"}
                      </button>
                    </form>
                    <form action={deleteFamilyAction}>
                      <input type="hidden" name="id" value={f.id} />
                      <DeleteButton label={`Eliminar la familia ${f.name}`} />
                    </form>
                  </div>
                </div>
              </details>
            </li>
          );
        })}
        {families.length === 0 && (
          <li className="card px-5 py-8 text-center text-muted">Aún no hay familias. Crea la primera abajo.</li>
        )}
      </ul>

      <form action={addFamilyAction} className="card flex max-w-xl flex-wrap items-end gap-3 p-5">
        <div className="min-w-0 flex-1 space-y-2">
          <label htmlFor="familia" className="block text-sm font-medium">Nueva familia (apellidos)</label>
          <input
            id="familia"
            name="name"
            required
            maxLength={80}
            placeholder="Rojas Ochoa"
            className="min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-ink"
          />
        </div>
        <button type="submit" className="btn btn-gold">Crear familia</button>
      </form>
    </>
  );
}
