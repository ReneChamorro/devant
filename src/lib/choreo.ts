import type { Choreography, Formation, Point } from "./schedule";

/* Pure helpers for formations on stage. No DOM and no Node APIs, so server and client can share them. */

export const DEFAULT_STAGE = { width: 12, depth: 9 };
export const MAX_FORMATIONS = 60;
export const DEFAULT_HOLD_MS = 4000;
export const DEFAULT_TRANSITION_MS = 2000;

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const clamp01 = (n: number) => clamp(n, 0, 1);

export function newId(): string {
  return globalThis.crypto.randomUUID();
}

/** Rows of up to 6 dancers, centred, toward the middle of the stage. */
export function defaultPositions(ids: string[]): Record<string, Point> {
  const out: Record<string, Point> = {};
  const perRow = Math.min(6, Math.max(1, ids.length));
  const rows = Math.ceil(ids.length / perRow);
  ids.forEach((id, i) => {
    const row = Math.floor(i / perRow);
    const inRow = row === rows - 1 ? ids.length - row * perRow : perRow;
    const col = i - row * perRow;
    out[id] = {
      x: inRow === 1 ? 0.5 : 0.15 + (0.7 * col) / (inRow - 1),
      y: rows === 1 ? 0.5 : 0.3 + (0.4 * row) / (rows - 1),
    };
  });
  return out;
}

export function blankFormation(ids: string[], index = 1): Formation {
  return {
    id: newId(),
    name: `Formación ${index}`,
    counts: "",
    holdMs: DEFAULT_HOLD_MS,
    transitionMs: DEFAULT_TRANSITION_MS,
    note: "",
    positions: defaultPositions(ids),
  };
}

/** Gives every cast member a spot, so a dancer added to the cast later is not missing from old formations. */
export function fillMissing(f: Formation, ids: string[]): Formation {
  const missing = ids.filter((id) => !f.positions[id]);
  if (missing.length === 0) return f;
  const spots = defaultPositions(missing);
  return { ...f, positions: { ...f.positions, ...spots } };
}

export function emptyChoreography(danceId: string, ids: string[]): Omit<Choreography, "id" | "version" | "updatedBy" | "updatedAt"> {
  return { danceId, stage: { ...DEFAULT_STAGE }, formations: [blankFormation(ids)] };
}

/* ---------- playback ---------- */

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Each formation is held, then (except the last) it moves to the next one. */
export function totalDuration(formations: Formation[], cut: boolean): number {
  return formations.reduce(
    (sum, f, i) => sum + f.holdMs + (i < formations.length - 1 && !cut ? f.transitionMs : 0),
    0,
  );
}

export type Frame = { index: number; positions: Record<string, Point>; moving: boolean };

/**
 * Where everyone is at time `t` (ms). With `cut` (reduced motion) there are no glides:
 * the picture jumps from one formation to the next.
 */
export function frameAt(formations: Formation[], t: number, cut: boolean): Frame {
  if (formations.length === 0) return { index: 0, positions: {}, moving: false };
  let at = Math.max(0, t);
  for (let i = 0; i < formations.length; i++) {
    const f = formations[i];
    if (at < f.holdMs) return { index: i, positions: f.positions, moving: false };
    at -= f.holdMs;
    const next = formations[i + 1];
    if (!next) break;
    const trans = cut ? 0 : f.transitionMs;
    if (at < trans) {
      const k = easeInOut(at / trans);
      const positions: Record<string, Point> = {};
      for (const id of Object.keys(next.positions)) {
        const a = f.positions[id] ?? next.positions[id];
        const b = next.positions[id];
        positions[id] = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
      }
      return { index: k < 0.5 ? i : i + 1, positions, moving: true };
    }
    at -= trans;
  }
  const last = formations.length - 1;
  return { index: last, positions: formations[last].positions, moving: false };
}

/** Start time (ms) of formation `i` in the timeline, to jump to it. */
export function startOf(formations: Formation[], i: number, cut: boolean): number {
  let t = 0;
  for (let k = 0; k < i && k < formations.length; k++) {
    t += formations[k].holdMs + (cut ? 0 : formations[k].transitionMs);
  }
  return t;
}

/* ---------- stage geometry ---------- */

export const VIEW_W = 1000;
const PAD_X = 50;
const PAD_TOP = 40;
const PAD_BOTTOM = 70;

export function stageGeometry(width: number, depth: number) {
  const innerW = VIEW_W - PAD_X * 2;
  const innerH = (innerW * depth) / width;
  const viewH = PAD_TOP + innerH + PAD_BOTTOM;
  return {
    viewW: VIEW_W,
    viewH,
    x0: PAD_X,
    y0: PAD_TOP,
    innerW,
    innerH,
    toView: (p: Point) => ({ x: PAD_X + p.x * innerW, y: PAD_TOP + p.y * innerH }),
    fromView: (x: number, y: number): Point => ({
      x: clamp01((x - PAD_X) / innerW),
      y: clamp01((y - PAD_TOP) / innerH),
    }),
  };
}

/** Round a position to a grid step given in meters. */
export function snapPoint(p: Point, stage: { width: number; depth: number }, stepMeters: number): Point {
  if (stepMeters <= 0) return p;
  const sx = stepMeters / stage.width;
  const sy = stepMeters / stage.depth;
  return { x: clamp01(Math.round(p.x / sx) * sx), y: clamp01(Math.round(p.y / sy) * sy) };
}

/* ---------- dancers ---------- */

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Spread hues so neighbours differ. Text color is chosen to keep contrast on every dot. */
export function dancerColor(index: number): { fill: string; ink: string } {
  const hue = Math.round((index * 137.508) % 360);
  return { fill: `hsl(${hue} 62% 62%)`, ink: "#0b1020" };
}

/* ---------- validation (used on the server) ---------- */

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? clamp(v, lo, hi) : fallback;

/**
 * Cleans what the editor sends. Only real cast members keep a position, values are clamped,
 * and the music link must be http or https.
 */
export function sanitizeChoreography(
  raw: unknown,
  castIds: string[],
): Pick<Choreography, "stage" | "music" | "formations"> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const stageRaw = (r.stage ?? {}) as Record<string, unknown>;
  const stage = {
    width: num(stageRaw.width, 4, 40, DEFAULT_STAGE.width),
    depth: num(stageRaw.depth, 4, 40, DEFAULT_STAGE.depth),
  };

  let music: Choreography["music"];
  if (r.music && typeof r.music === "object") {
    const m = r.music as Record<string, unknown>;
    const url = str(m.url, 500);
    if (/^https?:\/\/\S+$/i.test(url)) music = { title: str(m.title, 100), url };
  }

  if (!Array.isArray(r.formations) || r.formations.length > MAX_FORMATIONS) return null;
  const seen = new Set<string>();
  const fallbackSpots = defaultPositions(castIds);

  const formations: Formation[] = r.formations.map((fr, i) => {
    const f = (fr ?? {}) as Record<string, unknown>;
    let id = str(f.id, 64);
    if (!id || seen.has(id)) id = newId();
    seen.add(id);

    const posRaw = (f.positions ?? {}) as Record<string, unknown>;
    const positions: Record<string, Point> = {};
    for (const sid of castIds) {
      const p = posRaw[sid] as Record<string, unknown> | undefined;
      positions[sid] =
        p && typeof p.x === "number" && typeof p.y === "number" && Number.isFinite(p.x) && Number.isFinite(p.y)
          ? { x: clamp01(p.x), y: clamp01(p.y) }
          : fallbackSpots[sid];
    }

    return {
      id,
      name: str(f.name, 60) || `Formación ${i + 1}`,
      counts: str(f.counts, 30),
      holdMs: num(f.holdMs, 0, 120000, DEFAULT_HOLD_MS),
      transitionMs: num(f.transitionMs, 0, 60000, DEFAULT_TRANSITION_MS),
      note: str(f.note, 500),
      positions,
    };
  });

  return { stage, music, formations };
}
