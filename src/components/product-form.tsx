"use client";

import { useActionState, useRef, useState } from "react";
import { saveProductAction, type ProductState } from "@/app/profe/actions";
import { imageUrl, type Product } from "@/lib/catalog";

const input = "min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-ink";
const MAX_SIDE = 1200;

/** Shrinks a photo in the browser (phone photos are several MB). Returns the original if anything fails. */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], "foto.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Add (no `product`) or edit a catalog product: name, price and photo. */
export function ProductForm({ product }: { product?: Product }) {
  const [state, action, pending] = useActionState<ProductState, FormData>(saveProductAction, null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const key = product?.id ?? "nuevo";
  const shown = preview ?? (product?.image ? imageUrl(product.image) : null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return setPreview(null);
    const small = await shrink(file);
    if (small !== file && fileRef.current) {
      const dt = new DataTransfer();
      dt.items.add(small);
      fileRef.current.files = dt.files;
    }
    setPreview(URL.createObjectURL(small));
  }

  return (
    <form action={action} onReset={() => setPreview(null)} className="space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-28 shrink-0 space-y-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-line bg-bg-2">
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a static asset
              <img src={shown} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-0 grid place-items-center px-2 text-center text-xs text-muted">Sin foto</span>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <div className="space-y-2">
              <label htmlFor={`n-${key}`} className="block text-sm font-medium">Nombre</label>
              <input id={`n-${key}`} name="name" required maxLength={80} autoComplete="off" defaultValue={product?.name} className={input} />
            </div>
            <div className="space-y-2">
              <label htmlFor={`p-${key}`} className="block text-sm font-medium">Precio (USD)</label>
              <input
                id={`p-${key}`}
                name="price"
                required
                inputMode="decimal"
                autoComplete="off"
                defaultValue={product ? String(product.price).replace(".", ",") : ""}
                placeholder="12,50"
                className={`${input} tabular`}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor={`i-${key}`} className="block text-sm font-medium">
              {product ? "Cambiar foto (opcional)" : "Foto (opcional)"}
            </label>
            <input
              ref={fileRef}
              id={`i-${key}`}
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPick}
              className="block w-full text-sm text-muted file:mr-3 file:min-h-10 file:rounded-xl file:border file:border-line file:bg-surface file:px-4 file:text-ink"
            />
          </div>
          {product?.image && (
            <label className="flex min-h-10 items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="removeImage" className="size-4" /> Quitar la foto actual
            </label>
          )}
        </div>
      </div>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-ok">Guardado.</p>}
      <button type="submit" disabled={pending} className={`btn disabled:opacity-60 ${product ? "btn-ghost !min-h-10 !px-4 text-sm" : "btn-gold"}`}>
        {pending ? "Guardando..." : product ? "Guardar cambios" : "Agregar producto"}
      </button>
    </form>
  );
}
