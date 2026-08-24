import type { BiomeBossId } from "../core/types";

/**
 * Shared boss redesign values. Keep mechanical pacing here so encounter feel
 * can be tuned without scattering phase and resistance numbers through AI.
 */
export const BOSS_TUNING = {
  phaseTransitionMs: 1180,
  resolve: {
    max: 100,
    gainPerPressureHit: 8,
    heavyHitBonus: 3,
    naturalDecayPerSecond: 3.8,
    neutralResetDelayMs: 1550,
    neutralDecayPerSecond: 12,
    initiativeDecay: 18,
    maxDamageMitigation: 0.3,
    maxImpactMitigation: 0.42,
    dominionPenetration: 0.74
  },
  apex: {
    missedChargeRecoveryMs: [760, 620, 460],
    currentDurationMs: [2900, 3200, 2200],
    crossingCooldownMs: 5200
  },
  enflamed: {
    predictionLeadMs: [620, 680, 760],
    prophecyLanceDelayMs: 220,
    prophecyDiveDelayMs: 180
  },
  honored: {
    feintChancePhase2: 0.32,
    retreatReclaimDistanceMultiplier: 1.18
  },
  exalted: {
    bindReconfigurationDelayMs: 1150,
    phaseThreeReconfigurationMs: 3000
  },
  permafrost: {
    patienceInitiativeMs: [0, 0, 1900],
    phaseTwoFeintChance: 0.3
  },
  phaseThreeCadence: {
    apex: 0.78,
    enflamed: 0.76,
    honored: 0.82,
    exalted: 0.86,
    permafrost: 1.04
  } satisfies Record<BiomeBossId, number>
} as const;
