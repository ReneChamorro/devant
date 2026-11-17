import { IMAGE_FILE } from "@/lib/catalog";
import { readProductImage } from "@/lib/store";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Serves catalog photos from .data/catalog. Names are uuids, so a replaced photo gets a new URL and can be cached for good. */
export async function GET(_req: Request, { params }: RouteContext<"/catalogo/imagen/[file]">) {
  const { file } = await params;
  if (!IMAGE_FILE.test(file)) return new Response("Not found", { status: 404 });
  const bytes = await readProductImage(file);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": TYPES[file.split(".").pop() ?? ""] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
