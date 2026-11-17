"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowCounterClockwise,
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
  Copy,
  Trash,
} from "@phosphor-icons/react";
import { saveChoreographyAction } from "@/app/profe/actions";
import { blankFormation, dancerColor, defaultPositions, fillMissing, initialsOf, newId, MAX_FORMATIONS } from "@/lib/choreo";
import type { Choreography, Formation, Point } from "@/lib/schedule";
import { FormationPlayer } from "./formation-player";
import { Stage, type Dancer } from "./stage";

type Draft = Pick<Choreography, "stage" | "music" | "formations">;

const field = "min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-ink";
const SNAPS = [
  { value: 0, label: "Libre" },
  { value: 0.5, label: "0,5 m" },
  { value: 1, label: "1 m" },
];

function seconds(ms: number) {
  return String(Math.round(ms / 100) / 10);
}

export function ChoreoEditor({
  danceId,
  danceName,
  dancers,
  initial,
  initialVersion,
}: {
  danceId: string;
  danceName: string;
  dancers: Dancer[];
  initial: Draft;
  initialVersion: number;
}) {
  const ids = dancers.map((d) => d.id);

  const [draft, setDraft] = useState<Draft>(() => ({
    ...initial,
    formations: (initial.formations.length ? initial.formations : [blankFormation(ids)]).map((f) => fillMissing(f, ids)),
  }));
  const [sel, setSel] = useState(0);
  const [selDancer, setSelDancer] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [snap, setSnap] = useState(0.5);
  const [version, setVersion] = useState(initialVersion);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const [hist, setHist] = useState<{ past: Draft[]; future: Draft[] }>({ past: [], future: [] });
  const dragSnapshot = useRef<Draft | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const h = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const formation = draft.formations[Math.min(sel, draft.formations.length - 1)];
  const idx = draft.formations.indexOf(formation);

  /** Records the state before a change so it can be undone. */
  function remember(before: Draft) {
    setHist((h) => ({ past: [...h.past.slice(-49), before], future: [] }));
  }

  function apply(next: Draft, opts: { record?: boolean } = {}) {
    if (opts.record !== false) remember(draft);
    setDraft(next);
    setDirty(true);
    setMessage(null);
  }

  function patchFormation(patch: Partial<Formation>, record = true) {
    apply(
      { ...draft, formations: draft.formations.map((f, i) => (i === idx ? { ...f, ...patch } : f)) },
      { record },
    );
  }

  function move(id: string, p: Point, commit: boolean) {
    if (!dragSnapshot.current) dragSnapshot.current = draft;
    setDraft((d) => ({
      ...d,
      formations: d.formations.map((f, i) => (i === idx ? { ...f, positions: { ...f.positions, [id]: p } } : f)),
    }));
    setDirty(true);
    setMessage(null);
    if (commit) {
      remember(dragSnapshot.current);
      dragSnapshot.current = null;
    }
  }

  function undo() {
    const prev = hist.past[hist.past.length - 1];
    if (!prev) return;
    setHist({ past: hist.past.slice(0, -1), future: [...hist.future, draft] });
    setDraft(prev);
    setDirty(true);
  }

  function redo() {
    const next = hist.future[hist.future.length - 1];
    if (!next) return;
    setHist({ past: [...hist.past, draft], future: hist.future.slice(0, -1) });
    setDraft(next);
    setDirty(true);
  }

  function addFormation() {
    if (draft.formations.length >= MAX_FORMATIONS) return;
    const copy: Formation = {
      ...formation,
      id: newId(),
      name: `Formación ${draft.formations.length + 1}`,
      counts: "",
      note: "",
      positions: { ...formation.positions },
    };
    const formations = [...draft.formations.slice(0, idx + 1), copy, ...draft.formations.slice(idx + 1)];
    apply({ ...draft, formations });
    setSel(idx + 1);
  }

  function removeFormation() {
    if (draft.formations.length <= 1) return;
    if (!window.confirm(`Eliminar "${formation.name}"? Se puede deshacer hasta que guardes.`)) return;
    apply({ ...draft, formations: draft.formations.filter((_, i) => i !== idx) });
    setSel(Math.max(0, idx - 1));
  }

  function shift(delta: -1 | 1) {
    const j = idx + delta;
    if (j < 0 || j >= draft.formations.length) return;
    const formations = [...draft.formations];
    [formations[idx], formations[j]] = [formations[j], formations[idx]];
    apply({ ...draft, formations });
    setSel(j);
  }

  function arrange(kind: "grid" | "row" | "circle") {
    const n = ids.length;
    if (n === 0) return;
    let positions: Record<string, Point> = {};
    if (kind === "grid") positions = defaultPositions(ids);
    if (kind === "row") ids.forEach((id, i) => (positions[id] = { x: n === 1 ? 0.5 : 0.1 + (0.8 * i) / (n - 1), y: 0.5 }));
    if (kind === "circle") {
      const ratio = draft.stage.depth / draft.stage.width;
      ids.forEach((id, i) => {
        const a = (2 * Math.PI * i) / n - Math.PI / 2;
        positions[id] = { x: 0.5 + 0.32 * ratio * Math.cos(a), y: 0.5 + 0.32 * Math.sin(a) };
      });
    }
    patchFormation({ positions });
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await saveChoreographyAction(danceId, version, {
        stage: draft.stage,
        music: draft.music,
        formations: draft.formations,
      });
      if (res.ok) {
        setVersion(res.version);
        setDirty(false);
        setMessage({ kind: "ok", text: "Coreograma guardado." });
      } else {
        setMessage({ kind: "error", text: res.error });
      }
    });
  }

  if (dancers.length === 0) {
    return (
      <p className="card px-5 py-8 text-center text-muted">
        Este baile no tiene elenco todavía. Elige las alumnas del baile en la página de la obra y vuelve aquí.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Modo" className="flex gap-1.5">
          {([
            ["edit", "Editar"],
            ["preview", "Vista previa"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`btn !min-h-11 text-sm ${mode === value ? "border-gold bg-gold/15 text-gold-text" : "btn-ghost text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={undo} disabled={hist.past.length === 0} className="btn btn-ghost !min-h-11 !px-3 disabled:opacity-50" aria-label="Deshacer">
            <ArrowCounterClockwise size={18} aria-hidden="true" /> Deshacer
          </button>
          <button type="button" onClick={redo} disabled={hist.future.length === 0} className="btn btn-ghost !min-h-11 !px-3 disabled:opacity-50" aria-label="Rehacer">
            <ArrowClockwise size={18} aria-hidden="true" /> Rehacer
          </button>
          <button type="button" onClick={save} disabled={pending || !dirty} className="btn btn-gold !min-h-11 disabled:opacity-60">
            {pending ? "Guardando..." : "Guardar coreograma"}
          </button>
        </div>
      </div>

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`text-sm ${message.kind === "error" ? "text-bad" : "text-ok"}`}>
          {message.text}
        </p>
      )}
      {dirty && !message && <p className="text-sm text-warn">Hay cambios sin guardar.</p>}

      {mode === "preview" ? (
        <FormationPlayer
          stage={draft.stage}
          formations={draft.formations}
          dancers={dancers}
          label={`Vista previa de ${danceName}`}
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-3">
              <Stage
                stage={draft.stage}
                dancers={dancers}
                positions={formation.positions}
                selectedId={selDancer}
                editable
                snap={snap}
                onMove={move}
                onSelect={setSelDancer}
                label={`Escenario de ${danceName}, formación ${idx + 1}. Arrastra a cada bailarina o muévela con las flechas.`}
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">Ajuste</span>
                <div role="group" aria-label="Ajuste a la cuadrícula" className="flex gap-1.5">
                  {SNAPS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      aria-pressed={snap === s.value}
                      onClick={() => setSnap(s.value)}
                      className={`btn !min-h-10 !px-3 text-sm ${snap === s.value ? "border-gold bg-gold/15 text-gold-text" : "btn-ghost text-muted"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <span className="ml-2 text-sm text-muted">Ordenar a todas</span>
                <div role="group" aria-label="Ordenar a todas las bailarinas" className="flex gap-1.5">
                  {([
                    ["grid", "Cuadrícula"],
                    ["row", "Fila"],
                    ["circle", "Círculo"],
                  ] as const).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => arrange(k)} className="btn btn-ghost !min-h-10 !px-3 text-sm">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted" aria-label="Quién es quién">
                {dancers.map((d, i) => (
                  <li key={d.id} className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold"
                      style={{ background: dancerColor(i).fill, color: dancerColor(i).ink }}
                    >
                      {initialsOf(d.name)}
                    </span>
                    {d.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="f-name" className="block text-sm font-medium">Nombre de la formación</label>
                <input id="f-name" value={formation.name} maxLength={60} onChange={(e) => patchFormation({ name: e.target.value }, false)} className={field} />
              </div>
              <div className="space-y-2">
                <label htmlFor="f-counts" className="block text-sm font-medium">Tiempos (opcional)</label>
                <input id="f-counts" value={formation.counts} maxLength={30} placeholder="1 a 8" onChange={(e) => patchFormation({ counts: e.target.value }, false)} className={field} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="f-hold" className="block text-sm font-medium">Se mantiene (s)</label>
                  <input id="f-hold" type="number" min={0} max={120} step={0.5} value={seconds(formation.holdMs)} onChange={(e) => patchFormation({ holdMs: Math.max(0, Number(e.target.value) || 0) * 1000 }, false)} className={field} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="f-trans" className="block text-sm font-medium">Pasa a la siguiente (s)</label>
                  <input id="f-trans" type="number" min={0} max={60} step={0.5} value={seconds(formation.transitionMs)} onChange={(e) => patchFormation({ transitionMs: Math.max(0, Number(e.target.value) || 0) * 1000 }, false)} className={field} />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="f-note" className="block text-sm font-medium">Nota para las bailarinas</label>
                <textarea id="f-note" rows={3} maxLength={500} value={formation.note} onChange={(e) => patchFormation({ note: e.target.value }, false)} className={`${field} py-2`} />
              </div>
            </div>
          </div>

          <section aria-labelledby="strip" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="strip" className="text-xl">Formaciones ({draft.formations.length})</h2>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={addFormation} disabled={draft.formations.length >= MAX_FORMATIONS} className="btn btn-gold !min-h-11 disabled:opacity-60">
                  <Copy size={18} aria-hidden="true" /> Agregar formación
                </button>
                <button type="button" onClick={() => shift(-1)} disabled={idx === 0} className="btn btn-ghost !min-h-11 !px-3 disabled:opacity-50" aria-label="Mover antes">
                  <ArrowLeft size={18} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => shift(1)} disabled={idx === draft.formations.length - 1} className="btn btn-ghost !min-h-11 !px-3 disabled:opacity-50" aria-label="Mover después">
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                <button type="button" onClick={removeFormation} disabled={draft.formations.length <= 1} className="btn btn-ghost !min-h-11 !px-3 text-bad disabled:opacity-50">
                  <Trash size={18} aria-hidden="true" /> Eliminar
                </button>
              </div>
            </div>
            <ol className="flex gap-3 overflow-x-auto pb-2">
              {draft.formations.map((f, i) => (
                <li key={f.id} className="w-36 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSel(i)}
                    aria-current={i === idx ? "true" : undefined}
                    className={`block w-full rounded-xl border p-1.5 text-left transition-[border-color] duration-150 ${i === idx ? "border-gold" : "border-line"}`}
                  >
                    <Stage stage={draft.stage} dancers={dancers} positions={f.positions} variant="mini" label={`Miniatura de ${f.name}`} />
                    <span className="mt-1 block truncate text-sm font-medium">{i + 1}. {f.name}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <details className="card p-4">
            <summary className="cursor-pointer text-lg font-semibold">Escenario y música</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="s-w" className="block text-sm font-medium">Ancho del escenario (m)</label>
                <input id="s-w" type="number" min={4} max={40} step={1} value={draft.stage.width} onChange={(e) => apply({ ...draft, stage: { ...draft.stage, width: Math.min(40, Math.max(4, Number(e.target.value) || 12)) } })} className={field} />
              </div>
              <div className="space-y-2">
                <label htmlFor="s-d" className="block text-sm font-medium">Fondo del escenario (m)</label>
                <input id="s-d" type="number" min={4} max={40} step={1} value={draft.stage.depth} onChange={(e) => apply({ ...draft, stage: { ...draft.stage, depth: Math.min(40, Math.max(4, Number(e.target.value) || 9)) } })} className={field} />
              </div>
              <div className="space-y-2">
                <label htmlFor="m-t" className="block text-sm font-medium">Música (título)</label>
                <input id="m-t" value={draft.music?.title ?? ""} maxLength={100} onChange={(e) => apply({ ...draft, music: { title: e.target.value, url: draft.music?.url ?? "" } }, { record: false })} className={field} />
              </div>
              <div className="space-y-2">
                <label htmlFor="m-u" className="block text-sm font-medium">Enlace a la grabación</label>
                <input id="m-u" type="url" value={draft.music?.url ?? ""} maxLength={500} placeholder="https://" onChange={(e) => apply({ ...draft, music: { title: draft.music?.title ?? "", url: e.target.value } }, { record: false })} className={field} />
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
