"use client";

import { useState } from "react";
import { Check, Clock, X } from "@phosphor-icons/react";
import { KIND_INFO, type Session, type Student } from "@/lib/schedule";

type Avail = "yes" | "maybe" | "no" | "none";
type Mark = "present" | "late" | "absent";

export type RosterEntry = {
  session: Session;
  students: (Student & { avail: Avail })[];
};

const AVAIL_LABEL: Record<Avail, string> = {
  yes: "Va",
  maybe: "Quizá",
  no: "No va",
  none: "Sin respuesta",
};
const AVAIL_STYLE: Record<Avail, string> = {
  yes: "text-ok",
  maybe: "text-warn",
  no: "text-bad",
  none: "text-muted",
};
const MARKS: { value: Mark; label: string; Icon: typeof Check }[] = [
  { value: "present", label: "Presente", Icon: Check },
  { value: "late", label: "Tarde", Icon: Clock },
  { value: "absent", label: "Ausente", Icon: X },
];

export function DayRoster({ entries }: { entries: RosterEntry[] }) {
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [status, setStatus] = useState("");

  if (entries.length === 0) {
    return <p className="card px-6 py-10 text-center text-muted">No hay clases ni ensayos este día.</p>;
  }

  return (
    <div className="space-y-8">
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
      {entries.map(({ session, students }) => {
        const count = (a: Avail) => students.filter((s) => s.avail === a).length;
        return (
          <section key={session.id} aria-labelledby={`r-${session.id}`} className="card overflow-hidden">
            <header className="space-y-2 border-b border-line p-4 sm:p-5">
              <p className="tabular text-sm text-muted">{session.start} a {session.end} · {session.room} · {session.teacher}</p>
              <h2 id={`r-${session.id}`} className="!font-sans text-xl font-semibold !text-ink">
                {session.title} <span className="chip ml-1 align-middle">{KIND_INFO[session.kind].label}</span>
              </h2>
              <p className="tabular flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="text-ok">{count("yes")} van</span>
                <span className="text-warn">{count("maybe")} quizá</span>
                <span className="text-bad">{count("no")} no van</span>
                <span className="text-muted">{count("none")} sin respuesta</span>
              </p>
            </header>

            {students.length === 0 ? (
              <p className="p-5 text-muted">No hay alumnas asignadas a esta actividad.</p>
            ) : (
              <ul className="divide-y divide-line">
                {students.map((st) => {
                  const k = `${session.id}:${st.id}`;
                  return (
                    <li key={st.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                      <div>
                        <p className="font-medium">{st.name}</p>
                        <p className={`text-sm ${AVAIL_STYLE[st.avail]}`}>{AVAIL_LABEL[st.avail]}</p>
                      </div>
                      <div role="group" aria-label={`Asistencia de ${st.name}`} className="flex gap-1.5">
                        {MARKS.map(({ value, label, Icon }) => {
                          const on = marks[k] === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={on}
                              onClick={() => {
                                setMarks((m) => ({ ...m, [k]: value }));
                                setStatus(`${st.name}: ${label}.`);
                              }}
                              className={`btn !min-h-11 !px-3 text-sm ${
                                on
                                  ? value === "absent"
                                    ? "border-bad bg-bad/15 text-bad"
                                    : value === "late"
                                      ? "border-warn bg-warn/15 text-warn"
                                      : "border-ok bg-ok/15 text-ok"
                                  : "btn-ghost text-muted"
                              }`}
                            >
                              <Icon size={18} weight={on ? "bold" : "regular"} aria-hidden="true" /> {label}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
