import type { CombatStats, RunModifierDefinition, RunModifierId } from "../core/types";

export const RUN_MODIFIERS: Record<RunModifierId, RunModifierDefinition> = {
  measuredApproach: {
    id: "measuredApproach",
    category: "space",
    name: "Measured Approach",
    summary: "Cleaner spacing, slower exits.",
    detail: "+10 range, +10 bind window, -10 move speed.",
    accent: 0x8cb4d9
  },
  guardTax: {
    id: "guardTax",
    category: "control",
    name: "Guard Tax",
    summary: "Safer binds, heavier legs.",
    detail: "+18 bind window, +0.05 reflect, -12 dash speed.",
    accent: 0xb7a16e
  },
  bloodRush: {
    id: "bloodRush",
    category: "tempo",
    name: "Blood Rush",
    summary: "Faster rhythm, less forgiveness.",
    detail: "+12 move speed, +3 stamina regen, -10 max HP.",
    accent: 0xb86b62
  },
  narrowGate: {
    id: "narrowGate",
    category: "commitment",
    name: "Narrow Gate",
    summary: "Harder punishes, slower turns.",
    detail: "+5 heavy damage, +10 heavy range, -6 light speed.",
    accent: 0x8f7cb2
  },
  longStep: {
    id: "longStep",
    category: "space",
    name: "Long Step",
    summary: "More reach, tighter stamina.",
    detail: "+12 reach, +16 dash speed, +4 dash cost.",
    accent: 0x78a072
  },
  ironPulse: {
    id: "ironPulse",
    category: "stamina",
    name: "Iron Pulse",
    summary: "More breath, less snap.",
    detail: "+18 stamina, +2 regen, -8 move speed.",
    accent: 0x7e8d9f
  },
  lessonOfSteel: {
    id: "lessonOfSteel",
    category: "commitment",
    name: "Lesson of Steel",
    summary: "Heavy structure, harder finishes.",
    detail: "+6 heavy damage, +10 heavy control loss, -4 move speed.",
    accent: 0x9e6e67
  },
  footworkDrill: {
    id: "footworkDrill",
    category: "tempo",
    name: "Footwork Drill",
    summary: "Cleaner movement and recovery.",
    detail: "+14 move speed, -8 dash cooldown.",
    accent: 0x6b9aa5
  },
  bindStudy: {
    id: "bindStudy",
    category: "control",
    name: "Bind Study",
    summary: "Safer binds and steadier contact.",
    detail: "+14 bind window, +0.04 reflect.",
    accent: 0xb2a178
  },
  breathingCadence: {
    id: "breathingCadence",
    category: "stamina",
    name: "Breathing Cadence",
    summary: "Longer breath, calmer rhythm.",
    detail: "+16 stamina, +3 regen.",
    accent: 0x7a9a73
  },
  cuttingForms: {
    id: "cuttingForms",
    category: "space",
    name: "Cutting Forms",
    summary: "Better edge reach and wider cuts.",
    detail: "+10 sweep width, +8 heavy range.",
    accent: 0xc69a62
  },
  heavyPact: {
    id: "heavyPact",
    category: "commitment",
    name: "Heavy Pact",
    summary: "Heavy attacks are free. Light attacks are weakened.",
    detail: "Heavy attacks cost no stamina, but light attacks deal about half damage.",
    accent: 0xb56f5b
  },
  arcaneDebt: {
    id: "arcaneDebt",
    category: "control",
    name: "Arcane Debt",
    summary: "No more sword upgrades. Enchantments are free.",
    detail: "Tech tree unlocks are sealed for the rest of the run, but enchantment rolls cost nothing.",
    accent: 0x8e79b7
  },
  glassTempo: {
    id: "glassTempo",
    category: "tempo",
    name: "Glass Tempo",
    summary: "Faster attacks, less forgiveness.",
    detail: "Both attacks cycle faster, but incoming damage rises.",
    accent: 0x70a9a8
  }
};

export const RUN_MODIFIER_ORDER: RunModifierId[] = [
  "measuredApproach",
  "guardTax",
  "bloodRush",
  "narrowGate",
  "longStep",
  "ironPulse",
  "lessonOfSteel",
  "footworkDrill",
  "bindStudy",
  "breathingCadence",
  "cuttingForms",
  "heavyPact",
  "arcaneDebt",
  "glassTempo"
];

export const DRAMATIC_RUN_MODIFIER_IDS: RunModifierId[] = ["heavyPact", "arcaneDebt", "glassTempo"];

export function applyRunModifierToStats(stats: CombatStats, modifierId: RunModifierId): void {
  switch (modifierId) {
    case "measuredApproach":
      stats.lightAttack.range += 10;
      stats.heavyAttack.range += 10;
      stats.parryWindow += 10;
      stats.moveSpeed -= 10;
      return;
    case "guardTax":
      stats.parryWindow += 18;
      stats.parryReflectRatio += 0.05;
      stats.dashSpeed -= 12;
      return;
    case "bloodRush":
      stats.moveSpeed += 12;
      stats.staminaRegen += 3;
      stats.maxHp -= 10;
      return;
    case "narrowGate":
      stats.heavyAttack.damage += 5;
      stats.heavyAttack.range += 10;
      stats.lightAttack.windup = Math.max(40, stats.lightAttack.windup + 6);
      return;
    case "longStep":
      stats.lightAttack.range += 12;
      stats.heavyAttack.range += 12;
      stats.dashSpeed += 16;
      stats.dashStaminaCost += 4;
      return;
    case "ironPulse":
      stats.staminaMax += 18;
      stats.staminaRegen += 2;
      stats.moveSpeed -= 8;
      return;
    case "lessonOfSteel":
      stats.heavyAttack.damage += 6;
      stats.heavyAttack.impact.controlLossMs += 10;
      stats.moveSpeed -= 4;
      return;
    case "footworkDrill":
      stats.moveSpeed += 14;
      stats.dashCooldown -= 8;
      return;
    case "bindStudy":
      stats.parryWindow += 14;
      stats.parryReflectRatio += 0.04;
      return;
    case "breathingCadence":
      stats.staminaMax += 16;
      stats.staminaRegen += 3;
      return;
    case "cuttingForms":
      for (const attack of [stats.lightAttack, stats.heavyAttack]) {
        if (attack.shape === "sweep") {
          attack.width += 10;
        }
      }
      stats.heavyAttack.range += 8;
      return;
    case "heavyPact":
      stats.heavyAttack.staminaCost = 0;
      stats.lightAttack.damage = Math.max(1, Math.round(stats.lightAttack.damage * 0.55));
      return;
    case "arcaneDebt":
      return;
    case "glassTempo":
      stats.lightAttack.windup = Math.max(40, Math.round(stats.lightAttack.windup * 0.88));
      stats.heavyAttack.windup = Math.max(56, Math.round(stats.heavyAttack.windup * 0.88));
      stats.lightAttack.recovery = Math.max(44, Math.round(stats.lightAttack.recovery * 0.9));
      stats.heavyAttack.recovery = Math.max(54, Math.round(stats.heavyAttack.recovery * 0.9));
      stats.incomingDamageScale *= 1.12;
  }
}
