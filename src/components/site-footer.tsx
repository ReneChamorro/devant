import Link from "next/link";
import { InstagramLogo, MapPin } from "@phosphor-icons/react/dist/ssr";
import { Brand } from "./brand";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Brand />
          <p className="max-w-sm text-sm text-muted">
            Academia de Ballet Clásico Devant. Elegancia en movimiento, desde los 3 años.
          </p>
        </div>
        <nav aria-label="Pie de página" className="flex flex-col gap-2 text-sm">
          <Link href="/clases" className="text-muted hover:text-ink">Clases y niveles</Link>
          <Link href="/calendario" className="text-muted hover:text-ink">Calendario</Link>
          <Link href="/inscripciones" className="text-muted hover:text-ink">Inscripciones</Link>
          <a href="https://www.aballetdevant.com" className="text-muted hover:text-ink">Boletería</a>
        </nav>
        <div className="flex flex-col gap-3 text-sm text-muted">
          <p className="flex items-center gap-2">
            <MapPin size={18} aria-hidden="true" /> Chacao, Caracas
          </p>
          <a
            href="https://www.instagram.com/aballetdevant"
            className="flex items-center gap-2 hover:text-ink"
            rel="noopener noreferrer"
            target="_blank"
          >
            <InstagramLogo size={18} aria-hidden="true" /> @aballetdevant
          </a>
        </div>
      </div>
    </footer>
  );
}
