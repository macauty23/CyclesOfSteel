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
  },
  apexTooth: {
    id: "apexTooth",
    name: "Apex Tooth",
    summary: "A pressure predator's jagged trophy.",
    detail: "Dashing through an enemy primes a short damage surge, letting pressure turn into a punish window.",
    accent: 0x63b7cf,
    regionId: "shore",
    sourceBossId: "apex"
  },
  seraphHalo: {
    id: "seraphHalo",
    name: "Seraph Halo",
    summary: "A ring of cooling white flame.",
    detail: "Fire lingers on hit and fast repositioning keeps your offense alive.",
    accent: 0xf0a66e,
    regionId: "volcano",
    sourceBossId: "enflamed"
  },
  duelistRibbon: {
    id: "duelistRibbon",
    name: "Duelist Ribbon",
    summary: "A frayed honor-mark from a finished match.",
    detail: "Perfect binds restore extra stamina and keep disciplined counterplay flowing.",
    accent: 0xd6c48f,
    regionId: "kingdom",
    sourceBossId: "honored"
  },
  exaltedCore: {
    id: "exaltedCore",
    name: "Exalted Core",
    summary: "A ward-engine still humming with old commands.",
    detail: "Defense hardens and heavy blows gain ritual weight.",
    accent: 0xa4c4e6,
    regionId: "ancientRuins",
    sourceBossId: "exalted"
  },
  permafrostToken: {
    id: "permafrostToken",
    name: "Permafrost Token",
    summary: "A cold charm wrapped in worn dueling cord.",
    detail: "Standing still briefly charges the next strike, and exact hits still chill the target.",
    accent: 0xb8e8f8,
    regionId: "frozenPeaks",
    sourceBossId: "permafrost"
  },
  blueSocket: {
    id: "blueSocket",
    name: "Blue Socket",
    summary: "A cursed little trinket that hums when you stand still.",
    detail: "Thrust lines stay cleaner and sharp movement after a poke is a little easier.",
    accent: 0x7bc8ff,
    regionId: "skyIslands",
    sourceBossId: "skelecar"
  },
  approvalStamp: {
    id: "approvalStamp",
    name: "Approval Stamp",
    summary: "A sealed mark that somehow feels judgmental.",
    detail: "Committed strikes land harder and your footing holds a touch better under pressure.",
    accent: 0xe0a36f,
    regionId: "forgottenTemple",
    sourceBossId: "danu"
  },
  sunlitBrand: {
    id: "sunlitBrand",
    name: "Sunlit Brand",
    summary: "A holy seal that wants every strike to feel final.",
    detail: "Huge damage gains, but your stamina pool shrinks to a dangerous size.",
    accent: 0xf1d780,
    regionId: "sacredGrove",
    isCursed: true
  },
  oathglassSeal: {
    id: "oathglassSeal",
    name: "Oathglass Seal",
    summary: "A brittle vow that only respects perfect answers.",
    detail: "Perfect binds become far more rewarding, but every mistake hurts much more.",
    accent: 0x92c0df,
    regionId: "ancientRuins",
    isCursed: true
  },
  celerityCurse: {
    id: "celerityCurse",
    name: "Celerity Curse",
    summary: "A racing sigil that refuses to let the duel breathe.",
    detail: "You become dramatically faster, but the run gets more fragile.",
    accent: 0xe6977b,
    regionId: "skyIslands",
    isCursed: true
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
      return;
    case "apexTooth":
      stats.moveAcceleration += 70;
      stats.dashSpeed += 22;
      stats.heavyAttack.lunge += 10;
      stats.dashPassDamageBonus += 8;
      stats.dashPassBuffDurationMs = Math.max(stats.dashPassBuffDurationMs, 1200);
      return;
    case "seraphHalo":
      stats.moveSpeed += 8;
      stats.dashSpeed += 14;
      stats.onHitBurnDamage += 2;
      stats.onHitBurnDurationMs += 1200;
      return;
    case "duelistRibbon":
      stats.parryWindow += 12;
      stats.parryStunMs += 48;
      stats.perfectBindStaminaRestoreBonus += 14;
      stats.heavyAttack.recovery = Math.max(54, stats.heavyAttack.recovery - 8);
      return;
    case "exaltedCore":
      stats.maxHp += 10;
      stats.incomingDamageScale -= 0.07;
      stats.heavyAttack.impact.controlLossMs += 24;
      stats.heavyAttack.damage += 3;
      return;
    case "permafrostToken":
      stats.lightAttack.range += 8;
      stats.heavyAttack.range += 6;
      stats.stillnessChargeMs = 700;
      stats.stillnessMaxStacks = Math.max(stats.stillnessMaxStacks, 3);
      stats.stillnessDamagePerStack += 3;
      stats.onHitSlowFactor = Math.min(stats.onHitSlowFactor, 0.74);
      stats.onHitSlowDurationMs += 900;
      return;
    case "blueSocket":
      stats.lightAttack.range += 12;
      stats.heavyAttack.range += 10;
      stats.moveAcceleration += 70;
      stats.lightAttack.recovery = Math.max(44, stats.lightAttack.recovery - 8);
      return;
    case "approvalStamp":
      stats.maxHp += 6;
      stats.heavyAttack.damage += 2;
      stats.heavyAttack.impact.controlLossMs += 18;
      stats.incomingDamageScale -= 0.04;
      return;
    case "sunlitBrand":
      stats.lightAttack.damage += 10;
      stats.heavyAttack.damage += 14;
      stats.staminaMax = Math.max(44, Math.round(stats.staminaMax * 0.55));
      stats.staminaRegen = Math.max(6, stats.staminaRegen - 4);
      return;
    case "oathglassSeal":
      stats.parryWindow += 28;
      stats.parryStunMs += 90;
      stats.perfectBindStaminaRestoreBonus += 26;
      stats.maxHp -= 12;
      stats.incomingDamageScale += 0.18;
      return;
    case "celerityCurse":
      stats.moveSpeed += 18;
      stats.moveAcceleration += 120;
      stats.dashSpeed += 48;
      stats.dashCooldown -= 46;
      stats.lightAttack.recovery = Math.max(40, stats.lightAttack.recovery - 10);
      stats.heavyAttack.recovery = Math.max(56, stats.heavyAttack.recovery - 14);
      stats.maxHp -= 16;
      stats.incomingDamageScale += 0.1;
  }
}
