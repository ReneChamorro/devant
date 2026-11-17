"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowCounterClockwise, Pause, Play } from "@phosphor-icons/react";
import { frameAt, startOf, totalDuration } from "@/lib/choreo";
import type { Formation } from "@/lib/schedule";
import { Stage, type Dancer } from "./stage";

const SPEEDS = [0.5, 1, 2];

/** Plays the formations in order, gliding from one to the next. Read only. */
export function FormationPlayer({
  stage,
  formations,
  dancers,
  highlightIds = [],
  label,
}: {
  stage: { width: number; depth: number };
  formations: Formation[];
  dancers: Dancer[];
  highlightIds?: string[];
  label: string;
}) {
  // Reduced motion: no gliding, the picture jumps from formation to formation.
  const cut = !!useReducedMotion();
  const total = totalDuration(formations, cut);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const tRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      tRef.current = Math.min(total, tRef.current + dt * speed);
      setT(tRef.current);
      if (tRef.current >= total) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, total]);

  if (formations.length === 0) {
    return <p className="card px-5 py-8 text-center text-muted">Este baile aún no tiene formaciones.</p>;
  }

  const frame = frameAt(formations, t, cut);
  const current = formations[frame.index];

  function jump(ms: number) {
    tRef.current = Math.min(total, Math.max(0, ms));
    setT(tRef.current);
  }

  return (
    <div className="space-y-4">
      <Stage
        stage={stage}
        dancers={dancers}
        positions={frame.positions}
        highlightIds={highlightIds}
        label={label}
      />

      {highlightIds.length > 0 && (
        <p className="text-sm text-muted">Tu bailarina aparece con un anillo dorado.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (!playing && tRef.current >= total) jump(0);
            setPlaying((p) => !p);
          }}
          className="btn btn-gold"
        >
          {playing ? <Pause size={20} weight="fill" aria-hidden="true" /> : <Play size={20} weight="fill" aria-hidden="true" />}
          {playing ? "Pausar" : "Reproducir"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            jump(0);
          }}
          className="btn btn-ghost"
        >
          <ArrowCounterClockwise size={18} aria-hidden="true" /> Inicio
        </button>
        <div role="group" aria-label="Velocidad" className="flex gap-1.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={speed === s}
              onClick={() => setSpeed(s)}
              className={`btn !min-h-11 !px-3 text-sm ${speed === s ? "border-gold bg-gold/15 text-gold-text" : "btn-ghost text-muted"}`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="scrub" className="block text-sm font-medium">Posición en el baile</label>
        <input
          id="scrub"
          type="range"
          min={0}
          max={Math.max(1, total)}
          step={50}
          value={Math.round(t)}
          onChange={(e) => {
            setPlaying(false);
            jump(Number(e.target.value));
          }}
          className="w-full accent-[var(--gold)]"
        />
      </div>

      <div role="group" aria-label="Formaciones" className="flex flex-wrap gap-2">
        {formations.map((f, i) => (
          <button
            key={f.id}
            type="button"
            aria-current={i === frame.index ? "true" : undefined}
            onClick={() => {
              setPlaying(false);
              jump(startOf(formations, i, cut));
            }}
            className={`btn !min-h-11 text-sm ${i === frame.index ? "border-gold bg-gold text-gold-ink" : "btn-ghost text-muted"}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="card space-y-1 p-4" aria-live="polite">
        <p className="font-semibold text-ink">
          {current.name}
          {current.counts && <span className="ml-2 text-sm font-normal text-muted">Tiempos {current.counts}</span>}
        </p>
        {current.note ? <p className="text-ink">{current.note}</p> : <p className="text-sm text-muted">Sin nota.</p>}
      </div>
    </div>
  );
}
