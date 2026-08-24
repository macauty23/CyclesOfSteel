import type {
  AttackClass,
  AttackProfile,
  HitImpactProfile,
  SwordAffinity,
  SwordAffinityCaps,
  SwordDefinition,
  SwordId,
  SwordTechniqueProfile,
  SwordTradeoffRatings
} from "../core/types";
import { WEAPON_TECH_TUNING } from "./weaponTechTuning";

type LegacyAttackProfile = Partial<AttackProfile> & {
  knockback?: number;
  impact?: Partial<HitImpactProfile>;
  [key: string]: unknown;
};

type SwordOverrides = Partial<Omit<SwordDefinition, "lightAttack" | "heavyAttack" | "techniques" | "caps" | "tradeoffs" | "affinity">> & {
  lightAttack?: LegacyAttackProfile;
  heavyAttack?: LegacyAttackProfile;
  techniques?: Partial<SwordTechniqueProfile>;
  affinity?: SwordAffinity;
  caps?: Partial<SwordAffinityCaps>;
  tradeoffs?: Partial<SwordTradeoffRatings>;
};

type SwordDraft = Partial<Omit<SwordDefinition, "lightAttack" | "heavyAttack" | "techniques" | "caps" | "tradeoffs" | "affinity">> & {
  id: SwordId;
  lightAttack: LegacyAttackProfile;
  heavyAttack: LegacyAttackProfile;
  techniques?: Partial<SwordTechniqueProfile>;
  affinity?: SwordAffinity;
  caps?: Partial<SwordAffinityCaps>;
  tradeoffs?: Partial<SwordTradeoffRatings>;
};

const DEFAULT_CAPS_BY_AFFINITY: Record<SwordAffinity, SwordAffinityCaps> = {
  balanced: {
    categoryLimit: 3,
    maxSweepWidthBonus: 22,
    maxReachBonus: 20,
    maxMoveSpeedBonus: 18,
    maxStaminaDiscount: 4,
    minDashCooldown: 250,
    minCommitWeight: 0.34
  },
  measure: {
    categoryLimit: 2,
    maxSweepWidthBonus: 8,
    maxReachBonus: 32,
    maxMoveSpeedBonus: 26,
    maxStaminaDiscount: 6,
    minDashCooldown: 230,
    minCommitWeight: 0.28
  },
  war: {
    categoryLimit: 3,
    maxSweepWidthBonus: 18,
    maxReachBonus: 18,
    maxMoveSpeedBonus: 14,
    maxStaminaDiscount: 4,
    minDashCooldown: 285,
    minCommitWeight: 0.46
  },
  edge: {
    categoryLimit: 2,
    maxSweepWidthBonus: 36,
    maxReachBonus: 14,
    maxMoveSpeedBonus: 12,
    maxStaminaDiscount: 4,
    minDashCooldown: 300,
    minCommitWeight: 0.48
  },
  rogue: {
    categoryLimit: 3,
    maxSweepWidthBonus: 18,
    maxReachBonus: 16,
    maxMoveSpeedBonus: 24,
    maxStaminaDiscount: 6,
    minDashCooldown: 235,
    minCommitWeight: 0.38
  },
  antiArmor: {
    categoryLimit: 2,
    maxSweepWidthBonus: 10,
    maxReachBonus: 24,
    maxMoveSpeedBonus: 10,
    maxStaminaDiscount: 4,
    minDashCooldown: 310,
    minCommitWeight: 0.52
  }
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function inferAffinity(id: SwordId): SwordAffinity {
  switch (id) {
    case "montante":
    case "warArmingSword":
    case "longsword":
    case "excalibur":
    case "greatsword":
    case "zweihander":
    case "flamberge":
    case "landsknechtZweihander":
    case "claymore":
    case "highlandClaymore":
    case "lowlandTwoHandedClaymore":
    case "cavalryArmingSword":
    case "oakeshottTypeXVIIIc":
    case "renaissanceCavalrySword":
    case "heavyCavalrySword":
    case "spanishMontante":
    case "twoHandedMontante":
    case "mastersMontante":
      return "war";
    case "thrustArmingSword":
    case "borderDuelSword":
    case "sidesword":
    case "rapier":
    case "courtRapier":
    case "mastersRapier":
    case "needleblade":
    case "pappenheimerRapier":
    case "tizona":
    case "colada":
      return "measure";
    case "broadArmingSword":
    case "falchion":
    case "heavyFalchion":
    case "greatFalchion":
    case "hangerSword":
    case "navalCutlass":
    case "dusack":
    case "steelDusack":
    case "mastersDusack":
    case "officersCutlass":
    case "executionFalchion":
    case "warFalchion":
      return "edge";
    case "messer":
    case "hauswehr":
    case "kriegsmesser":
    case "grossesMesser":
    case "langesMesser":
    case "twoHandedMesser":
    case "heavyKriegsmesser":
    case "executionMesser":
    case "warMesser":
    case "feldmesser":
    case "landsknechtMesser":
    case "fechtmesser":
    case "longFechtmesser":
    case "mastersMesser":
      return "rogue";
    case "estoc":
    case "twoHandedEstoc":
    case "panzerstecher":
    case "reinforcedEstoc":
      return "antiArmor";
    default:
      return "balanced";
  }
}

function inferAttackClass(attack: LegacyAttackProfile, kind: "light" | "heavy"): AttackClass {
  if (attack.attackClass) {
    return attack.attackClass;
  }

  const shape = attack.shape ?? "sweep";
  const range = attack.range ?? 120;
  const width = attack.width ?? 48;

  if (shape === "thrust") {
    return kind === "heavy" || range >= 148 ? "lunge" : "standard";
  }

  return kind === "heavy" || width >= 70 ? "cleave" : "standard";
}

function inferCommitWeight(attack: LegacyAttackProfile, kind: "light" | "heavy", attackClass: AttackClass): number {
  if (attack.commitWeight !== undefined) {
    return clamp(Number(attack.commitWeight.toFixed(2)), 0.24, 0.92);
  }

  const shape = attack.shape ?? "sweep";
  const range = attack.range ?? (shape === "thrust" ? 136 : 118);
  const width = attack.width ?? (shape === "thrust" ? 18 : 54);
  const windup = attack.windup ?? (kind === "heavy" ? 126 : 78);
  const recovery = attack.recovery ?? (kind === "heavy" ? 156 : 108);

  let value = kind === "heavy" ? 0.52 : 0.34;

  if (shape === "sweep") {
    value += 0.07;
  }

  if (attackClass === "cleave") {
    value += 0.08;
  } else if (attackClass === "lunge") {
    value += 0.05;
  }

  value += clamp((range - 120) / 240, -0.03, 0.12);
  value += clamp((width - 44) / 260, 0, 0.1);
  value += clamp((windup - 82) / 300, -0.02, 0.12);
  value += clamp((recovery - 112) / 340, -0.02, 0.12);

  return clamp(Number(value.toFixed(2)), kind === "heavy" ? 0.44 : 0.28, 0.92);
}

function inferDrift(attack: LegacyAttackProfile, attackClass: AttackClass): number {
  if (attack.drift !== undefined) {
    return clamp(Number(attack.drift.toFixed(2)), 0.18, 0.9);
  }

  const shape = attack.shape ?? "sweep";
  let value = attackClass === "lunge" ? 0.74 : attackClass === "cleave" ? 0.42 : shape === "thrust" ? 0.56 : 0.48;

  if ((attack.windup ?? 0) >= 140) {
    value -= 0.04;
  }

  return clamp(Number(value.toFixed(2)), 0.2, 0.88);
}

function inferStaminaCost(attack: LegacyAttackProfile, kind: "light" | "heavy", attackClass: AttackClass, commitWeight: number): number {
  if (attack.staminaCost !== undefined) {
    return Math.max(4, Math.round(attack.staminaCost));
  }

  const shape = attack.shape ?? "sweep";
  const range = attack.range ?? (shape === "thrust" ? 136 : 118);
  const width = attack.width ?? (shape === "thrust" ? 18 : 54);
  const baseCost = kind === "heavy" ? 18 : 8;
  const classCost = attackClass === "cleave" ? 4 : attackClass === "lunge" ? 3 : 2;
  const reachCost = Math.max(0, Math.round((range - 110) / 24));
  const widthCost = shape === "sweep" ? Math.max(0, Math.round((width - 50) / 24)) : 0;
  const commitCost = Math.round((commitWeight - 0.3) * 10);

  return clamp(baseCost + classCost + reachCost + widthCost + commitCost, kind === "heavy" ? 16 : 7, kind === "heavy" ? 34 : 18);
}

function inferImpact(
  attack: LegacyAttackProfile,
  kind: "light" | "heavy",
  attackClass: AttackClass
): HitImpactProfile {
  const legacyDisplacement = attack.impact?.displacement ?? attack.knockback ?? 260;
  const displacement = Math.max(90, Math.round(legacyDisplacement));
  const defaultControlLoss =
    displacement * (attackClass === "cleave" ? 0.4 : attackClass === "lunge" ? 0.34 : 0.36) + (kind === "heavy" ? 14 : 0);
  const defaultInterruptChance =
    0.18 +
    (kind === "heavy" ? 0.1 : 0) +
    (attackClass === "cleave" ? 0.08 : attackClass === "lunge" ? 0.04 : 0) +
    clamp((displacement - 220) / 620, -0.04, 0.28);
  const defaultHitstop = 34 + displacement * 0.05 + (kind === "heavy" ? 12 : 0) + (attackClass === "cleave" ? 6 : 0);
  const defaultShake = 0.0022 + displacement / 140000 + (kind === "heavy" ? 0.0006 : 0);

  return {
    displacement,
    controlLossMs: Math.max(48, Math.round(attack.impact?.controlLossMs ?? defaultControlLoss)),
    interruptChance: clamp(Number((attack.impact?.interruptChance ?? defaultInterruptChance).toFixed(2)), 0.12, 0.94),
    hitstopMs: Math.max(0, Math.round(attack.impact?.hitstopMs ?? defaultHitstop)),
    cameraShake: clamp(Number((attack.impact?.cameraShake ?? defaultShake).toFixed(4)), 0.0015, 0.009)
  };
}

function normalizeAttackProfile(
  attack: LegacyAttackProfile,
  fallback: AttackProfile | null,
  kind: "light" | "heavy"
): AttackProfile {
  const merged = fallback ? { ...fallback, ...attack } : attack;
  const shape = merged.shape ?? fallback?.shape ?? "sweep";
  const attackClass = inferAttackClass(merged, kind);
  const commitWeight = inferCommitWeight(merged, kind, attackClass);
  const impact = inferImpact(merged, kind, attackClass);

  return {
    name: merged.name ?? fallback?.name ?? (kind === "heavy" ? "Heavy Strike" : "Light Strike"),
    shape,
    attackClass,
    damage: merged.damage ?? fallback?.damage ?? (kind === "heavy" ? 34 : 20),
    range: merged.range ?? fallback?.range ?? (shape === "thrust" ? 144 : 118),
    width: merged.width ?? fallback?.width ?? (shape === "thrust" ? 18 : 52),
    windup: merged.windup ?? fallback?.windup ?? (kind === "heavy" ? 124 : 78),
    active: merged.active ?? fallback?.active ?? (kind === "heavy" ? 88 : 90),
    recovery: merged.recovery ?? fallback?.recovery ?? (kind === "heavy" ? 156 : 108),
    lunge: merged.lunge ?? fallback?.lunge ?? (shape === "thrust" ? 216 : 176),
    staminaCost: inferStaminaCost(merged, kind, attackClass, commitWeight),
    commitWeight,
    drift: inferDrift(merged, attackClass),
    impact,
    tint: merged.tint ?? fallback?.tint ?? 0xd9e2ea
  };
}

function toRating(value: number, min: number, max: number): number {
  const normalized = clamp((value - min) / Math.max(1, max - min), 0, 1);
  return Math.round(1 + normalized * 4);
}

function inferTradeoffs(
  lightAttack: AttackProfile,
  heavyAttack: AttackProfile,
  moveSpeed: number,
  dashSpeed: number,
  dashCooldown: number
): SwordTradeoffRatings {
  const tempoMetric = moveSpeed + dashSpeed * 0.09 - lightAttack.windup * 0.72 - dashCooldown * 0.1;
  const reachMetric =
    Math.max(lightAttack.range, heavyAttack.range) +
    Math.max(lightAttack.width, heavyAttack.width) * 0.22 +
    (heavyAttack.attackClass === "lunge" ? 12 : 0);
  const commitmentMetric =
    ((lightAttack.commitWeight + heavyAttack.commitWeight) * 100) / 2 +
    heavyAttack.recovery * 0.22 +
    heavyAttack.windup * 0.18;

  return {
    tempo: toRating(tempoMetric, 100, 240),
    reach: toRating(reachMetric, 110, 240),
    commitment: toRating(commitmentMetric, 68, 138)
  };
}

function normalizeSword(definition: SwordDraft): SwordDefinition {
  const lightAttack = normalizeAttackProfile(definition.lightAttack, null, "light");
  const heavyAttack = normalizeAttackProfile(definition.heavyAttack, null, "heavy");
  const affinity = definition.affinity ?? inferAffinity(definition.id);
  const defaultCaps = DEFAULT_CAPS_BY_AFFINITY[affinity];
  const tradeoffs =
    definition.tradeoffs &&
    definition.tradeoffs.tempo !== undefined &&
    definition.tradeoffs.reach !== undefined &&
    definition.tradeoffs.commitment !== undefined
      ? {
          tempo: definition.tradeoffs.tempo,
          reach: definition.tradeoffs.reach,
          commitment: definition.tradeoffs.commitment
        }
      : inferTradeoffs(lightAttack, heavyAttack, definition.moveSpeed ?? 188, definition.dashSpeed ?? 680, definition.dashCooldown ?? 360);

  return {
    ...definition,
    affinity,
    lightAttack,
    heavyAttack,
    techniques: {
      identity: definition.techniques?.identity ?? "Distinct steel.",
      traitPrimary: definition.techniques?.traitPrimary ?? "Measured Craft",
      traitSecondary: definition.techniques?.traitSecondary ?? "Forged Habit",
      ...definition.techniques
    },
    caps: {
      ...defaultCaps,
      ...definition.caps
    },
    tradeoffs
  } as SwordDefinition;
}

function defineSword(definition: SwordDraft): SwordDefinition {
  return normalizeSword(definition);
}

function forgeSword(base: SwordDefinition, overrides: SwordOverrides): SwordDefinition {
  return normalizeSword({
    ...base,
    ...overrides,
    lightAttack: {
      ...base.lightAttack,
      ...overrides.lightAttack
    },
    heavyAttack: {
      ...base.heavyAttack,
      ...overrides.heavyAttack
    },
    techniques: {
      ...base.techniques,
      ...overrides.techniques
    },
    caps: {
      ...base.caps,
      ...overrides.caps
    },
    tradeoffs: {
      ...base.tradeoffs,
      ...overrides.tradeoffs
    }
  });
}

const armingSword = defineSword({
  id: "armingSword",
  name: "Arming Sword",
  epithet: "The baseline",
  accent: 0xd3ae73,
  maxHp: 124,
  summary: "A reliable sidearm with practical cuts, straight thrusts, and forgiving guards.",
  lightSummary: "Guard Cut: a quick forehand cut that keeps you honest in close measure.",
  heavySummary: "Straight Thrust: a committed point-first entry that punishes openings and armor gaps.",
  moveSpeed: 192,
  moveAcceleration: 1500,
  drag: 1920,
  dashSpeed: 692,
  dashDuration: 148,
  dashCooldown: 364,
  attackControlWindup: 0.44,
  attackControlActive: 0.26,
  bodyWidth: 36,
  bodyHeight: 60,
  bladeLength: 76,
  bladeWidth: 6,
  guardSize: 24,
  dashTrailLength: 56,
  dashTrailWidth: 12,
  lightAttack: {
    name: "Guard Cut",
    shape: "sweep",
    damage: 22,
    range: 112,
    width: 50,
    windup: 80,
    active: 92,
    recovery: 110,
    lunge: 172,
    knockback: 294,
    tint: 0xc79353
  },
  heavyAttack: {
    name: "Straight Thrust",
    shape: "thrust",
    damage: 34,
    range: 148,
    width: 20,
    windup: 126,
    active: 84,
    recovery: 152,
    lunge: 222,
    knockback: 360,
    tint: 0xaec8e2
  },
  techniques: {
    identity: "Simple, forgiving, beginner sword.",
    traitPrimary: "Reliable Guard",
    traitSecondary: "Steady Footing",
    parryWindowMultiplier: 1.1,
    missRecoveryScale: 0.92
  }
});

const rapier = defineSword({
  id: "rapier",
  name: "Rapier",
  epithet: "The precise point",
  accent: 0xbfd7ff,
  maxHp: 102,
  summary: "A fast civilian dueling blade built around distance, initiative, and exact thrust lines.",
  lightSummary: "Probe: a fast checking thrust that rewards exact spacing.",
  heavySummary: "Deep Lunge: a longer, driving thrust that carries you into measure with intent.",
  moveSpeed: 222,
  moveAcceleration: 1740,
  drag: 1780,
  dashSpeed: 764,
  dashDuration: 136,
  dashCooldown: 318,
  attackControlWindup: 0.5,
  attackControlActive: 0.3,
  bodyWidth: 32,
  bodyHeight: 58,
  bladeLength: 90,
  bladeWidth: 4,
  guardSize: 22,
  dashTrailLength: 64,
  dashTrailWidth: 10,
  lightAttack: {
    name: "Probe",
    shape: "thrust",
    damage: 16,
    range: 156,
    width: 14,
    windup: 44,
    active: 76,
    recovery: 90,
    lunge: 232,
    knockback: 222,
    tint: 0xcfd8ff
  },
  heavyAttack: {
    name: "Deep Lunge",
    shape: "thrust",
    damage: 28,
    range: 206,
    width: 18,
    windup: 96,
    active: 88,
    recovery: 150,
    lunge: 370,
    knockback: 314,
    tint: 0xe5ecff
  },
  techniques: {
    identity: "Precision.",
    traitPrimary: "Perfect Measure",
    traitSecondary: "Lunge Master",
    healOnPerfectBind: 4,
    heavyThrustLungeBonus: 32
  }
});

const montante = defineSword({
  id: "montante",
  name: "Montante",
  epithet: "The sweeping great blade",
  accent: 0xd89162,
  maxHp: 130,
  summary: "A large two-handed sword that governs space through broad cuts and heavy commitment.",
  lightSummary: "Cross Sweep: a broad controlling cut that owns a lane of approach.",
  heavySummary: "Descending Sweep: a slow but forceful cleave that rules space through raw leverage.",
  moveSpeed: 176,
  moveAcceleration: 1420,
  drag: 2060,
  dashSpeed: 632,
  dashDuration: 158,
  dashCooldown: 414,
  attackControlWindup: 0.38,
  attackControlActive: 0.2,
  bodyWidth: 40,
  bodyHeight: 66,
  bladeLength: 102,
  bladeWidth: 9,
  guardSize: 30,
  dashTrailLength: 72,
  dashTrailWidth: 16,
  lightAttack: {
    name: "Cross Sweep",
    shape: "sweep",
    damage: 29,
    range: 150,
    width: 78,
    windup: 102,
    active: 122,
    recovery: 156,
    lunge: 176,
    commitWeight: 0.48,
    drift: 0.26,
    knockback: 352,
    tint: 0xd49b67
  },
  heavyAttack: {
    name: "Descending Sweep",
    shape: "sweep",
    damage: 49,
    range: 184,
    width: 96,
    windup: 156,
    active: 136,
    recovery: 198,
    lunge: 206,
    commitWeight: 0.74,
    drift: 0.19,
    knockback: 516,
    tint: 0xe0ae7a
  },
  techniques: {
    identity: "Commanding two-handed space control.",
    traitPrimary: "Compassing Guard",
    traitSecondary: "Sweeping Authority",
    sweepWidthBonus: 12,
    parryWindowMultiplier: 1.06,
    heavyPushMultiplier: 1.08,
    heavyKnockbackMultiplier: 1.06
  }
});

const spanishMontante = forgeSword(montante, {
  id: "spanishMontante",
  name: "Spanish Montante",
  epithet: "Rule-of-space discipline",
  accent: 0xe1a874,
  maxHp: 134,
  summary: "A formal montante style built around wide protective circles, measured steps, and strict lane command.",
  lightSummary: "Rule Cut: a governing sweep that opens a safe lane in front of the hands.",
  heavySummary: "Command Circle: a disciplined wheel-cut that drives enemies clear and resets the line.",
  moveSpeed: 178,
  moveAcceleration: 1440,
  drag: 2040,
  dashSpeed: 636,
  dashDuration: 158,
  dashCooldown: 408,
  bladeLength: 106,
  bladeWidth: 9,
  guardSize: 31,
  dashTrailLength: 76,
  dashTrailWidth: 16,
  lightAttack: {
    name: "Rule Cut",
    damage: 30,
    range: 154,
    width: 82,
    windup: 98,
    active: 124,
    recovery: 152,
    lunge: 180,
    commitWeight: 0.46,
    drift: 0.25,
    knockback: 364,
    tint: 0xdfa46f
  },
  heavyAttack: {
    name: "Command Circle",
    damage: 50,
    range: 188,
    width: 100,
    windup: 150,
    active: 138,
    recovery: 192,
    lunge: 210,
    commitWeight: 0.72,
    drift: 0.18,
    knockback: 528,
    tint: 0xebba84
  },
  techniques: {
    identity: "Formal space-command fencing.",
    traitPrimary: "Rule the Circle",
    traitSecondary: "Measured Ward",
    parryWindowMultiplier: 1.08,
    sweepWidthBonus: 18,
    heavyHitRecoveryScale: 0.88
  }
});

const twoHandedMontante = forgeSword(spanishMontante, {
  id: "twoHandedMontante",
  name: "Two-Handed Montante",
  epithet: "Relentless wheel pressure",
  accent: 0xebbb89,
  maxHp: 138,
  summary: "A heavier montante lineage that commits whole-body force into great wheeling cuts and command-level knockback.",
  lightSummary: "Wheel Sweep: a fuller body-led sweep that drags the whole lane under pressure.",
  heavySummary: "Guardbreak Wheel: a crushing rotational cut built to clear space by force.",
  moveSpeed: 172,
  moveAcceleration: 1380,
  drag: 2100,
  dashSpeed: 624,
  dashDuration: 160,
  dashCooldown: 420,
  bladeLength: 110,
  bladeWidth: 10,
  guardSize: 32,
  dashTrailLength: 80,
  dashTrailWidth: 17,
  lightAttack: {
    name: "Wheel Sweep",
    damage: 32,
    range: 158,
    width: 88,
    windup: 106,
    active: 126,
    recovery: 158,
    lunge: 184,
    commitWeight: 0.5,
    drift: 0.24,
    knockback: 378,
    tint: 0xe7b481
  },
  heavyAttack: {
    name: "Guardbreak Wheel",
    damage: 54,
    range: 192,
    width: 106,
    windup: 158,
    active: 140,
    recovery: 200,
    lunge: 214,
    commitWeight: 0.77,
    drift: 0.17,
    knockback: 548,
    tint: 0xf1c695
  },
  techniques: {
    identity: "Full-body wheeling offense.",
    traitPrimary: "Great Wheel",
    traitSecondary: "Braced Drive",
    heavyCannotBeInterrupted: true,
    heavyPushMultiplier: 1.16,
    heavyKnockbackMultiplier: 1.14
  }
});

const mastersMontante = forgeSword(twoHandedMontante, {
  id: "mastersMontante",
  name: "Master's Montante",
  epithet: "Hall-command mastery",
  accent: 0xf4cb9f,
  maxHp: 142,
  summary: "A master montante that turns broad command cuts and winning binds into complete control of the floor.",
  lightSummary: "Master Sweep: a poised command cut that keeps the enemy working around your circle.",
  heavySummary: "Hall Rule: a punishing governing cleave that cashes in on perfect timing and leverage.",
  moveSpeed: 174,
  moveAcceleration: 1400,
  drag: 2060,
  dashSpeed: 630,
  dashDuration: 156,
  dashCooldown: 404,
  bladeLength: 112,
  bladeWidth: 10,
  guardSize: 33,
  dashTrailLength: 84,
  dashTrailWidth: 17,
  lightAttack: {
    name: "Master Sweep",
    damage: 33,
    range: 160,
    width: 90,
    windup: 100,
    active: 128,
    recovery: 154,
    lunge: 186,
    commitWeight: 0.48,
    drift: 0.23,
    knockback: 386,
    tint: 0xf0c593
  },
  heavyAttack: {
    name: "Hall Rule",
    damage: 56,
    range: 194,
    width: 108,
    windup: 154,
    active: 142,
    recovery: 194,
    lunge: 216,
    commitWeight: 0.75,
    drift: 0.17,
    knockback: 560,
    tint: 0xf8d8b1
  },
  techniques: {
    identity: "Mastered two-handed command.",
    traitPrimary: "Hall Rule",
    traitSecondary: "Master Bind",
    parryWindowMultiplier: 1.14,
    perfectBindWindowMultiplier: 1.12,
    heavyStunMs: 160,
    nextAttackAfterBindBonus: 10
  }
});

const warArmingSword = forgeSword(armingSword, {
  id: "warArmingSword",
  name: "War Arming Sword",
  epithet: "Battle-tempered",
  accent: 0xc27b5d,
  maxHp: 126,
  summary: "A compact battlefield cutter that already leans toward greatsword pressure and shorter cleaving lines.",
  lightSummary: "War Sweep: a shorter passing cut that previews heavier two-handed lane control.",
  heavySummary: "Shoulder Hew: a compact cleave that behaves like a smaller greatsword chop.",
  moveSpeed: 184,
  moveAcceleration: 1460,
  dashSpeed: 676,
  dashCooldown: 380,
  bodyWidth: 37,
  bodyHeight: 61,
  bladeLength: 82,
  bladeWidth: 8,
  guardSize: 25,
  dashTrailLength: 60,
  dashTrailWidth: 13,
  lightAttack: {
    name: "War Sweep",
    damage: 25,
    range: 118,
    width: 58,
    active: 96,
    recovery: 126,
    commitWeight: 0.38,
    drift: 0.42,
    knockback: 316,
    tint: 0xbf7154
  },
  heavyAttack: {
    name: "Shoulder Hew",
    shape: "sweep",
    damage: 40,
    range: 140,
    width: 76,
    windup: 136,
    active: 100,
    recovery: 168,
    lunge: 196,
    commitWeight: 0.62,
    drift: 0.28,
    knockback: 428,
    tint: 0xcf8a66
  },
  techniques: {
    identity: "Compact greatsword pressure.",
    traitPrimary: "Battle Hardened",
    traitSecondary: "Momentum",
    heavyCannotBeInterrupted: true,
    heavyPushMultiplier: 1.2
  }
});

const longsword = forgeSword(warArmingSword, {
  id: "longsword",
  name: "Longsword",
  epithet: "Versatile duelist",
  accent: 0xd0a27d,
  maxHp: 124,
  summary: "A quicker two-handed bridge between war sword pressure and full greatsword authority, with a real thrust threat.",
  lightSummary: "Broad Oberhau: a fuller descending cut that feels like a quicker greatsword opener.",
  heavySummary: "Half-Sword Entry: a longer leveraged thrust that keeps the war line's body behind it.",
  moveSpeed: 190,
  moveAcceleration: 1500,
  dashSpeed: 692,
  dashCooldown: 360,
  bodyWidth: 39,
  bodyHeight: 64,
  bladeLength: 92,
  bladeWidth: 8,
  guardSize: 27,
  dashTrailLength: 64,
  dashTrailWidth: 14,
  lightAttack: {
    name: "Broad Oberhau",
    damage: 24,
    range: 130,
    width: 58,
    windup: 78,
    active: 98,
    recovery: 114,
    lunge: 174,
    commitWeight: 0.34,
    drift: 0.44,
    knockback: 310,
    tint: 0xd3a985
  },
  heavyAttack: {
    name: "Half-Sword Entry",
    shape: "thrust",
    damage: 36,
    range: 170,
    width: 18,
    windup: 122,
    active: 82,
    recovery: 144,
    lunge: 236,
    commitWeight: 0.56,
    drift: 0.46,
    knockback: 344,
    tint: 0xbfd1df
  },
  techniques: {
    identity: "Quicker greatsword bridge.",
    traitPrimary: "Half-Swording",
    traitSecondary: "Balanced Grip",
    parryWindowMultiplier: 1.03,
    postBindThrustRangeBonus: 18,
    postBindThrustDamageBonus: 4,
    lightHitRecoveryScale: 0.88
  }
});

const excalibur = forgeSword(longsword, {
  id: "excalibur",
  name: "Excalibur",
  epithet: "Hidden sovereign blade",
  accent: 0xf0d891,
  maxHp: 136,
  summary: "A legendary ascension of the longsword line that rewards perfect binds, sanctifies every sweep, and answers with sovereign mirages.",
  lightSummary: "Radiant Arc: a broad blessed cut that leaves lingering holy light in its wake.",
  heavySummary: "Coronation Wheel: a massive holy sweep that punishes armor and opens the lane for divine mirages.",
  moveSpeed: 188,
  moveAcceleration: 1480,
  dashSpeed: 688,
  dashCooldown: 352,
  bodyWidth: 40,
  bodyHeight: 66,
  bladeLength: 102,
  bladeWidth: 9,
  guardSize: 30,
  dashTrailLength: 74,
  dashTrailWidth: 18,
  lightAttack: {
    name: "Radiant Arc",
    shape: "sweep",
    damage: 30,
    range: 156,
    width: 76,
    windup: 84,
    active: 104,
    recovery: 120,
    lunge: 192,
    commitWeight: 0.4,
    drift: 0.4,
    knockback: 354,
    tint: 0xf5e5ab
  },
  heavyAttack: {
    name: "Coronation Wheel",
    shape: "sweep",
    damage: 48,
    range: 188,
    width: 104,
    windup: 140,
    active: 112,
    recovery: 166,
    lunge: 228,
    commitWeight: 0.63,
    drift: 0.3,
    knockback: 486,
    tint: 0xfff0c5
  },
  techniques: {
    identity: "Sovereign holy command.",
    traitPrimary: "Divinity's Judgment",
    traitSecondary: "The Holy Trinity",
    activeAbilityName: "Divinity's Judgment",
    activeAbilityCooldownMs: 30000,
    healOnPerfectBind: 5,
    heavyArmorPierceRatio: 0.25,
    mirageBaseCount: 2,
    mirageComboStep: 3,
    mirageMaxCount: 8,
    mirageDamage: 4,
    mirageSpeed: 980,
    mirageHitLimit: 2,
    mirageSpawnDelayMs: 50,
    mirageTimeoutMs: 1600,
    holyGroundDurationMs: 950,
    holyGroundTickMs: 180,
    holyGroundDamagePerTick: 2,
    holyGroundRadiusLight: 42,
    holyGroundRadiusHeavy: 56,
    holyTrinityEvery: 3,
    holyTrinityDamageMultiplier: 3,
    holyTrinityExplosionRadius: 52,
    holyTrinityExplosionDamage: 6
  }
});

const greatsword = forgeSword(longsword, {
  id: "greatsword",
  name: "Greatsword",
  epithet: "Dominating force",
  accent: 0xdfb18b,
  maxHp: 134,
  summary: "A long two-handed blade tuned to stagger, launch, and dominate space with committed blows.",
  lightSummary: "Passing Cut: a broad control cut that sets up the line for the finishing blow.",
  heavySummary: "Descending Cleave: a weighty, staggering strike with immense displacement.",
  moveSpeed: 182,
  moveAcceleration: 1440,
  drag: 2060,
  dashSpeed: 648,
  dashDuration: 154,
  dashCooldown: 396,
  bodyWidth: 42,
  bodyHeight: 68,
  bladeLength: 104,
  bladeWidth: 10,
  guardSize: 30,
  dashTrailLength: 78,
  dashTrailWidth: 18,
  lightAttack: {
    name: "Passing Cut",
    damage: 29,
    range: 150,
    width: 72,
    windup: 94,
    active: 108,
    recovery: 146,
    lunge: 180,
    commitWeight: 0.43,
    drift: 0.32,
    knockback: 348,
    tint: 0xe0b48f
  },
  heavyAttack: {
    name: "Descending Cleave",
    shape: "sweep",
    damage: 48,
    range: 184,
    width: 92,
    windup: 146,
    active: 124,
    recovery: 198,
    lunge: 220,
    commitWeight: 0.68,
    drift: 0.21,
    knockback: 526,
    tint: 0xeec399
  },
  techniques: {
    identity: "Control through force.",
    traitPrimary: "Stagger",
    traitSecondary: "Weight Behind It",
    parryWindowMultiplier: 1.04,
    heavyStunMs: 240,
    heavyKnockbackMultiplier: 1.28
  }
});

const zweihander = forgeSword(longsword, {
  id: "zweihander",
  name: "Zweihander",
  epithet: "Arc-dominating reach",
  accent: 0xe1b084,
  maxHp: 138,
  summary: "A longer battlefield two-hander built to rule broad lanes, break polearms, and batter through crowded fronts.",
  lightSummary: "Gathering Sweep: a huge collecting cut that opens multiple lines at once.",
  heavySummary: "Pole Breaker Hew: a broad descending blow meant to smash through long weapons and guard lines.",
  moveSpeed: 174,
  moveAcceleration: 1380,
  drag: 2120,
  dashSpeed: 628,
  dashDuration: 156,
  dashCooldown: 410,
  bodyWidth: 43,
  bodyHeight: 70,
  bladeLength: 114,
  bladeWidth: 10,
  guardSize: 32,
  dashTrailLength: 82,
  dashTrailWidth: 18,
  lightAttack: {
    name: "Gathering Sweep",
    damage: 31,
    range: 164,
    width: 86,
    windup: 104,
    active: 120,
    recovery: 158,
    lunge: 186,
    commitWeight: 0.45,
    drift: 0.3,
    knockback: 378,
    tint: 0xe4b88b
  },
  heavyAttack: {
    name: "Pole Breaker Hew",
    shape: "sweep",
    damage: 50,
    range: 196,
    width: 104,
    windup: 154,
    active: 130,
    recovery: 202,
    lunge: 220,
    commitWeight: 0.7,
    drift: 0.2,
    knockback: 560,
    tint: 0xf0c89a
  },
  techniques: {
    identity: "Sweeping battlefield control.",
    traitPrimary: "Sweeping Cuts",
    traitSecondary: "Pole Breaker",
    parryWindowMultiplier: 1.04,
    sweepWidthBonus: 14,
    bonusDamageVsPolearm: 7
  }
});

const flamberge = forgeSword(zweihander, {
  id: "flamberge",
  name: "Zweihander (Flamberge)",
  epithet: "Rippling intimidation",
  accent: 0xf0c38f,
  maxHp: 140,
  summary: "A flamboyant waved great blade that keeps the zweihander's wide dominance while adding more rattling impact and finishing pressure.",
  lightSummary: "Rippling Sweep: a wide wave-like cut that keeps the enemy nervous under the blade.",
  heavySummary: "Intimidating Break: a crashing two-handed arc with a higher chance to shake the line apart.",
  moveSpeed: 176,
  moveAcceleration: 1380,
  dashSpeed: 632,
  dashDuration: 154,
  dashCooldown: 404,
  bladeLength: 116,
  bladeWidth: 10,
  dashTrailLength: 86,
  lightAttack: {
    name: "Rippling Sweep",
    damage: 33,
    range: 166,
    width: 90,
    windup: 100,
    active: 124,
    recovery: 156,
    lunge: 190,
    commitWeight: 0.46,
    drift: 0.29,
    knockback: 388,
    tint: 0xf0c18c
  },
  heavyAttack: {
    name: "Intimidating Break",
    damage: 53,
    range: 198,
    width: 106,
    windup: 150,
    active: 132,
    recovery: 198,
    lunge: 224,
    commitWeight: 0.72,
    drift: 0.2,
    knockback: 572,
    tint: 0xf7d3a6
  },
  techniques: {
    identity: "Rippling battlefield terror.",
    traitPrimary: "Rippling Blade",
    traitSecondary: "Intimidation",
    heavyStunMs: 128,
    executeThreshold: 0.18,
    executeDamageBonus: 8
  }
});

const landsknechtZweihander = forgeSword(zweihander, {
  id: "landsknechtZweihander",
  name: "Landsknecht Zweihander",
  epithet: "Mercenary pike-breaker",
  accent: 0xe7bc90,
  maxHp: 140,
  summary: "A practical mercenary zweihander built to bully polearms, drive through lines, and keep lane pressure marching forward.",
  lightSummary: "Mercenary Sweep: a collected battlefield cut that keeps long weapons honest.",
  heavySummary: "Pikebreaker Rush: a forceful line-smashing blow that lands best when you step through it.",
  moveSpeed: 178,
  moveAcceleration: 1400,
  dashSpeed: 648,
  dashDuration: 154,
  dashCooldown: 390,
  bladeLength: 118,
  bladeWidth: 10,
  guardSize: 32,
  dashTrailLength: 84,
  dashTrailWidth: 18,
  lightAttack: {
    name: "Mercenary Sweep",
    damage: 32,
    range: 166,
    width: 92,
    windup: 100,
    active: 122,
    recovery: 154,
    lunge: 192,
    commitWeight: 0.45,
    drift: 0.3,
    knockback: 392,
    tint: 0xe7ba8d
  },
  heavyAttack: {
    name: "Pikebreaker Rush",
    damage: 52,
    range: 198,
    width: 102,
    windup: 150,
    active: 130,
    recovery: 194,
    lunge: 236,
    commitWeight: 0.69,
    drift: 0.22,
    knockback: 574,
    tint: 0xf0c898
  },
  techniques: {
    identity: "Mercenary line-breaking control.",
    traitPrimary: "Pike Hook",
    traitSecondary: "Press the Line",
    bonusDamageVsPolearm: 12,
    chargeDamageBonus: 8,
    heavyPushMultiplier: 1.14
  }
});

const claymore = forgeSword(greatsword, {
  id: "claymore",
  name: "Claymore",
  epithet: "Charging authority",
  accent: 0xd7ab86,
  maxHp: 136,
  summary: "A large two-handed sword that trades a little raw breadth for better recovery and brutal forward entries.",
  lightSummary: "Highland Cut: a long advancing cut that rewards pressing into measure.",
  heavySummary: "Forward Break: a committed heavy stroke that lands hardest when you drive through the enemy.",
  moveSpeed: 186,
  moveAcceleration: 1500,
  drag: 1960,
  dashSpeed: 676,
  dashDuration: 150,
  dashCooldown: 372,
  bodyWidth: 41,
  bodyHeight: 67,
  bladeLength: 106,
  bladeWidth: 9,
  guardSize: 29,
  dashTrailLength: 76,
  dashTrailWidth: 17,
  lightAttack: {
    name: "Highland Cut",
    damage: 30,
    range: 154,
    width: 70,
    windup: 88,
    active: 108,
    recovery: 136,
    lunge: 192,
    commitWeight: 0.4,
    drift: 0.34,
    knockback: 344,
    tint: 0xdcb18d
  },
  heavyAttack: {
    name: "Forward Break",
    damage: 49,
    range: 182,
    width: 88,
    windup: 140,
    active: 120,
    recovery: 176,
    lunge: 232,
    commitWeight: 0.64,
    drift: 0.22,
    knockback: 500,
    tint: 0xebc19c
  },
  techniques: {
    identity: "Charging two-handed pressure.",
    traitPrimary: "Highland Charge",
    traitSecondary: "Balanced Grip",
    parryWindowMultiplier: 1.04,
    chargeDamageBonus: 9,
    heavyHitRecoveryScale: 0.84
  }
});

const highlandClaymore = forgeSword(claymore, {
  id: "highlandClaymore",
  name: "Highland Claymore",
  epithet: "Brutal momentum",
  accent: 0xe7bf97,
  maxHp: 140,
  summary: "A more ferocious claymore that powers through interruptions and cleanly culls broken opponents.",
  lightSummary: "Driving Highland Cut: a longer charging cut that keeps the line moving.",
  heavySummary: "Cull Stroke: an unflinching heavy blow that finishes weakened enemies outright.",
  moveSpeed: 184,
  moveAcceleration: 1520,
  drag: 2020,
  dashSpeed: 680,
  dashDuration: 150,
  dashCooldown: 368,
  bladeLength: 108,
  guardSize: 30,
  lightAttack: {
    name: "Driving Highland Cut",
    damage: 32,
    range: 158,
    width: 74,
    recovery: 132,
    lunge: 196,
    commitWeight: 0.41,
    drift: 0.33,
    knockback: 352,
    tint: 0xe9be97
  },
  heavyAttack: {
    name: "Cull Stroke",
    damage: 52,
    range: 186,
    width: 90,
    windup: 142,
    recovery: 172,
    lunge: 236,
    commitWeight: 0.66,
    drift: 0.21,
    knockback: 514,
    tint: 0xf2cfaa
  },
  techniques: {
    identity: "Unflinching highland offense.",
    traitPrimary: "Brutal Momentum",
    traitSecondary: "Cull",
    heavyCannotBeInterrupted: true,
    executeThreshold: 0.1,
    executeDamageBonus: 999,
    heavyHitRecoveryScale: 0.8,
    chargeDamageBonus: 12
  }
});

const lowlandTwoHandedClaymore = forgeSword(claymore, {
  id: "lowlandTwoHandedClaymore",
  name: "Lowland Two-Handed Claymore",
  epithet: "Braced two-handed precision",
  accent: 0xe2bb95,
  maxHp: 138,
  summary: "A steadier claymore lineage that trades Highland ferocity for braced binds, longer entries, and cleaner recovery.",
  lightSummary: "Braced Cut: a controlled two-handed cut that keeps the stance underneath you.",
  heavySummary: "Lowland Drive: a long committed point-led finish that turns a won bind into real reach.",
  moveSpeed: 182,
  moveAcceleration: 1480,
  drag: 1960,
  dashSpeed: 666,
  dashDuration: 148,
  dashCooldown: 376,
  bladeLength: 108,
  bladeWidth: 9,
  guardSize: 30,
  dashTrailLength: 76,
  dashTrailWidth: 16,
  lightAttack: {
    name: "Braced Cut",
    damage: 30,
    range: 150,
    width: 72,
    windup: 88,
    active: 110,
    recovery: 134,
    lunge: 190,
    commitWeight: 0.39,
    drift: 0.34,
    knockback: 340,
    tint: 0xe0b58f
  },
  heavyAttack: {
    name: "Lowland Drive",
    shape: "thrust",
    damage: 48,
    range: 190,
    width: 18,
    windup: 134,
    active: 90,
    recovery: 162,
    lunge: 276,
    commitWeight: 0.58,
    drift: 0.4,
    knockback: 404,
    tint: 0xedc7a2
  },
  techniques: {
    identity: "Braced two-handed dueling.",
    traitPrimary: "Low Guard",
    traitSecondary: "Braced Point",
    parryWindowMultiplier: 1.08,
    perfectBindWindowMultiplier: 1.06,
    postBindThrustRangeBonus: 18,
    postBindThrustDamageBonus: 5,
    heavyHitRecoveryScale: 0.86
  }
});

const cavalryArmingSword = forgeSword(warArmingSword, {
  id: "cavalryArmingSword",
  name: "Cavalry Arming Sword",
  epithet: "Passing-cut momentum",
  accent: 0xd09372,
  maxHp: 126,
  summary: "A longer battlefield sidearm that leans into passing draw-cuts, fast forward pressure, and damage on the move.",
  lightSummary: "Passing Draw: a slicing ride-by cut that clips through measure while you keep moving.",
  heavySummary: "Saddle Hew: a forward-heavy battlefield cut that lands best when you carry speed through it.",
  moveSpeed: 190,
  moveAcceleration: 1520,
  drag: 1880,
  dashSpeed: 706,
  dashDuration: 146,
  dashCooldown: 356,
  bladeLength: 88,
  bladeWidth: 7,
  guardSize: 24,
  dashTrailLength: 64,
  dashTrailWidth: 13,
  lightAttack: {
    name: "Passing Draw",
    damage: 24,
    range: 124,
    width: 60,
    windup: 72,
    active: 94,
    recovery: 116,
    lunge: 194,
    knockback: 316,
    tint: 0xd49b7b
  },
  heavyAttack: {
    name: "Saddle Hew",
    damage: 39,
    range: 154,
    width: 74,
    windup: 126,
    active: 98,
    recovery: 160,
    lunge: 244,
    knockback: 430,
    tint: 0xe1ae8d
  },
  techniques: {
    identity: "Forward-cut cavalry pressure.",
    traitPrimary: "Passing Draw",
    traitSecondary: "Riding Through",
    chargeDamageBonus: 6,
    dashAttackBonus: 5
  }
});

const oakeshottTypeXVIIIc = forgeSword(cavalryArmingSword, {
  id: "oakeshottTypeXVIIIc",
  name: "Oakeshott Type XVIIIc",
  epithet: "Cut-and-thrust saddle steel",
  accent: 0xdca782,
  maxHp: 128,
  summary: "A longer cut-and-thrust cavalry form that cuts cleanly in motion, then threatens a true point on the follow-up.",
  lightSummary: "Type Draw: a balanced passing cut that leaves the point free to take the next line.",
  heavySummary: "After-Cut Thrust: a long battlefield thrust that cashes in on a won bind or clean cut.",
  moveSpeed: 188,
  moveAcceleration: 1500,
  dashSpeed: 700,
  dashDuration: 146,
  dashCooldown: 352,
  bladeLength: 92,
  bladeWidth: 7,
  guardSize: 25,
  dashTrailLength: 66,
  dashTrailWidth: 13,
  lightAttack: {
    name: "Type Draw",
    damage: 25,
    range: 128,
    width: 62,
    windup: 70,
    active: 96,
    recovery: 112,
    lunge: 196,
    knockback: 322,
    tint: 0xe1ae89
  },
  heavyAttack: {
    name: "After-Cut Thrust",
    shape: "thrust",
    damage: 40,
    range: 176,
    width: 18,
    windup: 124,
    active: 86,
    recovery: 154,
    lunge: 278,
    knockback: 372,
    tint: 0xd6d9e1
  },
  techniques: {
    identity: "Balanced cavalry cut-and-thrust.",
    traitPrimary: "Type XVIIIc",
    traitSecondary: "Point After Cut",
    alternateAttackBonus: 5,
    postBindThrustRangeBonus: 14,
    postBindThrustDamageBonus: 4
  }
});

const renaissanceCavalrySword = forgeSword(oakeshottTypeXVIIIc, {
  id: "renaissanceCavalrySword",
  name: "Renaissance Cavalry Sword",
  epithet: "Guarded riding finesse",
  accent: 0xe7b890,
  maxHp: 130,
  summary: "A more guarded cavalry lineage that keeps the cut-and-thrust rhythm but answers pressure with safer binds and cleaner recovery.",
  lightSummary: "Guarded Pass: a poised passing cut that keeps the hand protected on entry.",
  heavySummary: "Rider's Reply: a longer retaliatory thrust meant to answer the enemy's commitment.",
  moveSpeed: 192,
  moveAcceleration: 1540,
  drag: 1860,
  dashSpeed: 712,
  dashDuration: 144,
  dashCooldown: 338,
  bladeLength: 94,
  bladeWidth: 7,
  guardSize: 27,
  dashTrailLength: 66,
  dashTrailWidth: 13,
  lightAttack: {
    name: "Guarded Pass",
    damage: 26,
    range: 130,
    width: 64,
    windup: 68,
    active: 96,
    recovery: 108,
    lunge: 200,
    knockback: 328,
    tint: 0xe6b48c
  },
  heavyAttack: {
    name: "Rider's Reply",
    shape: "thrust",
    damage: 41,
    range: 182,
    width: 18,
    windup: 120,
    active: 88,
    recovery: 148,
    lunge: 286,
    knockback: 378,
    tint: 0xe5e8ee
  },
  techniques: {
    identity: "Guarded cavalry counterplay.",
    traitPrimary: "Guarded Pass",
    traitSecondary: "Swift Reins",
    parryWindowMultiplier: 1.08,
    dashRefundOnHit: 80,
    hitMoveBoostMultiplier: 1.08,
    hitMoveBoostDurationMs: 420
  }
});

const heavyCavalrySword = forgeSword(renaissanceCavalrySword, {
  id: "heavyCavalrySword",
  name: "Heavy Cavalry Sword",
  epithet: "Breakthrough steel",
  accent: 0xf0c29c,
  maxHp: 134,
  summary: "A heavier cavalry blade that cashes speed and line control into punishing impact against lightly protected foes.",
  lightSummary: "Dragoon Cut: a longer passing chop that keeps the enemy under the edge.",
  heavySummary: "Breakthrough Sweep: a forceful saber-like cleave built to smash through the line.",
  moveSpeed: 184,
  moveAcceleration: 1480,
  drag: 1940,
  dashSpeed: 694,
  dashDuration: 146,
  dashCooldown: 350,
  bladeLength: 96,
  bladeWidth: 8,
  guardSize: 27,
  dashTrailLength: 70,
  dashTrailWidth: 14,
  lightAttack: {
    name: "Dragoon Cut",
    damage: 28,
    range: 134,
    width: 70,
    windup: 74,
    active: 98,
    recovery: 112,
    lunge: 204,
    knockback: 340,
    tint: 0xefbb95
  },
  heavyAttack: {
    name: "Breakthrough Sweep",
    damage: 45,
    range: 164,
    width: 88,
    windup: 132,
    active: 104,
    recovery: 170,
    lunge: 236,
    knockback: 486,
    tint: 0xf7d1ac
  },
  techniques: {
    identity: "Breakthrough cavalry offense.",
    traitPrimary: "Dragoon Weight",
    traitSecondary: "Trampling Finish",
    heavyPushMultiplier: 1.22,
    bonusDamageVsLightArmor: 8,
    chargeDamageBonus: 8
  }
});

const thrustArmingSword = forgeSword(armingSword, {
  id: "thrustArmingSword",
  name: "Thrust Arming Sword",
  epithet: "Point-led discipline",
  accent: 0x9db9dd,
  maxHp: 118,
  summary: "A proto-rapier arming sword that shortens its cuts and stretches its point toward cleaner lanes.",
  lightSummary: "Line Probe: a compact checking thrust that already feels like an early rapier hand.",
  heavySummary: "Gap Thrust: a longer point-led entry that previews both rapier measure and estoc pressure.",
  moveSpeed: 206,
  moveAcceleration: 1620,
  dashSpeed: 720,
  dashCooldown: 338,
  bodyWidth: 35,
  bodyHeight: 59,
  bladeLength: 84,
  bladeWidth: 5,
  guardSize: 23,
  dashTrailLength: 60,
  dashTrailWidth: 11,
  lightAttack: {
    name: "Line Probe",
    shape: "thrust",
    damage: 19,
    range: 148,
    width: 15,
    windup: 56,
    active: 80,
    recovery: 92,
    lunge: 214,
    knockback: 228,
    tint: 0xa7c2e5
  },
  heavyAttack: {
    name: "Gap Thrust",
    shape: "thrust",
    damage: 32,
    range: 188,
    width: 18,
    windup: 112,
    active: 86,
    recovery: 144,
    lunge: 290,
    knockback: 320,
    tint: 0xb9d0ef
  },
  techniques: {
    identity: "Proto-rapier control.",
    traitPrimary: "Point Control",
    traitSecondary: "Quick Withdraw",
    perfectBindWindowMultiplier: 1.06,
    thrustRangeBonus: 10,
    thrustMissRecoveryScale: 0.82
  }
});

const borderDuelSword = forgeSword(thrustArmingSword, {
  id: "borderDuelSword",
  name: "Border Duel Sword",
  epithet: "Opening aggression",
  accent: 0x87add7,
  maxHp: 114,
  summary: "A scrappier proto-sidesword that still lives on thrust entries, but now carries a small dueling cut behind them.",
  lightSummary: "Snapped Entry: a brisk thrust that feels like a rougher early rapier lunge.",
  heavySummary: "Line Break Cut: a compact dueling cut that previews the sidesword's mix of point and edge.",
  moveSpeed: 214,
  moveAcceleration: 1680,
  dashSpeed: 740,
  dashCooldown: 322,
  bodyWidth: 34,
  bodyHeight: 59,
  bladeLength: 86,
  bladeWidth: 5,
  guardSize: 24,
  dashTrailLength: 62,
  dashTrailWidth: 11,
  lightAttack: {
    name: "Snapped Entry",
    damage: 21,
    range: 154,
    width: 15,
    windup: 54,
    active: 84,
    recovery: 88,
    lunge: 220,
    knockback: 240,
    tint: 0x9ebde8
  },
  heavyAttack: {
    name: "Line Break Cut",
    shape: "sweep",
    damage: 35,
    range: 132,
    width: 58,
    windup: 114,
    active: 90,
    recovery: 142,
    lunge: 206,
    knockback: 350,
    tint: 0x8eb0d7
  },
  techniques: {
    identity: "Scrappy proto-sidesword.",
    traitPrimary: "First Blood",
    traitSecondary: "Footwork",
    firstHitBonusDamage: 7,
    dashRefundOnHit: 90
  }
});

const sidesword = forgeSword(borderDuelSword, {
  id: "sidesword",
  name: "Sidesword",
  epithet: "Flowing combinations",
  accent: 0x7b9fcd,
  maxHp: 118,
  summary: "A cut-capable proto-rapier that still keeps one foot in arming-sword play while the point takes over.",
  lightSummary: "Cutover: a lean slicing opener that exists mostly to feed the longer thrust behind it.",
  heavySummary: "Riposte Thrust: a truer rapier-like finishing line with just enough sword behind it to cut first.",
  moveSpeed: 212,
  moveAcceleration: 1640,
  dashSpeed: 724,
  dashCooldown: 324,
  bodyWidth: 35,
  bodyHeight: 60,
  bladeLength: 88,
  bladeWidth: 5,
  guardSize: 25,
  dashTrailLength: 64,
  dashTrailWidth: 11,
  lightAttack: {
    name: "Cutover",
    shape: "sweep",
    damage: 21,
    range: 120,
    width: 52,
    windup: 68,
    active: 92,
    recovery: 102,
    lunge: 174,
    knockback: 278,
    tint: 0x90afda
  },
  heavyAttack: {
    name: "Riposte Thrust",
    shape: "thrust",
    damage: 34,
    range: 180,
    width: 18,
    windup: 108,
    active: 84,
    recovery: 142,
    lunge: 258,
    knockback: 340,
    tint: 0xb9caeb
  },
  techniques: {
    identity: "Cut-capable proto-rapier.",
    traitPrimary: "Riposte",
    traitSecondary: "Mixed Technique",
    riposteDamageBonus: 8,
    alternateAttackBonus: 4
  }
});

const courtRapier = forgeSword(rapier, {
  id: "courtRapier",
  name: "Court Rapier",
  epithet: "Graceful fencing",
  accent: 0xd8e3ff,
  maxHp: 100,
  summary: "A polished court blade that glides through measure and rewards poised fencing rhythm.",
  lightSummary: "Measured Probe: a poised thrust that keeps tempo and recovery under control.",
  heavySummary: "Measured Advance: a long graceful lunge that feeds mobility after contact.",
  moveSpeed: 228,
  moveAcceleration: 1790,
  dashSpeed: 776,
  dashCooldown: 304,
  bladeLength: 92,
  lightAttack: {
    name: "Measured Probe",
    damage: 18,
    range: 162,
    width: 14,
    recovery: 86,
    tint: 0xe4ebff
  },
  heavyAttack: {
    name: "Measured Advance",
    damage: 30,
    range: 214,
    lunge: 384,
    recovery: 144,
    tint: 0xf0f4ff
  },
  techniques: {
    identity: "Graceful fencing.",
    traitPrimary: "Elegant Recovery",
    traitSecondary: "Measured Advance",
    thrustHitDashRefund: 120,
    hitMoveBoostMultiplier: 1.14,
    hitMoveBoostDurationMs: 650
  }
});

const mastersRapier = forgeSword(courtRapier, {
  id: "mastersRapier",
  name: "Master's Rapier",
  epithet: "Refined mastery",
  accent: 0xf2f6ff,
  maxHp: 98,
  summary: "An exacting rapier that snowballs precise thrust rhythm and punishes perfect binds.",
  lightSummary: "Tempo Probe: repeated clean thrusts sharpen their own threat.",
  heavySummary: "Final Intention: a long exact thrust that thrives on composure and timing.",
  moveSpeed: 229,
  moveAcceleration: 1800,
  dashSpeed: 780,
  dashCooldown: 300,
  lightAttack: {
    name: "Tempo Probe",
    damage: 19,
    range: 166,
    recovery: 84,
    tint: 0xf2f6ff
  },
  heavyAttack: {
    name: "Final Intention",
    damage: 31,
    range: 220,
    lunge: 392,
    recovery: 140,
    tint: 0xffffff
  },
  techniques: {
    identity: "Mastery.",
    traitPrimary: "Master Duelist",
    traitSecondary: "Perfect Timing",
    thrustStreakDamageStep: 2,
    thrustStreakMaxStacks: 4,
    perfectBindSlowFactor: 0.62,
    perfectBindSlowDurationMs: 520
  }
});

const needleblade = forgeSword(mastersRapier, {
  id: "needleblade",
  name: "Needleblade",
  epithet: "Pinpoint aggression",
  accent: 0xf6f8ff,
  maxHp: 96,
  summary: "An ultra-fine dueling blade that lives almost entirely on thrust precision, critical timing, and relentless same-target pressure.",
  lightSummary: "Needle Probe: a tiny exact thrust that stacks pressure on one line.",
  heavySummary: "Heartseeker Lunge: a committed point attack built to punish repeated clean measure.",
  moveSpeed: 234,
  moveAcceleration: 1840,
  dashSpeed: 790,
  dashDuration: 134,
  dashCooldown: 292,
  bodyWidth: 31,
  bodyHeight: 58,
  bladeLength: 94,
  bladeWidth: 4,
  guardSize: 22,
  dashTrailLength: 66,
  dashTrailWidth: 10,
  lightAttack: {
    name: "Needle Probe",
    damage: 18,
    range: 172,
    width: 12,
    windup: 42,
    active: 74,
    recovery: 84,
    lunge: 240,
    knockback: 214,
    tint: 0xf7f9ff
  },
  heavyAttack: {
    name: "Heartseeker Lunge",
    shape: "thrust",
    damage: 30,
    range: 224,
    width: 16,
    windup: 92,
    active: 84,
    recovery: 142,
    lunge: 404,
    knockback: 320,
    tint: 0xffffff
  },
  techniques: {
    identity: "Pinpoint dueling pressure.",
    traitPrimary: "Pinpoint Accuracy",
    traitSecondary: "Heartseeker",
    criticalChanceBonus: 0.22,
    criticalDamageMultiplier: 1.6,
    thrustStreakDamageStep: 3,
    thrustStreakMaxStacks: 5
  }
});

const pappenheimerRapier = forgeSword(mastersRapier, {
  id: "pappenheimerRapier",
  name: "Pappenheimer Rapier",
  epithet: "Guarded counterplay",
  accent: 0xdfe7ff,
  maxHp: 104,
  summary: "A more protective rapier variant that turns successful binds into safer defense and harder counters.",
  lightSummary: "Guarded Probe: a steady rapier check that keeps the hand protected.",
  heavySummary: "Counter Lunge: a stronger retaliatory thrust meant to cash in after a successful guard.",
  moveSpeed: 222,
  moveAcceleration: 1760,
  dashSpeed: 758,
  dashDuration: 138,
  dashCooldown: 306,
  bodyWidth: 33,
  bodyHeight: 59,
  bladeLength: 92,
  bladeWidth: 4,
  guardSize: 25,
  dashTrailLength: 64,
  dashTrailWidth: 10,
  lightAttack: {
    name: "Guarded Probe",
    damage: 19,
    range: 164,
    width: 14,
    recovery: 88,
    tint: 0xe7eeff
  },
  heavyAttack: {
    name: "Counter Lunge",
    damage: 32,
    range: 214,
    width: 18,
    windup: 100,
    recovery: 146,
    lunge: 382,
    knockback: 332,
    tint: 0xf2f5ff
  },
  techniques: {
    identity: "Guard-led rapier counters.",
    traitPrimary: "Master Guard",
    traitSecondary: "Counter",
    postBindGuardDamageScale: 0.68,
    nextAttackAfterBindBonus: 12,
    riposteDamageBonus: 10
  }
});

const tizona = forgeSword(needleblade, {
  id: "tizona",
  name: "Tizona",
  epithet: "Force of Flame",
  accent: 0xf08b43,
  maxHp: 104,
  summary: "A legendary dueling point that turns exact offense into a rising furnace without surrendering its needle-thrust identity.",
  lightSummary: "Ember Probe: a quick thrust that builds the heat only clean measure can sustain.",
  heavySummary: "Firebrand Lunge: a blazing committed point that rewards Dominion with a fierce burn.",
  moveSpeed: 238,
  moveAcceleration: 1880,
  dashSpeed: 804,
  dashCooldown: 284,
  bladeLength: 98,
  bladeWidth: 5,
  guardSize: 23,
  lightAttack: {
    name: "Ember Probe",
    damage: 20,
    range: 180,
    width: 13,
    windup: 44,
    recovery: 82,
    tint: 0xffbd6d
  },
  heavyAttack: {
    name: "Firebrand Lunge",
    damage: 34,
    range: 232,
    width: 17,
    windup: 96,
    recovery: 138,
    lunge: 420,
    tint: 0xff8d49
  },
  techniques: {
    identity: "Legendary precision set aflame.",
    traitPrimary: "Force of Flame",
    traitSecondary: "Clean fire",
    activeAbilityName: "Force of Flame",
    activeAbilityCooldownMs: WEAPON_TECH_TUNING.legendary.tizona.cooldownMs,
    criticalChanceBonus: 0.18,
    criticalDamageMultiplier: 1.55,
    thrustStreakDamageStep: 2,
    thrustStreakMaxStacks: 5,
    tizonaFlameDurationMs: WEAPON_TECH_TUNING.legendary.tizona.flameDurationMs,
    tizonaFlameBaseDamageBonus: WEAPON_TECH_TUNING.legendary.tizona.baseDamageBonus,
    tizonaFlameCleanHitDamageStep: WEAPON_TECH_TUNING.legendary.tizona.cleanHitDamageStep,
    tizonaFlameMaxCleanHitStacks: WEAPON_TECH_TUNING.legendary.tizona.maxCleanHitStacks,
    tizonaFlameFlowDamageBonus: WEAPON_TECH_TUNING.legendary.tizona.flowDamageBonus,
    tizonaFlameDominionDamageBonus: WEAPON_TECH_TUNING.legendary.tizona.dominionDamageBonus,
    tizonaBurnBaseDamage: WEAPON_TECH_TUNING.legendary.tizona.burnBaseDamage,
    tizonaBurnCleanHitStep: WEAPON_TECH_TUNING.legendary.tizona.burnCleanHitStep,
    tizonaBurnDurationMs: WEAPON_TECH_TUNING.legendary.tizona.burnDurationMs
  }
});

const colada = forgeSword(pappenheimerRapier, {
  id: "colada",
  name: "Colada",
  epithet: "Force of Will",
  accent: 0xe8d8ad,
  maxHp: 110,
  summary: "An elegant legendary rapier whose resolve turns one killing blow per battle into a final, miraculous opening.",
  lightSummary: "Resolve Probe: a restrained thrust that keeps the line honest.",
  heavySummary: "Last Word: a composed counter-lunge that remains exact under pressure.",
  moveSpeed: 226,
  moveAcceleration: 1800,
  dashSpeed: 774,
  dashCooldown: 294,
  bladeLength: 96,
  bladeWidth: 5,
  guardSize: 28,
  lightAttack: {
    name: "Resolve Probe",
    damage: 21,
    range: 172,
    width: 15,
    recovery: 84,
    tint: 0xf4ead0
  },
  heavyAttack: {
    name: "Last Word",
    damage: 35,
    range: 222,
    width: 18,
    windup: 94,
    recovery: 140,
    lunge: 400,
    tint: 0xfff4d5
  },
  techniques: {
    identity: "Miraculous restraint under pressure.",
    traitPrimary: "Force of Will",
    traitSecondary: "Last stand",
    postBindGuardDamageScale: 0.62,
    nextAttackAfterBindBonus: 14,
    forceOfWillInvulnerabilityMs: WEAPON_TECH_TUNING.legendary.colada.invulnerabilityMs,
    forceOfWillMoveMultiplier: WEAPON_TECH_TUNING.legendary.colada.moveMultiplier,
    forceOfWillMoveDurationMs: WEAPON_TECH_TUNING.legendary.colada.moveDurationMs
  }
});

const estoc = forgeSword(thrustArmingSword, {
  id: "estoc",
  name: "Estoc",
  epithet: "Relentless pressure",
  accent: 0x93b0c1,
  maxHp: 120,
  summary: "A one-handed preview of the two-handed estoc line, rigid enough to bully armor with shorter committed drives.",
  lightSummary: "Rigid Entry: a shorter set-point thrust that already feels like a stripped-down estoc advance.",
  heavySummary: "Armor Gap Thrust: a compact anti-armor drive that foreshadows the two-handed version's linear force.",
  moveSpeed: 188,
  moveAcceleration: 1500,
  dashSpeed: 670,
  dashDuration: 144,
  dashCooldown: 360,
  bladeLength: 98,
  bladeWidth: 5,
  bodyWidth: 37,
  bodyHeight: 63,
  guardSize: 26,
  dashTrailLength: 62,
  dashTrailWidth: 11,
  lightAttack: {
    name: "Rigid Entry",
    shape: "thrust",
    damage: 24,
    range: 160,
    width: 16,
    windup: 76,
    active: 86,
    recovery: 108,
    lunge: 216,
    knockback: 266,
    tint: 0xa6becc
  },
  heavyAttack: {
    name: "Armor Gap Thrust",
    shape: "thrust",
    damage: 40,
    range: 196,
    width: 18,
    windup: 138,
    active: 90,
    recovery: 158,
    lunge: 304,
    knockback: 376,
    tint: 0xc4d4dc
  },
  techniques: {
    identity: "Compact estoc pressure.",
    traitPrimary: "Deep Wound",
    traitSecondary: "Piercing Point",
    bleedOnHeavyDamage: 6,
    bleedOnHeavyDurationMs: 2400,
    ignoreArmorOnThrust: true
  }
});

const reinforcedEstoc = forgeSword(estoc, {
  id: "reinforcedEstoc",
  name: "Reinforced Estoc",
  epithet: "Rigid linework",
  accent: 0xd6e1e8,
  maxHp: 122,
  summary: "A braced estoc that stiffens the line, deepens armor pressure, and prepares the branch for heavier two-handed commitment.",
  lightSummary: "Braced Point: a guided thrust that keeps the blade aligned through contact.",
  heavySummary: "Reinforced Drive: a stern committed thrust with better penetration and cleaner carry than the base estoc.",
  moveSpeed: 184,
  moveAcceleration: 1460,
  drag: 2060,
  dashSpeed: 658,
  dashDuration: 146,
  dashCooldown: 368,
  bladeLength: 100,
  bladeWidth: 6,
  guardSize: 27,
  dashTrailLength: 64,
  dashTrailWidth: 11,
  lightAttack: {
    name: "Braced Point",
    damage: 25,
    range: 166,
    width: 16,
    windup: 74,
    active: 88,
    recovery: 106,
    lunge: 220,
    knockback: 276,
    tint: 0xd1dde4
  },
  heavyAttack: {
    name: "Reinforced Drive",
    shape: "thrust",
    damage: 41,
    range: 200,
    width: 18,
    windup: 142,
    active: 90,
    recovery: 160,
    lunge: 310,
    knockback: 386,
    tint: 0xe7eef3
  },
  techniques: {
    identity: "Rigid anti-armor preparation.",
    traitPrimary: "Braced Point",
    traitSecondary: "Reinforced Spine",
    armorPierceRatio: 0.32,
    chargedHeavyBonus: 4,
    heavyCarryMultiplier: 1.14
  }
});

const twoHandedEstoc = forgeSword(reinforcedEstoc, {
  id: "twoHandedEstoc",
  name: "Two-Handed Estoc",
  epithet: "Unstoppable thrusts",
  accent: 0xb7cad6,
  maxHp: 126,
  summary: "A two-handed estoc tuned for armored targets, charged commitment, and driving force.",
  lightSummary: "Set Point: a disciplined setup thrust that preserves line before the drive.",
  heavySummary: "Driven Estoc: a charged thrust that becomes brutal when fully committed.",
  moveSpeed: 178,
  moveAcceleration: 1420,
  drag: 2080,
  dashSpeed: 646,
  dashDuration: 150,
  dashCooldown: 390,
  bladeLength: 104,
  bladeWidth: 6,
  guardSize: 28,
  dashTrailLength: 66,
  dashTrailWidth: 11,
  lightAttack: {
    name: "Set Point",
    damage: 27,
    range: 168,
    width: 16,
    windup: 80,
    active: 88,
    recovery: 110,
    lunge: 222,
    knockback: 280,
    tint: 0xc3d3de
  },
  heavyAttack: {
    name: "Driven Estoc",
    damage: 44,
    range: 204,
    width: 18,
    windup: 146,
    active: 90,
    recovery: 162,
    lunge: 318,
    knockback: 400,
    tint: 0xdce4ea
  },
  techniques: {
    identity: "Unstoppable thrusts.",
    traitPrimary: "Driving Force",
    traitSecondary: "Committed Strike",
    heavyCarryMultiplier: 1.28,
    chargedHeavyBonus: 8
  }
});

const panzerstecher = forgeSword(twoHandedEstoc, {
  id: "panzerstecher",
  name: "Panzerstecher",
  epithet: "Armored execution",
  accent: 0xc7d6df,
  maxHp: 128,
  summary: "A severe anti-armor estoc built to force deep lines through protection and turn precise thrusts into decisive finishers.",
  lightSummary: "Set Piercer: a rigid setup thrust that already slips into hard targets cleanly.",
  heavySummary: "Panzer Drive: a brutal anti-armor thrust with high reach and lethal precision.",
  moveSpeed: 174,
  moveAcceleration: 1400,
  drag: 2100,
  dashSpeed: 636,
  dashDuration: 150,
  dashCooldown: 394,
  bladeLength: 108,
  bladeWidth: 6,
  guardSize: 29,
  dashTrailLength: 68,
  dashTrailWidth: 11,
  lightAttack: {
    name: "Set Piercer",
    damage: 28,
    range: 172,
    width: 16,
    windup: 78,
    active: 88,
    recovery: 108,
    lunge: 228,
    knockback: 290,
    tint: 0xd0dde5
  },
  heavyAttack: {
    name: "Panzer Drive",
    damage: 47,
    range: 216,
    width: 18,
    windup: 148,
    active: 90,
    recovery: 160,
    lunge: 328,
    knockback: 414,
    tint: 0xe3eaef
  },
  techniques: {
    identity: "Precision against armor.",
    traitPrimary: "Armor Pierce",
    traitSecondary: "Precise Thrust",
    armorPierceRatio: 0.45,
    criticalChanceBonus: 0.12,
    criticalDamageMultiplier: 1.45
  }
});

const broadArmingSword = forgeSword(armingSword, {
  id: "broadArmingSword",
  name: "Broad Arming Sword",
  epithet: "Edge-focused control",
  accent: 0xd79659,
  maxHp: 124,
  summary: "A compact proto-falchion that already widens its cuts and treats every entry like a small lane-clearing cleave.",
  lightSummary: "Wide Cut: a smaller lane-owning slash that previews the falchion line's broad edge work.",
  heavySummary: "Short Cleave: a compact committed chop that feels like an early great-falchion overhead.",
  moveSpeed: 184,
  moveAcceleration: 1440,
  dashSpeed: 668,
  dashCooldown: 376,
  bodyWidth: 37,
  bodyHeight: 61,
  bladeLength: 80,
  bladeWidth: 8,
  guardSize: 25,
  dashTrailLength: 60,
  dashTrailWidth: 13,
  lightAttack: {
    name: "Wide Cut",
    shape: "sweep",
    damage: 25,
    range: 120,
    width: 68,
    windup: 86,
    active: 98,
    recovery: 120,
    lunge: 174,
    knockback: 318,
    tint: 0xd89f65
  },
  heavyAttack: {
    name: "Short Cleave",
    shape: "sweep",
    damage: 39,
    range: 146,
    width: 86,
    windup: 136,
    active: 104,
    recovery: 168,
    lunge: 210,
    knockback: 438,
    tint: 0xe2af78
  },
  techniques: {
    identity: "Compact proto-falchion.",
    traitPrimary: "Wide Cuts",
    traitSecondary: "Cleaving Force",
    sweepWidthBonus: 12,
    bonusDamageVsLightArmor: 4,
    heavyHitRecoveryScale: 0.86
  }
});

const falchion = forgeSword(broadArmingSword, {
  id: "falchion",
  name: "Falchion",
  epithet: "Bleeding aggression",
  accent: 0xc77743,
  maxHp: 120,
  summary: "A leaner preview of the great-falchion line, still quick enough to rush in but already built around heavier lane-clearing chops.",
  lightSummary: "Reaving Cut: a broad, hungry slash that starts to resemble a smaller heavy falchion reap.",
  heavySummary: "Forward Hew: a committed cleave that feels like an earlier version of the line's crushing overheads.",
  moveSpeed: 190,
  moveAcceleration: 1500,
  dashSpeed: 688,
  dashCooldown: 352,
  bodyWidth: 38,
  bodyHeight: 62,
  bladeLength: 84,
  bladeWidth: 9,
  guardSize: 26,
  dashTrailLength: 64,
  dashTrailWidth: 14,
  lightAttack: {
    name: "Reaving Cut",
    damage: 27,
    range: 122,
    width: 72,
    windup: 80,
    active: 96,
    recovery: 112,
    lunge: 182,
    knockback: 324,
    tint: 0xd18653
  },
  heavyAttack: {
    name: "Forward Hew",
    damage: 41,
    range: 150,
    width: 90,
    windup: 132,
    active: 104,
    recovery: 168,
    lunge: 212,
    knockback: 444,
    tint: 0xe29c67
  },
  techniques: {
    identity: "Lean proto-great-falchion.",
    traitPrimary: "Bleeding Edge",
    traitSecondary: "Overwhelm",
    bleedOnHitDamage: 4,
    bleedOnHitDurationMs: 1800,
    bleedStackStep: 2
  }
});

const heavyFalchion = forgeSword(falchion, {
  id: "heavyFalchion",
  name: "Heavy Falchion",
  epithet: "Finishing power",
  accent: 0xb86440,
  maxHp: 126,
  summary: "A smaller great falchion in practice, thick enough to pin lanes and set up the line's eventual overwhelming cleaves.",
  lightSummary: "Short Reap: a controlling sweep that now feels like a trimmed-down great-falchion press.",
  heavySummary: "Execution Chop: a compact overhead that already behaves like a lesser great-falchion finisher.",
  moveSpeed: 180,
  moveAcceleration: 1420,
  drag: 1980,
  dashSpeed: 654,
  dashDuration: 146,
  dashCooldown: 380,
  bodyWidth: 39,
  bodyHeight: 64,
  bladeLength: 88,
  bladeWidth: 10,
  guardSize: 27,
  dashTrailLength: 68,
  dashTrailWidth: 15,
  lightAttack: {
    name: "Short Reap",
    damage: 29,
    range: 120,
    width: 76,
    windup: 88,
    active: 100,
    recovery: 118,
    lunge: 176,
    knockback: 334,
    tint: 0xce7a57
  },
  heavyAttack: {
    name: "Execution Chop",
    damage: 45,
    range: 154,
    width: 96,
    windup: 144,
    active: 108,
    recovery: 178,
    lunge: 220,
    knockback: 474,
    tint: 0xe2926e
  },
  techniques: {
    identity: "Smaller great-falchion finisher.",
    traitPrimary: "Crushing Chop",
    traitSecondary: "Executioner's Edge",
    heavySlowFactor: 0.72,
    heavySlowDurationMs: 540,
    executeThreshold: 0.35,
    executeDamageBonus: 8
  }
});

const greatFalchion = forgeSword(heavyFalchion, {
  id: "greatFalchion",
  name: "Great Falchion",
  epithet: "Overwhelming offense",
  accent: 0xdfa970,
  maxHp: 132,
  summary: "A massive cleaving blade meant to overwhelm lanes with stuns, binds, and crushing overhead force.",
  lightSummary: "Pressing Sweep: a heavy setup cut that keeps foes under the edge.",
  heavySummary: "Overhead Cleave: a dramatic downward cleave with huge knockback and brief stun.",
  moveSpeed: 176,
  moveAcceleration: 1360,
  drag: 2080,
  dashSpeed: 640,
  dashDuration: 150,
  dashCooldown: 398,
  bladeLength: 94,
  bladeWidth: 10,
  guardSize: 28,
  lightAttack: {
    name: "Pressing Sweep",
    damage: 31,
    range: 142,
    width: 90,
    windup: 100,
    active: 112,
    recovery: 138,
    lunge: 188,
    knockback: 356,
    tint: 0xe0b07f
  },
  heavyAttack: {
    name: "Overhead Cleave",
    damage: 50,
    range: 170,
    width: 106,
    windup: 152,
    active: 122,
    recovery: 196,
    lunge: 226,
    knockback: 530,
    tint: 0xefc18f
  },
  techniques: {
    identity: "Overwhelming offense.",
    traitPrimary: "Strong Bind",
    traitSecondary: "Overhead Cleave",
    heavyStunMs: 140,
    heavyKnockbackMultiplier: 1.4
  }
});

const dusack = forgeSword(falchion, {
  id: "dusack",
  name: "Dusack",
  epithet: "Flowing training edge",
  accent: 0xd18957,
  maxHp: 116,
  summary: "A quicker training-side blade that trims weight, speeds recovery, and turns broad cuts into fast teaching combinations.",
  lightSummary: "Lesson Cut: a fast broad slash that resets cleanly into the next angle.",
  heavySummary: "Flowing Hew: a lighter committed cut that teaches pressure through cadence instead of mass.",
  moveSpeed: 198,
  moveAcceleration: 1560,
  dashSpeed: 706,
  dashDuration: 142,
  dashCooldown: 338,
  bodyWidth: 36,
  bodyHeight: 60,
  bladeLength: 78,
  bladeWidth: 8,
  guardSize: 24,
  dashTrailLength: 60,
  dashTrailWidth: 13,
  lightAttack: {
    name: "Lesson Cut",
    damage: 23,
    range: 116,
    width: 66,
    windup: 68,
    active: 94,
    recovery: 96,
    lunge: 180,
    knockback: 286,
    tint: 0xdd9b67
  },
  heavyAttack: {
    name: "Flowing Hew",
    damage: 36,
    range: 144,
    width: 82,
    windup: 118,
    active: 100,
    recovery: 146,
    lunge: 206,
    knockback: 402,
    tint: 0xebaf7e
  },
  techniques: {
    identity: "Fast broad-blade instruction.",
    traitPrimary: "Rolling Edge",
    traitSecondary: "Flowing Cuts",
    rollingEdgeRecoveryScalePerHit: WEAPON_TECH_TUNING.broad.rollingEdge.recoveryScalePerHit,
    rollingEdgeMaxStacks: WEAPON_TECH_TUNING.broad.rollingEdge.maxStacks
  }
});

const steelDusack = forgeSword(dusack, {
  id: "steelDusack",
  name: "Steel Dusack",
  epithet: "Passing cut",
  accent: 0xd8a66a,
  maxHp: 120,
  summary: "A hardened dusack that turns a clean moving sweep into a brief burst of footwork.",
  lightSummary: "Passing Lesson: a quick sweep that carries its wielder through the line.",
  heavySummary: "Steel Hew: a disciplined follow-through that keeps the cut compact.",
  moveSpeed: 204,
  moveAcceleration: 1640,
  dashSpeed: 724,
  dashCooldown: 326,
  bladeLength: 82,
  lightAttack: { name: "Passing Lesson", damage: 25, range: 122, width: 70, recovery: 92, tint: 0xe5b779 },
  heavyAttack: { name: "Steel Hew", damage: 39, range: 150, width: 86, recovery: 140, tint: 0xf0c58d },
  techniques: {
    identity: "Mobile broad-blade instruction.",
    traitPrimary: "Passing Cut",
    traitSecondary: "Rolling Edge",
    rollingEdgeRecoveryScalePerHit: WEAPON_TECH_TUNING.broad.rollingEdge.recoveryScalePerHit,
    rollingEdgeMaxStacks: WEAPON_TECH_TUNING.broad.rollingEdge.maxStacks,
    passingCutMoveMultiplier: WEAPON_TECH_TUNING.broad.passingCut.moveMultiplier,
    passingCutMoveDurationMs: WEAPON_TECH_TUNING.broad.passingCut.durationMs
  }
});

const mastersDusack = forgeSword(steelDusack, {
  id: "mastersDusack",
  name: "Master's Dusack",
  epithet: "Redirection",
  accent: 0xf0cf8c,
  maxHp: 122,
  summary: "A masterful broad trainer that redirects a Defensive Bind into one long, forceful answering sweep.",
  lightSummary: "Redirecting Cut: a quick sweep that steals the line back.",
  heavySummary: "Master's Lesson: a poised hew with uncommon reach after a defensive bind.",
  moveSpeed: 208,
  moveAcceleration: 1680,
  dashSpeed: 738,
  dashCooldown: 316,
  bladeLength: 86,
  lightAttack: { name: "Redirecting Cut", damage: 26, range: 128, width: 72, recovery: 90, tint: 0xf3d49c },
  heavyAttack: { name: "Master's Lesson", damage: 41, range: 156, width: 90, recovery: 138, tint: 0xffdfaa },
  techniques: {
    identity: "Defensive redirection into edge control.",
    traitPrimary: "Redirection",
    traitSecondary: "Passing Cut",
    rollingEdgeRecoveryScalePerHit: WEAPON_TECH_TUNING.broad.rollingEdge.recoveryScalePerHit,
    rollingEdgeMaxStacks: WEAPON_TECH_TUNING.broad.rollingEdge.maxStacks,
    passingCutMoveMultiplier: WEAPON_TECH_TUNING.broad.passingCut.moveMultiplier,
    passingCutMoveDurationMs: WEAPON_TECH_TUNING.broad.passingCut.durationMs,
    redirectionSweepRangeBonus: WEAPON_TECH_TUNING.broad.redirection.sweepRangeBonus,
    redirectionImpactMultiplier: WEAPON_TECH_TUNING.broad.redirection.impactMultiplier,
    redirectionWindowMs: WEAPON_TECH_TUNING.broad.redirection.windowMs
  }
});

const hangerSword = forgeSword(greatFalchion, {
  id: "hangerSword",
  name: "Hanger Sword",
  epithet: "Quick cleaving draw",
  accent: 0xe0a36e,
  maxHp: 124,
  summary: "A faster side-hanger evolved from the falchion line, keeping broad authority while drawing and striking more quickly into lighter targets.",
  lightSummary: "Quick Draw Cut: a fast edge-led opening cut that snaps out of guard.",
  heavySummary: "Cleaver Drop: a committed hanger chop that punishes lightly armored foes.",
  moveSpeed: 194,
  moveAcceleration: 1520,
  drag: 1900,
  dashSpeed: 698,
  dashDuration: 144,
  dashCooldown: 344,
  bodyWidth: 38,
  bodyHeight: 62,
  bladeLength: 90,
  bladeWidth: 9,
  guardSize: 26,
  dashTrailLength: 66,
  dashTrailWidth: 14,
  lightAttack: {
    name: "Quick Draw Cut",
    damage: 28,
    range: 136,
    width: 84,
    windup: 74,
    active: 106,
    recovery: 120,
    lunge: 194,
    knockback: 334,
    tint: 0xe2ad7a
  },
  heavyAttack: {
    name: "Cleaver Drop",
    damage: 46,
    range: 166,
    width: 100,
    windup: 132,
    active: 116,
    recovery: 170,
    lunge: 224,
    knockback: 500,
    tint: 0xefc190
  },
  techniques: {
    identity: "Fast broad finishing pressure.",
    traitPrimary: "Pursuit",
    traitSecondary: "Cleaver",
    bonusDamageVsLightArmor: 8,
    pursuitMoveMultiplier: WEAPON_TECH_TUNING.broad.pursuit.moveMultiplier,
    pursuitMoveDurationMs: WEAPON_TECH_TUNING.broad.pursuit.durationMs
  }
});

const navalCutlass = forgeSword(hangerSword, {
  id: "navalCutlass",
  name: "Naval Cutlass",
  epithet: "Boarding rush",
  accent: 0xf0b383,
  maxHp: 126,
  summary: "A close-fighting naval blade that keeps broad authority but leans into boarding rushes, short recoveries, and ugly deck-pressure.",
  lightSummary: "Boarding Cut: a fast short-arc slash meant to seize space on contact.",
  heavySummary: "Deck Break: a committed chop that cashes in after a rush or winning bind.",
  moveSpeed: 198,
  moveAcceleration: 1560,
  drag: 1860,
  dashSpeed: 720,
  dashDuration: 142,
  dashCooldown: 330,
  bladeLength: 86,
  bladeWidth: 9,
  guardSize: 28,
  dashTrailLength: 66,
  dashTrailWidth: 14,
  lightAttack: {
    name: "Boarding Cut",
    damage: 29,
    range: 132,
    width: 82,
    windup: 70,
    active: 102,
    recovery: 114,
    lunge: 198,
    knockback: 332,
    tint: 0xf0b17f
  },
  heavyAttack: {
    name: "Deck Break",
    damage: 47,
    range: 160,
    width: 98,
    windup: 128,
    active: 114,
    recovery: 164,
    lunge: 220,
    knockback: 486,
    tint: 0xf8c79a
  },
  techniques: {
    identity: "Sea-legged close pressure.",
    traitPrimary: "Boarding Rush",
    traitSecondary: "Boarding Step",
    dashAttackBonus: 8,
    dashRecoveryScale: 0.8,
    hitMoveBoostMultiplier: 1.1,
    hitMoveBoostDurationMs: 420,
    boardingStepStaminaRefund: WEAPON_TECH_TUNING.broad.boardingStep.staminaRefund
  }
});

const officersCutlass = forgeSword(navalCutlass, {
  id: "officersCutlass",
  name: "Officer's Cutlass",
  epithet: "Commanding edge",
  accent: 0xf5cd86,
  maxHp: 130,
  summary: "A disciplined boarding blade whose third clean sweep turns pressure into a commanding impact and extra Flow.",
  lightSummary: "Command Cut: a short arc that rewards a clean cadence.",
  heavySummary: "Deck Command: a decisive chop that holds the line after the third sweep.",
  moveSpeed: 202,
  moveAcceleration: 1600,
  dashSpeed: 736,
  dashCooldown: 318,
  bladeLength: 90,
  lightAttack: { name: "Command Cut", damage: 31, range: 138, width: 86, recovery: 108, tint: 0xf5c98d },
  heavyAttack: { name: "Deck Command", damage: 49, range: 166, width: 102, recovery: 160, tint: 0xffdb9e },
  techniques: {
    identity: "Cadenced boarding pressure.",
    traitPrimary: "Commanding Edge",
    traitSecondary: "Boarding Step",
    dashAttackBonus: 10,
    dashRecoveryScale: 0.8,
    boardingStepStaminaRefund: WEAPON_TECH_TUNING.broad.boardingStep.staminaRefund,
    commandingEdgeEvery: WEAPON_TECH_TUNING.broad.commandingEdge.every,
    commandingEdgeImpactMultiplier: WEAPON_TECH_TUNING.broad.commandingEdge.impactMultiplier,
    commandingEdgeFlowBonus: WEAPON_TECH_TUNING.broad.commandingEdge.flowBonus
  }
});

const executionFalchion = forgeSword(greatFalchion, {
  id: "executionFalchion",
  name: "Execution Falchion",
  epithet: "Headsman's edge",
  accent: 0xd47b59,
  maxHp: 136,
  summary: "A final broad blade that holds its damage for staggered, stunned, and guard-broken prey.",
  lightSummary: "Condemning Sweep: a wide cut that keeps a staggered foe in the lane.",
  heavySummary: "Headsman's Fall: a punishing execution cleave for a genuinely opened target.",
  moveSpeed: 178,
  moveAcceleration: 1380,
  dashSpeed: 646,
  dashCooldown: 394,
  bladeLength: 100,
  bladeWidth: 11,
  lightAttack: { name: "Condemning Sweep", damage: 33, range: 150, width: 96, recovery: 136, tint: 0xe39a76 },
  heavyAttack: { name: "Headsman's Fall", damage: 53, range: 178, width: 112, recovery: 188, tint: 0xf0ad85 },
  techniques: {
    identity: "Punish a real opening.",
    traitPrimary: "Headsman",
    traitSecondary: "Stagger execution",
    heavyStunMs: 130,
    headsmanDamageMultiplier: WEAPON_TECH_TUNING.broad.headsman.damageMultiplier
  }
});

const warFalchion = forgeSword(greatFalchion, {
  id: "warFalchion",
  name: "War Falchion",
  epithet: "Sundering edge",
  accent: 0xc56949,
  maxHp: 138,
  summary: "A final broad war blade whose charged heavy cuts break guarded lines and bite into armor.",
  lightSummary: "War Sweep: a weighty broad cut that establishes the lane.",
  heavySummary: "Sundering Hew: a charged cleave made to shatter guards rather than farm weak targets.",
  moveSpeed: 174,
  moveAcceleration: 1340,
  dashSpeed: 632,
  dashCooldown: 408,
  bladeLength: 102,
  bladeWidth: 11,
  lightAttack: { name: "War Sweep", damage: 32, range: 152, width: 98, recovery: 142, tint: 0xd9825f },
  heavyAttack: { name: "Sundering Hew", damage: 54, range: 182, width: 114, windup: 158, recovery: 194, tint: 0xea9d72 },
  techniques: {
    identity: "Charged cleaves against armor and guard.",
    traitPrimary: "Sundering Edge",
    traitSecondary: "Guard breaker",
    sunderingArmorPierceRatio: WEAPON_TECH_TUNING.broad.sundering.armorPierceRatio,
    sunderingImpactMultiplier: WEAPON_TECH_TUNING.broad.sundering.impactMultiplier,
    sunderingGuardBreakStunMs: WEAPON_TECH_TUNING.broad.sundering.guardBreakStunMs
  }
});

const hauswehr = forgeSword(armingSword, {
  id: "hauswehr",
  name: "Hauswehr",
  epithet: "House-knife ferocity",
  accent: 0x91715a,
  maxHp: 118,
  summary: "A short house blade that feels like a compact messer: quick entries, ugly cuts, and sharp disengages.",
  lightSummary: "Quick Slash: a close rushing cut that already feels like a smaller messer passing attack.",
  heavySummary: "Hook Draw: a short committed chop that previews the branch's nastier hewing arc.",
  moveSpeed: 198,
  moveAcceleration: 1580,
  drag: 1860,
  dashSpeed: 716,
  dashDuration: 140,
  dashCooldown: 334,
  bodyWidth: 34,
  bodyHeight: 58,
  bladeLength: 68,
  bladeWidth: 7,
  guardSize: 20,
  dashTrailLength: 56,
  dashTrailWidth: 12,
  lightAttack: {
    name: "Quick Slash",
    shape: "sweep",
    damage: 23,
    range: 108,
    width: 54,
    windup: 70,
    active: 88,
    recovery: 100,
    lunge: 178,
    knockback: 292,
    tint: 0xa7866d
  },
  heavyAttack: {
    name: "Hook Draw",
    shape: "sweep",
    damage: 37,
    range: 132,
    width: 66,
    windup: 122,
    active: 96,
    recovery: 154,
    lunge: 208,
    knockback: 408,
    tint: 0xba9a7c
  },
  techniques: {
    identity: "A smaller messer in hand.",
    traitPrimary: "Street Step",
    traitSecondary: "Hooking Cut",
    dashAttackBonus: 6,
    dashRefundOnHit: 60,
    dashRecoveryScale: 0.88
  }
});

const messer = forgeSword(hauswehr, {
  id: "messer",
  name: "Messer",
  epithet: "Hit-and-run brutality",
  accent: 0x8e6e55,
  maxHp: 116,
  summary: "A compact kriegsmesser preview: still quick on the feet, but already trying to turn movement into ugly committed chops.",
  lightSummary: "Passing Cut: a lean rushing slash that hints at the kriegsmesser's longer driving cuts.",
  heavySummary: "Hooking Hew: a smaller brutal chop that previews the branch's nastier finishing arc.",
  moveSpeed: 200,
  moveAcceleration: 1600,
  drag: 1840,
  dashSpeed: 728,
  dashDuration: 142,
  dashCooldown: 326,
  bodyWidth: 35,
  bodyHeight: 59,
  bladeLength: 78,
  bladeWidth: 8,
  guardSize: 21,
  dashTrailLength: 60,
  dashTrailWidth: 13,
  lightAttack: {
    name: "Passing Cut",
    shape: "sweep",
    damage: 24,
    range: 116,
    width: 58,
    windup: 72,
    active: 90,
    recovery: 102,
    lunge: 184,
    knockback: 300,
    tint: 0xa28369
  },
  heavyAttack: {
    name: "Hooking Hew",
    shape: "sweep",
    damage: 40,
    range: 140,
    width: 74,
    windup: 130,
    active: 98,
    recovery: 162,
    lunge: 220,
    knockback: 426,
    tint: 0xb79878
  },
  techniques: {
    identity: "Compact kriegsmesser preview.",
    traitPrimary: "Ruthless Tempo",
    traitSecondary: "Street Survivor",
    dashAttackBonus: 8,
    dashRecoveryScale: 0.84,
    ruthlessTempoStaminaDiscount: WEAPON_TECH_TUNING.messer.ruthlessTempo.staminaDiscount
  }
});

const kriegsmesser = forgeSword(messer, {
  id: "kriegsmesser",
  name: "Kriegsmesser",
  epithet: "Relentless brutality",
  accent: 0xa58267,
  maxHp: 124,
  summary: "A larger war knife lineage that turns binds into fury and keeps heavy pressure cycling.",
  lightSummary: "Driving Cut: a heavier cut that carries forward momentum.",
  heavySummary: "Brutal Hew: a savage finishing blow that feeds the next chase.",
  moveSpeed: 192,
  moveAcceleration: 1520,
  dashSpeed: 706,
  dashDuration: 146,
  dashCooldown: 340,
  bladeLength: 88,
  bladeWidth: 8,
  guardSize: 23,
  lightAttack: {
    name: "Driving Cut",
    damage: 27,
    range: 124,
    width: 60,
    windup: 78,
    active: 92,
    recovery: 106,
    lunge: 188,
    knockback: 314,
    tint: 0xb29378
  },
  heavyAttack: {
    name: "Brutal Hew",
    damage: 44,
    range: 146,
    width: 78,
    windup: 136,
    active: 102,
    recovery: 166,
    lunge: 222,
    knockback: 448,
    tint: 0xcaa98c
  },
  techniques: {
    identity: "Relentless brutality.",
    traitPrimary: "No Respite",
    traitSecondary: "Fury",
    nextAttackAfterBindBonus: 10,
    heavyHitDashRefund: 150,
    noRespiteHeavyRecoveryScale: WEAPON_TECH_TUNING.messer.noRespite.heavyRecoveryScale
  }
});

const grossesMesser = forgeSword(kriegsmesser, {
  id: "grossesMesser",
  name: "Grosses Messer",
  epithet: "Heavy cleaving chase",
  accent: 0xb18d71,
  maxHp: 130,
  summary: "A larger war knife that broadens the kriegsmesser line into heavier arcs while keeping hits flowing into the next one.",
  lightSummary: "Cleaving Pass: a heavier passing cut that starts carrying whole lanes with it.",
  heavySummary: "Momentum Hew: a brutal broad chop that feeds the next swing when it lands.",
  moveSpeed: 186,
  moveAcceleration: 1480,
  drag: 1960,
  dashSpeed: 686,
  dashDuration: 148,
  dashCooldown: 350,
  bodyWidth: 40,
  bodyHeight: 64,
  bladeLength: 94,
  bladeWidth: 9,
  guardSize: 24,
  dashTrailLength: 68,
  dashTrailWidth: 15,
  lightAttack: {
    name: "Cleaving Pass",
    damage: 30,
    range: 132,
    width: 70,
    windup: 82,
    active: 96,
    recovery: 112,
    lunge: 194,
    knockback: 334,
    tint: 0xc19e81
  },
  heavyAttack: {
    name: "Momentum Hew",
    damage: 47,
    range: 154,
    width: 88,
    windup: 140,
    active: 106,
    recovery: 170,
    lunge: 230,
    knockback: 484,
    tint: 0xd0b193
  },
  techniques: {
    identity: "Heavy cleaving momentum.",
    traitPrimary: "Crushing Followthrough",
    traitSecondary: "Momentum",
    sweepWidthBonus: 14,
    lightHitRecoveryScale: 0.88,
    heavyHitRecoveryScale: 0.9,
    crushingFollowthroughImpactMultiplier: WEAPON_TECH_TUNING.messer.crushingFollowthrough.impactMultiplier
  }
});

const langesMesser = forgeSword(grossesMesser, {
  id: "langesMesser",
  name: "Langes Messer",
  epithet: "Long anti-armor knife",
  accent: 0xc49f80,
  maxHp: 132,
  summary: "A longer messer lineage that gains real reach and enough half-sword authority to threaten armored targets more honestly.",
  lightSummary: "Long Pass: a reaching cut that keeps knife-line pressure at sword distance.",
  heavySummary: "Half-Sword Spike: a long committed thrust for closing into armor gaps.",
  moveSpeed: 184,
  moveAcceleration: 1460,
  drag: 1980,
  dashSpeed: 682,
  dashDuration: 148,
  dashCooldown: 352,
  bodyWidth: 40,
  bodyHeight: 65,
  bladeLength: 100,
  bladeWidth: 9,
  guardSize: 25,
  dashTrailLength: 70,
  dashTrailWidth: 15,
  lightAttack: {
    name: "Long Pass",
    damage: 31,
    range: 142,
    width: 72,
    windup: 84,
    active: 98,
    recovery: 114,
    lunge: 198,
    knockback: 340,
    tint: 0xcfab8b
  },
  heavyAttack: {
    name: "Half-Sword Spike",
    shape: "thrust",
    damage: 48,
    range: 176,
    width: 18,
    windup: 138,
    active: 94,
    recovery: 164,
    lunge: 278,
    knockback: 432,
    tint: 0xe0bea0
  },
  techniques: {
    identity: "Long rogue anti-armor pressure.",
    traitPrimary: "Long Reach",
    traitSecondary: "Half-Sword",
    armorPierceRatio: 0.24,
    thrustRangeBonus: 10,
    longReachFlowBonus: WEAPON_TECH_TUNING.messer.longReach.flowBonus
  }
});

const twoHandedMesser = forgeSword(langesMesser, {
  id: "twoHandedMesser",
  name: "Two-Handed Messer",
  epithet: "Brutal long-knife force",
  accent: 0xd2b190,
  maxHp: 136,
  summary: "A two-handed messer that turns the rogue line into brutal sweeping authority without losing its ugly chase rhythm.",
  lightSummary: "Murder Pass: a long cleaving cut that carries knife-line pressure at sword length.",
  heavySummary: "Two-Handed Hew: a savage finishing stroke that stuns, launches, and keeps the chase alive.",
  moveSpeed: 180,
  moveAcceleration: 1440,
  drag: 2020,
  dashSpeed: 676,
  dashDuration: 150,
  dashCooldown: 346,
  bladeLength: 106,
  bladeWidth: 10,
  guardSize: 26,
  dashTrailLength: 72,
  dashTrailWidth: 16,
  lightAttack: {
    name: "Murder Pass",
    damage: 33,
    range: 148,
    width: 78,
    windup: 86,
    active: 100,
    recovery: 116,
    lunge: 202,
    knockback: 350,
    tint: 0xdab998
  },
  heavyAttack: {
    name: "Two-Handed Hew",
    damage: 51,
    range: 170,
    width: 94,
    windup: 144,
    active: 110,
    recovery: 172,
    lunge: 238,
    knockback: 506,
    tint: 0xe7c6a6
  },
  techniques: {
    identity: "Two-handed rogue brutality.",
    traitPrimary: "No Quarter",
    traitSecondary: "Biting Chase",
    armorPierceRatio: 0.3,
    heavyStunMs: 160,
    heavyHitDashRefund: 180,
    heavyKnockbackMultiplier: 1.18,
    noQuarterOffensiveBindRefund: WEAPON_TECH_TUNING.messer.noQuarter.offensiveBindRefund,
    noQuarterNextHeavyDamageMultiplier: WEAPON_TECH_TUNING.messer.noQuarter.nextHeavyDamageMultiplier,
    noQuarterWindowMs: WEAPON_TECH_TUNING.messer.noQuarter.windowMs
  }
});

const heavyKriegsmesser = forgeSword(grossesMesser, {
  id: "heavyKriegsmesser",
  name: "Heavy Kriegsmesser",
  epithet: "Brutal commitment",
  accent: 0xb7785f,
  maxHp: 136,
  summary: "A heavier kriegsmesser whose charged hews scale with the stamina truly committed to the attack.",
  lightSummary: "Weighty Pass: a deliberate cut that keeps pressure moving forward.",
  heavySummary: "Committed Hew: a charged blow that rewards entering with real reserves.",
  moveSpeed: 178,
  moveAcceleration: 1400,
  dashSpeed: 654,
  dashCooldown: 386,
  bladeLength: 100,
  bladeWidth: 10,
  lightAttack: { name: "Weighty Pass", damage: 32, range: 142, width: 78, recovery: 120, tint: 0xc88d73 },
  heavyAttack: { name: "Committed Hew", damage: 52, range: 166, width: 98, windup: 150, recovery: 182, tint: 0xdfa084 },
  techniques: {
    identity: "Bounded heavy commitment.",
    traitPrimary: "Brutal Commitment",
    traitSecondary: "No Respite",
    noRespiteHeavyRecoveryScale: WEAPON_TECH_TUNING.messer.noRespite.heavyRecoveryScale,
    brutalCommitmentMaxDamageBonus: WEAPON_TECH_TUNING.messer.brutalCommitment.maxDamageBonus
  }
});

const executionMesser = forgeSword(heavyKriegsmesser, {
  id: "executionMesser",
  name: "Execution Messer",
  epithet: "Sentence",
  accent: 0xd19272,
  maxHp: 138,
  summary: "A brutal final messer that turns a real Guard Break into one brief, violent execution window.",
  lightSummary: "Sentence Cut: a heavy line check against a stunned enemy.",
  heavySummary: "Final Sentence: a crushing follow-through that never becomes an automatic kill.",
  moveSpeed: 176,
  moveAcceleration: 1380,
  dashSpeed: 642,
  dashCooldown: 398,
  bladeLength: 104,
  bladeWidth: 11,
  lightAttack: { name: "Sentence Cut", damage: 34, range: 148, width: 84, recovery: 124, tint: 0xe0a282 },
  heavyAttack: { name: "Final Sentence", damage: 55, range: 174, width: 104, windup: 154, recovery: 188, tint: 0xf0b18d },
  techniques: {
    identity: "Strong execution only after a genuine break.",
    traitPrimary: "Sentence",
    traitSecondary: "Crushing Followthrough",
    crushingFollowthroughImpactMultiplier: WEAPON_TECH_TUNING.messer.crushingFollowthrough.impactMultiplier,
    sentenceDamageMultiplier: WEAPON_TECH_TUNING.messer.sentence.damageMultiplier,
    sentenceHitstopMs: WEAPON_TECH_TUNING.messer.sentence.hitstopMs
  }
});

const warMesser = forgeSword(kriegsmesser, {
  id: "warMesser",
  name: "War Messer",
  epithet: "Forward pressure",
  accent: 0xae8067,
  maxHp: 130,
  summary: "A field-ready messer that turns clean forward pressure into quicker recoveries rather than larger raw numbers.",
  lightSummary: "Forward Pass: a driving cut that speeds the next reset if it lands clean.",
  heavySummary: "Field Hew: a forward committed chop built for sustained pressure.",
  moveSpeed: 196,
  moveAcceleration: 1580,
  dashSpeed: 714,
  dashCooldown: 332,
  bladeLength: 94,
  lightAttack: { name: "Forward Pass", damage: 29, range: 132, width: 66, recovery: 104, tint: 0xc09278 },
  heavyAttack: { name: "Field Hew", damage: 47, range: 154, width: 84, recovery: 162, tint: 0xd4a38a },
  techniques: {
    identity: "Forward-moving war pressure.",
    traitPrimary: "Forward Pressure",
    traitSecondary: "No Respite",
    noRespiteHeavyRecoveryScale: WEAPON_TECH_TUNING.messer.noRespite.heavyRecoveryScale,
    forwardPressureRecoveryScale: WEAPON_TECH_TUNING.messer.forwardPressure.recoveryScale
  }
});

const feldmesser = forgeSword(warMesser, {
  id: "feldmesser",
  name: "Feldmesser",
  epithet: "Campaigner",
  accent: 0xc69a78,
  maxHp: 134,
  summary: "A campaign blade that can keep one hard-won Flow chain alive through a single damaging mistake each encounter.",
  lightSummary: "Campaign Cut: a practical cut that keeps the march alive.",
  heavySummary: "Marching Hew: a grounded blow for continuing the advance.",
  moveSpeed: 194,
  moveAcceleration: 1560,
  dashSpeed: 706,
  dashCooldown: 338,
  bladeLength: 98,
  lightAttack: { name: "Campaign Cut", damage: 31, range: 138, width: 72, recovery: 106, tint: 0xd6ad88 },
  heavyAttack: { name: "Marching Hew", damage: 49, range: 160, width: 90, recovery: 166, tint: 0xe6bd96 },
  techniques: {
    identity: "One durable pressure chain per encounter.",
    traitPrimary: "Campaigner",
    traitSecondary: "Forward Pressure",
    forwardPressureRecoveryScale: WEAPON_TECH_TUNING.messer.forwardPressure.recoveryScale,
    campaignerFlowWindowMs: WEAPON_TECH_TUNING.messer.campaigner.flowWindowMs
  }
});

const landsknechtMesser = forgeSword(feldmesser, {
  id: "landsknechtMesser",
  name: "Landsknecht Messer",
  epithet: "Relentless",
  accent: 0xe1bd8d,
  maxHp: 136,
  summary: "A final pressure messer that earns increasing movement only while clean attacks keep the enemy under real threat.",
  lightSummary: "Relentless Pass: a driving cut that builds campaign tempo.",
  heavySummary: "Landsknecht Hew: a heavy check that keeps the pressure alive without banking it forever.",
  moveSpeed: 198,
  moveAcceleration: 1620,
  dashSpeed: 722,
  dashCooldown: 322,
  bladeLength: 102,
  lightAttack: { name: "Relentless Pass", damage: 32, range: 144, width: 74, recovery: 102, tint: 0xe8c798 },
  heavyAttack: { name: "Landsknecht Hew", damage: 51, range: 166, width: 94, recovery: 164, tint: 0xf3d0a2 },
  techniques: {
    identity: "Momentum that disappears at true neutral.",
    traitPrimary: "Relentless",
    traitSecondary: "Campaigner",
    campaignerFlowWindowMs: 0,
    relentlessMoveStep: WEAPON_TECH_TUNING.messer.relentless.moveStep,
    relentlessMaxStacks: WEAPON_TECH_TUNING.messer.relentless.maxStacks,
    relentlessDurationMs: WEAPON_TECH_TUNING.messer.relentless.durationMs
  }
});

const fechtmesser = forgeSword(messer, {
  id: "fechtmesser",
  name: "Fechtmesser",
  epithet: "Countercut",
  accent: 0xa7c0af,
  maxHp: 120,
  summary: "A technical messer split that turns a Standard Bind into one empowered light countercut.",
  lightSummary: "Countercut: a quick blade answer after a clean bind.",
  heavySummary: "Line Hew: a reserved committed cut that preserves technical timing.",
  moveSpeed: 206,
  moveAcceleration: 1660,
  dashSpeed: 742,
  dashCooldown: 314,
  bladeLength: 82,
  lightAttack: { name: "Countercut", damage: 26, range: 122, width: 60, recovery: 94, tint: 0xb9d1bf },
  heavyAttack: { name: "Line Hew", damage: 40, range: 148, width: 76, recovery: 148, tint: 0xc9dfce },
  techniques: {
    identity: "Technical bind counterplay.",
    traitPrimary: "Countercut",
    traitSecondary: "Ruthless Tempo",
    ruthlessTempoStaminaDiscount: WEAPON_TECH_TUNING.messer.ruthlessTempo.staminaDiscount,
    countercutLightDamageMultiplier: WEAPON_TECH_TUNING.messer.countercut.lightDamageMultiplier,
    countercutWindowMs: WEAPON_TECH_TUNING.messer.countercut.windowMs
  }
});

const longFechtmesser = forgeSword(fechtmesser, {
  id: "longFechtmesser",
  name: "Long Fechtmesser",
  epithet: "Indes",
  accent: 0xc4d9c7,
  maxHp: 122,
  summary: "A longer fencing messer whose Perfect Bind creates a small, sharp next-attack timing window.",
  lightSummary: "Indes Cut: a quick line change that comes faster after perfection.",
  heavySummary: "Long Answer: a measured hew that retains fencing precision.",
  moveSpeed: 204,
  moveAcceleration: 1640,
  dashSpeed: 736,
  dashCooldown: 320,
  bladeLength: 92,
  lightAttack: { name: "Indes Cut", damage: 27, range: 134, width: 62, recovery: 96, tint: 0xd0e2d2 },
  heavyAttack: { name: "Long Answer", damage: 42, range: 158, width: 78, recovery: 150, tint: 0xddecdc },
  techniques: {
    identity: "Perfect bind timing into initiative.",
    traitPrimary: "Indes",
    traitSecondary: "Countercut",
    countercutLightDamageMultiplier: WEAPON_TECH_TUNING.messer.countercut.lightDamageMultiplier,
    countercutWindowMs: WEAPON_TECH_TUNING.messer.countercut.windowMs,
    indesWindupScale: WEAPON_TECH_TUNING.messer.indes.windupScale,
    indesWindowMs: WEAPON_TECH_TUNING.messer.indes.windowMs
  }
});

const mastersMesser = forgeSword(longFechtmesser, {
  id: "mastersMesser",
  name: "Master's Messer",
  epithet: "Vor",
  accent: 0xe0efcf,
  maxHp: 124,
  summary: "A final technical messer that converts a truly perfect measure into one quicker, harder initiative answer.",
  lightSummary: "Vor Cut: a precise answer that makes exact measure matter.",
  heavySummary: "Master's Answer: a compact heavy line that cashes in the next initiative.",
  moveSpeed: 210,
  moveAcceleration: 1700,
  dashSpeed: 752,
  dashCooldown: 304,
  bladeLength: 96,
  lightAttack: { name: "Vor Cut", damage: 28, range: 140, width: 64, recovery: 92, tint: 0xe8f5dc },
  heavyAttack: { name: "Master's Answer", damage: 44, range: 164, width: 80, recovery: 146, tint: 0xf2ffe8 },
  techniques: {
    identity: "Exact measure into the initiative.",
    traitPrimary: "Vor",
    traitSecondary: "Indes",
    indesWindupScale: WEAPON_TECH_TUNING.messer.indes.windupScale,
    indesWindowMs: WEAPON_TECH_TUNING.messer.indes.windowMs,
    vorRecoveryScale: WEAPON_TECH_TUNING.messer.vor.recoveryScale,
    vorImpactMultiplier: WEAPON_TECH_TUNING.messer.vor.impactMultiplier,
    vorWindowMs: WEAPON_TECH_TUNING.messer.vor.windowMs
  }
});

const BASE_SWORD_DEFINITIONS: Record<SwordId, SwordDefinition> = {
  rapier,
  armingSword,
  montante,
  spanishMontante,
  twoHandedMontante,
  mastersMontante,
  warArmingSword,
  longsword,
  excalibur,
  tizona,
  colada,
  greatsword,
  zweihander,
  flamberge,
  landsknechtZweihander,
  claymore,
  highlandClaymore,
  lowlandTwoHandedClaymore,
  cavalryArmingSword,
  oakeshottTypeXVIIIc,
  renaissanceCavalrySword,
  heavyCavalrySword,
  thrustArmingSword,
  borderDuelSword,
  sidesword,
  courtRapier,
  mastersRapier,
  needleblade,
  pappenheimerRapier,
  estoc,
  twoHandedEstoc,
  panzerstecher,
  reinforcedEstoc,
  broadArmingSword,
  falchion,
  heavyFalchion,
  greatFalchion,
  hangerSword,
  navalCutlass,
  dusack,
  steelDusack,
  mastersDusack,
  officersCutlass,
  executionFalchion,
  warFalchion,
  hauswehr,
  messer,
  kriegsmesser,
  grossesMesser,
  langesMesser,
  twoHandedMesser,
  heavyKriegsmesser,
  executionMesser,
  warMesser,
  feldmesser,
  landsknechtMesser,
  fechtmesser,
  longFechtmesser,
  mastersMesser
};

const FINAL_SWORD_TUNING: Record<SwordId, SwordOverrides> = {
  armingSword: {
    maxHp: 126,
    heavyAttack: {
      damage: 35
    },
    techniques: {
      staminaMaxBonus: 4,
      measureBonusDamage: 1,
      bindImpactMultiplier: 1.02
    }
  },
  rapier: {
    maxHp: 104,
    lightAttack: {
      damage: 17
    },
    heavyAttack: {
      damage: 29,
      recovery: 146
    },
    techniques: {
      measureBonusDamage: 3,
      staminaRegenBonus: 1,
      dashStaminaCostModifier: -1
    }
  },
  montante: {
    maxHp: 132,
    heavyAttack: {
      damage: 50,
      recovery: 192
    },
    techniques: {
      staminaMaxBonus: 8,
      bindImpactMultiplier: 1.1
    }
  },
  spanishMontante: {
    maxHp: 136,
    lightAttack: {
      recovery: 148
    },
    techniques: {
      staminaMaxBonus: 8,
      measureBonusDamage: 1,
      bindImpactMultiplier: 1.12
    }
  },
  twoHandedMontante: {
    maxHp: 140,
    heavyAttack: {
      damage: 55
    },
    techniques: {
      staminaMaxBonus: 10,
      bindImpactMultiplier: 1.14
    }
  },
  mastersMontante: {
    maxHp: 144,
    lightAttack: {
      damage: 34
    },
    techniques: {
      staminaMaxBonus: 10,
      measureBonusDamage: 2,
      bindImpactMultiplier: 1.16
    }
  },
  warArmingSword: {
    maxHp: 128,
    heavyAttack: {
      damage: 41
    },
    techniques: {
      staminaMaxBonus: 4,
      bindImpactMultiplier: 1.06
    }
  },
  longsword: {
    maxHp: 126,
    lightAttack: {
      damage: 25
    },
    techniques: {
      staminaRegenBonus: 1,
      dashStaminaCostModifier: -1,
      measureBonusDamage: 1
    }
  },
  excalibur: {},
  tizona: {},
  colada: {},
  greatsword: {
    maxHp: 136,
    heavyAttack: {
      damage: 49
    },
    techniques: {
      staminaMaxBonus: 6,
      bindImpactMultiplier: 1.12
    }
  },
  zweihander: {
    maxHp: 140,
    lightAttack: {
      range: 168
    },
    techniques: {
      staminaMaxBonus: 6,
      bindImpactMultiplier: 1.14
    }
  },
  flamberge: {
    maxHp: 142,
    heavyAttack: {
      damage: 54
    },
    techniques: {
      staminaMaxBonus: 6,
      staminaRegenBonus: 1,
      bindImpactMultiplier: 1.12
    }
  },
  landsknechtZweihander: {
    maxHp: 142,
    dashCooldown: 384,
    techniques: {
      staminaMaxBonus: 6,
      dashStaminaCostModifier: -1,
      bindImpactMultiplier: 1.12
    }
  },
  claymore: {
    maxHp: 138,
    lightAttack: {
      recovery: 132
    },
    techniques: {
      staminaRegenBonus: 1,
      dashStaminaCostModifier: -1,
      bindImpactMultiplier: 1.08
    }
  },
  highlandClaymore: {
    maxHp: 142,
    heavyAttack: {
      damage: 53
    },
    techniques: {
      staminaMaxBonus: 8,
      bindImpactMultiplier: 1.1
    }
  },
  lowlandTwoHandedClaymore: {
    maxHp: 140,
    heavyAttack: {
      recovery: 156
    },
    techniques: {
      staminaRegenBonus: 1,
      measureBonusDamage: 2,
      bindImpactMultiplier: 1.06
    }
  },
  cavalryArmingSword: {
    maxHp: 128,
    dashCooldown: 348,
    techniques: {
      dashStaminaCostModifier: -2,
      measureBonusDamage: 1
    }
  },
  oakeshottTypeXVIIIc: {
    maxHp: 130,
    heavyAttack: {
      range: 180
    },
    techniques: {
      dashStaminaCostModifier: -1,
      measureBonusDamage: 2
    }
  },
  renaissanceCavalrySword: {
    maxHp: 132,
    techniques: {
      staminaRegenBonus: 1,
      dashStaminaCostModifier: -2,
      measureBonusDamage: 2
    }
  },
  heavyCavalrySword: {
    maxHp: 136,
    heavyAttack: {
      damage: 46
    },
    techniques: {
      staminaMaxBonus: 4,
      dashStaminaCostModifier: -1,
      bindImpactMultiplier: 1.08
    }
  },
  thrustArmingSword: {
    maxHp: 120,
    lightAttack: {
      damage: 20
    },
    techniques: {
      staminaRegenBonus: 1,
      dashStaminaCostModifier: -1,
      measureBonusDamage: 2
    }
  },
  borderDuelSword: {
    maxHp: 116,
    lightAttack: {
      damage: 22
    },
    techniques: {
      dashStaminaCostModifier: -2,
      measureBonusDamage: 1
    }
  },
  sidesword: {
    maxHp: 120,
    lightAttack: {
      damage: 22
    },
    techniques: {
      staminaRegenBonus: 1,
      dashStaminaCostModifier: -1,
      measureBonusDamage: 2
    }
  },
  courtRapier: {
    maxHp: 102,
    heavyAttack: {
      damage: 31
    },
    techniques: {
      staminaRegenBonus: 1,
      dashStaminaCostModifier: -2,
      measureBonusDamage: 3
    }
  },
  mastersRapier: {
    maxHp: 100,
    heavyAttack: {
      damage: 32
    },
    techniques: {
      staminaRegenBonus: 2,
      dashStaminaCostModifier: -2,
      measureBonusDamage: 4
    }
  },
  needleblade: {
    maxHp: 98,
    lightAttack: {
      damage: 19
    },
    techniques: {
      dashStaminaCostModifier: -2,
      measureBonusDamage: 5
    }
  },
  pappenheimerRapier: {
    maxHp: 106,
    heavyAttack: {
      damage: 33
    },
    techniques: {
      staminaMaxBonus: 4,
      measureBonusDamage: 2,
      bindImpactMultiplier: 1.04
    }
  },
  estoc: {
    maxHp: 122,
    heavyAttack: {
      damage: 41
    },
    techniques: {
      staminaMaxBonus: 4,
      measureBonusDamage: 1,
      bindImpactMultiplier: 1.04
    }
  },
  reinforcedEstoc: {
    maxHp: 124,
    heavyAttack: {
      damage: 42
    },
    techniques: {
      staminaMaxBonus: 6,
      bindImpactMultiplier: 1.06
    }
  },
  twoHandedEstoc: {
    maxHp: 128,
    heavyAttack: {
      damage: 45
    },
    techniques: {
      staminaMaxBonus: 8,
      bindImpactMultiplier: 1.08
    }
  },
  panzerstecher: {
    maxHp: 130,
    heavyAttack: {
      damage: 48
    },
    techniques: {
      staminaMaxBonus: 8,
      measureBonusDamage: 2,
      bindImpactMultiplier: 1.1
    }
  },
  broadArmingSword: {
    maxHp: 126,
    heavyAttack: {
      damage: 40
    },
    techniques: {
      staminaMaxBonus: 4,
      bindImpactMultiplier: 1.06
    }
  },
  falchion: {
    maxHp: 122,
    lightAttack: {
      damage: 28
    },
    techniques: {
      staminaRegenBonus: 1,
      bindImpactMultiplier: 1.07
    }
  },
  heavyFalchion: {
    maxHp: 128,
    heavyAttack: {
      damage: 46
    },
    techniques: {
      staminaMaxBonus: 6,
      bindImpactMultiplier: 1.1
    }
  },
  greatFalchion: {
    maxHp: 134,
    heavyAttack: {
      damage: 51
    },
    techniques: {
      staminaMaxBonus: 8,
      bindImpactMultiplier: 1.14
    }
  },
  dusack: {
    maxHp: 118,
    lightAttack: {
      damage: 24
    },
    techniques: {
      staminaRegenBonus: 2,
      dashStaminaCostModifier: -2
    }
  },
  steelDusack: {},
  mastersDusack: {},
  hangerSword: {
    maxHp: 126,
    lightAttack: {
      recovery: 116
    },
    techniques: {
      dashStaminaCostModifier: -1,
      bindImpactMultiplier: 1.08
    }
  },
  navalCutlass: {
    maxHp: 128,
    dashCooldown: 322,
    techniques: {
      staminaRegenBonus: 1,
      dashStaminaCostModifier: -3,
      bindImpactMultiplier: 1.08
    }
  },
  officersCutlass: {},
  executionFalchion: {},
  warFalchion: {},
  hauswehr: {
    maxHp: 120,
    lightAttack: {
      damage: 24
    },
    techniques: {
      staminaRegenBonus: 1,
      dashStaminaCostModifier: -2
    }
  },
  messer: {
    maxHp: 118,
    lightAttack: {
      damage: 25
    },
    techniques: {
      staminaRegenBonus: 1,
      dashStaminaCostModifier: -2
    }
  },
  kriegsmesser: {
    maxHp: 126,
    heavyAttack: {
      damage: 45
    },
    techniques: {
      dashStaminaCostModifier: -1,
      bindImpactMultiplier: 1.08
    }
  },
  grossesMesser: {
    maxHp: 132,
    heavyAttack: {
      damage: 48
    },
    techniques: {
      staminaMaxBonus: 4,
      bindImpactMultiplier: 1.1
    }
  },
  langesMesser: {
    maxHp: 134,
    heavyAttack: {
      damage: 49
    },
    techniques: {
      staminaMaxBonus: 4,
      measureBonusDamage: 1,
      bindImpactMultiplier: 1.08
    }
  },
  twoHandedMesser: {
    maxHp: 138,
    heavyAttack: {
      damage: 52
    },
    techniques: {
      staminaMaxBonus: 8,
      bindImpactMultiplier: 1.14
    }
  },
  heavyKriegsmesser: {},
  executionMesser: {},
  warMesser: {},
  feldmesser: {},
  landsknechtMesser: {},
  fechtmesser: {},
  longFechtmesser: {},
  mastersMesser: {}
};

export const SWORD_DEFINITIONS: Record<SwordId, SwordDefinition> = Object.fromEntries(
  (Object.keys(BASE_SWORD_DEFINITIONS) as SwordId[]).map((id) => [id, forgeSword(BASE_SWORD_DEFINITIONS[id], FINAL_SWORD_TUNING[id])])
) as Record<SwordId, SwordDefinition>;

export const SWORD_ORDER: SwordId[] = ["armingSword", "rapier", "montante"];
