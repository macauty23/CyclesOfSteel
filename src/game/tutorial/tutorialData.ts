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
    body:
      "This tutorial follows a fixed path: Plains, Savannah, Volcanic Lands, Lava Fields, and Volcano. The route does not branch, so you can focus on learning the systems step by step.",
    accent: 0x6e9bc8
  },
  {
    title: "How To Travel",
    body:
      "The highlighted node is always the next step. Select it with the mouse, then press the on-screen Next Stage button. Each area provides different materials for upgrades.",
    accent: 0x87b86f
  }
];

export const TUTORIAL_FORGE_PAGES: GuidedOverlayPage[] = [
  {
    title: "Upgrade Screen",
    body:
      "After each fight, you return here. Offers are small permanent trinkets for the run. Training is also permanent for the run and changes how combat behaves, not just your raw numbers.",
    accent: 0x7b69a8
  },
  {
    title: "Enchantments And Fittings",
    body:
      "Enchantments cost 2 Essence and stay on the weapon when you upgrade into a new sword. Modification lets you rework the blade, guard, pommel, hilt, and tip.",
    accent: 0x8c9db4
  },
  {
    title: "Next Step",
    body:
      "Open the full tech tree before continuing. This is where you choose a branch, spend materials, and change your weapon into a new upgrade.",
    accent: 0xc79353
  }
];

export const TUTORIAL_TECH_TREE_PAGES: GuidedOverlayPage[] = [
  {
    title: "Weapon Branches",
    body:
      "You start with the Arming Sword. Unlocking a node changes your current weapon into that upgrade, so each choice affects the way your weapon behaves.",
    accent: 0x8aa0b3
  },
  {
    title: "Branch Locks",
    body:
      "Once you choose one child on a branch, the sibling options on that split are locked. Look around first, then click when you are sure.",
    accent: 0xc79353
  },
  {
    title: "Costs And Materials",
    body:
      "Early upgrades mostly use steel and wood. Later upgrades also require rarer materials. When you can afford a node, click it to unlock that upgrade.",
    accent: 0x7bc18e
  },
  {
    title: "Click To Choose",
    body:
      "Selections are click-based. Hovering only highlights what you are looking at, while clicking commits the node or fitting you want.",
    accent: 0x9f855f
  }
];

export const TUTORIAL_COMPLETION_PAGES: GuidedOverlayPage[] = [
  {
    title: "Tutorial Complete",
    body:
      "You have completed the tutorial path and seen the main combat and progression systems. You can now return to the main menu and start a normal run.",
    accent: 0xc79353
  }
];

const TUTORIAL_COMBAT_PAGES: Record<string, GuidedOverlayPage[]> = {
  "tutorial-plains": [
    {
      title: "Movement And Guard",
      body:
        "Move with WASD or the arrow keys. Dash with Shift or Space. Stay at a controlled distance and avoid rushing straight forward without a reason.",
      accent: 0x6f95c1
    },
    {
      title: "Attacks And Measure",
      body:
        "J or left mouse is the quicker attack. K or right mouse is the more committed attack. Use the spacing cue to attack from an effective distance.",
      accent: 0xc79353
    },
    {
      title: "Stamina And Tempo",
      body:
        "Every dash and attack costs stamina. If you empty the bar, you become easy to punish. Let it recover between exchanges and think in tempos, not button spam.",
      accent: 0x7bc18e
    }
  ],
  "tutorial-savannah": [
    {
      title: "Dash And Bind",
      body:
        "Press Q during incoming impact to bind. A successful bind avoids the damage, reflects part of it, and briefly stuns the attacker. Ranged attacks are easier to bind.",
      accent: 0xc79353
    },
    {
      title: "Positional Risk",
      body:
        "Dashes are strong, but they also change your position. Use them to create space, close distance, or escape recovery instead of using them constantly.",
      accent: 0x8db56d
    }
  ],
  "tutorial-volcanic-land": [
    {
      title: "Commit Weight",
      body:
        "Larger attacks carry more commitment. They move farther and recover more slowly, so use them when you have space and timing on your side.",
      accent: 0xd18463
    },
    {
      title: "Combo Rules",
      body:
        "The combo system changes combat behavior instead of only increasing damage. Flow, Press, and Dominion affect spacing and control, so timing matters more than repeated input.",
      accent: 0xb88a5c
    }
  ],
  "tutorial-lava-fields": [
    {
      title: "Attack Classes",
      body:
        "Some attacks work like lunges and control a straight line. Others work like cleaves and cover a wider arc. Use the attack class that fits the situation.",
      accent: 0xde8c64
    },
    {
      title: "Armor And Knockback",
      body:
        "Armor affects which attacks are effective. Thrusting is safer against protected targets, and knockback can move a target, interrupt actions, or reduce control.",
      accent: 0x8ba3b6
    }
  ],
  [TUTORIAL_FINAL_NODE_ID]: [
    {
      title: "Final Tutorial Fight",
      body:
        "This final fight expects better spacing, stamina management, and bind timing. Watch the windup, attack at the correct distance, and do not overcommit after a miss.",
      accent: 0xe09a5f
    },
    {
      title: "Complete The Tutorial",
      body:
        "Defeat this enemy and collect the materials to complete the tutorial. After that, you can start a normal run without the tutorial prompt in this session.",
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
