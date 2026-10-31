/*
  Local persistence: JSON files in .data/ (git-ignored), one per collection.
  Stand-in for Supabase. It only works where the filesystem is writable
  (local dev, a VPS), not on serverless hosting. Keep the function signatures
  and swap the bodies for database queries later.
*/
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SEED_PRODUCTIONS, SEED_STUDENTS, SEED_TEMPLATES } from "./seed";
import type { Attendance, Availability, Dance, Production, Response, Student, Template } from "./schedule";

const DIR = path.join(process.cwd(), ".data");

// Serialize writes inside this process so two quick saves do not clobber each other.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function read<T>(name: string, seed: T[]): Promise<T[]> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(path.join(DIR, name), "utf8"));
    if (Array.isArray(parsed)) return parsed as T[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") console.error(`${name} unreadable, using seed`, err);
  }
  return structuredClone(seed);
}

async function write<T>(name: string, data: T[]) {
  await fs.mkdir(DIR, { recursive: true });
  const file = path.join(DIR, name);
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, file);
}

const T = "schedule.json";
const S = "students.json";
const P = "productions.json";
const R = "responses.json";

const readTemplates = () => read<Template>(T, SEED_TEMPLATES);
const readStudents = () => read<Student>(S, SEED_STUDENTS);
const readProductions = () => read<Production>(P, SEED_PRODUCTIONS);

/* ---------- schedule ---------- */

export const loadTemplates = readTemplates;
export const loadStudents = readStudents;
export const loadProductions = readProductions;

export async function loadAll() {
  const [templates, students, productions] = await Promise.all([readTemplates(), readStudents(), readProductions()]);
  return { templates, students, productions };
}

/** Create (no id) or update. Returns the saved template. */
export function saveTemplate(input: Omit<Template, "id"> & { id?: string }): Promise<Template> {
  return exclusive(async () => {
    const all = await readTemplates();
    const idx = input.id ? all.findIndex((t) => t.id === input.id) : -1;
    if (idx >= 0) {
      // Keep fields the form does not edit (cancelled dates, paused flag).
      const prev = all[idx];
      const next: Template = { ...prev, ...input, id: prev.id, skipDates: prev.skipDates, paused: prev.paused };
      all[idx] = next;
      await write(T, all);
      return next;
    }
    const created: Template = { ...input, id: randomUUID() };
    all.push(created);
    await write(T, all);
    return created;
  });
}

export function deleteTemplate(id: string): Promise<void> {
  return exclusive(async () => {
    await write(T, (await readTemplates()).filter((t) => t.id !== id));
  });
}

export function setPaused(id: string, paused: boolean): Promise<void> {
  return exclusive(async () => {
    const all = await readTemplates();
    const t = all.find((x) => x.id === id);
    if (!t) return;
    t.paused = paused || undefined;
    await write(T, all);
  });
}

/** Cancel or restore a single date of a repeating activity. */
export function setDateCancelled(id: string, date: string, cancelled: boolean): Promise<void> {
  return exclusive(async () => {
    const all = await readTemplates();
    const t = all.find((x) => x.id === id);
    if (!t) return;
    const set = new Set(t.skipDates ?? []);
    if (cancelled) set.add(date);
    else set.delete(date);
    t.skipDates = set.size ? [...set].sort() : undefined;
    await write(T, all);
  });
}

/* ---------- students ---------- */

export function addStudent(name: string, level: Student["level"]): Promise<void> {
  return exclusive(async () => {
    const all = await readStudents();
    all.push({ id: randomUUID(), name, level });
    await write(S, all);
  });
}

export function updateStudent(id: string, name: string, level: Student["level"]): Promise<void> {
  return exclusive(async () => {
    const all = await readStudents();
    const st = all.find((s) => s.id === id);
    if (!st) return;
    st.name = name;
    st.level = level;
    await write(S, all);
  });
}

/** Removes the student and takes them out of every dance. */
export function deleteStudent(id: string): Promise<void> {
  return exclusive(async () => {
    await write(S, (await readStudents()).filter((s) => s.id !== id));
    const prods = await readProductions();
    for (const p of prods) for (const d of p.dances) d.studentIds = d.studentIds.filter((x) => x !== id);
    await write(P, prods);
    await write(R, (await readResponses()).filter((r) => r.studentId !== id));
  });
}

/* ---------- productions and dances ---------- */

async function mutateProductions(fn: (all: Production[]) => void) {
  return exclusive(async () => {
    const all = await readProductions();
    fn(all);
    await write(P, all);
  });
}

export function addProduction(name: string): Promise<void> {
  return mutateProductions((all) => {
    // The first production ever created becomes the one in rehearsal.
    all.push({ id: randomUUID(), name, active: all.length === 0, dances: [] });
  });
}

export function setActiveProduction(id: string): Promise<void> {
  return mutateProductions((all) => {
    if (!all.some((p) => p.id === id)) return;
    for (const p of all) p.active = p.id === id;
  });
}

export function deleteProduction(id: string): Promise<void> {
  return mutateProductions((all) => {
    const idx = all.findIndex((p) => p.id === id);
    if (idx >= 0) all.splice(idx, 1);
  });
}

export function addDance(productionId: string, name: string): Promise<void> {
  return mutateProductions((all) => {
    all.find((p) => p.id === productionId)?.dances.push({ id: randomUUID(), name, studentIds: [] });
  });
}

export function renameDance(productionId: string, danceId: string, name: string): Promise<void> {
  return mutateProductions((all) => {
    const d = findDance(all, productionId, danceId);
    if (d) d.name = name;
  });
}

export function deleteDance(productionId: string, danceId: string): Promise<void> {
  return mutateProductions((all) => {
    const p = all.find((x) => x.id === productionId);
    if (p) p.dances = p.dances.filter((d) => d.id !== danceId);
  });
}

/** Replace the cast of a dance. Ids that are not real students are dropped. */
export function saveCast(productionId: string, danceId: string, studentIds: string[]): Promise<void> {
  return exclusive(async () => {
    const valid = new Set((await readStudents()).map((s) => s.id));
    const all = await readProductions();
    const d = findDance(all, productionId, danceId);
    if (!d) return;
    d.studentIds = [...new Set(studentIds)].filter((id) => valid.has(id));
    await write(P, all);
  });
}

function findDance(all: Production[], productionId: string, danceId: string): Dance | undefined {
  return all.find((p) => p.id === productionId)?.dances.find((d) => d.id === danceId);
}

/* ---------- responses (family availability, teacher attendance) ---------- */

const readResponses = () => read<Response>(R, []);
export const loadResponses = readResponses;

/** Set one field of a response. `null` clears it; an empty record is removed. */
export function setResponse(
  sessionId: string,
  studentId: string,
  field: "availability" | "attendance",
  value: Availability | Attendance | null,
): Promise<void> {
  return exclusive(async () => {
    const all = await readResponses();
    let r = all.find((x) => x.sessionId === sessionId && x.studentId === studentId);
    if (!r) {
      if (value === null) return;
      r = { sessionId, studentId };
      all.push(r);
    }
    if (value === null) delete r[field];
    else (r as Record<string, unknown>)[field] = value;
    await write(
      R,
      all.filter((x) => x.availability || x.attendance),
    );
  });
}
