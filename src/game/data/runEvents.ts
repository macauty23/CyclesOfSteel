import type { LegendarySwordId, MaterialCost, RegionId, RunModifierId } from "../core/types";

export interface RunEventChoice {
  id: string;
  name: string;
  hint: string;
  payment: MaterialCost;
  reward: MaterialCost;
  modifierId?: RunModifierId;
  upgradeSwordId?: LegendarySwordId;
}

export interface RunEventDefinition {
  id: string;
  title: string;
  summary: string;
  accent: number;
  choices: RunEventChoice[];
  rare?: boolean;
}

const COASTAL_REGIONS = new Set<RegionId>(["sea", "ocean", "shore", "river", "archipelago", "coralCoast", "coralReef", "grandReef", "mangrove"]);
const VOLCANIC_REGIONS = new Set<RegionId>(["volcano", "volcanicLand", "ashlands", "lavaFields", "obsidianWastes", "sulfurSprings", "scorchedPlateau"]);
const COLD_REGIONS = new Set<RegionId>(["tundra", "frostlands", "frozenPeaks", "glacier", "iceCaves", "snowyForest"]);
const SACRED_REGIONS = new Set<RegionId>(["ancientRuins", "forgottenTemple", "sacredGrove", "spiritMarsh", "sunkenRuins", "crystalValley", "skyIslands"]);

export const RUN_EVENTS: Record<string, RunEventDefinition> = {
  tideOmen: {
    id: "tideOmen",
    title: "Tide Omen",
    summary: "Foam and wreckage churn around a half-sunk marker. You can take the safe salvage or read the water for a movement lesson.",
    accent: 0x67b9d2,
    choices: [
      {
        id: "study-current",
        name: "Read The Current",
        hint: "Gain Long Step training for this run.",
        payment: { essence: 1 },
        reward: { coral: 1, gemstone: 1 },
        modifierId: "longStep"
      },
      {
        id: "take-salvage",
        name: "Take Salvage",
        hint: "Skip training and collect steady materials.",
        payment: {},
        reward: { coral: 2, wood: 1 }
      }
    ]
  },
  reefGamble: {
    id: "reefGamble",
    title: "Reef Gamble",
    summary: "A reef path offers a clean line if you commit to it. Hesitation means you take only what is close at hand.",
    accent: 0x6cc9c2,
    choices: [
      {
        id: "ride-line",
        name: "Ride The Line",
        hint: "Gain Cutting Forms training for this run.",
        payment: { gemstone: 1 },
        reward: { coral: 1, essence: 1 },
        modifierId: "cuttingForms"
      },
      {
        id: "hug-shore",
        name: "Hug The Shore",
        hint: "Collect safer salvage.",
        payment: {},
        reward: { wood: 1, leather: 1, coral: 1 }
      }
    ]
  },
  smolderingIdol: {
    id: "smolderingIdol",
    title: "Smoldering Idol",
    summary: "Heat leaks from a cracked shrine. The forge-wisdom inside can harden your run if you feed it, or you can strip the site for stock.",
    accent: 0xe78f5c,
    choices: [
      {
        id: "offer-steel",
        name: "Feed The Idol",
        hint: "Gain Lesson of Steel training for this run.",
        payment: { steel: 1, essence: 1 },
        reward: { brimstone: 1, obsidian: 1 },
        modifierId: "lessonOfSteel"
      },
      {
        id: "strip-plates",
        name: "Strip The Plates",
        hint: "Take useful materials without changing your build.",
        payment: {},
        reward: { steel: 1, brimstone: 1, obsidian: 1 }
      }
    ]
  },
  furnaceBet: {
    id: "furnaceBet",
    title: "Furnace Bet",
    summary: "A furnace gate opens only if you enter fast. You can rush it for tempo training or wait for the useful pieces that cool outside.",
    accent: 0xf0a668,
    choices: [
      {
        id: "rush-gate",
        name: "Rush The Gate",
        hint: "Gain Blood Rush training for this run.",
        payment: { leather: 1 },
        reward: { essence: 1, brimstone: 1 },
        modifierId: "bloodRush"
      },
      {
        id: "cooling-rack",
        name: "Work The Rack",
        hint: "Take steadier volcanic stock.",
        payment: {},
        reward: { steel: 1, obsidian: 1, essence: 1 }
      }
    ]
  },
  duelMarker: {
    id: "duelMarker",
    title: "Duel Marker",
    summary: "A formal marker lists old right-of-way rules. You can study them for cleaner binds or strip the post for practical salvage.",
    accent: 0xd7c48e,
    choices: [
      {
        id: "study-rules",
        name: "Study The Marker",
        hint: "Gain Bind Study training for this run.",
        payment: { gemstone: 1 },
        reward: { steel: 1 },
        modifierId: "bindStudy"
      },
      {
        id: "take-hardware",
        name: "Take The Hardware",
        hint: "Collect materials instead of training.",
        payment: {},
        reward: { steel: 2, wood: 1 }
      }
    ]
  },
  fieldDrill: {
    id: "fieldDrill",
    title: "Field Drill",
    summary: "Someone marked a clean footwork pattern into the ground. Following it teaches rhythm. Ignoring it leaves time to search the nearby cache.",
    accent: 0x8cb67a,
    choices: [
      {
        id: "run-pattern",
        name: "Run The Pattern",
        hint: "Gain Footwork Drill training for this run.",
        payment: { wood: 1 },
        reward: { leather: 1 },
        modifierId: "footworkDrill"
      },
      {
        id: "search-cache",
        name: "Search The Cache",
        hint: "Take straightforward route stock.",
        payment: {},
        reward: { steel: 1, wood: 1, leather: 1 }
      }
    ]
  },
  roadAmbush: {
    id: "roadAmbush",
    title: "Road Ambush",
    summary: "A sudden attack breaks the route. You can turn the panic into pure tempo, or cut your way out and take what is left behind.",
    accent: 0xb86b62,
    choices: [
      {
        id: "break-the-line",
        name: "Break The Line",
        hint: "Gain Glass Tempo for this run.",
        payment: { leather: 1 },
        reward: { steel: 1, gemstone: 1 },
        modifierId: "glassTempo"
      },
      {
        id: "take-the-spoils",
        name: "Take The Spoils",
        hint: "Leave with straightforward ambush salvage.",
        payment: {},
        reward: { steel: 1, leather: 1, gemstone: 1 }
      }
    ]
  },
  merchantSiege: {
    id: "merchantSiege",
    title: "Merchant Under Siege",
    summary: "A caravan is collapsing under pressure. Hold the route and earn a lesson, or strip the dropped cargo and move on.",
    accent: 0xc29a68,
    choices: [
      {
        id: "hold-the-route",
        name: "Hold The Route",
        hint: "Gain Footwork Drill for this run.",
        payment: { steel: 1 },
        reward: { amber: 1, wood: 1, leather: 1 },
        modifierId: "footworkDrill"
      },
      {
        id: "strip-the-wagons",
        name: "Strip The Wagons",
        hint: "Take the fallen goods and keep moving.",
        payment: {},
        reward: { amber: 1, wood: 1, leather: 1 }
      }
    ]
  },
  wanderingKnight: {
    id: "wanderingKnight",
    title: "Wandering Knight",
    summary: "A lone knight asks for one honest exchange in the middle of the road. You can accept the lesson or refuse and keep the practical salvage.",
    accent: 0xd4c28b,
    choices: [
      {
        id: "answer-the-salute",
        name: "Answer The Salute",
        hint: "Gain Bind Study for this run.",
        payment: { gemstone: 1 },
        reward: { steel: 1, essence: 1 },
        modifierId: "bindStudy"
      },
      {
        id: "decline-and-pass",
        name: "Decline And Pass",
        hint: "Keep the route practical.",
        payment: {},
        reward: { steel: 1, wood: 1 }
      }
    ]
  },
  cursedReliquary: {
    id: "cursedReliquary",
    title: "Cursed Reliquary",
    summary: "A sealed reliquary hums with useful malice. One vow trades magic for steel. The other trades steel for momentum.",
    accent: 0x9278b8,
    choices: [
      {
        id: "take-the-seal",
        name: "Take The Seal",
        hint: "Gain Arcane Debt for this run.",
        payment: { crystal: 1 },
        reward: { essence: 1, gemstone: 1 },
        modifierId: "arcaneDebt"
      },
      {
        id: "take-the-weight",
        name: "Take The Weight",
        hint: "Gain Heavy Pact for this run.",
        payment: { essence: 1 },
        reward: { brimstone: 1, steel: 1 },
        modifierId: "heavyPact"
      }
    ]
  },
  wardEngine: {
    id: "wardEngine",
    title: "Ward Engine",
    summary: "A dormant warding engine still hums. You can restore a little of its discipline to yourself or crack it for rare shards.",
    accent: 0xaed2f0,
    choices: [
      {
        id: "align-engine",
        name: "Align The Engine",
        hint: "Gain Iron Pulse training for this run.",
        payment: { crystal: 1 },
        reward: { essence: 1 },
        modifierId: "ironPulse"
      },
      {
        id: "crack-core",
        name: "Crack The Core",
        hint: "Collect sacred materials without changing your build.",
        payment: {},
        reward: { crystal: 1, essence: 1, gemstone: 1 }
      }
    ]
  },
  whiteSilence: {
    id: "whiteSilence",
    title: "White Silence",
    summary: "A stretch of untouched snow invites patience. You can move through it with discipline for a spacing lesson or break the drift for supplies.",
    accent: 0xb9e7f8,
    choices: [
      {
        id: "walk-slow",
        name: "Walk The Silence",
        hint: "Gain Measured Approach training for this run.",
        payment: { essence: 1 },
        reward: { crystal: 1 },
        modifierId: "measuredApproach"
      },
      {
        id: "break-drift",
        name: "Break The Drift",
        hint: "Collect cold-route materials instead.",
        payment: {},
        reward: { leather: 1, crystal: 1, steel: 1 }
      }
    ]
  },
  eclipse: {
    id: "eclipse",
    title: "Eclipse",
    summary: "The route falls into a false dusk. Steel sounds louder, footing feels stranger, and the run briefly stops feeling ordinary.",
    accent: 0x8f83c8,
    rare: true,
    choices: [
      {
        id: "shadow-discipline",
        name: "Shadow Discipline",
        hint: "Take a patient lesson and rare salvage.",
        payment: { essence: 1 },
        reward: { crystal: 1, gemstone: 1, essence: 1 },
        modifierId: "measuredApproach"
      },
      {
        id: "chase-the-corona",
        name: "Chase The Corona",
        hint: "Turn the omen into a sharper, riskier tempo boost.",
        payment: { gemstone: 1 },
        reward: { essence: 1, stormglass: 1 },
        modifierId: "glassTempo"
      }
    ]
  },
  meteorShower: {
    id: "meteorShower",
    title: "Meteor Shower",
    summary: "Fragments slam into the route all around you. There is just enough time to either read the fall or grab what lands nearby.",
    accent: 0xf0a76d,
    rare: true,
    choices: [
      {
        id: "chart-the-fall",
        name: "Chart The Fall",
        hint: "Gain deliberate spacing practice and deep-sky salvage.",
        payment: { wood: 1 },
        reward: { stormglass: 1, gemstone: 1, essence: 1 },
        modifierId: "longStep"
      },
      {
        id: "break-open-the-stone",
        name: "Break Open The Stone",
        hint: "Take the rare material while the route is still open.",
        payment: {},
        reward: { stormglass: 1, obsidian: 1, steel: 1 }
      }
    ]
  },
  wanderingBlacksmith: {
    id: "wanderingBlacksmith",
    title: "Wandering Blacksmith",
    summary: "A traveling smith has built a tiny forge right in the road. He offers either a practical rebalancing lesson or a quick trade for hard stock.",
    accent: 0xc99367,
    rare: true,
    choices: [
      {
        id: "take-the-lesson",
        name: "Take The Lesson",
        hint: "Turn the stop into a forge-minded combat drill.",
        payment: { steel: 1 },
        reward: { steel: 2, essence: 1, amber: 1 },
        modifierId: "lessonOfSteel"
      },
      {
        id: "buy-the-billets",
        name: "Buy The Billets",
        hint: "Take a cleaner haul without changing the build.",
        payment: { wood: 1 },
        reward: { steel: 2, gemstone: 1, amber: 1 }
      }
    ]
  },
  brokenPortal: {
    id: "brokenPortal",
    title: "Broken Portal",
    summary: "A portal frame stutters between places. Reach into the right fracture and you come back changed.",
    accent: 0x77a7dc,
    rare: true,
    choices: [
      {
        id: "stabilize-the-frame",
        name: "Stabilize The Frame",
        hint: "Pull disciplined warding from the crack.",
        payment: { crystal: 1 },
        reward: { essence: 2, gemstone: 1 },
        modifierId: "ironPulse"
      },
      {
        id: "loot-the-splinters",
        name: "Loot The Splinters",
        hint: "Take what the portal already spat out.",
        payment: {},
        reward: { crystal: 1, stormglass: 1, essence: 1 }
      }
    ]
  },
  hauntedBattlefield: {
    id: "hauntedBattlefield",
    title: "Haunted Battlefield",
    summary: "Old momentum still hangs over the ground. If you move like the dead once did, the field answers. If not, you can still strip it for salvage.",
    accent: 0xb07076,
    rare: true,
    choices: [
      {
        id: "follow-the-charge",
        name: "Follow The Charge",
        hint: "Take a violent lesson and leave with blood-warm stock.",
        payment: { leather: 1 },
        reward: { steel: 1, blossom: 1, gemstone: 1 },
        modifierId: "bloodRush"
      },
      {
        id: "search-the-dead-line",
        name: "Search The Dead Line",
        hint: "Take the battlefield's salvage instead of its memory.",
        payment: {},
        reward: { steel: 1, blossom: 1, leather: 1 }
      }
    ]
  },
  swordInTheStone: {
    id: "swordInTheStone",
    title: "The Sword In The Stone",
    summary: "A holy blade waits in a split pillar as though it has been expecting your hand all along.",
    accent: 0xf0d799,
    choices: [
      {
        id: "draw-the-sword",
        name: "Draw The Sword",
        hint: "Immediately ascend the current run into Excalibur.",
        payment: {},
        reward: { essence: 1, gemstone: 1 },
        upgradeSwordId: "excalibur"
      },
      {
        id: "leave-the-sanctum",
        name: "Leave It",
        hint: "Take only the shrine's scattered offerings.",
        payment: {},
        reward: { gemstone: 1, steel: 1 }
      }
    ]
  }
};

export function getRunEventDefinition(eventId: string): RunEventDefinition | undefined {
  return RUN_EVENTS[eventId];
}

export function pickRunEventId(
  regionId: RegionId,
  depth: number,
  options: {
    allowRareEvent?: boolean;
    allowSwordInTheStone?: boolean;
  } = {}
): string {
  if (options.allowSwordInTheStone && depth >= 8 && Math.random() < 0.08) {
    return "swordInTheStone";
  }

  if (options.allowRareEvent && depth >= 4 && Math.random() < 0.014) {
    const rareEvents = ["eclipse", "meteorShower", "wanderingBlacksmith", "brokenPortal", "hauntedBattlefield"] as const;
    return rareEvents[(depth + regionId.length) % rareEvents.length] ?? rareEvents[0];
  }

  const surpriseEvents = ["roadAmbush", "merchantSiege", "wanderingKnight", "cursedReliquary"] as const;

  if (depth >= 3 && Math.random() < 0.28) {
    return surpriseEvents[(depth + regionId.length) % surpriseEvents.length] ?? surpriseEvents[0];
  }

  if (COASTAL_REGIONS.has(regionId)) {
    return depth % 2 === 0 ? "reefGamble" : "tideOmen";
  }

  if (VOLCANIC_REGIONS.has(regionId)) {
    return depth % 2 === 0 ? "furnaceBet" : "smolderingIdol";
  }

  if (COLD_REGIONS.has(regionId)) {
    return "whiteSilence";
  }

  if (SACRED_REGIONS.has(regionId)) {
    return "wardEngine";
  }

  return depth % 2 === 0 ? "fieldDrill" : "duelMarker";
}
