import type { Metadata } from "next";
import { InstagramLogo, MapPin, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Inscripciones y ubicación",
  description: "Inscripciones abiertas en la Academia de Ballet Clásico Devant, Chacao, Caracas.",
};

export default function InscripcionesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <header className="mb-10 space-y-3">
        <h1 className="text-4xl sm:text-5xl">Inscripciones abiertas</h1>
        <p className="max-w-[56ch] text-muted">
          Escríbenos y te contamos sobre niveles, horarios y cómo agendar una clase de prueba.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-4 p-6" aria-labelledby="contacto">
          <h2 id="contacto" className="text-2xl">Contacto</h2>
          <p className="text-muted">
            El canal más rápido es Instagram. Escríbenos por mensaje directo.
          </p>
          <a
            href="https://www.instagram.com/aballetdevant"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-gold"
          >
            <InstagramLogo size={20} aria-hidden="true" /> @aballetdevant
          </a>
          {/* TODO: add WhatsApp number once the academy confirms it */}
          <p className="flex items-center gap-2 text-sm text-muted">
            <WhatsappLogo size={18} aria-hidden="true" /> Número de WhatsApp pendiente de confirmar.
          </p>
        </section>

        <section className="card space-y-4 p-6" aria-labelledby="ubicacion">
          <h2 id="ubicacion" className="text-2xl">Ubicación</h2>
          <p className="flex items-start gap-2 text-muted">
            <MapPin size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            Chacao, Caracas. Dirección exacta pendiente de confirmar.
          </p>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Chacao+Caracas"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            Ver en Google Maps
          </a>
        </section>
      </div>

      <section className="mt-10 space-y-3" aria-labelledby="requisitos">
        <h2 id="requisitos" className="text-2xl">Qué necesita tu hija</h2>
        <p className="max-w-[60ch] text-muted">
          Mallas y zapatillas de media punta para empezar. Las zapatillas de punta se compran solo cuando la profesora lo apruebe. Lista exacta de uniforme pendiente de confirmar con la academia.
        </p>
      </section>
    </div>
  );
}
