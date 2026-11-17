import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { loadProducts } from "@/lib/store";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Implementos de ballet disponibles a través de la Academia Devant.",
};

export default function CatalogoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <header className="mb-10 max-w-2xl space-y-3">
        <h1 className="text-4xl sm:text-5xl">Catálogo</h1>
        <p className="text-muted">
          Implementos de ballet para las clases y los ensayos. Para comprar o consultar tallas y disponibilidad, escríbenos por Instagram{" "}
          <a
            href="https://www.instagram.com/aballetdevant"
            className="font-semibold text-gold-text hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            @aballetdevant
          </a>
          .
        </p>
      </header>

      <Suspense fallback={<GridSkeleton />}>
        <Products />
      </Suspense>
    </div>
  );
}

async function Products() {
  await connection();
  const products = await loadProducts();
  if (products.length === 0) {
    return <p className="card px-5 py-8 text-center text-muted">Pronto habrá productos disponibles.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ul>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" role="status" aria-label="Cargando">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="card aspect-[4/5] animate-pulse bg-surface-2/60" />
      ))}
    </div>
  );
}
