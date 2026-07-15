import type { WeaponTechDefinition } from "../core/types";

export const TECH_TREE_Y_OFFSET = -40;
export const TECH_NODE_WIDTH = 116;
export const TECH_NODE_HEIGHT = 62;
export const TECH_TREE_DRAG_PADDING_X = 620;
export const TECH_TREE_DRAG_PADDING_Y = 520;

export interface TechTreeBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export function getTechTreeBounds(nodes: WeaponTechDefinition[]): TechTreeBounds {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    const left = node.position.x - TECH_NODE_WIDTH * 0.5;
    const right = node.position.x + TECH_NODE_WIDTH * 0.5;
    const top = node.position.y + TECH_TREE_Y_OFFSET - TECH_NODE_HEIGHT * 0.5;
    const bottom = node.position.y + TECH_TREE_Y_OFFSET + TECH_NODE_HEIGHT * 0.5;

    minX = Math.min(minX, left);
    maxX = Math.max(maxX, right);
    minY = Math.min(minY, top);
    maxY = Math.max(maxY, bottom);
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}
