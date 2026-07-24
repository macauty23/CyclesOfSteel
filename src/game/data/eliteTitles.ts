import type { EliteTitleId, EnemyArmorTier, MaterialCost } from "../core/types";

export interface EliteTitleDefinition {
  id: EliteTitleId;
  name: string;
  summary: string;
  hpMultiplier: number;
  speedMultiplier: number;
  accelerationMultiplier: number;
  aggressionDelta: number;
  damageBonus: number;
  armorOverride?: EnemyArmorTier;
  rewardBonus?: MaterialCost;
}

export const ELITE_TITLES: Record<EliteTitleId, EliteTitleDefinition> = {
  swift: {
    id: "swift",
    name: "Swift",
    summary: "Cuts arrive sooner, but the body behind them is lighter.",
    hpMultiplier: 0.9,
    speedMultiplier: 1.18,
    accelerationMultiplier: 1.14,
    aggressionDelta: 0.06,
    damageBonus: -1
  },
  ironclad: {
    id: "ironclad",
    name: "Ironclad",
    summary: "Slower, heavier, and harder to break cleanly.",
    hpMultiplier: 1.2,
    speedMultiplier: 0.86,
    accelerationMultiplier: 0.88,
    aggressionDelta: -0.02,
    damageBonus: 2,
    armorOverride: "heavy",
    rewardBonus: {
      steel: 1
    }
  },
  duelist: {
    id: "duelist",
    name: "Duelist",
    summary: "More poised in measure and more eager to answer hesitation.",
    hpMultiplier: 0.96,
    speedMultiplier: 1.08,
    accelerationMultiplier: 1.06,
    aggressionDelta: 0.1,
    damageBonus: 1
  },
  frenzied: {
    id: "frenzied",
    name: "Frenzied",
    summary: "Breakneck pressure trades away some staying power.",
    hpMultiplier: 0.88,
    speedMultiplier: 1.12,
    accelerationMultiplier: 1.1,
    aggressionDelta: 0.14,
    damageBonus: 2,
    rewardBonus: {
      leather: 1
    }
  },
  warden: {
    id: "warden",
    name: "Warden",
    summary: "Plants its feet, holds space, and punishes sloppy entries.",
    hpMultiplier: 1.12,
    speedMultiplier: 0.92,
    accelerationMultiplier: 0.94,
    aggressionDelta: -0.04,
    damageBonus: 1,
    rewardBonus: {
      gemstone: 1
    }
  }
};

export const ELITE_TITLE_IDS = Object.keys(ELITE_TITLES) as EliteTitleId[];

export function getEliteTitleDefinition(titleId: EliteTitleId): EliteTitleDefinition {
  return ELITE_TITLES[titleId];
}
