import type { CombatStats, RelicDefinition, RelicId } from "../core/types";

export const RELICS: Record<RelicId, RelicDefinition> = {
  foundrySeal: {
    id: "foundrySeal",
    name: "Foundry Seal",
    summary: "The seal of a dead forge-master.",
    detail: "Heavy attacks strike with more weight and steel drops increase.",
    accent: 0xc78e65,
    regionId: "volcano"
  },
  greenwayCompass: {
    id: "greenwayCompass",
    name: "Greenway Compass",
    summary: "A ranger's route marker.",
    detail: "Footwork improves and wood-rich paths pay out more cleanly.",
    accent: 0x78a06a,
    regionId: "forest"
  },
  sanctumLens: {
    id: "sanctumLens",
    name: "Sanctum Lens",
    summary: "A cut jewel for reading measure.",
    detail: "Parries and thrust reach improve.",
    accent: 0x90afe3,
    regionId: "kingdom"
  },
  coastlineCharm: {
    id: "coastlineCharm",
    name: "Coastline Charm",
    summary: "A salt-worn sailor token.",
    detail: "Dash rhythm smooths out and stamina recovery rises.",
    accent: 0x6ea6be,
    regionId: "shore"
  },
  starfallDiadem: {
    id: "starfallDiadem",
    name: "Starfall Diadem",
    summary: "A relic shard from the deep vault.",
    detail: "Late-expedition power that sharpens nearly everything a little.",
    accent: 0xb898de,
    regionId: "frozenPeaks"
  }
};

export function applyRelicToStats(stats: CombatStats, relicId: RelicId): void {
  switch (relicId) {
    case "foundrySeal":
      stats.heavyAttack.damage += 4;
      stats.heavyAttack.impact.displacement += 24;
      stats.bonusDrops += 1;
      return;
    case "greenwayCompass":
      stats.moveSpeed += 8;
      stats.moveAcceleration += 80;
      stats.pickupRadius += 10;
      return;
    case "sanctumLens":
      stats.parryWindow += 14;
      stats.heavyAttack.range += 10;
      stats.lightAttack.range += 8;
      return;
    case "coastlineCharm":
      stats.dashCooldown -= 28;
      stats.staminaRegen += 2;
      stats.dashSpeed += 20;
      return;
    case "starfallDiadem":
      stats.lightAttack.damage += 2;
      stats.heavyAttack.damage += 3;
      stats.parryReflectRatio += 0.05;
      stats.staminaMax += 6;
  }
}
