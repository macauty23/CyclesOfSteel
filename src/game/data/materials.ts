import type { MaterialCost, MaterialId, MaterialInventory } from "../core/types";

export const MATERIAL_ORDER: MaterialId[] = [
  "steel",
  "wood",
  "leather",
  "gemstone",
  "essence",
  "amber",
  "bamboo",
  "coral",
  "obsidian",
  "crystal",
  "blossom",
  "brimstone",
  "stormglass"
];
export const MATERIAL_LABELS: Record<MaterialId, string> = {
  steel: "Steel",
  wood: "Wood",
  leather: "Leather",
  gemstone: "Gemstone",
  essence: "Essence",
  amber: "Amber",
  bamboo: "Bamboo",
  coral: "Coral",
  obsidian: "Obsidian",
  crystal: "Crystal",
  blossom: "Blossom",
  brimstone: "Brimstone",
  stormglass: "Stormglass"
};
export const MATERIAL_SHORT_LABELS: Record<MaterialId, string> = {
  steel: "St",
  wood: "Wd",
  leather: "Le",
  gemstone: "Ge",
  essence: "Es",
  amber: "Am",
  bamboo: "Ba",
  coral: "Co",
  obsidian: "Ob",
  crystal: "Cr",
  blossom: "Bl",
  brimstone: "Br",
  stormglass: "Sg"
};

export const MATERIAL_TINTS: Record<MaterialId, number> = {
  steel: 0xc7d2dd,
  wood: 0xb78958,
  leather: 0x9b6a49,
  gemstone: 0x7db7ea,
  essence: 0xb68cff,
  amber: 0xd9a24f,
  bamboo: 0x7fb46a,
  coral: 0xe08a7a,
  obsidian: 0x4d425d,
  crystal: 0x9fe4ff,
  blossom: 0xf0a8c8,
  brimstone: 0xd3c05d,
  stormglass: 0x8fd8ea
};

export function createEmptyMaterials(): MaterialInventory {
  return {
    steel: 0,
    wood: 0,
    leather: 0,
    gemstone: 0,
    essence: 0,
    amber: 0,
    bamboo: 0,
    coral: 0,
    obsidian: 0,
    crystal: 0,
    blossom: 0,
    brimstone: 0,
    stormglass: 0
  };
}

export function cloneMaterials(materials: MaterialInventory): MaterialInventory {
  return {
    steel: materials.steel,
    wood: materials.wood,
    leather: materials.leather,
    gemstone: materials.gemstone,
    essence: materials.essence,
    amber: materials.amber,
    bamboo: materials.bamboo,
    coral: materials.coral,
    obsidian: materials.obsidian,
    crystal: materials.crystal,
    blossom: materials.blossom,
    brimstone: materials.brimstone,
    stormglass: materials.stormglass
  };
}

export function materialCostEntries(cost: MaterialCost): Array<[MaterialId, number]> {
  return MATERIAL_ORDER.map((id) => [id, cost[id] ?? 0] as [MaterialId, number]).filter((entry) => entry[1] > 0);
}

export function formatMaterialCost(cost: MaterialCost): string {
  const entries = materialCostEntries(cost);

  if (entries.length === 0) {
    return "Free";
  }

  return entries.map(([id, value]) => `${MATERIAL_LABELS[id]} ${value}`).join("  ");
}

export function formatShortMaterialCost(cost: MaterialCost): string {
  const entries = materialCostEntries(cost);

  if (entries.length === 0) {
    return "Free";
  }

  return entries.map(([id, value]) => `${MATERIAL_SHORT_LABELS[id]}${value}`).join(" ");
}

export function formatMaterialInventory(materials: MaterialInventory): string {
  const entries = MATERIAL_ORDER.map((id) => {
    const value = materials[id];
    return `${MATERIAL_LABELS[id]} ${Number.isFinite(value) ? value : "INF"}`;
  });
  const lines: string[] = [];

  for (let index = 0; index < entries.length; index += 2) {
    lines.push(entries.slice(index, index + 2).join("   "));
  }

  return lines.join("\n");
}

export function totalMaterialCount(cost: MaterialCost): number {
  return materialCostEntries(cost).reduce((sum, [, value]) => sum + value, 0);
}
