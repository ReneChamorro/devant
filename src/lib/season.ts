export type Season = "default" | "cascanueces" | "corsario";

/** Production currently on stage. Changes ornament and tint only, never the brand. */
export const ACTIVE_SEASON: Season = "cascanueces";

export const SEASONS: Record<Season, { production: string; slug: string }> = {
  default: { production: "Temporada regular", slug: "" },
  cascanueces: { production: "El Cascanueces", slug: "cascanueces" },
  corsario: { production: "El Corsario", slug: "corsario" },
};
