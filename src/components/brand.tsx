import Link from "next/link";

/** Wordmark placeholder. Swap for the real logo file once the academy provides it. */
export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  const ring = size === "lg" ? "h-14 w-14 text-2xl" : "h-10 w-10 text-lg";
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Devant, inicio">
      <span
        className={`${ring} grid place-items-center rounded-full border border-gold bg-brand font-display text-gold-soft`}
        aria-hidden="true"
      >
        D
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-lg text-gold-text">Devant</span>
        <span className="text-[0.7rem] tracking-[0.12em] text-muted uppercase">Ballet clásico</span>
      </span>
    </Link>
  );
}
