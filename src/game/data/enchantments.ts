import type { CombatStats, EnchantmentDefinition, EnchantmentId } from "../core/types";

export const ENCHANTMENTS: Record<EnchantmentId, EnchantmentDefinition> = {
  flame: {
    id: "flame",
    name: "Flame",
    summary: "Burning strikes.",
    detail: "Hits set enemies alight for a short damage-over-time burn.",
    accent: 0xe38857,
    biasMaterialId: "brimstone",
    biasCost: { brimstone: 2 }
  },
  frost: {
    id: "frost",
    name: "Frost",
    summary: "Cold control.",
    detail: "Hits slow enemy reactions and movement.",
    accent: 0x8cc0ee,
    biasMaterialId: "crystal",
    biasCost: { crystal: 2 }
  },
  volt: {
    id: "volt",
    name: "Volt",
    summary: "Charged tempo.",
    detail: "Increases movement speed and attack pace.",
    accent: 0xc9d965,
    biasMaterialId: "stormglass",
    biasCost: { stormglass: 2 }
  },
  terra: {
    id: "terra",
    name: "Terra",
    summary: "Grounded defense.",
    detail: "Makes parries easier and softens incoming damage.",
    accent: 0x9db177,
    biasMaterialId: "amber",
    biasCost: { amber: 2 }
  },
  blessed: {
    id: "blessed",
    name: "Blessed",
    summary: "Sharp holy pressure.",
    detail: "You swing faster and hit notably harder.",
    accent: 0xead39d,
    biasMaterialId: "blossom",
    biasCost: { blossom: 2 }
  }
};

export const ENCHANTMENT_ORDER: EnchantmentId[] = ["flame", "frost", "volt", "terra", "blessed"];

export function applyEnchantmentToStats(stats: CombatStats, enchantmentId: EnchantmentId): void {
  switch (enchantmentId) {
    case "flame":
      stats.lightAttack.damage += 1;
      stats.heavyAttack.damage += 2;
      stats.onHitBurnDamage += 4;
      stats.onHitBurnDurationMs = Math.max(stats.onHitBurnDurationMs, 2200);
      return;
    case "frost":
      stats.lightAttack.impact.controlLossMs += 14;
      stats.heavyAttack.impact.controlLossMs += 18;
      stats.onHitSlowFactor = Math.min(stats.onHitSlowFactor, 0.78);
      stats.onHitSlowDurationMs = Math.max(stats.onHitSlowDurationMs, 1050);
      return;
    case "volt":
      stats.moveSpeed += 16;
      stats.moveAcceleration += 120;
      stats.lightAttack.windup = Math.max(40, stats.lightAttack.windup - 8);
      stats.heavyAttack.windup = Math.max(56, stats.heavyAttack.windup - 10);
      return;
    case "terra":
      stats.parryWindow += 24;
      stats.parryReflectRatio += 0.06;
      stats.incomingDamageScale *= 0.88;
      return;
    case "blessed":
      stats.lightAttack.damage += 4;
      stats.heavyAttack.damage += 6;
      stats.lightAttack.windup = Math.max(40, stats.lightAttack.windup - 10);
      stats.heavyAttack.windup = Math.max(56, stats.heavyAttack.windup - 12);
  }
}
