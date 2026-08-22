import type { GeneratedWorldChapter } from "../data/worldMap";
import type { MaterialCost, RegionId, WorldNodeDefinition, WorldNodeType } from "../core/types";
import type { GuidedOverlayPage } from "../ui/createGuidedOverlay";

interface TutorialNodeSeed {
  id: string;
  regionId: RegionId;
  type: WorldNodeType;
  lane: number;
  title: string;
  subtitle: string;
  rewardMaterials: MaterialCost;
  enemyId?: string;
  isBoss?: boolean;
}

export const TEST_MODE_PASSWORD = "thepasswordispassword";
//if there is someone reading this, is it really that hard to take five minutes and stab the first elite? yknow what nvm have fun!
export const TUTORIAL_SKIP_WARNING =
  "Are you sure you want to skip the tutorial? It takes about five minutes and explains the main controls, combat flow, and progression systems.";
export const TUTORIAL_FINAL_NODE_ID = "tutorial-volcanic-elite";

export const TUTORIAL_PROMPT_IDS = {
  worldMap: "tutorial-world-map",
  forge: "tutorial-forge",
  techTree: "tutorial-tech-tree",
  combatPlains: "tutorial-combat-plains",
  combatSavannah: "tutorial-combat-savannah",
  combatVolcanicLand: "tutorial-combat-volcanic-land",
  combatLavaFields: "tutorial-combat-lava-fields",
  combatElite: "tutorial-combat-elite",
  completion: "tutorial-complete"
} as const;

export const TUTORIAL_ROUTE_PREVIEW = [
  "Plains",
  "Savannah",
  "Volcanic Lands",
  "Lava Fields",
  "Volcano"
] as const;

const TUTORIAL_WORLD_ROUTE: TutorialNodeSeed[] = [
  {
    id: "tutorial-plains",
    regionId: "plains",
    type: "battle",
    lane: 3,
    title: "Plains",
    subtitle: "Movement basics",
    rewardMaterials: { steel: 1, wood: 1, leather: 1 },
    enemyId: "fieldWolf"
  },
  {
    id: "tutorial-savannah",
    regionId: "savannah",
    type: "battle",
    lane: 2,
    title: "Savannah",
    subtitle: "Dash and bind timing",
    rewardMaterials: { steel: 1, wood: 1, leather: 1 },
    enemyId: "sunSpearHunter"
  },
  {
    id: "tutorial-volcanic-land",
    regionId: "volcanicLand",
    type: "battle",
    lane: 4,
    title: "Volcanic Lands",
    subtitle: "Commitment and combos",
    rewardMaterials: { steel: 1, gemstone: 1, essence: 1 },
    enemyId: "slagTrooper"
  },
  {
    id: "tutorial-lava-fields",
    regionId: "lavaFields",
    type: "battle",
    lane: 3,
    title: "Lava Fields",
    subtitle: "Armor and projectiles",
    rewardMaterials: { steel: 2, gemstone: 1, essence: 1 },
    enemyId: "sulfurCaller"
  },
  {
    id: TUTORIAL_FINAL_NODE_ID,
    regionId: "volcano",
    type: "miniboss",
    lane: 2,
    title: "Volcano",
    subtitle: "Final tutorial fight",
    rewardMaterials: { steel: 2, gemstone: 1, essence: 2 },
    enemyId: "magmaBrute",
    isBoss: true
  }
];

export const TUTORIAL_WORLD_MAP_PAGES: GuidedOverlayPage[] = [
  {
    title: "Tutorial Route",
    body: "This route is fixed. Follow the highlighted node and learn one new idea at each stop.",
    accent: 0x6e9bc8
  },
  {
    title: "Map Basics",
    body: "Click the open node, then enter it. Materials from each stop feed the forge and the tech tree after combat.",
    accent: 0x87b86f
  }
];

export const TUTORIAL_FORGE_PAGES: GuidedOverlayPage[] = [
  {
    title: "Forge Loop",
    body: "After each fight you return here. Offers and Training shape the current run, not just raw stats.",
    accent: 0x7b69a8
  },
  {
    title: "Next Step",
    body: "Open the tech tree before continuing. Enchantments and fittings stay focused on your weapon path.",
    accent: 0xc79353
  }
];

export const TUTORIAL_TECH_TREE_PAGES: GuidedOverlayPage[] = [
  {
    title: "Pick A Branch",
    body: "Unlocking a node changes your current sword into that upgrade. Your branch is your build.",
    accent: 0x8aa0b3
  },
  {
    title: "Commit Carefully",
    body: "Branch splits lock siblings. Check costs, click the node you want, then return to the route.",
    accent: 0x9f855f
  }
];

export const TUTORIAL_COMPLETION_PAGES: GuidedOverlayPage[] = [
  {
    title: "Tutorial Complete",
    body: "You have seen map movement, combat, bind timing, the forge, and the tech tree. Normal runs now open from the main menu.",
    accent: 0xc79353
  }
];

const TUTORIAL_COMBAT_PAGES: Record<string, GuidedOverlayPage[]> = {
  "tutorial-plains": [
    {
      title: "Move First",
      body: "Move with WASD or arrows. Dash with Shift or Space. Hold E to Guard. Attack with J/LMB or K/RMB, but only when you are in measure.",
      accent: 0x7bc18e
    }
  ],
  "tutorial-savannah": [
    {
      title: "Bind And Stamina",
      body: "Press Q on impact to bind, then choose LMB Standard, Q Defensive, or RMB Offensive. Dashes, Guard, and attacks spend stamina, so recover before forcing another exchange.",
      accent: 0x8db56d
    }
  ],
  "tutorial-volcanic-land": [
    {
      title: "Commitment",
      body: "Heavy attacks move farther and recover slower. Use them after a clean read, not from panic.",
      accent: 0xb88a5c
    }
  ],
  "tutorial-lava-fields": [
    {
      title: "Armor And Projectiles",
      body: "Projectiles can be bound. Against armor, cleaner thrusts and committed punishes work better than wild swings.",
      accent: 0x8ba3b6
    }
  ],
  [TUTORIAL_FINAL_NODE_ID]: [
    {
      title: "Use Everything",
      body: "Watch the windup, bind when it is clean, and reset after a miss. Win the duel, collect the drops, and the tutorial is done.",
      accent: 0xc79353
    }
  ]
};

export function createTutorialChapter(startWorldDepth = 0): GeneratedWorldChapter {
  const nodeIds = TUTORIAL_WORLD_ROUTE.map((node) => node.id);
  const nodes: Record<string, WorldNodeDefinition> = {};

  TUTORIAL_WORLD_ROUTE.forEach((seed, index) => {
    nodes[seed.id] = {
      id: seed.id,
      regionId: seed.regionId,
      type: seed.type,
      lane: seed.lane,
      depth: index,
      worldDepth: startWorldDepth + index,
      title: seed.title,
      subtitle: seed.subtitle,
      nextNodeIds: nodeIds[index + 1] ? [nodeIds[index + 1] as string] : [],
      rewardMaterials: seed.rewardMaterials,
      enemyId: seed.enemyId,
      hidden: false,
      optional: false,
      isBoss: seed.isBoss
    };
  });

  return {
    nodeIds,
    nodes,
    startNodeIds: [nodeIds[0] as string],
    nextNodeOrdinal: nodeIds.length,
    nextWorldDepth: startWorldDepth + nodeIds.length
  };
}

export function getTutorialCombatPages(nodeId: string): GuidedOverlayPage[] | null {
  return TUTORIAL_COMBAT_PAGES[nodeId] ?? null;
}
