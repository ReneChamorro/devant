"use client";

import { useActionState, useState } from "react";
import { requestCodeAction, verifyCodeAction, type RequestState, type VerifyState } from "@/app/entrar/actions";

const input = "min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-ink";

export function EntrarForm() {
  const [req, requestAction, requesting] = useActionState<RequestState, FormData>(requestCodeAction, { step: "email" });
  const [ver, verifyAction, verifying] = useActionState<VerifyState, FormData>(verifyCodeAction, null);
  // Controlled so a failed attempt keeps what the adult typed.
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [back, setBack] = useState(false);

  if (req.step === "code" && !back) {
    return (
      <form action={verifyAction} className="card space-y-4 p-6">
        <input type="hidden" name="correo" value={req.email} />
        <p className="text-muted">
          Si <strong className="text-ink">{req.email}</strong> está registrado en la academia, te enviamos un código de 6 números. Vence en 10 minutos.
        </p>
        {req.devCode && (
          <p role="note" className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-text">
            <strong className="font-semibold">Modo desarrollo.</strong> No hay servicio de correo configurado. Código: <strong>{req.devCode}</strong>
          </p>
        )}
        <div className="space-y-2">
          <label htmlFor="codigo" className="block text-sm font-medium">Código</label>
          <input
            id="codigo"
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            aria-invalid={!!ver?.error}
            aria-describedby={ver?.error ? "codigo-error" : undefined}
            className={`${input} text-lg tracking-[0.4em]`}
          />
          {ver?.error && (
            <p id="codigo-error" role="alert" className="text-sm text-bad">
              {ver.error}
            </p>
          )}
        </div>
        <button type="submit" disabled={verifying} className="btn btn-gold w-full disabled:opacity-60">
          {verifying ? "Entrando..." : "Entrar"}
        </button>
        <button
          type="button"
          className="w-full text-sm text-muted underline"
          onClick={() => {
            setBack(true);
            setCode("");
          }}
        >
          Usar otro correo o pedir un código nuevo
        </button>
      </form>
    );
  }

  return (
    <form
      action={(fd) => {
        setBack(false);
        return requestAction(fd);
      }}
      className="card space-y-4 p-6"
    >
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
          aria-invalid={"error" in req && !!req.error}
          aria-describedby="correo-help"
          className={input}
        />
        <p id="correo-help" className={`text-sm ${"error" in req && req.error ? "text-bad" : "text-muted"}`} role={"error" in req && req.error ? "alert" : undefined}>
          {"error" in req && req.error ? req.error : "Usa el correo que la academia tiene registrado para tu familia."}
        </p>
      </div>
      <button type="submit" disabled={requesting} className="btn btn-gold w-full disabled:opacity-60">
        {requesting ? "Enviando..." : "Enviarme un código"}
      </button>
    </form>
  );
}
