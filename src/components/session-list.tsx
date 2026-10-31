import { Clock, MapPin, Sparkle, User } from "@phosphor-icons/react/dist/ssr";
import { KIND_INFO, type Session } from "@/lib/schedule";

export function SessionList({
  sessions,
  emptyText = "No hay clases ni ensayos este día.",
}: {
  sessions: Session[];
  emptyText?: string;
}) {
  if (sessions.length === 0) {
    return (
      <div className="card px-6 py-10 text-center text-muted">
        <p>{emptyText}</p>
        <p className="mt-1 text-sm">Revisa otro día de la semana en el selector de arriba.</p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {sessions.map((s) => {
        const isRehearsal = s.kind === "ensayo";
        return (
          <li
            key={s.id}
            className={`card relative grid gap-3 border-l-4 p-4 sm:grid-cols-[10.5rem_1fr] sm:items-center ${
              isRehearsal ? "border-l-gold" : "border-l-brand-soft"
            }`}
          >
            <p className="tabular flex items-center gap-2 whitespace-nowrap font-semibold text-ink">
              <Clock size={18} className="text-muted" aria-hidden="true" />
              {s.start} a {s.end}
            </p>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="!font-sans text-lg font-semibold !text-ink">{s.title}</h3>
                <span className="chip">
                  {isRehearsal && <Sparkle size={14} weight="fill" className="text-gold-text" aria-hidden="true" />}
                  {isRehearsal ? `Ensayo${s.production ? `: ${s.production}` : ""}` : KIND_INFO[s.kind].label}
                </span>
              </div>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                <span className="flex items-center gap-1.5"><User size={16} aria-hidden="true" />{s.teacher}</span>
                <span className="flex items-center gap-1.5"><MapPin size={16} aria-hidden="true" />{s.room}</span>
              </p>
              {s.note && <p className="text-sm text-gold-text">{s.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
