/*
  Test teacher login, no database. A signed cookie proves the session.
  Replace with Supabase Auth later; callers only use getTeacher() / requireTeacher().
  Credentials can be overridden with TEACHER_EMAIL / TEACHER_PASSWORD / SESSION_SECRET.
*/
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const TEST_TEACHER = {
  email: process.env.TEACHER_EMAIL ?? "profe@devant.test",
  password: process.env.TEACHER_PASSWORD ?? "ballet2026",
  name: "Profesor de prueba",
};

const COOKIE = "devant_teacher";
const MAX_AGE_S = 60 * 60 * 8;
const SECRET = process.env.SESSION_SECRET ?? "devant-dev-only-secret";

function sign(payload: string) {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production");
  }
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/* Basic brute-force guard: 5 misses per email, then a 60 s pause (in memory). */
const misses = new Map<string, { n: number; until: number }>();

export function checkCredentials(email: string, password: string): "ok" | "bad" | "locked" {
  const key = email.trim().toLowerCase();
  const m = misses.get(key);
  if (m && m.until > Date.now()) return "locked";
  const ok = safeEqual(key, TEST_TEACHER.email.toLowerCase()) && safeEqual(password, TEST_TEACHER.password);
  if (ok) {
    misses.delete(key);
    return "ok";
  }
  const n = (m && m.until === 0 ? m.n : 0) + 1;
  misses.set(key, n >= 5 ? { n: 0, until: Date.now() + 60_000 } : { n, until: 0 });
  return "bad";
}

export async function startTeacherSession() {
  const exp = Date.now() + MAX_AGE_S * 1000;
  const payload = `${TEST_TEACHER.email}|${exp}`;
  const jar = await cookies();
  jar.set(COOKIE, `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function endTeacherSession() {
  (await cookies()).delete(COOKIE);
}

export async function getTeacher(): Promise<{ email: string; name: string } | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [b64, sig] = raw.split(".");
  if (!b64 || !sig) return null;
  const payload = Buffer.from(b64, "base64url").toString("utf8");
  if (!safeEqual(sig, sign(payload))) return null;
  const [email, exp] = payload.split("|");
  if (!email || Number(exp) < Date.now()) return null;
  return { email, name: TEST_TEACHER.name };
}

export async function requireTeacher() {
  const t = await getTeacher();
  if (!t) redirect("/profe");
  return t;
}
