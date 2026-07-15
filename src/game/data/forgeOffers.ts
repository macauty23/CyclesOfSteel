import type { CombatStats, ForgeOfferDefinition, ForgeOfferId } from "../core/types";

export const FORGE_OFFERS: Record<ForgeOfferId, ForgeOfferDefinition> = {
  duelistStep: {
    id: "duelistStep",
    category: "tempo",
    name: "Duelist Step",
    summary: "A slightly quicker step.",
    detail: "+10 move speed.",
    accent: 0x406d8d
  },
  threadedPoint: {
    id: "threadedPoint",
    category: "space",
    name: "Threaded Point",
    summary: "Thrusting attacks extend a little.",
    detail: "+8 thrust range.",
    accent: 0xa6c8ef
  },
  sweepingRings: {
    id: "sweepingRings",
    category: "space",
    name: "Sweeping Rings",
    summary: "Wide swings cover a little more air.",
    detail: "+10 sweep width.",
    accent: 0xd59a5b
  },
  temperedWeight: {
    id: "temperedWeight",
    category: "commitment",
    name: "Tempered Weight",
    summary: "Heavy attacks land harder.",
    detail: "+4 heavy damage.",
    accent: 0xa45149
  },
  quickdrawLatch: {
    id: "quickdrawLatch",
    category: "tempo",
    name: "Quickdraw Latch",
    summary: "Light attacks start a touch faster.",
    detail: "-8% light windup.",
    accent: 0x4e8e7a
  },
  anchoredGrip: {
    id: "anchoredGrip",
    category: "control",
    name: "Anchored Grip",
    summary: "Attacks keep a little more steering.",
    detail: "+0.06 attack control.",
    accent: 0x706ea0
  },
  magnetPommel: {
    id: "magnetPommel",
    category: "control",
    name: "Magnet Pommel",
    summary: "Steel pulls in from a little farther out.",
    detail: "+18 pickup radius.",
    accent: 0x6f9092
  },
  silverFiligree: {
    id: "silverFiligree",
    category: "stamina",
    name: "Silver Filigree",
    summary: "A small reserve of breathing room.",
    detail: "+8 stamina max.",
    accent: 0xbec6d0
  },
  longMarch: {
    id: "longMarch",
    category: "stamina",
    name: "Long March",
    summary: "Breath returns a little faster.",
    detail: "+1 stamina regen.",
    accent: 0x799b62
  },
  lineFeint: {
    id: "lineFeint",
    category: "tempo",
    name: "Line Feint",
    summary: "The hands recover a little cleaner.",
    detail: "-6 light recovery.",
    accent: 0x5a8d99
  },
  measuredGrip: {
    id: "measuredGrip",
    category: "control",
    name: "Measured Grip",
    summary: "Parries get a touch more forgiving.",
    detail: "+10 bind window.",
    accent: 0x8798b5
  },
  marchingCalves: {
    id: "marchingCalves",
    category: "stamina",
    name: "Marching Calves",
    summary: "A little more reserve in long exchanges.",
    detail: "+10 stamina max, +1 stamina regen.",
    accent: 0x7c9468
  },
  edgeAwareness: {
    id: "edgeAwareness",
    category: "space",
    name: "Edge Awareness",
    summary: "Cuts stay a little truer through space.",
    detail: "+6 light range, +8 heavy range.",
    accent: 0xd3a46a
  },
  coiledLunge: {
    id: "coiledLunge",
    category: "commitment",
    name: "Coiled Lunge",
    summary: "Committed entries travel a little farther.",
    detail: "+14 heavy lunge.",
    accent: 0x9d5d56
  }
};

export const FORGE_OFFER_ORDER: ForgeOfferId[] = [
  "duelistStep",
  "threadedPoint",
  "sweepingRings",
  "temperedWeight",
  "quickdrawLatch",
  "anchoredGrip",
  "magnetPommel",
  "silverFiligree",
  "longMarch",
  "lineFeint",
  "measuredGrip",
  "marchingCalves",
  "edgeAwareness",
  "coiledLunge"
];

export function applyForgeOfferToStats(stats: CombatStats, offerId: ForgeOfferId): void {
  switch (offerId) {
    case "duelistStep":
      stats.moveSpeed += 10;
      return;
    case "threadedPoint":
      for (const attack of [stats.lightAttack, stats.heavyAttack]) {
        if (attack.shape === "thrust") {
          attack.range += 8;
        }
      }
      return;
    case "sweepingRings":
      for (const attack of [stats.lightAttack, stats.heavyAttack]) {
        if (attack.shape === "sweep") {
          attack.width += 10;
        }
      }
      return;
    case "temperedWeight":
      stats.heavyAttack.damage += 4;
      return;
    case "quickdrawLatch":
      stats.lightAttack.windup = Math.max(40, Math.round(stats.lightAttack.windup * 0.92));
      return;
    case "anchoredGrip":
      stats.attackControlWindup = Math.min(0.82, stats.attackControlWindup + 0.06);
      stats.attackControlActive = Math.min(0.55, stats.attackControlActive + 0.06);
      return;
    case "magnetPommel":
      stats.pickupRadius += 18;
      return;
    case "silverFiligree":
      stats.staminaMax += 8;
      return;
    case "longMarch":
      stats.staminaRegen += 1;
      return;
    case "lineFeint":
      stats.lightAttack.recovery = Math.max(44, stats.lightAttack.recovery - 6);
      return;
    case "measuredGrip":
      stats.parryWindow += 10;
      return;
    case "marchingCalves":
      stats.staminaMax += 10;
      stats.staminaRegen += 1;
      return;
    case "edgeAwareness":
      stats.lightAttack.range += 6;
      stats.heavyAttack.range += 8;
      return;
    case "coiledLunge":
      stats.heavyAttack.lunge += 14;
      return;
  }
}
