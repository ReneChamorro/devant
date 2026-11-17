import type { MetadataRoute } from "next";
import { SITE_INDEXABLE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: SITE_INDEXABLE
      ? { userAgent: "*", allow: "/", disallow: ["/familia", "/profe", "/entrar"] }
      : { userAgent: "*", disallow: "/" },
  };
}
