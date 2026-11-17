/*
  Local persistence: JSON files in .data/ (git-ignored), one per collection.
  Stand-in for Supabase. It only works where the filesystem is writable
  (local dev, a VPS), not on serverless hosting. Keep the function signatures
  and swap the bodies for database queries later.
*/
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { MAX_PRODUCTS, SEED_PRODUCTS, type Product } from "./catalog";
import { SEED_PRODUCTIONS, SEED_STUDENTS, SEED_TEMPLATES } from "./seed";
import type {
  AttendanceChange,
  Choreography,
  AttendanceRecord,
  AttendanceStatus,
  Dance,
  Family,
  FamilySession,
  Guardian,
  LoginCode,
  Production,
  SessionAttendance,
  Student,
  Template,
} from "./schedule";

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
const A = "attendance.json";
const AS = "attendance-sessions.json";
const AL = "attendance-log.json";

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
    await write(A, (await readRecords()).filter((r) => r.studentId !== id));
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

export async function deleteProduction(id: string): Promise<void> {
  const danceIds = (await readProductions()).find((p) => p.id === id)?.dances.map((d) => d.id) ?? [];
  await mutateProductions((all) => {
    const idx = all.findIndex((p) => p.id === id);
    if (idx >= 0) all.splice(idx, 1);
  });
  for (const danceId of danceIds) await deleteChoreography(danceId);
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
  }).then(() => deleteChoreography(danceId));
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

/* ---------- attendance (teacher only) ---------- */

const readRecords = () => read<AttendanceRecord>(A, []);
const readTaken = () => read<SessionAttendance>(AS, []);
const readLog = () => read<AttendanceChange>(AL, []);

export async function loadAttendance() {
  const [taken, records, log] = await Promise.all([readTaken(), readRecords(), readLog()]);
  return { taken, records, log };
}

export type SaveAttendanceInput = {
  /** Frozen copy of the session and expected students, built on the server. */
  session: Omit<SessionAttendance, "takenBy" | "takenAt" | "updatedAt">;
  /** Only the exceptions; everyone else is present. */
  records: { studentId: string; status: Exclude<AttendanceStatus, "present">; note?: string }[];
  by: string;
  /** Why an already-saved list is being edited. */
  editReason?: string;
};

/** Save (or re-save) the roll call of one session. Returns the saved header. */
export function saveAttendance(input: SaveAttendanceInput): Promise<SessionAttendance> {
  return exclusive(async () => {
    const [taken, records, log] = await Promise.all([readTaken(), readRecords(), readLog()]);
    const { session, by } = input;
    const now = new Date().toISOString();
    const names = new Map(session.expected.map((e) => [e.id, e.name]));

    const prevStatus = new Map(
      records.filter((r) => r.sessionId === session.sessionId).map((r) => [r.studentId, r.status as AttendanceStatus]),
    );
    const prevHeader = taken.find((t) => t.sessionId === session.sessionId);

    const nextRecords: AttendanceRecord[] = input.records.map((r) => ({
      sessionId: session.sessionId,
      studentId: r.studentId,
      studentName: names.get(r.studentId) ?? "",
      status: r.status,
      note: r.note || undefined,
      changedBy: by,
      changedAt: now,
    }));
    const nextStatus = new Map(nextRecords.map((r) => [r.studentId, r.status as AttendanceStatus]));

    // Audit only edits to a list that was already saved.
    if (prevHeader) {
      for (const e of session.expected) {
        const from = prevStatus.get(e.id) ?? "present";
        const to = nextStatus.get(e.id) ?? "present";
        if (from !== to) {
          log.push({
            sessionId: session.sessionId,
            studentId: e.id,
            studentName: e.name,
            from,
            to,
            reason: input.editReason || "Sin motivo indicado",
            by,
            at: now,
          });
        }
      }
    }

    const header: SessionAttendance = prevHeader
      ? { ...prevHeader, ...session, takenBy: prevHeader.takenBy, takenAt: prevHeader.takenAt, updatedAt: now }
      : { ...session, takenBy: by, takenAt: now };

    await write(A, [...records.filter((r) => r.sessionId !== session.sessionId), ...nextRecords]);
    await write(AS, [...taken.filter((t) => t.sessionId !== session.sessionId), header]);
    await write(AL, log);
    return header;
  });
}

/* ---------- families, guardians, login codes, sessions ---------- */

const F = "families.json";
const G = "guardians.json";
const LC = "login-codes.json";
const FS = "family-sessions.json";

const readFamilies = () => read<Family>(F, []);
const readGuardians = () => read<Guardian>(G, []);
const readCodes = () => read<LoginCode>(LC, []);
const readFamilySessions = () => read<FamilySession>(FS, []);

export const loadFamilies = readFamilies;
export const loadGuardians = readGuardians;

export function addFamily(name: string): Promise<string> {
  return exclusive(async () => {
    const all = await readFamilies();
    const id = randomUUID();
    all.push({ id, name, active: true, studentIds: [] });
    await write(F, all);
    return id;
  });
}

export function setFamilyActive(id: string, active: boolean): Promise<void> {
  return exclusive(async () => {
    const all = await readFamilies();
    const f = all.find((x) => x.id === id);
    if (!f) return;
    f.active = active;
    await write(F, all);
  });
}

/** Deletes the family, its adults, their codes and sessions. Students stay. */
export function deleteFamily(id: string): Promise<void> {
  return exclusive(async () => {
    const guardians = await readGuardians();
    const gone = new Set(guardians.filter((g) => g.familyId === id).map((g) => g.id));
    await write(F, (await readFamilies()).filter((f) => f.id !== id));
    await write(G, guardians.filter((g) => g.familyId !== id));
    await write(LC, (await readCodes()).filter((c) => !gone.has(c.guardianId)));
    await write(FS, (await readFamilySessions()).filter((s) => !gone.has(s.guardianId)));
  });
}

/** Replace the students linked to a family. Unknown ids are dropped. */
export function saveFamilyStudents(id: string, studentIds: string[]): Promise<void> {
  return exclusive(async () => {
    const valid = new Set((await readStudents()).map((s) => s.id));
    const all = await readFamilies();
    const f = all.find((x) => x.id === id);
    if (!f) return;
    f.studentIds = [...new Set(studentIds)].filter((sid) => valid.has(sid));
    await write(F, all);
  });
}

/** Returns an error message, or null when the adult was added. */
export function addGuardian(familyId: string, name: string, relation: string, email: string): Promise<string | null> {
  return exclusive(async () => {
    if (!(await readFamilies()).some((f) => f.id === familyId)) return "La familia ya no existe.";
    const all = await readGuardians();
    if (all.some((g) => g.email === email)) return "Ese correo ya está registrado en una familia.";
    all.push({ id: randomUUID(), familyId, name, relation, email });
    await write(G, all);
    return null;
  });
}

/** Revoking also closes every open session of that adult. */
export function setGuardianRevoked(id: string, revoked: boolean): Promise<void> {
  return exclusive(async () => {
    const all = await readGuardians();
    const g = all.find((x) => x.id === id);
    if (!g) return;
    g.revokedAt = revoked ? new Date().toISOString() : undefined;
    await write(G, all);
    if (revoked) {
      const now = new Date().toISOString();
      const sessions = await readFamilySessions();
      for (const s of sessions) if (s.guardianId === id && !s.revokedAt) s.revokedAt = now;
      await write(FS, sessions);
    }
  });
}

export function deleteGuardian(id: string): Promise<void> {
  return exclusive(async () => {
    await write(G, (await readGuardians()).filter((g) => g.id !== id));
    await write(LC, (await readCodes()).filter((c) => c.guardianId !== id));
    await write(FS, (await readFamilySessions()).filter((s) => s.guardianId !== id));
  });
}

export async function findGuardianByEmail(email: string): Promise<Guardian | undefined> {
  return (await readGuardians()).find((g) => g.email === email);
}

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODES_PER_WINDOW = 3;
const WINDOW_MS = 15 * 60 * 1000;

/** Stores a new code unless the adult asked for too many recently. Returns false when rate limited. */
export function createLoginCode(guardianId: string, codeHash: string): Promise<boolean> {
  return exclusive(async () => {
    const now = Date.now();
    const all = (await readCodes()).filter((c) => now - Date.parse(c.createdAt) < 24 * 60 * 60 * 1000);
    const recent = all.filter((c) => c.guardianId === guardianId && now - Date.parse(c.createdAt) < WINDOW_MS);
    if (recent.length >= MAX_CODES_PER_WINDOW) {
      await write(LC, all);
      return false;
    }
    // A new code invalidates older unused ones.
    for (const c of all) if (c.guardianId === guardianId && !c.usedAt) c.usedAt = new Date(now).toISOString();
    all.push({
      id: randomUUID(),
      guardianId,
      codeHash,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + CODE_TTL_MS).toISOString(),
      attempts: 0,
    });
    await write(LC, all);
    return true;
  });
}

/**
 * Checks the hash of the typed code against the newest unused one.
 * Wrong tries are counted; after 5 the code is dead. A right code is consumed.
 */
export function consumeLoginCode(guardianId: string, typedHash: string): Promise<"ok" | "bad" | "expired"> {
  return exclusive(async () => {
    const all = await readCodes();
    const now = Date.now();
    const code = all
      .filter((c) => c.guardianId === guardianId && !c.usedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!code) return "expired";
    if (Date.parse(code.expiresAt) < now || code.attempts >= 5) {
      code.usedAt = new Date(now).toISOString();
      await write(LC, all);
      return "expired";
    }
    if (typedHash !== code.codeHash) {
      code.attempts += 1;
      if (code.attempts >= 5) code.usedAt = new Date(now).toISOString();
      await write(LC, all);
      return "bad";
    }
    code.usedAt = new Date(now).toISOString();
    await write(LC, all);
    return "ok";
  });
}

export function createFamilySession(guardianId: string): Promise<FamilySession> {
  return exclusive(async () => {
    const now = new Date().toISOString();
    const s: FamilySession = { id: randomUUID(), guardianId, createdAt: now, lastUsedAt: now };
    const all = await readFamilySessions();
    all.push(s);
    await write(FS, all);
    const guardians = await readGuardians();
    const g = guardians.find((x) => x.id === guardianId);
    if (g) {
      g.lastLoginAt = now;
      await write(G, guardians);
    }
    return s;
  });
}

export function revokeFamilySession(id: string): Promise<void> {
  return exclusive(async () => {
    const all = await readFamilySessions();
    const s = all.find((x) => x.id === id);
    if (!s || s.revokedAt) return;
    s.revokedAt = new Date().toISOString();
    await write(FS, all);
  });
}

/** Active viewer for a session id: the session, adult and family must all be valid. */
export async function resolveFamilySession(id: string) {
  const [sessions, guardians, families] = await Promise.all([readFamilySessions(), readGuardians(), readFamilies()]);
  const session = sessions.find((s) => s.id === id);
  if (!session || session.revokedAt) return null;
  const guardian = guardians.find((g) => g.id === session.guardianId);
  if (!guardian || guardian.revokedAt) return null;
  const family = families.find((f) => f.id === guardian.familyId);
  if (!family || !family.active) return null;
  return { session, guardian, family };
}

/* ---------- choreographies ---------- */

const C = "choreographies.json";
const readChoreos = () => read<Choreography>(C, []);

export async function loadChoreographies(): Promise<Choreography[]> {
  return readChoreos();
}

export async function getChoreography(danceId: string): Promise<Choreography | undefined> {
  return (await readChoreos()).find((c) => c.danceId === danceId);
}

/**
 * Saves a choreography only when `expectedVersion` matches what is stored (0 for a new one).
 * Returns the saved record, or "conflict" when someone else saved in between.
 */
export function saveChoreography(
  input: Omit<Choreography, "id" | "version" | "updatedAt">,
  expectedVersion: number,
): Promise<Choreography | "conflict"> {
  return exclusive(async () => {
    const all = await readChoreos();
    const prev = all.find((c) => c.danceId === input.danceId);
    if ((prev?.version ?? 0) !== expectedVersion) return "conflict";
    const saved: Choreography = {
      ...input,
      id: prev?.id ?? randomUUID(),
      version: expectedVersion + 1,
      updatedAt: new Date().toISOString(),
    };
    await write(C, [...all.filter((c) => c.danceId !== input.danceId), saved]);
    return saved;
  });
}

/** Removes the choreography of a dance (used when the dance or its production is deleted). */
export function deleteChoreography(danceId: string): Promise<void> {
  return exclusive(async () => {
    await write(C, (await readChoreos()).filter((c) => c.danceId !== danceId));
  });
}

/* ---------- catalog ---------- */

const CAT = "catalog.json";
const IMG_DIR = path.join(DIR, "catalog");
const readProducts = () => read<Product>(CAT, SEED_PRODUCTS);

export const loadProducts = readProducts;

async function removeImage(file: string | undefined) {
  if (!file) return;
  await fs.rm(path.join(IMG_DIR, path.basename(file)), { force: true });
}

/** Stores an already validated photo and returns its file name. */
export async function saveProductImage(bytes: Buffer, ext: "jpg" | "png" | "webp"): Promise<string> {
  await fs.mkdir(IMG_DIR, { recursive: true });
  const file = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(IMG_DIR, file), bytes);
  return file;
}

export async function readProductImage(file: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(IMG_DIR, path.basename(file)));
  } catch {
    return null;
  }
}

type ProductInput = { id?: string; name: string; price: number; image?: string; removeImage?: boolean };

/** Creates or updates a product. A new `image` replaces (and deletes) the old photo. */
export function saveProduct(input: ProductInput): Promise<"ok" | "missing" | "full"> {
  return exclusive(async () => {
    const all = await readProducts();
    if (!input.id) {
      if (all.length >= MAX_PRODUCTS) return "full";
      await write(CAT, [...all, { id: randomUUID(), name: input.name, price: input.price, ...(input.image ? { image: input.image } : {}) }]);
      return "ok";
    }
    const prev = all.find((p) => p.id === input.id);
    if (!prev) return "missing";
    const image = input.image ?? (input.removeImage ? undefined : prev.image);
    if (prev.image && image !== prev.image) await removeImage(prev.image);
    const next: Product = { id: prev.id, name: input.name, price: input.price, ...(image ? { image } : {}) };
    await write(CAT, all.map((p) => (p.id === prev.id ? next : p)));
    return "ok";
  });
}

export function deleteProduct(id: string): Promise<void> {
  return exclusive(async () => {
    const all = await readProducts();
    await removeImage(all.find((p) => p.id === id)?.image);
    await write(CAT, all.filter((p) => p.id !== id));
  });
}
