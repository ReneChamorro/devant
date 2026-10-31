/** Shape-matched loading state for session lists. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card h-24 animate-pulse border-l-4 border-l-line bg-surface-2/60" />
      ))}
    </div>
  );
}
