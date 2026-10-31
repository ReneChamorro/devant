"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveTemplateAction, type FormState } from "@/app/profe/actions";
import {
  KIND_INFO,
  KIND_ORDER,
  WEEKDAY_SHORT,
  WEEK_ORDER,
  type ClassKind,
  type Production,
  type Template,
} from "@/lib/schedule";

const ROOMS = ["Salón grande", "Salón chiquito"];

type Initial = Partial<Template> & { kind: ClassKind };

const field = "min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-ink";

export function TemplateForm({
  initial,
  teacherName,
  productions,
}: {
  initial: Initial;
  teacherName: string;
  productions: Production[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveTemplateAction, null);
  const e = state?.errors ?? {};

  const [kind, setKind] = useState<ClassKind>(initial.kind);
  const [title, setTitle] = useState(initial.title ?? "");
  const [teacher, setTeacher] = useState(initial.teacher ?? "");
  const [room, setRoom] = useState(initial.room ?? "");
  const [repeat, setRepeat] = useState<"weekly" | "once">(initial.date ? "once" : "weekly");
  const [days, setDays] = useState<number[]>(initial.days ?? [1, 2, 3, 4, 5]);
  const [date, setDate] = useState(initial.date ?? "");
  const [start, setStart] = useState(initial.start ?? "15:00");
  const [end, setEnd] = useState(initial.end ?? "16:00");
  const [productionId, setProductionId] = useState(
    initial.productionId ?? productions.find((p) => p.active)?.id ?? productions[0]?.id ?? "",
  );
  const [danceIds, setDanceIds] = useState<string[]>(initial.danceIds ?? []);
  const [production, setProduction] = useState(initial.production ?? "");
  const [note, setNote] = useState(initial.note ?? "");

  const isEdit = !!initial.id;
  const err = (k: string) => (e[k] ? <p id={`e-${k}`} role="alert" className="text-sm text-bad">{e[k]}</p> : null);

  return (
    <form action={action} className="card space-y-6 p-5 sm:p-6" aria-labelledby="form-title">
      <h2 id="form-title" className="text-2xl">{isEdit ? "Editar actividad" : "Nueva actividad"}</h2>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="kind" className="block text-sm font-medium">Tipo</label>
          <select
            id="kind"
            name="kind"
            value={kind}
            onChange={(ev) => setKind(ev.target.value as ClassKind)}
            aria-invalid={!!e.kind}
            className={field}
          >
            {KIND_ORDER.map((k) => (
              <option key={k} value={k}>{KIND_INFO[k].label}</option>
            ))}
          </select>
          {err("kind")}
        </div>
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium">Nombre en el calendario</label>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(ev) => setTitle(ev.target.value)}
            maxLength={60}
            placeholder={KIND_INFO[kind].label}
            aria-describedby="title-help"
            className={field}
          />
          <p id="title-help" className="text-sm text-muted">Si lo dejas vacío usa el nombre del tipo.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="teacher" className="block text-sm font-medium">Profesor o profesora</label>
          <input
            id="teacher"
            name="teacher"
            value={teacher}
            onChange={(ev) => setTeacher(ev.target.value)}
            maxLength={60}
            autoComplete="off"
            aria-describedby="teacher-help"
            className={field}
          />
          <p id="teacher-help" className="text-sm text-muted">
            Escribe el nombre como quieres que se vea.{" "}
            {!teacher && (
              <button type="button" className="text-gold-text underline" onClick={() => setTeacher(teacherName)}>
                Usar {teacherName}
              </button>
            )}
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="room" className="block text-sm font-medium">Salón</label>
          <input
            id="room"
            name="room"
            list="salones"
            value={room}
            onChange={(ev) => setRoom(ev.target.value)}
            maxLength={40}
            className={field}
          />
          <datalist id="salones">
            {ROOMS.map((r) => <option key={r} value={r} />)}
          </datalist>
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-medium">Cuándo</legend>
        <div className="flex flex-wrap gap-2">
          {([
            ["weekly", "Se repite cada semana"],
            ["once", "Una sola fecha"],
          ] as const).map(([v, label]) => (
            <label
              key={v}
              className={`btn !min-h-11 cursor-pointer text-sm ${repeat === v ? "border-gold bg-gold/15 text-gold-text" : "btn-ghost text-muted"}`}
            >
              <input
                type="radio"
                name="repeat"
                value={v}
                checked={repeat === v}
                onChange={() => setRepeat(v)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>

        {repeat === "weekly" ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Días de la semana" aria-describedby={e.days ? "e-days" : undefined}>
              {WEEK_ORDER.map((d) => {
                const on = days.includes(d);
                return (
                  <label
                    key={d}
                    className={`btn !min-h-11 !px-4 cursor-pointer text-sm ${on ? "border-gold bg-gold text-gold-ink" : "btn-ghost text-muted"}`}
                  >
                    <input
                      type="checkbox"
                      name="days"
                      value={d}
                      checked={on}
                      onChange={() => setDays((cur) => (on ? cur.filter((x) => x !== d) : [...cur, d]))}
                      className="sr-only"
                    />
                    {WEEKDAY_SHORT[d]}
                  </label>
                );
              })}
            </div>
            {err("days")}
          </div>
        ) : (
          <div className="max-w-xs space-y-2">
            <label htmlFor="date" className="block text-sm font-medium">Fecha</label>
            <input
              id="date"
              name="date"
              type="date"
              value={date}
              onChange={(ev) => setDate(ev.target.value)}
              aria-invalid={!!e.date}
              aria-describedby={e.date ? "e-date" : undefined}
              className={field}
            />
            {err("date")}
          </div>
        )}
      </fieldset>

      <div className="grid max-w-md gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="start" className="block text-sm font-medium">Hora de inicio</label>
          <input
            id="start"
            name="start"
            type="time"
            value={start}
            onChange={(ev) => setStart(ev.target.value)}
            aria-invalid={!!e.start}
            aria-describedby={e.start ? "e-start" : undefined}
            className={field}
          />
          {err("start")}
        </div>
        <div className="space-y-2">
          <label htmlFor="end" className="block text-sm font-medium">Hora de fin</label>
          <input
            id="end"
            name="end"
            type="time"
            value={end}
            onChange={(ev) => setEnd(ev.target.value)}
            aria-invalid={!!e.end}
            aria-describedby={e.end ? "e-end" : undefined}
            className={field}
          />
          {err("end")}
        </div>
      </div>

      {kind === "ensayo" && productions.length > 0 && (
        <div className="space-y-4">
          <div className="max-w-md space-y-2">
            <label htmlFor="productionId" className="block text-sm font-medium">Obra</label>
            <select
              id="productionId"
              name="productionId"
              value={productionId}
              onChange={(ev) => {
                setProductionId(ev.target.value);
                setDanceIds([]);
              }}
              className={field}
            >
              {productions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.active ? " (en montaje)" : ""}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Bailes que se ensayan</legend>
            <p className="text-sm text-muted">
              Solo las alumnas de estos bailes aparecen en la lista de ese ensayo. Si no marcas ninguno, aparece todo el elenco.
            </p>
            <div className="flex flex-wrap gap-2">
              {(productions.find((p) => p.id === productionId)?.dances ?? []).map((d) => {
                const on = danceIds.includes(d.id);
                return (
                  <label
                    key={d.id}
                    className={`btn !min-h-11 cursor-pointer text-sm ${on ? "border-gold bg-gold text-gold-ink" : "btn-ghost text-muted"}`}
                  >
                    <input
                      type="checkbox"
                      name="danceIds"
                      value={d.id}
                      checked={on}
                      onChange={() => setDanceIds((cur) => (on ? cur.filter((x) => x !== d.id) : [...cur, d.id]))}
                      className="sr-only"
                    />
                    {d.name}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}
      {kind === "ensayo" && productions.length === 0 && (
        <div className="max-w-md space-y-2">
          <label htmlFor="production" className="block text-sm font-medium">Obra</label>
          <input
            id="production"
            name="production"
            value={production}
            onChange={(ev) => setProduction(ev.target.value)}
            maxLength={60}
            className={field}
          />
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="note" className="block text-sm font-medium">Nota para las familias (opcional)</label>
        <textarea
          id="note"
          name="note"
          rows={2}
          maxLength={200}
          value={note}
          onChange={(ev) => setNote(ev.target.value)}
          className={`${field} py-3`}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn btn-gold disabled:opacity-60">
          {pending ? "Guardando..." : "Guardar"}
        </button>
        <Link href="/profe/horario" className="btn btn-ghost">Cancelar</Link>
      </div>
    </form>
  );
}
