/*
  Schedule model. Shared by server and client code, so no Node APIs here.
  Persistence lives in store.ts (local JSON file until Supabase is connected).
*/

export type ClassKind =
  | "baby-ballet"
  | "basico"
  | "intermedio-avanzado"
  | "intermedio"
  | "avanzado"
  | "puntas"
  | "pas-de-deux"
  | "variaciones"
  | "ensayo";

export const KIND_INFO: Record<ClassKind, { label: string; blurb: string; requirement?: string }> = {
  "baby-ballet": { label: "Baby ballet", blurb: "Primeros pasos desde los 3 años: ritmo, postura y juego." },
  basico: { label: "Básico", blurb: "Posiciones, barra y centro. Base técnica del ballet clásico." },
  "intermedio-avanzado": { label: "Intermedio / Avanzado", blurb: "Más control, giros, saltos y técnica de nivel escénico." },
  intermedio: { label: "Intermedio", blurb: "Más control, giros y saltos. Preparación para puntas." },
  avanzado: { label: "Avanzado", blurb: "Técnica completa, adagio y allegro de nivel escénico." },
  puntas: { label: "Puntas", blurb: "Trabajo en zapatillas de punta, con aprobación de la profesora.", requirement: "Aprobación de la profesora" },
  "pas-de-deux": { label: "Pas de deux", blurb: "Trabajo en pareja: equilibrio, apoyo y confianza.", requirement: "Estar en puntas" },
  variaciones: { label: "Variaciones", blurb: "Repertorio clásico: variaciones de las obras en cartelera." },
  ensayo: { label: "Ensayo", blurb: "Ensayo de la obra en montaje." },
};

export const KIND_ORDER: ClassKind[] = [
  "baby-ballet",
  "basico",
  "intermedio-avanzado",
  "intermedio",
  "avanzado",
  "puntas",
  "pas-de-deux",
  "variaciones",
  "ensayo",
];

export function isClassKind(v: unknown): v is ClassKind {
  return typeof v === "string" && v in KIND_INFO;
}

/** What teachers edit. Repeats weekly on `days`, or happens once on `date`. */
export type Template = {
  id: string;
  kind: ClassKind;
  title: string;
  /** Empty until the teacher fills it in. */
  teacher: string;
  room: string;
  /** 0 = domingo ... 6 = sábado. Ignored when `date` is set. */
  days: number[];
  /** YYYY-MM-DD for one-off activities. */
  date?: string;
  start: string; // HH:MM
  end: string;
  production?: string;
  productionId?: string;
  /** Dances being rehearsed (ensayo only). Empty means the whole cast. */
  danceIds?: string[];
  note?: string;
  /** Paused templates do not appear anywhere (e.g. pas de deux while only rehearsals run). */
  paused?: boolean;
  /** Dates (YYYY-MM-DD) where this repeating activity is cancelled. */
  skipDates?: string[];
};

/** A template resolved to a concrete date. */
export type Session = {
  id: string; // `${templateId}@${date}`
  templateId: string;
  date: string;
  start: string;
  end: string;
  kind: ClassKind;
  title: string;
  teacher: string;
  room: string;
  production?: string;
  danceIds?: string[];
  danceNames?: string[];
  note?: string;
  cancelled?: boolean;
};

export function sessionsForDate(
  templates: Template[],
  iso: string,
  includeCancelled = false,
  productions: Production[] = [],
): Session[] {
  const danceName = new Map(productions.flatMap((p) => p.dances.map((d) => [d.id, d.name] as const)));
  const dow = parseISODate(iso).getUTCDay();
  const out: Session[] = [];
  for (const t of templates) {
    if (t.paused) continue;
    const applies = t.date ? t.date === iso : t.days.includes(dow);
    if (!applies) continue;
    const cancelled = !!t.skipDates?.includes(iso);
    if (cancelled && !includeCancelled) continue;
    out.push({
      id: `${t.id}@${iso}`,
      templateId: t.id,
      date: iso,
      start: t.start,
      end: t.end,
      kind: t.kind,
      title: t.title,
      teacher: t.teacher,
      room: t.room,
      production: t.production,
      danceIds: t.danceIds?.length ? t.danceIds : undefined,
      danceNames: t.danceIds?.map((id) => danceName.get(id)).filter((n): n is string => !!n),
      note: t.note,
      cancelled: cancelled || undefined,
    });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}

/* ---------- dates (America/Caracas, no DST) ---------- */

export function toISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isValidISODate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISODate(s).getTime());
}

/** Today in Caracas as YYYY-MM-DD. */
export function todayCaracas(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

/** Monday of the week containing iso. */
export function startOfWeek(iso: string): string {
  const d = parseISODate(iso);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return toISODate(d);
}

export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("es-VE", { timeZone: "UTC", ...opts }).format(parseISODate(iso));
}

/** Like formatDay, with only the first letter capitalized (CSS `capitalize` would also capitalize "de"). */
export function formatDayCap(iso: string, opts: Intl.DateTimeFormatOptions): string {
  const s = formatDay(iso, opts);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const WEEKDAY_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
/** Display order for day pickers: Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function summarizeDays(days: number[]): string {
  const set = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const idx = set.map((d) => (d + 6) % 7);
  const contiguous = idx.length > 1 && idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (contiguous) return `${WEEKDAY_LONG[set[0]]} a ${WEEKDAY_LONG[set[set.length - 1]]}`;
  return set.map((d) => WEEKDAY_SHORT[d]).join(", ");
}

/* ---------- students, productions, casting ---------- */

/** Levels a student can be placed in. */
export const LEVEL_KINDS: ClassKind[] = ["baby-ballet", "basico", "intermedio", "avanzado", "puntas"];

export type Student = { id: string; name: string; level: ClassKind };
export type Dance = { id: string; name: string; studentIds: string[] };
export type Production = {
  id: string;
  name: string;
  /** The production currently being staged. Only one is active. */
  active: boolean;
  dances: Dance[];
};

/** Demo families until accounts are real. Student ids match the seed roster. */
export const DEMO_FAMILIES: Record<string, { name: string; pin: string; studentIds: string[] }> = {
  demo: { name: "Familia Rojas Ochoa", pin: "1234", studentIds: ["s1", "s2"] },
};

/** Who is expected at a session. Rehearsals of chosen dances use the cast picked by teachers. */
export function studentsForSession(
  s: Pick<Session, "kind" | "danceIds">,
  students: Student[],
  productions: Production[],
): Student[] {
  switch (s.kind) {
    case "ensayo": {
      if (s.danceIds?.length) {
        const wanted = new Set(s.danceIds);
        const ids = new Set(
          productions.flatMap((p) => p.dances.filter((d) => wanted.has(d.id)).flatMap((d) => d.studentIds)),
        );
        return students.filter((st) => ids.has(st.id));
      }
      return students.filter((st) => st.level !== "baby-ballet");
    }
    case "intermedio-avanzado":
      return students.filter((st) => ["intermedio", "avanzado", "puntas"].includes(st.level));
    case "pas-de-deux":
      return students.filter((st) => st.level === "puntas");
    case "variaciones":
      return students.filter((st) => ["avanzado", "puntas"].includes(st.level));
    default:
      return students.filter((st) => st.level === s.kind);
  }
}

/** Names of the chosen dances (of this session) that a student is cast in. */
export function dancesOfStudent(studentId: string, danceIds: string[] | undefined, productions: Production[]): string[] {
  if (!danceIds?.length) return [];
  const wanted = new Set(danceIds);
  return productions.flatMap((p) =>
    p.dances.filter((d) => wanted.has(d.id) && d.studentIds.includes(studentId)).map((d) => d.name),
  );
}
