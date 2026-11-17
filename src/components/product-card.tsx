import Image from "next/image";
import { ImageSquare } from "@phosphor-icons/react/dist/ssr";
import { formatPrice, imageUrl, type Product } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  return (
    <li className="card overflow-hidden">
      <div className="relative aspect-[4/5] bg-[linear-gradient(160deg,var(--brand),var(--bg-2)_70%)]">
        {product.image ? (
          <Image
            src={imageUrl(product.image)}
            alt={product.name}
            fill
            unoptimized
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-gold-text/60" aria-hidden="true">
            <ImageSquare size={40} weight="light" />
          </div>
        )}
      </div>
      <div className="space-y-1 p-4">
        <h3 className="!font-sans text-base font-semibold !text-ink">{product.name}</h3>
        <p className="tabular text-gold-text">{formatPrice(product.price)}</p>
      </div>
    </li>
  );
}
