import type Phaser from "phaser";
import type { RegionId } from "../core/types";

export const BIOME_BACKGROUND_KEYS = {
  plains: "biome-background-plains",
  frostlands: "biome-background-frostlands",
  volcano: "biome-background-volcano",
  forest: "biome-background-forest",
  ocean: "biome-background-ocean"
} as const;

export type BiomeBackgroundKey = (typeof BIOME_BACKGROUND_KEYS)[keyof typeof BIOME_BACKGROUND_KEYS];

export interface BiomeBackgroundConfig {
  textureKey: BiomeBackgroundKey;
  focalX: number;
  focalY: number;
  imageAlpha: number;
  washCenterX: number;
  washCenterY: number;
  washRadiusX: number;
  washRadiusY: number;
  washCenterAlpha: number;
  washEdgeAlpha: number;
  horizonY?: number;
  horizonHazeHeight?: number;
  horizonHazeAlpha?: number;
  horizonHazeColor?: number;
}

/**
 * Per-biome framing and readability values for the one continuous World Map
 * illustration. All coordinates and radii are normalized to the map artwork.
 */
export const BIOME_BACKGROUND_CONFIGS: Record<BiomeBackgroundKey, BiomeBackgroundConfig> = {
  [BIOME_BACKGROUND_KEYS.plains]: {
    textureKey: BIOME_BACKGROUND_KEYS.plains,
    focalX: 0.5,
    focalY: 0.5,
    imageAlpha: 0.9,
    washCenterX: 0.55,
    washCenterY: 0.52,
    washRadiusX: 0.62,
    washRadiusY: 0.66,
    washCenterAlpha: 0.36,
    washEdgeAlpha: 0.08,
    horizonY: 0.35,
    horizonHazeHeight: 0.2,
    horizonHazeAlpha: 0.065,
    horizonHazeColor: 0xc7ddea
  },
  [BIOME_BACKGROUND_KEYS.frostlands]: {
    textureKey: BIOME_BACKGROUND_KEYS.frostlands,
    focalX: 0.52,
    focalY: 0.5,
    imageAlpha: 0.88,
    washCenterX: 0.55,
    washCenterY: 0.53,
    washRadiusX: 0.62,
    washRadiusY: 0.66,
    washCenterAlpha: 0.36,
    washEdgeAlpha: 0.1,
    horizonY: 0.38,
    horizonHazeHeight: 0.19,
    horizonHazeAlpha: 0.075,
    horizonHazeColor: 0xd1e3ef
  },
  [BIOME_BACKGROUND_KEYS.volcano]: {
    textureKey: BIOME_BACKGROUND_KEYS.volcano,
    focalX: 0.58,
    focalY: 0.5,
    imageAlpha: 0.86,
    washCenterX: 0.55,
    washCenterY: 0.54,
    washRadiusX: 0.6,
    washRadiusY: 0.64,
    washCenterAlpha: 0.38,
    washEdgeAlpha: 0.1,
    horizonY: 0.34,
    horizonHazeHeight: 0.18,
    horizonHazeAlpha: 0.055,
    horizonHazeColor: 0xc8d5df
  },
  [BIOME_BACKGROUND_KEYS.forest]: {
    textureKey: BIOME_BACKGROUND_KEYS.forest,
    focalX: 0.5,
    focalY: 0.5,
    imageAlpha: 0.88,
    washCenterX: 0.54,
    washCenterY: 0.53,
    washRadiusX: 0.6,
    washRadiusY: 0.65,
    washCenterAlpha: 0.4,
    washEdgeAlpha: 0.1,
    horizonY: 0.39,
    horizonHazeHeight: 0.17,
    horizonHazeAlpha: 0.05,
    horizonHazeColor: 0xc7d8c4
  },
  [BIOME_BACKGROUND_KEYS.ocean]: {
    textureKey: BIOME_BACKGROUND_KEYS.ocean,
    focalX: 0.56,
    focalY: 0.5,
    imageAlpha: 0.9,
    washCenterX: 0.55,
    washCenterY: 0.5,
    washRadiusX: 0.64,
    washRadiusY: 0.65,
    washCenterAlpha: 0.35,
    washEdgeAlpha: 0.07,
    horizonY: 0.36,
    horizonHazeHeight: 0.2,
    horizonHazeAlpha: 0.07,
    horizonHazeColor: 0xc7e0ea
  }
};

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

export function getBiomeBackgroundKey(regionId: RegionId): BiomeBackgroundKey {
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

export function getBiomeBackgroundConfig(regionId: RegionId): BiomeBackgroundConfig {
  return BIOME_BACKGROUND_CONFIGS[getBiomeBackgroundKey(regionId)];
}
