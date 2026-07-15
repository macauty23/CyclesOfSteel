export type SwordId =
  | "rapier"
  | "armingSword"
  | "montante"
  | "warArmingSword"
  | "longsword"
  | "greatsword"
  | "zweihander"
  | "flamberge"
  | "landsknechtZweihander"
  | "claymore"
  | "highlandClaymore"
  | "lowlandTwoHandedClaymore"
  | "cavalryArmingSword"
  | "oakeshottTypeXVIIIc"
  | "renaissanceCavalrySword"
  | "heavyCavalrySword"
  | "spanishMontante"
  | "twoHandedMontante"
  | "mastersMontante"
  | "thrustArmingSword"
  | "borderDuelSword"
  | "sidesword"
  | "courtRapier"
  | "mastersRapier"
  | "needleblade"
  | "pappenheimerRapier"
  | "estoc"
  | "twoHandedEstoc"
  | "panzerstecher"
  | "reinforcedEstoc"
  | "broadArmingSword"
  | "falchion"
  | "heavyFalchion"
  | "greatFalchion"
  | "hangerSword"
  | "navalCutlass"
  | "dusack"
  | "hauswehr"
  | "messer"
  | "kriegsmesser"
  | "grossesMesser"
  | "langesMesser"
  | "twoHandedMesser";
export type AttackKind = "light" | "heavy";
export type AttackShape = "thrust" | "sweep";
export type AttackClass = "standard" | "cleave" | "lunge";
export type AttackDelivery = "melee" | "ranged";
export type EnemyPattern = "stalker" | "orbiter" | "crusher";
export type EnemyArmorTier = "unarmored" | "light" | "heavy";
export type EnemySpecialId = "trapper" | "snarePatch" | "burstShot" | "packFrenzy" | "sidestepBurst" | "rushdown";
export type EnemyHazardKind = "bearTrap" | "snarePatch";
export type ForgeTab = "offers" | "modifiers" | "enchantments" | "trinkets";
export type BuildCategoryId = "tempo" | "space" | "commitment" | "control" | "stamina";
export type SwordAffinity = "balanced" | "measure" | "war" | "edge" | "rogue" | "antiArmor";
export type WeaponTechBranchId = "root" | "war" | "thrust" | "broad" | "messer";
export type MaterialId =
  | "steel"
  | "wood"
  | "leather"
  | "gemstone"
  | "essence"
  | "amber"
  | "bamboo"
  | "coral"
  | "obsidian"
  | "crystal"
  | "blossom"
  | "brimstone"
  | "stormglass";
export type RegionId =
  | "forest"
  | "woods"
  | "sea"
  | "ocean"
  | "mountain"
  | "volcano"
  | "grasslands"
  | "savannah"
  | "plains"
  | "tundra"
  | "frostlands"
  | "volcanicLand"
  | "shore"
  | "village"
  | "town"
  | "kingdom"
  | "frozenPeaks"
  | "grove"
  | "jungle"
  | "river"
  | "desert"
  | "oasis"
  | "canyon"
  | "badlands"
  | "marsh"
  | "swamp"
  | "wetlands"
  | "highlands"
  | "cliffs"
  | "caverns"
  | "crystalCaverns"
  | "redwoodForest"
  | "bambooForest"
  | "cherryGrove"
  | "rainforest"
  | "pineForest"
  | "glacier"
  | "iceCaves"
  | "snowyForest"
  | "ashlands"
  | "lavaFields"
  | "obsidianWastes"
  | "sulfurSprings"
  | "scorchedPlateau"
  | "archipelago"
  | "coralCoast"
  | "coralReef"
  | "grandReef"
  | "mangrove"
  | "ancientRuins"
  | "forgottenTemple"
  | "sacredGrove"
  | "spiritMarsh"
  | "sunkenRuins"
  | "crystalValley"
  | "skyIslands";
export type WorldNodeType = "battle" | "miniboss" | "event" | "merchant" | "relic";
export type EnchantmentId =
  | "flame"
  | "frost"
  | "volt"
  | "terra"
  | "blessed";
export type RelicId =
  | "foundrySeal"
  | "greenwayCompass"
  | "sanctumLens"
  | "coastlineCharm"
  | "starfallDiadem";
export type SwordPartId = "blade" | "crossGuard" | "pommel" | "hilt" | "tip";
export type SwordPartOptionId = string;
export type WeaponTechNodeId =
  | "armingSword"
  | "warArmingSword"
  | "longsword"
  | "greatsword"
  | "zweihander"
  | "flamberge"
  | "landsknechtZweihander"
  | "claymore"
  | "highlandClaymore"
  | "lowlandTwoHandedClaymore"
  | "montante"
  | "spanishMontante"
  | "twoHandedMontante"
  | "mastersMontante"
  | "cavalryArmingSword"
  | "oakeshottTypeXVIIIc"
  | "renaissanceCavalrySword"
  | "heavyCavalrySword"
  | "thrustArmingSword"
  | "borderDuelSword"
  | "sidesword"
  | "rapierLine"
  | "courtRapier"
  | "mastersRapier"
  | "needleblade"
  | "pappenheimerRapier"
  | "estoc"
  | "twoHandedEstoc"
  | "panzerstecher"
  | "reinforcedEstoc"
  | "broadArmingSword"
  | "falchion"
  | "heavyFalchion"
  | "greatFalchion"
  | "hangerSword"
  | "navalCutlass"
  | "dusack"
  | "hauswehr"
  | "messer"
  | "kriegsmesser"
  | "grossesMesser"
  | "langesMesser"
  | "twoHandedMesser";
export type EnemyId = string;
export type EnemyVisualStyle = "beast" | "raider" | "polearm" | "archer" | "caster" | "brute" | "guardian";
export type ForgeOfferId =
  | "duelistStep"
  | "threadedPoint"
  | "sweepingRings"
  | "temperedWeight"
  | "quickdrawLatch"
  | "anchoredGrip"
  | "magnetPommel"
  | "silverFiligree"
  | "longMarch"
  | "lineFeint"
  | "measuredGrip"
  | "marchingCalves"
  | "edgeAwareness"
  | "coiledLunge";
export type RunModifierId =
  | "measuredApproach"
  | "guardTax"
  | "bloodRush"
  | "narrowGate"
  | "longStep"
  | "ironPulse"
  | "lessonOfSteel"
  | "footworkDrill"
  | "bindStudy"
  | "breathingCadence"
  | "cuttingForms";

export interface HitImpactProfile {
  displacement: number;
  controlLossMs: number;
  interruptChance: number;
  hitstopMs: number;
  cameraShake: number;
}

export interface AttackProfile {
  name: string;
  shape: AttackShape;
  attackClass: AttackClass;
  delivery?: AttackDelivery;
  damage: number;
  range: number;
  width: number;
  windup: number;
  active: number;
  recovery: number;
  lunge: number;
  staminaCost: number;
  commitWeight: number;
  drift: number;
  impact: HitImpactProfile;
  tint: number;
}

export interface SwordTradeoffRatings {
  tempo: number;
  reach: number;
  commitment: number;
}

export interface SwordAffinityCaps {
  categoryLimit: number;
  maxSweepWidthBonus: number;
  maxReachBonus: number;
  maxMoveSpeedBonus: number;
  maxStaminaDiscount: number;
  minDashCooldown: number;
  minCommitWeight: number;
}

export interface SwordTechniqueProfile {
  identity: string;
  traitPrimary: string;
  traitSecondary: string;
  parryWindowMultiplier?: number;
  perfectBindWindowMultiplier?: number;
  missRecoveryScale?: number;
  thrustMissRecoveryScale?: number;
  lightHitRecoveryScale?: number;
  heavyHitRecoveryScale?: number;
  heavyCannotBeInterrupted?: boolean;
  heavyPushMultiplier?: number;
  postBindThrustRangeBonus?: number;
  postBindThrustDamageBonus?: number;
  heavyStunMs?: number;
  heavyKnockbackMultiplier?: number;
  thrustRangeBonus?: number;
  firstHitBonusDamage?: number;
  dashRefundOnHit?: number;
  riposteDamageBonus?: number;
  alternateAttackBonus?: number;
  healOnPerfectBind?: number;
  heavyThrustLungeBonus?: number;
  thrustHitDashRefund?: number;
  hitMoveBoostMultiplier?: number;
  hitMoveBoostDurationMs?: number;
  thrustStreakDamageStep?: number;
  thrustStreakMaxStacks?: number;
  perfectBindSlowFactor?: number;
  perfectBindSlowDurationMs?: number;
  bleedOnHitDamage?: number;
  bleedOnHitDurationMs?: number;
  bleedOnHeavyDamage?: number;
  bleedOnHeavyDurationMs?: number;
  bleedStackStep?: number;
  ignoreArmorOnThrust?: boolean;
  heavyCarryMultiplier?: number;
  chargedHeavyBonus?: number;
  sweepWidthBonus?: number;
  heavySlowFactor?: number;
  heavySlowDurationMs?: number;
  executeThreshold?: number;
  executeDamageBonus?: number;
  dashAttackBonus?: number;
  dashRecoveryScale?: number;
  nextAttackAfterBindBonus?: number;
  heavyHitDashRefund?: number;
  perfectBindThrustRangeBonus?: number;
  perfectBindThrustLungeBonus?: number;
  perfectBindThrustDamageBonus?: number;
  bindSlowDurationMs?: number;
  criticalChanceBonus?: number;
  criticalDamageMultiplier?: number;
  armorPierceRatio?: number;
  bonusDamageVsPolearm?: number;
  bonusDamageVsLightArmor?: number;
  postBindGuardDamageScale?: number;
  chargeDamageBonus?: number;
  staminaMaxBonus?: number;
  staminaRegenBonus?: number;
  dashStaminaCostModifier?: number;
  measureBonusDamage?: number;
  bindImpactMultiplier?: number;
}

export interface MaterialInventory {
  steel: number;
  wood: number;
  leather: number;
  gemstone: number;
  essence: number;
  amber: number;
  bamboo: number;
  coral: number;
  obsidian: number;
  crystal: number;
  blossom: number;
  brimstone: number;
  stormglass: number;
}

export type MaterialCost = Partial<MaterialInventory>;

export interface SwordDefinition {
  id: SwordId;
  name: string;
  epithet: string;
  affinity: SwordAffinity;
  accent: number;
  maxHp: number;
  summary: string;
  lightSummary: string;
  heavySummary: string;
  moveSpeed: number;
  moveAcceleration: number;
  drag: number;
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
  attackControlWindup: number;
  attackControlActive: number;
  bodyWidth: number;
  bodyHeight: number;
  bladeLength: number;
  bladeWidth: number;
  guardSize: number;
  dashTrailLength: number;
  dashTrailWidth: number;
  lightAttack: AttackProfile;
  heavyAttack: AttackProfile;
  tradeoffs: SwordTradeoffRatings;
  caps: SwordAffinityCaps;
  techniques: SwordTechniqueProfile;
}

export interface WeaponTechBonuses {
  maxHp?: number;
  moveSpeed?: number;
  moveAcceleration?: number;
  drag?: number;
  dashSpeed?: number;
  dashDuration?: number;
  dashCooldown?: number;
  attackControlWindup?: number;
  attackControlActive?: number;
  comboWindow?: number;
  parryWindow?: number;
  parryRecovery?: number;
  parryCooldown?: number;
  parryReflectRatio?: number;
  parryStunMs?: number;
  pickupRadius?: number;
  bonusDrops?: number;
  lightDamage?: number;
  lightRange?: number;
  lightWidth?: number;
  lightActive?: number;
  lightLunge?: number;
  lightKnockback?: number;
  lightWindupScale?: number;
  lightRecoveryScale?: number;
  heavyDamage?: number;
  heavyRange?: number;
  heavyWidth?: number;
  heavyActive?: number;
  heavyLunge?: number;
  heavyKnockback?: number;
  heavyWindupScale?: number;
  heavyRecoveryScale?: number;
  thrustDamage?: number;
  thrustRange?: number;
  thrustWidth?: number;
  thrustActive?: number;
  thrustLunge?: number;
  thrustKnockback?: number;
  thrustWindupScale?: number;
  thrustRecoveryScale?: number;
  sweepDamage?: number;
  sweepRange?: number;
  sweepWidth?: number;
  sweepActive?: number;
  sweepLunge?: number;
  sweepKnockback?: number;
  sweepWindupScale?: number;
  sweepRecoveryScale?: number;
}

export interface WeaponTechDefinition {
  id: WeaponTechNodeId;
  branch: WeaponTechBranchId;
  swordId: SwordId;
  name: string;
  shortName: string;
  summary: string;
  detail: string;
  accent: number;
  cost: MaterialCost;
  prerequisiteIds: WeaponTechNodeId[];
  position: {
    x: number;
    y: number;
  };
  bonuses: WeaponTechBonuses;
}

export interface RegionDefinition {
  id: RegionId;
  name: string;
  theme: string;
  summary: string;
  primaryMaterials: MaterialId[];
  enemyRoster: string[];
  merchantTheme: string;
  hiddenEvent: string;
  uniqueRelicId?: RelicId;
  accent: number;
  fill: number;
  edge: number;
}

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  summary: string;
  visualStyle: EnemyVisualStyle;
  accent: number;
  gearColor: number;
  armor: EnemyArmorTier;
  pattern: EnemyPattern;
  maxHp: number;
  speed: number;
  acceleration: number;
  aggression: number;
  size: number;
  lightAttack: AttackProfile;
  heavyAttack: AttackProfile;
  specialIds?: EnemySpecialId[];
}

export interface EnemyHazardSignal {
  kind: EnemyHazardKind;
  x: number;
  y: number;
  radius: number;
  armDelayMs: number;
  durationMs: number;
  damage: number;
  controlLockMs: number;
  tint: number;
  triggerText: string;
}

export interface WorldNodeDefinition {
  id: string;
  regionId: RegionId;
  type: WorldNodeType;
  lane: number;
  depth: number;
  worldDepth: number;
  title: string;
  subtitle: string;
  nextNodeIds: string[];
  rewardMaterials: MaterialCost;
  enemyId?: EnemyId;
  armor?: EnemyArmorTier;
  pattern?: EnemyPattern;
  optional?: boolean;
  hidden?: boolean;
  isBoss?: boolean;
  relicId?: RelicId;
}

export interface EnchantmentDefinition {
  id: EnchantmentId;
  name: string;
  summary: string;
  detail: string;
  accent: number;
  biasMaterialId?: MaterialId;
  biasCost?: MaterialCost;
}

export interface RelicDefinition {
  id: RelicId;
  name: string;
  summary: string;
  detail: string;
  accent: number;
  regionId: RegionId;
}

export interface SwordPartStatAdjustments {
  maxHp?: number;
  moveSpeed?: number;
  moveAcceleration?: number;
  dashSpeed?: number;
  dashDuration?: number;
  dashCooldown?: number;
  attackControlWindup?: number;
  attackControlActive?: number;
  parryWindow?: number;
  parryReflectRatio?: number;
  staminaMax?: number;
  staminaRegen?: number;
  incomingDamageScale?: number;
  pickupRadius?: number;
  lightDamage?: number;
  heavyDamage?: number;
  lightRange?: number;
  heavyRange?: number;
  lightWidth?: number;
  heavyWidth?: number;
  lightRecovery?: number;
  heavyRecovery?: number;
  lightWindup?: number;
  heavyWindup?: number;
  lightLunge?: number;
  heavyLunge?: number;
  lightImpactControlLoss?: number;
  heavyImpactControlLoss?: number;
  lightImpactDisplacement?: number;
  heavyImpactDisplacement?: number;
}

export interface SwordPartVisualAdjustments {
  bladeLength?: number;
  bladeWidth?: number;
  guardLength?: number;
  guardWidth?: number;
  hiltLength?: number;
  hiltWidth?: number;
  pommelRadius?: number;
  tipSize?: number;
  tint?: number;
}

export interface SwordPartOptionDefinition {
  id: SwordPartOptionId;
  partId: SwordPartId;
  name: string;
  summary: string;
  detail: string;
  cost: MaterialCost;
  accent: number;
  effects: SwordPartStatAdjustments;
  visual: SwordPartVisualAdjustments;
}

export interface RunState {
  selectedSwordId: SwordId;
  materials: MaterialInventory;
  encounter: number;
  unlockedTechNodeIds: WeaponTechNodeId[];
  ownedOfferIds: ForgeOfferId[];
  currentOfferIds: ForgeOfferId[];
  hasTakenForgeOffer: boolean;
  claimedOfferId: ForgeOfferId | null;
  activeModifierId: RunModifierId | null;
  currentModifierIds: RunModifierId[];
  claimedModifierId: RunModifierId | null;
  currentEnchantmentId: EnchantmentId | null;
  currentEnchantmentOfferIds: EnchantmentId[];
  pendingEnchantmentBiasId: EnchantmentId | null;
  ownedRelicIds: RelicId[];
  ownedModifierIds: RunModifierId[];
  ownedSwordPartOptionIds: SwordPartOptionId[];
  equippedSwordPartOptionIds: Record<SwordPartId, SwordPartOptionId>;
  availableNodeIds: string[];
  visitedNodeIds: string[];
  currentEncounterNodeId: string | null;
  expeditionTier: number;
}

export interface CombatStats {
  sword: SwordDefinition;
  combatStyle: SwordDefinition;
  maxHp: number;
  moveSpeed: number;
  moveAcceleration: number;
  drag: number;
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
  lightAttack: AttackProfile;
  heavyAttack: AttackProfile;
  damageBonus: number;
  reachBonus: number;
  tempoScale: number;
  attackControlWindup: number;
  attackControlActive: number;
  comboWindow: number;
  parryWindow: number;
  parryRecovery: number;
  parryCooldown: number;
  parryReflectRatio: number;
  parryStunMs: number;
  pickupRadius: number;
  bonusDrops: number;
  staminaMax: number;
  staminaRegen: number;
  dashStaminaCost: number;
  incomingDamageScale: number;
  onHitBurnDamage: number;
  onHitBurnDurationMs: number;
  onHitSlowFactor: number;
  onHitSlowDurationMs: number;
}

export interface EncounterConfig {
  levelNumber: number;
  title: string;
  subtitle: string;
  regionId: RegionId;
  regionName: string;
  nodeType: WorldNodeType;
  enemyRoster: string[];
  armor: EnemyArmorTier;
  enemyHp: number;
  enemySpeed: number;
  enemyAcceleration: number;
  enemyId: EnemyId;
  enemyDamageBonus: number;
  enemyAggression: number;
  dropCount: number;
  arenaFill: number;
  arenaEdge: number;
  enemyTint: number;
  enemySize: number;
  pattern: EnemyPattern;
  rewardMaterials: MaterialCost;
  optional?: boolean;
}

export interface ForgeOfferDefinition {
  id: ForgeOfferId;
  category: BuildCategoryId;
  name: string;
  summary: string;
  detail: string;
  accent: number;
}

export interface RunModifierDefinition {
  id: RunModifierId;
  category: BuildCategoryId;
  name: string;
  summary: string;
  detail: string;
  accent: number;
}

export interface AttackExecutionSignal {
  id: number;
  kind: AttackKind;
  profile: AttackProfile;
  rangeAnchor?: number;
  fullyCharged: boolean;
  direction: {
    x: number;
    y: number;
  };
  angle: number;
}

export interface CombatStatusSnapshot {
  facing: {
    x: number;
    y: number;
  };
  dashCooldownRemaining: number;
  parryCooldownRemaining: number;
  parryWindowRemaining: number;
  actionTimeRemaining: number;
  moveBoostRemaining: number;
  stamina: number;
  staminaMax: number;
  isDashing: boolean;
  isAttacking: boolean;
  isParrying: boolean;
}
