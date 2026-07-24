import type { ArenaEnvironmentId } from "../core/types";

export interface ArenaEnvironmentDefinition {
  id: ArenaEnvironmentId;
  name: string;
  summary: string;
  accent: number;
}

export const ARENA_ENVIRONMENTS: Record<ArenaEnvironmentId, ArenaEnvironmentDefinition> = {
  icePatches: {
    id: "icePatches",
    name: "Ice Patches",
    summary: "Frozen slicks make clean stops harder for both duelists.",
    accent: 0xbbe8ff
  },
  lavaVents: {
    id: "lavaVents",
    name: "Lava Vents",
    summary: "Marked vents erupt on a rhythm the player can learn.",
    accent: 0xff9b59
  },
  fogBank: {
    id: "fogBank",
    name: "Fog Bank",
    summary: "Dense mist shortens sight-lines and hides measure.",
    accent: 0xaeb9c8
  },
  narrowCorridor: {
    id: "narrowCorridor",
    name: "Narrow Corridor",
    summary: "Stone walls compress spacing and reward line control.",
    accent: 0xcfc6b2
  }
};

export function getArenaEnvironmentDefinition(environmentId: ArenaEnvironmentId): ArenaEnvironmentDefinition {
  return ARENA_ENVIRONMENTS[environmentId];
}
