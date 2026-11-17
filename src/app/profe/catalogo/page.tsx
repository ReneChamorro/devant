import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { DeleteButton } from "@/components/delete-button";
import { ListSkeleton } from "@/components/list-skeleton";
import { ProductForm } from "@/components/product-form";
import { TeacherNav } from "@/components/teacher-nav";
import { requireTeacher } from "@/lib/auth";
import { formatPrice } from "@/lib/catalog";
import { loadProducts } from "@/lib/store";
import { deleteProductAction } from "../actions";

export const metadata = { title: "Catálogo" };

export default function CatalogoProfePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl">Catálogo</h1>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <CatalogoBody />
      </Suspense>
    </div>
  );
}

async function CatalogoBody() {
  await connection();
  const teacher = await requireTeacher();
  const products = await loadProducts();

  return (
    <>
      <TeacherNav current="catalogo" name={teacher.name} />
      <p className="mb-8 max-w-[62ch] text-muted">
        Los productos que ves por defecto son de ejemplo; elimínalos y agrega los reales. Lo que guardes aquí se ve al instante en{" "}
        <Link href="/catalogo" className="font-semibold text-gold-text hover:underline">la página pública del catálogo</Link>. Las fotos se reducen solas antes de subirse.
      </p>

      <section aria-labelledby="nuevo" className="card mb-10 p-5">
        <h2 id="nuevo" className="mb-4 text-xl">Agregar producto</h2>
        <ProductForm />
      </section>

      <ul className="space-y-4">
        {products.map((p) => (
          <li key={p.id} className="card space-y-4 p-5">
            <p className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{p.name}</span>
              <span className="tabular text-gold-text">{formatPrice(p.price)}</span>
            </p>
            <ProductForm product={p} />
            <form action={deleteProductAction} className="border-t border-line pt-3">
              <input type="hidden" name="id" value={p.id} />
              <DeleteButton label={`Eliminar ${p.name}`} />
            </form>
          </li>
        ))}
        {products.length === 0 && (
          <li className="card px-5 py-8 text-center text-muted">Aún no hay productos. Agrega el primero arriba.</li>
        )}
      </ul>
    </>
  );
}
