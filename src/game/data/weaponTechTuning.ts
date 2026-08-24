/**
 * Tuning for the expanded weapon-tech endpoints.  Technique flags live on
 * SwordTechniqueProfile; these numbers keep their combat values in one place.
 */
export const WEAPON_TECH_TUNING = {
  broad: {
    rollingEdge: { recoveryScalePerHit: 0.04, maxStacks: 3 },
    passingCut: { moveMultiplier: 1.12, durationMs: 520 },
    redirection: { windowMs: 1100, sweepRangeBonus: 24, impactMultiplier: 1.32 },
    pursuit: { moveMultiplier: 1.14, durationMs: 440 },
    boardingStep: { staminaRefund: 7 },
    commandingEdge: { every: 3, impactMultiplier: 1.42, flowBonus: 1 },
    headsman: { damageMultiplier: 1.32 },
    sundering: { armorPierceRatio: 0.48, impactMultiplier: 1.38, guardBreakStunMs: 390 }
  },
  messer: {
    ruthlessTempo: { staminaDiscount: 4 },
    noRespite: { heavyRecoveryScale: 0.76 },
    crushingFollowthrough: { impactMultiplier: 1.28 },
    longReach: { flowBonus: 1 },
    noQuarter: { offensiveBindRefund: 14, nextHeavyDamageMultiplier: 1.26, windowMs: 1100 },
    brutalCommitment: { maxDamageBonus: 15 },
    sentence: { damageMultiplier: 1.48, hitstopMs: 46 },
    forwardPressure: { recoveryScale: 0.82 },
    campaigner: { flowWindowMs: 700 },
    relentless: { moveStep: 0.035, maxStacks: 5, durationMs: 620 },
    countercut: { lightDamageMultiplier: 1.24, windowMs: 1050 },
    indes: { windupScale: 0.7, windowMs: 1050 },
    vor: { recoveryScale: 0.72, impactMultiplier: 1.28, windowMs: 950 }
  },
  legendary: {
    tizona: {
      cooldownMs: 28000,
      flameDurationMs: 6500,
      baseDamageBonus: 4,
      cleanHitDamageStep: 2,
      maxCleanHitStacks: 5,
      flowDamageBonus: 2,
      dominionDamageBonus: 5,
      burnBaseDamage: 5,
      burnCleanHitStep: 1,
      burnDurationMs: 1700
    },
    colada: {
      invulnerabilityMs: 2500,
      moveMultiplier: 1.28,
      moveDurationMs: 820
    }
  }
} as const;

