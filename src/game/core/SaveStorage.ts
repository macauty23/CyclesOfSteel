export interface SavedRunPayload {
  runState: unknown;
  currentSceneKey: string;
  worldNodes: unknown;
  visibleWorldNodeIds: string[];
  worldNodeOrdinal: number;
  worldDepthCursor: number;
  defeatedBossClearFlags: string[];
  unlockedLegendarySwordIds: string[];
  excaliburAscensionReady: boolean;
  longswordBlessedFlawlessStreak: number;
  rareEventSpawnedThisRun: boolean;
  tutorialCompleted: boolean;
}

const ACTIVE_RUN_KEY = "cycles-of-steel.active-run.v1";
const PROFILE_KEY = "cycles-of-steel.profile.v1";

export function loadActiveRun(): SavedRunPayload | null {
  try { return JSON.parse(localStorage.getItem(ACTIVE_RUN_KEY) ?? "null"); } catch { return null; }
}

export function saveActiveRun(payload: SavedRunPayload): void {
  localStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(payload));
}

export function clearActiveRun(): void { localStorage.removeItem(ACTIVE_RUN_KEY); }

export function loadBossClearFlags(): string[] {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}").bossClearFlags ?? []; } catch { return []; }
}

export function saveBossClearFlags(flags: Iterable<string>): void {
  const profile = loadProfile();
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, bossClearFlags: [...flags] }));
}

export function hasClaimedExcalibur(): boolean { return Boolean(loadProfile().claimedExcalibur); }
export function markExcaliburClaimed(): void { localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...loadProfile(), claimedExcalibur: true })); }
export function loadClaimedLegendarySwordIds(): string[] {
  const profile = loadProfile();
  return [...new Set([...(profile.claimedLegendarySwordIds ?? []), ...(profile.claimedExcalibur ? ["excalibur"] : [])])];
}
export function markLegendarySwordClaimed(swordId: string): void {
  const profile = loadProfile();
  const claimedLegendarySwordIds = [...new Set([...(profile.claimedLegendarySwordIds ?? []), swordId])];
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, claimedLegendarySwordIds }));
}

function loadProfile(): { bossClearFlags?: string[]; claimedExcalibur?: boolean; claimedLegendarySwordIds?: string[] } {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}"); } catch { return {}; }
}
