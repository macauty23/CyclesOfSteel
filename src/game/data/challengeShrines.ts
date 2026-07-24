import type { ShrineChallengeId } from "../core/types";

export interface ShrineChallengeDefinition {
  id: ShrineChallengeId;
  title: string;
  summary: string;
  ruleText: string;
  arenaHint: string;
  accent: number;
}

export const CHALLENGE_SHRINES: Record<ShrineChallengeId, ShrineChallengeDefinition> = {
  poisonVow: {
    id: "poisonVow",
    title: "Viridian Vow",
    summary: "A shrine that taxes every second you linger.",
    ruleText: "Poison steadily drains you until the duel ends.",
    arenaHint: "Win before the venom does.",
    accent: 0x8ab864
  },
  noDash: {
    id: "noDash",
    title: "Stone Step Oath",
    summary: "A grounded duel where footwork replaces panic escapes.",
    ruleText: "Dashing is sealed for this fight.",
    arenaHint: "Spacing must come from movement, not bursts.",
    accent: 0x97b0c6
  },
  heavyOnly: {
    id: "heavyOnly",
    title: "Execution Rite",
    summary: "Only committed strikes satisfy the shrine.",
    ruleText: "Only heavy attacks may be used.",
    arenaHint: "Every punish window has to count.",
    accent: 0xe0b06c
  }
};

export const CHALLENGE_SHRINE_IDS = Object.keys(CHALLENGE_SHRINES) as ShrineChallengeId[];

export function getChallengeShrineDefinition(challengeId: ShrineChallengeId): ShrineChallengeDefinition {
  return CHALLENGE_SHRINES[challengeId];
}
