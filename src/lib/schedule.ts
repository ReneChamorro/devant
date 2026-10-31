/*
  DEMO DATA. Replace with Supabase queries (same shapes) in phase 2.
  Teachers, hours and student names below are invented placeholders.
*/

export type ClassKind =
  | "infantil"
  | "basico"
  | "intermedio"
  | "avanzado"
  | "puntas"
  | "pas-de-deux"
  | "variaciones"
  | "ensayo";

export const KIND_INFO: Record<ClassKind, { label: string; blurb: string; requirement?: string }> = {
  infantil: { label: "Infantil", blurb: "Primeros pasos desde los 3 años: ritmo, postura y juego." },
  basico: { label: "Básico", blurb: "Posiciones, barra y centro. Base técnica del ballet clásico." },
  intermedio: { label: "Intermedio", blurb: "Más control, giros y saltos. Preparación para puntas." },
  avanzado: { label: "Avanzado", blurb: "Técnica completa, adagio y allegro de nivel escénico." },
  puntas: { label: "Puntas", blurb: "Trabajo en zapatillas de punta, con aprobación de la profesora.", requirement: "Aprobación de la profesora" },
  "pas-de-deux": { label: "Pas de deux", blurb: "Trabajo en pareja: equilibrio, apoyo y confianza.", requirement: "Estar en puntas" },
  variaciones: { label: "Variaciones", blurb: "Repertorio clásico: variaciones de las obras en cartelera." },
  ensayo: { label: "Ensayo", blurb: "Ensayo de la obra en montaje." },
};

export type Session = {
  id: string;
  date: string; // YYYY-MM-DD, America/Caracas
  start: string; // HH:MM
  end: string;
  kind: ClassKind;
  title: string;
  teacher: string;
  room: string;
  production?: string;
  note?: string;
};

type Slot = Omit<Session, "id" | "date">;

// 0 = domingo ... 6 = sábado
const WEEK_TEMPLATE: Record<number, Slot[]> = {
  1: [
    { start: "16:00", end: "17:00", kind: "infantil", title: "Infantil (3 a 6 años)", teacher: "Prof. Marianela Ruiz", room: "Salón 1" },
    { start: "17:15", end: "18:30", kind: "basico", title: "Básico", teacher: "Prof. Marianela Ruiz", room: "Salón 1" },
    { start: "18:45", end: "20:15", kind: "intermedio", title: "Intermedio", teacher: "Prof. Andrés Villalobos", room: "Salón 2" },
  ],
  2: [
    { start: "16:00", end: "17:15", kind: "basico", title: "Básico", teacher: "Prof. Marianela Ruiz", room: "Salón 1" },
    { start: "17:30", end: "18:45", kind: "puntas", title: "Puntas", teacher: "Prof. Andrés Villalobos", room: "Salón 2" },
    { start: "19:00", end: "20:30", kind: "ensayo", title: "Ensayo: Copos de nieve", teacher: "Prof. Marianela Ruiz", room: "Salón 2", production: "El Cascanueces" },
  ],
  3: [
    { start: "16:00", end: "17:00", kind: "infantil", title: "Infantil (3 a 6 años)", teacher: "Prof. Marianela Ruiz", room: "Salón 1" },
    { start: "17:15", end: "18:30", kind: "intermedio", title: "Intermedio", teacher: "Prof. Andrés Villalobos", room: "Salón 2" },
    { start: "18:45", end: "20:15", kind: "avanzado", title: "Avanzado", teacher: "Prof. Andrés Villalobos", room: "Salón 2" },
  ],
  4: [
    { start: "17:30", end: "18:45", kind: "puntas", title: "Puntas", teacher: "Prof. Andrés Villalobos", room: "Salón 2" },
    { start: "19:00", end: "20:15", kind: "pas-de-deux", title: "Pas de deux", teacher: "Prof. Andrés Villalobos", room: "Salón 2" },
  ],
  5: [
    { start: "16:30", end: "17:45", kind: "basico", title: "Básico", teacher: "Prof. Marianela Ruiz", room: "Salón 1" },
    { start: "18:00", end: "19:30", kind: "ensayo", title: "Ensayo: Vals de las flores", teacher: "Prof. Marianela Ruiz", room: "Salón 2", production: "El Cascanueces" },
  ],
  6: [
    { start: "09:00", end: "10:00", kind: "infantil", title: "Infantil (3 a 6 años)", teacher: "Prof. Marianela Ruiz", room: "Salón 1" },
    { start: "10:30", end: "12:30", kind: "ensayo", title: "Ensayo general", teacher: "Todo el equipo", room: "Salón 2", production: "El Cascanueces", note: "Asistencia de elenco completo." },
    { start: "13:00", end: "14:15", kind: "variaciones", title: "Variaciones", teacher: "Prof. Andrés Villalobos", room: "Salón 2" },
  ],
};

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

export function sessionsForDate(iso: string): Session[] {
  const slots = WEEK_TEMPLATE[parseISODate(iso).getUTCDay()] ?? [];
  return slots.map((s, i) => ({ ...s, id: `${iso}-${i}`, date: iso }));
}

export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("es-VE", { timeZone: "UTC", ...opts }).format(parseISODate(iso));
}

/** Demo roster: family tokens map to students. */
export type Student = { id: string; name: string; level: ClassKind };

export const DEMO_STUDENTS: Student[] = [
  { id: "s1", name: "Valentina Rojas", level: "intermedio" },
  { id: "s2", name: "Camila Ochoa", level: "basico" },
  { id: "s3", name: "Sofía Brito", level: "avanzado" },
  { id: "s4", name: "Isabella Pino", level: "puntas" },
  { id: "s5", name: "Mariana Linares", level: "infantil" },
  { id: "s6", name: "Gabriela Mendoza", level: "intermedio" },
  { id: "s7", name: "Luciana Paredes", level: "puntas" },
  { id: "s8", name: "Daniela Sucre", level: "basico" },
];

export const DEMO_FAMILIES: Record<string, { name: string; pin: string; studentIds: string[] }> = {
  demo: { name: "Familia Rojas Ochoa", pin: "1234", studentIds: ["s1", "s2"] },
};

/** Which levels attend a given session (demo rule). */
export function studentsForSession(s: Session): Student[] {
  if (s.kind === "ensayo") return DEMO_STUDENTS.filter((st) => st.level !== "infantil");
  return DEMO_STUDENTS.filter((st) => st.level === s.kind || (s.kind === "pas-de-deux" && st.level === "puntas") || (s.kind === "variaciones" && ["avanzado", "puntas"].includes(st.level)));
}

/** Like formatDay, with only the first letter capitalized (CSS `capitalize` would also capitalize "de"). */
export function formatDayCap(iso: string, opts: Intl.DateTimeFormatOptions): string {
  const s = formatDay(iso, opts);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
