import type {
  EncounterConfig,
  EnemyId,
  MaterialCost,
  MaterialId,
  RegionDefinition,
  RegionId,
  RelicId,
  WorldNodeDefinition,
  WorldNodeType
} from "../core/types";
import { BIOME_ENEMY_POOLS, ENEMY_DEFINITIONS, getEnemyDefinition } from "./enemies";

const LANE_COUNT = 7;
const MAX_DEPTH = 11;
const SETTLEMENT_REGIONS = new Set<RegionId>(["village", "town", "kingdom"]);
const ALPINE_REGIONS = new Set<RegionId>([
  "highlands",
  "mountain",
  "cliffs",
  "caverns",
  "crystalCaverns",
  "crystalValley",
  "tundra",
  "frostlands",
  "glacier",
  "iceCaves",
  "frozenPeaks",
  "snowyForest",
  "pineForest"
]);
const TEMPERATE_REGIONS = new Set<RegionId>([
  "plains",
  "grasslands",
  "woods",
  "forest",
  "grove",
  "river",
  "village",
  "town",
  "kingdom",
  "redwoodForest",
  "cherryGrove",
  "sacredGrove"
]);
const ARID_REGIONS = new Set<RegionId>([
  "savannah",
  "desert",
  "oasis",
  "badlands",
  "canyon",
  "scorchedPlateau",
  "volcanicLand",
  "ashlands",
  "lavaFields",
  "obsidianWastes",
  "sulfurSprings",
  "volcano"
]);
const COASTAL_REGIONS = new Set<RegionId>([
  "shore",
  "sea",
  "ocean",
  "archipelago",
  "coralCoast",
  "coralReef",
  "grandReef",
  "sunkenRuins",
  "mangrove"
]);
const WETLAND_REGIONS = new Set<RegionId>(["river", "marsh", "swamp", "wetlands", "mangrove", "spiritMarsh"]);
const CANOPY_REGIONS = new Set<RegionId>([
  "forest",
  "woods",
  "grove",
  "jungle",
  "rainforest",
  "bambooForest",
  "redwoodForest",
  "pineForest",
  "sacredGrove",
  "cherryGrove"
]);
const BIOME_FAMILIES = [ALPINE_REGIONS, TEMPERATE_REGIONS, ARID_REGIONS, COASTAL_REGIONS, WETLAND_REGIONS, CANOPY_REGIONS] as const;
const BRIDGE_REGIONS = new Set<RegionId>([
  "plains",
  "grasslands",
  "savannah",
  "river",
  "shore",
  "wetlands",
  "highlands",
  "volcanicLand",
  "scorchedPlateau",
  "coralCoast",
  "archipelago",
  "snowyForest",
  "tundra",
  "oasis",
  "mangrove",
  "grove",
  "sea"
]);
const CORE_MATERIALS = new Set<MaterialId>(["steel", "wood", "leather", "gemstone", "essence"]);
const EASIER_ADVANCED_MATERIALS = new Set<MaterialId>(["amber", "bamboo", "coral"]);
const HAZARDOUS_REGIONS = new Set<RegionId>([
  "ocean",
  "volcano",
  "frozenPeaks",
  "mountain",
  "jungle",
  "canyon",
  "badlands",
  "swamp",
  "cliffs",
  "caverns",
  "crystalCaverns",
  "rainforest",
  "glacier",
  "iceCaves",
  "ashlands",
  "lavaFields",
  "obsidianWastes",
  "sulfurSprings",
  "grandReef",
  "sunkenRuins",
  "skyIslands"
]);
const GENTLE_REGIONS = new Set<RegionId>([
  "plains",
  "grasslands",
  "woods",
  "village",
  "river",
  "shore",
  "tundra",
  "oasis",
  "wetlands",
  "redwoodForest",
  "pineForest",
  "snowyForest",
  "coralCoast",
  "sacredGrove",
  "cherryGrove"
]);
const SPECIAL_REGIONS = new Set<RegionId>([
  "frostlands",
  "frozenPeaks",
  "volcanicLand",
  "volcano",
  "crystalCaverns",
  "glacier",
  "iceCaves",
  "lavaFields",
  "obsidianWastes",
  "grandReef",
  "sunkenRuins",
  "crystalValley",
  "skyIslands"
]);
type TransitionRuleState = "strict" | "soft" | "blocked";

export interface GeneratedWorldChapter {
  nodeIds: string[];
  nodes: Record<string, WorldNodeDefinition>;
  startNodeIds: string[];
  nextNodeOrdinal: number;
  nextWorldDepth: number;
}

const RELIC_REGION_PAIRS: Array<{ relicId: RelicId; regionId: RegionId }> = [
  { relicId: "greenwayCompass", regionId: "forest" },
  { relicId: "foundrySeal", regionId: "volcano" },
  { relicId: "sanctumLens", regionId: "kingdom" },
  { relicId: "coastlineCharm", regionId: "shore" },
  { relicId: "starfallDiadem", regionId: "frozenPeaks" }
];

function summarizeEnemyRoster(regionId: RegionId): string[] {
  return BIOME_ENEMY_POOLS[regionId]
    .slice(0, 3)
    .map((enemyId) => ENEMY_DEFINITIONS[enemyId]?.name ?? enemyId);
}

export const EXPEDITION_REGIONS = {
  forest: {
    id: "forest",
    name: "Forest",
    theme: "Tall trunks, dark roots, and damp leaf-fall.",
    summary: "Dense woodland routes rich in wood and leather.",
    primaryMaterials: ["wood", "leather", "steel"],
    enemyRoster: summarizeEnemyRoster("forest"),
    merchantTheme: "Hunter's layover",
    hiddenEvent: "An overgrown shrine lies just off the path.",
    uniqueRelicId: "greenwayCompass",
    accent: 0x6d9e69,
    fill: 0x132318,
    edge: 0x44704b
  },
  woods: {
    id: "woods",
    name: "Woods",
    theme: "Open timber lines, cut paths, and watchfires.",
    summary: "Safer timber country with steady wood and light steel.",
    primaryMaterials: ["wood", "steel", "leather"],
    enemyRoster: summarizeEnemyRoster("woods"),
    merchantTheme: "Roadside timber factor",
    hiddenEvent: "Fresh tracks split from the main trail.",
    accent: 0x7ea16f,
    fill: 0x17261c,
    edge: 0x4d7854
  },
  sea: {
    id: "sea",
    name: "Sea",
    theme: "Blue-grey water, drifting wreckage, and wind-cut decks.",
    summary: "Open-water routes that trade wood and gemstones for risk.",
    primaryMaterials: ["wood", "gemstone", "leather"],
    enemyRoster: summarizeEnemyRoster("sea"),
    merchantTheme: "Deck market",
    hiddenEvent: "Something valuable glitters in the swell.",
    accent: 0x6ea9c8,
    fill: 0x13222d,
    edge: 0x4a7994
  },
  ocean: {
    id: "ocean",
    name: "Ocean",
    theme: "Deep swells, storm bands, and cold spray.",
    summary: "Long, dangerous water with rare essence and gemstones.",
    primaryMaterials: ["gemstone", "essence", "wood"],
    enemyRoster: summarizeEnemyRoster("ocean"),
    merchantTheme: "Storm-chaser broker",
    hiddenEvent: "A broken mast marks a hidden cache.",
    accent: 0x6794bc,
    fill: 0x10202b,
    edge: 0x3f6484
  },
  mountain: {
    id: "mountain",
    name: "Mountain",
    theme: "Stone ridges, exposed passes, and cold iron paths.",
    summary: "Hard climbs that specialize in steel and gemstones.",
    primaryMaterials: ["steel", "gemstone", "leather"],
    enemyRoster: summarizeEnemyRoster("mountain"),
    merchantTheme: "Pass quartermaster",
    hiddenEvent: "A collapsed ledge hides a side path.",
    accent: 0x8aa0b3,
    fill: 0x1a232b,
    edge: 0x5b7284
  },
  volcano: {
    id: "volcano",
    name: "Volcano",
    theme: "Black stone, molten seams, and heat haze.",
    summary: "The hottest routes in the expedition, thick with steel and essence.",
    primaryMaterials: ["steel", "essence", "gemstone"],
    enemyRoster: summarizeEnemyRoster("volcano"),
    merchantTheme: "Smelter outpost",
    hiddenEvent: "A cracked vent reveals a furnace pocket.",
    uniqueRelicId: "foundrySeal",
    accent: 0xd18463,
    fill: 0x291814,
    edge: 0x8a533e
  },
  grasslands: {
    id: "grasslands",
    name: "Grasslands",
    theme: "Rolling grasses, wagon tracks, and broad sky.",
    summary: "Open country that feeds balanced steel, wood, and leather gains.",
    primaryMaterials: ["wood", "leather", "steel"],
    enemyRoster: summarizeEnemyRoster("grasslands"),
    merchantTheme: "Caravan halt",
    hiddenEvent: "Wind bends around a forgotten cairn.",
    accent: 0x98aa66,
    fill: 0x1d2615,
    edge: 0x677445
  },
  savannah: {
    id: "savannah",
    name: "Savannah",
    theme: "Dry gold grass, thorn trees, and long heat shimmer.",
    summary: "Transition country that leans into leather and wood with harsher hunts.",
    primaryMaterials: ["leather", "wood", "steel"],
    enemyRoster: summarizeEnemyRoster("savannah"),
    merchantTheme: "Dust trader",
    hiddenEvent: "Scorched brush hides a predator trail.",
    accent: 0xb9995d,
    fill: 0x2b2214,
    edge: 0x84643a
  },
  plains: {
    id: "plains",
    name: "Plains",
    theme: "Wide fields, old roads, and easy horizons.",
    summary: "A calm opener with balanced steel, wood, and leather income.",
    primaryMaterials: ["steel", "wood", "leather"],
    enemyRoster: summarizeEnemyRoster("plains"),
    merchantTheme: "Road warden's stand",
    hiddenEvent: "A low stone marker points toward a cache.",
    accent: 0x9db27a,
    fill: 0x1c2616,
    edge: 0x67734e
  },
  tundra: {
    id: "tundra",
    name: "Tundra",
    theme: "Cold scrub, pale ground, and dry frozen wind.",
    summary: "Chill transition routes with steady leather and steel.",
    primaryMaterials: ["leather", "steel", "wood"],
    enemyRoster: summarizeEnemyRoster("tundra"),
    merchantTheme: "Cold camp",
    hiddenEvent: "Wind-scoured bones ring a hidden stop.",
    accent: 0x9caec0,
    fill: 0x1a2027,
    edge: 0x667888
  },
  frostlands: {
    id: "frostlands",
    name: "Frostlands",
    theme: "Snow crust, blue ice, and silent flats.",
    summary: "Frozen routes that pay more steel and gemstones than the tundra.",
    primaryMaterials: ["steel", "gemstone", "leather"],
    enemyRoster: summarizeEnemyRoster("frostlands"),
    merchantTheme: "Ice broker",
    hiddenEvent: "A cracked sheet of ice reveals old supplies.",
    accent: 0xa9c4da,
    fill: 0x192530,
    edge: 0x62859b
  },
  volcanicLand: {
    id: "volcanicLand",
    name: "Volcanic Land",
    theme: "Red soil, ash drift, and scorched brush.",
    summary: "A hot transition zone before the caldera, rich in steel and essence.",
    primaryMaterials: ["steel", "essence", "leather"],
    enemyRoster: summarizeEnemyRoster("volcanicLand"),
    merchantTheme: "Ash caravan",
    hiddenEvent: "A glassed-over trail cracks underfoot.",
    accent: 0xbf7f5b,
    fill: 0x241717,
    edge: 0x754636
  },
  shore: {
    id: "shore",
    name: "Shore",
    theme: "Pebble beaches, tide pools, and salt-silver wind.",
    summary: "Safer coast routes with wood, leather, and bright stones.",
    primaryMaterials: ["wood", "leather", "gemstone"],
    enemyRoster: summarizeEnemyRoster("shore"),
    merchantTheme: "Tide market",
    hiddenEvent: "A sealed chest sits above the tide line.",
    uniqueRelicId: "coastlineCharm",
    accent: 0x85b6cb,
    fill: 0x152530,
    edge: 0x4d7f95
  },
  village: {
    id: "village",
    name: "Village",
    theme: "Timber homes, fenced plots, and smoke from low hearths.",
    summary: "Friendly settlements where you can trade and restock steady basics.",
    primaryMaterials: ["wood", "leather", "steel"],
    enemyRoster: summarizeEnemyRoster("village"),
    merchantTheme: "Village trader",
    hiddenEvent: "A closed smithy hides a small reserve.",
    accent: 0xc0a67a,
    fill: 0x261d17,
    edge: 0x7b5d43
  },
  town: {
    id: "town",
    name: "Town",
    theme: "Stone streets, workshops, and guarded storehouses.",
    summary: "Reliable trade hubs with better exchange rates and mixed stock.",
    primaryMaterials: ["steel", "wood", "leather"],
    enemyRoster: summarizeEnemyRoster("town"),
    merchantTheme: "Town exchange",
    hiddenEvent: "A shuttered alley leads to old contraband.",
    accent: 0xc2b1a0,
    fill: 0x242128,
    edge: 0x786e79
  },
  kingdom: {
    id: "kingdom",
    name: "Kingdom",
    theme: "High walls, banners, and polished guard roads.",
    summary: "Late-run civilized power with strong trade and rarer refinement.",
    primaryMaterials: ["steel", "gemstone", "essence"],
    enemyRoster: summarizeEnemyRoster("kingdom"),
    merchantTheme: "Royal factor",
    hiddenEvent: "A sealed gallery opens onto hidden stores.",
    uniqueRelicId: "sanctumLens",
    accent: 0xa89ccc,
    fill: 0x1d1b2a,
    edge: 0x655b86
  },
  frozenPeaks: {
    id: "frozenPeaks",
    name: "Frozen Peaks",
    theme: "Knife ridges, white glare, and brittle air.",
    summary: "An extreme cold route with gemstones, steel, and rare essence.",
    primaryMaterials: ["gemstone", "steel", "essence"],
    enemyRoster: summarizeEnemyRoster("frozenPeaks"),
    merchantTheme: "Peak relay",
    hiddenEvent: "A cornice break reveals a glittering chamber.",
    uniqueRelicId: "starfallDiadem",
    accent: 0xc0d4ea,
    fill: 0x16212b,
    edge: 0x6d8ba6
  },
  grove: {
    id: "grove",
    name: "Grove",
    theme: "Sheltered green, old stone, and filtered light.",
    summary: "Quiet nature pockets with wood, essence, and leather.",
    primaryMaterials: ["wood", "essence", "leather"],
    enemyRoster: summarizeEnemyRoster("grove"),
    merchantTheme: "Hermit exchange",
    hiddenEvent: "Roots cover a hidden cache by an old spring.",
    accent: 0x74a97d,
    fill: 0x15231b,
    edge: 0x4b7a56
  },
  jungle: {
    id: "jungle",
    name: "Jungle",
    theme: "Wet heat, tangled growth, and bright poisonous color.",
    summary: "High-pressure routes with leather, wood, and scattered essence.",
    primaryMaterials: ["leather", "wood", "essence"],
    enemyRoster: summarizeEnemyRoster("jungle"),
    merchantTheme: "Canopy broker",
    hiddenEvent: "A vine-choked ruin hides fresh salvage.",
    accent: 0x4a9969,
    fill: 0x11251c,
    edge: 0x2f6b48
  },
  river: {
    id: "river",
    name: "River",
    theme: "Current-cut banks, reeds, and crossing stones.",
    summary: "Fluid transition routes that carry wood, leather, and a little essence.",
    primaryMaterials: ["wood", "leather", "essence"],
    enemyRoster: summarizeEnemyRoster("river"),
    merchantTheme: "Ferry trader",
    hiddenEvent: "A washed-out crossing leaves goods in the reeds.",
    accent: 0x6ba8be,
    fill: 0x11232c,
    edge: 0x3b7185
  }
} as Record<RegionId, RegionDefinition>;

Object.assign(EXPEDITION_REGIONS, {
  desert: {
    id: "desert",
    name: "Desert",
    theme: "Open sand, heat shimmer, and sun-bleached trails.",
    summary: "Dry routes mixing amber salvage with leather and steel.",
    primaryMaterials: ["amber", "leather", "steel"],
    enemyRoster: summarizeEnemyRoster("desert"),
    merchantTheme: "Dune barter",
    hiddenEvent: "A half-buried marker points toward a shaded cache.",
    accent: 0xd2aa68,
    fill: 0x2d2114,
    edge: 0x8c6332
  },
  oasis: {
    id: "oasis",
    name: "Oasis",
    theme: "Palm shade, bright water, and sudden green in the heat.",
    summary: "Safer desert pockets rich in amber, wood, and leather.",
    primaryMaterials: ["amber", "wood", "leather"],
    enemyRoster: summarizeEnemyRoster("oasis"),
    merchantTheme: "Spring trader",
    hiddenEvent: "A cool basin conceals a traveler cache.",
    accent: 0x72b792,
    fill: 0x173028,
    edge: 0x468265
  },
  canyon: {
    id: "canyon",
    name: "Canyon",
    theme: "Red stone cuts, ledges, and echoing heat.",
    summary: "Narrow badland routes paying steel, gemstone, and obsidian.",
    primaryMaterials: ["steel", "obsidian", "gemstone"],
    enemyRoster: summarizeEnemyRoster("canyon"),
    merchantTheme: "Ridge broker",
    hiddenEvent: "A rope path drops toward a hidden shelf.",
    accent: 0xc07b5e,
    fill: 0x2d1814,
    edge: 0x8a4b37
  },
  badlands: {
    id: "badlands",
    name: "Badlands",
    theme: "Broken clay, thorn scrub, and harsh wind.",
    summary: "Cruel open country where obsidian and steel come with blood.",
    primaryMaterials: ["obsidian", "leather", "steel"],
    enemyRoster: summarizeEnemyRoster("badlands"),
    merchantTheme: "Dust camp",
    hiddenEvent: "A weathered gulch hides old contraband.",
    accent: 0xb16d56,
    fill: 0x291714,
    edge: 0x7c4031
  },
  marsh: {
    id: "marsh",
    name: "Marsh",
    theme: "Slow water, leaning reeds, and soft ground.",
    summary: "Wet, open marshland where amber and essence surface in the mud.",
    primaryMaterials: ["amber", "leather", "essence"],
    enemyRoster: summarizeEnemyRoster("marsh"),
    merchantTheme: "Reed market",
    hiddenEvent: "An old skiff lists beside a hidden stash.",
    accent: 0x7ea37f,
    fill: 0x16251d,
    edge: 0x4b7556
  },
  swamp: {
    id: "swamp",
    name: "Swamp",
    theme: "Black water, roots, insects, and stale fog.",
    summary: "Heavier wetland routes with amber, essence, and tougher fights.",
    primaryMaterials: ["amber", "essence", "leather"],
    enemyRoster: summarizeEnemyRoster("swamp"),
    merchantTheme: "Bog trader",
    hiddenEvent: "A lantern glow marks a plank path through the mire.",
    accent: 0x6d845f,
    fill: 0x14211a,
    edge: 0x42523b
  },
  wetlands: {
    id: "wetlands",
    name: "Wetlands",
    theme: "Wide shallows, cattails, and bright birdsong.",
    summary: "Softer marsh routes supplying amber, wood, and leather.",
    primaryMaterials: ["amber", "wood", "leather"],
    enemyRoster: summarizeEnemyRoster("wetlands"),
    merchantTheme: "Fen trader",
    hiddenEvent: "Fresh footprints vanish into waist-high reeds.",
    accent: 0x8eb28a,
    fill: 0x19281f,
    edge: 0x587c5f
  },
  highlands: {
    id: "highlands",
    name: "Highlands",
    theme: "Windy grass, hard stone, and high sight-lines.",
    summary: "Upland routes mixing steel, crystal, and timber.",
    primaryMaterials: ["steel", "crystal", "wood"],
    enemyRoster: summarizeEnemyRoster("highlands"),
    merchantTheme: "Hill factor",
    hiddenEvent: "A cairn marks the edge of a hidden store.",
    accent: 0xa0ab8b,
    fill: 0x23251a,
    edge: 0x6d7350
  },
  cliffs: {
    id: "cliffs",
    name: "Cliffs",
    theme: "Sharp drops, pale birds, and knife-edge paths.",
    summary: "Risky ridge travel rewarding steel, gemstone, and stormglass.",
    primaryMaterials: ["stormglass", "steel", "gemstone"],
    enemyRoster: summarizeEnemyRoster("cliffs"),
    merchantTheme: "Cliff relay",
    hiddenEvent: "A chalk mark points toward a ledge cache.",
    accent: 0x95aec2,
    fill: 0x1b232a,
    edge: 0x5e7689
  },
  caverns: {
    id: "caverns",
    name: "Caverns",
    theme: "Low stone, dripping dark, and echoing chambers.",
    summary: "Underground routes paying obsidian, crystal, and steel.",
    primaryMaterials: ["obsidian", "crystal", "steel"],
    enemyRoster: summarizeEnemyRoster("caverns"),
    merchantTheme: "Tunnel broker",
    hiddenEvent: "A side tunnel glitters with old supply hooks.",
    accent: 0x857d95,
    fill: 0x19151f,
    edge: 0x554d61
  },
  crystalCaverns: {
    id: "crystalCaverns",
    name: "Crystal Caverns",
    theme: "Faceted walls, cold light, and ringing stone.",
    summary: "Rare underground routes heavy with crystal, gemstone, and essence.",
    primaryMaterials: ["crystal", "gemstone", "essence"],
    enemyRoster: summarizeEnemyRoster("crystalCaverns"),
    merchantTheme: "Facet relay",
    hiddenEvent: "A resonant chamber hides a brilliant cache.",
    accent: 0x89d1e3,
    fill: 0x14212b,
    edge: 0x4e8aa1
  },
  redwoodForest: {
    id: "redwoodForest",
    name: "Redwood Forest",
    theme: "Giant trunks, rust bark, and dim green canopy.",
    summary: "Old-growth forest routes full of wood, amber, and leather.",
    primaryMaterials: ["wood", "amber", "leather"],
    enemyRoster: summarizeEnemyRoster("redwoodForest"),
    merchantTheme: "Grove factor",
    hiddenEvent: "A hollow trunk conceals a stash of old supplies.",
    accent: 0xa16b56,
    fill: 0x1f1b16,
    edge: 0x6f4335
  },
  bambooForest: {
    id: "bambooForest",
    name: "Bamboo Forest",
    theme: "Tall green cane, soft wind, and narrow sight-lines.",
    summary: "Fast, brushy routes rewarding bamboo, wood, and leather.",
    primaryMaterials: ["bamboo", "wood", "leather"],
    enemyRoster: summarizeEnemyRoster("bambooForest"),
    merchantTheme: "Cane market",
    hiddenEvent: "A split grove opens around a hidden stockpile.",
    accent: 0x88b26b,
    fill: 0x182417,
    edge: 0x537346
  },
  cherryGrove: {
    id: "cherryGrove",
    name: "Cherry Grove",
    theme: "Soft petals, old stones, and bright spring air.",
    summary: "Gentle sacred routes where blossom, wood, and essence gather.",
    primaryMaterials: ["blossom", "wood", "essence"],
    enemyRoster: summarizeEnemyRoster("cherryGrove"),
    merchantTheme: "Petal exchange",
    hiddenEvent: "A blossom drift marks a hidden offering cache.",
    accent: 0xe09dbf,
    fill: 0x241922,
    edge: 0x9a5f7e
  },
  rainforest: {
    id: "rainforest",
    name: "Rainforest",
    theme: "Heavy rain, thick leaves, and bright wet bark.",
    summary: "Dense tropical pressure with bamboo, wood, and leather.",
    primaryMaterials: ["bamboo", "wood", "leather"],
    enemyRoster: summarizeEnemyRoster("rainforest"),
    merchantTheme: "Canopy exchange",
    hiddenEvent: "A raised root bed hides an old supply wrap.",
    accent: 0x4a9a68,
    fill: 0x12261a,
    edge: 0x2f7048
  },
  pineForest: {
    id: "pineForest",
    name: "Pine Forest",
    theme: "Needle beds, resin scent, and cold trunks.",
    summary: "Cool forest routes where amber, wood, and steel come steadily.",
    primaryMaterials: ["wood", "amber", "steel"],
    enemyRoster: summarizeEnemyRoster("pineForest"),
    merchantTheme: "Needle camp",
    hiddenEvent: "A logging sled marks a hidden reserve.",
    accent: 0x72956f,
    fill: 0x18211c,
    edge: 0x46614a
  },
  glacier: {
    id: "glacier",
    name: "Glacier",
    theme: "Blue walls, hard wind, and endless white glare.",
    summary: "Extreme cold routes rich in crystal, steel, and essence.",
    primaryMaterials: ["crystal", "steel", "essence"],
    enemyRoster: summarizeEnemyRoster("glacier"),
    merchantTheme: "Ice relay",
    hiddenEvent: "A split shelf reveals a frozen equipment cache.",
    accent: 0xc7e5f1,
    fill: 0x16242d,
    edge: 0x7094a6
  },
  iceCaves: {
    id: "iceCaves",
    name: "Ice Caves",
    theme: "Blue tunnels, hanging frost, and brittle silence.",
    summary: "Frozen caverns that pay crystal, gemstone, and essence.",
    primaryMaterials: ["crystal", "gemstone", "essence"],
    enemyRoster: summarizeEnemyRoster("iceCaves"),
    merchantTheme: "Rime broker",
    hiddenEvent: "A frozen niche preserves an untouched bundle.",
    accent: 0xbce4f2,
    fill: 0x15222c,
    edge: 0x6b8fa3
  },
  snowyForest: {
    id: "snowyForest",
    name: "Snowy Forest",
    theme: "Pale branches, muffled steps, and deep cold shade.",
    summary: "Cold timberland yielding wood, crystal, and leather.",
    primaryMaterials: ["wood", "crystal", "leather"],
    enemyRoster: summarizeEnemyRoster("snowyForest"),
    merchantTheme: "Winter camp",
    hiddenEvent: "Tracks circle a hidden woodpile stash.",
    accent: 0xb7cad4,
    fill: 0x19232b,
    edge: 0x6c7f8f
  },
  ashlands: {
    id: "ashlands",
    name: "Ashlands",
    theme: "Grey drift, cracked earth, and dead heat.",
    summary: "Burnt routes yielding brimstone, steel, and leather.",
    primaryMaterials: ["brimstone", "steel", "leather"],
    enemyRoster: summarizeEnemyRoster("ashlands"),
    merchantTheme: "Ash camp",
    hiddenEvent: "A collapsed kiln still hides usable salvage.",
    accent: 0xb77a67,
    fill: 0x231615,
    edge: 0x754439
  },
  lavaFields: {
    id: "lavaFields",
    name: "Lava Fields",
    theme: "Molten seams, black crust, and violent heat.",
    summary: "Furnace routes rich in brimstone, obsidian, and steel.",
    primaryMaterials: ["brimstone", "obsidian", "steel"],
    enemyRoster: summarizeEnemyRoster("lavaFields"),
    merchantTheme: "Forge relay",
    hiddenEvent: "A cooling shelf traps a bright cache in glass.",
    accent: 0xd4764e,
    fill: 0x2a1613,
    edge: 0x8f442f
  },
  obsidianWastes: {
    id: "obsidianWastes",
    name: "Obsidian Wastes",
    theme: "Glass plains, jagged black, and reflected firelight.",
    summary: "Cruel heat routes paying obsidian, brimstone, and steel.",
    primaryMaterials: ["obsidian", "brimstone", "steel"],
    enemyRoster: summarizeEnemyRoster("obsidianWastes"),
    merchantTheme: "Glass dealer",
    hiddenEvent: "A cracked mirror-field hides a trapped supply bag.",
    accent: 0x6b597e,
    fill: 0x18131d,
    edge: 0x43334f
  },
  sulfurSprings: {
    id: "sulfurSprings",
    name: "Sulfur Springs",
    theme: "Yellow steam, hot pools, and choking vapor.",
    summary: "Volcanic routes with brimstone, essence, and volatile gemstone.",
    primaryMaterials: ["brimstone", "essence", "gemstone"],
    enemyRoster: summarizeEnemyRoster("sulfurSprings"),
    merchantTheme: "Steam broker",
    hiddenEvent: "A mineral vent cracks open a hidden pocket.",
    accent: 0xc5b762,
    fill: 0x262118,
    edge: 0x746438
  },
  scorchedPlateau: {
    id: "scorchedPlateau",
    name: "Scorched Plateau",
    theme: "Sunburnt stone, red dust, and blistered wind.",
    summary: "Harsh open land rewarding brimstone, obsidian, and leather.",
    primaryMaterials: ["brimstone", "obsidian", "leather"],
    enemyRoster: summarizeEnemyRoster("scorchedPlateau"),
    merchantTheme: "Plateau trader",
    hiddenEvent: "A broken survey post marks a hidden cache.",
    accent: 0xc3865b,
    fill: 0x2b1b14,
    edge: 0x80503a
  },
  archipelago: {
    id: "archipelago",
    name: "Archipelago",
    theme: "Small islands, rope docks, and bright salt wind.",
    summary: "Broken coastal routes rewarding coral, wood, and gemstone.",
    primaryMaterials: ["coral", "wood", "gemstone"],
    enemyRoster: summarizeEnemyRoster("archipelago"),
    merchantTheme: "Island exchange",
    hiddenEvent: "A hidden cove shelters a weather-sealed cache.",
    accent: 0x76b4c6,
    fill: 0x152633,
    edge: 0x4a8597
  },
  coralCoast: {
    id: "coralCoast",
    name: "Coral Coast",
    theme: "Pink stone, warm tide, and bright reef shallows.",
    summary: "Gentler shorelines where coral, wood, and leather gather.",
    primaryMaterials: ["coral", "wood", "leather"],
    enemyRoster: summarizeEnemyRoster("coralCoast"),
    merchantTheme: "Reef market",
    hiddenEvent: "A tidepool crack hides sealed salvage.",
    accent: 0xe49c93,
    fill: 0x252029,
    edge: 0x9b655f
  },
  coralReef: {
    id: "coralReef",
    name: "Coral Reef",
    theme: "Bright water, living stone, and hard currents.",
    summary: "Richer sea routes rewarding coral, gemstone, and essence.",
    primaryMaterials: ["coral", "gemstone", "essence"],
    enemyRoster: summarizeEnemyRoster("coralReef"),
    merchantTheme: "Reef broker",
    hiddenEvent: "A snapped mast points toward hidden reef salvage.",
    accent: 0xef9e97,
    fill: 0x202230,
    edge: 0x9d6965
  },
  grandReef: {
    id: "grandReef",
    name: "Grand Reef",
    theme: "Towering coral, deep channels, and bright danger.",
    summary: "Hazardous reef routes paying coral, essence, and gemstone.",
    primaryMaterials: ["coral", "essence", "gemstone"],
    enemyRoster: summarizeEnemyRoster("grandReef"),
    merchantTheme: "Deepwater relay",
    hiddenEvent: "A reef arch shelters a hard-to-reach stockpile.",
    accent: 0xf0a18f,
    fill: 0x1d1f2f,
    edge: 0xa56a58
  },
  mangrove: {
    id: "mangrove",
    name: "Mangrove",
    theme: "Root tangles, brackish water, and half-flooded paths.",
    summary: "Wet coast routes yielding coral, wood, and leather.",
    primaryMaterials: ["coral", "wood", "leather"],
    enemyRoster: summarizeEnemyRoster("mangrove"),
    merchantTheme: "Root trader",
    hiddenEvent: "A boat snagged in roots still holds supplies.",
    accent: 0x6f9b7d,
    fill: 0x15261d,
    edge: 0x476a53
  },
  ancientRuins: {
    id: "ancientRuins",
    name: "Ancient Ruins",
    theme: "Broken arches, dust, and old carved stone.",
    summary: "Relic-heavy ruins paying stormglass, gemstone, and essence.",
    primaryMaterials: ["stormglass", "gemstone", "essence"],
    enemyRoster: summarizeEnemyRoster("ancientRuins"),
    merchantTheme: "Archive broker",
    hiddenEvent: "A cracked plinth conceals a hidden recess.",
    accent: 0xb8aa92,
    fill: 0x25201d,
    edge: 0x766557
  },
  forgottenTemple: {
    id: "forgottenTemple",
    name: "Forgotten Temple",
    theme: "Silent halls, incense dust, and faded gold.",
    summary: "Sacred ruins where essence, stormglass, and gemstone collect.",
    primaryMaterials: ["essence", "stormglass", "gemstone"],
    enemyRoster: summarizeEnemyRoster("forgottenTemple"),
    merchantTheme: "Temple factor",
    hiddenEvent: "A prayer wall slides aside to reveal supplies.",
    accent: 0xd0bc86,
    fill: 0x26211b,
    edge: 0x7d6d46
  },
  sacredGrove: {
    id: "sacredGrove",
    name: "Sacred Grove",
    theme: "Quiet altars, roots, and bright filtered light.",
    summary: "Blessed woodland routes with blossom, essence, and wood.",
    primaryMaterials: ["blossom", "essence", "wood"],
    enemyRoster: summarizeEnemyRoster("sacredGrove"),
    merchantTheme: "Sanctified exchange",
    hiddenEvent: "An offering circle covers a hidden reserve.",
    accent: 0xb2c985,
    fill: 0x19251b,
    edge: 0x5b7b4e
  },
  spiritMarsh: {
    id: "spiritMarsh",
    name: "Spirit Marsh",
    theme: "Ghost lights, deep water, and quiet reeds.",
    summary: "Eerie marshland yielding essence, blossom, and amber.",
    primaryMaterials: ["essence", "blossom", "amber"],
    enemyRoster: summarizeEnemyRoster("spiritMarsh"),
    merchantTheme: "Lantern market",
    hiddenEvent: "A pale glow marks a hidden stockpile in the mud.",
    accent: 0xa18fd2,
    fill: 0x1a1d29,
    edge: 0x635784
  },
  sunkenRuins: {
    id: "sunkenRuins",
    name: "Sunken Ruins",
    theme: "Drowned stone, broken columns, and black water.",
    summary: "Rare coastal ruins paying coral, stormglass, and essence.",
    primaryMaterials: ["coral", "stormglass", "essence"],
    enemyRoster: summarizeEnemyRoster("sunkenRuins"),
    merchantTheme: "Drowned exchange",
    hiddenEvent: "A flood-cut chamber still hides sealed relic stock.",
    accent: 0x7aa0b7,
    fill: 0x14222d,
    edge: 0x45687d
  },
  crystalValley: {
    id: "crystalValley",
    name: "Crystal Valley",
    theme: "Bright stone, ringing wind, and luminous veins.",
    summary: "Rare highland routes yielding crystal, stormglass, and gemstone.",
    primaryMaterials: ["crystal", "stormglass", "gemstone"],
    enemyRoster: summarizeEnemyRoster("crystalValley"),
    merchantTheme: "Valley relay",
    hiddenEvent: "A faceted seam breaks toward a hidden stash.",
    accent: 0x9ee0f0,
    fill: 0x13242e,
    edge: 0x5b91a4
  },
  skyIslands: {
    id: "skyIslands",
    name: "Sky Islands",
    theme: "Thin air, broken bridges, and impossible open sky.",
    summary: "Late-run floating routes rich in stormglass, crystal, and essence.",
    primaryMaterials: ["stormglass", "crystal", "essence"],
    enemyRoster: summarizeEnemyRoster("skyIslands"),
    merchantTheme: "Cloud relay",
    hiddenEvent: "A hanging path leads to a sky-hidden cache.",
    accent: 0xbadbf0,
    fill: 0x14202b,
    edge: 0x6f90a6
  }
} satisfies Partial<Record<RegionId, RegionDefinition>>);

export const REGION_TRANSITIONS = {
  forest: ["woods", "grove", "river", "grasslands", "village"],
  woods: ["forest", "grove", "plains", "village", "river"],
  sea: ["shore", "ocean", "river"],
  ocean: ["sea", "shore"],
  mountain: ["plains", "tundra", "frostlands", "kingdom"],
  volcano: ["volcanicLand"],
  grasslands: ["plains", "savannah", "forest", "village", "river"],
  savannah: ["grasslands", "jungle", "volcanicLand", "plains", "shore"],
  plains: ["grasslands", "woods", "village", "river", "tundra", "town"],
  tundra: ["plains", "frostlands", "mountain", "river"],
  frostlands: ["tundra", "frozenPeaks", "mountain"],
  volcanicLand: ["savannah", "plains", "volcano", "grasslands"],
  shore: ["sea", "ocean", "river", "town", "village", "grasslands", "plains"],
  village: ["plains", "woods", "forest", "shore", "town", "river"],
  town: ["village", "plains", "shore", "kingdom", "river", "grasslands"],
  kingdom: ["town", "plains", "mountain"],
  frozenPeaks: ["frostlands"],
  grove: ["forest", "woods", "river", "jungle"],
  jungle: ["savannah", "grove", "river", "shore"],
  river: ["plains", "forest", "woods", "shore", "village", "town", "jungle", "tundra"]
} as Record<RegionId, RegionId[]>;

REGION_TRANSITIONS.forest.push("redwoodForest", "pineForest");
REGION_TRANSITIONS.woods.push("redwoodForest", "pineForest", "wetlands");
REGION_TRANSITIONS.sea.push("archipelago", "coralCoast", "coralReef");
REGION_TRANSITIONS.ocean.push("coralReef", "grandReef", "sunkenRuins");
REGION_TRANSITIONS.mountain.push("highlands", "cliffs", "caverns", "crystalValley");
REGION_TRANSITIONS.volcano.push("lavaFields", "obsidianWastes", "sulfurSprings");
REGION_TRANSITIONS.grasslands.push("desert", "badlands", "highlands");
REGION_TRANSITIONS.savannah.push("desert", "scorchedPlateau");
REGION_TRANSITIONS.plains.push("desert", "oasis", "badlands", "highlands", "cherryGrove");
REGION_TRANSITIONS.tundra.push("snowyForest", "glacier", "highlands");
REGION_TRANSITIONS.frostlands.push("glacier", "iceCaves", "snowyForest");
REGION_TRANSITIONS.volcanicLand.push("ashlands", "lavaFields", "sulfurSprings");
REGION_TRANSITIONS.shore.push("archipelago", "coralCoast");
REGION_TRANSITIONS.kingdom.push("ancientRuins", "forgottenTemple");
REGION_TRANSITIONS.frozenPeaks.push("glacier", "iceCaves", "skyIslands");
REGION_TRANSITIONS.grove.push("cherryGrove", "sacredGrove", "redwoodForest");
REGION_TRANSITIONS.jungle.push("rainforest", "bambooForest", "mangrove");
REGION_TRANSITIONS.river.push("wetlands", "marsh", "spiritMarsh", "oasis", "mangrove");

Object.assign(REGION_TRANSITIONS, {
  desert: ["oasis", "badlands", "canyon", "plains", "savannah", "scorchedPlateau"],
  oasis: ["desert", "wetlands", "river", "plains"],
  canyon: ["desert", "badlands", "highlands", "cliffs", "mountain"],
  badlands: ["desert", "canyon", "highlands", "scorchedPlateau", "plains"],
  marsh: ["wetlands", "swamp", "river", "spiritMarsh", "mangrove"],
  swamp: ["marsh", "wetlands", "mangrove", "spiritMarsh", "jungle"],
  wetlands: ["marsh", "swamp", "river", "oasis", "woods", "plains"],
  highlands: ["plains", "badlands", "canyon", "cliffs", "mountain", "pineForest", "tundra"],
  cliffs: ["highlands", "canyon", "mountain", "skyIslands", "shore"],
  caverns: ["mountain", "cliffs", "crystalCaverns", "iceCaves", "ancientRuins"],
  crystalCaverns: ["caverns", "crystalValley", "iceCaves"],
  redwoodForest: ["forest", "woods", "pineForest", "sacredGrove", "rainforest"],
  bambooForest: ["rainforest", "cherryGrove", "sacredGrove", "jungle"],
  cherryGrove: ["grove", "bambooForest", "sacredGrove", "redwoodForest", "plains"],
  rainforest: ["jungle", "bambooForest", "mangrove", "redwoodForest", "sacredGrove"],
  pineForest: ["woods", "forest", "highlands", "snowyForest", "redwoodForest", "tundra", "mountain"],
  glacier: ["frostlands", "frozenPeaks", "iceCaves", "snowyForest", "skyIslands"],
  iceCaves: ["glacier", "crystalCaverns", "caverns", "frozenPeaks"],
  snowyForest: ["tundra", "pineForest", "glacier", "frostlands"],
  ashlands: ["volcanicLand", "lavaFields", "sulfurSprings", "scorchedPlateau", "obsidianWastes"],
  lavaFields: ["ashlands", "volcano", "obsidianWastes", "sulfurSprings", "scorchedPlateau"],
  obsidianWastes: ["lavaFields", "ashlands", "volcano", "sulfurSprings"],
  sulfurSprings: ["ashlands", "lavaFields", "obsidianWastes", "volcanicLand"],
  scorchedPlateau: ["badlands", "ashlands", "lavaFields", "desert", "savannah"],
  archipelago: ["shore", "sea", "coralCoast", "coralReef", "sunkenRuins"],
  coralCoast: ["shore", "archipelago", "coralReef", "mangrove", "sea"],
  coralReef: ["coralCoast", "archipelago", "grandReef", "ocean", "sunkenRuins"],
  grandReef: ["coralReef", "ocean", "sunkenRuins", "archipelago"],
  mangrove: ["jungle", "swamp", "marsh", "coralCoast", "river", "wetlands"],
  ancientRuins: ["town", "kingdom", "caverns", "forgottenTemple", "crystalValley"],
  forgottenTemple: ["ancientRuins", "sacredGrove", "jungle", "kingdom", "skyIslands"],
  sacredGrove: ["grove", "cherryGrove", "redwoodForest", "forgottenTemple", "spiritMarsh", "bambooForest"],
  spiritMarsh: ["marsh", "swamp", "sacredGrove", "sunkenRuins", "river"],
  sunkenRuins: ["archipelago", "coralReef", "grandReef", "spiritMarsh", "ocean"],
  crystalValley: ["mountain", "crystalCaverns", "ancientRuins", "glacier", "skyIslands"],
  skyIslands: ["cliffs", "frozenPeaks", "crystalValley", "forgottenTemple", "glacier"]
} satisfies Partial<Record<RegionId, RegionId[]>>);

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function clampLane(value: number): number {
  return Math.max(0, Math.min(LANE_COUNT - 1, value));
}

function addMaterial(cost: MaterialCost, materialId: MaterialId, amount = 1): void {
  cost[materialId] = (cost[materialId] ?? 0) + amount;
}

function getRelicForRegion(regionId: RegionId): RelicId | undefined {
  return RELIC_REGION_PAIRS.find((entry) => entry.regionId === regionId)?.relicId;
}

function pickEnemyForNode(regionId: RegionId, recentEnemyIds: EnemyId[] = []): EnemyId {
  const pool = BIOME_ENEMY_POOLS[regionId];
  const filteredPool = pool.filter((enemyId) => !recentEnemyIds.includes(enemyId));
  return pickOne(filteredPool.length > 0 ? filteredPool : pool);
}

function createRewardMaterials(regionId: RegionId, nodeType: WorldNodeType, depth: number, chapterIndex: number): MaterialCost {
  const region = EXPEDITION_REGIONS[regionId];
  const reward: MaterialCost = {};
  const primary = region.primaryMaterials;
  const advancedPrimary = primary.filter((materialId) => !CORE_MATERIALS.has(materialId));
  const totalDrops =
    nodeType === "miniboss"
      ? 3 + (chapterIndex > 1 ? 1 : 0)
      : nodeType === "relic"
        ? 3
        : nodeType === "merchant"
          ? 2
          : nodeType === "event"
            ? 2 + (Math.random() < 0.35 ? 1 : 0)
            : 2 + (depth >= 3 && Math.random() < 0.4 ? 1 : 0);

  for (let index = 0; index < totalDrops; index += 1) {
    const materialId =
      index === 0
        ? primary[0]
        : index === 1
          ? primary[Math.min(1, primary.length - 1)]
          : pickOne(primary);
    addMaterial(reward, materialId, 1);
  }

  if (advancedPrimary.length > 0 && nodeType !== "merchant") {
    const featuredMaterialId = advancedPrimary[0];
    let featuredChance =
      nodeType === "relic"
        ? 0.88
        : nodeType === "miniboss"
          ? 0.76
          : nodeType === "event"
            ? 0.6
            : 0.46;

    if (EASIER_ADVANCED_MATERIALS.has(featuredMaterialId)) {
      featuredChance += 0.16;
    }

    if (depth >= 3) {
      featuredChance += 0.05;
    }

    if (chapterIndex >= 2) {
      featuredChance += 0.04;
    }

    if (Math.random() < Math.min(0.96, featuredChance)) {
      addMaterial(reward, featuredMaterialId, 1);
    }

    const bonusAdvancedChance =
      nodeType === "relic"
        ? 0.55
        : nodeType === "miniboss"
          ? 0.44
          : nodeType === "event"
            ? 0.32
            : 0.2;

    if (advancedPrimary.length > 1 && Math.random() < bonusAdvancedChance) {
      addMaterial(reward, pickOne(advancedPrimary), 1);
    }
  }

  if (
    ["desert", "oasis", "marsh", "swamp", "wetlands", "redwoodForest", "pineForest", "spiritMarsh"].includes(regionId) &&
    nodeType !== "merchant" &&
    Math.random() < (nodeType === "miniboss" || nodeType === "relic" ? 0.52 : 0.34)
  ) {
    addMaterial(reward, "amber", 1);
  }

  if (
    (
      regionId === "volcano" ||
      regionId === "frozenPeaks" ||
      regionId === "kingdom" ||
      regionId === "crystalCaverns" ||
      regionId === "glacier" ||
      regionId === "lavaFields" ||
      regionId === "sunkenRuins" ||
      regionId === "skyIslands"
    ) &&
    nodeType !== "merchant" &&
    Math.random() < 0.35
  ) {
    addMaterial(reward, "essence", 1);
  }

  if (
    (regionId === "shore" || regionId === "sea" || regionId === "ocean" || regionId === "archipelago" || regionId === "coralReef") &&
    nodeType === "event" &&
    Math.random() < 0.45
  ) {
    addMaterial(reward, "gemstone", 1);
  }

  return reward;
}

function pickNodeType(regionId: RegionId, depth: number, chapterIndex: number, relicPlaced: boolean): WorldNodeType {
  if (depth === 0) {
    return "battle";
  }

  if (depth === MAX_DEPTH) {
    return "battle";
  }

  const merchantChance = Math.max(0.42, 0.7 - chapterIndex * 0.06);
  if (SETTLEMENT_REGIONS.has(regionId) && depth >= 1 && Math.random() < merchantChance) {
    return "merchant";
  }

  if (!relicPlaced && EXPEDITION_REGIONS[regionId].uniqueRelicId && depth >= 2 && depth <= MAX_DEPTH - 2 && Math.random() < 0.18) {
    return "relic";
  }

  if (depth >= 2 && depth <= MAX_DEPTH - 1 && Math.random() < 0.16) {
    return "event";
  }

  if (depth >= 4 && Math.random() < Math.min(0.3, 0.1 + chapterIndex * 0.03 + (depth >= 7 ? 0.03 : 0))) {
    return "miniboss";
  }

  return "battle";
}

function createNodeTitle(regionId: RegionId, nodeType: WorldNodeType, depth: number): string {
  const region = EXPEDITION_REGIONS[regionId];
  const suffixes: Record<WorldNodeType, string[]> = {
    battle: ["Pass", "Path", "Front", "Track", "Line"],
    miniboss: ["Hunt", "Champion", "Break", "Trial", "Stand"],
    event: ["Find", "Secret", "Discovery", "Turn", "Cache"],
    merchant: ["Market", "Tradepost", "Exchange", "Relay", "Broker"],
    relic: ["Relic", "Vault", "Shrine", "Archive", "Cache"]
  };
  const suffix = suffixes[nodeType][depth % suffixes[nodeType].length] ?? suffixes[nodeType][0];
  return `${region.name} ${suffix}`;
}

function createNodeSubtitle(regionId: RegionId, nodeType: WorldNodeType): string {
  const region = EXPEDITION_REGIONS[regionId];

  switch (nodeType) {
    case "merchant":
      return `${region.theme} Trade and convert materials here.`;
    case "event":
      return region.hiddenEvent;
    case "relic":
      return `${region.theme} A relic route sits somewhere in this stretch.`;
    case "miniboss":
      return `${region.summary} Expect a tougher target and slightly richer spoils.`;
    default:
      return `${region.theme} ${region.summary}`;
  }
}

function canTransitionTo(currentRegionId: RegionId, nextRegionId: RegionId): boolean {
  return REGION_TRANSITIONS[currentRegionId]?.includes(nextRegionId) ?? false;
}

function hasRecentRegion(history: RegionId[], regionIds: RegionId[], lookback = 3): boolean {
  return history.slice(-lookback).some((regionId) => regionIds.includes(regionId));
}

function sharesRegionFamily(leftRegionId: RegionId, rightRegionId: RegionId): boolean {
  return BIOME_FAMILIES.some((family) => family.has(leftRegionId) && family.has(rightRegionId));
}

function getTransitionFlowBonus(currentRegionId: RegionId, nextRegionId: RegionId): number {
  let bonus = 0;

  if (sharesRegionFamily(currentRegionId, nextRegionId)) {
    bonus += 0.55;
  }

  if (TEMPERATE_REGIONS.has(currentRegionId) && ["highlands", "tundra", "pineForest"].includes(nextRegionId)) {
    bonus += 0.35;
  }

  if (ALPINE_REGIONS.has(currentRegionId) && ALPINE_REGIONS.has(nextRegionId)) {
    bonus += 0.2;
  }

  if (ARID_REGIONS.has(currentRegionId) && ["volcanicLand", "ashlands", "lavaFields", "obsidianWastes", "sulfurSprings"].includes(nextRegionId)) {
    bonus += 0.35;
  }

  if (COASTAL_REGIONS.has(currentRegionId) && COASTAL_REGIONS.has(nextRegionId)) {
    bonus += 0.25;
  }

  if (WETLAND_REGIONS.has(currentRegionId) && WETLAND_REGIONS.has(nextRegionId)) {
    bonus += 0.25;
  }

  return bonus;
}

function countRecentRegion(history: RegionId[], targetRegionId: RegionId, lookback = 4): number {
  return history.slice(-lookback).filter((regionId) => regionId === targetRegionId).length;
}

function getTransitionRuleState(currentRegionId: RegionId, nextRegionId: RegionId, history: RegionId[]): TransitionRuleState {
  if (!canTransitionTo(currentRegionId, nextRegionId)) {
    return "blocked";
  }

  if (nextRegionId === "volcano") {
    if (!["volcanicLand", "lavaFields", "sulfurSprings", "obsidianWastes"].includes(currentRegionId)) {
      return "blocked";
    }

    return hasRecentRegion(history, ["savannah", "scorchedPlateau", "volcanicLand", "ashlands", "lavaFields"], 4)
      ? "strict"
      : "soft";
  }

  if (nextRegionId === "frozenPeaks") {
    if (!["frostlands", "glacier", "iceCaves"].includes(currentRegionId)) {
      return "blocked";
    }

    return hasRecentRegion(history, ["tundra", "mountain", "snowyForest"], 4) ? "strict" : "soft";
  }

  if (nextRegionId === "ocean") {
    if (!["shore", "sea", "archipelago", "coralCoast", "coralReef"].includes(currentRegionId)) {
      return "blocked";
    }

    return hasRecentRegion(history, ["shore", "sea", "coralCoast", "archipelago"], 3) ? "strict" : "soft";
  }

  if (nextRegionId === "volcanicLand") {
    if (currentRegionId === "volcano") {
      return "strict";
    }

    if (!["savannah", "grasslands", "plains", "scorchedPlateau", "ashlands"].includes(currentRegionId)) {
      return "blocked";
    }

    return hasRecentRegion(history, ["savannah", "grasslands", "plains", "desert", "scorchedPlateau"], 3)
      ? "strict"
      : "soft";
  }

  if (nextRegionId === "jungle") {
    if (currentRegionId === "shore") {
      return "blocked";
    }

    return hasRecentRegion(history, ["savannah", "grove", "river"], 2) ? "strict" : "soft";
  }

  if (nextRegionId === "glacier") {
    return ["frostlands", "snowyForest", "frozenPeaks", "crystalValley", "mountain"].includes(currentRegionId) ? "strict" : "blocked";
  }

  if (nextRegionId === "ashlands") {
    return ["volcanicLand", "scorchedPlateau", "lavaFields", "sulfurSprings"].includes(currentRegionId) ? "strict" : "blocked";
  }

  if (nextRegionId === "crystalCaverns") {
    return ["caverns", "iceCaves", "crystalValley"].includes(currentRegionId) ? "strict" : "blocked";
  }

  if (nextRegionId === "lavaFields") {
    return ["ashlands", "scorchedPlateau", "volcano", "volcanicLand"].includes(currentRegionId) ? "strict" : "blocked";
  }

  if (nextRegionId === "obsidianWastes") {
    return ["lavaFields", "ashlands", "sulfurSprings", "volcano"].includes(currentRegionId) ? "strict" : "blocked";
  }

  if (nextRegionId === "grandReef") {
    return ["coralReef", "archipelago", "ocean"].includes(currentRegionId) ? "strict" : "blocked";
  }

  if (nextRegionId === "sunkenRuins") {
    if (!["archipelago", "coralReef", "grandReef", "spiritMarsh", "ocean", "coralCoast"].includes(currentRegionId)) {
      return "blocked";
    }

    return hasRecentRegion(history, ["shore", "sea", "coralCoast", "archipelago", "coralReef", "spiritMarsh"], 3)
      ? "strict"
      : "soft";
  }

  if (nextRegionId === "forgottenTemple") {
    return hasRecentRegion(history, ["ancientRuins", "sacredGrove", "kingdom", "jungle"], 2) ? "strict" : "soft";
  }

  if (nextRegionId === "crystalValley") {
    if (!["mountain", "crystalCaverns", "ancientRuins", "glacier", "skyIslands", "highlands", "caverns"].includes(currentRegionId)) {
      return "blocked";
    }

    return hasRecentRegion(history, ["highlands", "mountain", "caverns", "glacier"], 3) ? "strict" : "soft";
  }

  if (nextRegionId === "skyIslands") {
    if (!["cliffs", "frozenPeaks", "crystalValley", "forgottenTemple", "glacier"].includes(currentRegionId)) {
      return "blocked";
    }

    return hasRecentRegion(history, ["highlands", "mountain", "cliffs", "crystalValley", "frozenPeaks"], 3) ? "strict" : "soft";
  }

  return "strict";
}

function chooseTransitionRegion(
  currentRegionId: RegionId,
  depth: number,
  chapterIndex: number,
  preferSpecial = false,
  history: RegionId[] = [currentRegionId],
  siblingRegionIds: RegionId[] = []
): RegionId {
  const transitionEntries = REGION_TRANSITIONS[currentRegionId].map((regionId) => ({
    regionId,
    state: getTransitionRuleState(currentRegionId, regionId, history)
  }));
  const strictOptions = transitionEntries.filter((entry) => entry.state === "strict").map((entry) => entry.regionId);
  const softOptions = transitionEntries.filter((entry) => entry.state !== "blocked").map((entry) => entry.regionId);
  const weightedOptions = strictOptions.length > 0 ? strictOptions : softOptions.length > 0 ? softOptions : REGION_TRANSITIONS[currentRegionId];
  const usingFallbackOptions = strictOptions.length === 0;
  const scored = weightedOptions.map((regionId) => {
    let score = 1;
    score += getTransitionFlowBonus(currentRegionId, regionId);
    const ruleState = transitionEntries.find((entry) => entry.regionId === regionId)?.state ?? "strict";
    const recentRepeatCount = countRecentRegion(history, regionId, 4);
    const siblingRepeatCount = siblingRegionIds.filter((siblingRegionId) => siblingRegionId === regionId).length;
    const keepsFamilyFlow = sharesRegionFamily(currentRegionId, regionId);
    const touchesRecentFamily = history.some((recentRegionId) => sharesRegionFamily(recentRegionId, regionId));

    if (depth <= 2 && GENTLE_REGIONS.has(regionId)) {
      score += 2;
    }

    if (ruleState === "soft") {
      score -= 0.45;
    }

    if (usingFallbackOptions && BRIDGE_REGIONS.has(regionId)) {
      score += 0.6;
    }

    if (!keepsFamilyFlow && !BRIDGE_REGIONS.has(regionId)) {
      score -= 0.28;
    }

    if (touchesRecentFamily) {
      score += 0.22;
    } else if (!BRIDGE_REGIONS.has(regionId)) {
      score -= 0.32;
    }

    if (BRIDGE_REGIONS.has(regionId) && depth >= 2 && depth <= MAX_DEPTH - 1) {
      score += 0.16;
    }

    if (chapterIndex === 0) {
      if (GENTLE_REGIONS.has(regionId)) {
        score += 0.9;
      }

      if (SETTLEMENT_REGIONS.has(regionId)) {
        score += 0.85;
      }

      if (HAZARDOUS_REGIONS.has(regionId)) {
        score -= depth <= 2 ? 1.45 : 0.7;
      }

      if (SPECIAL_REGIONS.has(regionId)) {
        score -= depth <= 3 ? 1.1 : 0.45;
      }
    }

    if (depth >= 4 && HAZARDOUS_REGIONS.has(regionId)) {
      score += 2;
    }

    if (chapterIndex >= 2 && EXPEDITION_REGIONS[regionId].primaryMaterials.includes("essence")) {
      score += 1;
    }

    if (SPECIAL_REGIONS.has(regionId)) {
      score += depth >= 3 ? 1.3 : 0.5;
    }

    if (preferSpecial) {
      score += SPECIAL_REGIONS.has(regionId) ? 1.1 : -0.05;
    }

    if (SPECIAL_REGIONS.has(regionId) && !keepsFamilyFlow && !BRIDGE_REGIONS.has(currentRegionId)) {
      score -= 0.36;
    }

    if ((currentRegionId === "tundra" || currentRegionId === "mountain") && (regionId === "frostlands" || regionId === "frozenPeaks")) {
      score += 1.45;
    }

    if (
      ["plains", "grasslands", "badlands", "canyon", "pineForest", "tundra", "highlands"].includes(currentRegionId) &&
      (regionId === "highlands" || regionId === "mountain")
    ) {
      score += regionId === "mountain" ? 1.3 : 0.95;
    }

    if (
      ["highlands", "mountain", "cliffs", "caverns", "crystalValley", "pineForest", "frostlands", "glacier"].includes(currentRegionId) &&
      ["mountain", "cliffs", "caverns", "crystalValley", "glacier", "frozenPeaks"].includes(regionId)
    ) {
      score += 0.8;
    }

    if (
      (currentRegionId === "savannah" || currentRegionId === "volcanicLand" || currentRegionId === "grasslands" || currentRegionId === "plains") &&
      (regionId === "volcanicLand" || regionId === "volcano")
    ) {
      score += 1.55;
    }

    if (
      ["shore", "sea", "archipelago", "coralCoast", "coralReef", "river"].includes(currentRegionId) &&
      ["shore", "sea", "archipelago", "coralCoast", "coralReef", "grandReef", "ocean", "sunkenRuins"].includes(regionId)
    ) {
      score += 0.45;
    }

    if (
      ["marsh", "wetlands", "swamp", "river", "mangrove"].includes(currentRegionId) &&
      ["marsh", "wetlands", "swamp", "river", "mangrove", "spiritMarsh"].includes(regionId)
    ) {
      score += 0.45;
    }

    if ((currentRegionId === "sea" || currentRegionId === "shore") && regionId === "ocean") {
      score += 0.8;
    }

    if (SETTLEMENT_REGIONS.has(regionId) && depth >= 2 && depth <= MAX_DEPTH - 1) {
      score += 1;
    }

    if (recentRepeatCount > 0) {
      score -= recentRepeatCount * 0.8;
    }

    if (recentRepeatCount >= 2) {
      score -= 1.25;
    }

    if (siblingRepeatCount > 0) {
      score -= siblingRepeatCount * 1.15;
    }

    if (siblingRepeatCount >= 2) {
      score -= 1.5;
    }

    if (siblingRepeatCount >= 2 && weightedOptions.some((candidateRegionId) => candidateRegionId !== regionId)) {
      score -= 3.5;
    }

    if (recentRepeatCount >= 2 && weightedOptions.some((candidateRegionId) => candidateRegionId !== regionId)) {
      score -= 2;
    }

    if (regionId === currentRegionId) {
      score -= 0.5;
    }

    return {
      regionId,
      score
    };
  });
  const totalScore = scored.reduce((sum, entry) => sum + Math.max(0.25, entry.score), 0);
  let threshold = Math.random() * totalScore;

  for (const entry of scored) {
    threshold -= Math.max(0.25, entry.score);

    if (threshold <= 0) {
      return entry.regionId;
    }
  }

  return scored[scored.length - 1]?.regionId ?? weightedOptions[0];
}

function pickNextAnchorRegion(currentRegionId: RegionId, chapterIndex: number): RegionId {
  if (chapterIndex === 0) {
    return "plains";
  }

  const options = REGION_TRANSITIONS[currentRegionId];
  const coreTargets = options.filter((regionId) => HAZARDOUS_REGIONS.has(regionId) || SETTLEMENT_REGIONS.has(regionId));
  if (coreTargets.length > 0 && Math.random() < 0.72) {
    return pickOne(coreTargets);
  }

  const specialTargets = options.filter((regionId) => SPECIAL_REGIONS.has(regionId));
  if (specialTargets.length > 0 && Math.random() < 0.5) {
    return pickOne(specialTargets);
  }

  return pickOne(options);
}

export function getNextAnchorRegion(currentRegionId: RegionId, chapterIndex: number): RegionId {
  return pickNextAnchorRegion(currentRegionId, chapterIndex);
}

export function generateWorldChapter(params: {
  chapterIndex: number;
  startRegionId: RegionId;
  nodeOrdinal: number;
  startWorldDepth: number;
  ownedRelicIds: RelicId[];
}): GeneratedWorldChapter {
  const { chapterIndex, startRegionId, ownedRelicIds, startWorldDepth } = params;
  let nodeOrdinal = params.nodeOrdinal;
  const nodes: Record<string, WorldNodeDefinition> = {};
  const nodeIds: string[] = [];
  let relicPlaced = false;
  let specialRegionPlaced = SPECIAL_REGIONS.has(startRegionId);
  const recentEnemyIdsByRegion = new Map<RegionId, EnemyId[]>();
  const historyByNodeId = new Map<string, RegionId[]>();
  const scatteredEliteDepths = chapterIndex === 0 ? [4, 8] : [4, 7, 9];

  const applyNodeType = (node: WorldNodeDefinition, type: WorldNodeType): void => {
    const regionRelicId = getRelicForRegion(node.regionId);
    const shouldAttachRelic = type === "relic" && regionRelicId && !ownedRelicIds.includes(regionRelicId);
    const enemyId =
      type === "battle" || type === "miniboss"
        ? pickEnemyForNode(node.regionId, recentEnemyIdsByRegion.get(node.regionId) ?? [])
        : undefined;
    const enemy = enemyId ? getEnemyDefinition(enemyId) : null;

    node.type = type;
    node.title = createNodeTitle(node.regionId, type, node.depth);
    node.subtitle = createNodeSubtitle(node.regionId, type);
    node.rewardMaterials = createRewardMaterials(node.regionId, type, node.depth, chapterIndex);
    node.enemyId = enemyId;
    node.armor =
      type === "battle" || type === "miniboss"
        ? type === "miniboss" && enemy?.armor === "unarmored"
          ? "light"
          : enemy?.armor
        : undefined;
    node.pattern = enemy?.pattern;
    node.optional = type === "miniboss" && node.depth < MAX_DEPTH;
    node.hidden = type === "event";
    node.isBoss = type === "miniboss" && node.depth >= MAX_DEPTH - 1;
    node.relicId = shouldAttachRelic ? regionRelicId : undefined;

    if (shouldAttachRelic) {
      relicPlaced = true;
    }

    if (enemyId) {
      const recentEnemyIds = recentEnemyIdsByRegion.get(node.regionId) ?? [];
      recentEnemyIdsByRegion.set(node.regionId, [...recentEnemyIds, enemyId].slice(-2));
    }
  };

  const createNode = (
    regionId: RegionId,
    type: WorldNodeType,
    lane: number,
    depth: number,
    parentHistory: RegionId[] = []
  ): WorldNodeDefinition => {
    const id = `chapter_${chapterIndex}_${nodeOrdinal++}`;
    const node: WorldNodeDefinition = {
      id,
      regionId,
      type,
      lane,
      depth,
      worldDepth: startWorldDepth + depth,
      title: "",
      subtitle: "",
      nextNodeIds: [],
      rewardMaterials: {} as MaterialCost,
      enemyId: undefined,
      armor: undefined,
      pattern: undefined,
      optional: false,
      hidden: false,
      isBoss: false,
      relicId: undefined
    };

    applyNodeType(node, type);
    nodes[id] = node;
    nodeIds.push(id);
    historyByNodeId.set(id, [...parentHistory, regionId].slice(-4));

    if (SPECIAL_REGIONS.has(regionId)) {
      specialRegionPlaced = true;
    }

    return node;
  };

  const firstNode = createNode(startRegionId, "battle", Math.floor((LANE_COUNT - 1) * 0.5), 0);
  const layers: WorldNodeDefinition[][] = [[firstNode]];

  for (let depth = 1; depth <= MAX_DEPTH; depth += 1) {
    const previousLayer = layers[depth - 1];
    const childrenByLane = new Map<number, WorldNodeDefinition>();
    const plannedNodeIds = new Map<string, string[]>();
    const orderedParents = [...previousLayer].sort(
      (left, right) => REGION_TRANSITIONS[left.regionId].length - REGION_TRANSITIONS[right.regionId].length
    );
    const targetNodeCount = Math.min(4 + Math.floor(depth / 2), 6);

    for (const parent of orderedParents) {
      const parentTargetIds: string[] = [];
      const offsets = shuffleOffsets(depth === 1 ? [0, 1, -1, 2, -2] : [0, 1, -1, 2, -2, 3, -3]);
      const spawnCount =
        depth === MAX_DEPTH ? 1 : depth >= 6 && Math.random() < 0.14 ? 3 : Math.random() < (depth <= 2 ? 0.58 : 0.7) ? 2 : 1;

      const tryAssignLane = (nextLane: number): string | null => {
        const existing = childrenByLane.get(nextLane);

        if (existing) {
          return canTransitionTo(parent.regionId, existing.regionId) ? existing.id : null;
        }

        const hasCompatibleExisting = [...childrenByLane.values()].some((candidate) => canTransitionTo(parent.regionId, candidate.regionId));
        if (childrenByLane.size >= targetNodeCount && hasCompatibleExisting) {
          return null;
        }

        const parentHistory = historyByNodeId.get(parent.id) ?? [parent.regionId];
        const regionId = chooseTransitionRegion(
          parent.regionId,
          depth,
          chapterIndex,
          !specialRegionPlaced && depth >= 2,
          parentHistory,
          [...childrenByLane.values()].map((candidate) => candidate.regionId)
        );
        const type = pickNodeType(regionId, depth, chapterIndex, relicPlaced);
        const node = createNode(regionId, type, nextLane, depth, parentHistory);
        childrenByLane.set(nextLane, node);
        return node.id;
      };

      for (const offset of offsets) {
        if (parentTargetIds.length >= spawnCount) {
          break;
        }

        const targetId = tryAssignLane(clampLane(parent.lane + offset));

        if (!targetId || parentTargetIds.includes(targetId)) {
          continue;
        }

        parentTargetIds.push(targetId);
      }

      if (parentTargetIds.length === 0) {
        const fallbackLanes = shuffleOffsets([0, 1, -1, 2, -2, 3, -3]).map((offset) => clampLane(parent.lane + offset));

        for (const lane of fallbackLanes) {
          const targetId = tryAssignLane(lane);

          if (targetId) {
            parentTargetIds.push(targetId);
            break;
          }
        }
      }

      plannedNodeIds.set(parent.id, parentTargetIds);
    }

    let expansionAttempts = 0;
    while (childrenByLane.size < targetNodeCount && depth < MAX_DEPTH) {
      expansionAttempts += 1;

      if (expansionAttempts > 32) {
        break;
      }

      const seedParent = pickOne(previousLayer);
      const nextLane = clampLane(seedParent.lane + pickOne([-2, -1, 1, 2]));

      if (childrenByLane.has(nextLane)) {
        continue;
      }

      const seedHistory = historyByNodeId.get(seedParent.id) ?? [seedParent.regionId];
      const regionId = chooseTransitionRegion(
        seedParent.regionId,
        depth,
        chapterIndex,
        !specialRegionPlaced && depth >= 2,
        seedHistory,
        [...childrenByLane.values()].map((candidate) => candidate.regionId)
      );
      const type = pickNodeType(regionId, depth, chapterIndex, relicPlaced);
      childrenByLane.set(nextLane, createNode(regionId, type, nextLane, depth, seedHistory));
      plannedNodeIds.set(seedParent.id, [...new Set([...(plannedNodeIds.get(seedParent.id) ?? []), childrenByLane.get(nextLane)?.id ?? ""])].filter(Boolean));
    }

    const nextLayer = [...childrenByLane.values()].sort((left, right) => left.lane - right.lane);

    if (scatteredEliteDepths.includes(depth) && !nextLayer.some((node) => node.type === "miniboss")) {
      const eliteCandidate =
        [...nextLayer]
          .filter((node) => node.type === "battle")
          .sort((left, right) => Math.abs(left.lane - 3) - Math.abs(right.lane - 3))[0] ??
        [...nextLayer]
          .filter((node) => node.type !== "merchant" && node.type !== "relic")
          .sort((left, right) => Math.abs(left.lane - 3) - Math.abs(right.lane - 3))[0];

      if (eliteCandidate) {
        applyNodeType(eliteCandidate, "miniboss");
      }
    }

    layers.push(nextLayer);

    for (const parent of previousLayer) {
      const explicitTargetIds = plannedNodeIds.get(parent.id) ?? [];
      const explicitTargets = nextLayer.filter((candidate) => explicitTargetIds.includes(candidate.id));

      if (explicitTargets.length > 0) {
        parent.nextNodeIds = [...new Set(explicitTargets.map((entry) => entry.id))];
        continue;
      }

      parent.nextNodeIds = nextLayer
        .filter((candidate) => canTransitionTo(parent.regionId, candidate.regionId))
        .sort((left, right) => Math.abs(left.lane - parent.lane) - Math.abs(right.lane - parent.lane))
        .slice(0, 2)
        .map((entry) => entry.id);
    }
  }

  const finalLayer = layers[layers.length - 1] ?? [];
  const finalEliteNodes: WorldNodeDefinition[] = [];

  for (const node of finalLayer) {
    const parentHistory = historyByNodeId.get(node.id) ?? [node.regionId];
    const regionId = chooseTransitionRegion(
      node.regionId,
      MAX_DEPTH + 1,
      chapterIndex,
      true,
      parentHistory,
      finalEliteNodes.map((candidate) => candidate.regionId)
    );
    const eliteNode = createNode(regionId, "miniboss", node.lane, MAX_DEPTH + 1, parentHistory);
    finalEliteNodes.push(eliteNode);
    node.nextNodeIds = [eliteNode.id];
  }

  for (const eliteNode of finalEliteNodes) {
    eliteNode.nextNodeIds = [];
  }

  return {
    nodeIds,
    nodes,
    startNodeIds: [firstNode.id],
    nextNodeOrdinal: nodeOrdinal,
    nextWorldDepth: startWorldDepth + MAX_DEPTH + 2
  };
}

function shuffleOffsets(offsets: number[]): number[] {
  const result = [...offsets];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = result[index];
    result[index] = result[swapIndex] ?? current;
    result[swapIndex] = current;
  }

  return result;
}

export function resolveWorldEncounter(node: WorldNodeDefinition, levelNumber: number, expeditionTier: number): EncounterConfig {
  const region = EXPEDITION_REGIONS[node.regionId];
  const enemy = getEnemyDefinition(node.enemyId ?? BIOME_ENEMY_POOLS[node.regionId][0]);
  const boss = Boolean(node.isBoss);
  const depthWeight = node.depth * 0.8 + expeditionTier * 0.9;
  const lateGamePressure = Math.max(0, expeditionTier - 1);
  const hazardPressure = SPECIAL_REGIONS.has(node.regionId) ? 0.9 : HAZARDOUS_REGIONS.has(node.regionId) ? 0.45 : 0;
  const lateGameHardening =
    expeditionTier <= 1 ? 1 : 1 + Math.min(0.15, 0.05 + lateGamePressure * 0.04 + (node.depth >= 7 ? 0.02 : 0));
  const lateGameMobilityScale = 1 + (lateGameHardening - 1) * 0.58;
  const lateGameDamageScale = 1 + (lateGameHardening - 1) * 0.74;
  const openingRelief =
    expeditionTier === 0
      ? node.depth <= 1
        ? 1.2
        : node.depth <= 3
          ? 0.75
          : node.depth <= 5
            ? 0.35
            : 0
      : expeditionTier === 1 && node.depth <= 2
        ? 0.25
        : 0;
  const challengeWeight = Math.max(0, depthWeight + lateGamePressure * 0.45 + hazardPressure - openingRelief);
  const eliteHpScale = boss ? 1.16 : node.type === "miniboss" ? 1.1 : 1;
  const baseEnemyHp =
    (enemy.maxHp +
      challengeWeight * 8 +
      lateGamePressure * (boss ? 6 : node.type === "miniboss" ? 5 : 4) +
      (boss ? 18 : node.type === "miniboss" ? 10 : 0) -
      (expeditionTier === 0 && !boss ? (node.depth <= 1 ? 8 : node.depth <= 3 ? 4 : 0) : 0)) *
    lateGameHardening;

  return {
    levelNumber,
    title: `${region.name} - ${node.title}`,
    subtitle: node.subtitle,
    regionId: region.id,
    regionName: region.name,
    nodeType: node.type,
    enemyRoster: region.enemyRoster,
    armor: node.armor ?? enemy.armor,
    enemyHp: Math.round(baseEnemyHp * eliteHpScale),
    enemySpeed: Math.round((enemy.speed + challengeWeight * 4 + lateGamePressure + (boss ? 6 : 0)) * lateGameMobilityScale),
    enemyAcceleration: Math.round(
      (enemy.acceleration + challengeWeight * 42 + lateGamePressure * 16 + (boss ? 60 : 0)) * lateGameMobilityScale
    ),
    enemyId: enemy.id,
    enemyDamageBonus: Math.max(
      0,
      Math.round((challengeWeight * 0.9 + lateGamePressure * 0.3 + (boss ? 2 : 0) - openingRelief * 0.55) * lateGameDamageScale)
    ),
    enemyAggression: Math.min(
      1.22,
      Math.max(
        0.58,
        enemy.aggression +
          node.depth * 0.032 +
          expeditionTier * 0.02 +
          lateGamePressure * 0.02 +
          hazardPressure * 0.02 +
          (boss ? 0.06 : 0) +
          (lateGameHardening - 1) * 0.22 -
          openingRelief * 0.05
      )
    ),
    dropCount: Object.values(node.rewardMaterials).reduce((sum, value) => sum + (value ?? 0), 0),
    arenaFill: region.fill,
    arenaEdge: region.edge,
    enemyTint: enemy.accent,
    enemySize: enemy.size + (boss ? 4 : node.type === "miniboss" ? 2 : 0),
    pattern: node.pattern ?? enemy.pattern,
    rewardMaterials: node.rewardMaterials,
    optional: node.optional
  };
}
