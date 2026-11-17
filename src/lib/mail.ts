/*
  Sends the login code by email.
  - With RESEND_API_KEY and MAIL_FROM set, it uses the Resend HTTP API (no extra dependency).
  - Without them, in development, nothing is sent: the code is returned so the screen can show it.
  - Without them, in production, sending fails on purpose instead of pretending.
  Supabase Auth (email OTP) replaces this when the database is migrated.
*/

export type MailResult = { sent: true } | { sent: false; devCode?: string };

export async function sendLoginCode(to: string, name: string, code: string): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!key || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev] Código de acceso para ${to}: ${code}`);
      return { sent: false, devCode: code };
    }
    console.error("RESEND_API_KEY y MAIL_FROM no están configurados: no se pudo enviar el código.");
    return { sent: false };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: `Tu código de acceso a Ballet Devant: ${code}`,
        text:
          `Hola ${name},\n\n` +
          `Tu código para entrar a la web de la Academia de Ballet Clásico Devant es: ${code}\n\n` +
          `Vence en 10 minutos. Si no lo pediste tú, ignora este mensaje.\n`,
      }),
    });
    if (!res.ok) {
      console.error("No se pudo enviar el correo", res.status);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error("Error enviando el correo", err);
    return { sent: false };
  }
}
