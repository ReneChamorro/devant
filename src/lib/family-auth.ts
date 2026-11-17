/*
  Family access by email code, no passwords.
  A registered adult asks for a 6-digit code, types it, and gets a long cookie session on that device.
  The cookie only carries a session id; whether it is still valid is looked up in the store,
  so revoking an adult or a family cuts access immediately.
*/
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  consumeLoginCode,
  createFamilySession,
  createLoginCode,
  findGuardianByEmail,
  resolveFamilySession,
  revokeFamilySession,
} from "./store";
import { isEmail, normalizeEmail } from "./schedule";
import { sendLoginCode } from "./mail";

const COOKIE = "devant_family";
const MAX_AGE_S = 60 * 60 * 24 * 180;

function secret() {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production");
  }
  return process.env.SESSION_SECRET ?? "devant-dev-only-secret";
}

const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");
const hashCode = (guardianId: string, code: string) => sign(`code:${guardianId}:${code}`);

function sameSig(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Always answers the same way, whether the email is registered or not, so nobody can probe who is a family.
 * `devCode` is only present in development without a mail provider.
 */
export async function requestLoginCode(emailRaw: string): Promise<{ ok: true; devCode?: string } | { ok: false; error: string }> {
  const email = normalizeEmail(emailRaw);
  if (!isEmail(email)) return { ok: false, error: "Escribe un correo válido." };

  const guardian = await findGuardianByEmail(email);
  if (guardian && !guardian.revokedAt) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    if (await createLoginCode(guardian.id, hashCode(guardian.id, code))) {
      const sent = await sendLoginCode(email, guardian.name, code);
      if (!sent.sent && sent.devCode) return { ok: true, devCode: sent.devCode };
    }
  }
  return { ok: true };
}

export async function verifyLoginCode(
  emailRaw: string,
  codeRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = normalizeEmail(emailRaw);
  const code = codeRaw.replace(/\D/g, "").slice(0, 6);
  const generic = { ok: false as const, error: "El código no es correcto o ya venció. Pide uno nuevo." };
  if (code.length !== 6) return generic;

  const guardian = await findGuardianByEmail(email);
  if (!guardian || guardian.revokedAt) return generic;

  const result = await consumeLoginCode(guardian.id, hashCode(guardian.id, code));
  if (result !== "ok") return generic;

  const session = await createFamilySession(guardian.id);
  const jar = await cookies();
  jar.set(COOKIE, `${session.id}.${sign(`session:${session.id}`)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
  return { ok: true };
}

/** The signed-in adult, their family, or null. */
export async function getFamilyViewer() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, sig] = raw.split(".");
  if (!id || !sig || !sameSig(sig, sign(`session:${id}`))) return null;
  const resolved = await resolveFamilySession(id);
  return resolved ? { guardian: resolved.guardian, family: resolved.family, sessionId: id } : null;
}

export async function requireFamilyViewer() {
  const v = await getFamilyViewer();
  if (!v) redirect("/entrar");
  return v;
}

export async function endFamilySession() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  const id = raw?.split(".")[0];
  if (id) await revokeFamilySession(id);
  jar.delete(COOKIE);
}
