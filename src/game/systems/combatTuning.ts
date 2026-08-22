import type { GuardType } from "../core/types";

/**
 * First-pass combat polish values. Keep state-machine timings here so the
 * guard/bind feel can be tuned without hunting through scene code.
 */
export const COMBAT_TUNING = {
  bind: {
    decisionWindowMs: 400,
    initialStunMs: 84,
    perfectInitialStunMs: 118,
    offensiveStaminaCost: 22,
    standardDamageMultiplier: 1,
    defensiveDamageMultiplier: 0.12,
    defensiveProjectileDamageMultiplier: 0.72,
    offensiveDamageMultiplier: 2.15,
    defensiveImpactMultiplier: 2.35,
    defensivePerfectImpactMultiplier: 2.85,
    offensiveImpactMultiplier: 1.7,
    offensivePerfectImpactMultiplier: 2.15,
    defensiveStunMs: 520,
    offensiveStunMs: 650,
    perfectStunBonusMs: 140
  },
  guard: {
    movementScale: 0.62,
    breakStaggerMs: 680,
    blockBaseCost: 7,
    blockDamageFactor: 0.78,
    blockDisplacementFactor: 0.035,
    heavyBlockBonus: 7,
    cleaveBlockBonus: 5,
    chargedBlockBonus: 6,
    type: {
      plow: { passiveDrainPerSecond: 4.5, blockCostMultiplier: 1 },
      day: { passiveDrainPerSecond: 9, blockCostMultiplier: 1.22 },
      ox: { passiveDrainPerSecond: 6, blockCostMultiplier: 1.1 },
      fool: { passiveDrainPerSecond: 3, blockCostMultiplier: 1 }
    } satisfies Record<GuardType, { passiveDrainPerSecond: number; blockCostMultiplier: number }>
  },
  guardExit: {
    plowBindImpactMultiplier: 1.5,
    plowBindWindowMs: 5000,
    dayDamageMultiplier: 1.5,
    dayStrikeWindowMs: 2000,
    oxDamageMultiplier: 1.15,
    oxRangeMultiplier: 1.25,
    oxArmorPierceBonus: 0.25,
    oxStrikeWindowMs: 2000
  },
  fool: {
    baitWindowMs: 1400,
    punishWindowMs: 1150,
    punishDamageMultiplier: 2,
    impactFrameMs: 76
  }
} as const;
