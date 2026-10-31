"use client";

import { useId, useState, useTransition } from "react";
import { Check, LockKey, Question, X } from "@phosphor-icons/react";
import { setAvailabilityAction, unlockFamilyAction } from "@/app/f/actions";
import type { FamilyData } from "@/lib/family";
import { KIND_INFO, type Availability } from "@/lib/schedule";

const OPTIONS: { value: Availability; label: string; Icon: typeof Check }[] = [
  { value: "yes", label: "Voy", Icon: Check },
  { value: "maybe", label: "Quizá", Icon: Question },
  { value: "no", label: "No voy", Icon: X },
];

export function FamilyWeek({ token }: { token: string }) {
  const [data, setData] = useState<FamilyData | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Availability>>({});
  const [saved, setSaved] = useState("");
  const [pending, startTransition] = useTransition();
  const pinId = useId();

  if (!data) {
    return (
      <form
        className="card mx-auto max-w-sm space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await unlockFamilyAction(token, pin);
            if (res.ok) {
              setData(res.data);
              setAnswers(res.data.answers);
              setError(null);
            } else {
              setError(
                res.reason === "locked"
                  ? "Demasiados intentos. Espera un minuto e inténtalo de nuevo."
                  : "PIN incorrecto. Revisa los 4 números e inténtalo de nuevo.",
              );
            }
          });
        }}
      >
        <h2 className="flex items-center gap-2 text-xl">
          <LockKey size={22} aria-hidden="true" /> Entrar a mi semana
        </h2>
        <div className="space-y-2">
          <label htmlFor={pinId} className="block text-sm font-medium">PIN de la familia</label>
          <input
            id={pinId}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ""));
              setError(null);
            }}
            aria-invalid={!!error}
            aria-describedby={`${pinId}-help`}
            className="min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-lg tracking-[0.4em] text-ink"
          />
          <p id={`${pinId}-help`} className={`text-sm ${error ? "text-bad" : "text-muted"}`} role={error ? "alert" : undefined}>
            {error ?? "4 números. Te lo dio la academia junto con tu enlace."}
          </p>
        </div>
        <button type="submit" disabled={pending} className="btn btn-gold w-full disabled:opacity-60">
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    );
  }

  const key = (sid: string, kid: string) => `${sid}:${kid}`;

  function answer(sessionId: string, kidId: string, kidName: string, title: string, value: Availability, label: string) {
    const k = key(sessionId, kidId);
    const previous = answers[k];
    // Pressing the active answer again clears it, back to "sin respuesta".
    const next = previous === value ? null : value;
    setAnswers((a) => {
      const copy = { ...a };
      if (next) copy[k] = next;
      else delete copy[k];
      return copy;
    });
    startTransition(async () => {
      const res = await setAvailabilityAction(token, pin, sessionId, kidId, next);
      if (res.ok) {
        setSaved(next ? `${kidName}: ${label} en ${title}. Guardado.` : `${kidName}: respuesta borrada en ${title}.`);
      } else {
        // Roll back so the screen never shows an answer the academy did not receive.
        setAnswers((a) => {
          const copy = { ...a };
          if (previous) copy[k] = previous;
          else delete copy[k];
          return copy;
        });
        setSaved("No se pudo guardar. Inténtalo de nuevo.");
      }
    });
  }

  return (
    <div className="space-y-10">
      <p className="text-muted">
        Hola, <strong className="text-ink">{data.familyName}</strong>. Marca si cada bailarina puede asistir. Puedes cambiarlo hasta el mismo día; si tocas la misma opción otra vez, se borra.
      </p>
      <p className="sr-only" role="status" aria-live="polite">{saved}</p>
      {saved.startsWith("No se pudo") && <p role="alert" className="text-sm text-bad">{saved}</p>}

      {data.days.map((day) => (
        <section key={day.date} aria-labelledby={`d-${day.date}`}>
          <h2 id={`d-${day.date}`} className="mb-3 text-xl">{day.label}</h2>
          {day.items.length === 0 ? (
            <p className="card px-5 py-4 text-muted">Sin actividades para tus bailarinas.</p>
          ) : (
            <ul className="space-y-3">
              {day.items.map(({ session, studentIds }) => (
                <li key={session.id} className="card space-y-4 p-4 sm:p-5">
                  <div>
                    <p className="tabular text-sm text-muted">{session.start} a {session.end}{session.room && ` · ${session.room}`}</p>
                    {session.danceNames && session.danceNames.length > 0 && (
                      <p className="text-sm text-ink">Bailes: {session.danceNames.join(", ")}</p>
                    )}
                    <h3 className="!font-sans text-lg font-semibold !text-ink">
                      {session.title}{" "}
                      <span className="chip ml-1 align-middle">{KIND_INFO[session.kind].label}</span>
                    </h3>
                  </div>
                  {data.kids
                    .filter((k) => studentIds.includes(k.id))
                    .map((k) => {
                      const current = answers[key(session.id, k.id)];
                      return (
                        <div key={k.id} role="group" aria-label={`${k.name}: ${session.title}`} className="flex flex-wrap items-center justify-between gap-3">
                          <span className="font-medium">
                            {k.name}
                            {!current && <span className="ml-2 text-sm text-muted">Sin respuesta</span>}
                          </span>
                          <div className="flex gap-1.5">
                            {OPTIONS.map(({ value, label, Icon }) => {
                              const on = current === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  aria-pressed={on}
                                  onClick={() => answer(session.id, k.id, k.name, session.title, value, label)}
                                  className={`btn !min-h-11 !px-3 text-sm ${
                                    on
                                      ? value === "yes"
                                        ? "border-ok bg-ok/15 text-ok"
                                        : value === "no"
                                          ? "border-bad bg-bad/15 text-bad"
                                          : "border-warn bg-warn/15 text-warn"
                                      : "btn-ghost text-muted"
                                  }`}
                                >
                                  <Icon size={18} weight={on ? "bold" : "regular"} aria-hidden="true" /> {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
