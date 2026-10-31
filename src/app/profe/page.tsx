import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { LoginForm } from "@/components/login-form";
import { getTeacher, TEST_TEACHER } from "@/lib/auth";

export default function ProfePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="mb-6 text-4xl">Profesores</h1>
      <Suspense fallback={<div className="card h-64 animate-pulse bg-surface-2/60" role="status" aria-label="Cargando" />}>
        <LoginBody />
      </Suspense>
    </div>
  );
}

async function LoginBody() {
  await connection();
  if (await getTeacher()) redirect("/profe/dia");

  return (
    <>
      {process.env.NODE_ENV !== "production" && (
        <DemoBanner>
          Usuario de prueba, sin base de datos todavía. Correo: <strong>{TEST_TEACHER.email}</strong>. Contraseña: <strong>{TEST_TEACHER.password}</strong>.
        </DemoBanner>
      )}
      <LoginForm />
    </>
  );
}
