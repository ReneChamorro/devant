/**
 * Reserved slot for a real academy photo.
 * TODO: replace with <Image src="/fotos/..." /> once photos are supplied.
 */
export function PhotoSlot({
  label,
  ratio = "4 / 5",
  className = "",
}: {
  label: string;
  ratio?: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{ aspectRatio: ratio }}
      className={`relative grid place-items-center overflow-hidden rounded-2xl border border-line bg-[linear-gradient(160deg,var(--brand),var(--bg)_70%)] ${className}`}
    >
      <span className="px-6 text-center text-sm text-gold-soft/80">Foto pendiente: {label}</span>
    </div>
  );
}
