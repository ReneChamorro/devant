"use client";

import { useId, useState } from "react";
import { Check, LockKey, Question, X } from "@phosphor-icons/react";
import { KIND_INFO, type Session } from "@/lib/schedule";

export type FamilyDay = {
  date: string;
  label: string;
  items: { session: Session; studentIds: string[] }[];
};
type Kid = { id: string; name: string };
type Status = "yes" | "maybe" | "no";

const OPTIONS: { value: Status; label: string; Icon: typeof Check }[] = [
  { value: "yes", label: "Voy", Icon: Check },
  { value: "maybe", label: "Quizá", Icon: Question },
  { value: "no", label: "No voy", Icon: X },
];

export function FamilyWeek({
  familyName,
  pin,
  kids,
  days,
}: {
  familyName: string;
  pin: string;
  kids: Kid[];
  days: FamilyDay[];
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [attempt, setAttempt] = useState("");
  const [error, setError] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Status>>({});
  const [saved, setSaved] = useState("");
  const pinId = useId();

  if (!unlocked) {
    return (
      <form
        className="card mx-auto max-w-sm space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (attempt === pin) setUnlocked(true);
          else setError(true);
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
            value={attempt}
            onChange={(e) => {
              setAttempt(e.target.value.replace(/\D/g, ""));
              setError(false);
            }}
            aria-invalid={error}
            aria-describedby={`${pinId}-help`}
            className="min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-lg tracking-[0.4em] text-ink"
          />
          <p id={`${pinId}-help`} className={`text-sm ${error ? "text-bad" : "text-muted"}`} role={error ? "alert" : undefined}>
            {error ? "PIN incorrecto. Revisa los 4 números e inténtalo de nuevo." : "4 números. Te lo dio la academia junto con tu enlace."}
          </p>
        </div>
        <button type="submit" className="btn btn-gold w-full">Entrar</button>
      </form>
    );
  }

  const key = (sid: string, kid: string) => `${sid}:${kid}`;

  return (
    <div className="space-y-10">
      <p className="text-muted">
        Hola, <strong className="text-ink">{familyName}</strong>. Marca si cada bailarina puede asistir. Puedes cambiarlo hasta el mismo día.
      </p>
      <p className="sr-only" role="status" aria-live="polite">{saved}</p>

      {days.map((day) => (
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
                  {kids
                    .filter((k) => studentIds.includes(k.id))
                    .map((k) => {
                      const current = answers[key(session.id, k.id)];
                      return (
                        <div key={k.id} role="group" aria-label={`${k.name}: ${session.title}`} className="flex flex-wrap items-center justify-between gap-3">
                          <span className="font-medium">{k.name}</span>
                          <div className="flex gap-1.5">
                            {OPTIONS.map(({ value, label, Icon }) => {
                              const on = current === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  aria-pressed={on}
                                  onClick={() => {
                                    setAnswers((a) => ({ ...a, [key(session.id, k.id)]: value }));
                                    setSaved(`${k.name}: ${label} en ${session.title}. Guardado.`);
                                  }}
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
