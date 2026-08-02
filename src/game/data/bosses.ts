import type { BiomeBossId, BossDefinition, BossId, MaterialCost, RegionId, SecretBossId } from "../core/types";

const SKELECAR_PHASE_1_URL = new URL("../../../assets/SkelecarPhase1.jpg", import.meta.url).href;
const SKELECAR_PHASE_2_URL = new URL("../../../assets/SkelecarPhase2.jpg", import.meta.url).href;
const DANU_PHASE_1_URL = new URL("../../../assets/DanuPhase1.jpg", import.meta.url).href;
const DANU_PHASE_2_URL = new URL("../../../assets/DanuPhase2.jpg", import.meta.url).href;

const COASTAL_REGIONS = new Set<RegionId>([
  "sea",
  "ocean",
  "shore",
  "river",
  "archipelago",
  "coralCoast",
  "coralReef",
  "grandReef",
  "mangrove",
  "wetlands"
]);

const VOLCANIC_REGIONS = new Set<RegionId>([
  "volcano",
  "volcanicLand",
  "ashlands",
  "lavaFields",
  "obsidianWastes",
  "sulfurSprings",
  "scorchedPlateau",
  "badlands"
]);

const COLD_REGIONS = new Set<RegionId>(["tundra", "frostlands", "frozenPeaks", "glacier", "iceCaves", "snowyForest"]);

const SACRED_REGIONS = new Set<RegionId>([
  "ancientRuins",
  "forgottenTemple",
  "sacredGrove",
  "spiritMarsh",
  "sunkenRuins",
  "crystalValley",
  "skyIslands",
  "grove",
  "marsh",
  "swamp"
]);

export const BOSSES: Record<BiomeBossId, BossDefinition> = {
  apex: {
    id: "apex",
    pool: "biome",
    name: "The Apex",
    typeName: "Megalodon",
    epithet: "Ancient ocean predator",
    biome: "coastal",
    summary: "A heavy predator that circles, floods lanes with undertow, and commits brutally when it finally surges.",
    personality: "The Apex is patient in a frightening way. It gives the player room only so the next charge matters more.",
    intro: "The water rises around a scarred dorsal fin. The Apex is already moving before the duel begins.",
    lesson: "Pressure breaks players who stop moving.",
    coreRule: "Keep moving or get devoured.",
    proxyEnemyId: "sunkenHarpooner",
    rewardRelicId: "apexTooth",
    arenaTitle: "Undertow Basin",
    arenaSubtitle: "Flooded channels punish stillness.",
    accent: 0x5fa9c4,
    fill: 0x0b2633,
    edge: 0x67c5dc,
    armor: "heavy",
    phaseHp: [650, 800],
    speed: 218,
    acceleration: 1500,
    aggression: 0.8,
    size: 56
  },
  enflamed: {
    id: "enflamed",
    pool: "biome",
    name: "The Enflamed",
    typeName: "Seraph",
    epithet: "Fire-born divine hunter",
    biome: "volcanic",
    summary: "A blazing seraph that owns the airspace, repositions constantly, and tests whether you can read where it will land.",
    personality: "The Enflamed is elegant and territorial, always making the player chase the next safe angle.",
    intro: "Wingbeats of cinder scatter across the arena. The Enflamed descends in a flash of white fire.",
    lesson: "Movement and prediction beat panic chasing.",
    coreRule: "Predict where it will be.",
    proxyEnemyId: "sulfurCaller",
    rewardRelicId: "seraphHalo",
    arenaTitle: "Cinder Vault",
    arenaSubtitle: "Vents flare where the seraph lands.",
    accent: 0xf39c61,
    fill: 0x2a1210,
    edge: 0xffb06b,
    armor: "light",
    phaseHp: [600, 720],
    speed: 222,
    acceleration: 1600,
    aggression: 0.8,
    size: 52
  },
  honored: {
    id: "honored",
    pool: "biome",
    name: "The Honored",
    typeName: "Knight",
    epithet: "Master of the duel line",
    biome: "temperate",
    summary: "A disciplined knight who holds guard, waits for overcommitment, and ends greedy offense with punishing ripostes.",
    personality: "The Honored refuses to be rushed. It would rather wait than trade sloppily.",
    intro: "Steel rings once as a knight lowers into guard. The Honored waits for a clean exchange, not a brawl.",
    lesson: "Patience and spacing win duels against masters.",
    coreRule: "Fight with discipline.",
    proxyEnemyId: "hedgeKnight",
    rewardRelicId: "duelistRibbon",
    arenaTitle: "Old Tourney Ring",
    arenaSubtitle: "A formal dueling floor leaves little room to reset.",
    accent: 0xd6c28a,
    fill: 0x231d16,
    edge: 0xe0cc91,
    armor: "heavy",
    phaseHp: [730, 900],
    speed: 152,
    acceleration: 1100,
    aggression: 0.72,
    size: 54
  },
  exalted: {
    id: "exalted",
    pool: "biome",
    name: "The Exalted",
    typeName: "Construct",
    epithet: "Ancient guardian of forbidden halls",
    biome: "sacred",
    summary: "A sacred machine that controls the floor, then crushes whatever fails to adapt to its new geometry.",
    personality: "The Exalted is methodical and inhuman, more interested in arranging the arena than chasing the player.",
    intro: "Stone plates grind into alignment as the construct wakes. The Exalted opens the hall with a low metallic hymn.",
    lesson: "Reading space matters as much as reading swings.",
    coreRule: "The arena is your enemy.",
    proxyEnemyId: "ruinGuardian",
    rewardRelicId: "exaltedCore",
    arenaTitle: "Consecrated Engine Hall",
    arenaSubtitle: "Runes awaken as the guardian shifts phases.",
    accent: 0x99b6d8,
    fill: 0x0f1725,
    edge: 0xb5d4f4,
    armor: "heavy",
    phaseHp: [1060, 1180],
    speed: 192,
    acceleration: 1410,
    aggression: 0.74,
    size: 58
  },
  permafrost: {
    id: "permafrost",
    pool: "biome",
    name: "The Permafrost",
    typeName: "Ronin",
    epithet: "Frozen wanderer of exact measure",
    biome: "cold",
    summary: "A measured ronin who waits in stillness, then answers one bad dash or one bad swing with a perfect draw cut.",
    personality: "The Permafrost wastes no motion. Long pauses are part of the threat.",
    intro: "Snow dust skates over the stone as a ronin turns side-on. The Permafrost gives ground only to take better measure.",
    lesson: "Precise timing beats panic movement.",
    coreRule: "Every mistake is answered.",
    proxyEnemyId: "frostScout",
    rewardRelicId: "permafrostToken",
    arenaTitle: "Rime Crossing",
    arenaSubtitle: "Frozen lanes reward clean spacing and punish overchase.",
    accent: 0x9fd7f2,
    fill: 0x101e2d,
    edge: 0xc1ecff,
    armor: "light",
    phaseHp: [690, 840],
    speed: 198,
    acceleration: 1500,
    aggression: 0.76,
    size: 50
  }
};

export const SECRET_BOSSES: Record<SecretBossId, BossDefinition> = {
  skelecar: {
    id: "skelecar",
    pool: "secret",
    name: "Sans Cat",
    typeName: "Skelecar",
    epithet: "Blue-eyed nuisance from a very bad hallway",
    biome: "secret",
    summary: "A lazy-looking menace that sidesteps into clean lines and turns bad footwork into a joke at your expense.",
    personality: "Sans Cat seems bored right until it decides your spacing was embarrassing.",
    intro: "A cat-shaped grin hangs in the arena air. One eye glows blue. You have made a terrible, probably funny mistake.",
    lesson: "Lazy movement still gets punished.",
    coreRule: "Bad spacing is the whole joke.",
    proxyEnemyId: "sulfurCaller",
    rewardRelicId: "blueSocket",
    arenaTitle: "Bad Time Hallway",
    arenaSubtitle: "Blue lines punish lazy steps.",
    accent: 0x5caeff,
    fill: 0x0c1424,
    edge: 0x82d1ff,
    armor: "light",
    phaseHp: [710, 860],
    speed: 232,
    acceleration: 1740,
    aggression: 0.9,
    size: 44,
    phaseSpriteKeys: ["boss-skelecar-phase-1", "boss-skelecar-phase-2"],
    phaseSpriteVisibleHeight: 64,
    phaseSpriteOrigin: {
      x: 0.5,
      y: 0.64
    },
    clearFlagId: "secret:skelecar",
    bonusRewardMaterials: {
      gemstone: 1,
      essence: 1
    }
  },
  danu: {
    id: "danu",
    pool: "secret",
    name: "Danu",
    typeName: "Approved Menace",
    epithet: "Smiling judge of sudden commitment",
    biome: "secret",
    summary: "A cheerful executioner who gives you just enough room to relax before flattening the line with direct approval.",
    personality: "Danu looks supportive. Danu is not supportive.",
    intro: "Danu is already there, smiling and giving two thumbs up. Somehow that is much worse than a threat.",
    lesson: "Complacency is a punish window.",
    coreRule: "The line is safe only until it is approved.",
    proxyEnemyId: "ruinGuardian",
    rewardRelicId: "approvalStamp",
    arenaTitle: "Approval Chamber",
    arenaSubtitle: "The line is only safe until it is approved.",
    accent: 0xf0bf6a,
    fill: 0x201612,
    edge: 0xf6d78d,
    armor: "heavy",
    phaseHp: [750, 900],
    speed: 214,
    acceleration: 1520,
    aggression: 0.84,
    size: 44,
    phaseSpriteKeys: ["boss-danu-phase-1", "boss-danu-phase-2"],
    phaseSpriteVisibleHeight: 66,
    phaseSpriteOrigin: {
      x: 0.5,
      y: 0.66
    },
    clearFlagId: "secret:danu",
    bonusRewardMaterials: {
      amber: 1,
      essence: 1
    }
  }
};

const ALL_BOSSES: Record<BossId, BossDefinition> = {
  ...BOSSES,
  ...SECRET_BOSSES
};

const SECRET_BOSS_IDS = Object.keys(SECRET_BOSSES) as SecretBossId[];

const BOSS_SPRITE_ASSETS = [
  { key: "boss-skelecar-phase-1", url: SKELECAR_PHASE_1_URL },
  { key: "boss-skelecar-phase-2", url: SKELECAR_PHASE_2_URL },
  { key: "boss-danu-phase-1", url: DANU_PHASE_1_URL },
  { key: "boss-danu-phase-2", url: DANU_PHASE_2_URL }
] as const;

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function mergeMaterialCost(base: MaterialCost, bonus: MaterialCost): MaterialCost {
  const merged: MaterialCost = {
    ...base
  };

  for (const [materialId, amount] of Object.entries(bonus) as Array<[keyof MaterialCost, number | undefined]>) {
    if (!amount) {
      continue;
    }

    merged[materialId] = (merged[materialId] ?? 0) + amount;
  }

  return merged;
}

export function getBossIdForRegion(regionId: RegionId): BiomeBossId {
  if (COASTAL_REGIONS.has(regionId)) {
    return "apex";
  }

  if (VOLCANIC_REGIONS.has(regionId)) {
    return "enflamed";
  }

  if (COLD_REGIONS.has(regionId)) {
    return "permafrost";
  }

  if (SACRED_REGIONS.has(regionId)) {
    return "exalted";
  }

  return "honored";
}

export function isSecretBossId(bossId: BossId): bossId is SecretBossId {
  return bossId in SECRET_BOSSES;
}

export function rollSecretBossId(): SecretBossId {
  return pickOne(SECRET_BOSS_IDS);
}

export function rollBossIdForEncounter(regionId: RegionId): BossId {
  // Secret bosses remain fully supported, but they no longer appear in the natural biome boss rotation.
  return getBossIdForRegion(regionId);
}

export function getBossDefinition(bossId: BossId): BossDefinition {
  return ALL_BOSSES[bossId];
}

export function getBossSpriteAssets(): Array<{ key: string; url: string }> {
  return [...BOSS_SPRITE_ASSETS];
}

export function applyBossBonusRewards(reward: MaterialCost, bossId: BossId | undefined): MaterialCost {
  const bossDefinition = bossId ? getBossDefinition(bossId) : null;
  return bossDefinition?.bonusRewardMaterials ? mergeMaterialCost(reward, bossDefinition.bonusRewardMaterials) : reward;
}
