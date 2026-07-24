import Phaser from "phaser";
import { ENCHANTMENTS, ENCHANTMENT_ORDER, applyEnchantmentToStats } from "../data/enchantments";
import {
  FORGE_OFFERS,
  FORGE_OFFER_ORDER,
  applyForgeOfferToStats
} from "../data/forgeOffers";
import { cloneMaterials, createEmptyMaterials, materialCostEntries } from "../data/materials";
import { RELICS, applyRelicToStats } from "../data/relics";
import {
  DRAMATIC_RUN_MODIFIER_IDS,
  RUN_MODIFIERS,
  RUN_MODIFIER_ORDER,
  applyRunModifierToStats
} from "../data/runModifiers";
import { SWORD_DEFINITIONS, SWORD_ORDER } from "../data/swords";
import {
  DEFAULT_SWORD_PART_OPTION_IDS,
  SWORD_PART_OPTIONS,
  SWORD_PART_OPTIONS_BY_ID,
  applySwordPartModifications
} from "../data/swordModifications";
import {
  EXPEDITION_REGIONS,
  type GeneratedWorldChapter,
  generateWorldChapter,
  getNextAnchorRegion,
  resolveWorldEncounter
} from "../data/worldMap";
import { getBossDefinition, isSecretBossId } from "../data/bosses";
import {
  WEAPON_TECH_ORDER,
  WEAPON_TECH_TREE,
  applyWeaponTechToStats
} from "../data/weaponTechTree";
import { TEST_MODE_PASSWORD, createTutorialChapter } from "../tutorial/tutorialData";
import { SCENE_KEYS, type SceneKey } from "./SceneKeys";
import type {
  BuildCategoryId,
  CombatStats,
  EncounterConfig,
  EnchantmentDefinition,
  EnchantmentId,
  ForgeOfferDefinition,
  ForgeOfferId,
  LegendarySwordId,
  MaterialCost,
  MaterialId,
  MaterialInventory,
  RegionDefinition,
  RegionId,
  RelicDefinition,
  RunModifierDefinition,
  RunModifierId,
  RunState,
  SwordDefinition,
  SwordId,
  SwordPartId,
  SwordPartOptionDefinition,
  SwordPartOptionId,
  WeaponTechDefinition,
  WeaponTechNodeId,
  WorldNodeDefinition
} from "./types";

function getWeaponTechChain(nodeId: WeaponTechNodeId): WeaponTechNodeId[] {
  const chain: WeaponTechNodeId[] = [];
  let current: WeaponTechNodeId | null = nodeId;

  while (current) {
    chain.unshift(current);
    current = WEAPON_TECH_TREE[current].prerequisiteIds[0] ?? null;
  }

  return chain;
}

function getWeaponTechChildren(parentId: WeaponTechNodeId): WeaponTechNodeId[] {
  return WEAPON_TECH_ORDER.filter((nodeId) => WEAPON_TECH_TREE[nodeId].prerequisiteIds.includes(parentId));
}

function createDefaultPartSelections(): Record<SwordPartId, SwordPartOptionId> {
  return {
    ...DEFAULT_SWORD_PART_OPTION_IDS
  };
}

function createDefaultOwnedPartOptions(): SwordPartOptionId[] {
  return Object.values(DEFAULT_SWORD_PART_OPTION_IDS);
}

function createDefaultRunState(): RunState {
  const materials = createEmptyMaterials();
  materials.steel = 1;
  materials.wood = 1;

  return {
    selectedSwordId: "armingSword",
    legendarySwordOverrideId: null,
    materials,
    encounter: 1,
    unlockedTechNodeIds: ["armingSword"],
    ownedOfferIds: [],
    currentOfferIds: [],
    hasTakenForgeOffer: false,
    claimedOfferId: null,
    activeModifierId: null,
    ownedModifierIds: [],
    currentModifierIds: [],
    claimedModifierId: null,
    currentEnchantmentId: null,
    currentEnchantmentOfferIds: [],
    pendingEnchantmentBiasId: null,
    ownedRelicIds: [],
    ownedSwordPartOptionIds: createDefaultOwnedPartOptions(),
    equippedSwordPartOptionIds: createDefaultPartSelections(),
    availableNodeIds: [],
    visitedNodeIds: [],
    currentEncounterNodeId: null,
    expeditionTier: 0
  };
}

function createInfiniteMaterials(): MaterialInventory {
  const materials = createEmptyMaterials();

  for (const materialId of Object.keys(materials) as MaterialId[]) {
    materials[materialId] = Number.POSITIVE_INFINITY;
  }

  return materials;
}

function cloneRunState(state: RunState): RunState {
  return {
    ...state,
    materials: cloneMaterials(state.materials),
    unlockedTechNodeIds: [...state.unlockedTechNodeIds],
    ownedOfferIds: [...state.ownedOfferIds],
    ownedModifierIds: [...state.ownedModifierIds],
    currentOfferIds: [...state.currentOfferIds],
    currentModifierIds: [...state.currentModifierIds],
    currentEnchantmentOfferIds: [...state.currentEnchantmentOfferIds],
    ownedRelicIds: [...state.ownedRelicIds],
    ownedSwordPartOptionIds: [...state.ownedSwordPartOptionIds],
    equippedSwordPartOptionIds: { ...state.equippedSwordPartOptionIds },
    availableNodeIds: [...state.availableNodeIds],
    visitedNodeIds: [...state.visitedNodeIds]
  };
}

function cloneAttackProfile(attack: SwordDefinition["lightAttack"]): SwordDefinition["lightAttack"] {
  return {
    ...attack,
    impact: {
      ...attack.impact
    }
  };
}

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex] ?? current;
    shuffled[swapIndex] = current;
  }

  return shuffled;
}

function rollWeightedEnchantment(biasId: EnchantmentId | null): EnchantmentId | null {
  const tickets = ENCHANTMENT_ORDER.flatMap((id) => Array.from({ length: id === biasId ? 5 : 1 }, () => id));
  return shuffleArray(tickets)[0] ?? null;
}

export class GameManager {
  private runState = createDefaultRunState();
  private currentSceneKey: SceneKey = SCENE_KEYS.MainMenu;
  private worldNodes: Record<string, WorldNodeDefinition> = {};
  private visibleWorldNodeIds: string[] = [];
  private worldNodeOrdinal = 0;
  private worldDepthCursor = 0;
  private testModeEnabled = false;
  private testModeUnlocked = false;
  private immortalModeEnabled = false;
  private thaiModeEnabled = false;
  private tutorialMode = false;
  private tutorialCompleted = false;
  private seenTutorialPromptIds = new Set<string>();
  private pendingSystemMessage: string | null = null;
  private defeatedBossClearFlags = new Set<string>();
  private unlockedLegendarySwordIds = new Set<LegendarySwordId>();
  private currentEncounterTookDamage = false;
  private excaliburAscensionReady = false;
  private longswordBlessedFlawlessStreak = 0;
  private rareEventSpawnedThisRun = false;

  reset(): void {
    this.runState = createDefaultRunState();
    this.currentSceneKey = SCENE_KEYS.MainMenu;
    this.immortalModeEnabled = false;
    this.tutorialMode = false;
    this.currentEncounterTookDamage = false;
    this.excaliburAscensionReady = false;
    this.longswordBlessedFlawlessStreak = 0;
    this.rareEventSpawnedThisRun = false;
    this.seenTutorialPromptIds.clear();
    this.resetWorldGraph();
  }

  getState(): RunState {
    const state = cloneRunState(this.runState);

    if (this.testModeEnabled) {
      state.materials = createInfiniteMaterials();
      state.hasTakenForgeOffer = false;
    }

    return state;
  }

  getSceneKey(): SceneKey {
    return this.currentSceneKey;
  }

  isTestModeEnabled(): boolean {
    return this.testModeEnabled;
  }

  isTestModeUnlocked(): boolean {
    return this.testModeUnlocked;
  }

  isImmortalModeEnabled(): boolean {
    return this.testModeEnabled && this.immortalModeEnabled;
  }

  isThaiModeEnabled(): boolean {
    return this.thaiModeEnabled;
  }

  setThaiModeEnabled(enabled: boolean): void {
    this.thaiModeEnabled = enabled;
  }

  toggleThaiModeEnabled(): boolean {
    this.thaiModeEnabled = !this.thaiModeEnabled;
    return this.thaiModeEnabled;
  }

  setTestModeEnabled(enabled: boolean): void {
    this.testModeEnabled = enabled;

    if (!enabled) {
      this.immortalModeEnabled = false;
    }
  }

  toggleTestModeEnabled(): boolean {
    this.testModeEnabled = !this.testModeEnabled;

    if (!this.testModeEnabled) {
      this.immortalModeEnabled = false;
    }

    return this.testModeEnabled;
  }

  toggleImmortalModeEnabled(): boolean {
    if (!this.testModeEnabled) {
      this.immortalModeEnabled = false;
      return false;
    }

    this.immortalModeEnabled = !this.immortalModeEnabled;
    return this.immortalModeEnabled;
  }

  consumePendingSystemMessage(): string | null {
    const message = this.pendingSystemMessage;
    this.pendingSystemMessage = null;
    return message;
  }

  hasBossClearFlag(flagId: string): boolean {
    return this.defeatedBossClearFlags.has(flagId);
  }

  isLegendarySwordUnlocked(swordId: LegendarySwordId): boolean {
    return this.unlockedLegendarySwordIds.has(swordId);
  }

  getBaseSelectedSwordId(): SwordId {
    return this.runState.selectedSwordId;
  }

  getLegendarySwordOverrideId(): LegendarySwordId | null {
    return this.runState.legendarySwordOverrideId;
  }

  getExcaliburAscensionState(): {
    unlocked: boolean;
    ready: boolean;
    flawlessStreak: number;
    honoredCleared: boolean;
    onEligibleLeaf: boolean;
  } {
    return {
      unlocked: this.isLegendarySwordUnlocked("excalibur"),
      ready: this.excaliburAscensionReady,
      flawlessStreak: this.longswordBlessedFlawlessStreak,
      honoredCleared: this.hasBossClearFlag("boss:honored"),
      onEligibleLeaf: this.isCurrentSwordEligibleForExcaliburAscension()
    };
  }

  isTutorialMode(): boolean {
    return this.tutorialMode;
  }

  hasCompletedTutorial(): boolean {
    return this.tutorialCompleted;
  }

  hasSeenTutorialPrompt(promptId: string): boolean {
    return this.seenTutorialPromptIds.has(promptId);
  }

  markTutorialPromptSeen(promptId: string): void {
    this.seenTutorialPromptIds.add(promptId);
  }

  getSwordRoster(): SwordDefinition[] {
    return SWORD_ORDER.map((id) => SWORD_DEFINITIONS[id]).filter((entry): entry is SwordDefinition => Boolean(entry));
  }

  getSelectedSword(): SwordDefinition {
    const swordId = this.runState.legendarySwordOverrideId ?? this.runState.selectedSwordId;
    return SWORD_DEFINITIONS[swordId] ?? SWORD_DEFINITIONS.armingSword;
  }

  getCombatStyle(): SwordDefinition {
    return this.getSelectedSword();
  }

  getEncounterConfig(): EncounterConfig {
    this.ensureWorldGraph();
    const encounterNodeId = this.runState.currentEncounterNodeId ?? this.runState.availableNodeIds[0];
    const node = encounterNodeId ? this.worldNodes[encounterNodeId] : undefined;

    if (!node) {
      const fallbackNode = this.getCurrentChapterWorldNodeDefinitions()[0];

      if (!fallbackNode) {
        this.spawnWorldChapter("plains");
        return resolveWorldEncounter(this.getCurrentChapterWorldNodeDefinitions()[0] as WorldNodeDefinition, this.runState.encounter, this.runState.expeditionTier);
      }

      return resolveWorldEncounter(fallbackNode, this.runState.encounter, this.runState.expeditionTier);
    }

    return resolveWorldEncounter(node, this.runState.encounter, this.runState.expeditionTier);
  }

  getMaterialInventory(): MaterialInventory {
    return this.testModeEnabled ? createInfiniteMaterials() : cloneMaterials(this.runState.materials);
  }

  getForgeOfferRoster(): ForgeOfferDefinition[] {
    return FORGE_OFFER_ORDER.map((id) => FORGE_OFFERS[id]).filter((entry): entry is ForgeOfferDefinition => Boolean(entry));
  }

  getCurrentForgeOfferDefinitions(): ForgeOfferDefinition[] {
    return this.runState.currentOfferIds.map((id) => FORGE_OFFERS[id]).filter((entry): entry is ForgeOfferDefinition => Boolean(entry));
  }

  getRunModifierRoster(): RunModifierDefinition[] {
    return RUN_MODIFIER_ORDER.map((id) => RUN_MODIFIERS[id]).filter((entry): entry is RunModifierDefinition => Boolean(entry));
  }

  getCurrentRunModifierDefinitions(): RunModifierDefinition[] {
    return this.runState.currentModifierIds.map((id) => RUN_MODIFIERS[id]).filter((entry): entry is RunModifierDefinition => Boolean(entry));
  }

  getOwnedRunModifierDefinitions(): RunModifierDefinition[] {
    return this.runState.ownedModifierIds.map((id) => RUN_MODIFIERS[id]).filter((entry): entry is RunModifierDefinition => Boolean(entry));
  }

  getActiveRunModifierDefinition(): RunModifierDefinition | null {
    return this.runState.activeModifierId ? RUN_MODIFIERS[this.runState.activeModifierId] : null;
  }

  hasOwnedRunModifier(modifierId: RunModifierId): boolean {
    return this.runState.ownedModifierIds.includes(modifierId);
  }

  getEnchantmentRoster(): EnchantmentDefinition[] {
    return ENCHANTMENT_ORDER.map((id) => ENCHANTMENTS[id]).filter((entry): entry is EnchantmentDefinition => Boolean(entry));
  }

  getCurrentEnchantmentDefinitions(): EnchantmentDefinition[] {
    return this.runState.currentEnchantmentOfferIds.map((id) => ENCHANTMENTS[id]).filter((entry): entry is EnchantmentDefinition => Boolean(entry));
  }

  getCurrentEnchantmentDefinition(): EnchantmentDefinition | null {
    return this.runState.currentEnchantmentId ? ENCHANTMENTS[this.runState.currentEnchantmentId] : null;
  }

  getPendingEnchantmentBiasDefinition(): EnchantmentDefinition | null {
    return this.runState.pendingEnchantmentBiasId ? ENCHANTMENTS[this.runState.pendingEnchantmentBiasId] : null;
  }

  getOwnedRelicDefinitions(): RelicDefinition[] {
    return this.runState.ownedRelicIds.map((id) => RELICS[id]).filter((entry): entry is RelicDefinition => Boolean(entry));
  }

  getSwordPartOptionDefinitions(partId: SwordPartId): SwordPartOptionDefinition[] {
    return [...SWORD_PART_OPTIONS[partId]];
  }

  getSwordPartOptionDefinition(optionId: SwordPartOptionId): SwordPartOptionDefinition | null {
    return SWORD_PART_OPTIONS_BY_ID[optionId] ?? null;
  }

  getOwnedSwordPartOptionIds(): SwordPartOptionId[] {
    return [...this.runState.ownedSwordPartOptionIds];
  }

  getEquippedSwordPartOptionIds(): Record<SwordPartId, SwordPartOptionId> {
    return { ...this.runState.equippedSwordPartOptionIds };
  }

  getEquippedSwordPartOptionDefinition(partId: SwordPartId): SwordPartOptionDefinition {
    const equippedId = this.runState.equippedSwordPartOptionIds[partId];
    return SWORD_PART_OPTIONS_BY_ID[equippedId] ?? SWORD_PART_OPTIONS_BY_ID[DEFAULT_SWORD_PART_OPTION_IDS[partId]];
  }

  isSwordPartOptionOwned(optionId: SwordPartOptionId): boolean {
    return this.runState.ownedSwordPartOptionIds.includes(optionId);
  }

  getWeaponTechRoster(): WeaponTechDefinition[] {
    return WEAPON_TECH_ORDER.map((id) => WEAPON_TECH_TREE[id]).filter((entry): entry is WeaponTechDefinition => Boolean(entry));
  }

  getUnlockedWeaponTechDefinitions(): WeaponTechDefinition[] {
    return this.runState.unlockedTechNodeIds.map((id) => WEAPON_TECH_TREE[id]).filter((entry): entry is WeaponTechDefinition => Boolean(entry));
  }

  isWeaponTechUnlocked(nodeId: WeaponTechNodeId): boolean {
    return this.runState.unlockedTechNodeIds.includes(nodeId);
  }

  getWeaponTechBlockingNode(nodeId: WeaponTechNodeId): WeaponTechDefinition | null {
    if (this.isWeaponTechUnlocked(nodeId)) {
      return null;
    }

    const chain = getWeaponTechChain(nodeId);

    for (let index = 0; index < chain.length - 1; index += 1) {
      const parentId = chain[index];
      const nextId = chain[index + 1];
      const blockingSiblingId = getWeaponTechChildren(parentId).find(
        (childId) => childId !== nextId && this.isWeaponTechUnlocked(childId)
      );

      if (blockingSiblingId) {
        return WEAPON_TECH_TREE[blockingSiblingId];
      }
    }

    return null;
  }

  canUnlockWeaponTech(nodeId: WeaponTechNodeId): boolean {
    const node = WEAPON_TECH_TREE[nodeId];

    if (this.isWeaponTechUnlocked(nodeId)) {
      return false;
    }

    if (this.hasOwnedRunModifier("arcaneDebt")) {
      return false;
    }

    if (!node.prerequisiteIds.every((prerequisiteId) => this.isWeaponTechUnlocked(prerequisiteId))) {
      return false;
    }

    if (this.getWeaponTechBlockingNode(nodeId)) {
      return false;
    }

    return this.canAfford(node.cost);
  }

  unlockWeaponTech(nodeId: WeaponTechNodeId): boolean {
    const node = WEAPON_TECH_TREE[nodeId];

    if (!this.canUnlockWeaponTech(nodeId) || !this.spendMaterials(node.cost)) {
      return false;
    }

    this.runState.unlockedTechNodeIds.push(nodeId);
    this.runState.selectedSwordId = node.swordId;
    return true;
  }

  getActiveBuildCategories(nextModifierId?: RunModifierId | null): BuildCategoryId[] {
    const categories = new Set<BuildCategoryId>();

    for (const offerId of this.runState.ownedOfferIds) {
      categories.add(FORGE_OFFERS[offerId].category);
    }

    for (const modifierId of this.runState.ownedModifierIds) {
      categories.add(RUN_MODIFIERS[modifierId].category);
    }

    if (nextModifierId) {
      categories.add(RUN_MODIFIERS[nextModifierId].category);
    }

    return [...categories];
  }

  canAcceptCategory(_category: BuildCategoryId, _context: "offer" | "modifier", _modifierId?: RunModifierId): boolean {
    return true;
  }

  canClaimForgeOffer(offerId: ForgeOfferId): boolean {
    if (!this.runState.currentOfferIds.includes(offerId)) {
      return false;
    }

    if (!this.testModeEnabled && this.runState.hasTakenForgeOffer) {
      return false;
    }

    return true;
  }

  getCombatStats(): CombatStats {
    const sword = this.getSelectedSword();
    const combatStyle = this.getCombatStyle();
    const stats: CombatStats = {
      sword,
      combatStyle,
      maxHp: sword.maxHp,
      moveSpeed: combatStyle.moveSpeed,
      moveAcceleration: combatStyle.moveAcceleration,
      drag: combatStyle.drag,
      dashSpeed: combatStyle.dashSpeed,
      dashDuration: combatStyle.dashDuration,
      dashCooldown: combatStyle.dashCooldown,
      lightAttack: cloneAttackProfile(combatStyle.lightAttack),
      heavyAttack: cloneAttackProfile(combatStyle.heavyAttack),
      damageBonus: 0,
      reachBonus: 0,
      tempoScale: 1,
      attackControlWindup: combatStyle.attackControlWindup,
      attackControlActive: combatStyle.attackControlActive,
      comboWindow: 1700,
      parryWindow: 196,
      parryRecovery: 184,
      parryCooldown: 640,
      parryReflectRatio: 0.5,
      parryStunMs: 320,
      pickupRadius: 28,
      bonusDrops: 0,
      staminaMax: 100,
      staminaRegen: 18,
      dashStaminaCost: 16,
      incomingDamageScale: 1,
      onHitBurnDamage: 0,
      onHitBurnDurationMs: 0,
      onHitSlowFactor: 1,
      onHitSlowDurationMs: 0,
      perfectBindStaminaRestoreBonus: 0,
      dashPassDamageBonus: 0,
      dashPassBuffDurationMs: 0,
      stillnessChargeMs: 0,
      stillnessMaxStacks: 0,
      stillnessDamagePerStack: 0
    };

    for (const nodeId of this.runState.unlockedTechNodeIds) {
      applyWeaponTechToStats(stats, nodeId);
    }

    for (const offerId of this.runState.ownedOfferIds) {
      applyForgeOfferToStats(stats, offerId);
    }

    for (const modifierId of this.runState.ownedModifierIds) {
      applyRunModifierToStats(stats, modifierId);
    }

    if (this.runState.currentEnchantmentId) {
      applyEnchantmentToStats(stats, this.runState.currentEnchantmentId);
    }

    for (const relicId of this.runState.ownedRelicIds) {
      applyRelicToStats(stats, relicId);
    }

    applySwordPartModifications(stats, this.runState.equippedSwordPartOptionIds);

    const techniques = combatStyle.techniques;

    stats.parryWindow = Math.round(stats.parryWindow * (techniques.parryWindowMultiplier ?? 1));
    stats.staminaMax += techniques.staminaMaxBonus ?? 0;
    stats.staminaRegen += techniques.staminaRegenBonus ?? 0;
    stats.dashStaminaCost += techniques.dashStaminaCostModifier ?? 0;
    stats.staminaMax = Math.max(72, stats.staminaMax);
    stats.staminaRegen = Math.max(6, stats.staminaRegen);
    stats.dashStaminaCost = Math.max(8, stats.dashStaminaCost);
    stats.maxHp = Math.max(72, stats.maxHp);
    stats.moveSpeed = Math.max(152, stats.moveSpeed);
    stats.moveAcceleration = Math.max(1080, stats.moveAcceleration);
    stats.dashSpeed = Math.max(480, stats.dashSpeed);
    stats.dashDuration = Math.max(90, stats.dashDuration);
    stats.dashCooldown = Math.max(120, stats.dashCooldown);
    stats.lightAttack.range = Math.max(72, stats.lightAttack.range);
    stats.heavyAttack.range = Math.max(88, stats.heavyAttack.range);
    stats.lightAttack.active = Math.max(56, stats.lightAttack.active);
    stats.heavyAttack.active = Math.max(62, stats.heavyAttack.active);
    stats.parryReflectRatio = Math.min(0.95, stats.parryReflectRatio);
    stats.incomingDamageScale = Phaser.Math.Clamp(stats.incomingDamageScale, 0.55, 1.35);
    stats.onHitSlowFactor = Phaser.Math.Clamp(stats.onHitSlowFactor, 0.42, 1);

    return stats;
  }

  addMaterials(input: MaterialCost | MaterialId | number, amount = 0): void {
    if (typeof input === "number") {
      this.runState.materials.steel += Math.max(0, input);
      return;
    }

    if (typeof input === "string") {
      this.runState.materials[input] += Math.max(0, amount);
      return;
    }

    for (const [materialId, value] of materialCostEntries(input)) {
      this.runState.materials[materialId] += value;
    }
  }

  canAfford(cost: MaterialCost | number): boolean {
    if (this.testModeEnabled) {
      return true;
    }

    if (typeof cost === "number") {
      return this.runState.materials.steel >= cost;
    }

    return materialCostEntries(cost).every(([materialId, value]) => this.runState.materials[materialId] >= value);
  }

  spendMaterials(cost: MaterialCost | number): boolean {
    if (this.testModeEnabled) {
      return true;
    }

    if (!this.canAfford(cost)) {
      return false;
    }

    if (typeof cost === "number") {
      this.runState.materials.steel -= cost;
      return true;
    }

    for (const [materialId, value] of materialCostEntries(cost)) {
      this.runState.materials[materialId] -= value;
    }

    return true;
  }

  claimForgeOffer(offerId: ForgeOfferId): boolean {
    if (!this.canClaimForgeOffer(offerId)) {
      return false;
    }

    this.runState.ownedOfferIds.push(offerId);
    this.runState.hasTakenForgeOffer = !this.testModeEnabled;
    this.runState.claimedOfferId = offerId;
    return true;
  }

  canClaimRunModifier(modifierId: RunModifierId): boolean {
    if (!this.runState.currentModifierIds.includes(modifierId)) {
      return false;
    }

    if (this.runState.ownedModifierIds.includes(modifierId)) {
      return false;
    }

    if (!this.testModeEnabled && this.runState.claimedModifierId) {
      return false;
    }

    return true;
  }

  claimRunModifier(modifierId: RunModifierId): boolean {
    if (!this.canClaimRunModifier(modifierId)) {
      return false;
    }

    this.runState.ownedModifierIds.push(modifierId);
    this.runState.activeModifierId = modifierId;
    this.runState.claimedModifierId = modifierId;
    return true;
  }

  canRollEnchantments(): boolean {
    if (this.hasOwnedRunModifier("arcaneDebt")) {
      return true;
    }

    return this.canAfford({ essence: 2 });
  }

  canPrimeEnchantmentBias(enchantmentId: EnchantmentId): boolean {
    const enchantment = ENCHANTMENTS[enchantmentId];
    return Boolean(enchantment?.biasCost && this.canAfford(enchantment.biasCost));
  }

  primeEnchantmentBias(enchantmentId: EnchantmentId): boolean {
    const enchantment = ENCHANTMENTS[enchantmentId];

    if (!enchantment?.biasCost || !this.spendMaterials(enchantment.biasCost)) {
      return false;
    }

    this.runState.pendingEnchantmentBiasId = enchantmentId;
    return true;
  }

  rollEnchantmentOffers(): boolean {
    const freeRoll = this.hasOwnedRunModifier("arcaneDebt");

    if (!this.canRollEnchantments() || (!freeRoll && !this.spendMaterials({ essence: 2 }))) {
      return false;
    }

    this.runState.currentEnchantmentId = rollWeightedEnchantment(this.runState.pendingEnchantmentBiasId);
    this.runState.currentEnchantmentOfferIds = [];
    this.runState.pendingEnchantmentBiasId = null;
    return true;
  }

  claimEnchantment(enchantmentId: EnchantmentId): boolean {
    if (!this.runState.currentEnchantmentOfferIds.includes(enchantmentId)) {
      return false;
    }

    this.runState.currentEnchantmentId = enchantmentId;
    this.runState.currentEnchantmentOfferIds = [];
    return true;
  }

  canForgeSwordPartOption(optionId: SwordPartOptionId): boolean {
    const option = SWORD_PART_OPTIONS_BY_ID[optionId];

    if (!option || this.isSwordPartOptionOwned(optionId)) {
      return false;
    }

    return this.canAfford(option.cost);
  }

  equipSwordPartOption(optionId: SwordPartOptionId): boolean {
    const option = SWORD_PART_OPTIONS_BY_ID[optionId];

    if (!option || !this.isSwordPartOptionOwned(optionId)) {
      return false;
    }

    this.runState.equippedSwordPartOptionIds[option.partId] = optionId;
    return true;
  }

  forgeSwordPartOption(optionId: SwordPartOptionId): boolean {
    const option = SWORD_PART_OPTIONS_BY_ID[optionId];

    if (!option || this.isSwordPartOptionOwned(optionId) || !this.spendMaterials(option.cost)) {
      return false;
    }

    this.runState.ownedSwordPartOptionIds.push(optionId);
    this.runState.equippedSwordPartOptionIds[option.partId] = optionId;
    return true;
  }

  getRegionDefinition(regionId: RegionId): RegionDefinition {
    return EXPEDITION_REGIONS[regionId];
  }

  getWorldNodeDefinition(nodeId: string): WorldNodeDefinition | null {
    return this.worldNodes[nodeId] ?? null;
  }

  getCurrentEncounterNodeDefinition(): WorldNodeDefinition | null {
    const nodeId = this.runState.currentEncounterNodeId;
    return nodeId ? this.worldNodes[nodeId] ?? null : null;
  }

  getAvailableWorldNodeDefinitions(): WorldNodeDefinition[] {
    this.ensureWorldGraph();
    return this.runState.availableNodeIds.map((id) => this.worldNodes[id]).filter((entry): entry is WorldNodeDefinition => Boolean(entry));
  }

  getCurrentChapterWorldNodeDefinitions(): WorldNodeDefinition[] {
    this.ensureWorldGraph();
    return this.visibleWorldNodeIds.map((id) => this.worldNodes[id]).filter((entry): entry is WorldNodeDefinition => Boolean(entry));
  }

  canTravelToWorldNode(nodeId: string): boolean {
    return this.runState.availableNodeIds.includes(nodeId);
  }

  startWorldNode(scene: Phaser.Scene, nodeId: string, force = false): boolean {
    const node = this.getWorldNodeDefinition(nodeId);

    if (!node || (!force && !this.canTravelToWorldNode(nodeId))) {
      return false;
    }

    if (node.type === "battle" || node.type === "miniboss" || node.type === "boss" || node.type === "challenge") {
      this.runState.currentEncounterNodeId = nodeId;
      this.transition(scene, SCENE_KEYS.Game);
      return true;
    }

    return false;
  }

  resolveWorldNodeVisit(nodeId: string): boolean {
    const node = this.getWorldNodeDefinition(nodeId);

    if (!node || !this.canTravelToWorldNode(nodeId)) {
      return false;
    }

    this.addMaterials(node.rewardMaterials);

    if (node.relicId && !this.runState.ownedRelicIds.includes(node.relicId)) {
      this.runState.ownedRelicIds.push(node.relicId);
    }

    this.advanceWorldFrontier(nodeId);
    return true;
  }

  completeMerchantExchange(nodeId: string, payment: MaterialCost, reward: MaterialCost): boolean {
    if (!this.canTravelToWorldNode(nodeId) || !this.spendMaterials(payment)) {
      return false;
    }

    this.addMaterials(reward);
    this.advanceWorldFrontier(nodeId);
    return true;
  }

  resolveRunEvent(
    nodeId: string,
    payment: MaterialCost,
    reward: MaterialCost,
    modifierId?: RunModifierId,
    upgradeSwordId?: LegendarySwordId
  ): boolean {
    if (upgradeSwordId && !this.canUpgradeCurrentSwordToLegendary(upgradeSwordId)) {
      return false;
    }

    if (!this.canTravelToWorldNode(nodeId) || !this.spendMaterials(payment)) {
      return false;
    }

    const node = this.getWorldNodeDefinition(nodeId);

    if (!node) {
      return false;
    }

    this.addMaterials(node.rewardMaterials);
    this.addMaterials(reward);

    if (modifierId && !this.runState.ownedModifierIds.includes(modifierId)) {
      this.runState.ownedModifierIds.push(modifierId);
      this.runState.activeModifierId = modifierId;
    }

    if (upgradeSwordId) {
      this.upgradeCurrentSwordToLegendary(upgradeSwordId);
    }

    this.advanceWorldFrontier(nodeId);
    return true;
  }

  openMainMenu(scene: Phaser.Scene): void {
    this.reset();
    this.transition(scene, SCENE_KEYS.MainMenu);
  }

  openTutorial(scene: Phaser.Scene): void {
    this.transition(scene, SCENE_KEYS.Tutorial);
  }

  openSwordSelect(scene: Phaser.Scene): void {
    this.beginRun(scene);
  }

  beginRun(scene: Phaser.Scene, swordId: SwordId = "armingSword"): void {
    this.runState = createDefaultRunState();
    this.runState.selectedSwordId = swordId;
    this.tutorialMode = false;
    this.currentEncounterTookDamage = false;
    this.excaliburAscensionReady = false;
    this.longswordBlessedFlawlessStreak = 0;
    this.rareEventSpawnedThisRun = false;
    this.seenTutorialPromptIds.clear();
    this.resetWorldGraph();
    this.spawnWorldChapter("plains");
    this.transition(scene, SCENE_KEYS.WorldMap);
  }

  beginTutorialRun(scene: Phaser.Scene): void {
    this.runState = createDefaultRunState();
    this.runState.selectedSwordId = "armingSword";
    this.tutorialMode = true;
    this.currentEncounterTookDamage = false;
    this.excaliburAscensionReady = false;
    this.longswordBlessedFlawlessStreak = 0;
    this.rareEventSpawnedThisRun = false;
    this.seenTutorialPromptIds.clear();
    this.resetWorldGraph();
    this.registerWorldChapter(createTutorialChapter(this.worldDepthCursor));
    this.transition(scene, SCENE_KEYS.WorldMap);
  }

  completeTutorial(scene: Phaser.Scene): void {
    this.completeCurrentEncounterNode();
    this.tutorialCompleted = true;
    this.tutorialMode = false;
    this.seenTutorialPromptIds.clear();
    this.transition(scene, SCENE_KEYS.MainMenu);
  }

  openWorldMap(scene: Phaser.Scene): void {
    this.ensureWorldGraph();
    this.transition(scene, SCENE_KEYS.WorldMap);
  }

  openForge(scene: Phaser.Scene): void {
    this.completeCurrentEncounterNode();
    this.runState.currentOfferIds = this.rollForgeOffers();
    this.runState.currentModifierIds = this.rollRunModifiers();
    this.runState.hasTakenForgeOffer = false;
    this.runState.claimedOfferId = null;
    this.runState.claimedModifierId = null;
    this.transition(scene, SCENE_KEYS.Forge);
  }

  openTechTree(scene: Phaser.Scene): void {
    this.transition(scene, SCENE_KEYS.TechTree);
  }

  openModification(scene: Phaser.Scene): void {
    this.transition(scene, SCENE_KEYS.Modification);
  }

  returnToForge(scene: Phaser.Scene): void {
    this.transition(scene, SCENE_KEYS.Forge);
  }

  beginNextEncounter(scene: Phaser.Scene): void {
    this.ensureWorldGraph();
    this.transition(scene, SCENE_KEYS.WorldMap);
  }

  recordEncounterStart(): void {
    this.currentEncounterTookDamage = false;
  }

  recordPlayerDamaged(): void {
    this.currentEncounterTookDamage = true;
  }

  recordEncounterVictory(): void {
    const node = this.getCurrentEncounterNodeDefinition();

    if (!node || this.tutorialMode) {
      return;
    }

    const honoredCleared = this.hasBossClearFlag("boss:honored") || node.bossId === "honored";

    const qualifiesForLongswordTrial =
      this.runState.selectedSwordId === "longsword" &&
      this.runState.currentEnchantmentId === "blessed" &&
      !this.currentEncounterTookDamage;

    if (qualifiesForLongswordTrial) {
      this.longswordBlessedFlawlessStreak += 1;
    } else {
      this.longswordBlessedFlawlessStreak = 0;
    }

    if (
      !this.isLegendarySwordUnlocked("excalibur") &&
      !this.excaliburAscensionReady &&
      this.longswordBlessedFlawlessStreak >= 10 &&
      honoredCleared
    ) {
      this.excaliburAscensionReady = true;
      this.queueSystemMessage("A holy answer stirs in the longsword line.");
    }
  }

  canAscendLongswordToExcalibur(): boolean {
    return (
      !this.isLegendarySwordUnlocked("excalibur") &&
      this.excaliburAscensionReady &&
      this.hasBossClearFlag("boss:honored") &&
      this.isCurrentSwordEligibleForExcaliburAscension()
    );
  }

  ascendLongswordToExcalibur(): boolean {
    if (!this.canAscendLongswordToExcalibur()) {
      return false;
    }

    this.unlockedLegendarySwordIds.add("excalibur");
    this.runState.legendarySwordOverrideId = "excalibur";
    this.excaliburAscensionReady = false;
    this.queueSystemMessage("Excalibur answered the ascent.");
    return true;
  }

  canUpgradeCurrentSwordToLegendary(swordId: LegendarySwordId): boolean {
    return this.isLegendarySwordUnlocked(swordId) && this.runState.legendarySwordOverrideId !== swordId;
  }

  upgradeCurrentSwordToLegendary(swordId: LegendarySwordId): boolean {
    if (!this.canUpgradeCurrentSwordToLegendary(swordId)) {
      return false;
    }

    this.runState.legendarySwordOverrideId = swordId;
    this.queueSystemMessage(`${SWORD_DEFINITIONS[swordId].name} takes the line.`);
    return true;
  }

  private ensureWorldGraph(): void {
    if (this.visibleWorldNodeIds.length > 0 && (this.runState.availableNodeIds.length > 0 || this.tutorialMode)) {
      return;
    }

    if (this.visibleWorldNodeIds.length === 0) {
      this.spawnWorldChapter("plains");
      return;
    }

    const firstVisibleNode = this.worldNodes[this.visibleWorldNodeIds[0] ?? ""];
    this.runState.availableNodeIds = firstVisibleNode ? [firstVisibleNode.id] : [];
  }

  private resetWorldGraph(): void {
    this.worldNodes = {};
    this.visibleWorldNodeIds = [];
    this.worldNodeOrdinal = 0;
    this.worldDepthCursor = 0;
  }

  private spawnWorldChapter(startRegionId: RegionId): void {
    if (this.tutorialMode) {
      this.registerWorldChapter(createTutorialChapter(this.worldDepthCursor));
      return;
    }

    const chapter = generateWorldChapter({
      chapterIndex: this.runState.expeditionTier,
      startRegionId,
      nodeOrdinal: this.worldNodeOrdinal,
      startWorldDepth: this.worldDepthCursor,
      ownedRelicIds: this.runState.ownedRelicIds,
      allowRareEvent: !this.rareEventSpawnedThisRun,
      allowSwordInTheStone: this.isLegendarySwordUnlocked("excalibur") && this.runState.legendarySwordOverrideId !== "excalibur"
    });
    this.registerWorldChapter(chapter);
  }

  private registerWorldChapter(chapter: GeneratedWorldChapter): void {
    this.worldNodes = {
      ...this.worldNodes,
      ...chapter.nodes
    };
    const existingVisibleIds = new Set(this.visibleWorldNodeIds);
    this.visibleWorldNodeIds = [...this.visibleWorldNodeIds, ...chapter.nodeIds.filter((nodeId) => !existingVisibleIds.has(nodeId))];
    this.runState.availableNodeIds = [...chapter.startNodeIds];
    this.worldNodeOrdinal = chapter.nextNodeOrdinal;
    this.worldDepthCursor = chapter.nextWorldDepth;
    this.rareEventSpawnedThisRun ||= chapter.spawnedRareEvent ?? false;
  }

  private completeCurrentEncounterNode(): void {
    const nodeId = this.runState.currentEncounterNodeId;

    if (!nodeId) {
      return;
    }

    const node = this.worldNodes[nodeId];

    if (!this.tutorialMode && (node?.type === "miniboss" || node?.type === "boss") && !this.testModeUnlocked) {
      this.testModeUnlocked = true;
      this.queueSystemMessage(`Test Mode password unlocked: ${TEST_MODE_PASSWORD}`);
    }

    if (node?.type === "boss" && node.bossId) {
      const bossDefinition = getBossDefinition(node.bossId);
      const clearFlagId = bossDefinition.clearFlagId ?? `boss:${node.bossId}`;

      if (!this.defeatedBossClearFlags.has(clearFlagId)) {
        this.defeatedBossClearFlags.add(clearFlagId);
        this.queueSystemMessage(
          isSecretBossId(node.bossId) ? `Secret boss logged: ${node.title} defeated.` : `${bossDefinition.name} remembered.`
        );
      }
    }

    if (node?.relicId && !this.runState.ownedRelicIds.includes(node.relicId)) {
      this.runState.ownedRelicIds.push(node.relicId);
    }

    this.runState.currentEncounterNodeId = null;
    this.runState.encounter += 1;
    this.advanceWorldFrontier(nodeId);
  }

  private queueSystemMessage(message: string): void {
    this.pendingSystemMessage = this.pendingSystemMessage ? `${this.pendingSystemMessage}\n${message}` : message;
  }

  private advanceWorldFrontier(nodeId: string): void {
    if (!this.runState.visitedNodeIds.includes(nodeId)) {
      this.runState.visitedNodeIds.push(nodeId);
    }

    const node = this.worldNodes[nodeId];

    if (!node) {
      return;
    }

    if (node.nextNodeIds.length === 0) {
      if (this.tutorialMode) {
        this.runState.availableNodeIds = [];
        return;
      }

      this.runState.expeditionTier += 1;
      const nextRegionId = getNextAnchorRegion(node.regionId, this.runState.expeditionTier);
      const chapter = generateWorldChapter({
        chapterIndex: this.runState.expeditionTier,
        startRegionId: nextRegionId,
        nodeOrdinal: this.worldNodeOrdinal,
        startWorldDepth: this.worldDepthCursor,
        ownedRelicIds: this.runState.ownedRelicIds,
        allowRareEvent: !this.rareEventSpawnedThisRun,
        allowSwordInTheStone: this.isLegendarySwordUnlocked("excalibur") && this.runState.legendarySwordOverrideId !== "excalibur"
      });
      node.nextNodeIds = [...chapter.startNodeIds];
      this.registerWorldChapter(chapter);
      return;
    }

    this.runState.availableNodeIds = [...node.nextNodeIds];
  }

  private transition(scene: Phaser.Scene, sceneKey: SceneKey): void {
    this.currentSceneKey = sceneKey;

    if (!scene.scene.isActive(sceneKey)) {
      scene.scene.start(sceneKey);
      return;
    }

    scene.scene.stop(sceneKey);
    scene.scene.start(sceneKey);
  }

  private rollForgeOffers(): ForgeOfferId[] {
    return shuffleArray(FORGE_OFFER_ORDER).slice(0, 3);
  }

  private rollRunModifiers(): RunModifierId[] {
    const owned = new Set(this.runState.ownedModifierIds);
    const dramaticPool = DRAMATIC_RUN_MODIFIER_IDS.filter((modifierId) => !owned.has(modifierId));
    const standardPool = RUN_MODIFIER_ORDER.filter((modifierId) => !owned.has(modifierId) && !DRAMATIC_RUN_MODIFIER_IDS.includes(modifierId));
    const picks: RunModifierId[] = [];

    if (dramaticPool.length > 0 && Math.random() < 0.34) {
      const dramaticPick = shuffleArray(dramaticPool)[0];

      if (dramaticPick) {
        picks.push(dramaticPick);
      }
    }

    for (const modifierId of shuffleArray([...standardPool, ...dramaticPool])) {
      if (picks.length >= 3 || picks.includes(modifierId)) {
        continue;
      }

      picks.push(modifierId);
    }

    return picks.slice(0, 3);
  }

  private isCurrentSwordEligibleForExcaliburAscension(): boolean {
    const selectedNode = this.getUnlockedWeaponTechDefinitions().find((definition) => definition.swordId === this.runState.selectedSwordId);

    if (!selectedNode || !this.isWeaponTechUnlocked("longsword")) {
      return false;
    }

    const descendantChain = getWeaponTechChain(selectedNode.id);
    const descendsFromLongsword = descendantChain.includes("longsword") && selectedNode.id !== "longsword";
    const childCount = getWeaponTechChildren(selectedNode.id).length;
    return descendsFromLongsword && childCount === 0;
  }
}

export const gameManager = new GameManager();
