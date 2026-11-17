"use client";

import { useRef } from "react";
import { dancerColor, initialsOf, snapPoint, stageGeometry } from "@/lib/choreo";
import type { Point } from "@/lib/schedule";

export type Dancer = { id: string; name: string };

type Props = {
  stage: { width: number; depth: number };
  dancers: Dancer[];
  positions: Record<string, Point>;
  /** Dancers to emphasize (e.g. the family's daughters). The rest are dimmed. */
  highlightIds?: string[];
  selectedId?: string | null;
  variant?: "full" | "mini";
  /** Dots can be dragged and moved with the arrow keys. */
  editable?: boolean;
  /** Snap to a grid of this many meters; 0 for free movement. */
  snap?: number;
  onMove?: (id: string, p: Point, commit: boolean) => void;
  onSelect?: (id: string | null) => void;
  label: string;
};

/**
 * The stage seen from above: the audience is at the top, the back of the stage at the bottom.
 * Plain SVG so every dot is focusable and keyboard movable.
 */
export function Stage({
  stage,
  dancers,
  positions,
  highlightIds = [],
  selectedId = null,
  variant = "full",
  editable = false,
  snap = 0,
  onMove,
  onSelect,
  label,
}: Props) {
  const geo = stageGeometry(stage.width, stage.depth);
  const mini = variant === "mini";
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<string | null>(null);
  const highlight = new Set(highlightIds);
  const dimOthers = highlight.size > 0;
  const r = mini ? 28 : 24;

  function pointFromEvent(ev: React.PointerEvent): Point | null {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    return geo.fromView(local.x, local.y);
  }

  const gridX = Array.from({ length: Math.max(0, Math.floor(stage.width) - 1) }, (_, i) => i + 1);
  const gridY = Array.from({ length: Math.max(0, Math.floor(stage.depth) - 1) }, (_, i) => i + 1);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${geo.viewW} ${geo.viewH}`}
      role="group"
      aria-label={label}
      className="h-auto w-full select-none rounded-2xl"
      style={{ background: "#0b1020", touchAction: editable ? "none" : "auto" }}
      onPointerDown={(ev) => {
        if (editable && ev.target === ev.currentTarget) onSelect?.(null);
      }}
    >
      <rect
        x={geo.x0}
        y={geo.y0}
        width={geo.innerW}
        height={geo.innerH}
        rx={6}
        fill="#141b30"
        stroke="#d4af37"
        strokeOpacity={0.55}
        strokeWidth={mini ? 3 : 2}
        onPointerDown={() => editable && onSelect?.(null)}
      />

      {!mini && (
        <g stroke="#ead9a4" strokeOpacity={0.1} strokeWidth={1} pointerEvents="none">
          {gridX.map((i) => (
            <line key={`x${i}`} x1={geo.x0 + (i / stage.width) * geo.innerW} y1={geo.y0} x2={geo.x0 + (i / stage.width) * geo.innerW} y2={geo.y0 + geo.innerH} />
          ))}
          {gridY.map((i) => (
            <line key={`y${i}`} x1={geo.x0} y1={geo.y0 + (i / stage.depth) * geo.innerH} x2={geo.x0 + geo.innerW} y2={geo.y0 + (i / stage.depth) * geo.innerH} />
          ))}
          <line
            x1={geo.x0 + geo.innerW / 2}
            y1={geo.y0}
            x2={geo.x0 + geo.innerW / 2}
            y2={geo.y0 + geo.innerH}
            strokeOpacity={0.28}
            strokeDasharray="8 8"
          />
        </g>
      )}

      {!mini && (
        <g fill="#a9b0c4" fontSize={22} textAnchor="middle" pointerEvents="none">
          <text x={VIEW_CENTER} y={geo.y0 - 12}>Público</text>
          <text x={VIEW_CENTER} y={geo.y0 + geo.innerH + 40}>Fondo</text>
        </g>
      )}

      {dancers.map((d, i) => {
        const pos = positions[d.id];
        if (!pos) return null;
        const { x, y } = geo.toView(pos);
        const color = dancerColor(i);
        const isHi = highlight.has(d.id);
        const isSel = selectedId === d.id;
        const dim = dimOthers && !isHi;
        const showName = !mini && (isHi || isSel);

        return (
          <g
            key={d.id}
            transform={`translate(${x} ${y})`}
            opacity={dim ? 0.4 : 1}
            tabIndex={editable ? 0 : undefined}
            role={editable ? "button" : "img"}
            aria-label={`${d.name}${isHi ? ", tu bailarina" : ""}`}
            style={{ cursor: editable ? "grab" : "default", outline: "none" }}
            onFocus={() => editable && onSelect?.(d.id)}
            onPointerDown={(ev) => {
              if (!editable) return;
              ev.stopPropagation();
              dragging.current = d.id;
              (ev.currentTarget as SVGGElement).setPointerCapture(ev.pointerId);
              onSelect?.(d.id);
            }}
            onPointerMove={(ev) => {
              if (!editable || dragging.current !== d.id) return;
              const p = pointFromEvent(ev);
              if (p) onMove?.(d.id, snapPoint(p, stage, snap), false);
            }}
            onPointerUp={(ev) => {
              if (!editable || dragging.current !== d.id) return;
              dragging.current = null;
              const p = pointFromEvent(ev);
              if (p) onMove?.(d.id, snapPoint(p, stage, snap), true);
            }}
            onPointerCancel={() => {
              dragging.current = null;
            }}
            onKeyDown={(ev) => {
              if (!editable) return;
              const step = (snap > 0 ? snap : 0.5) * (ev.shiftKey ? 4 : 1);
              const dx = ev.key === "ArrowRight" ? step : ev.key === "ArrowLeft" ? -step : 0;
              const dy = ev.key === "ArrowDown" ? step : ev.key === "ArrowUp" ? -step : 0;
              if (!dx && !dy) return;
              ev.preventDefault();
              onMove?.(
                d.id,
                {
                  x: Math.min(1, Math.max(0, pos.x + dx / stage.width)),
                  y: Math.min(1, Math.max(0, pos.y + dy / stage.depth)),
                },
                true,
              );
            }}
          >
            {isHi && <circle r={r + (mini ? 4 : 9)} fill="none" stroke="#d4af37" strokeWidth={mini ? 3 : 4} />}
            {isSel && !isHi && <circle r={r + 7} fill="none" stroke="#f0ecdf" strokeWidth={3} strokeDasharray="6 5" />}
            <circle r={r} fill={color.fill} stroke="#0b1020" strokeWidth={2} />
            {!mini && (
              <text textAnchor="middle" dy="0.35em" fontSize={19} fontWeight={700} fill={color.ink} pointerEvents="none">
                {initialsOf(d.name)}
              </text>
            )}
            {showName && (
              <text y={r + 28} textAnchor="middle" fontSize={22} fontWeight={600} fill="#f0ecdf" stroke="#0b1020" strokeWidth={5} paintOrder="stroke" pointerEvents="none">
                {d.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const VIEW_CENTER = 500;
