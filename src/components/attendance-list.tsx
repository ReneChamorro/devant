"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { ArrowCounterClockwise, Check, Clock, Warning, X, Notebook } from "@phosphor-icons/react";
import { cancelDateAction, saveAttendanceAction } from "@/app/profe/actions";
import { ATTENDANCE_LABEL, KIND_INFO, type AttendanceStatus, type Session } from "@/lib/schedule";

type Mark = { status: Exclude<AttendanceStatus, "present">; note: string };
type Marks = Record<string, Mark>;

export type RosterStudent = {
  id: string;
  name: string;
  dances: string[];
  /** Short heads-up such as "2 faltas seguidas". */
  watch?: string;
};

export type RosterEntry = {
  session: Session;
  students: RosterStudent[];
  saved: { takenBy: string; takenAt: string; updatedAt?: string } | null;
  initial: Record<string, { status: Exclude<AttendanceStatus, "present">; note?: string }>;
  isPast: boolean;
  isFuture: boolean;
  /** Rehearsal prep: who to keep an eye on today. */
  attention: string[];
};

const STATUSES: { value: AttendanceStatus; Icon: typeof Check }[] = [
  { value: "present", Icon: Check },
  { value: "late", Icon: Clock },
  { value: "absent", Icon: X },
  { value: "excused", Icon: Notebook },
];

const ACTIVE_STYLE: Record<AttendanceStatus, string> = {
  present: "border-ok bg-ok/15 text-ok",
  late: "border-warn bg-warn/15 text-warn",
  absent: "border-bad bg-bad/15 text-bad",
  excused: "border-gold bg-gold/15 text-gold-text",
};

function stamp(iso: string) {
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function AttendanceList({ entries }: { entries: RosterEntry[] }) {
  if (entries.length === 0) {
    return <p className="card px-6 py-10 text-center text-muted">No hay clases ni ensayos este día.</p>;
  }
  return (
    <div className="space-y-8">
      {entries.map((e) => (
        <SessionRoll key={e.session.id} entry={e} />
      ))}
    </div>
  );
}

function SessionRoll({ entry }: { entry: RosterEntry }) {
  const { session, students, isPast, isFuture } = entry;
  const initial: Marks = Object.fromEntries(
    Object.entries(entry.initial).map(([id, m]) => [id, { status: m.status, note: m.note ?? "" }]),
  );

  const [marks, setMarks] = useState<Marks>(initial);
  const [undo, setUndo] = useState<Marks[]>([]);
  const [saved, setSaved] = useState(entry.saved);
  const [dirty, setDirty] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();
  const uid = useId();

  // Warn before leaving with marks that were never saved.
  useEffect(() => {
    if (!dirty) return;
    const h = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  function change(next: Marks) {
    setUndo((u) => [...u.slice(-19), marks]);
    setMarks(next);
    setDirty(true);
    setError("");
  }

  function setStatusFor(id: string, name: string, value: AttendanceStatus) {
    const next = { ...marks };
    if (value === "present") delete next[id];
    else next[id] = { status: value, note: marks[id]?.note ?? "" };
    change(next);
    setStatus(`${name}: ${ATTENDANCE_LABEL[value]}.`);
  }

  function setNote(id: string, note: string) {
    const cur = marks[id];
    if (!cur) return;
    setMarks({ ...marks, [id]: { ...cur, note } });
    setDirty(true);
    setError("");
  }

  function undoLast() {
    setUndo((u) => {
      const prev = u[u.length - 1];
      if (prev) setMarks(prev);
      return u.slice(0, -1);
    });
    setDirty(true);
  }

  const needsReason = !!saved && isPast && dirty;

  function save() {
    setError("");
    startTransition(async () => {
      const res = await saveAttendanceAction({
        sessionId: session.id,
        records: Object.entries(marks).map(([studentId, m]) => ({ studentId, status: m.status, note: m.note })),
        editReason: needsReason ? reason : undefined,
      });
      if (res.ok) {
        setSaved({ takenBy: res.takenBy, takenAt: res.takenAt, updatedAt: res.updatedAt });
        setDirty(false);
        setUndo([]);
        setReason("");
        setStatus("Lista guardada.");
      } else {
        setError(res.error);
      }
    });
  }

  const count = (s: AttendanceStatus) =>
    s === "present"
      ? students.length - Object.keys(marks).length
      : Object.values(marks).filter((m) => m.status === s).length;

  return (
    <section aria-labelledby={`r-${session.id}`} className="card overflow-hidden">
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
      <header className="space-y-2 border-b border-line p-4 sm:p-5">
        <p className="tabular text-sm text-muted">
          {session.start} a {session.end}
          {session.room && ` · ${session.room}`} · {session.teacher || "Profesor por asignar"}
        </p>
        <h2 id={`r-${session.id}`} className="!font-sans text-xl font-semibold !text-ink">
          {session.title} <span className="chip ml-1 align-middle">{KIND_INFO[session.kind].label}</span>
        </h2>

        {session.cancelled ? (
          <p className="text-sm font-semibold text-bad">Cancelada este día</p>
        ) : saved ? (
          <p className="text-sm text-ok">
            Lista guardada por {saved.takenBy}, {stamp(saved.takenAt)}
            {saved.updatedAt && ` (editada ${stamp(saved.updatedAt)})`}
          </p>
        ) : isFuture ? (
          <p className="text-sm text-muted">La lista se toma el mismo día.</p>
        ) : (
          <p className="text-sm text-warn">Lista sin guardar</p>
        )}

        {entry.attention.length > 0 && !session.cancelled && (
          <div className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm" role="note">
            <p className="mb-1 flex items-center gap-2 font-semibold text-warn">
              <Warning size={18} aria-hidden="true" /> Para el ensayo de hoy
            </p>
            <ul className="space-y-0.5 text-ink">
              {entry.attention.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        <form action={cancelDateAction}>
          <input type="hidden" name="id" value={session.templateId} />
          <input type="hidden" name="date" value={session.date} />
          <input type="hidden" name="cancelled" value={session.cancelled ? "0" : "1"} />
          <button type="submit" className="btn btn-ghost !min-h-10 !px-3 text-sm">
            {session.cancelled ? "Restaurar este día" : "No hay clase este día"}
          </button>
        </form>
      </header>

      {session.cancelled ? null : students.length === 0 ? (
        <p className="p-5 text-muted">No hay alumnas asignadas a esta actividad.</p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {students.map((st) => {
              const current = (marks[st.id]?.status ?? "present") as AttendanceStatus;
              const noteId = `${uid}-${st.id}`;
              return (
                <li key={st.id} className="space-y-3 px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{st.name}</p>
                      {st.dances.length > 0 && <p className="text-sm text-muted">{st.dances.join(", ")}</p>}
                      {st.watch && <p className="text-sm font-medium text-warn">{st.watch}</p>}
                    </div>
                    <div role="group" aria-label={`Asistencia de ${st.name}`} className="flex flex-wrap gap-1.5">
                      {STATUSES.map(({ value, Icon }) => {
                        const on = current === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={on}
                            disabled={isFuture}
                            onClick={() => setStatusFor(st.id, st.name, value)}
                            className={`btn !min-h-11 !px-3 text-sm disabled:opacity-50 ${on ? ACTIVE_STYLE[value] : "btn-ghost text-muted"}`}
                          >
                            <Icon size={18} weight={on ? "bold" : "regular"} aria-hidden="true" /> {ATTENDANCE_LABEL[value]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {current !== "present" && (
                    <div className="space-y-1">
                      <label htmlFor={noteId} className="block text-sm font-medium">
                        {current === "excused" ? "Motivo (obligatorio)" : "Nota (opcional)"}
                      </label>
                      <input
                        id={noteId}
                        value={marks[st.id]?.note ?? ""}
                        onChange={(ev) => setNote(st.id, ev.target.value)}
                        maxLength={200}
                        autoComplete="off"
                        className="min-h-11 w-full max-w-md rounded-xl border border-line bg-bg px-4 text-ink"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="space-y-3 border-t border-line p-4 sm:p-5">
            <p className="tabular flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="text-ok">{count("present")} presentes</span>
              <span className="text-warn">{count("late")} tarde</span>
              <span className="text-bad">{count("absent")} ausentes</span>
              <span className="text-gold-text">{count("excused")} justificadas</span>
            </p>

            {needsReason && (
              <div className="space-y-1">
                <label htmlFor={`${uid}-reason`} className="block text-sm font-medium">
                  Motivo del cambio (esta lista es de un día anterior)
                </label>
                <input
                  id={`${uid}-reason`}
                  value={reason}
                  onChange={(ev) => setReason(ev.target.value)}
                  maxLength={200}
                  autoComplete="off"
                  className="min-h-11 w-full max-w-md rounded-xl border border-line bg-bg px-4 text-ink"
                />
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-bad">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={save}
                disabled={pending || isFuture || (!!saved && !dirty)}
                className="btn btn-gold disabled:opacity-60"
              >
                {pending ? "Guardando..." : saved ? "Guardar cambios" : "Guardar lista"}
              </button>
              <button
                type="button"
                onClick={undoLast}
                disabled={undo.length === 0}
                className="btn btn-ghost disabled:opacity-50"
              >
                <ArrowCounterClockwise size={18} aria-hidden="true" /> Deshacer
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
