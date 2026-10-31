"use client";

import { useActionState, useState } from "react";
import { loginAction, type FormState } from "@/app/profe/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, null);
  // Controlled so a failed attempt does not wipe the email (React resets uncontrolled fields).
  const [email, setEmail] = useState("");

  return (
    <form action={action} className="card space-y-4 p-6">
      <div className="space-y-2">
        <label htmlFor="correo" className="block text-sm font-medium">Correo</label>
        <input
          id="correo"
          name="correo"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-ink"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="clave" className="block text-sm font-medium">Contraseña</label>
        <input
          id="clave"
          name="clave"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-ink"
        />
      </div>
      {state?.message && (
        <p role="alert" className="text-sm text-bad">{state.message}</p>
      )}
      <button type="submit" disabled={pending} className="btn btn-gold w-full disabled:opacity-60">
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
