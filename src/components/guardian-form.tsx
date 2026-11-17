"use client";

import { useActionState } from "react";
import { addGuardianAction, type GuardianState } from "@/app/profe/actions";

const RELATIONS = ["Mamá", "Papá", "Abuela", "Abuelo", "Tutor o tutora", "Otro"];
const input = "min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-ink";

/** Adds an adult (name + email) to a family. The email is what they use to sign in. */
export function GuardianForm({ familyId }: { familyId: string }) {
  const [state, action, pending] = useActionState<GuardianState, FormData>(addGuardianAction, null);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="familyId" value={familyId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor={`gn-${familyId}`} className="block text-sm font-medium">Nombre del adulto</label>
          <input id={`gn-${familyId}`} name="name" required maxLength={80} autoComplete="off" className={input} />
        </div>
        <div className="space-y-2">
          <label htmlFor={`gr-${familyId}`} className="block text-sm font-medium">Parentesco</label>
          <select id={`gr-${familyId}`} name="relation" defaultValue="Mamá" className={input}>
            {RELATIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor={`ge-${familyId}`} className="block text-sm font-medium">Correo</label>
        <input
          id={`ge-${familyId}`}
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="off"
          aria-describedby={`gh-${familyId}`}
          className={`${input} max-w-md`}
        />
        <p id={`gh-${familyId}`} className="text-sm text-muted">Con este correo entra a la web y recibe su código.</p>
      </div>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-ok">Adulto agregado.</p>}
      <button type="submit" disabled={pending} className="btn btn-ghost disabled:opacity-60">
        {pending ? "Agregando..." : "Agregar adulto"}
      </button>
    </form>
  );
}
