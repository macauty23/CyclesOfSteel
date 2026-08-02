import type Phaser from "phaser";
import type { RegionId } from "../core/types";

export const BIOME_BACKGROUND_KEYS = {
  plains: "biome-background-plains",
  frostlands: "biome-background-frostlands",
  volcano: "biome-background-volcano",
  forest: "biome-background-forest",
  ocean: "biome-background-ocean"
} as const;

const BIOME_BACKGROUND_URLS: Record<(typeof BIOME_BACKGROUND_KEYS)[keyof typeof BIOME_BACKGROUND_KEYS], string> = {
  [BIOME_BACKGROUND_KEYS.plains]: new URL("../../../assets/plains.png", import.meta.url).href,
  [BIOME_BACKGROUND_KEYS.frostlands]: new URL("../../../assets/frostlands.png", import.meta.url).href,
  [BIOME_BACKGROUND_KEYS.volcano]: new URL("../../../assets/volcano.png", import.meta.url).href,
  [BIOME_BACKGROUND_KEYS.forest]: new URL("../../../assets/forest.png", import.meta.url).href,
  [BIOME_BACKGROUND_KEYS.ocean]: new URL("../../../assets/ocean.png", import.meta.url).href
};

const FROSTLAND_REGIONS = new Set<RegionId>([
  "mountain",
  "highlands",
  "tundra",
  "frostlands",
  "frozenPeaks",
  "glacier",
  "iceCaves",
  "snowyForest",
  "cliffs",
  "caverns",
  "crystalCaverns",
  "crystalValley",
  "skyIslands"
]);

const VOLCANO_REGIONS = new Set<RegionId>([
  "volcano",
  "volcanicLand",
  "ashlands",
  "lavaFields",
  "obsidianWastes",
  "sulfurSprings",
  "scorchedPlateau",
  "badlands",
  "canyon"
]);

const FOREST_REGIONS = new Set<RegionId>([
  "forest",
  "woods",
  "grove",
  "jungle",
  "redwoodForest",
  "bambooForest",
  "cherryGrove",
  "rainforest",
  "pineForest",
  "sacredGrove",
  "spiritMarsh"
]);

const OCEAN_REGIONS = new Set<RegionId>([
  "sea",
  "ocean",
  "shore",
  "river",
  "marsh",
  "swamp",
  "wetlands",
  "archipelago",
  "coralCoast",
  "coralReef",
  "grandReef",
  "mangrove",
  "sunkenRuins"
]);

export function preloadBiomeBackgrounds(scene: Phaser.Scene): void {
  for (const [key, url] of Object.entries(BIOME_BACKGROUND_URLS)) {
    if (!scene.textures.exists(key)) {
      scene.load.image(key, url);
    }
  }
}

export function getBiomeBackgroundKey(regionId: RegionId): (typeof BIOME_BACKGROUND_KEYS)[keyof typeof BIOME_BACKGROUND_KEYS] {
  if (FROSTLAND_REGIONS.has(regionId)) {
    return BIOME_BACKGROUND_KEYS.frostlands;
  }

  if (VOLCANO_REGIONS.has(regionId)) {
    return BIOME_BACKGROUND_KEYS.volcano;
  }

  if (FOREST_REGIONS.has(regionId)) {
    return BIOME_BACKGROUND_KEYS.forest;
  }

  if (OCEAN_REGIONS.has(regionId)) {
    return BIOME_BACKGROUND_KEYS.ocean;
  }

  return BIOME_BACKGROUND_KEYS.plains;
}
