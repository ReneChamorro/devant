export function DemoBanner({ children }: { children: React.ReactNode }) {
  return (
    <p role="note" className="mb-8 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-text">
      <strong className="font-semibold">Modo demostración.</strong> {children}
    </p>
  );
}
