import type {
  AttackProfile,
  CombatStats,
  WeaponTechBonuses,
  WeaponTechDefinition,
  WeaponTechNodeId
} from "../core/types";

function scaleAttackTiming(attack: AttackProfile, windupScale?: number, recoveryScale?: number): void {
  if (windupScale !== undefined) {
    attack.windup = Math.max(40, Math.round(attack.windup * windupScale));
  }

  if (recoveryScale !== undefined) {
    attack.recovery = Math.max(56, Math.round(attack.recovery * recoveryScale));
  }
}

function applyBonusesToAttack(
  attack: AttackProfile,
  bonuses: WeaponTechBonuses,
  prefix: "light" | "heavy" | "thrust" | "sweep"
): void {
  switch (prefix) {
    case "light":
      attack.damage += bonuses.lightDamage ?? 0;
      attack.range += bonuses.lightRange ?? 0;
      attack.width += bonuses.lightWidth ?? 0;
      attack.active += bonuses.lightActive ?? 0;
      attack.lunge += bonuses.lightLunge ?? 0;
      attack.impact.displacement += bonuses.lightKnockback ?? 0;
      attack.impact.controlLossMs += Math.round((bonuses.lightKnockback ?? 0) * 0.25);
      scaleAttackTiming(attack, bonuses.lightWindupScale, bonuses.lightRecoveryScale);
      return;
    case "heavy":
      attack.damage += bonuses.heavyDamage ?? 0;
      attack.range += bonuses.heavyRange ?? 0;
      attack.width += bonuses.heavyWidth ?? 0;
      attack.active += bonuses.heavyActive ?? 0;
      attack.lunge += bonuses.heavyLunge ?? 0;
      attack.impact.displacement += bonuses.heavyKnockback ?? 0;
      attack.impact.controlLossMs += Math.round((bonuses.heavyKnockback ?? 0) * 0.3);
      scaleAttackTiming(attack, bonuses.heavyWindupScale, bonuses.heavyRecoveryScale);
      return;
    case "thrust":
      if (attack.shape !== "thrust") {
        return;
      }

      attack.damage += bonuses.thrustDamage ?? 0;
      attack.range += bonuses.thrustRange ?? 0;
      attack.width += bonuses.thrustWidth ?? 0;
      attack.active += bonuses.thrustActive ?? 0;
      attack.lunge += bonuses.thrustLunge ?? 0;
      attack.impact.displacement += bonuses.thrustKnockback ?? 0;
      attack.impact.controlLossMs += Math.round((bonuses.thrustKnockback ?? 0) * 0.18);
      scaleAttackTiming(attack, bonuses.thrustWindupScale, bonuses.thrustRecoveryScale);
      return;
    case "sweep":
      if (attack.shape !== "sweep") {
        return;
      }

      attack.damage += bonuses.sweepDamage ?? 0;
      attack.range += bonuses.sweepRange ?? 0;
      attack.width += bonuses.sweepWidth ?? 0;
      attack.active += bonuses.sweepActive ?? 0;
      attack.lunge += bonuses.sweepLunge ?? 0;
      attack.impact.displacement += bonuses.sweepKnockback ?? 0;
      attack.impact.controlLossMs += Math.round((bonuses.sweepKnockback ?? 0) * 0.22);
      scaleAttackTiming(attack, bonuses.sweepWindupScale, bonuses.sweepRecoveryScale);
  }
}

export const WEAPON_TECH_TREE: Record<WeaponTechNodeId, WeaponTechDefinition> = {
  armingSword: {
    id: "armingSword",
    branch: "root",
    swordId: "armingSword",
    name: "Arming Sword",
    shortName: "Arming Sword",
    summary: "The baseline of the tree: versatile edge alignment, stable guards, and dependable recovery.",
    detail: "A free foundation node that slightly steadies offense, defense, and early survival.",
    accent: 0xd9b67a,
    cost: {},
    prerequisiteIds: [],
    position: { x: 540, y: 480 },
    bonuses: {
      maxHp: 6,
      attackControlWindup: 0.04,
      attackControlActive: 0.04,
      parryWindow: 8,
      comboWindow: 120
    }
  },
  warArmingSword: {
    id: "warArmingSword",
    branch: "war",
    swordId: "warArmingSword",
    name: "War Arming Sword",
    shortName: "War Arm.",
    summary: "Aggressive battlefield tempering for stronger committed hits and better forward pressure.",
    detail: "Adds reliable damage and knockback without giving up too much handling.",
    accent: 0xb9785a,
    cost: { steel: 2, wood: 1 },
    prerequisiteIds: ["armingSword"],
    position: { x: 360, y: 300 },
    bonuses: {
      lightDamage: 2,
      heavyDamage: 4,
      moveAcceleration: 80,
      heavyKnockback: 35
    }
  },
  longsword: {
    id: "longsword",
    branch: "war",
    swordId: "longsword",
    name: "Longsword",
    shortName: "Longsword",
    summary: "Improves leverage and reach while keeping pressure chained through the bind.",
    detail: "Extends attacks and makes transitions between strikes feel more authoritative.",
    accent: 0xc3956e,
    cost: { steel: 3, wood: 1, leather: 1 },
    prerequisiteIds: ["warArmingSword"],
    position: { x: 180, y: 120 },
    bonuses: {
      lightRange: 8,
      heavyRange: 10,
      attackControlWindup: 0.04,
      comboWindow: 100
    }
  },
  greatsword: {
    id: "greatsword",
    branch: "war",
    swordId: "greatsword",
    name: "Greatsword",
    shortName: "Greatsword",
    summary: "Powerful scalable cuts that dominate space with body behind the strike.",
    detail: "Heavy attacks grow broader and more punishing, with a sturdier body to support them.",
    accent: 0xd1a07d,
    cost: { steel: 7, wood: 2, leather: 1, gemstone: 1 },
    prerequisiteIds: ["longsword"],
    position: { x: 0, y: 300 },
    bonuses: {
      maxHp: 8,
      heavyDamage: 8,
      sweepWidth: 18,
      sweepKnockback: 60,
      heavyRecoveryScale: 0.94
    }
  },
  zweihander: {
    id: "zweihander",
    branch: "war",
    swordId: "zweihander",
    name: "Zweihander",
    shortName: "Zweihand.",
    summary: "A sweeping war split that pushes the longsword line into huge arcs and anti-polearm pressure.",
    detail: "Expands sweep authority, deepens heavy hits, and leans harder into battlefield control.",
    accent: 0xe1b084,
    cost: { steel: 10, wood: 2, leather: 1, gemstone: 1, brimstone: 1, essence: 1 },
    prerequisiteIds: ["longsword"],
    position: { x: 0, y: -60 },
    bonuses: {
      maxHp: 6,
      heavyDamage: 6,
      sweepWidth: 18,
      sweepKnockback: 44
    }
  },
  flamberge: {
    id: "flamberge",
    branch: "war",
    swordId: "flamberge",
    name: "Zweihander (Flamberge)",
    shortName: "Flamberg.",
    summary: "A rippling greatblade evolution that keeps the zweihander's breadth while adding more rattling impact.",
    detail: "Further widens the war sweep line and sharpens late-fight control once the enemy is already breaking.",
    accent: 0xf0c38f,
    cost: { steel: 12, wood: 2, gemstone: 2, brimstone: 2, essence: 2 },
    prerequisiteIds: ["zweihander"],
    position: { x: -180, y: -240 },
    bonuses: {
      lightDamage: 4,
      heavyDamage: 5,
      sweepWidth: 10,
      sweepActive: 14,
      comboWindow: 100
    }
  },
  landsknechtZweihander: {
    id: "landsknechtZweihander",
    branch: "war",
    swordId: "landsknechtZweihander",
    name: "Landsknecht Zweihander",
    shortName: "Landsknt.",
    summary: "A mercenary zweihander split that leans harder into polearm breaking, line-driving pressure, and charge-led force.",
    detail: "Keeps the zweihander's reach but adds more forward pressure and a nastier answer to long weapons.",
    accent: 0xe7bc90,
    cost: { steel: 12, wood: 3, leather: 2, gemstone: 2, brimstone: 1, stormglass: 1, essence: 1 },
    prerequisiteIds: ["zweihander"],
    position: { x: 180, y: -240 },
    bonuses: {
      moveSpeed: 6,
      heavyDamage: 4,
      sweepWidth: 8,
      heavyKnockback: 40
    }
  },
  montante: {
    id: "montante",
    branch: "war",
    swordId: "montante",
    name: "Montante",
    shortName: "Montante",
    summary: "A war-side montante branch that values command of space, compassing cuts, and whole-lane pressure.",
    detail: "Adds broader sweep control and more forceful heavy hits without asking for rapier-like precision.",
    accent: 0xd89162,
    cost: { steel: 8, wood: 2, leather: 2, gemstone: 1, brimstone: 1 },
    prerequisiteIds: ["longsword"],
    position: { x: 360, y: -60 },
    bonuses: {
      maxHp: 4,
      moveSpeed: 4,
      sweepWidth: 12,
      heavyKnockback: 34
    }
  },
  spanishMontante: {
    id: "spanishMontante",
    branch: "war",
    swordId: "spanishMontante",
    name: "Spanish Montante",
    shortName: "Sp. Mont.",
    summary: "Refines the montante line into disciplined circles, safer guards, and more exact control of the lane.",
    detail: "Widens parry forgiveness and keeps the huge cuts recoverable enough to maintain command.",
    accent: 0xe1a874,
    cost: { steel: 10, wood: 2, leather: 2, gemstone: 1, brimstone: 1, amber: 1 },
    prerequisiteIds: ["montante"],
    position: { x: 540, y: 120 },
    bonuses: {
      parryWindow: 18,
      sweepWidth: 10,
      sweepActive: 10,
      heavyRecoveryScale: 0.92
    }
  },
  twoHandedMontante: {
    id: "twoHandedMontante",
    branch: "war",
    swordId: "twoHandedMontante",
    name: "Two-Handed Montante",
    shortName: "2H Mont.",
    summary: "Turns the montante path into heavier wheel-cuts with more knockback, more mass, and more commitment.",
    detail: "The branch's clearest statement of raw two-handed authority: bigger arcs and much stronger push.",
    accent: 0xebbb89,
    cost: { steel: 12, wood: 3, leather: 2, gemstone: 2, brimstone: 2, essence: 1 },
    prerequisiteIds: ["spanishMontante"],
    position: { x: 720, y: -60 },
    bonuses: {
      maxHp: 4,
      heavyDamage: 6,
      sweepWidth: 14,
      heavyKnockback: 52
    }
  },
  mastersMontante: {
    id: "mastersMontante",
    branch: "war",
    swordId: "mastersMontante",
    name: "Master's Montante",
    shortName: "Master Mont.",
    summary: "A master montante that turns space control and winning binds into near-total command of the duel floor.",
    detail: "Sharpens parry timing, strengthens heavy finishers, and gives the branch a cleaner payoff after a won bind.",
    accent: 0xf4cb9f,
    cost: { steel: 13, wood: 3, leather: 3, gemstone: 3, brimstone: 2, crystal: 1, essence: 2 },
    prerequisiteIds: ["twoHandedMontante"],
    position: { x: 900, y: -240 },
    bonuses: {
      heavyDamage: 5,
      parryWindow: 16,
      parryStunMs: 50,
      comboWindow: 80
    }
  },
  cavalryArmingSword: {
    id: "cavalryArmingSword",
    branch: "war",
    swordId: "cavalryArmingSword",
    name: "Cavalry Arming Sword",
    shortName: "Cav. Arm.",
    summary: "A mounted-minded split built around passing cuts, carrying speed through the hit, and forward pressure.",
    detail: "Adds mobility, ride-by style reach, and a better reward for committing through the enemy's line.",
    accent: 0xd09372,
    cost: { steel: 6, wood: 1, leather: 1, stormglass: 1 },
    prerequisiteIds: ["longsword"],
    position: { x: 540, y: -240 },
    bonuses: {
      moveSpeed: 10,
      dashSpeed: 18,
      lightRecoveryScale: 0.92,
      heavyLunge: 18
    }
  },
  oakeshottTypeXVIIIc: {
    id: "oakeshottTypeXVIIIc",
    branch: "war",
    swordId: "oakeshottTypeXVIIIc",
    name: "Oakeshott Type XVIIIc",
    shortName: "Type XVIIIc",
    summary: "A cut-and-thrust cavalry evolution that keeps the passing cut but adds a more serious point on the follow-up.",
    detail: "Improves transition into thrusts and smooths the mix between edge and point.",
    accent: 0xdca782,
    cost: { steel: 8, leather: 2, gemstone: 1, stormglass: 1 },
    prerequisiteIds: ["cavalryArmingSword"],
    position: { x: 720, y: -420 },
    bonuses: {
      lightDamage: 3,
      thrustRange: 12,
      attackControlWindup: 0.03,
      comboWindow: 100
    }
  },
  renaissanceCavalrySword: {
    id: "renaissanceCavalrySword",
    branch: "war",
    swordId: "renaissanceCavalrySword",
    name: "Renaissance Cavalry Sword",
    shortName: "Ren. Cav.",
    summary: "A more guarded cavalry line that recovers into safer binds and keeps mobile counterplay alive.",
    detail: "Parries get easier, dashes recycle faster, and the cut-and-thrust rhythm stays lively.",
    accent: 0xe7b890,
    cost: { steel: 10, leather: 2, gemstone: 2, stormglass: 2, essence: 1 },
    prerequisiteIds: ["oakeshottTypeXVIIIc"],
    position: { x: 900, y: -600 },
    bonuses: {
      parryWindow: 14,
      dashCooldown: -20,
      lightRecoveryScale: 0.9,
      heavyDamage: 3
    }
  },
  heavyCavalrySword: {
    id: "heavyCavalrySword",
    branch: "war",
    swordId: "heavyCavalrySword",
    name: "Heavy Cavalry Sword",
    shortName: "Heavy Cav.",
    summary: "The heavier cavalry blade, less graceful, more crushing, and built to ride momentum straight through lighter targets.",
    detail: "A finishing spike for the cavalry route that trades finesse for impact and line-breaking force.",
    accent: 0xf0c29c,
    cost: { steel: 12, wood: 2, leather: 3, gemstone: 1, stormglass: 2, amber: 1, essence: 1 },
    prerequisiteIds: ["renaissanceCavalrySword"],
    position: { x: 1080, y: -420 },
    bonuses: {
      heavyDamage: 7,
      heavyKnockback: 48,
      sweepDamage: 4
    }
  },
  claymore: {
    id: "claymore",
    branch: "war",
    swordId: "claymore",
    name: "Claymore",
    shortName: "Claymore",
    summary: "A greatsword continuation that turns force into forward pressure and cleaner heavy recovery.",
    detail: "Adds a little tempo back into the war line so committed movement and heavy follow-through feel more deliberate.",
    accent: 0xd7ab86,
    cost: { steel: 9, wood: 2, leather: 2, gemstone: 1, stormglass: 1 },
    prerequisiteIds: ["greatsword"],
    position: { x: -180, y: 480 },
    bonuses: {
      moveSpeed: 6,
      heavyDamage: 5,
      heavyLunge: 12,
      heavyRecoveryScale: 0.9
    }
  },
  highlandClaymore: {
    id: "highlandClaymore",
    branch: "war",
    swordId: "highlandClaymore",
    name: "Highland Claymore",
    shortName: "Highland",
    summary: "A brutal claymore that keeps the heavy line moving and cleanly culls weakened foes.",
    detail: "Sharpens finishing power, keeps big hits from losing momentum, and rewards relentless forward play.",
    accent: 0xe7bf97,
    cost: { steel: 11, wood: 3, leather: 2, gemstone: 3, stormglass: 2, essence: 2 },
    prerequisiteIds: ["claymore"],
    position: { x: -360, y: 660 },
    bonuses: {
      moveAcceleration: 70,
      heavyDamage: 7,
      heavyKnockback: 50,
      dashCooldown: -18
    }
  },
  lowlandTwoHandedClaymore: {
    id: "lowlandTwoHandedClaymore",
    branch: "war",
    swordId: "lowlandTwoHandedClaymore",
    name: "Lowland Two-Handed Claymore",
    shortName: "Lowland 2H",
    summary: "A steadier claymore split that trades Highland savagery for braced binds, longer entries, and cleaner recovery.",
    detail: "The more deliberate claymore route: better parry timing and stronger point-led payoffs after a won bind.",
    accent: 0xe2bb95,
    cost: { steel: 11, wood: 3, leather: 2, gemstone: 2, stormglass: 1, amber: 1, essence: 1 },
    prerequisiteIds: ["claymore"],
    position: { x: 0, y: 660 },
    bonuses: {
      parryWindow: 12,
      heavyDamage: 4,
      thrustRange: 14,
      heavyRecoveryScale: 0.9
    }
  },
  thrustArmingSword: {
    id: "thrustArmingSword",
    branch: "thrust",
    swordId: "thrustArmingSword",
    name: "Thrust Arming Sword",
    shortName: "Thrust Arm.",
    summary: "Shifts the sword toward point control, straighter lines, and more forgiving parries.",
    detail: "The first thrust node widens the parry window and cleans up thrust recovery.",
    accent: 0xa8c4e5,
    cost: { steel: 2, wood: 1 },
    prerequisiteIds: ["armingSword"],
    position: { x: 720, y: 300 },
    bonuses: {
      parryWindow: 24,
      parryCooldown: -50,
      thrustRange: 10,
      thrustRecoveryScale: 0.96
    }
  },
  borderDuelSword: {
    id: "borderDuelSword",
    branch: "thrust",
    swordId: "borderDuelSword",
    name: "Border Duel Sword",
    shortName: "Border Duel",
    summary: "A lively civilian dueling style with cleaner entries, better feints, and sharper counterplay.",
    detail: "Helps movement-led duels and adds a little extra parry reflect.",
    accent: 0x8fb3dd,
    cost: { steel: 2, leather: 1, gemstone: 1 },
    prerequisiteIds: ["thrustArmingSword"],
    position: { x: 900, y: 120 },
    bonuses: {
      moveSpeed: 10,
      attackControlWindup: 0.03,
      lightWindupScale: 0.94,
      parryReflectRatio: 0.05
    }
  },
  sidesword: {
    id: "sidesword",
    branch: "thrust",
    swordId: "sidesword",
    name: "Sidesword",
    shortName: "Sidesword",
    summary: "Balances precise point work with enough cutting authority to flow between lines.",
    detail: "A hybrid node that strengthens thrust reach while smoothing mixed attacks.",
    accent: 0x7fa7d8,
    cost: { steel: 3, leather: 1, gemstone: 1, blossom: 1, bamboo: 1 },
    prerequisiteIds: ["borderDuelSword"],
    position: { x: 1080, y: -60 },
    bonuses: {
      thrustRange: 14,
      sweepWidth: 8,
      lightDamage: 3,
      comboWindow: 120
    }
  },
  rapierLine: {
    id: "rapierLine",
    branch: "thrust",
    swordId: "rapier",
    name: "Rapier",
    shortName: "Rapier",
    summary: "Refines the thrust branch into long, exact attacks that punish spacing and hesitation.",
    detail: "Pushes thrust speed and reach upward without giving up control.",
    accent: 0xcfd8ff,
    cost: { steel: 4, gemstone: 2, crystal: 1, essence: 1 },
    prerequisiteIds: ["sidesword"],
    position: { x: 1260, y: 120 },
    bonuses: {
      moveSpeed: 12,
      thrustDamage: 5,
      thrustRange: 16,
      thrustWindupScale: 0.92
    }
  },
  courtRapier: {
    id: "courtRapier",
    branch: "thrust",
    swordId: "courtRapier",
    name: "Court Rapier",
    shortName: "Court Rap.",
    summary: "Emphasizes poise, point presence, and polished defensive timing in close exchanges.",
    detail: "Parries become easier and faster to recycle, while thrusting entries travel farther.",
    accent: 0xdbe3ff,
    cost: { steel: 5, leather: 1, gemstone: 2, blossom: 2, essence: 1 },
    prerequisiteIds: ["rapierLine"],
    position: { x: 1440, y: 300 },
    bonuses: {
      parryWindow: 18,
      parryCooldown: -70,
      dashCooldown: -30,
      thrustLunge: 22
    }
  },
  mastersRapier: {
    id: "mastersRapier",
    branch: "thrust",
    swordId: "mastersRapier",
    name: "Master's Rapier",
    shortName: "Master Rap.",
    summary: " Obscene timing and blade presence for the most exacting parries in the tree.",
    detail: "Turns a good parry into a very safe, punishing counter with higher reflect and longer stun.",
    accent: 0xf2f5ff,
    cost: { steel: 6, gemstone: 3, crystal: 1, blossom: 2, essence: 2 },
    prerequisiteIds: ["courtRapier"],
    position: { x: 1620, y: 120 },
    bonuses: {
      lightDamage: 4,
      heavyDamage: 4,
      parryReflectRatio: 0.15,
      parryStunMs: 120,
      parryRecovery: -40,
      thrustRecoveryScale: 0.9
    }
  },
  needleblade: {
    id: "needleblade",
    branch: "thrust",
    swordId: "needleblade",
    name: "Needleblade",
    shortName: "Needleblade",
    summary: "A razor-fine rapier split that turns exact spacing and repeated clean hits into extreme single-target pressure.",
    detail: "Pushes speed and thrust rhythm further, letting you move with the swift accuracy of a certain hallowed insect.",
    accent: 0xf6f8ff,
    cost: { steel: 8, gemstone: 4, crystal: 2, blossom: 2, essence: 3 },
    prerequisiteIds: ["mastersRapier"],
    position: { x: 1800, y: -60 },
    bonuses: {
      moveSpeed: 8,
      thrustDamage: 4,
      thrustRange: 10,
      thrustWindupScale: 0.9,
      thrustRecoveryScale: 0.9
    }
  },
  pappenheimerRapier: {
    id: "pappenheimerRapier",
    branch: "thrust",
    swordId: "pappenheimerRapier",
    name: "Pappenheimer Rapier",
    shortName: "Pappenheim.",
    summary: "A more guarded rapier split that cashes binds into sturdier defense and more dangerous counters.",
    detail: "Makes parry-led play more forgiving while still keeping enough thrust force to punish hesitation.",
    accent: 0xdfe7ff,
    cost: { steel: 8, leather: 2, gemstone: 3, crystal: 1, blossom: 2, essence: 3 },
    prerequisiteIds: ["mastersRapier"],
    position: { x: 1800, y: 300 },
    bonuses: {
      parryWindow: 16,
      parryRecovery: -30,
      parryCooldown: -40,
      heavyDamage: 4
    }
  },
  estoc: {
    id: "estoc",
    branch: "thrust",
    swordId: "estoc",
    name: "Estoc",
    shortName: "Estoc",
    summary: "Specializes in rigid, armor-seeking thrusts with more authority behind the point.",
    detail: "Heavy thrusts gain excellent line depth and better finishing power.",
    accent: 0x9bb7c9,
    cost: { steel: 3, wood: 1, gemstone: 1 },
    prerequisiteIds: ["thrustArmingSword"],
    position: { x: 900, y: 480 },
    bonuses: {
      heavyDamage: 6,
      heavyRange: 14,
      thrustDamage: 4,
      thrustKnockback: 40
    }
  },
  reinforcedEstoc: {
    id: "reinforcedEstoc",
    branch: "thrust",
    swordId: "reinforcedEstoc",
    name: "Reinforced Estoc",
    shortName: "Reinf. Estoc",
    summary: "A rigid estoc continuation that doubles down on armor-breaking drive and harsher committed thrust pressure.",
    detail: "Adds a little durability and deeper heavy thrust authority before the line commits into a full two-handed build.",
    accent: 0xd6e1e8,
    cost: { steel: 7, wood: 1, leather: 1, gemstone: 1, crystal: 2, essence: 1 },
    prerequisiteIds: ["estoc"],
    position: { x: 1080, y: 300 },
    bonuses: {
      maxHp: 2,
      heavyDamage: 4,
      thrustDamage: 3,
      thrustRange: 10,
      heavyKnockback: 20
    }
  },
  twoHandedEstoc: {
    id: "twoHandedEstoc",
    branch: "thrust",
    swordId: "twoHandedEstoc",
    name: "Two-Handed Estoc",
    shortName: "2H Estoc",
    summary: "A more committed two-handed thrusting specialization with severe linear finishing power.",
    detail: "Deepens heavy thrust damage, drive, and leverage once the reinforced line turns fully two-handed.",
    accent: 0xb9ccd8,
    cost: { steel: 8, wood: 2, gemstone: 1, crystal: 2, essence: 1 },
    prerequisiteIds: ["reinforcedEstoc"],
    position: { x: 1260, y: 480 },
    bonuses: {
      maxHp: 4,
      heavyDamage: 6,
      thrustRange: 16,
      thrustLunge: 28,
      heavyKnockback: 48
    }
  },
  panzerstecher: {
    id: "panzerstecher",
    branch: "thrust",
    swordId: "panzerstecher",
    name: "Panzerstecher",
    shortName: "Panzerst.",
    summary: "A severe anti-armor estoc continuation with more line depth and harsher finishing thrusts.",
    detail: "Deepens the estoc branch into a more committed armor-killing point with precise heavy pressure.",
    accent: 0xc7d6df,
    cost: { steel: 10, wood: 2, gemstone: 2, crystal: 3, obsidian: 1, essence: 2 },
    prerequisiteIds: ["twoHandedEstoc"],
    position: { x: 1440, y: 660 },
    bonuses: {
      heavyDamage: 6,
      thrustDamage: 6,
      thrustRange: 12,
      heavyKnockback: 30
    }
  },
  broadArmingSword: {
    id: "broadArmingSword",
    branch: "broad",
    swordId: "broadArmingSword",
    name: "Broad Arming Sword",
    shortName: "Broad Arm.",
    summary: "Leans into wider edge presence, better line-clearing cuts, and reliable cleaving tempo.",
    detail: "The branch opener immediately makes sweeping attacks broader and easier to land.",
    accent: 0xdb9a62,
    cost: { steel: 2, wood: 1 },
    prerequisiteIds: ["armingSword"],
    position: { x: 720, y: 660 },
    bonuses: {
      lightDamage: 2,
      sweepWidth: 12,
      sweepActive: 10
    }
  },
  falchion: {
    id: "falchion",
    branch: "broad",
    swordId: "falchion",
    name: "Falchion",
    shortName: "Falchion",
    summary: "A forward-heavy cutting line that favors decisive chops and fast follow-through.",
    detail: "Light cuts hit harder, recover faster, and carry a little more body weight.",
    accent: 0xc77e49,
    cost: { steel: 2, wood: 1, leather: 1 },
    prerequisiteIds: ["broadArmingSword"],
    position: { x: 900, y: 840 },
    bonuses: {
      moveSpeed: 8,
      lightDamage: 5,
      sweepWidth: 10,
      lightRecoveryScale: 0.92
    }
  },
  dusack: {
    id: "dusack",
    branch: "broad",
    swordId: "dusack",
    name: "Dusack",
    shortName: "Dusack",
    summary: "A faster falchion split tuned for drills, flow, and broad cuts that recover into the next line quickly.",
    detail: "Improves broad-branch tempo and chain feel rather than simply adding more raw chopping force.",
    accent: 0xd18957,
    cost: { steel: 4, leather: 3, gemstone: 1, bamboo: 1 },
    prerequisiteIds: ["falchion"],
    position: { x: 1080, y: 1020 },
    bonuses: {
      moveSpeed: 8,
      lightWindupScale: 0.9,
      lightRecoveryScale: 0.86,
      comboWindow: 160
    }
  },
  heavyFalchion: {
    id: "heavyFalchion",
    branch: "broad",
    swordId: "heavyFalchion",
    name: "Heavy Falchion",
    shortName: "Heavy Fal.",
    summary: "Commits harder into cleaving blows and makes heavy cuts shove opponents out of the line.",
    detail: "A straight damage and knockback spike for sweeping offense.",
    accent: 0xb86842,
    cost: { steel: 5, wood: 2, leather: 2, obsidian: 1 },
    prerequisiteIds: ["falchion"],
    position: { x: 1080, y: 660 },
    bonuses: {
      heavyDamage: 7,
      heavyKnockback: 70,
      sweepDamage: 4
    }
  },
  greatFalchion: {
    id: "greatFalchion",
    branch: "broad",
    swordId: "greatFalchion",
    name: "Great Falchion",
    shortName: "Great Fal.",
    summary: "A sweeping Falchion, built around lane ownership, cleaving momentum, and longer cut presence.",
    detail: "Turns sweeps into the broadest, stickiest attacks in the forge tree.",
    accent: 0xe0aa73,
    cost: { steel: 7, wood: 2, leather: 3, gemstone: 1, obsidian: 1 },
    prerequisiteIds: ["heavyFalchion"],
    position: { x: 1260, y: 840 },
    bonuses: {
      heavyDamage: 6,
      sweepWidth: 22,
      sweepActive: 18,
      comboWindow: 140
    }
  },
  hangerSword: {
    id: "hangerSword",
    branch: "broad",
    swordId: "hangerSword",
    name: "Hanger Sword",
    shortName: "Hanger",
    summary: "A hanger-style extension of the broad line that keeps edge authority but draws and cuts faster.",
    detail: "Trades some sheer mass for cleaner startup and better punishment into lighter targets.",
    accent: 0xe0a36e,
    cost: { steel: 8, wood: 2, leather: 3, gemstone: 1, obsidian: 1, amber: 1 },
    prerequisiteIds: ["greatFalchion"],
    position: { x: 1440, y: 1020 },
    bonuses: {
      moveSpeed: 10,
      lightWindupScale: 0.88,
      heavyWindupScale: 0.92,
      sweepDamage: 4
    }
  },
  navalCutlass: {
    id: "navalCutlass",
    branch: "broad",
    swordId: "navalCutlass",
    name: "Naval Cutlass",
    shortName: "Cutlass",
    summary: "A close-fighting hanger continuation built for boarding rushes, quick recoveries, and ugly deck-pressure.",
    detail: "The broad branch's most mobile finisher, with cleaner rushes and more reward for short-range offense.",
    accent: 0xf0b383,
    cost: { steel: 10, wood: 2, leather: 3, coral: 2, stormglass: 1, gemstone: 1 },
    prerequisiteIds: ["hangerSword"],
    position: { x: 1620, y: 840 },
    bonuses: {
      moveSpeed: 12,
      dashCooldown: -24,
      lightWindupScale: 0.88,
      sweepDamage: 4
    }
  },
  hauswehr: {
    id: "hauswehr",
    branch: "messer",
    swordId: "hauswehr",
    name: "Hauswehr",
    shortName: "Hauswehr",
    summary: "The rough domestic blade that starts the rogue line with quick cuts and compact pressure.",
    detail: "A small messer precursor with cleaner footwork and cheaper entries into the brutal branch.",
    accent: 0x9a7a63,
    cost: { steel: 2, wood: 1 },
    prerequisiteIds: ["armingSword"],
    position: { x: 360, y: 660 },
    bonuses: {
      moveSpeed: 10,
      dashSpeed: 12,
      lightDamage: 3,
      comboWindow: 120
    }
  },
  messer: {
    id: "messer",
    branch: "messer",
    swordId: "messer",
    name: "Messer",
    shortName: "Messer",
    summary: "A rougher, quicker branch built around opportunistic entries and dirty close-range brutality.",
    detail: "Boosts mobility and combo time so the run feels more predatory than formal.",
    accent: 0x8f7057,
    cost: { steel: 2, wood: 1, leather: 1 },
    prerequisiteIds: ["hauswehr"],
    position: { x: 180, y: 840 },
    bonuses: {
      moveSpeed: 14,
      dashSpeed: 18,
      lightDamage: 4,
      comboWindow: 160
    }
  },
  kriegsmesser: {
    id: "kriegsmesser",
    branch: "messer",
    swordId: "kriegsmesser",
    name: "Kriegsmesser",
    shortName: "Kriegsm.",
    summary: "A brutal messer with long-knife aggression, heavy finishing cuts, and relentless chase.",
    detail: "Hits hard, accelerates fast, and keeps the pressure on through short breaks in tempo.",
    accent: 0xa78468,
    cost: { steel: 5, wood: 1, leather: 3, gemstone: 1, obsidian: 1 },
    prerequisiteIds: ["messer"],
    position: { x: 0, y: 1020 },
    bonuses: {
      moveAcceleration: 90,
      dashCooldown: -24,
      heavyDamage: 9,
      heavyKnockback: 80,
      sweepDamage: 4
    }
  },
  grossesMesser: {
    id: "grossesMesser",
    branch: "messer",
    swordId: "grossesMesser",
    name: "Grosses Messer",
    shortName: "Grosses",
    summary: "A larger rogue continuation that broadens the kriegsmesser line into heavier arcs and better hit-flow.",
    detail: "Adds more lane coverage and enough staying power to keep consecutive hits feeling oppressive.",
    accent: 0xb18d71,
    cost: { steel: 8, wood: 2, leather: 4, gemstone: 1, obsidian: 2 },
    prerequisiteIds: ["kriegsmesser"],
    position: { x: -180, y: 840 },
    bonuses: {
      maxHp: 6,
      heavyDamage: 6,
      sweepWidth: 14,
      comboWindow: 120
    }
  },
  langesMesser: {
    id: "langesMesser",
    branch: "messer",
    swordId: "langesMesser",
    name: "Langes Messer",
    shortName: "Langes",
    summary: "A longer rogue messer that stretches reach and gains enough half-sword authority to threaten armor better.",
    detail: "Improves line reach, finishing range, and the branch's ability to stay dangerous into protection.",
    accent: 0xc49f80,
    cost: { steel: 10, wood: 2, leather: 4, gemstone: 2, obsidian: 1, amber: 1, essence: 2 },
    prerequisiteIds: ["grossesMesser"],
    position: { x: -360, y: 1020 },
    bonuses: {
      heavyDamage: 5,
      heavyRange: 12,
      thrustRange: 10,
      moveAcceleration: 60
    }
  },
  twoHandedMesser: {
    id: "twoHandedMesser",
    branch: "messer",
    swordId: "twoHandedMesser",
    name: "Two-Handed Messer",
    shortName: "2H Messer",
    summary: "A brutal two-handed rogue weapon that keeps knife-line nastiness while adding real sweeping authority.",
    detail: "Pushes the messer path into heavier launches, stronger cleaves, and better chase after the big hit lands.",
    accent: 0xd2b190,
    cost: { steel: 12, wood: 3, leather: 4, gemstone: 2, obsidian: 2, brimstone: 1, essence: 1 },
    prerequisiteIds: ["langesMesser"],
    position: { x: -540, y: 840 },
    bonuses: {
      maxHp: 6,
      heavyDamage: 7,
      sweepWidth: 12,
      heavyKnockback: 42
    }
  }
};

export const WEAPON_TECH_ORDER: WeaponTechNodeId[] = [
  "armingSword",
  "warArmingSword",
  "longsword",
  "greatsword",
  "zweihander",
  "flamberge",
  "landsknechtZweihander",
  "montante",
  "spanishMontante",
  "twoHandedMontante",
  "mastersMontante",
  "cavalryArmingSword",
  "oakeshottTypeXVIIIc",
  "renaissanceCavalrySword",
  "heavyCavalrySword",
  "claymore",
  "highlandClaymore",
  "lowlandTwoHandedClaymore",
  "thrustArmingSword",
  "borderDuelSword",
  "sidesword",
  "rapierLine",
  "courtRapier",
  "mastersRapier",
  "needleblade",
  "pappenheimerRapier",
  "estoc",
  "reinforcedEstoc",
  "twoHandedEstoc",
  "panzerstecher",
  "broadArmingSword",
  "falchion",
  "dusack",
  "heavyFalchion",
  "greatFalchion",
  "hangerSword",
  "navalCutlass",
  "hauswehr",
  "messer",
  "kriegsmesser",
  "grossesMesser",
  "langesMesser",
  "twoHandedMesser"
];

export function applyWeaponTechToStats(stats: CombatStats, nodeId: WeaponTechNodeId): void {
  const { bonuses } = WEAPON_TECH_TREE[nodeId];
  const attacks = [stats.lightAttack, stats.heavyAttack];

  stats.maxHp += bonuses.maxHp ?? 0;
  stats.moveSpeed += bonuses.moveSpeed ?? 0;
  stats.moveAcceleration += bonuses.moveAcceleration ?? 0;
  stats.drag += bonuses.drag ?? 0;
  stats.dashSpeed += bonuses.dashSpeed ?? 0;
  stats.dashDuration += bonuses.dashDuration ?? 0;
  stats.dashCooldown += bonuses.dashCooldown ?? 0;
  stats.attackControlWindup += bonuses.attackControlWindup ?? 0;
  stats.attackControlActive += bonuses.attackControlActive ?? 0;
  stats.comboWindow += bonuses.comboWindow ?? 0;
  stats.parryWindow += bonuses.parryWindow ?? 0;
  stats.parryRecovery += bonuses.parryRecovery ?? 0;
  stats.parryCooldown += bonuses.parryCooldown ?? 0;
  stats.parryReflectRatio += bonuses.parryReflectRatio ?? 0;
  stats.parryStunMs += bonuses.parryStunMs ?? 0;
  stats.pickupRadius += bonuses.pickupRadius ?? 0;
  stats.bonusDrops += bonuses.bonusDrops ?? 0;

  applyBonusesToAttack(stats.lightAttack, bonuses, "light");
  applyBonusesToAttack(stats.heavyAttack, bonuses, "heavy");

  for (const attack of attacks) {
    applyBonusesToAttack(attack, bonuses, "thrust");
    applyBonusesToAttack(attack, bonuses, "sweep");
  }

  stats.attackControlWindup = Math.min(0.88, stats.attackControlWindup);
  stats.attackControlActive = Math.min(0.62, stats.attackControlActive);
  stats.dashCooldown = Math.max(180, stats.dashCooldown);
  stats.parryCooldown = Math.max(320, stats.parryCooldown);
  stats.parryRecovery = Math.max(120, stats.parryRecovery);
  stats.parryWindow = Math.max(120, stats.parryWindow);
  stats.parryReflectRatio = Math.min(0.95, stats.parryReflectRatio);
  stats.lightAttack.width = Math.max(10, stats.lightAttack.width);
  stats.heavyAttack.width = Math.max(12, stats.heavyAttack.width);
}
