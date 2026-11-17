"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  checkCredentials,
  endTeacherSession,
  requireTeacher,
  startTeacherSession,
} from "@/lib/auth";
import {
  addDance,
  addFamily,
  addGuardian,
  addProduction,
  addStudent,
  deleteDance,
  deleteFamily,
  deleteGuardian,
  deleteProduction,
  deleteStudent,
  deleteTemplate,
  loadAll,
  loadAttendance,
  loadProductions,
  renameDance,
  saveAttendance,
  saveCast,
  saveChoreography,
  saveFamilyStudents,
  saveTemplate,
  setActiveProduction,
  setFamilyActive,
  setGuardianRevoked,
  setDateCancelled,
  setPaused,
  updateStudent,
} from "@/lib/store";
import { sanitizeChoreography } from "@/lib/choreo";
import {
  isAttendanceStatus,
  isClassKind,
  isEmail,
  isValidISODate,
  KIND_INFO,
  LEVEL_KINDS,
  normalizeEmail,
  sessionsForDate,
  studentsForSession,
  todayCaracas,
  type Template,
} from "@/lib/schedule";

export type FormState = { errors?: Record<string, string>; message?: string } | null;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function str(fd: FormData, key: string, max: number) {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}

function refresh() {
  for (const p of ["/", "/calendario", "/profe/dia", "/profe/horario", "/profe/obras", "/profe/alumnas", "/profe/reportes"]) revalidatePath(p);
  revalidatePath("/profe/alumnas/[id]", "page");
  revalidatePath("/profe/familias");
  revalidatePath("/familia");
  revalidatePath("/profe/obras/[id]", "page");
  revalidatePath("/f/[token]", "page");
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "correo", 200);
  const password = String(fd.get("clave") ?? "").slice(0, 200);
  const result = checkCredentials(email, password);
  if (result === "locked") return { message: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." };
  if (result === "bad") return { message: "Correo o contraseña incorrectos." };
  await startTeacherSession();
  redirect("/profe/dia");
}

export async function logoutAction() {
  await endTeacherSession();
  redirect("/profe");
}

export async function saveTemplateAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const errors: Record<string, string> = {};

  const kindRaw = String(fd.get("kind") ?? "");
  if (!isClassKind(kindRaw)) errors.kind = "Elige el tipo de actividad.";
  const kind = isClassKind(kindRaw) ? kindRaw : "basico";

  const start = str(fd, "start", 5);
  const end = str(fd, "end", 5);
  if (!TIME.test(start)) errors.start = "Hora de inicio no válida.";
  if (!TIME.test(end)) errors.end = "Hora de fin no válida.";
  if (!errors.start && !errors.end && end <= start) errors.end = "La hora de fin debe ser después del inicio.";

  const repeat = String(fd.get("repeat") ?? "weekly");
  let days: number[] = [];
  let date: string | undefined;
  if (repeat === "once") {
    const d = str(fd, "date", 10);
    if (!isValidISODate(d)) errors.date = "Elige la fecha.";
    else date = d;
  } else {
    days = fd
      .getAll("days")
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    days = [...new Set(days)];
    if (days.length === 0) errors.days = "Marca al menos un día.";
  }

  if (Object.keys(errors).length) return { errors };

  // Rehearsals can point at a production and the dances being rehearsed.
  let productionId: string | undefined;
  let productionName: string | undefined;
  let danceIds: string[] | undefined;
  let danceNames: string[] = [];
  if (kind === "ensayo") {
    const prods = await loadProductions();
    const prod = prods.find((p) => p.id === str(fd, "productionId", 80));
    if (prod) {
      productionId = prod.id;
      productionName = prod.name;
      const picked = new Set(fd.getAll("danceIds").map(String));
      const chosen = prod.dances.filter((d) => picked.has(d.id));
      danceIds = chosen.length ? chosen.map((d) => d.id) : undefined;
      danceNames = chosen.map((d) => d.name);
    } else {
      productionName = str(fd, "production", 60) || undefined;
    }
  }
  const typedTitle = str(fd, "title", 60);
  const autoTitle =
    kind === "ensayo" && danceNames.length ? `Ensayo: ${danceNames.join(", ")}`.slice(0, 60) : KIND_INFO[kind].label;

  const template: Omit<Template, "id"> & { id?: string } = {
    id: str(fd, "id", 80) || undefined,
    kind,
    title: typedTitle || autoTitle,
    teacher: str(fd, "teacher", 60),
    room: str(fd, "room", 40),
    days,
    date,
    start,
    end,
    production: productionName,
    productionId,
    danceIds,
    note: str(fd, "note", 200) || undefined,
  };

  await saveTemplate(template);
  refresh();
  redirect("/profe/horario");
}

export async function deleteTemplateAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  if (id) await deleteTemplate(id);
  refresh();
}

export async function togglePauseAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  if (id) await setPaused(id, fd.get("paused") === "1");
  refresh();
}

export async function cancelDateAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  const date = str(fd, "date", 10);
  if (id && isValidISODate(date)) await setDateCancelled(id, date, fd.get("cancelled") === "1");
  refresh();
}


/* ---------- students ---------- */

function levelOf(fd: FormData) {
  const v = String(fd.get("level") ?? "");
  return isClassKind(v) && LEVEL_KINDS.includes(v) ? v : null;
}

export async function addStudentAction(fd: FormData) {
  await requireTeacher();
  const name = str(fd, "name", 80);
  const level = levelOf(fd);
  if (name && level) await addStudent(name, level);
  refresh();
}

export async function updateStudentAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  const name = str(fd, "name", 80);
  const level = levelOf(fd);
  if (id && name && level) await updateStudent(id, name, level);
  refresh();
}

export async function deleteStudentAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  if (id) await deleteStudent(id);
  refresh();
}

/* ---------- productions, dances and casting ---------- */

export async function addProductionAction(fd: FormData) {
  await requireTeacher();
  const name = str(fd, "name", 80);
  if (name) await addProduction(name);
  refresh();
}

export async function setActiveProductionAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  if (id) await setActiveProduction(id);
  refresh();
}

export async function deleteProductionAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  if (id) await deleteProduction(id);
  refresh();
  redirect("/profe/obras");
}

export async function addDanceAction(fd: FormData) {
  await requireTeacher();
  const name = str(fd, "name", 80);
  const productionId = str(fd, "productionId", 80);
  if (name && productionId) await addDance(productionId, name);
  refresh();
}

export async function renameDanceAction(fd: FormData) {
  await requireTeacher();
  const name = str(fd, "name", 80);
  const productionId = str(fd, "productionId", 80);
  const danceId = str(fd, "danceId", 80);
  if (name && productionId && danceId) await renameDance(productionId, danceId, name);
  refresh();
}

export async function deleteDanceAction(fd: FormData) {
  await requireTeacher();
  const productionId = str(fd, "productionId", 80);
  const danceId = str(fd, "danceId", 80);
  if (productionId && danceId) await deleteDance(productionId, danceId);
  refresh();
}

export async function saveCastAction(fd: FormData) {
  await requireTeacher();
  const productionId = str(fd, "productionId", 80);
  const danceId = str(fd, "danceId", 80);
  const ids = fd.getAll("studentIds").map(String);
  if (productionId && danceId) await saveCast(productionId, danceId, ids);
  refresh();
}

/* ---------- attendance (recorded by teachers only) ---------- */

export type SaveAttendanceResult =
  | { ok: true; takenBy: string; takenAt: string; updatedAt?: string }
  | { ok: false; error: string };

/**
 * Saves the roll call of one session. Only exceptions arrive; everyone else counts as present.
 * The server decides who was expected, so a forged id cannot add students.
 */
export async function saveAttendanceAction(input: {
  sessionId: string;
  records: { studentId: string; status: string; note?: string }[];
  editReason?: string;
}): Promise<SaveAttendanceResult> {
  const teacher = await requireTeacher();
  const sessionId = String(input.sessionId ?? "").slice(0, 120);
  const [templateId, date] = sessionId.split("@");
  if (!templateId || !isValidISODate(date)) return { ok: false, error: "Clase no válida." };

  const today = todayCaracas();
  if (date > today) return { ok: false, error: "No se puede tomar lista de un día que aún no llega." };

  const { templates, students, productions } = await loadAll();
  const session = sessionsForDate(templates, date, false, productions).find((x) => x.id === sessionId);
  if (!session) return { ok: false, error: "Esa clase ya no está en el horario de ese día." };

  const expected = studentsForSession(session, students, productions);
  const expectedIds = new Set(expected.map((e) => e.id));

  const seen = new Set<string>();
  const records: { studentId: string; status: "late" | "absent" | "excused"; note?: string }[] = [];
  for (const r of input.records ?? []) {
    const studentId = String(r.studentId ?? "");
    if (!expectedIds.has(studentId) || seen.has(studentId)) continue;
    seen.add(studentId);
    if (!isAttendanceStatus(r.status)) return { ok: false, error: "Estado de asistencia no válido." };
    if (r.status === "present") continue;
    const note = String(r.note ?? "").trim().slice(0, 200);
    if (r.status === "excused" && note.length < 2) {
      const who = expected.find((e) => e.id === studentId)?.name ?? "la alumna";
      return { ok: false, error: `Escribe el motivo de la ausencia justificada de ${who}.` };
    }
    records.push({ studentId, status: r.status, note: note || undefined });
  }

  const prior = (await loadAttendance()).taken.find((t) => t.sessionId === sessionId);
  const editReason = String(input.editReason ?? "").trim().slice(0, 200);
  if (prior && date < today && editReason.length < 3) {
    return { ok: false, error: "Esta lista es de un día anterior. Escribe el motivo del cambio." };
  }

  const saved = await saveAttendance({
    session: {
      sessionId,
      templateId,
      date,
      start: session.start,
      end: session.end,
      kind: session.kind,
      title: session.title,
      production: session.production,
      danceIds: session.danceIds,
      danceNames: session.danceNames,
      expected: expected.map((e) => ({ id: e.id, name: e.name })),
    },
    records,
    by: teacher.name,
    editReason: editReason || undefined,
  });
  refresh();
  return { ok: true, takenBy: saved.takenBy, takenAt: saved.takenAt, updatedAt: saved.updatedAt };
}

/* ---------- families (access by email) ---------- */

export async function addFamilyAction(fd: FormData) {
  await requireTeacher();
  const name = str(fd, "name", 80);
  if (name) await addFamily(name);
  refresh();
}

export async function deleteFamilyAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  if (id) await deleteFamily(id);
  refresh();
}

export async function setFamilyActiveAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  if (id) await setFamilyActive(id, fd.get("active") === "1");
  refresh();
}

export async function saveFamilyStudentsAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "familyId", 80);
  if (id) await saveFamilyStudents(id, fd.getAll("studentIds").map(String));
  refresh();
}

export type GuardianState = { error?: string; ok?: boolean } | null;

export async function addGuardianAction(_prev: GuardianState, fd: FormData): Promise<GuardianState> {
  await requireTeacher();
  const familyId = str(fd, "familyId", 80);
  const name = str(fd, "name", 80);
  const relation = str(fd, "relation", 40);
  const email = normalizeEmail(String(fd.get("email") ?? ""));
  if (!familyId || !name) return { error: "Escribe el nombre del adulto." };
  if (!isEmail(email)) return { error: "Escribe un correo válido." };
  const error = await addGuardian(familyId, name, relation, email);
  if (error) return { error };
  refresh();
  return { ok: true };
}

export async function setGuardianRevokedAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  if (id) await setGuardianRevoked(id, fd.get("revoked") === "1");
  refresh();
}

export async function deleteGuardianAction(fd: FormData) {
  await requireTeacher();
  const id = str(fd, "id", 80);
  if (id) await deleteGuardian(id);
  refresh();
}

/* ---------- choreography ---------- */

export type SaveChoreoResult = { ok: true; version: number; updatedAt: string } | { ok: false; error: string };

export async function saveChoreographyAction(
  danceId: string,
  expectedVersion: number,
  payload: unknown,
): Promise<SaveChoreoResult> {
  const teacher = await requireTeacher();
  const dance = (await loadProductions()).flatMap((p) => p.dances).find((d) => d.id === String(danceId));
  if (!dance) return { ok: false, error: "Ese baile ya no existe." };

  // Only the current cast keeps a position; everything else is clamped or dropped.
  const clean = sanitizeChoreography(payload, dance.studentIds);
  if (!clean) return { ok: false, error: "Los datos del coreograma no son válidos." };

  const saved = await saveChoreography(
    { danceId: dance.id, ...clean, updatedBy: teacher.name },
    Number.isInteger(expectedVersion) ? expectedVersion : 0,
  );
  if (saved === "conflict") {
    return { ok: false, error: "Otra persona guardó cambios mientras editabas. Recarga la página para ver la versión nueva." };
  }
  refresh();
  revalidatePath("/familia/baile/[danceId]", "page");
  return { ok: true, version: saved.version, updatedAt: saved.updatedAt };
}
