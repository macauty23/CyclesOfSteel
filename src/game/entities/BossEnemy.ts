import Phaser from "phaser";
import type {
  AttackExecutionSignal,
  AttackKind,
  AttackProfile,
  BossDefinition,
  BossPhaseHp,
  EnemyCombatSnapshot,
  EnemyHazardSignal,
  EnemyUpdateResult,
  HitImpactProfile
} from "../core/types";
import { BOSS_TUNING } from "../data/bossTuning";
import { ARENA, COLORS } from "../ui/theme";

type BossBody = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.Body;
};

interface BossConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  phaseHp: BossPhaseHp;
  speed: number;
  acceleration: number;
  tint: number;
  size: number;
  definition: BossDefinition;
  attackDamageBonus: number;
  aggression: number;
}

interface BossAttackState {
  signal: AttackExecutionSignal;
  phase: "windup" | "active" | "recovery";
  remaining: number;
}

interface BossAttackKit {
  light: AttackProfile;
  heavy: AttackProfile;
  signature?: AttackProfile;
  counter?: AttackProfile;
}

interface ArenaTargetState {
  isAttacking: boolean;
  isDashing: boolean;
  isParrying: boolean;
  isFooling?: boolean;
}

function createImpact(
  displacement: number,
  controlLossMs: number,
  hitstopMs: number,
  cameraShake: number,
  interruptChance = 0.26
): HitImpactProfile {
  return {
    displacement: Math.round(displacement * 0.94),
    controlLossMs: Math.round(controlLossMs * 0.94),
    interruptChance,
    hitstopMs: Math.round(hitstopMs * 0.94),
    cameraShake: cameraShake * 0.92
  };
}

function createAttack(
  name: string,
  tint: number,
  shape: AttackProfile["shape"],
  attackClass: AttackProfile["attackClass"],
  delivery: AttackProfile["delivery"],
  damage: number,
  range: number,
  width: number,
  windup: number,
  active: number,
  recovery: number,
  lunge: number,
  impact: HitImpactProfile
): AttackProfile {
  return {
    name,
    shape,
    attackClass,
    delivery,
    damage: Math.max(1, Math.round(damage * 0.94)),
    range,
    width,
    windup,
    active,
    recovery,
    lunge,
    staminaCost: 0,
    commitWeight: 1,
    drift: 0,
    impact,
    tint
  };
}

function clampToArena(x: number, y: number, padding = 48): { x: number; y: number } {
  return {
    x: Phaser.Math.Clamp(x, ARENA.x + padding, ARENA.x + ARENA.width - padding),
    y: Phaser.Math.Clamp(y, ARENA.y + padding, ARENA.y + ARENA.height - padding)
  };
}

export class BossEnemy {
  readonly bodyObject: BossBody;
  readonly bodyShadow: Phaser.GameObjects.Ellipse;
  readonly auraRing: Phaser.GameObjects.Ellipse;
  readonly ornamentPrimary: Phaser.GameObjects.Shape;
  readonly ornamentSecondary: Phaser.GameObjects.Shape;
  readonly weaponGuard: Phaser.GameObjects.Shape;
  readonly weaponBlade: Phaser.GameObjects.Shape;
  readonly bodySprite: Phaser.GameObjects.Image | null;

  private readonly scene: Phaser.Scene;
  private readonly definition: BossDefinition;
  private readonly phaseHp: number[];
  private readonly speed: number;
  private readonly acceleration: number;
  private readonly size: number;
  private readonly accent: number;
  private readonly phaseAttackKits: BossAttackKit[];
  private readonly facing = new Phaser.Math.Vector2(-1, 0);

  private currentPhaseIndex = 0;
  private currentPhaseHp: number;
  private phaseSpriteBaseScale = 1;
  private isDestroyed = false;
  private attackId = 0;
  private currentAttack: BossAttackState | null = null;
  private attackCooldownRemaining = 460;
  private specialCooldownRemaining = 1800;
  private arenaCooldownRemaining = 1600;
  private phaseTransitionRemaining = 0;
  private resolve = 0;
  private resolveQuietRemaining = 0;
  private momentumRecoveryRemaining = 0;
  private permafrostInitiativeRemaining = 0;
  private enflamedPrediction: {
    stage: "arrival" | "lance" | "dive";
    remaining: number;
    destination: { x: number; y: number };
    lanceDirection: Phaser.Math.Vector2;
    diveDirection: Phaser.Math.Vector2;
  } | null = null;
  private stunRemaining = 0;
  private slowRemaining = 0;
  private slowFactor = 1;
  private bleedRemaining = 0;
  private bleedTickRemaining = 0;
  private bleedDamage = 0;
  private guardRemaining = 0;
  private postTeleportRecoveryRemaining = 0;
  private counterQueued = false;
  private strideDirection = 1;
  private strideFlipRemaining = 620;
  private enflamedTeleportIndex = 0;
  private enflamedDiveReady = false;
  private exaltedPatternIndex = 0;
  private skelecarTeleportIndex = 0;
  private skelecarVolleyReady = false;
  private danuPatternIndex = 0;
  private presentationTime = 0;
  private lastTargetAngle: number | null = null;
  private orbitDirectionSign = 0;
  private orbitConsistencyMs = 0;
  private orbitTravelRadians = 0;
  private orbitSideExposureMs = 0;
  private orbitRearExposureMs = 0;
  private orbitBreakCooldownRemaining = 0;
  private orbitBreakWindowRemaining = 0;
  private presentationScale = 1;
  private collisionWidth = 0;
  private collisionHeight = 0;

  constructor(config: BossConfig) {
    const { scene, x, y, phaseHp, speed, acceleration, tint, size, definition, attackDamageBonus, aggression } = config;

    this.scene = scene;
    this.definition = definition;
    this.phaseHp = [...phaseHp];
    this.currentPhaseHp = this.phaseHp[0];
    this.speed = speed;
    this.acceleration = acceleration;
    this.size = size;
    this.accent = tint;
    this.phaseAttackKits = this.createAttackKits(attackDamageBonus, aggression);

    this.bodyShadow = scene.add.ellipse(x, y + this.size * 0.28, this.size * 1.04, this.size * 0.4, 0x05070a, 0.24).setDepth(4);
    this.auraRing = scene.add.ellipse(x, y, this.size * 1.38, this.size * 1.08, this.definition.edge, 0.12).setDepth(4.5);
    this.bodyObject = scene.add
      .rectangle(x, y, this.size, this.size, this.accent)
      .setStrokeStyle(3, COLORS.ghost, 0.32)
      .setDepth(5) as BossBody;
    this.bodySprite = this.createPhaseSprite(x, y);

    const ornaments = this.createOrnaments(x, y);
    this.ornamentPrimary = ornaments.primary;
    this.ornamentSecondary = ornaments.secondary;
    this.weaponGuard = ornaments.guard;
    this.weaponBlade = ornaments.blade;

    scene.physics.add.existing(this.bodyObject);
    this.bodyObject.body.setAllowGravity(false);
    this.bodyObject.body.setDrag(1920, 1920);
    this.bodyObject.body.setMaxVelocity(this.speed, this.speed);
    this.bodyObject.body.setCollideWorldBounds(true);
    this.collisionWidth = Math.max(30, this.size - 10);
    this.collisionHeight = Math.max(30, this.size - 10);
    this.bodyObject.body.setSize(this.collisionWidth, this.collisionHeight, true);
    this.bodyObject.body.setBoundsRectangle(new Phaser.Geom.Rectangle(ARENA.x, ARENA.y, ARENA.width, ARENA.height));

    this.syncPresentation();
  }

  get health(): { current: number; max: number } {
    return {
      current: this.currentPhaseHp,
      max: this.phaseHp[this.currentPhaseIndex] ?? this.phaseHp[0]
    };
  }

  get alive(): boolean {
    return !this.isDestroyed;
  }

  get x(): number {
    return this.bodyObject.x;
  }

  get y(): number {
    return this.bodyObject.y;
  }

  setPresentationScale(scale: number): void {
    this.presentationScale = Phaser.Math.Clamp(scale, 1, 2);
    this.syncPresentation();
  }

  get weaponName(): string {
    return this.definition.name;
  }

  getCurrentPhase(): number {
    return this.currentPhaseIndex + 1;
  }

  getBossLabel(): string {
    return `[${this.definition.name} - Phase ${this.getCurrentPhase()}]`;
  }

  getCombatSnapshot(): EnemyCombatSnapshot {
    return {
      phase: this.currentAttack?.phase ?? "idle",
      isStunned: this.stunRemaining > 0 || this.phaseTransitionRemaining > 0,
      guardRemaining: this.guardRemaining,
      slowRemaining: this.slowRemaining
    };
  }

  getResolvePercent(): number {
    return Math.round((this.resolve / BOSS_TUNING.resolve.max) * 100);
  }

  /** Applies persistent anti-bully resistance without using the player combo counter. */
  resolveIncomingPressure(
    damage: number,
    impact: HitImpactProfile,
    dominion: boolean,
    heavy: boolean
  ): { damage: number; impact: HitImpactProfile; resolvePercent: number } {
    if (this.definition.pool !== "biome") {
      return { damage, impact, resolvePercent: 0 };
    }

    const penetration = dominion ? BOSS_TUNING.resolve.dominionPenetration : 0;
    const effectiveResolve = this.resolve * (1 - penetration);
    const resolveRatio = effectiveResolve / BOSS_TUNING.resolve.max;
    const damageScale = 1 - resolveRatio * BOSS_TUNING.resolve.maxDamageMitigation;
    const impactScale = 1 - resolveRatio * BOSS_TUNING.resolve.maxImpactMitigation;
    const resolved = {
      damage: Math.max(1, Math.round(damage * damageScale)),
      impact: {
        ...impact,
        displacement: Math.max(0, Math.round(impact.displacement * impactScale)),
        controlLossMs: Math.max(0, Math.round(impact.controlLossMs * impactScale)),
        interruptChance: Math.max(0.04, impact.interruptChance * impactScale)
      },
      resolvePercent: this.getResolvePercent()
    };

    this.resolve = Math.min(
      BOSS_TUNING.resolve.max,
      this.resolve + BOSS_TUNING.resolve.gainPerPressureHit + (heavy ? BOSS_TUNING.resolve.heavyHitBonus : 0)
    );
    this.resolveQuietRemaining = 0;
    return resolved;
  }

  noteRegainedInitiative(): void {
    if (this.definition.pool !== "biome") {
      return;
    }

    this.resolve = Math.max(0, this.resolve - BOSS_TUNING.resolve.initiativeDecay);
    this.resolveQuietRemaining = 0;
  }

  notifyAttackMissed(signal: AttackExecutionSignal): boolean {
    if (this.definition.id !== "apex" || !this.isMomentumCharge(signal)) {
      return false;
    }

    const phaseIndex = Math.min(2, this.currentPhaseIndex) as 0 | 1 | 2;
    this.momentumRecoveryRemaining = Math.max(this.momentumRecoveryRemaining, BOSS_TUNING.apex.missedChargeRecoveryMs[phaseIndex]);
    this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, this.momentumRecoveryRemaining);
    this.guardRemaining = 0;
    return true;
  }

  getTelegraphSignal(): AttackExecutionSignal | null {
    if (this.phaseTransitionRemaining > 0) {
      return null;
    }

    return this.currentAttack?.phase === "windup" ? this.currentAttack.signal : null;
  }

  update(targetX: number, targetY: number, targetState: ArenaTargetState, deltaMs: number): EnemyUpdateResult {
    if (!this.alive) {
      return {};
    }

    this.presentationTime += deltaMs;
    this.tickStatuses(deltaMs);

    if (!this.alive) {
      return {};
    }

    const toTarget = new Phaser.Math.Vector2(targetX - this.x, targetY - this.y);
    const distance = Math.max(1, toTarget.length());
    const normalized = toTarget.scale(1 / distance);
    this.updateOrbitAwareness(targetX, targetY, normalized, distance, deltaMs);
    this.updateFacing(normalized, targetX, targetY, distance, deltaMs);

    // Fool tempts a boss into its next authored action sooner without replacing
    // that boss's move selection, phase logic, or arena scripting.
    if (targetState.isFooling) {
      this.attackCooldownRemaining = Math.min(this.attackCooldownRemaining, 88);
    }

    const result: EnemyUpdateResult = {};
    const attackResult = this.updateAttackState(deltaMs);

    if (attackResult.activatedAttack) {
      result.activatedAttack = attackResult.activatedAttack;
    }

    if (attackResult.endedAttack) {
      result.endedAttack = attackResult.endedAttack;
    }

    if (attackResult.spawnedProjectiles?.length) {
      result.spawnedProjectiles = attackResult.spawnedProjectiles;
    }

    const predictionResult = this.updateEnflamedPrediction(deltaMs, targetX, targetY);
    if (predictionResult) {
      if (predictionResult.spawnedHazards?.length) {
        result.spawnedHazards = [...(result.spawnedHazards ?? []), ...predictionResult.spawnedHazards];
      }
      if (predictionResult.feedbackText) {
        result.feedbackText = predictionResult.feedbackText;
        result.feedbackColor = predictionResult.feedbackColor;
      }
      this.bodyObject.body.setAcceleration(0, 0);
      this.syncPresentation();
      return result;
    }

    if (this.phaseTransitionRemaining > 0) {
      this.bodyObject.body.setAcceleration(0, 0);
      this.bodyObject.body.setVelocity(this.bodyObject.body.velocity.x * 0.84, this.bodyObject.body.velocity.y * 0.84);
      this.syncPresentation();
      return result;
    }

    if (this.currentAttack || this.stunRemaining > 0) {
      this.syncPresentation();
      return result;
    }

    if (this.momentumRecoveryRemaining > 0) {
      this.bodyObject.body.setAcceleration(0, 0);
      this.bodyObject.body.setVelocity(this.bodyObject.body.velocity.x * 0.76, this.bodyObject.body.velocity.y * 0.76);
      this.syncPresentation();
      return result;
    }

    if (this.counterQueued) {
      const counter = this.getCurrentAttackKit().counter;

      if (counter) {
        this.counterQueued = false;
        this.startAttack("heavy", counter);
        this.syncPresentation();
        return result;
      }

      this.counterQueued = false;
    }

    const specialResult = this.tryUseSpecial(distance, normalized, targetX, targetY, targetState);
    if (specialResult.spawnedHazards?.length) {
      result.spawnedHazards = [...(result.spawnedHazards ?? []), ...specialResult.spawnedHazards];
    }
    if (specialResult.spawnedProjectiles?.length) {
      result.spawnedProjectiles = [...(result.spawnedProjectiles ?? []), ...specialResult.spawnedProjectiles];
    }
    if (specialResult.performedSpecial) {
      result.performedSpecial = true;
    }
    if (specialResult.feedbackText) {
      result.feedbackText = specialResult.feedbackText;
      result.feedbackColor = specialResult.feedbackColor;
    }

    if (specialResult.performedSpecial) {
      this.syncPresentation();
      return result;
    }

    if (!this.currentAttack && this.attackCooldownRemaining <= 0 && this.shouldAttack(distance, targetState)) {
      const selection = this.chooseAttack(distance, targetState);
      this.startAttack(selection.kind, selection.profile);
    }

    this.updateMovement(distance, normalized, targetState);
    this.syncPresentation();
    return result;
  }

  takeDamage(amount: number, direction: { x: number; y: number }, impact: HitImpactProfile): boolean {
    if (this.phaseTransitionRemaining > 0) {
      return false;
    }

    let resolvedAmount = amount;
    let resolvedImpact = impact;

    if (this.guardRemaining > 0) {
      const guardScale =
        this.definition.id === "honored"
          ? 0.18
          : this.definition.id === "enflamed"
            ? 0.46
            : this.definition.id === "exalted"
              ? 0.28
              : this.definition.id === "danu"
                ? 0.3
                : this.definition.id === "skelecar"
                  ? 0.5
                  : 0.34;
      resolvedAmount = Math.max(1, Math.round(amount * guardScale));
      resolvedImpact = {
        ...impact,
        displacement: Math.round(impact.displacement * 0.2),
        controlLossMs: Math.round(impact.controlLossMs * 0.28),
        interruptChance: Math.min(0.08, impact.interruptChance * 0.35)
      };

      if (this.definition.id === "honored" || this.definition.id === "permafrost") {
        this.counterQueued = true;
        this.attackCooldownRemaining = Math.min(this.attackCooldownRemaining, 100);
      }
    }

    return this.applyDamage(resolvedAmount, direction, resolvedImpact, true, true);
  }

  applySlow(durationMs: number, factor: number): void {
    if (!this.alive || durationMs <= 0 || this.phaseTransitionRemaining > 0) {
      return;
    }

    this.slowRemaining = Math.max(this.slowRemaining, durationMs);
    this.slowFactor = Math.min(this.slowFactor, Phaser.Math.Clamp(factor, 0.42, 1));
    const phaseScale = this.getPhaseMoveScale();
    this.bodyObject.body.setMaxVelocity(this.speed * this.slowFactor * phaseScale, this.speed * this.slowFactor * phaseScale);
    this.syncPresentation();
  }

  applyBleed(totalDamage: number, durationMs: number): void {
    if (!this.alive || totalDamage <= 0 || durationMs <= 0 || this.phaseTransitionRemaining > 0) {
      return;
    }

    this.bleedRemaining = Math.max(this.bleedRemaining, durationMs);
    this.bleedTickRemaining = Math.min(this.bleedTickRemaining || 420, 420);
    this.bleedDamage += totalDamage / Math.max(1, Math.round(durationMs / 420));
    this.syncPresentation();
  }

  stun(durationMs: number): void {
    if (!this.alive || this.phaseTransitionRemaining > 0) {
      return;
    }

    const appliedDuration = this.guardRemaining > 0 ? Math.round(durationMs * 0.5) : durationMs;
    this.stunRemaining = Math.max(this.stunRemaining, appliedDuration);
    this.currentAttack = null;
    this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, appliedDuration + 150);
    this.bodyObject.body.setAcceleration(0, 0);
    this.bodyObject.setFillStyle(0xe6d1a4);
    this.scene.tweens.add({
      targets: [this.bodyObject, this.auraRing],
      alpha: 0.72,
      duration: 76,
      yoyo: true,
      repeat: 1
    });

    if (this.bodySprite) {
      this.scene.tweens.add({
        targets: this.bodySprite,
        alpha: 0.78,
        duration: 76,
        yoyo: true,
        repeat: 1
      });
    }

    this.syncPresentation();
  }

  breakGuard(stunMs: number): void {
    if (!this.alive || this.phaseTransitionRemaining > 0) {
      return;
    }

    this.guardRemaining = 0;
    this.counterQueued = false;
    if (this.definition.id === "exalted") {
      this.arenaCooldownRemaining = Math.max(this.arenaCooldownRemaining, BOSS_TUNING.exalted.bindReconfigurationDelayMs);
    }
    this.stun(stunMs);
  }

  private getCurrentAttackKit(): BossAttackKit {
    return this.phaseAttackKits[this.currentPhaseIndex] ?? this.phaseAttackKits[0];
  }

  private getPhaseMoveScale(): number {
    const phaseTwo = this.currentPhaseIndex > 0;
    const phaseThree = this.currentPhaseIndex >= 2;

    switch (this.definition.id) {
      case "apex":
        return phaseThree ? 1.18 : phaseTwo ? 1.02 : 0.92;
      case "enflamed":
        return phaseThree ? 1.08 : phaseTwo ? 1.14 : 1;
      case "honored":
        return phaseThree ? 0.88 : phaseTwo ? 0.82 : 0.7;
      case "exalted":
        return phaseThree ? 0.9 : phaseTwo ? 0.84 : 0.72;
      case "permafrost":
        return phaseThree ? 0.84 : phaseTwo ? 0.9 : 0.76;
      case "skelecar":
        return phaseTwo ? 1.18 : 1.08;
      case "danu":
        return phaseTwo ? 1.02 : 0.9;
      default:
        return phaseTwo ? 1.16 : 1.02;
    }
  }

  private getPhaseCooldownScale(): number {
    const phaseTwo = this.currentPhaseIndex > 0;
    if (this.currentPhaseIndex >= 2 && this.definition.pool === "biome") {
      return BOSS_TUNING.phaseThreeCadence[this.definition.id as keyof typeof BOSS_TUNING.phaseThreeCadence];
    }

    switch (this.definition.id) {
      case "apex":
        return phaseTwo ? 1.02 : 1.22;
      case "enflamed":
        return phaseTwo ? 0.78 : 0.96;
      case "honored":
        return phaseTwo ? 1.12 : 1.34;
      case "exalted":
        return phaseTwo ? 1.1 : 1.3;
      case "permafrost":
        return phaseTwo ? 1.18 : 1.38;
      case "skelecar":
        return phaseTwo ? 0.84 : 0.98;
      case "danu":
        return phaseTwo ? 0.98 : 1.12;
      default:
        return phaseTwo ? 0.68 : 0.88;
    }
  }

  private getBaseAttackCooldown(): number {
    switch (this.definition.id) {
      case "apex":
        return 700;
      case "enflamed":
        return 560;
      case "honored":
        return 790;
      case "exalted":
        return 840;
      case "permafrost":
        return 780;
      case "skelecar":
        return 520;
      case "danu":
        return 640;
      default:
        return 420;
    }
  }

  private getTeleportRecoveryDurationMs(): number {
    const phaseTwo = this.currentPhaseIndex > 0;

    switch (this.definition.id) {
      case "enflamed":
        return phaseTwo ? 280 : 360;
      case "skelecar":
        return phaseTwo ? 260 : 340;
      default:
        return 0;
    }
  }

  private createAttackKits(damageBonus: number, aggression: number): BossAttackKit[] {
    const accent = this.definition.accent;
    const power = Math.round(damageBonus + aggression * 2);
    const phaseTwoPower = power + 4;
    const phaseThreePower = power + 8;

    switch (this.definition.id) {
      // The Apex is a pursuit boss: it should commit to lanes, force movement, and be punishable when it overshoots.
      case "apex":
        return [
          {
            light: createAttack("Raking Bite", accent, "sweep", "standard", "melee", 14 + power, 112, 72, 138, 94, 154, 114, createImpact(42, 150, 22, 0.0032)),
            heavy: createAttack("Undertow Charge", accent, "thrust", "lunge", "melee", 20 + power, 164, 54, 254, 150, 276, 294, createImpact(68, 210, 32, 0.004)),
            signature: createAttack("Breaker Charge", accent, "thrust", "lunge", "melee", 18 + power, 186, 58, 286, 166, 300, 338, createImpact(60, 196, 30, 0.0038))
          },
          {
            light: createAttack("Riptide Maw", accent, "sweep", "standard", "melee", 18 + phaseTwoPower, 124, 84, 122, 98, 142, 132, createImpact(52, 178, 26, 0.0038)),
            heavy: createAttack("Current Charge", accent, "thrust", "lunge", "melee", 24 + phaseTwoPower, 182, 58, 224, 152, 238, 342, createImpact(80, 236, 38, 0.0046)),
            signature: createAttack("Riptide Charge", accent, "thrust", "lunge", "melee", 22 + phaseTwoPower, 204, 62, 248, 176, 244, 388, createImpact(70, 224, 34, 0.0044))
          },
          {
            light: createAttack("Frenzy Bite", accent, "sweep", "standard", "melee", 22 + phaseThreePower, 132, 90, 116, 92, 126, 148, createImpact(58, 188, 28, 0.004)),
            heavy: createAttack("Frenzy Charge", accent, "thrust", "lunge", "melee", 30 + phaseThreePower, 220, 66, 198, 164, 220, 438, createImpact(96, 278, 42, 0.0052)),
            signature: createAttack("Abyssal Crossing", accent, "thrust", "lunge", "melee", 34 + phaseThreePower, 322, 72, 520, 286, 360, 610, createImpact(112, 324, 48, 0.006))
          }
        ];
      // The Enflamed is a repositioning boss: its danger should come from learnable landings and fire lanes, not random blinks.
      case "enflamed":
        return [
          {
            light: createAttack("Scald Wing", accent, "sweep", "standard", "melee", 13 + power, 98, 72, 118, 88, 122, 108, createImpact(38, 132, 18, 0.003)),
            heavy: createAttack("Seraph Lance", accent, "thrust", "lunge", "ranged", 18 + power, 246, 34, 152, 104, 144, 0, createImpact(34, 132, 18, 0.003)),
            signature: createAttack("Cinder Dive", accent, "thrust", "lunge", "melee", 24 + power, 170, 40, 146, 100, 166, 214, createImpact(70, 214, 34, 0.0042))
          },
          {
            light: createAttack("Ash Halo", accent, "sweep", "standard", "melee", 17 + phaseTwoPower, 108, 84, 96, 92, 104, 124, createImpact(48, 160, 22, 0.0037)),
            heavy: createAttack("Solar Puncture", accent, "thrust", "lunge", "ranged", 22 + phaseTwoPower, 262, 36, 134, 100, 130, 0, createImpact(40, 148, 20, 0.0034)),
            signature: createAttack("Phoenix Drop", accent, "thrust", "lunge", "melee", 28 + phaseTwoPower, 182, 44, 128, 96, 152, 238, createImpact(80, 238, 38, 0.0048))
          },
          {
            light: createAttack("Prophecy Halo", accent, "sweep", "standard", "melee", 20 + phaseThreePower, 118, 88, 112, 92, 118, 134, createImpact(54, 178, 24, 0.004)),
            heavy: createAttack("Foretold Lance", accent, "thrust", "lunge", "ranged", 26 + phaseThreePower, 276, 38, 156, 104, 142, 0, createImpact(48, 166, 22, 0.0038)),
            signature: createAttack("Prophecy Dive", accent, "thrust", "lunge", "melee", 32 + phaseThreePower, 198, 46, 142, 104, 178, 270, createImpact(90, 262, 40, 0.0052))
          }
        ];
      // The Honored is the duel boss: it should fence, bait, answer greed, and punish hard disengages without turning into a chase boss.
      case "honored":
        return [
          {
            light: createAttack("Checking Cut", accent, "sweep", "standard", "melee", 13 + power, 104, 64, 132, 84, 132, 84, createImpact(32, 120, 18, 0.0028)),
            heavy: createAttack("Honor Thrust", accent, "thrust", "lunge", "melee", 19 + power, 156, 30, 166, 88, 164, 192, createImpact(58, 186, 28, 0.0036)),
            counter: createAttack("Formal Riposte", accent, "thrust", "lunge", "melee", 22 + power, 160, 28, 66, 88, 136, 208, createImpact(60, 196, 30, 0.0038))
          },
          {
            light: createAttack("Measured Cut", accent, "sweep", "standard", "melee", 16 + phaseTwoPower, 114, 72, 116, 88, 120, 96, createImpact(40, 150, 20, 0.0032)),
            heavy: createAttack("Execution Line", accent, "thrust", "lunge", "melee", 24 + phaseTwoPower, 166, 30, 146, 92, 148, 220, createImpact(72, 224, 34, 0.0042)),
            signature: createAttack("Half-Step Feint", accent, "thrust", "lunge", "melee", 20 + phaseTwoPower, 148, 28, 276, 64, 114, 180, createImpact(48, 176, 26, 0.0035)),
            counter: createAttack("Master's Answer", accent, "thrust", "lunge", "melee", 26 + phaseTwoPower, 162, 26, 58, 90, 126, 214, createImpact(68, 216, 32, 0.004))
          },
          {
            light: createAttack("Perfect Cut", accent, "sweep", "standard", "melee", 20 + phaseThreePower, 120, 72, 124, 76, 118, 112, createImpact(50, 176, 22, 0.0038)),
            heavy: createAttack("Perfect Line", accent, "thrust", "lunge", "melee", 30 + phaseThreePower, 178, 30, 154, 78, 150, 238, createImpact(86, 258, 38, 0.005)),
            signature: createAttack("Closing Feint", accent, "thrust", "lunge", "melee", 24 + phaseThreePower, 158, 28, 302, 58, 98, 202, createImpact(62, 210, 30, 0.0042)),
            counter: createAttack("Final Answer", accent, "thrust", "lunge", "melee", 32 + phaseThreePower, 172, 26, 54, 82, 132, 226, createImpact(78, 242, 36, 0.0046))
          }
        ];
      // The Exalted is the arena boss: the player should solve stable hazard patterns while weathering heavy, deliberate hits.
      case "exalted":
        return [
          {
            light: createAttack("Seal Breaker", accent, "sweep", "cleave", "melee", 15 + power, 118, 96, 156, 98, 166, 108, createImpact(52, 176, 24, 0.0034)),
            heavy: createAttack("Consecration Slam", accent, "sweep", "cleave", "melee", 22 + power, 150, 120, 222, 110, 228, 166, createImpact(86, 242, 38, 0.0048)),
            signature: createAttack("Judgment Step", accent, "thrust", "lunge", "melee", 20 + power, 156, 40, 174, 94, 172, 196, createImpact(66, 210, 32, 0.004))
          },
          {
            light: createAttack("Ward Cleave", accent, "sweep", "cleave", "melee", 18 + phaseTwoPower, 126, 108, 134, 100, 146, 120, createImpact(58, 194, 26, 0.0038)),
            heavy: createAttack("Cathedral Slam", accent, "sweep", "cleave", "melee", 26 + phaseTwoPower, 160, 136, 188, 114, 202, 188, createImpact(96, 270, 42, 0.0052)),
            signature: createAttack("Engine Verdict", accent, "thrust", "lunge", "melee", 24 + phaseTwoPower, 166, 44, 148, 100, 152, 214, createImpact(78, 238, 36, 0.0046))
          },
          {
            light: createAttack("Checkmate Cleave", accent, "sweep", "cleave", "melee", 22 + phaseThreePower, 134, 112, 144, 98, 134, 132, createImpact(66, 218, 28, 0.0042)),
            heavy: createAttack("Checkmate Slam", accent, "sweep", "cleave", "melee", 32 + phaseThreePower, 172, 140, 204, 112, 192, 202, createImpact(106, 296, 44, 0.0056)),
            signature: createAttack("Board Step", accent, "thrust", "lunge", "melee", 28 + phaseThreePower, 176, 46, 160, 96, 154, 228, createImpact(86, 252, 38, 0.0048))
          }
        ];
      // Skelecar is a trickster secret boss: it sidesteps, forces lazy movement with blue lanes, and volleys after readable resets.
      case "skelecar":
        return [
          {
            light: createAttack("Paw Check", accent, "sweep", "standard", "melee", 11 + power, 92, 56, 84, 82, 88, 92, createImpact(24, 92, 14, 0.0024)),
            heavy: createAttack("Blue Line", accent, "thrust", "lunge", "ranged", 16 + power, 236, 26, 126, 104, 132, 0, createImpact(30, 124, 16, 0.0028)),
            signature: createAttack("Bad Time Volley", accent, "thrust", "lunge", "ranged", 20 + power, 248, 24, 152, 112, 174, 0, createImpact(38, 140, 18, 0.003))
          },
          {
            light: createAttack("Bone Swipe", accent, "sweep", "standard", "melee", 14 + phaseTwoPower, 100, 60, 78, 84, 84, 108, createImpact(30, 110, 16, 0.0028)),
            heavy: createAttack("Blue Line+", accent, "thrust", "lunge", "ranged", 20 + phaseTwoPower, 252, 26, 114, 106, 124, 0, createImpact(36, 132, 18, 0.003)),
            signature: createAttack("Very Bad Time", accent, "thrust", "lunge", "ranged", 25 + phaseTwoPower, 268, 24, 136, 116, 160, 0, createImpact(44, 154, 20, 0.0034))
          }
        ];
      // Danu is a deliberate secret boss: it marks territory, walks you down, and commits only when the line is favorable.
      case "danu":
        return [
          {
            light: createAttack("Stamped Swing", accent, "sweep", "cleave", "melee", 15 + power, 118, 88, 118, 92, 128, 108, createImpact(46, 154, 22, 0.0032)),
            heavy: createAttack("Approved Advance", accent, "thrust", "lunge", "melee", 21 + power, 168, 40, 150, 96, 172, 186, createImpact(66, 212, 32, 0.0042)),
            signature: createAttack("Final Approval", accent, "sweep", "cleave", "melee", 24 + power, 142, 124, 176, 108, 184, 128, createImpact(80, 238, 38, 0.0048))
          },
          {
            light: createAttack("Filed Swing", accent, "sweep", "cleave", "melee", 18 + phaseTwoPower, 126, 98, 108, 96, 116, 118, createImpact(54, 176, 24, 0.0036)),
            heavy: createAttack("Expedited Advance", accent, "thrust", "lunge", "melee", 26 + phaseTwoPower, 178, 40, 136, 100, 154, 210, createImpact(78, 232, 36, 0.0048)),
            signature: createAttack("Approved Forever", accent, "sweep", "cleave", "melee", 30 + phaseTwoPower, 150, 132, 162, 114, 170, 146, createImpact(92, 262, 40, 0.0052))
          }
        ];
      // The Permafrost is the precision boss: it should answer sloppy entries and overchasing, not magically beat perfect choices.
      default:
        return [
          {
            light: createAttack("Rime Draw", accent, "thrust", "standard", "melee", 12 + power, 112, 30, 66, 82, 126, 124, createImpact(30, 116, 18, 0.0028)),
            heavy: createAttack("Zero Line", accent, "thrust", "lunge", "melee", 20 + power, 162, 28, 98, 86, 142, 204, createImpact(58, 188, 28, 0.0036)),
            counter: createAttack("Cold Answer", accent, "thrust", "lunge", "melee", 22 + power, 150, 26, 60, 84, 132, 196, createImpact(54, 180, 26, 0.0034))
          },
          {
            light: createAttack("Frost Draw", accent, "thrust", "standard", "melee", 16 + phaseTwoPower, 124, 30, 56, 84, 118, 136, createImpact(38, 150, 20, 0.0032)),
            heavy: createAttack("Absolute Line", accent, "thrust", "lunge", "melee", 25 + phaseTwoPower, 174, 28, 88, 90, 130, 228, createImpact(70, 220, 32, 0.0042)),
            signature: createAttack("Snowblind Feint", accent, "thrust", "lunge", "melee", 18 + phaseTwoPower, 154, 24, 268, 48, 126, 154, createImpact(46, 166, 24, 0.0034)),
            counter: createAttack("Winter Reply", accent, "thrust", "lunge", "melee", 26 + phaseTwoPower, 160, 24, 52, 88, 118, 208, createImpact(64, 206, 30, 0.0038))
          },
          {
            light: createAttack("Stillness Draw", accent, "thrust", "standard", "melee", 20 + phaseThreePower, 132, 28, 192, 54, 178, 154, createImpact(52, 186, 24, 0.004)),
            heavy: createAttack("White Silence", accent, "thrust", "lunge", "melee", 31 + phaseThreePower, 186, 26, 286, 56, 204, 252, createImpact(88, 268, 40, 0.0052)),
            signature: createAttack("Patient Cut", accent, "thrust", "lunge", "melee", 26 + phaseThreePower, 170, 24, 334, 52, 186, 226, createImpact(72, 230, 34, 0.0046)),
            counter: createAttack("Last Winter", accent, "thrust", "lunge", "melee", 32 + phaseThreePower, 174, 24, 48, 76, 150, 222, createImpact(78, 244, 36, 0.0048))
          }
        ];
    }
  }

  private createOrnaments(x: number, y: number): {
    primary: Phaser.GameObjects.Shape;
    secondary: Phaser.GameObjects.Shape;
    guard: Phaser.GameObjects.Shape;
    blade: Phaser.GameObjects.Shape;
  } {
    switch (this.definition.id) {
      case "apex":
        return {
          primary: this.scene.add.rectangle(x + 10, y + 2, 12, 22, 0x2c6271, 0.78).setDepth(6),
          secondary: this.scene.add.rectangle(x + 12, y - 10, 16, 5, 0xd54c42, 0.92).setDepth(6.2),
          guard: this.scene.add.rectangle(x - 10, y, 16, 7, 0x2b6c86, 0.92).setDepth(6),
          blade: this.scene.add.triangle(x - 20, y, 0, 6, 60, 0, 0, -6, 0xf1fbff, 0.95).setOrigin(0.1, 0.5).setDepth(7)
        };
      case "enflamed":
        return {
          primary: this.scene.add.triangle(x - 12, y, 0, 0, 34, -20, 32, 20, 0xf6c17e, 0.72).setDepth(6),
          secondary: this.scene.add.triangle(x + 12, y, 0, 0, 34, -20, 32, 20, 0xf6c17e, 0.72).setDepth(6),
          guard: this.scene.add.rectangle(x - 10, y, 14, 8, 0xf0844f, 0.94).setDepth(6),
          blade: this.scene.add.rectangle(x - 20, y, 54, 8, 0xfff1d8, 0.95).setOrigin(1, 0.5).setDepth(7)
        };
      case "honored":
        return {
          primary: this.scene.add.triangle(x, y - 14, 0, 16, 12, -12, 24, 16, 0xe4d3b2, 0.84).setDepth(6),
          secondary: this.scene.add.rectangle(x + 14, y + 8, 10, 34, 0x6c2c28, 0.72).setDepth(6),
          guard: this.scene.add.rectangle(x - 10, y, 18, 6, 0x8f6b43, 0.92).setDepth(6),
          blade: this.scene.add.triangle(x - 20, y, 0, 5, 64, 0, 0, -5, 0xf4efe4, 0.96).setOrigin(0.1, 0.5).setDepth(7)
        };
      case "exalted":
        return {
          primary: this.scene.add.rectangle(x, y - 12, 14, 14, 0x8db6d8, 0.56).setDepth(6),
          secondary: this.scene.add.rectangle(x + 8, y - 4, 18, 6, 0xd9edf9, 0.86).setDepth(6),
          guard: this.scene.add.rectangle(x - 12, y, 22, 8, 0x59789a, 0.94).setDepth(6),
          blade: this.scene.add.rectangle(x - 22, y, 58, 10, 0xeaf4ff, 0.96).setOrigin(1, 0.5).setDepth(7)
        };
      case "permafrost":
        return {
          primary: this.scene.add.ellipse(x, y - 14, 34, 14, 0xd5e4cd, 0.86).setDepth(6),
          secondary: this.scene.add.rectangle(x + 12, y + 10, 10, 32, 0x55728a, 0.74).setDepth(6),
          guard: this.scene.add.rectangle(x - 10, y, 16, 6, 0x78adc2, 0.92).setDepth(6),
          blade: this.scene.add.triangle(x - 20, y, 0, 4, 56, 0, 0, -4, 0xf0fbff, 0.96).setOrigin(0.1, 0.5).setDepth(7)
        };
      case "skelecar":
        return {
          primary: this.scene.add.triangle(x + 8, y - 8, 0, 12, 12, -10, 24, 12, 0x75bbff, 0.72).setDepth(6),
          secondary: this.scene.add.rectangle(x + 10, y - 2, 14, 5, 0xb9e8ff, 0.88).setDepth(6),
          guard: this.scene.add.rectangle(x - 10, y, 14, 6, 0x5d96d1, 0.92).setDepth(6),
          blade: this.scene.add.rectangle(x - 20, y, 50, 6, 0xe9f6ff, 0.92).setOrigin(1, 0.5).setDepth(7)
        };
      case "danu":
        return {
          primary: this.scene.add.circle(x, y - 12, 8, 0xf6d78d, 0.74).setDepth(6),
          secondary: this.scene.add.rectangle(x + 10, y - 2, 14, 22, 0xa66e3e, 0.68).setDepth(6),
          guard: this.scene.add.rectangle(x - 12, y, 20, 8, 0xc38a52, 0.92).setDepth(6),
          blade: this.scene.add.rectangle(x - 22, y, 56, 10, 0xf8ecd5, 0.94).setOrigin(1, 0.5).setDepth(7)
        };
      default:
        return {
          primary: this.scene.add.rectangle(x + 10, y - 4, 12, 24, 0x4f7c96, 0.54).setDepth(6),
          secondary: this.scene.add.triangle(x, y - 16, 0, 10, 9, -10, 18, 10, 0xe1f7ff, 0.88).setDepth(6),
          guard: this.scene.add.rectangle(x - 10, y, 16, 6, 0x78adc2, 0.92).setDepth(6),
          blade: this.scene.add.triangle(x - 20, y, 0, 4, 56, 0, 0, -4, 0xf0fbff, 0.96).setOrigin(0.1, 0.5).setDepth(7)
        };
    }
  }

  private createPhaseSprite(x: number, y: number): Phaser.GameObjects.Image | null {
    const spriteKeys = this.definition.phaseSpriteKeys;

    if (!spriteKeys) {
      return null;
    }

    const origin = this.definition.phaseSpriteOrigin ?? { x: 0.5, y: 0.66 };
    const sprite = this.scene.add.image(x, y, spriteKeys[0]).setOrigin(origin.x, origin.y).setDepth(6.9);
    this.refreshPhaseSpriteTexture(sprite);
    return sprite;
  }

  private refreshPhaseSpriteTexture(sprite?: Phaser.GameObjects.Image): void {
    const targetSprite = sprite ?? this.bodySprite;

    if (!targetSprite || !this.definition.phaseSpriteKeys) {
      return;
    }

    const spriteKey = this.definition.phaseSpriteKeys[this.currentPhaseIndex] ?? this.definition.phaseSpriteKeys[0];
    const origin = this.definition.phaseSpriteOrigin ?? { x: 0.5, y: 0.66 };
    const visibleHeight = this.definition.phaseSpriteVisibleHeight ?? this.size * 3.1;

    targetSprite.setTexture(spriteKey);
    targetSprite.setOrigin(origin.x, origin.y);
    this.phaseSpriteBaseScale = targetSprite.height > 0 ? visibleHeight / targetSprite.height : 1;
    targetSprite.setScale(this.phaseSpriteBaseScale);
  }

  private tickStatuses(deltaMs: number): void {
    this.attackCooldownRemaining = Math.max(0, this.attackCooldownRemaining - deltaMs);
    this.specialCooldownRemaining = Math.max(0, this.specialCooldownRemaining - deltaMs);
    this.arenaCooldownRemaining = Math.max(0, this.arenaCooldownRemaining - deltaMs);
    this.phaseTransitionRemaining = Math.max(0, this.phaseTransitionRemaining - deltaMs);
    this.stunRemaining = Math.max(0, this.stunRemaining - deltaMs);
    this.slowRemaining = Math.max(0, this.slowRemaining - deltaMs);
    this.guardRemaining = Math.max(0, this.guardRemaining - deltaMs);
    this.momentumRecoveryRemaining = Math.max(0, this.momentumRecoveryRemaining - deltaMs);
    this.permafrostInitiativeRemaining = Math.max(0, this.permafrostInitiativeRemaining - deltaMs);
    this.postTeleportRecoveryRemaining = Math.max(0, this.postTeleportRecoveryRemaining - deltaMs);
    this.bleedRemaining = Math.max(0, this.bleedRemaining - deltaMs);
    this.bleedTickRemaining = Math.max(0, this.bleedTickRemaining - deltaMs);
    this.strideFlipRemaining = Math.max(0, this.strideFlipRemaining - deltaMs);
    this.orbitBreakCooldownRemaining = Math.max(0, this.orbitBreakCooldownRemaining - deltaMs);
    this.orbitBreakWindowRemaining = Math.max(0, this.orbitBreakWindowRemaining - deltaMs);

    if (this.definition.pool === "biome" && this.resolve > 0) {
      this.resolveQuietRemaining += deltaMs;
      const naturalDecay = (BOSS_TUNING.resolve.naturalDecayPerSecond * deltaMs) / 1000;
      const neutralDecay =
        this.resolveQuietRemaining >= BOSS_TUNING.resolve.neutralResetDelayMs
          ? (BOSS_TUNING.resolve.neutralDecayPerSecond * deltaMs) / 1000
          : 0;
      this.resolve = Math.max(0, this.resolve - naturalDecay - neutralDecay);
    }

    if (this.strideFlipRemaining === 0) {
      this.strideDirection *= -1;
      this.strideFlipRemaining = this.currentPhaseIndex > 0 ? 420 + Phaser.Math.Between(0, 140) : 560 + Phaser.Math.Between(0, 180);
    }

    if (this.phaseTransitionRemaining === 0 && this.bleedRemaining > 0 && this.bleedTickRemaining === 0) {
      this.bleedTickRemaining = 420;
      this.applyDamage(
        Math.max(1, Math.round(this.bleedDamage)),
        { x: 0, y: 0 },
        createImpact(0, 0, 0, 0, 0),
        false,
        false
      );
    }

    if (this.slowRemaining === 0) {
      this.slowFactor = 1;
    }
  }

  private updateOrbitAwareness(
    targetX: number,
    targetY: number,
    targetDirection: Phaser.Math.Vector2,
    distance: number,
    deltaMs: number
  ): void {
    if (this.phaseTransitionRemaining > 0) {
      this.clearOrbitPressure();
      return;
    }

    const targetAngle = Math.atan2(targetDirection.y, targetDirection.x);
    const facingAngle = Math.atan2(this.facing.y, this.facing.x);
    const angleDelta = this.lastTargetAngle === null ? 0 : Phaser.Math.Angle.Wrap(targetAngle - this.lastTargetAngle);
    const angularSpeed = deltaMs > 0 ? Math.abs(angleDelta) / (deltaMs / 1000) : 0;
    const directionSign = angleDelta > 0.006 ? 1 : angleDelta < -0.006 ? -1 : 0;
    const offsetFromFront = Math.abs(Phaser.Math.Angle.Wrap(targetAngle - facingAngle));
    const loopAware = this.definition.id === "honored" || this.definition.id === "permafrost";
    const sideThreshold = loopAware ? 0.9 : 1.02;
    const rearThreshold = loopAware ? 1.94 : 2.08;
    const detectionRange = this.getOrbitDetectionRange();
    const orbitEligible =
      !this.currentAttack &&
      this.stunRemaining <= 0 &&
      distance >= this.getCurrentAttackKit().light.range * 0.52 &&
      distance <= detectionRange &&
      angularSpeed >= (loopAware ? 0.66 : 0.82) &&
      directionSign !== 0;

    if (orbitEligible) {
      if (directionSign === this.orbitDirectionSign) {
        this.orbitConsistencyMs = Math.min(2200, this.orbitConsistencyMs + deltaMs);
        this.orbitTravelRadians = Math.min(Math.PI * 4, this.orbitTravelRadians + Math.abs(angleDelta));
      } else {
        this.orbitConsistencyMs = Math.min(520, this.orbitConsistencyMs * 0.35 + deltaMs * 0.58);
        this.orbitTravelRadians = Math.abs(angleDelta);
        this.orbitDirectionSign = directionSign;
      }
    } else {
      this.orbitConsistencyMs = Math.max(0, this.orbitConsistencyMs - deltaMs * 1.3);
      this.orbitTravelRadians = Math.max(0, this.orbitTravelRadians - deltaMs * 0.0032);
    }

    if (offsetFromFront >= sideThreshold) {
      this.orbitSideExposureMs = Math.min(2200, this.orbitSideExposureMs + deltaMs);
    } else {
      this.orbitSideExposureMs = Math.max(0, this.orbitSideExposureMs - deltaMs * 1.1);
    }

    if (offsetFromFront >= rearThreshold) {
      this.orbitRearExposureMs = Math.min(1600, this.orbitRearExposureMs + deltaMs);
    } else {
      this.orbitRearExposureMs = Math.max(0, this.orbitRearExposureMs - deltaMs * 1.35);
    }

    if (
      this.orbitBreakCooldownRemaining <= 0 &&
      this.orbitConsistencyMs >= (loopAware ? 660 : 980) &&
      this.orbitTravelRadians >= (loopAware ? 1.18 : 1.7) &&
      (this.orbitSideExposureMs >= (loopAware ? 280 : 420) || this.orbitRearExposureMs >= (loopAware ? 160 : 240))
    ) {
      this.orbitBreakWindowRemaining = Math.max(this.orbitBreakWindowRemaining, this.getOrbitBreakWindowDuration());
    }

    this.lastTargetAngle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
  }

  private updateFacing(
    targetDirection: Phaser.Math.Vector2,
    targetX: number,
    targetY: number,
    distance: number,
    deltaMs: number
  ): void {
    if (this.currentAttack) {
      this.rotateFacingToward(
        new Phaser.Math.Vector2(this.currentAttack.signal.direction.x, this.currentAttack.signal.direction.y),
        18,
        deltaMs
      );
      return;
    }

    const desiredDirection = this.isOrbitPressureActive()
      ? this.getOrbitInterceptDirection(targetX, targetY, targetDirection, distance, this.getOrbitLeadDistance(), this.getOrbitForwardLead())
      : targetDirection;
    const turnRate = this.isOrbitPressureActive() ? this.getOrbitTurnRate() : this.getBaseTurnRate();
    this.rotateFacingToward(desiredDirection, turnRate, deltaMs);
  }

  private rotateFacingToward(direction: Phaser.Math.Vector2, radiansPerSecond: number, deltaMs: number): void {
    if (direction.lengthSq() <= 0.0001) {
      return;
    }

    const desiredAngle = Math.atan2(direction.y, direction.x);
    const currentAngle = Math.atan2(this.facing.y, this.facing.x);
    const nextAngle = Phaser.Math.Angle.RotateTo(currentAngle, desiredAngle, radiansPerSecond * (deltaMs / 1000));
    this.facing.set(Math.cos(nextAngle), Math.sin(nextAngle)).normalize();
  }

  private getBaseTurnRate(): number {
    switch (this.definition.id) {
      case "honored":
        return 3.5;
      case "permafrost":
        return 3.2;
      case "exalted":
        return 4.2;
      case "apex":
        return 5;
      case "enflamed":
      case "skelecar":
        return 6.2;
      case "danu":
        return 4.8;
      default:
        return 5.2;
    }
  }

  private getOrbitTurnRate(): number {
    switch (this.definition.id) {
      case "honored":
        return 12;
      case "permafrost":
        return 10.5;
      case "apex":
        return 8;
      case "enflamed":
      case "skelecar":
        return 9.5;
      case "exalted":
        return 7.2;
      case "danu":
        return 8.4;
      default:
        return 8;
    }
  }

  private getOrbitDetectionRange(): number {
    const heavyRange = this.getCurrentAttackKit().heavy.range;
    switch (this.definition.id) {
      case "honored":
      case "permafrost":
        return Math.max(156, heavyRange * 1.18);
      case "exalted":
        return Math.max(172, heavyRange * 1.1);
      default:
        return Math.max(164, heavyRange * 1.28);
    }
  }

  private getOrbitLeadDistance(): number {
    switch (this.definition.id) {
      case "apex":
        return 78;
      case "enflamed":
      case "skelecar":
        return 70;
      case "exalted":
        return 62;
      case "honored":
        return 48;
      case "permafrost":
        return 60;
      case "danu":
        return 56;
      default:
        return 54;
    }
  }

  private getOrbitForwardLead(): number {
    switch (this.definition.id) {
      case "apex":
        return 24;
      case "exalted":
        return 16;
      case "danu":
        return 12;
      default:
        return 8;
    }
  }

  private getOrbitBreakWindowDuration(): number {
    switch (this.definition.id) {
      case "honored":
      case "permafrost":
        return 760;
      case "apex":
        return 580;
      case "exalted":
        return 660;
      default:
        return 540;
    }
  }

  private clearOrbitPressure(): void {
    this.lastTargetAngle = null;
    this.orbitDirectionSign = 0;
    this.orbitConsistencyMs = 0;
    this.orbitTravelRadians = 0;
    this.orbitSideExposureMs = 0;
    this.orbitRearExposureMs = 0;
    this.orbitBreakWindowRemaining = 0;
  }

  private consumeOrbitPressure(cooldownMs: number): void {
    this.orbitBreakCooldownRemaining = Math.max(this.orbitBreakCooldownRemaining, cooldownMs);
    this.orbitBreakWindowRemaining = 0;
    this.orbitConsistencyMs *= 0.3;
    this.orbitTravelRadians *= 0.3;
    this.orbitSideExposureMs *= 0.4;
    this.orbitRearExposureMs *= 0.25;
  }

  private isOrbitPressureActive(): boolean {
    return this.orbitBreakWindowRemaining > 0 && this.orbitDirectionSign !== 0;
  }

  private getOrbitTangent(targetDirection: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const sign = this.orbitDirectionSign === 0 ? this.strideDirection : this.orbitDirectionSign;
    return new Phaser.Math.Vector2(-targetDirection.y * sign, targetDirection.x * sign).normalize();
  }

  private buildOrbitBreakDirection(
    targetDirection: Phaser.Math.Vector2,
    forwardBias: number,
    lateralBias: number
  ): Phaser.Math.Vector2 {
    const antiOrbit = this.getOrbitTangent(targetDirection).negate();
    return new Phaser.Math.Vector2(
      targetDirection.x * forwardBias + antiOrbit.x * lateralBias,
      targetDirection.y * forwardBias + antiOrbit.y * lateralBias
    );
  }

  private getOrbitFuturePoint(
    targetX: number,
    targetY: number,
    targetDirection: Phaser.Math.Vector2,
    lateralLead: number,
    forwardLead = 0,
    padding = 58
  ): { x: number; y: number } {
    const tangent = this.getOrbitTangent(targetDirection);
    return clampToArena(
      targetX + tangent.x * lateralLead + targetDirection.x * forwardLead,
      targetY + tangent.y * lateralLead + targetDirection.y * forwardLead,
      padding
    );
  }

  private getOrbitInterceptDirection(
    targetX: number,
    targetY: number,
    targetDirection: Phaser.Math.Vector2,
    _distance: number,
    lateralLead: number,
    forwardLead = 0
  ): Phaser.Math.Vector2 {
    const futurePoint = this.getOrbitFuturePoint(targetX, targetY, targetDirection, lateralLead, forwardLead);
    return new Phaser.Math.Vector2(futurePoint.x - this.x, futurePoint.y - this.y).normalize();
  }

  private updateAttackState(deltaMs: number): EnemyUpdateResult {
    if (!this.currentAttack) {
      return {};
    }

    this.currentAttack.remaining -= deltaMs;

    if (this.currentAttack.remaining > 0) {
      return {};
    }

    if (this.currentAttack.phase === "windup") {
      this.currentAttack.phase = "active";
      this.currentAttack.remaining = this.currentAttack.signal.profile.active;

      if (this.currentAttack.signal.profile.delivery !== "ranged") {
        this.bodyObject.body.setVelocity(
          this.currentAttack.signal.direction.x * this.currentAttack.signal.profile.lunge,
          this.currentAttack.signal.direction.y * this.currentAttack.signal.profile.lunge
        );
      }

      const result: EnemyUpdateResult = {
        activatedAttack: this.currentAttack.signal
      };

      const extraProjectiles = this.tryCreateBurstProjectiles(this.currentAttack.signal);
      if (extraProjectiles.length > 0) {
        result.spawnedProjectiles = extraProjectiles;
      }

      return result;
    }

    if (this.currentAttack.phase === "active") {
      this.currentAttack.phase = "recovery";
      this.currentAttack.remaining = this.currentAttack.signal.profile.recovery;

      return {
        endedAttack: this.currentAttack.signal
      };
    }

    this.currentAttack = null;
    this.attackCooldownRemaining = Math.max(130, Math.round(this.getBaseAttackCooldown() * this.getPhaseCooldownScale()));
    return {};
  }

  private shouldAttack(distance: number, targetState: ArenaTargetState): boolean {
    const kit = this.getCurrentAttackKit();
    const phaseTwo = this.currentPhaseIndex > 0;
    const phaseThree = this.currentPhaseIndex >= 2;

    if (this.definition.id === "exalted" && this.guardRemaining > 320 && !phaseTwo) {
      return false;
    }

    if (this.postTeleportRecoveryRemaining > 0) {
      return false;
    }

    if (targetState.isFooling && distance <= kit.heavy.range * 1.04) {
      return true;
    }

    switch (this.definition.id) {
      case "apex":
        return (
          distance >= kit.light.range * 0.54 &&
          distance <= kit.heavy.range * 0.92 &&
          !(targetState.isParrying && distance > kit.light.range * 0.68)
        );
      case "enflamed":
        return distance >= kit.light.range * 0.52 && distance <= kit.heavy.range * 0.98;
      case "honored":
        if (!targetState.isAttacking && !targetState.isDashing && !phaseTwo) {
          return distance <= kit.light.range * 0.76;
        }

        return (
          distance >= kit.light.range * 0.6 &&
          distance <= kit.heavy.range * 0.9 &&
          !(targetState.isParrying && distance > kit.light.range * 0.64)
        );
      case "exalted":
        return phaseTwo ? distance <= kit.heavy.range * 0.82 : distance <= kit.light.range * 0.78;
      case "permafrost":
        if (phaseThree && this.permafrostInitiativeRemaining <= 0 && distance <= kit.heavy.range * 1.08) {
          return true;
        }
        if (!targetState.isAttacking && !targetState.isDashing) {
          return distance >= kit.light.range * 0.88 && distance <= kit.heavy.range * 0.82;
        }

        return distance >= kit.light.range * 0.62 && distance <= kit.heavy.range * 0.94;
      case "skelecar":
        return distance >= kit.light.range * 0.42 && distance <= kit.heavy.range * 0.98;
      case "danu":
        return distance <= kit.heavy.range * 0.92 && !(targetState.isParrying && distance > kit.light.range * 0.86);
      default:
        return distance >= kit.light.range * 0.54 && distance <= kit.heavy.range * 0.94 && (!targetState.isDashing || (phaseTwo && distance <= kit.light.range * 0.92));
    }
  }

  private chooseAttack(distance: number, targetState: ArenaTargetState): { kind: AttackKind; profile: AttackProfile } {
    const kit = this.getCurrentAttackKit();
    const phaseTwo = this.currentPhaseIndex > 0;
    const phaseThree = this.currentPhaseIndex >= 2;

    switch (this.definition.id) {
      case "apex":
        if (phaseThree && kit.signature && distance >= kit.light.range * 0.9 && distance <= kit.signature.range * 0.72 && !targetState.isParrying) {
          return { kind: "heavy", profile: kit.signature };
        }
        if (kit.signature && !targetState.isParrying && distance <= kit.heavy.range * (phaseTwo ? 0.76 : 0.72) && (targetState.isAttacking || distance <= kit.light.range * 0.84)) {
          return { kind: "heavy", profile: kit.signature };
        }
        return { kind: distance > kit.light.range * 0.74 ? "heavy" : "light", profile: distance > kit.light.range * 0.74 ? kit.heavy : kit.light };
      case "enflamed":
        if (distance < kit.light.range * 0.78) {
          this.enflamedDiveReady = false;
          return { kind: "light", profile: kit.light };
        }
        if (
          this.enflamedDiveReady &&
          kit.signature &&
          distance >= kit.light.range * 0.8 &&
          distance <= kit.heavy.range * 0.84
        ) {
          this.enflamedDiveReady = false;
          return { kind: "heavy", profile: kit.signature };
        }
        if (kit.signature && phaseTwo && distance < kit.light.range * 0.76 && Math.random() < 0.24) {
          return { kind: "heavy", profile: kit.signature };
        }
        return { kind: "heavy", profile: distance >= kit.light.range * 0.84 ? kit.heavy : kit.light };
      case "honored":
        if (phaseThree && kit.signature && targetState.isAttacking && distance >= kit.light.range * 0.62 && distance <= kit.heavy.range * 0.9 && Math.random() < 0.34) {
          return { kind: "heavy", profile: kit.signature };
        }
        if (!phaseThree && phaseTwo && kit.signature && targetState.isAttacking && distance >= kit.light.range * 0.58 && distance <= kit.heavy.range * 0.88 && Math.random() < BOSS_TUNING.honored.feintChancePhase2) {
          return { kind: "heavy", profile: kit.signature };
        }
        if (targetState.isAttacking && kit.counter && distance >= kit.light.range * 0.56 && distance <= kit.heavy.range * 0.92 && Math.random() < (phaseTwo ? 0.72 : 0.52)) {
          return { kind: "heavy", profile: kit.counter };
        }
        if (targetState.isParrying && distance < kit.light.range * 0.74) {
          return { kind: "light", profile: kit.light };
        }
        if (!targetState.isAttacking && !targetState.isDashing) {
          return { kind: distance >= kit.light.range * 0.92 ? "heavy" : "light", profile: distance >= kit.light.range * 0.92 ? kit.heavy : kit.light };
        }

        return { kind: distance >= kit.light.range * 0.82 ? "heavy" : "light", profile: distance >= kit.light.range * 0.82 ? kit.heavy : kit.light };
      case "exalted":
        if (kit.signature && distance >= kit.light.range * 0.78 && (phaseTwo || this.arenaCooldownRemaining > 1600)) {
          return { kind: "heavy", profile: kit.signature };
        }
        return { kind: distance <= kit.light.range * 0.64 && !phaseTwo ? "light" : "heavy", profile: distance <= kit.light.range * 0.64 && !phaseTwo ? kit.light : kit.heavy };
      case "permafrost":
        if (phaseThree && kit.signature && this.permafrostInitiativeRemaining <= 0 && !targetState.isAttacking && !targetState.isDashing) {
          return { kind: "heavy", profile: kit.signature };
        }
        if (!phaseThree && phaseTwo && kit.signature && !targetState.isAttacking && distance >= kit.light.range * 0.72 && distance <= kit.heavy.range * 0.86 && Math.random() < BOSS_TUNING.permafrost.phaseTwoFeintChance) {
          return { kind: "heavy", profile: kit.signature };
        }
        if ((targetState.isDashing || targetState.isAttacking) && kit.counter && distance >= kit.light.range * 0.64 && distance <= kit.heavy.range * 0.94) {
          return { kind: "heavy", profile: kit.counter };
        }
        return { kind: distance >= kit.light.range * 0.94 ? "heavy" : "light", profile: distance >= kit.light.range * 0.94 ? kit.heavy : kit.light };
      case "skelecar":
        if (distance < kit.light.range * 0.84) {
          this.skelecarVolleyReady = false;
          return { kind: "light", profile: kit.light };
        }
        if (this.skelecarVolleyReady && kit.signature && distance >= kit.light.range * 0.94) {
          this.skelecarVolleyReady = false;
          return { kind: "heavy", profile: kit.signature };
        }
        if (kit.signature && phaseTwo && distance >= kit.light.range * 1.18 && Math.random() < 0.22) {
          return { kind: "heavy", profile: kit.signature };
        }
        return { kind: "heavy", profile: kit.heavy };
      case "danu":
        if (kit.signature && distance <= kit.heavy.range * 0.74 && (!targetState.isDashing || phaseTwo) && Math.random() < (phaseTwo ? 0.42 : 0.28)) {
          return { kind: "heavy", profile: kit.signature };
        }
        if (distance <= kit.light.range * 0.8) {
          return { kind: "light", profile: kit.light };
        }
        return { kind: "heavy", profile: kit.heavy };
      default:
        if ((targetState.isDashing || targetState.isAttacking) && kit.counter && distance >= kit.light.range * 0.64 && distance <= kit.heavy.range * 0.94) {
          return { kind: "heavy", profile: kit.counter };
        }
        return { kind: distance >= kit.light.range * (phaseTwo ? 0.72 : 0.84) ? "heavy" : "light", profile: distance >= kit.light.range * (phaseTwo ? 0.72 : 0.84) ? kit.heavy : kit.light };
    }
  }

  private tryUseSpecial(
    distance: number,
    normalized: Phaser.Math.Vector2,
    targetX: number,
    targetY: number,
    targetState: ArenaTargetState
  ): EnemyUpdateResult {
    if (this.specialCooldownRemaining > 0 && this.arenaCooldownRemaining > 0) {
      return {};
    }

    const phaseTwo = this.currentPhaseIndex > 0;
    const phaseThree = this.currentPhaseIndex >= 2;
    const kit = this.getCurrentAttackKit();
    const orbitActive = this.isOrbitPressureActive();

    switch (this.definition.id) {
      case "apex":
        if (phaseThree) {
          if (this.specialCooldownRemaining <= 0 && kit.signature && distance >= 132 && distance <= 332) {
            const origin = clampToArena(targetX - normalized.x * 340, targetY - normalized.y * 340, 64);
            const crossingDirection = new Phaser.Math.Vector2(targetX - origin.x, targetY - origin.y).normalize();
            this.specialCooldownRemaining = BOSS_TUNING.apex.crossingCooldownMs;
            this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, 260);
            this.teleportToDestination(origin.x, origin.y);
            this.startAttack("heavy", kit.signature, crossingDirection);
            return {
              spawnedHazards: [
                this.createCurrent(
                  targetX + normalized.x * 72,
                  targetY + normalized.y * 72,
                  normalized,
                  96,
                  980,
                  420,
                  "The undertow reveals the crossing line."
                )
              ],
              performedSpecial: true,
              feedbackText: "The Apex vanishes beneath the tide.",
              feedbackColor: this.definition.edge
            };
          }
          return {};
        }

        if (orbitActive && this.arenaCooldownRemaining <= 0 && distance >= 110 && distance <= 260) {
          const futurePoint = this.getOrbitFuturePoint(targetX, targetY, normalized, phaseTwo ? 72 : 58, phaseTwo ? 18 : 10);
          const tangent = this.getOrbitTangent(normalized);
          this.arenaCooldownRemaining = phaseTwo ? 2800 : 3800;
          this.specialCooldownRemaining = Math.max(this.specialCooldownRemaining, phaseTwo ? 1220 : 1540);
          this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseTwo ? 220 : 280);
          this.consumeOrbitPressure(1120);
          return {
            spawnedHazards: [
              this.createCurrent(futurePoint.x, futurePoint.y, normalized, phaseTwo ? 44 : 38, BOSS_TUNING.apex.currentDurationMs[phaseTwo ? 1 : 0], phaseTwo ? 310 : 250, "The undertow closes your escape."),
              this.createCurrent(
                futurePoint.x + tangent.x * (phaseTwo ? 88 : 68),
                futurePoint.y + tangent.y * (phaseTwo ? 88 : 68),
                tangent,
                phaseTwo ? 34 : 30,
                Math.max(1800, BOSS_TUNING.apex.currentDurationMs[phaseTwo ? 1 : 0] - 400),
                phaseTwo ? 280 : 230,
                "The tide herds you back in front."
              )
            ],
            performedSpecial: true,
            feedbackText: "The Apex herds the circle shut.",
            feedbackColor: this.definition.edge
          };
        }

        if (orbitActive && this.specialCooldownRemaining <= 0 && distance <= kit.heavy.range * 0.92) {
          this.specialCooldownRemaining = phaseTwo ? 2460 : 3180;
          this.consumeOrbitPressure(940);
          this.startAttack(
            "heavy",
            kit.signature ?? kit.heavy,
            this.getOrbitInterceptDirection(targetX, targetY, normalized, distance, phaseTwo ? 76 : 62, phaseTwo ? 22 : 14)
          );
          return {
            performedSpecial: true,
            feedbackText: "The Apex cuts off the lane.",
            feedbackColor: this.definition.edge
          };
        }

        if (this.arenaCooldownRemaining <= 0 && distance >= 122 && distance <= 252) {
          this.arenaCooldownRemaining = phaseTwo ? 2800 : 3800;
          this.specialCooldownRemaining = Math.max(this.specialCooldownRemaining, phaseTwo ? 1180 : 1500);
          this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseTwo ? 240 : 300);
          const centerX = targetX - normalized.x * 18;
          const centerY = targetY - normalized.y * 18;
          const offset = phaseTwo ? 84 : 0;
          return {
            spawnedHazards: [
              this.createCurrent(centerX, centerY, normalized, phaseTwo ? 42 : 36, BOSS_TUNING.apex.currentDurationMs[phaseTwo ? 1 : 0], phaseTwo ? 300 : 240, "Undertow catches your feet"),
              ...(phaseTwo
                ? [this.createCurrent(centerX + normalized.y * offset, centerY - normalized.x * offset, new Phaser.Math.Vector2(-normalized.y, normalized.x), 34, 2400, 270, "The tide closes around you")]
                : [])
            ],
            performedSpecial: true,
            feedbackText: "The tide claims a lane.",
            feedbackColor: this.definition.edge
          };
        }

        if (this.specialCooldownRemaining <= 0 && !targetState.isParrying && distance <= kit.heavy.range * 0.82 && kit.signature) {
          this.specialCooldownRemaining = phaseTwo ? 2500 : 3200;
          this.startAttack("heavy", kit.signature);
          return { performedSpecial: true };
        }
        return {};
      case "enflamed":
        if (
          this.specialCooldownRemaining <= 0 &&
          (orbitActive || distance <= kit.heavy.range * 0.66 || ((targetState.isAttacking || targetState.isDashing) && distance <= kit.heavy.range * 0.82))
        ) {
          const landing = orbitActive
            ? this.getOrbitFuturePoint(targetX, targetY, normalized, phaseTwo ? 94 : 82, phaseTwo ? 32 : 24, 56)
            : this.getEnflamedTeleportDestination(targetX, targetY, phaseTwo);
          this.specialCooldownRemaining = phaseThree ? 3800 : phaseTwo ? 3400 : 4500;
          this.arenaCooldownRemaining = phaseThree ? 3400 : phaseTwo ? 3300 : 4100;
          this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseThree ? 280 : phaseTwo ? 260 : 340);
          if (orbitActive) {
            this.consumeOrbitPressure(1040);
          }
          return this.beginEnflamedPrediction(landing, targetX, targetY, phaseThree, phaseTwo);
        }
        return {};
      case "honored":
        if (orbitActive && this.specialCooldownRemaining <= 0) {
          const spacingReset = this.buildOrbitBreakDirection(
            normalized,
            distance < kit.light.range * 0.94 ? -0.34 : 0.22,
            phaseTwo ? 1.04 : 0.92
          ).normalize();

          if (targetState.isAttacking && distance >= kit.light.range * 0.52 && distance <= kit.heavy.range * 0.96) {
            this.specialCooldownRemaining = phaseTwo ? 1700 : 2400;
            this.guardRemaining = phaseTwo ? 720 : 520;
            this.attackCooldownRemaining = Math.min(this.attackCooldownRemaining, phaseTwo ? 80 : 120);
            this.bodyObject.body.setVelocity(spacingReset.x * (phaseTwo ? 128 : 104), spacingReset.y * (phaseTwo ? 128 : 104));
            this.counterQueued = true;
            this.consumeOrbitPressure(680);
            return {
              performedSpecial: true,
              feedbackText: "The Honored refuses the flank.",
              feedbackColor: this.definition.edge
            };
          }

          if (distance <= kit.light.range * 1.06) {
            this.specialCooldownRemaining = phaseTwo ? 1480 : 2100;
            this.guardRemaining = phaseTwo ? 320 : 240;
            this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseTwo ? 140 : 180);
            this.consumeOrbitPressure(640);
            this.startAttack(
              "light",
              kit.light,
              this.getOrbitInterceptDirection(targetX, targetY, normalized, distance, phaseTwo ? 54 : 42, phaseTwo ? 8 : 4)
            );
            return {
              performedSpecial: true,
              feedbackText: "The Honored pivots back onto line.",
              feedbackColor: this.definition.edge
            };
          }

          this.specialCooldownRemaining = phaseTwo ? 1900 : 2700;
          this.guardRemaining = phaseTwo ? 760 : 560;
          this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseTwo ? 180 : 240);
          this.bodyObject.body.setVelocity(spacingReset.x * (phaseTwo ? 132 : 110), spacingReset.y * (phaseTwo ? 132 : 110));
          this.consumeOrbitPressure(720);
          return {
            performedSpecial: true,
            feedbackText: "The Honored resets the duel line.",
            feedbackColor: this.definition.edge
          };
        }

        if (this.specialCooldownRemaining <= 0 && distance >= kit.heavy.range * BOSS_TUNING.honored.retreatReclaimDistanceMultiplier) {
          this.specialCooldownRemaining = phaseThree ? 2000 : phaseTwo ? 2400 : 3000;
          this.guardRemaining = phaseThree ? 300 : phaseTwo ? 460 : 360;
          this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseThree ? 140 : phaseTwo ? 180 : 240);
          this.bodyObject.body.setVelocity(normalized.x * (phaseThree ? 146 : phaseTwo ? 126 : 104), normalized.y * (phaseThree ? 146 : phaseTwo ? 126 : 104));
          return {
            performedSpecial: true,
            feedbackText: "The Honored calmly reclaims measure.",
            feedbackColor: this.definition.edge
          };
        }

        if (this.specialCooldownRemaining <= 0 && !targetState.isAttacking && !targetState.isDashing && distance >= kit.light.range * 0.68 && distance <= kit.heavy.range * 0.88) {
          this.specialCooldownRemaining = phaseTwo ? 2200 : 3000;
          this.guardRemaining = phaseTwo ? 700 : 500;
          this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseTwo ? 220 : 280);
          this.bodyObject.body.setVelocity(0, 0);
          return {
            performedSpecial: true,
            feedbackText: "The Honored settles into guard.",
            feedbackColor: this.definition.edge
          };
        }

        if (this.specialCooldownRemaining <= 0 && targetState.isAttacking && distance >= kit.light.range * 0.56 && distance <= kit.heavy.range * 0.94) {
          this.specialCooldownRemaining = phaseTwo ? 1900 : 2800;
          this.guardRemaining = phaseTwo ? 620 : 420;
          this.attackCooldownRemaining = Math.min(this.attackCooldownRemaining, phaseTwo ? 90 : 130);
          this.bodyObject.body.setVelocity(-normalized.x * (phaseTwo ? 92 : 68), -normalized.y * (phaseTwo ? 92 : 68));
          this.counterQueued = true;
          return {
            performedSpecial: true,
            feedbackText: "The Honored invites the strike.",
            feedbackColor: this.definition.edge
          };
        }
        return {};
      case "exalted":
        if (!phaseThree && orbitActive && this.arenaCooldownRemaining <= 0) {
          const futurePoint = this.getOrbitFuturePoint(targetX, targetY, normalized, phaseTwo ? 74 : 58, phaseTwo ? 20 : 12, 58);
          const tangent = this.getOrbitTangent(normalized);
          const arenaCenter = new Phaser.Math.Vector2(ARENA.x + ARENA.width * 0.5 - this.x, ARENA.y + ARENA.height * 0.5 - this.y).normalize();
          this.arenaCooldownRemaining = phaseTwo ? 2520 : 4180;
          this.specialCooldownRemaining = Math.max(this.specialCooldownRemaining, phaseTwo ? 1300 : 1820);
          this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseTwo ? 220 : 280);
          this.guardRemaining = phaseTwo ? 560 : 780;
          this.bodyObject.body.setVelocity(arenaCenter.x * (phaseTwo ? 132 : 104), arenaCenter.y * (phaseTwo ? 132 : 104));
          this.consumeOrbitPressure(1220);
          return {
            spawnedHazards: [
              this.createHazard(futurePoint.x, futurePoint.y, "bearTrap", phaseTwo ? 34 : 30, phaseTwo ? 3800 : 3400, phaseTwo ? 8 : 6, phaseTwo ? 320 : 280, 0x9cbce0, "The hall seals the route ahead."),
              this.createHazard(
                futurePoint.x + tangent.x * (phaseTwo ? 52 : 38),
                futurePoint.y + tangent.y * (phaseTwo ? 52 : 38),
                "snarePatch",
                phaseTwo ? 36 : 32,
                phaseTwo ? 4000 : 3600,
                phaseTwo ? 7 : 5,
                280,
                0xc5dcf3,
                "The arena rejects the orbit."
              ),
              this.createHazard(
                ARENA.x + ARENA.width * 0.5,
                ARENA.y + ARENA.height * 0.5,
                phaseTwo ? "bearTrap" : "snarePatch",
                phaseTwo ? 32 : 28,
                phaseTwo ? 3200 : 2800,
                phaseTwo ? 7 : 5,
                240,
                0xb7d0eb,
                "The center is recalibrated."
              )
            ],
            performedSpecial: true,
            feedbackText: "The Exalted redraws the floor.",
            feedbackColor: this.definition.edge
          };
        }

        if (this.arenaCooldownRemaining <= 0) {
          this.arenaCooldownRemaining = phaseThree ? BOSS_TUNING.exalted.phaseThreeReconfigurationMs : phaseTwo ? 2600 : 4300;
          this.specialCooldownRemaining = Math.max(this.specialCooldownRemaining, phaseThree ? 1240 : phaseTwo ? 1320 : 1840);
          this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseThree ? 190 : phaseTwo ? 220 : 280);
          this.guardRemaining = phaseThree ? 420 : phaseTwo ? 520 : 760;
          return {
            spawnedHazards: this.createExaltedHazards(phaseTwo, phaseThree),
            performedSpecial: true,
            feedbackText: phaseThree ? "The board reveals its checkmate line." : phaseTwo ? "The hall seals into new lines." : "Runes realign across the floor.",
            feedbackColor: this.definition.edge
          };
        }

        if (phaseTwo && this.specialCooldownRemaining <= 0 && kit.signature) {
          this.specialCooldownRemaining = phaseThree ? 1500 : 1800;
          this.startAttack("heavy", kit.signature);
          return { performedSpecial: true };
        }
        return {};
      case "skelecar":
        if (this.arenaCooldownRemaining <= 0 && distance >= 96 && distance <= 260) {
          this.arenaCooldownRemaining = phaseTwo ? 2060 : 2980;
          this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseTwo ? 150 : 200);
          return {
            spawnedHazards: this.createSkelecarHazards(targetX, targetY, normalized, phaseTwo),
            performedSpecial: true,
            feedbackText: phaseTwo ? "Blue lanes snap into place." : "Blue lines punish the lazy step.",
            feedbackColor: this.definition.edge
          };
        }

        if (
          this.specialCooldownRemaining <= 0 &&
          (distance <= kit.heavy.range * 0.76 || targetState.isAttacking || targetState.isDashing)
        ) {
          const destination = this.getSkelecarTeleportDestination(targetX, targetY, phaseTwo);
          this.specialCooldownRemaining = phaseTwo ? 2080 : 2860;
          this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseTwo ? 220 : 300);
          this.guardRemaining = phaseTwo ? 140 : 90;
          this.postTeleportRecoveryRemaining = this.getTeleportRecoveryDurationMs();
          this.skelecarVolleyReady = true;
          this.teleportToDestination(destination.x, destination.y);
          return {
            performedSpecial: true,
            feedbackText: destination.cueText,
            feedbackColor: this.definition.edge
          };
        }
        return {};
      case "danu":
        if (this.arenaCooldownRemaining <= 0) {
          this.arenaCooldownRemaining = phaseTwo ? 2580 : 3620;
          this.specialCooldownRemaining = Math.max(this.specialCooldownRemaining, phaseTwo ? 1180 : 1540);
          this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseTwo ? 180 : 230);
          this.guardRemaining = phaseTwo ? 340 : 220;
          return {
            spawnedHazards: this.createDanuHazards(phaseTwo),
            performedSpecial: true,
            feedbackText: phaseTwo ? "Danu approves a tighter floor plan." : "The chamber receives your paperwork.",
            feedbackColor: this.definition.edge
          };
        }

        if (this.specialCooldownRemaining <= 0 && distance >= kit.light.range * 0.58 && distance <= kit.heavy.range * 0.96 && kit.signature) {
          this.specialCooldownRemaining = phaseTwo ? 1820 : 2520;
          this.guardRemaining = phaseTwo ? 280 : 200;
          this.startAttack("heavy", kit.signature);
          return {
            performedSpecial: true,
            feedbackText: phaseTwo ? "Danu fast-tracks the verdict." : "Danu approves the engagement.",
            feedbackColor: this.definition.edge
          };
        }
        return {};
      default:
        if (this.definition.id === "permafrost" && phaseThree) {
          if (this.specialCooldownRemaining <= 0 && this.permafrostInitiativeRemaining <= 0 && distance >= kit.light.range * 0.62 && distance <= kit.heavy.range * 1.04 && kit.signature) {
            this.specialCooldownRemaining = 2600;
            this.startAttack("heavy", kit.signature, normalized);
            return {
              performedSpecial: true,
              feedbackText: "The Permafrost finally commits.",
              feedbackColor: this.definition.edge
            };
          }
          return {};
        }

        if (
          orbitActive &&
          this.specialCooldownRemaining <= 0 &&
          distance >= kit.light.range * 0.68 &&
          distance <= kit.heavy.range * 0.98 &&
          (kit.counter || kit.heavy)
        ) {
          this.specialCooldownRemaining = phaseTwo ? 1700 : 2400;
          this.guardRemaining = phaseTwo ? 420 : 260;
          this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseTwo ? 160 : 220);
          this.consumeOrbitPressure(680);
          this.startAttack(
            "heavy",
            kit.counter ?? kit.heavy,
            this.getOrbitInterceptDirection(targetX, targetY, normalized, distance, phaseTwo ? 70 : 56, phaseTwo ? 10 : 6)
          );
          return {
            performedSpecial: true,
            feedbackText: "The Permafrost cuts across the circle.",
            feedbackColor: this.definition.edge
          };
        }

        if (
          this.specialCooldownRemaining <= 0 &&
          (targetState.isDashing || targetState.isAttacking) &&
          distance >= kit.light.range * 0.64 &&
          distance <= kit.heavy.range * 0.92 &&
          kit.counter
        ) {
          this.specialCooldownRemaining = phaseTwo ? 1840 : 2800;
          this.counterQueued = true;
          this.guardRemaining = phaseTwo ? 420 : 260;
          this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseTwo ? 180 : 220);
          this.bodyObject.body.setVelocity(-normalized.x * (phaseTwo ? 220 : 180), -normalized.y * (phaseTwo ? 220 : 180));
          return {
            spawnedHazards: [
              this.createHazard(
                targetX - normalized.x * (phaseTwo ? 18 : 26),
                targetY - normalized.y * (phaseTwo ? 18 : 26),
                "snarePatch",
                phaseTwo ? 32 : 28,
                phaseTwo ? 3400 : 2800,
                phaseTwo ? 6 : 4,
                240,
                0x9fd7f2,
                "Ice locks your step"
              )
            ],
            performedSpecial: true,
            feedbackText: "The Permafrost draws a cold line.",
            feedbackColor: this.definition.edge
          };
        }

        if (this.arenaCooldownRemaining <= 0 && distance >= 104 && distance <= 226) {
          this.arenaCooldownRemaining = phaseTwo ? 2160 : 3360;
          this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, phaseTwo ? 160 : 210);
          return {
            spawnedHazards: [
              this.createHazard(
                targetX + normalized.y * 24,
                targetY - normalized.x * 24,
                "snarePatch",
                phaseTwo ? 32 : 28,
                3200,
                phaseTwo ? 5 : 4,
                220,
                0xbfefff,
                "The floor ices over"
              )
            ],
            performedSpecial: true,
            feedbackText: "Frost closes the lane.",
            feedbackColor: this.definition.edge
          };
        }
        return {};
    }
  }

  private createExaltedHazards(phaseTwo: boolean, phaseThree = false): EnemyHazardSignal[] {
    const centerX = ARENA.x + ARENA.width * 0.5;
    const centerY = ARENA.y + ARENA.height * 0.5;
    if (phaseThree) {
      const checkmatePatterns = [
        [
          { x: centerX - 142, y: centerY, kind: "bearTrap" as const },
          { x: centerX, y: centerY - 126, kind: "snarePatch" as const },
          { x: centerX, y: centerY + 126, kind: "snarePatch" as const }
        ],
        [
          { x: centerX + 142, y: centerY, kind: "bearTrap" as const },
          { x: centerX - 122, y: centerY - 102, kind: "snarePatch" as const },
          { x: centerX - 122, y: centerY + 102, kind: "snarePatch" as const }
        ],
        [
          { x: centerX, y: centerY, kind: "bearTrap" as const },
          { x: centerX - 148, y: centerY, kind: "snarePatch" as const },
          { x: centerX + 148, y: centerY, kind: "snarePatch" as const }
        ]
      ] as const;
      const pattern = checkmatePatterns[this.exaltedPatternIndex % checkmatePatterns.length] ?? checkmatePatterns[0];
      this.exaltedPatternIndex += 1;
      return pattern.map((entry, index) =>
        this.createHazard(
          entry.x,
          entry.y,
          entry.kind,
          entry.kind === "bearTrap" ? 34 : 36,
          entry.kind === "bearTrap" ? 3400 : 3800,
          entry.kind === "bearTrap" ? 8 : 7,
          entry.kind === "bearTrap" ? 320 : 280,
          entry.kind === "bearTrap" ? 0x9cbce0 : 0xc5dcf3,
          index === 0 ? "The next board state is already visible." : "Plan two moves ahead."
        )
      );
    }
    const patterns = [
      {
        traps: [
          { x: centerX - 132, y: centerY },
          { x: centerX + 132, y: centerY }
        ],
        snares: [
          { x: centerX, y: centerY - 128 },
          ...(phaseTwo ? [{ x: centerX, y: centerY + 128 }] : [])
        ]
      },
      {
        traps: [
          { x: centerX, y: centerY - 128 },
          { x: centerX, y: centerY + 128 }
        ],
        snares: [
          { x: centerX - 148, y: centerY },
          ...(phaseTwo ? [{ x: centerX + 148, y: centerY }] : [])
        ]
      },
      {
        traps: [
          { x: centerX - 118, y: centerY - 96 },
          { x: centerX + 118, y: centerY + 96 }
        ],
        snares: [
          { x: centerX + 118, y: centerY - 96 },
          ...(phaseTwo ? [{ x: centerX - 118, y: centerY + 96 }] : [])
        ]
      }
    ] as const;
    const pattern = patterns[this.exaltedPatternIndex % patterns.length] ?? patterns[0];
    this.exaltedPatternIndex += 1;

    return [
      ...pattern.traps.map((position) =>
        this.createHazard(position.x, position.y, "bearTrap", phaseTwo ? 34 : 30, phaseTwo ? 3800 : 3400, phaseTwo ? 8 : 6, phaseTwo ? 320 : 280, 0x9cbce0, "Runes slam shut around you")
      ),
      ...pattern.snares.map((position, index) =>
        this.createHazard(
          position.x,
          position.y,
          "snarePatch",
          phaseTwo ? 36 : 32,
          phaseTwo ? 4000 : 3600,
          phaseTwo ? 7 : 5,
          280,
          0xc5dcf3,
          index === 0 ? "A ward field rejects your footing" : "The hall seals behind you"
        )
      )
    ];
  }

  private createSkelecarHazards(
    targetX: number,
    targetY: number,
    normalized: Phaser.Math.Vector2,
    phaseTwo: boolean
  ): EnemyHazardSignal[] {
    const lateral = new Phaser.Math.Vector2(-normalized.y, normalized.x);
    const anchor = clampToArena(targetX - normalized.x * (phaseTwo ? 12 : 18), targetY - normalized.y * (phaseTwo ? 12 : 18), 56);
    const offsets = phaseTwo ? [-54, 0, 54] : [-38, 38];

    return offsets.map((offset, index) =>
      this.createHazard(
        anchor.x + lateral.x * offset,
        anchor.y + lateral.y * offset,
        "snarePatch",
        phaseTwo ? 28 : 24,
        phaseTwo ? 3000 : 2480,
        phaseTwo ? 6 : 4,
        220,
        0x6ebeff,
        index === 0 ? "Blue lines reward motion." : "Don't park in the lane."
      )
    );
  }

  private createDanuHazards(phaseTwo: boolean): EnemyHazardSignal[] {
    const centerX = ARENA.x + ARENA.width * 0.5;
    const centerY = ARENA.y + ARENA.height * 0.5;
    const patterns = [
      [
        { x: centerX - 132, y: centerY - 92, kind: "bearTrap" as const },
        { x: centerX + 132, y: centerY + 92, kind: "bearTrap" as const },
        { x: centerX, y: centerY, kind: "snarePatch" as const }
      ],
      [
        { x: centerX - 144, y: centerY, kind: "snarePatch" as const },
        { x: centerX + 144, y: centerY, kind: "snarePatch" as const },
        { x: centerX, y: centerY - 112, kind: "bearTrap" as const }
      ],
      [
        { x: centerX, y: centerY - 112, kind: "snarePatch" as const },
        { x: centerX, y: centerY + 112, kind: "snarePatch" as const },
        { x: centerX, y: centerY, kind: "bearTrap" as const }
      ]
    ] as const;
    const pattern = patterns[this.danuPatternIndex % patterns.length] ?? patterns[0];
    this.danuPatternIndex += 1;

    return pattern.map((entry, index) =>
      this.createHazard(
        entry.x,
        entry.y,
        entry.kind,
        entry.kind === "bearTrap" ? (phaseTwo ? 34 : 30) : phaseTwo ? 32 : 28,
        phaseTwo ? 3400 : 3000,
        entry.kind === "bearTrap" ? (phaseTwo ? 8 : 6) : phaseTwo ? 6 : 4,
        entry.kind === "bearTrap" ? 300 : 240,
        0xe0a36f,
        index === 0 ? "Approval is pending." : "The chamber narrows your options."
      )
    );
  }

  private createHazard(
    x: number,
    y: number,
    kind: EnemyHazardSignal["kind"],
    radius: number,
    durationMs: number,
    damage: number,
    controlLockMs: number,
    tint: number,
    triggerText: string
  ): EnemyHazardSignal {
    const position = clampToArena(x, y, radius + 18);
    return {
      kind,
      x: position.x,
      y: position.y,
      radius,
      armDelayMs: this.currentPhaseIndex > 0 ? 320 : 420,
      durationMs,
      damage: Math.max(1, damage - 1),
      controlLockMs: Math.max(160, controlLockMs - 36),
      tint,
      triggerText
    };
  }

  private createCurrent(
    x: number,
    y: number,
    direction: Phaser.Math.Vector2,
    radius: number,
    durationMs: number,
    strength: number,
    triggerText: string
  ): EnemyHazardSignal {
    const normalized = direction.clone();
    if (normalized.lengthSq() <= 0.001) {
      normalized.set(1, 0);
    } else {
      normalized.normalize();
    }

    return {
      ...this.createHazard(x, y, "currentZone", radius, durationMs, 1, 0, 0x4aa8c1, triggerText),
      force: {
        x: normalized.x,
        y: normalized.y,
        strength
      }
    };
  }

  private createPredictionSigil(
    x: number,
    y: number,
    radius: number,
    durationMs: number,
    markerStyle: "real" | "decoy" | "line" | "dive"
  ): EnemyHazardSignal {
    const tint = markerStyle === "real" ? 0xffe0a6 : markerStyle === "line" ? 0xffc982 : markerStyle === "dive" ? 0xff9e72 : 0xa85b4e;
    return {
      ...this.createHazard(x, y, "predictionSigil", radius, durationMs, 1, 0, tint, ""),
      markerStyle
    };
  }

  private beginEnflamedPrediction(
    destination: { x: number; y: number },
    targetX: number,
    targetY: number,
    prophecy: boolean,
    phaseTwo: boolean
  ): EnemyUpdateResult {
    const leadMs = BOSS_TUNING.enflamed.predictionLeadMs[prophecy ? 2 : phaseTwo ? 1 : 0];
    const lanceDirection = new Phaser.Math.Vector2(targetX - destination.x, targetY - destination.y);
    if (lanceDirection.lengthSq() <= 0.001) {
      lanceDirection.set(this.facing.x, this.facing.y);
    } else {
      lanceDirection.normalize();
    }
    const diveDirection = lanceDirection.clone();
    this.enflamedPrediction = {
      stage: "arrival",
      remaining: leadMs,
      destination,
      lanceDirection,
      diveDirection
    };

    const lateral = new Phaser.Math.Vector2(-lanceDirection.y, lanceDirection.x);
    const sigils: EnemyHazardSignal[] = [this.createPredictionSigil(destination.x, destination.y, prophecy ? 40 : 36, leadMs + 320, "real")];
    if (phaseTwo) {
      sigils.push(
        this.createPredictionSigil(destination.x + lateral.x * 72, destination.y + lateral.y * 72, 28, leadMs + 280, "decoy"),
        this.createPredictionSigil(destination.x - lateral.x * 72, destination.y - lateral.y * 72, 28, leadMs + 280, "decoy")
      );
    }
    if (prophecy) {
      sigils.push(
        this.createPredictionSigil(destination.x + lanceDirection.x * 116, destination.y + lanceDirection.y * 116, 24, leadMs + 1180, "line"),
        this.createPredictionSigil(targetX + lateral.x * 32, targetY + lateral.y * 32, 30, leadMs + 1500, "dive")
      );
    }

    return {
      spawnedHazards: sigils,
      performedSpecial: true,
      feedbackText: prophecy ? "Prophecy marks arrival, lance, then dive." : phaseTwo ? "Only the bright sigil is real." : "The bright sigil names the landing.",
      feedbackColor: this.definition.edge
    };
  }

  private updateEnflamedPrediction(deltaMs: number, targetX: number, targetY: number): EnemyUpdateResult | null {
    const prediction = this.enflamedPrediction;
    if (!prediction) {
      return null;
    }

    prediction.remaining = Math.max(0, prediction.remaining - deltaMs);
    if (prediction.stage === "arrival") {
      if (prediction.remaining > 0) {
        return {};
      }

      this.teleportToDestination(prediction.destination.x, prediction.destination.y);
      this.guardRemaining = this.currentPhaseIndex >= 2 ? 180 : this.currentPhaseIndex > 0 ? 220 : 140;
      this.postTeleportRecoveryRemaining = this.getTeleportRecoveryDurationMs();
      this.enflamedDiveReady = true;
      if (this.currentPhaseIndex < 2) {
        this.enflamedPrediction = null;
        return { feedbackText: "The Enflamed arrives where the sigil promised.", feedbackColor: this.definition.edge };
      }

      prediction.stage = "lance";
      prediction.remaining = BOSS_TUNING.enflamed.prophecyLanceDelayMs;
      prediction.lanceDirection = new Phaser.Math.Vector2(targetX - this.x, targetY - this.y);
      if (prediction.lanceDirection.lengthSq() <= 0.001) {
        prediction.lanceDirection.set(this.facing.x, this.facing.y);
      } else {
        prediction.lanceDirection.normalize();
      }
      return { feedbackText: "The second mark becomes a lance line.", feedbackColor: this.definition.edge };
    }

    if (prediction.stage === "lance") {
      if (prediction.remaining > 0 || this.currentAttack) {
        return {};
      }

      const lance = this.getCurrentAttackKit().heavy;
      this.startAttack("heavy", lance, prediction.lanceDirection);
      prediction.stage = "dive";
      prediction.remaining = lance.windup + lance.active + lance.recovery + BOSS_TUNING.enflamed.prophecyDiveDelayMs;
      prediction.diveDirection = new Phaser.Math.Vector2(targetX - this.x, targetY - this.y);
      if (prediction.diveDirection.lengthSq() <= 0.001) {
        prediction.diveDirection.set(this.facing.x, this.facing.y);
      } else {
        prediction.diveDirection.normalize();
      }
      return { feedbackText: "The prophecy tightens.", feedbackColor: this.definition.edge };
    }

    if (prediction.remaining > 0 || this.currentAttack) {
      return {};
    }

    const dive = this.getCurrentAttackKit().signature;
    this.enflamedPrediction = null;
    if (dive) {
      this.startAttack("heavy", dive, prediction.diveDirection);
      return { feedbackText: "The final mark falls.", feedbackColor: this.definition.edge };
    }

    return {};
  }

  private getEnflamedTeleportDestination(targetX: number, targetY: number, phaseTwo: boolean): { x: number; y: number; cueText: string } {
    const anchorAngle = Phaser.Math.Angle.Between(targetX, targetY, this.x, this.y);
    const slots = phaseTwo
      ? [
          { angleOffset: -0.86, distance: 138, cueText: "White fire cuts to your left." },
          { angleOffset: 0.86, distance: 138, cueText: "White fire cuts to your right." },
          { angleOffset: Math.PI, distance: 126, cueText: "White fire gathers just behind you." },
          { angleOffset: 0, distance: 156, cueText: "The Enflamed claims the mid line." }
        ]
      : [
          { angleOffset: -0.78, distance: 144, cueText: "The Enflamed flashes left." },
          { angleOffset: 0.78, distance: 144, cueText: "The Enflamed flashes right." }
        ];
    const slot = slots[this.enflamedTeleportIndex % slots.length] ?? slots[0];
    this.enflamedTeleportIndex += 1;
    const angle = anchorAngle + slot.angleOffset;
    const destination = clampToArena(targetX + Math.cos(angle) * slot.distance, targetY + Math.sin(angle) * slot.distance, 56);
    return {
      x: destination.x,
      y: destination.y,
      cueText: slot.cueText
    };
  }

  private getSkelecarTeleportDestination(targetX: number, targetY: number, phaseTwo: boolean): { x: number; y: number; cueText: string } {
    const anchorAngle = Phaser.Math.Angle.Between(targetX, targetY, this.x, this.y);
    const slots = phaseTwo
      ? [
          { angleOffset: -0.98, distance: 146, cueText: "Skelecar blinks to your blue left." },
          { angleOffset: 0.98, distance: 146, cueText: "Skelecar blinks to your blue right." },
          { angleOffset: Math.PI, distance: 132, cueText: "Skelecar blinks just behind your line." },
          { angleOffset: 0, distance: 162, cueText: "Skelecar steals a mid lane." }
        ]
      : [
          { angleOffset: -0.86, distance: 154, cueText: "Skelecar side-steps left out of measure." },
          { angleOffset: 0.86, distance: 154, cueText: "Skelecar side-steps right out of measure." },
          { angleOffset: Math.PI, distance: 122, cueText: "Skelecar slips just behind your line." }
        ];
    const slot = slots[this.skelecarTeleportIndex % slots.length] ?? slots[0];
    this.skelecarTeleportIndex += 1;
    const angle = anchorAngle + slot.angleOffset;
    const destination = clampToArena(targetX + Math.cos(angle) * slot.distance, targetY + Math.sin(angle) * slot.distance, 60);

    return {
      x: destination.x,
      y: destination.y,
      cueText: slot.cueText
    };
  }

  private teleportToDestination(x: number, y: number): void {
    const destination = clampToArena(x, y, 56);
    this.bodyObject.body.setAcceleration(0, 0);
    this.bodyObject.body.setVelocity(0, 0);
    this.bodyObject.setPosition(destination.x, destination.y);
    this.bodyShadow.setPosition(destination.x, destination.y + this.size * 0.28);
    this.auraRing.setPosition(destination.x, destination.y);
    this.bodySprite?.setPosition(destination.x, destination.y);
    this.scene.tweens.add({
      targets: [this.bodyObject, this.auraRing, this.ornamentPrimary, this.ornamentSecondary, this.weaponGuard, this.weaponBlade],
      alpha: 0.58,
      duration: 70,
      yoyo: true
    });

    if (this.bodySprite) {
      this.scene.tweens.add({
        targets: this.bodySprite,
        alpha: 0.52,
        duration: 70,
        yoyo: true
      });
    }
  }

  private tryCreateBurstProjectiles(signal: AttackExecutionSignal): AttackExecutionSignal[] {
    if (signal.profile.delivery !== "ranged") {
      return [];
    }

    let angleOffsets: number[] = [];
    let damageScale = 0.66;
    let rangeScale = 0.94;
    let widthScale = 0.9;
    let displacementScale = 0.82;
    let controlLossScale = 0.86;

    if (this.definition.id === "enflamed") {
      angleOffsets = this.currentPhaseIndex > 0 ? [-0.24, -0.08, 0.08, 0.24] : [-0.16, 0.16];
      damageScale = this.currentPhaseIndex > 0 ? 0.72 : 0.66;
    } else if (this.definition.id === "skelecar") {
      const volleyAttack = signal.profile.name === "Bad Time Volley" || signal.profile.name === "Very Bad Time";
      angleOffsets = volleyAttack
        ? this.currentPhaseIndex > 0
          ? [-0.34, -0.18, -0.06, 0.06, 0.18, 0.34]
          : [-0.26, -0.1, 0.1, 0.26]
        : this.currentPhaseIndex > 0
          ? [-0.2, 0.2]
          : [-0.14, 0.14];
      damageScale = volleyAttack ? (this.currentPhaseIndex > 0 ? 0.54 : 0.58) : this.currentPhaseIndex > 0 ? 0.7 : 0.74;
      rangeScale = 0.9;
      widthScale = 0.86;
      displacementScale = 0.74;
      controlLossScale = 0.78;
    } else {
      return [];
    }

    return angleOffsets.map((angleOffset) => {
      const angle = signal.angle + angleOffset;
      const direction = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
      return {
        id: ++this.attackId,
        kind: signal.kind,
        rangeAnchor: signal.rangeAnchor,
        fullyCharged: signal.fullyCharged,
        angle,
        direction: {
          x: direction.x,
          y: direction.y
        },
        profile: {
          ...signal.profile,
          damage: Math.max(1, Math.round(signal.profile.damage * damageScale)),
          range: Math.round(signal.profile.range * rangeScale),
          width: Math.max(12, Math.round(signal.profile.width * widthScale)),
          impact: {
            ...signal.profile.impact,
            displacement: Math.round(signal.profile.impact.displacement * displacementScale),
            controlLossMs: Math.round(signal.profile.impact.controlLossMs * controlLossScale)
          }
        }
      };
    });
  }

  private startAttack(kind: AttackKind, profile: AttackProfile, directionOverride?: Phaser.Math.Vector2): void {
    const direction = (directionOverride?.clone() ?? this.facing.clone()).normalize();
    this.facing.copy(direction);

    this.currentAttack = {
      signal: {
        id: ++this.attackId,
        kind,
        profile: { ...profile },
        rangeAnchor: profile.range,
        fullyCharged: kind === "heavy",
        direction: {
          x: direction.x,
          y: direction.y
        },
        angle: direction.angle()
      },
      phase: "windup",
      remaining: profile.windup
    };

    if (this.definition.id === "permafrost" && this.currentPhaseIndex >= 2) {
      this.permafrostInitiativeRemaining = BOSS_TUNING.permafrost.patienceInitiativeMs[2];
    }

    this.bodyObject.body.setAcceleration(direction.x * this.acceleration * 0.14, direction.y * this.acceleration * 0.14);
  }

  isMomentumCharge(signal: AttackExecutionSignal): boolean {
    return signal.profile.name.includes("Charge") || signal.profile.name === "Abyssal Crossing";
  }

  private updateMovement(distance: number, normalized: Phaser.Math.Vector2, targetState: ArenaTargetState): void {
    if (this.currentAttack?.phase === "active") {
      this.bodyObject.body.setAcceleration(0, 0);
      return;
    }

    if (this.stunRemaining > 0) {
      this.bodyObject.body.setAcceleration(0, 0);
      this.bodyObject.body.setVelocity(this.bodyObject.body.velocity.x * 0.88, this.bodyObject.body.velocity.y * 0.88);
      return;
    }

    if (this.postTeleportRecoveryRemaining > 0) {
      this.bodyObject.body.setAcceleration(0, 0);
      this.bodyObject.body.setVelocity(
        this.bodyObject.body.velocity.x * (this.definition.id === "skelecar" ? 0.82 : 0.78),
        this.bodyObject.body.velocity.y * (this.definition.id === "skelecar" ? 0.82 : 0.78)
      );
      return;
    }

    const kit = this.getCurrentAttackKit();
    const phaseTwo = this.currentPhaseIndex > 0;
    const orbit = new Phaser.Math.Vector2(-normalized.y * this.strideDirection, normalized.x * this.strideDirection);
    const desired = new Phaser.Math.Vector2();
    const orbitActive = this.isOrbitPressureActive();

    switch (this.definition.id) {
      case "apex":
        if (orbitActive) {
          desired.copy(this.getOrbitInterceptDirection(this.x + normalized.x * distance, this.y + normalized.y * distance, normalized, distance, phaseTwo ? 82 : 66, phaseTwo ? 22 : 12));
          desired.add(this.buildOrbitBreakDirection(normalized, phaseTwo ? 0.28 : 0.18, phaseTwo ? 0.28 : 0.2));
          break;
        }

        if (distance > kit.heavy.range * 0.9) {
          desired.copy(normalized).scale(phaseTwo ? 0.92 : 0.8);
          desired.add(orbit.clone().scale(phaseTwo ? 0.36 : 0.28));
        } else if (distance < kit.light.range * 0.72) {
          desired.copy(orbit).scale(phaseTwo ? 0.86 : 0.74);
          desired.add(normalized.clone().negate().scale(phaseTwo ? 0.24 : 0.18));
        } else {
          desired.copy(orbit).scale(phaseTwo ? 1.02 : 0.9);
          desired.add(normalized.clone().scale(phaseTwo ? 0.34 : 0.26));
        }
        break;
      case "enflamed":
        if (orbitActive) {
          desired.copy(this.buildOrbitBreakDirection(normalized, -0.12, phaseTwo ? 1.1 : 0.96));
          desired.add(normalized.clone().scale(phaseTwo ? 0.16 : 0.1));
          break;
        }

        if (distance < kit.light.range * 0.82 || (targetState.isAttacking && distance < kit.heavy.range * 0.88)) {
          desired.copy(normalized).negate().scale(phaseTwo ? 0.98 : 0.84);
          desired.add(orbit.clone().scale(phaseTwo ? 0.64 : 0.52));
        } else {
          desired.copy(orbit).scale(phaseTwo ? 1.18 : 1.02);
          desired.add(normalized.clone().scale(phaseTwo ? 0.24 : 0.18));
        }
        break;
      case "honored":
        if (orbitActive) {
          desired.copy(
            this.buildOrbitBreakDirection(
              normalized,
              distance < kit.light.range * 0.94 ? (phaseTwo ? -0.3 : -0.24) : phaseTwo ? 0.22 : 0.16,
              phaseTwo ? 1.02 : 0.9
            )
          );
          break;
        }

        if (distance > kit.heavy.range * 0.82) {
          desired.copy(normalized).scale(phaseTwo ? 0.54 : 0.44);
          desired.add(orbit.clone().scale(0.08));
        } else if (targetState.isAttacking && distance <= kit.heavy.range * 0.96) {
          desired.copy(normalized).negate().scale(phaseTwo ? 0.46 : 0.34);
          desired.add(orbit.clone().scale(phaseTwo ? 0.24 : 0.18));
        } else if (distance < kit.light.range * 0.74) {
          desired.copy(normalized).negate().scale(phaseTwo ? 0.24 : 0.18);
          desired.add(orbit.clone().scale(phaseTwo ? 0.14 : 0.1));
        } else {
          desired.copy(orbit).scale(phaseTwo ? 0.16 : 0.1);
          desired.add(normalized.clone().scale(phaseTwo ? 0.08 : 0.04));
        }
        break;
      case "exalted":
        if (orbitActive) {
          const toCenter = new Phaser.Math.Vector2(ARENA.x + ARENA.width * 0.5 - this.x, ARENA.y + ARENA.height * 0.5 - this.y);
          if (toCenter.lengthSq() > 1) {
            toCenter.normalize();
          }
          desired.copy(toCenter.scale(phaseTwo ? 0.62 : 0.46));
          desired.add(this.buildOrbitBreakDirection(normalized, 0.1, phaseTwo ? 0.34 : 0.26));
          break;
        }

        if (this.guardRemaining > 0 && !phaseTwo) {
          desired.set(0, 0);
        } else if (distance > kit.heavy.range * 0.72) {
          desired.copy(normalized).scale(phaseTwo ? 0.52 : 0.38);
        } else {
          desired.copy(orbit).scale(phaseTwo ? 0.12 : 0.08);
          desired.add(normalized.clone().scale(phaseTwo ? 0.12 : 0.06));
        }
        break;
      case "permafrost":
        if (orbitActive) {
          desired.copy(
            distance >= kit.light.range * 0.86 && distance <= kit.heavy.range * 0.84
              ? this.buildOrbitBreakDirection(normalized, phaseTwo ? 0.44 : 0.34, phaseTwo ? 0.96 : 0.82)
              : this.buildOrbitBreakDirection(normalized, phaseTwo ? -0.14 : -0.08, phaseTwo ? 0.8 : 0.68)
          );
          break;
        }

        if (!targetState.isAttacking && !targetState.isDashing && distance >= kit.light.range * 0.88 && distance <= kit.heavy.range * 0.82) {
          desired.set(0, 0);
        } else if ((targetState.isAttacking && distance <= kit.heavy.range * 0.94) || distance < kit.light.range * 0.72) {
          desired.copy(normalized).negate().scale(phaseTwo ? 0.92 : 0.74);
          desired.add(orbit.clone().scale(phaseTwo ? 0.46 : 0.34));
        } else if (distance > kit.heavy.range * 0.88) {
          desired.copy(normalized).scale(phaseTwo ? 0.44 : 0.32);
          desired.add(orbit.clone().scale(0.08));
        } else {
          desired.copy(orbit).scale(phaseTwo ? 0.18 : 0.1);
        }
        break;
      case "skelecar":
        if (orbitActive) {
          desired.copy(this.buildOrbitBreakDirection(normalized, phaseTwo ? -0.08 : -0.04, phaseTwo ? 1.22 : 1.08));
          break;
        }

        if (distance < kit.light.range * 0.94 || targetState.isAttacking) {
          desired.copy(normalized).negate().scale(phaseTwo ? 1.12 : 0.98);
          desired.add(orbit.clone().scale(phaseTwo ? 0.88 : 0.72));
        } else if (distance > kit.heavy.range * 0.82) {
          desired.copy(orbit).scale(phaseTwo ? 1.08 : 0.94);
          desired.add(normalized.clone().scale(phaseTwo ? 0.18 : 0.12));
        } else {
          desired.copy(orbit).scale(phaseTwo ? 1.18 : 1.02);
          desired.add(normalized.clone().negate().scale(phaseTwo ? 0.18 : 0.12));
        }
        break;
      case "danu":
        if (orbitActive) {
          desired.copy(this.buildOrbitBreakDirection(normalized, phaseTwo ? 0.52 : 0.38, phaseTwo ? 0.38 : 0.28));
          break;
        }

        if (distance > kit.heavy.range * 0.7) {
          desired.copy(normalized).scale(phaseTwo ? 0.98 : 0.84);
          desired.add(orbit.clone().scale(phaseTwo ? 0.12 : 0.08));
        } else if (targetState.isAttacking && distance <= kit.heavy.range * 0.88) {
          desired.copy(normalized).negate().scale(phaseTwo ? 0.3 : 0.22);
          desired.add(orbit.clone().scale(phaseTwo ? 0.22 : 0.16));
        } else {
          desired.copy(normalized).scale(phaseTwo ? 0.42 : 0.3);
          desired.add(orbit.clone().scale(phaseTwo ? 0.16 : 0.1));
        }
        break;
      default:
        if (orbitActive) {
          desired.copy(this.buildOrbitBreakDirection(normalized, phaseTwo ? 0.42 : 0.28, phaseTwo ? 0.92 : 0.76));
          break;
        }

        if ((targetState.isAttacking && distance <= kit.heavy.range * 0.94) || distance < kit.light.range * 0.74) {
          desired.copy(normalized).negate().scale(phaseTwo ? 0.98 : 0.82);
          desired.add(orbit.clone().scale(phaseTwo ? 0.54 : 0.4));
        } else if (distance > kit.heavy.range * 0.86) {
          desired.copy(normalized).scale(phaseTwo ? 0.98 : 0.84);
          desired.add(orbit.clone().scale(0.18));
        } else {
          desired.copy(orbit).scale(phaseTwo ? 0.96 : 0.78);
        }
        break;
    }

    if (desired.lengthSq() > 1) {
      desired.normalize();
    }

    const movementScale = this.slowFactor * this.getPhaseMoveScale();
    this.bodyObject.body.setMaxVelocity(this.speed * movementScale, this.speed * movementScale);
    this.bodyObject.body.setAcceleration(desired.x * this.acceleration * movementScale, desired.y * this.acceleration * movementScale);
  }

  private enterNextPhase(): void {
    this.currentPhaseIndex += 1;
    this.currentPhaseHp = this.phaseHp[this.currentPhaseIndex] ?? this.phaseHp[this.phaseHp.length - 1] ?? 1;
    this.currentAttack = null;
    this.counterQueued = false;
    this.enflamedDiveReady = false;
    this.enflamedPrediction = null;
    this.skelecarVolleyReady = false;
    this.postTeleportRecoveryRemaining = 0;
    this.momentumRecoveryRemaining = 0;
    this.phaseTransitionRemaining = BOSS_TUNING.phaseTransitionMs;
    this.permafrostInitiativeRemaining = this.definition.id === "permafrost"
      ? BOSS_TUNING.permafrost.patienceInitiativeMs[Math.min(2, this.currentPhaseIndex) as 0 | 1 | 2] + this.phaseTransitionRemaining
      : 0;
    this.attackCooldownRemaining = 240;
    this.specialCooldownRemaining = 0;
    this.arenaCooldownRemaining = 0;
    this.guardRemaining =
      this.definition.id === "exalted"
        ? this.currentPhaseIndex >= 2 ? 720 : 980
        : this.definition.id === "honored" || this.definition.id === "permafrost"
          ? this.currentPhaseIndex >= 2 ? 460 : 620
          : this.definition.id === "danu"
            ? 380
            : this.definition.id === "skelecar"
              ? 180
              : 460;
    this.stunRemaining = 0;
    this.resolve = 0;
    this.resolveQuietRemaining = 0;
    this.slowRemaining = 0;
    this.slowFactor = 1;
    this.bleedRemaining = 0;
    this.bleedTickRemaining = 0;
    this.bleedDamage = 0;
    this.strideDirection *= -1;
    this.strideFlipRemaining = 360;
    if (this.definition.id === "enflamed") {
      this.enflamedTeleportIndex = 0;
    }
    if (this.definition.id === "exalted") {
      this.exaltedPatternIndex = 0;
    }
    if (this.definition.id === "skelecar") {
      this.skelecarTeleportIndex = 0;
    }
    if (this.definition.id === "danu") {
      this.danuPatternIndex = 0;
    }
    this.refreshPhaseSpriteTexture();
    this.bodyObject.body.setAcceleration(0, 0);
    this.bodyObject.body.setVelocity(0, 0);
    this.scene.tweens.add({
      targets: [this.bodyObject, this.auraRing, this.ornamentPrimary, this.ornamentSecondary, this.weaponGuard, this.weaponBlade],
      alpha: 0.78,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 120,
      yoyo: true,
      repeat: 3
    });

    if (this.bodySprite) {
      this.scene.tweens.add({
        targets: this.bodySprite,
        alpha: 0.82,
        scaleX: this.phaseSpriteBaseScale * 1.08,
        scaleY: this.phaseSpriteBaseScale * 1.08,
        duration: 120,
        yoyo: true,
        repeat: 3
      });
    }
  }

  private syncPresentation(): void {
    const angle = Math.atan2(this.facing.y, this.facing.x);
    const perpendicular = new Phaser.Math.Vector2(-this.facing.y, this.facing.x);
    const phaseTwo = this.currentPhaseIndex > 0;
    const currentProfile = this.currentAttack?.signal.profile;
    const windup = this.currentAttack?.phase === "windup";
    const active = this.currentAttack?.phase === "active";
    const attackForward = active
      ? phaseTwo
        ? 18
        : 14
      : windup
        ? currentProfile?.attackClass === "lunge"
          ? -18
          : currentProfile?.attackClass === "cleave"
            ? -12
            : -8
        : 0;
    const attackSide =
      currentProfile?.shape === "sweep"
        ? this.currentAttack?.signal.kind === "heavy"
          ? phaseTwo
            ? 18
            : 14
          : 9
        : windup && currentProfile?.attackClass === "cleave"
          ? phaseTwo
            ? 12
            : 9
          : 0;
    const auraAlpha =
      this.phaseTransitionRemaining > 0
        ? 0.34
        : windup
          ? 0.3
          : this.postTeleportRecoveryRemaining > 0
            ? 0.22
            : this.guardRemaining > 0
              ? 0.26
              : phaseTwo
                ? 0.18
                : 0.1;
    const shadowAlpha = this.currentAttack ? 0.3 : 0.24;
    const bladeScaleX = windup ? (currentProfile?.attackClass === "lunge" ? 0.92 : 1.02) : phaseTwo ? 1.04 : 1;
    const bladeScaleY = windup ? (currentProfile?.attackClass === "cleave" ? 1.12 : 1.04) : 1;

    const auraIsHalo = this.definition.id === "enflamed";
    const auraY = auraIsHalo ? this.y - this.size * 0.56 + (phaseTwo ? -2 : 0) : this.y;
    const auraScaleX = auraIsHalo ? (windup ? 0.48 : phaseTwo ? 0.44 : 0.4) : windup ? 1.12 : phaseTwo ? 1.08 : 1;
    const auraScaleY = auraIsHalo ? (windup || phaseTwo ? 0.26 : 0.22) : windup || this.guardRemaining > 0 || phaseTwo ? 1.08 : 1;
    const auraDisplayAlpha = auraIsHalo ? Math.min(0.46, auraAlpha + 0.14) : auraAlpha;

    this.bodyObject.setScale(this.presentationScale);
    this.bodyObject.body.setSize(this.collisionWidth / this.presentationScale, this.collisionHeight / this.presentationScale, true);
    this.bodyShadow.setPosition(this.x, this.y + this.size * 0.28).setAlpha(shadowAlpha).setScale(this.presentationScale);
    this.auraRing
      .setPosition(this.x, auraY)
      .setRotation(auraIsHalo ? 0 : angle)
      .setAlpha(auraDisplayAlpha)
      .setScale(auraScaleX * this.presentationScale, auraScaleY * this.presentationScale);

    if (this.bodySprite) {
      const hover =
        this.definition.id === "skelecar"
          ? -6 + Math.sin(this.presentationTime / 160) * 2.6
          : Math.sin(this.presentationTime / 280) * 0.8;
      const sway = this.definition.id === "skelecar" ? Math.sin(this.presentationTime / 110) * 0.09 : Math.sin(this.presentationTime / 320) * 0.03;
      const spriteScale =
        this.phaseSpriteBaseScale *
        (this.phaseTransitionRemaining > 0 ? 1.05 : windup ? 0.97 : active ? 1.02 : 1) *
        (phaseTwo ? 1.02 : 1);
      const spriteForward = active ? 10 : windup ? -8 : 0;
      const spriteSide = this.definition.id === "skelecar" ? attackSide * 0.2 : attackSide * 0.1;

      this.bodySprite
        .setPosition(
          this.x + this.facing.x * spriteForward + perpendicular.x * spriteSide,
          this.y + hover + this.facing.y * spriteForward + perpendicular.y * spriteSide
        )
        .setRotation(this.definition.id === "skelecar" ? angle * 0.1 + sway : angle * 0.03 + sway)
        .setScale(spriteScale * this.presentationScale)
        .setFlipX(this.facing.x > 0)
        .setAlpha(this.stunRemaining > 0 ? 0.74 : 1);
    }

    let primaryX = this.x + perpendicular.x * 5;
    let primaryY = this.y - this.size * 0.18 + perpendicular.y * 3;
    let primaryRotation = angle * 0.36;
    let primaryAlpha = this.stunRemaining > 0 ? 0.46 : phaseTwo ? 0.9 : 0.78;
    let primaryScaleX = 1;
    let primaryScaleY = 1;
    let secondaryX = this.x - perpendicular.x * 3;
    let secondaryY = this.y - this.size * 0.02 - perpendicular.y * 3;
    let secondaryRotation = angle * 0.22;
    let secondaryAlpha = this.stunRemaining > 0 ? 0.5 : phaseTwo ? 0.96 : 0.88;
    let secondaryScaleX = 1;
    let secondaryScaleY = 1;
    let guardForward = 11;
    let bladeForward = 24 + attackForward;
    let guardScaleX = windup ? 1.06 : 1;
    let guardAlpha = 1;
    let bladeAlpha = 1;
    let bladeRotation = angle;

    switch (this.definition.id) {
      case "apex":
        primaryX = this.x + this.facing.x * 10 - perpendicular.x * 4;
        primaryY = this.y + 2;
        primaryRotation = angle * 0.16;
        primaryAlpha = phaseTwo ? 0.84 : 0.72;
        primaryScaleY = windup || active ? 1.22 : 1;
        secondaryX = this.x + this.facing.x * 12;
        secondaryY = this.y - this.size * 0.14;
        secondaryRotation = angle * 0.06;
        secondaryAlpha = windup || active ? 1 : 0.72;
        secondaryScaleX = windup || active ? 1.18 : 0.92;
        break;
      case "enflamed":
        primaryX = this.x - perpendicular.x * 16 - this.facing.x * 3;
        primaryY = this.y - this.size * 0.1 - perpendicular.y * 6;
        primaryRotation = angle * 0.14 - 0.48 + Math.sin(this.presentationTime / 120) * 0.08;
        primaryAlpha = phaseTwo ? 0.92 : 0.82;
        secondaryX = this.x + perpendicular.x * 16 - this.facing.x * 3;
        secondaryY = this.y - this.size * 0.1 + perpendicular.y * 6;
        secondaryRotation = angle * 0.14 + 0.48 - Math.sin(this.presentationTime / 120) * 0.08;
        secondaryAlpha = phaseTwo ? 0.92 : 0.82;
        break;
      case "honored":
        primaryX = this.x;
        primaryY = this.y - this.size * 0.42;
        primaryRotation = angle * 0.08;
        primaryAlpha = this.stunRemaining > 0 ? 0.56 : 0.9;
        secondaryX = this.x - this.facing.x * 8 + perpendicular.x * 10;
        secondaryY = this.y + this.size * 0.12;
        secondaryRotation = angle * 0.18;
        secondaryAlpha = phaseTwo ? 0.9 : 0.78;
        guardAlpha = windup || active ? 1 : 0.88;
        bladeAlpha = windup || active ? 1 : 0.86;
        break;
      case "exalted":
        primaryX = this.x + this.facing.x * 2;
        primaryY = this.y - this.size * 0.26;
        primaryRotation = angle * 0.06 + Math.sin(this.presentationTime / 240) * 0.04;
        primaryAlpha = phaseTwo ? 0.88 : 0.72;
        secondaryX = this.x + this.facing.x * 9;
        secondaryY = this.y - this.size * 0.12;
        secondaryRotation = angle * 0.04;
        secondaryAlpha = windup || this.guardRemaining > 0 ? 1 : 0.72;
        secondaryScaleX = windup ? 1.16 : 1;
        break;
      case "permafrost":
        primaryX = this.x;
        primaryY = this.y - this.size * 0.44;
        primaryRotation = Math.sin(this.presentationTime / 320) * 0.03;
        primaryAlpha = this.stunRemaining > 0 ? 0.58 : 0.88;
        secondaryX = this.x - this.facing.x * 8 + perpendicular.x * 9;
        secondaryY = this.y + this.size * 0.14;
        secondaryRotation = angle * 0.16;
        secondaryAlpha = phaseTwo ? 0.9 : 0.78;
        guardForward = windup || active ? 11 : 2;
        bladeForward = windup || active ? 24 + attackForward : 10;
        guardAlpha = windup || active ? 1 : 0.58;
        bladeAlpha = windup || active ? 1 : 0.54;
        bladeRotation = windup || active ? angle : angle + 0.34 * this.strideDirection;
        break;
      case "skelecar":
        primaryAlpha = phaseTwo ? 0.84 : 0.72;
        secondaryAlpha = windup || active ? 0.96 : 0.7;
        break;
      case "danu":
        primaryX = this.x;
        primaryY = this.y - this.size * 0.22;
        primaryRotation = angle * 0.08;
        primaryAlpha = phaseTwo ? 0.86 : 0.74;
        secondaryX = this.x + this.facing.x * 8;
        secondaryY = this.y - this.size * 0.08;
        secondaryRotation = angle * 0.14;
        secondaryAlpha = windup || active ? 0.94 : 0.72;
        break;
      default:
        break;
    }

    this.ornamentPrimary
      .setPosition(primaryX, primaryY)
      .setRotation(primaryRotation)
      .setScale(primaryScaleX * this.presentationScale, primaryScaleY * this.presentationScale)
      .setAlpha(primaryAlpha);
    this.ornamentSecondary
      .setPosition(secondaryX, secondaryY)
      .setRotation(secondaryRotation)
      .setScale(secondaryScaleX * this.presentationScale, secondaryScaleY * this.presentationScale)
      .setAlpha(secondaryAlpha);

    const guardX = this.x + this.facing.x * guardForward + perpendicular.x * attackSide * 0.28;
    const guardY = this.y + this.facing.y * guardForward + perpendicular.y * attackSide * 0.28;
    const bladeX = guardX + this.facing.x * bladeForward + perpendicular.x * attackSide;
    const bladeY = guardY + this.facing.y * bladeForward + perpendicular.y * attackSide;

    this.weaponGuard
      .setPosition(guardX, guardY)
      .setRotation(angle)
      .setScale(guardScaleX * this.presentationScale, this.presentationScale)
      .setAlpha(guardAlpha);
    this.weaponBlade
      .setPosition(bladeX, bladeY)
      .setRotation(bladeRotation)
      .setScale(bladeScaleX * this.presentationScale, bladeScaleY * this.presentationScale)
      .setAlpha(bladeAlpha);
    this.bodyObject.setAlpha(this.bodySprite ? 0.18 : 1);

    this.bodyObject.setFillStyle(
      this.stunRemaining > 0 ? 0xe6d1a4 : this.phaseTransitionRemaining > 0 ? 0xf1e2bf : this.guardRemaining > 0 ? 0xf0e2ba : this.accent
    );
    this.bodyObject.setStrokeStyle(
      3,
      windup || this.postTeleportRecoveryRemaining > 0 ? this.definition.edge : COLORS.ghost,
      windup || this.postTeleportRecoveryRemaining > 0 ? 0.58 : 0.32
    );
  }

  private applyDamage(
    amount: number,
    direction: { x: number; y: number },
    impact: HitImpactProfile,
    interrupt: boolean,
    flash: boolean
  ): boolean {
    if (!this.alive || this.phaseTransitionRemaining > 0) {
      return false;
    }

    this.currentPhaseHp = Math.max(0, this.currentPhaseHp - amount);

    const shouldInterrupt = interrupt && Math.random() <= impact.interruptChance && this.guardRemaining === 0;
    if (shouldInterrupt) {
      this.currentAttack = null;
      this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, 220 + Math.round(impact.controlLossMs * 0.28));
      this.bodyObject.body.setAcceleration(0, 0);
      this.bodyObject.body.setVelocity(direction.x * impact.displacement * 0.7, direction.y * impact.displacement * 0.7);
    } else {
      this.bodyObject.body.setVelocity(direction.x * impact.displacement * 0.32, direction.y * impact.displacement * 0.32);
    }

    this.bodyObject.setFillStyle(flash ? 0xe7b7aa : 0xc56557);
    this.scene.tweens.add({
      targets: [this.bodyObject, this.auraRing],
      scaleX: 0.92,
      scaleY: 1.08,
      duration: 74,
      yoyo: true
    });

    if (this.bodySprite) {
      this.bodySprite.setTint(flash ? 0xffe5dc : 0xffc0b6);
      this.scene.tweens.add({
        targets: this.bodySprite,
        scaleX: this.phaseSpriteBaseScale * 0.96,
        scaleY: this.phaseSpriteBaseScale * 1.04,
        duration: 74,
        yoyo: true
      });
    }

    this.scene.time.delayedCall(flash ? 96 : 72, () => {
      if (!this.bodyObject.scene || !this.alive) {
        return;
      }

      this.bodySprite?.clearTint();
      this.syncPresentation();
    });

    if (this.currentPhaseHp === 0) {
      if (this.currentPhaseIndex < this.phaseHp.length - 1) {
        this.enterNextPhase();
        return false;
      }

      this.die();
      return true;
    }

    return false;
  }

  private die(): void {
    this.isDestroyed = true;
    this.currentAttack = null;
    this.bodyObject.body.setAcceleration(0, 0);
    this.bodyObject.body.setVelocity(0, 0);
    this.bodyObject.body.enable = false;

    this.scene.tweens.add({
      targets: [this.bodyShadow, this.auraRing, this.bodyObject, this.ornamentPrimary, this.ornamentSecondary, this.weaponGuard, this.weaponBlade],
      alpha: 0.28,
      scaleX: 1.16,
      scaleY: 0.88,
      duration: 240
    });

    if (this.bodySprite) {
      this.scene.tweens.add({
        targets: this.bodySprite,
        alpha: 0.18,
        scaleX: this.phaseSpriteBaseScale * 1.08,
        scaleY: this.phaseSpriteBaseScale * 0.92,
        angle: this.bodySprite.angle + (this.definition.id === "skelecar" ? 8 : 3),
        duration: 240
      });
    }
  }
}
