import Phaser from "phaser";
import type {
  AttackExecutionSignal,
  AttackKind,
  AttackProfile,
  EnemyDefinition,
  EnemyHazardSignal,
  EnemyPattern,
  EnemySpecialId,
  HitImpactProfile
} from "../core/types";
import { ARENA, COLORS } from "../ui/theme";

type EnemyBody = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.Body;
};

interface EnemyConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  maxHp: number;
  speed: number;
  acceleration: number;
  tint: number;
  size: number;
  pattern: EnemyPattern;
  definition: EnemyDefinition;
  attackDamageBonus: number;
  aggression: number;
}

interface EnemyAttackState {
  signal: AttackExecutionSignal;
  phase: "windup" | "active" | "recovery";
  remaining: number;
}

export interface EnemyUpdateResult {
  activatedAttack?: AttackExecutionSignal;
  endedAttack?: AttackExecutionSignal;
  spawnedProjectiles?: AttackExecutionSignal[];
  spawnedHazards?: EnemyHazardSignal[];
  performedSpecial?: boolean;
  feedbackText?: string;
  feedbackColor?: number;
}

export interface EnemyCombatSnapshot {
  phase: "idle" | "windup" | "active" | "recovery";
  isStunned: boolean;
  slowRemaining: number;
}

export class PlaceholderEnemy {
  readonly bodyObject: EnemyBody;
  readonly bodyShadow: Phaser.GameObjects.Ellipse;
  readonly bodyDetail: Phaser.GameObjects.Shape;
  readonly bodyAccent: Phaser.GameObjects.Shape;
  readonly headDetail: Phaser.GameObjects.Shape;
  readonly weaponGuard: Phaser.GameObjects.Shape;
  readonly weaponBlade: Phaser.GameObjects.Shape;

  private readonly scene: Phaser.Scene;
  private readonly definition: EnemyDefinition;
  private readonly baseColor: number;
  private readonly gearColor: number;
  private readonly maxHp: number;
  private readonly speed: number;
  private readonly acceleration: number;
  private readonly pattern: EnemyPattern;
  private readonly size: number;
  private readonly aggression: number;
  private readonly lightAttack: AttackProfile;
  private readonly heavyAttack: AttackProfile;
  private readonly specialIds: Set<EnemySpecialId>;
  private readonly bodyScaleXBase: number;
  private readonly bodyScaleYBase: number;
  private readonly guardSize: number;
  private readonly bladeLength: number;
  private readonly bladeWidth: number;
  private readonly facing = new Phaser.Math.Vector2(-1, 0);

  private hp: number;
  private isDestroyed = false;
  private strafeDirection = 1;
  private strafeTimer = 700;
  private attackId = 0;
  private currentAttack: EnemyAttackState | null = null;
  private queuedAttacks: AttackKind[] = [];
  private attackCooldownRemaining = 540;
  private chainGapRemaining = 0;
  private stunRemaining = 0;
  private falterRemaining = 0;
  private hesitationRemaining = 0;
  private slowRemaining = 0;
  private slowFactor = 1;
  private bleedRemaining = 0;
  private bleedTickRemaining = 0;
  private bleedDamage = 0;
  private guardRemaining = 0;
  private fervorRemaining = 0;
  private kiteFrenzyCharge = 0;
  private specialCooldownRemaining = 2200;
  private frenzyActive = false;
  private weaponForwardOffset = 0;
  private weaponSideOffset = 0;
  private weaponRotationOffset = 0;
  private weaponLengthScale = 1;
  private weaponHeightScale = 1;
  private bodyTilt = 0;
  private presentationScale = 1;
  private collisionWidth = 0;
  private collisionHeight = 0;

  constructor(config: EnemyConfig) {
    const {
      scene,
      x,
      y,
      maxHp,
      speed,
      acceleration,
      tint,
      size,
      pattern,
      definition,
      attackDamageBonus,
      aggression
    } = config;

    this.scene = scene;
    this.definition = definition;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.speed = speed;
    this.acceleration = acceleration;
    this.baseColor = tint;
    this.gearColor = definition.gearColor;
    this.size = size;
    this.pattern = pattern;
    this.aggression = aggression;
    this.lightAttack = this.createEnemyAttackProfile(definition.lightAttack, attackDamageBonus, 0.96);
    this.heavyAttack = this.createEnemyAttackProfile(definition.heavyAttack, attackDamageBonus + 2, 1);
    this.specialIds = new Set(definition.specialIds ?? []);
    this.bodyScaleXBase = this.getBodyScaleForStyle("x");
    this.bodyScaleYBase = this.getBodyScaleForStyle("y");
    this.guardSize = Math.max(10, Math.round(Math.min(this.lightAttack.width, this.heavyAttack.width) * 0.26));
    this.bladeLength = this.getWeaponLength();
    this.bladeWidth = this.getWeaponWidth();
    const bodyDetails = this.createBodyDetails(x, y);
    const weaponShapes = this.createWeaponShapes(x, y);

    this.bodyShadow = bodyDetails.shadow;
    this.bodyObject = scene.add
      .rectangle(x, y, this.size, this.size, this.baseColor)
      .setStrokeStyle(2, COLORS.ghost, 0.32)
      .setDepth(5) as EnemyBody;
    this.bodyDetail = bodyDetails.detail;
    this.bodyAccent = bodyDetails.accent;
    this.headDetail = bodyDetails.head;
    this.weaponGuard = weaponShapes.guard;
    this.weaponBlade = weaponShapes.blade;

    scene.physics.add.existing(this.bodyObject);

    this.bodyObject.body.setAllowGravity(false);
    this.bodyObject.body.setDrag(1760, 1760);
    this.bodyObject.body.setMaxVelocity(this.speed, this.speed);
    this.bodyObject.body.setCollideWorldBounds(true);
    this.collisionWidth = Math.max(28, this.size - 10);
    this.collisionHeight = Math.max(28, this.size - 10);
    this.bodyObject.body.setSize(this.collisionWidth, this.collisionHeight, true);
    this.bodyObject.body.setBoundsRectangle(new Phaser.Geom.Rectangle(ARENA.x, ARENA.y, ARENA.width, ARENA.height));

    this.syncPresentation(false, null);
  }

  get health(): { current: number; max: number } {
    return {
      current: this.hp,
      max: this.maxHp
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
    this.syncPresentation(this.currentAttack !== null, this.currentAttack?.signal.kind ?? null, this.stunRemaining > 0);
  }

  get weaponName(): string {
    return this.definition.name;
  }

  getFacingVector(): Phaser.Math.Vector2 {
    return this.facing.clone();
  }

  getCombatSnapshot(): EnemyCombatSnapshot {
    return {
      phase: this.currentAttack?.phase ?? "idle",
      isStunned: this.stunRemaining > 0,
      slowRemaining: this.slowRemaining
    };
  }

  getTelegraphSignal(): AttackExecutionSignal | null {
    return this.currentAttack?.phase === "windup" ? this.currentAttack.signal : null;
  }

  update(
    targetX: number,
    targetY: number,
    targetState: { isAttacking: boolean; isDashing: boolean; isParrying: boolean },
    deltaMs: number
  ): EnemyUpdateResult {
    if (!this.alive) {
      return {};
    }

    const stunnedBeforeUpdate = this.stunRemaining > 0;
    const slowedBeforeUpdate = this.slowRemaining > 0;

    this.attackCooldownRemaining = Math.max(0, this.attackCooldownRemaining - deltaMs);
    this.chainGapRemaining = Math.max(0, this.chainGapRemaining - deltaMs);
    this.specialCooldownRemaining = Math.max(0, this.specialCooldownRemaining - deltaMs);
    this.stunRemaining = Math.max(0, this.stunRemaining - deltaMs);
    this.falterRemaining = Math.max(0, this.falterRemaining - deltaMs);
    this.hesitationRemaining = Math.max(0, this.hesitationRemaining - deltaMs);
    this.guardRemaining = Math.max(0, this.guardRemaining - deltaMs);
    this.fervorRemaining = Math.max(0, this.fervorRemaining - deltaMs);
    this.slowRemaining = Math.max(0, this.slowRemaining - deltaMs);
    this.bleedRemaining = Math.max(0, this.bleedRemaining - deltaMs);
    this.bleedTickRemaining = Math.max(0, this.bleedTickRemaining - deltaMs);
    this.strafeTimer -= deltaMs;

    if (this.bleedRemaining > 0 && this.bleedTickRemaining === 0) {
      this.bleedTickRemaining = 420;
      const bleedHit = Math.max(1, Math.round(this.bleedDamage));
      this.applyDamage(
        bleedHit,
        { x: 0, y: 0 },
        {
          displacement: 0,
          controlLossMs: 0,
          interruptChance: 0,
          hitstopMs: 0,
          cameraShake: 0
        },
        false,
        false
      );
    }

    if (!this.alive) {
      return {};
    }

    if (this.bleedRemaining === 0) {
      this.bleedDamage = 0;
    }

    if (stunnedBeforeUpdate && this.stunRemaining === 0) {
      this.bodyObject.setFillStyle(this.baseColor);
    }

    if (slowedBeforeUpdate && this.slowRemaining === 0) {
      this.slowFactor = 1;
      this.bodyObject.body.setMaxVelocity(this.speed * this.getMoveSpeedMultiplier(), this.speed * this.getMoveSpeedMultiplier());
    }

    if (this.stunRemaining > 0) {
      this.bodyObject.body.setAcceleration(0, 0);
      this.bodyObject.body.setMaxVelocity(
        this.speed * this.slowFactor * this.getMoveSpeedMultiplier(),
        this.speed * this.slowFactor * this.getMoveSpeedMultiplier()
      );
      this.syncPresentation(false, null, true);
      return {};
    }

    if (this.strafeTimer <= 0) {
      this.strafeDirection *= -1;
      this.strafeTimer = this.definition.visualStyle === "beast" ? 260 + Phaser.Math.Between(0, 180) : 420 + Phaser.Math.Between(0, 280);
    }

    const toTarget = new Phaser.Math.Vector2(targetX - this.x, targetY - this.y);
    const distance = Math.max(0.001, toTarget.length());
    const normalized = toTarget.scale(1 / distance);
    this.facing.copy(normalized);
    let frenzyFeedbackText: string | null = null;

    if (!this.frenzyActive && this.hasSpecial("packFrenzy")) {
      if (this.hp <= this.maxHp * 0.45) {
        this.triggerPackFrenzy();
        frenzyFeedbackText = "The beast gives in to frenzy.";
      } else if (this.definition.visualStyle === "beast" && distance > this.heavyAttack.range * 0.96) {
        this.kiteFrenzyCharge += deltaMs;

        if (this.kiteFrenzyCharge >= 1200) {
          this.triggerPackFrenzy();
          frenzyFeedbackText = "Ignoring it only makes the beast angrier.";
        }
      } else {
        this.kiteFrenzyCharge = Math.max(0, this.kiteFrenzyCharge - deltaMs * 0.8);
      }
    }

    const events = this.updateAttackTimers(deltaMs);
    this.updateMovement(distance, normalized, targetState);
    const mergedEvents: EnemyUpdateResult = {
      ...events
    };

    if (frenzyFeedbackText) {
      mergedEvents.feedbackText = frenzyFeedbackText;
      mergedEvents.feedbackColor = 0xe0ae98;
    }

    if (!this.currentAttack) {
      const specialEvents = this.tryUseSpecial(distance, normalized, targetX, targetY, targetState);

      if (specialEvents.spawnedHazards?.length) {
        mergedEvents.spawnedHazards = [...(mergedEvents.spawnedHazards ?? []), ...specialEvents.spawnedHazards];
      }

      if (specialEvents.spawnedProjectiles?.length) {
        mergedEvents.spawnedProjectiles = [...(mergedEvents.spawnedProjectiles ?? []), ...specialEvents.spawnedProjectiles];
      }

      const usedSpecial =
        Boolean(specialEvents.performedSpecial) ||
        (specialEvents.spawnedHazards?.length ?? 0) > 0 ||
        (specialEvents.spawnedProjectiles?.length ?? 0) > 0;

      if (!usedSpecial) {
        if (
          this.queuedAttacks.length > 0 &&
          this.chainGapRemaining <= 0 &&
          this.hesitationRemaining <= 0 &&
          distance <= this.getPreferredAttackRange(this.queuedAttacks[0]) * 1.04
        ) {
          this.startAttack(this.queuedAttacks.shift() ?? "light");
        } else if (this.attackCooldownRemaining <= 0 && this.hesitationRemaining <= 0 && this.shouldAttack(distance, targetState)) {
          this.prepareAttackSequence(distance, targetState);
          this.startAttack(this.queuedAttacks.shift() ?? "light");
        }
      }
    }

    this.syncPresentation(this.currentAttack !== null, this.currentAttack?.signal.kind ?? null);
    return mergedEvents;
  }

  takeDamage(amount: number, direction: { x: number; y: number }, impact: HitImpactProfile): boolean {
    return this.applyDamage(amount, direction, impact, true, true);
  }

  applySlow(durationMs: number, factor: number): void {
    if (!this.alive || durationMs <= 0) {
      return;
    }

    this.slowRemaining = Math.max(this.slowRemaining, durationMs);
    this.slowFactor = Math.min(this.slowFactor, Phaser.Math.Clamp(factor, 0.35, 1));
    this.bodyObject.body.setMaxVelocity(this.speed * this.slowFactor, this.speed * this.slowFactor);
    this.syncPresentation(this.currentAttack !== null, this.currentAttack?.signal.kind ?? null, this.stunRemaining > 0);
  }

  applyBleed(totalDamage: number, durationMs: number): void {
    if (!this.alive || totalDamage <= 0 || durationMs <= 0) {
      return;
    }

    this.bleedRemaining = Math.max(this.bleedRemaining, durationMs);
    this.bleedTickRemaining = Math.min(this.bleedTickRemaining || 420, 420);
    this.bleedDamage += totalDamage / Math.max(1, Math.round(durationMs / 420));
    this.syncPresentation(this.currentAttack !== null, this.currentAttack?.signal.kind ?? null, this.stunRemaining > 0);
  }

  stun(durationMs: number): void {
    if (!this.alive) {
      return;
    }

    this.stunRemaining = Math.max(this.stunRemaining, durationMs);
    this.currentAttack = null;
    this.queuedAttacks = [];
    this.chainGapRemaining = 0;
    this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, durationMs + 180);
    this.bodyObject.body.setAcceleration(0, 0);
    this.bodyObject.setFillStyle(0xe0cb97);
    this.scene.tweens.add({
      targets: this.bodyObject,
      alpha: 0.7,
      duration: 72,
      yoyo: true,
      repeat: 1
    });
    this.syncPresentation(false, null, true);
  }

  private createEnemyAttackProfile(base: AttackProfile, damageBonus: number, speedScale: number): AttackProfile {
    return {
      ...base,
      damage: Math.round(base.damage * 0.74 + damageBonus),
      range: Math.round(base.range * (base.delivery === "ranged" ? 1 : 0.96)),
      width: Math.round(base.width * (base.delivery === "ranged" ? 0.9 : 0.94)),
      windup: Math.max(base.delivery === "ranged" ? 84 : 50, Math.round(base.windup * speedScale)),
      active: Math.max(76, Math.round(base.active * 0.94)),
      recovery: Math.max(96, Math.round(base.recovery * 0.96)),
      lunge: Math.round(base.lunge * (base.delivery === "ranged" ? 0 : 0.76)),
      staminaCost: base.staminaCost,
      commitWeight: Math.min(1, Number((base.commitWeight * 1.02).toFixed(2))),
      drift: base.drift,
      impact: {
        displacement: Math.round(base.impact.displacement * 0.72 + damageBonus * 8),
        controlLossMs: Math.round(base.impact.controlLossMs * 0.8 + damageBonus * 7),
        interruptChance: Math.min(0.9, base.impact.interruptChance * 0.92 + damageBonus * 0.003),
        hitstopMs: base.impact.hitstopMs,
        cameraShake: base.impact.cameraShake
      }
    };
  }

  private createBodyDetails(x: number, y: number): {
    shadow: Phaser.GameObjects.Ellipse;
    detail: Phaser.GameObjects.Shape;
    accent: Phaser.GameObjects.Shape;
    head: Phaser.GameObjects.Shape;
  } {
    const shadow = this.scene.add
      .ellipse(x, y + this.size * 0.42, this.size * 0.92, Math.max(12, this.size * 0.28), 0x060a10, 0.28)
      .setDepth(4);

    switch (this.definition.visualStyle) {
      case "beast": {
        const detail = this.scene.add.ellipse(x - 2, y + 2, this.size * 0.62, this.size * 0.34, this.gearColor, 0.18).setDepth(5.5);
        const accent = this.scene.add
          .triangle(
            x + this.size * 0.08,
            y - this.size * 0.08,
            -this.size * 0.08,
            this.size * 0.08,
            this.size * 0.18,
            0,
            -this.size * 0.08,
            -this.size * 0.08,
            this.gearColor,
            0.24
          )
          .setDepth(5.55);
        const head = this.scene.add.ellipse(x + this.size * 0.22, y - this.size * 0.08, this.size * 0.34, this.size * 0.24, this.gearColor, 0.32).setDepth(5.6);
        return { shadow, detail, accent, head };
      }
      case "archer": {
        const detail = this.scene.add.rectangle(x, y + 2, this.size * 0.38, this.size * 0.62, this.gearColor, 0.18).setDepth(5.5);
        const accent = this.scene.add
          .rectangle(x + this.size * 0.16, y + this.size * 0.04, this.size * 0.16, this.size * 0.44, this.gearColor, 0.24)
          .setAngle(18)
          .setDepth(5.55);
        const head = this.scene.add.circle(x, y - this.size * 0.18, this.size * 0.14, this.gearColor, 0.26).setDepth(5.6);
        return { shadow, detail, accent, head };
      }
      case "caster": {
        const detail = this.scene.add.ellipse(x, y + 3, this.size * 0.48, this.size * 0.66, this.gearColor, 0.2).setDepth(5.5);
        const accent = this.scene.add.ellipse(x, y + this.size * 0.06, this.size * 0.28, this.size * 0.42, 0xe8efe3, 0.16).setDepth(5.55);
        const head = this.scene.add.circle(x, y - this.size * 0.2, this.size * 0.13, 0xe8efe3, 0.3).setDepth(5.6);
        return { shadow, detail, accent, head };
      }
      case "brute": {
        const detail = this.scene.add.rectangle(x, y + 4, this.size * 0.54, this.size * 0.54, this.gearColor, 0.18).setDepth(5.5);
        const accent = this.scene.add
          .rectangle(x + this.size * 0.1, y - this.size * 0.02, this.size * 0.24, this.size * 0.24, this.gearColor, 0.24)
          .setAngle(-12)
          .setDepth(5.55);
        const head = this.scene.add.rectangle(x, y - this.size * 0.16, this.size * 0.24, this.size * 0.2, this.gearColor, 0.28).setDepth(5.6);
        return { shadow, detail, accent, head };
      }
      case "polearm": {
        const detail = this.scene.add.rectangle(x, y + 2, this.size * 0.34, this.size * 0.64, this.gearColor, 0.18).setDepth(5.5);
        const accent = this.scene.add
          .rectangle(x - this.size * 0.08, y + this.size * 0.04, this.size * 0.16, this.size * 0.48, this.gearColor, 0.22)
          .setAngle(-10)
          .setDepth(5.55);
        const head = this.scene.add.circle(x, y - this.size * 0.2, this.size * 0.12, this.gearColor, 0.26).setDepth(5.6);
        return { shadow, detail, accent, head };
      }
      default: {
        const detail = this.scene.add.rectangle(x, y + 2, this.size * 0.42, this.size * 0.56, this.gearColor, 0.18).setDepth(5.5);
        const accent = this.scene.add
          .rectangle(x, y + this.size * 0.06, this.size * 0.18, this.size * 0.42, this.gearColor, 0.22)
          .setAngle(8)
          .setDepth(5.55);
        const head = this.scene.add.circle(x, y - this.size * 0.18, this.size * 0.13, this.gearColor, 0.28).setDepth(5.6);
        return { shadow, detail, accent, head };
      }
    }
  }

  private getBodyScaleForStyle(axis: "x" | "y"): number {
    switch (this.definition.visualStyle) {
      case "beast":
        return axis === "x" ? 1.12 : 0.84;
      case "archer":
        return axis === "x" ? 0.88 : 1.02;
      case "caster":
        return axis === "x" ? 0.9 : 1.08;
      case "brute":
        return axis === "x" ? 1.18 : 1.12;
      case "polearm":
        return axis === "x" ? 0.94 : 1.08;
      default:
        return 1;
    }
  }

  private getWeaponLength(): number {
    if (this.definition.visualStyle === "beast") {
      return Math.max(26, Math.round(this.heavyAttack.range * 0.12));
    }

    if (this.definition.visualStyle === "caster") {
      return Math.max(34, Math.round(this.heavyAttack.range * 0.16));
    }

    return Phaser.Math.Clamp(Math.round(this.heavyAttack.range * 0.18), 34, 96);
  }

  private getWeaponWidth(): number {
    if (this.definition.visualStyle === "archer") {
      return 8;
    }

    if (this.definition.visualStyle === "polearm") {
      return 7;
    }

    if (this.definition.visualStyle === "beast") {
      return 10;
    }

    return Phaser.Math.Clamp(Math.round(this.heavyAttack.width * 0.16), 8, 16);
  }

  private createWeaponShapes(x: number, y: number): {
    guard: Phaser.GameObjects.Shape;
    blade: Phaser.GameObjects.Shape;
  } {
    switch (this.definition.visualStyle) {
      case "beast": {
        const guard = this.scene.add.circle(x - 10, y, Math.max(5, this.bladeWidth * 0.55), 0xb69475, 0.86).setDepth(6);
        const blade = this.scene.add
          .triangle(
            x - 18,
            y,
            0,
            Math.max(4, this.bladeWidth * 0.42),
            this.bladeLength,
            0,
            0,
            -Math.max(4, this.bladeWidth * 0.42),
            0xf3ead8,
            0.96
          )
          .setOrigin(0.1, 0.5)
          .setDepth(7);
        return { guard, blade };
      }
      case "archer": {
        const guard = this.scene.add.rectangle(x - 10, y, 8, 14, this.gearColor, 0.9).setOrigin(0.8, 0.5).setDepth(6);
        const blade = this.scene.add
          .ellipse(x - 18, y, this.bladeLength * 0.78, this.bladeWidth + 12, COLORS.ghost, 0.9)
          .setStrokeStyle(1, 0x1c1f24, 0.24)
          .setOrigin(1, 0.5)
          .setDepth(7);
        return { guard, blade };
      }
      case "caster": {
        const guard = this.scene.add.circle(x - 10, y, 6, this.gearColor, 0.92).setOrigin(0.8, 0.5).setDepth(6);
        const blade = this.scene.add
          .rectangle(x - 18, y, this.bladeLength, Math.max(5, this.bladeWidth - 2), COLORS.ghost, 0.93)
          .setStrokeStyle(1, 0x1c1f24, 0.22)
          .setOrigin(1, 0.5)
          .setDepth(7);
        return { guard, blade };
      }
      case "polearm": {
        const guard = this.scene.add.rectangle(x - 10, y, 10, 5, this.gearColor, 0.92).setOrigin(0.82, 0.5).setDepth(6);
        const blade = this.scene.add
          .triangle(
            x - 18,
            y,
            0,
            Math.max(4, this.bladeWidth * 0.54),
            this.bladeLength + 16,
            0,
            0,
            -Math.max(4, this.bladeWidth * 0.54),
            COLORS.ghost,
            0.95
          )
          .setStrokeStyle(1, 0x1c1f24, 0.24)
          .setOrigin(0.1, 0.5)
          .setDepth(7);
        return { guard, blade };
      }
      case "brute": {
        const guard = this.scene.add.rectangle(x - 10, y, this.guardSize + 6, 8, this.gearColor, 0.94).setOrigin(0.82, 0.5).setDepth(6);
        const blade = this.scene.add
          .rectangle(x - 18, y, Math.max(28, this.bladeLength * 0.78), this.bladeWidth + 6, COLORS.ghost, 0.94)
          .setStrokeStyle(1, 0x1c1f24, 0.24)
          .setOrigin(1, 0.5)
          .setDepth(7);
        return { guard, blade };
      }
      default: {
        const guard = this.scene.add.rectangle(x - 12, y, this.guardSize, 6, this.gearColor, 0.92).setOrigin(0.82, 0.5).setDepth(6);
        const blade = this.scene.add
          .triangle(
            x - 18,
            y,
            0,
            Math.max(4, this.bladeWidth * 0.52),
            this.bladeLength,
            0,
            0,
            -Math.max(4, this.bladeWidth * 0.52),
            COLORS.ghost,
            0.95
          )
          .setStrokeStyle(1, 0x1c1f24, 0.22)
          .setOrigin(0.1, 0.5)
          .setDepth(7);
        return { guard, blade };
      }
    }
  }

  private getAccentPose(): {
    forward: number;
    side: number;
    rotationScale: number;
    scaleX: number;
    scaleY: number;
    alpha: number;
  } {
    switch (this.definition.visualStyle) {
      case "beast":
        return { forward: this.size * 0.08, side: this.size * 0.18, rotationScale: 0.34, scaleX: 1.04, scaleY: 0.94, alpha: 0.28 };
      case "archer":
        return { forward: this.size * 0.02, side: -this.size * 0.16, rotationScale: 0.08, scaleX: 1, scaleY: 1.02, alpha: 0.28 };
      case "caster":
        return { forward: this.size * 0.02, side: 0, rotationScale: 0.06, scaleX: 1.02, scaleY: 1.08, alpha: 0.24 };
      case "brute":
        return { forward: this.size * 0.08, side: this.size * 0.12, rotationScale: 0.14, scaleX: 1.08, scaleY: 1, alpha: 0.28 };
      case "polearm":
        return { forward: this.size * 0.04, side: -this.size * 0.12, rotationScale: 0.12, scaleX: 1, scaleY: 1.04, alpha: 0.24 };
      default:
        return { forward: this.size * 0.04, side: 0, rotationScale: 0.1, scaleX: 1, scaleY: 1.04, alpha: 0.26 };
    }
  }

  private updateAttackTimers(deltaMs: number): EnemyUpdateResult {
    if (!this.currentAttack) {
      return {};
    }

    this.currentAttack.remaining -= deltaMs;

    if (this.currentAttack.remaining > 0) {
      return {};
    }

    if (this.currentAttack.phase === "windup") {
      this.currentAttack.phase = "active";
      this.currentAttack.remaining = Math.max(64, Math.round(this.currentAttack.signal.profile.active * this.getAttackTempoScale()));

      if (this.currentAttack.signal.profile.delivery !== "ranged") {
        this.bodyObject.body.setVelocity(
          this.currentAttack.signal.direction.x * this.currentAttack.signal.profile.lunge,
          this.currentAttack.signal.direction.y * this.currentAttack.signal.profile.lunge
        );
      }

      const result: EnemyUpdateResult = {
        activatedAttack: this.currentAttack.signal
      };

      const burstProjectiles = this.tryCreateBurstProjectiles(this.currentAttack.signal);

      if (burstProjectiles.length > 0) {
        result.spawnedProjectiles = burstProjectiles;
      }

      return result;
    }

    if (this.currentAttack.phase === "active") {
      this.currentAttack.phase = "recovery";
      this.currentAttack.remaining = Math.max(84, Math.round(this.currentAttack.signal.profile.recovery * this.getAttackTempoScale()));

      return {
        endedAttack: this.currentAttack.signal
      };
    }

    this.currentAttack = null;
    this.chainGapRemaining = 122;

    if (this.queuedAttacks.length === 0) {
      this.attackCooldownRemaining = Math.max(
        180,
        Math.round(
          ((this.definition.visualStyle === "beast" ? 620 : 700) -
            this.getAggressionValue() * (this.definition.visualStyle === "beast" ? 140 : 120)) *
            this.getAttackCooldownScale()
        )
      );
    }

    return {};
  }

  private updateMovement(
    distance: number,
    normalized: Phaser.Math.Vector2,
    targetState: { isAttacking: boolean; isDashing: boolean; isParrying: boolean }
  ): void {
    if (this.currentAttack?.phase === "active") {
      this.bodyObject.body.setAcceleration(0, 0);
      return;
    }

    if (this.falterRemaining > 0) {
      this.bodyObject.body.setAcceleration(0, 0);
      this.bodyObject.body.setVelocity(this.bodyObject.body.velocity.x * 0.9, this.bodyObject.body.velocity.y * 0.9);
      this.syncPresentation(this.currentAttack !== null, this.currentAttack?.signal.kind ?? null);
      return;
    }

    const desired = new Phaser.Math.Vector2();
    const preferredRange = this.getPreferredSpacing();
    const orbit = new Phaser.Math.Vector2(-normalized.y * this.strafeDirection, normalized.x * this.strafeDirection);
    const rangedThreat = this.heavyAttack.delivery === "ranged" || this.lightAttack.delivery === "ranged";
    const beast = this.definition.visualStyle === "beast";
    const guardian = this.definition.visualStyle === "guardian";
    const raider = this.definition.visualStyle === "raider";
    const polearm = this.definition.visualStyle === "polearm";
    const caster = this.definition.visualStyle === "caster";
    const brute = this.definition.visualStyle === "brute";

    if (beast) {
      if (targetState.isParrying && distance > this.lightAttack.range * 0.64) {
        desired.copy(normalized).scale(0.96);
        desired.add(orbit.clone().scale(0.18));
      } else if (distance > preferredRange + 18) {
        desired.copy(normalized).scale(1.02);
        desired.add(orbit.clone().scale(0.14));
      } else if (distance < preferredRange - 28) {
        desired.copy(orbit).scale(0.46);
        desired.add(normalized.clone().negate().scale(0.16));
      } else {
        desired.copy(normalized).scale(0.78);
        desired.add(orbit.clone().scale(0.26));
      }
    } else if (guardian) {
      if (distance > preferredRange + 36) {
        desired.copy(normalized).scale(0.74);
        desired.add(orbit.clone().scale(0.08));
      } else if (targetState.isAttacking && distance < preferredRange + 18) {
        desired.copy(normalized).negate().scale(0.54);
        desired.add(orbit.clone().scale(0.18));
      } else {
        desired.copy(orbit).scale(0.26);
        desired.add(normalized.clone().scale(0.16));
      }
    } else if (polearm) {
      if (distance < preferredRange - 28) {
        desired.copy(normalized).negate().scale(0.96);
        desired.add(orbit.clone().scale(0.32));
      } else if (distance > preferredRange + 52) {
        desired.copy(normalized).scale(0.84);
        desired.add(orbit.clone().scale(0.12));
      } else {
        desired.copy(orbit).scale(0.82);
        desired.add(normalized.clone().scale(-0.08));
      }
    } else if (caster) {
      if (distance < preferredRange - 32 || targetState.isAttacking) {
        desired.copy(normalized).negate().scale(1.02);
        desired.add(orbit.clone().scale(0.36));
      } else {
        desired.copy(orbit).scale(0.92);
        desired.add(normalized.clone().scale(-0.12));
      }
    } else if (raider) {
      if (distance > preferredRange + 22) {
        desired.copy(normalized).scale(0.92);
        desired.add(orbit.clone().scale(0.22));
      } else if (distance < preferredRange - 18 || targetState.isAttacking) {
        desired.copy(normalized).negate().scale(0.82);
        desired.add(orbit.clone().scale(0.44));
      } else {
        desired.copy(orbit).scale(1.02);
      }
    } else if (brute) {
      if (distance > preferredRange + 28) {
        desired.copy(normalized).scale(1.02);
      } else if (distance < preferredRange - 20) {
        desired.copy(normalized).negate().scale(0.22);
        desired.add(orbit.clone().scale(0.16));
      } else {
        desired.copy(normalized).scale(0.42);
        desired.add(orbit.clone().scale(0.12));
      }
    } else if (targetState.isParrying && distance < preferredRange + 24) {
      desired.copy(normalized).negate().scale(rangedThreat ? 0.9 : 0.72);
      desired.add(orbit.clone().scale(rangedThreat ? 0.28 : 0.34));
    } else if (targetState.isAttacking && distance < preferredRange + 48 && this.pattern !== "crusher") {
      desired.copy(normalized).negate().scale(rangedThreat ? 1 : 0.94);
      desired.add(orbit.clone().scale(0.42));
    } else if (distance > preferredRange + (rangedThreat ? 28 : 40)) {
      desired.copy(normalized).scale(this.pattern === "crusher" ? 0.96 : rangedThreat ? 0.68 : 0.78);
      desired.add(orbit.clone().scale(rangedThreat ? 0.1 : 0.04));
    } else if (distance < preferredRange - (rangedThreat ? 46 : 14)) {
      desired.copy(normalized).negate().scale(rangedThreat ? 1 : this.pattern === "crusher" ? 0.3 : 0.76);
      desired.add(orbit.clone().scale(rangedThreat ? 0.36 : 0.26));
    } else {
      desired.copy(orbit).scale(this.pattern === "orbiter" || rangedThreat ? 0.9 : 0.58);
      desired.add(normalized.clone().scale(this.pattern === "crusher" ? 0.22 : rangedThreat ? -0.06 : 0.05));
    }

    if (targetState.isDashing && !rangedThreat && !beast) {
      desired.add(normalized.clone().negate().scale(0.24));
    }

    if (desired.lengthSq() > 1) {
      desired.normalize();
    }

    const controlFactor = this.currentAttack?.phase === "windup" ? 0.26 : 1;
    const slowControl = this.slowFactor;
    const frenzySpeed = this.getMoveSpeedMultiplier();

    this.bodyObject.body.setMaxVelocity(this.speed * slowControl * frenzySpeed, this.speed * slowControl * frenzySpeed);
    this.bodyObject.body.setAcceleration(
      desired.x * this.acceleration * controlFactor * slowControl * frenzySpeed,
      desired.y * this.acceleration * controlFactor * slowControl * frenzySpeed
    );
  }

  private shouldAttack(distance: number, targetState: { isAttacking: boolean; isDashing: boolean; isParrying: boolean }): boolean {
    const beast = this.definition.visualStyle === "beast";
    const guardian = this.definition.visualStyle === "guardian";
    const polearm = this.definition.visualStyle === "polearm";
    const caster = this.definition.visualStyle === "caster";
    const brute = this.definition.visualStyle === "brute";

    if (this.falterRemaining > 0 || this.hesitationRemaining > 0) {
      return false;
    }

    if (beast) {
      if (targetState.isDashing && distance > this.heavyAttack.range * 0.76) {
        return false;
      }

      if (targetState.isParrying && distance > this.lightAttack.range * 0.74) {
        return false;
      }

      return distance <= this.heavyAttack.range * 0.98;
    }

    if (guardian) {
      if (targetState.isDashing && distance > this.lightAttack.range * 0.5) {
        return false;
      }

      return distance <= this.heavyAttack.range * 0.82;
    }

    if (polearm) {
      if (distance < this.lightAttack.range * 0.4) {
        return false;
      }

      return distance <= this.heavyAttack.range * 0.94;
    }

    if (this.heavyAttack.delivery === "ranged") {
      if (targetState.isParrying && distance > this.lightAttack.range * 0.52) {
        return false;
      }

      if (caster && targetState.isAttacking && distance < this.heavyAttack.range * 0.7) {
        return false;
      }

      return distance >= this.lightAttack.range * 0.42 && distance <= this.heavyAttack.range * 0.96;
    }

    if (brute && distance <= this.heavyAttack.range * 0.9) {
      return true;
    }

    if (targetState.isParrying && distance > this.lightAttack.range * 0.46) {
      return false;
    }

    if (targetState.isDashing && distance > this.lightAttack.range * 0.54 && this.pattern !== "crusher") {
      return false;
    }

    return distance <= this.heavyAttack.range * 0.86;
  }

  private prepareAttackSequence(
    distance: number,
    targetState: { isAttacking: boolean; isDashing: boolean; isParrying: boolean }
  ): void {
    const close = distance <= this.lightAttack.range * 0.68;
    const sequence: AttackKind[] = [];
    const rangedHeavy = this.heavyAttack.delivery === "ranged";
    const meleeLight = this.lightAttack.delivery !== "ranged";
    const beast = this.definition.visualStyle === "beast";
    const guardian = this.definition.visualStyle === "guardian";
    const polearm = this.definition.visualStyle === "polearm";
    const raider = this.definition.visualStyle === "raider";
    const brute = this.definition.visualStyle === "brute";
    const aggression = this.getAggressionValue();

    if (!beast && Math.random() < 0.26) {
      this.hesitationRemaining = 100 + Phaser.Math.Between(0, 90);
    }

    if (beast) {
      sequence.push(close ? "light" : "heavy");

      if (!targetState.isParrying || close) {
        sequence.push(close ? "heavy" : "light");
      }

      if (close && Math.random() < 0.4) {
        sequence.push("light");
      }
    } else if (guardian) {
      sequence.push(targetState.isAttacking || !close ? "heavy" : "light");
      if (close) {
        sequence.push("heavy");
      }
    } else if (polearm) {
      sequence.push(close ? "light" : "heavy");
      if (!close || Math.random() < 0.4) {
        sequence.push("heavy");
      }
    } else if (raider) {
      sequence.push("light");
      sequence.push(close ? "light" : "heavy");
      if (!targetState.isParrying && Math.random() < 0.5) {
        sequence.push("heavy");
      }
    } else if (brute) {
      sequence.push(close ? "heavy" : "light");
      sequence.push("heavy");
    } else if (rangedHeavy && !close) {
      sequence.push("heavy");
      if (meleeLight && Math.random() < 0.35) {
        sequence.push("light");
      }
    } else if (this.heavyAttack.attackClass === "cleave") {
      sequence.push(close ? "light" : "heavy");
      if (close || this.pattern === "crusher") {
        sequence.push("heavy");
      }
    } else if (this.heavyAttack.attackClass === "lunge" || this.heavyAttack.shape === "thrust") {
      sequence.push(close ? "light" : "heavy");
      if (!targetState.isParrying && Math.random() < 0.52) {
        sequence.push("light");
      }
    } else {
      sequence.push("light");
      sequence.push(close ? "heavy" : "light");
    }

    if (this.pattern === "crusher" && close && Math.random() < 0.5) {
      sequence.push("heavy");
    }

    if (this.pattern === "orbiter" && !close && Math.random() < 0.44) {
      sequence[sequence.length - 1] = "heavy";
    }

    if (!beast && sequence.length > 1 && Math.random() < Phaser.Math.Clamp(0.42 - aggression * 0.12, 0.16, 0.34)) {
      sequence.length = 1;
    }

    this.queuedAttacks = sequence;
  }

  private startAttack(kind: AttackKind): void {
    const profile = { ...(kind === "light" ? this.lightAttack : this.heavyAttack) };
    const baseRange = kind === "light" ? this.definition.lightAttack.range : this.definition.heavyAttack.range;
    const direction = this.facing.clone().normalize();

    this.currentAttack = {
      signal: {
        id: ++this.attackId,
        kind,
        profile,
        rangeAnchor: baseRange,
        fullyCharged: kind === "heavy" && profile.windup >= 136,
        direction: {
          x: direction.x,
          y: direction.y
        },
        angle: direction.angle()
      },
      phase: "windup",
      remaining: Math.max(48, Math.round(profile.windup * this.getAttackTempoScale()))
    };
    this.bodyObject.body.setAcceleration(
      direction.x * this.acceleration * (profile.delivery === "ranged" ? 0.06 : 0.18),
      direction.y * this.acceleration * (profile.delivery === "ranged" ? 0.06 : 0.18)
    );
  }

  private getPreferredSpacing(): number {
    if (this.definition.visualStyle === "guardian") {
      return this.heavyAttack.range * 0.66;
    }

    if (this.definition.visualStyle === "polearm") {
      return this.heavyAttack.range * 0.8;
    }

    if (this.definition.visualStyle === "raider") {
      return this.lightAttack.range * 0.72;
    }

    if (this.heavyAttack.delivery === "ranged") {
      return this.heavyAttack.range * 0.82;
    }

    if (this.heavyAttack.attackClass === "cleave") {
      return this.heavyAttack.range * 0.58;
    }

    if (this.heavyAttack.attackClass === "lunge" || this.heavyAttack.shape === "thrust") {
      return this.heavyAttack.range * 0.72;
    }

    return this.lightAttack.range * 0.64;
  }

  private getPreferredAttackRange(kind: AttackKind): number {
    return kind === "light" ? this.lightAttack.range : this.heavyAttack.range;
  }

  private hasSpecial(specialId: EnemySpecialId): boolean {
    return this.specialIds.has(specialId);
  }

  private getAggressionValue(): number {
    const value = this.frenzyActive ? this.aggression + 0.16 : this.fervorRemaining > 0 ? this.aggression + 0.08 : this.aggression;
    return Math.min(1, value);
  }

  private getMoveSpeedMultiplier(): number {
    return this.frenzyActive ? 1.18 : this.fervorRemaining > 0 ? 1.08 : 1;
  }

  private getAttackCooldownScale(): number {
    return this.frenzyActive ? 0.8 : this.fervorRemaining > 0 ? 0.88 : 1;
  }

  private getAttackTempoScale(): number {
    return this.frenzyActive ? 0.84 : this.fervorRemaining > 0 ? 0.9 : 1;
  }

  private triggerPackFrenzy(): void {
    this.frenzyActive = true;
    this.hesitationRemaining = 0;
    this.falterRemaining = 0;
    this.attackCooldownRemaining = Math.round(this.attackCooldownRemaining * 0.6);
    this.scene.tweens.add({
      targets: [this.bodyObject, this.headDetail, this.bodyDetail, this.bodyAccent],
      alpha: 0.78,
      duration: 90,
      yoyo: true,
      repeat: 1
    });
  }

  private tryUseSpecial(
    distance: number,
    normalized: Phaser.Math.Vector2,
    targetX: number,
    targetY: number,
    targetState: { isAttacking: boolean; isDashing: boolean; isParrying: boolean }
  ): EnemyUpdateResult {
    if (this.specialCooldownRemaining > 0 || this.currentAttack || this.hesitationRemaining > 0 || this.falterRemaining > 0) {
      return {};
    }

    if (this.hasSpecial("guardedShot") && this.heavyAttack.delivery === "ranged" && distance >= 116 && distance <= 244 && !targetState.isDashing) {
      this.specialCooldownRemaining = 3900;
      this.attackCooldownRemaining = 120;
      this.guardRemaining = 720;
      this.hesitationRemaining = 90;
      this.queuedAttacks = ["heavy"];
      this.bodyObject.body.setVelocity(0, 0);
      this.scene.tweens.add({
        targets: [this.bodyObject, this.weaponGuard, this.bodyAccent],
        alpha: 0.88,
        duration: 96,
        yoyo: true
      });
      return {
        performedSpecial: true,
        feedbackText: "A guarded shot takes shape.",
        feedbackColor: COLORS.gold
      };
    }

    if (this.hasSpecial("hexFervor") && distance >= 104 && distance <= 236) {
      this.specialCooldownRemaining = 4200;
      this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, 180);
      this.hesitationRemaining = 90;
      this.fervorRemaining = 2400;
      this.scene.tweens.add({
        targets: [this.bodyDetail, this.bodyAccent, this.headDetail],
        alpha: 0.9,
        duration: 90,
        yoyo: true,
        repeat: 1
      });
      return {
        performedSpecial: true,
        feedbackText: "A hex quickens the next exchange.",
        feedbackColor: 0xb8e08c
      };
    }

    if (this.hasSpecial("trapper") && !targetState.isDashing && distance >= 92 && distance <= 228) {
      const orbit = new Phaser.Math.Vector2(-normalized.y, normalized.x).scale(Phaser.Math.Between(-20, 20));
      const offset = Phaser.Math.Clamp(distance * 0.56, 68, 124);
      this.specialCooldownRemaining = 3800;
      this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, 340);
      this.hesitationRemaining = 120;
      return {
        spawnedHazards: [
          {
            kind: "bearTrap",
            x: this.x + normalized.x * offset + orbit.x,
            y: this.y + normalized.y * offset + orbit.y,
            radius: 22,
            armDelayMs: 520,
            durationMs: 4200,
            damage: 7,
            controlLockMs: 420,
            tint: 0xc7b388,
            triggerText: "Caught in a bear trap"
          }
        ]
      };
    }

    if (this.hasSpecial("snarePatch") && distance >= 112 && distance <= 248) {
      const orbit = new Phaser.Math.Vector2(-normalized.y, normalized.x).scale(Phaser.Math.Between(-18, 18));
      this.specialCooldownRemaining = 4200;
      this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, 300);
      this.hesitationRemaining = 100;
      return {
        spawnedHazards: [
          {
            kind: "snarePatch",
            x: targetX + orbit.x,
            y: targetY + orbit.y,
            radius: 28,
            armDelayMs: 420,
            durationMs: 3600,
            damage: 4,
            controlLockMs: 260,
            tint: 0xb8e08c,
            triggerText: "Snared by roots"
          }
        ]
      };
    }

    if (this.hasSpecial("sidestepBurst") && distance >= 100 && distance <= 236) {
      let lateral = new Phaser.Math.Vector2(-normalized.y, normalized.x).scale(this.strafeDirection || 1);
      const projectedX = this.x + lateral.x * 68;
      const projectedY = this.y + lateral.y * 68;

      if (!new Phaser.Geom.Rectangle(ARENA.x + 28, ARENA.y + 28, ARENA.width - 56, ARENA.height - 56).contains(projectedX, projectedY)) {
        lateral = lateral.scale(-1);
      }

      const burstSpeed = this.definition.visualStyle === "beast" ? 286 : 246;
      this.specialCooldownRemaining = 2900;
      this.attackCooldownRemaining = Math.max(this.attackCooldownRemaining, 220);
      this.hesitationRemaining = 130;
      this.strafeDirection *= -1;
      this.bodyObject.body.setVelocity(lateral.x * burstSpeed + normalized.x * 54, lateral.y * burstSpeed + normalized.y * 54);
      this.scene.tweens.add({
        targets: [this.bodyAccent, this.weaponGuard],
        alpha: 0.9,
        duration: 80,
        yoyo: true
      });
      return {
        performedSpecial: true
      };
    }

    if (this.hasSpecial("rushdown") && distance >= 124 && distance <= 284 && !targetState.isParrying) {
      const burstSpeed = this.definition.visualStyle === "brute" ? 312 : this.definition.visualStyle === "polearm" ? 292 : 268;

      this.specialCooldownRemaining = 3600;
      this.attackCooldownRemaining = 120;
      this.hesitationRemaining = 110;
      this.chainGapRemaining = 0;
      this.queuedAttacks = [distance >= this.lightAttack.range * 0.92 ? "heavy" : "light"];
      this.bodyObject.body.setVelocity(normalized.x * burstSpeed, normalized.y * burstSpeed);
      this.scene.tweens.add({
        targets: [this.bodyObject, this.bodyAccent, this.weaponBlade],
        alpha: 0.84,
        duration: 90,
        yoyo: true
      });
      return {
        performedSpecial: true
      };
    }

    return {};
  }

  private tryCreateBurstProjectiles(signal: AttackExecutionSignal): AttackExecutionSignal[] {
    if (!this.hasSpecial("burstShot") || this.specialCooldownRemaining > 0 || signal.profile.delivery !== "ranged" || signal.kind !== "heavy") {
      return [];
    }

    this.specialCooldownRemaining = 2600;
    const angleOffsets = this.definition.id === "cliffSentinel" ? [-0.11, 0.11] : [-0.15, 0.15];

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
          damage: Math.max(1, Math.round(signal.profile.damage * 0.7)),
          range: Math.round(signal.profile.range * 0.94),
          width: Math.max(10, Math.round(signal.profile.width * 0.92)),
          impact: {
            ...signal.profile.impact,
            displacement: Math.round(signal.profile.impact.displacement * 0.78),
            controlLossMs: Math.round(signal.profile.impact.controlLossMs * 0.84)
          }
        }
      };
    });
  }

  private getAttackPoseTarget(): {
    forward: number;
    side: number;
    rotation: number;
    lengthScale: number;
    heightScale: number;
    bodyTilt: number;
  } {
    const signal = this.currentAttack?.signal;
    const phase = this.currentAttack?.phase;

    if (!signal || !phase) {
      return {
        forward: 0,
        side: 0,
        rotation: 0,
        lengthScale: 1,
        heightScale: 1,
        bodyTilt: 0
      };
    }

    const thrust = signal.profile.shape === "thrust";
    const lunge = signal.profile.attackClass === "lunge";
    const heavy = signal.kind === "heavy";
    const ranged = signal.profile.delivery === "ranged";
    const sweepSign = heavy ? -1 : 1;

    if (phase === "windup") {
      if (this.definition.visualStyle === "beast") {
        return {
          forward: heavy ? -12 : -8,
          side: heavy ? -5 : -2,
          rotation: heavy ? 0.12 : 0.06,
          lengthScale: 1.02,
          heightScale: heavy ? 1.12 : 1.08,
          bodyTilt: heavy ? 0.06 : 0.035
        };
      }

      if (ranged) {
        return {
          forward: -12,
          side: this.definition.visualStyle === "archer" ? 10 * -sweepSign : 4 * -sweepSign,
          rotation: this.definition.visualStyle === "archer" ? 0.18 * -sweepSign : 0.08 * -sweepSign,
          lengthScale: this.definition.visualStyle === "archer" ? 1.08 : 1.02,
          heightScale: 1.06,
          bodyTilt: 0.025 * -sweepSign
        };
      }

      return thrust
        ? {
            forward: heavy ? -9 : -6,
            side: heavy ? -2 : -1,
            rotation: heavy ? 0.05 : 0.03,
            lengthScale: 0.99,
            heightScale: heavy ? 1.05 : 1.03,
            bodyTilt: heavy ? 0.025 : 0.015
          }
        : {
            forward: heavy ? -5 : -3,
            side: (heavy ? 9 : 6) * -sweepSign,
            rotation: (heavy ? 0.18 : 0.12) * -sweepSign,
            lengthScale: 1.01,
            heightScale: heavy ? 1.06 : 1.03,
            bodyTilt: 0.035 * -sweepSign
          };
    }

    if (phase === "active") {
      if (this.definition.visualStyle === "beast") {
        return {
          forward: heavy ? 22 : 16,
          side: heavy ? 2 : 0,
          rotation: heavy ? -0.08 : -0.03,
          lengthScale: heavy ? 1.16 : 1.08,
          heightScale: heavy ? 1.04 : 1,
          bodyTilt: heavy ? -0.06 : -0.025
        };
      }

      if (ranged) {
        return {
          forward: this.definition.visualStyle === "archer" ? 22 : 18,
          side: this.definition.visualStyle === "archer" ? -2 : 0,
          rotation: this.definition.visualStyle === "archer" ? -0.08 : 0,
          lengthScale: this.definition.visualStyle === "archer" ? 1.18 : 1.12,
          heightScale: this.definition.visualStyle === "archer" ? 0.88 : 0.92,
          bodyTilt: this.definition.visualStyle === "archer" ? -0.02 : 0
        };
      }

      if (this.definition.visualStyle === "brute" && heavy) {
        return {
          forward: 10,
          side: 18 * sweepSign,
          rotation: 0.28 * sweepSign,
          lengthScale: 1.14,
          heightScale: 1.06,
          bodyTilt: 0.085 * sweepSign
        };
      }

      return thrust
        ? {
            forward: lunge ? 24 : heavy ? 18 : 12,
            side: heavy ? 1 : 0,
            rotation: lunge ? -0.05 : -0.02,
            lengthScale: lunge ? 1.1 : 1.06,
            heightScale: 0.98,
            bodyTilt: lunge ? -0.03 : -0.015
          }
        : {
            forward: heavy ? 11 : 8,
            side: (heavy ? 14 : 10) * sweepSign,
            rotation: (heavy ? 0.22 : 0.16) * sweepSign,
            lengthScale: heavy ? 1.08 : 1.05,
            heightScale: 0.96,
            bodyTilt: 0.055 * sweepSign
          };
    }

    return thrust || ranged
      ? {
          forward: 4,
          side: 1,
          rotation: -0.01,
          lengthScale: 1.02,
          heightScale: 1.005,
          bodyTilt: -0.008
        }
      : {
          forward: 3,
          side: 4 * sweepSign,
          rotation: 0.05 * sweepSign,
          lengthScale: 1.02,
          heightScale: 1.005,
          bodyTilt: 0.015 * sweepSign
        };
  }

  private syncPresentation(isAttacking: boolean, attackKind: AttackKind | null, stunned = false): void {
    const angle = Math.atan2(this.facing.y, this.facing.x);
    const perpendicular = new Phaser.Math.Vector2(-this.facing.y, this.facing.x);
    const beast = this.definition.visualStyle === "beast";
    const guardReach = beast ? this.size * 0.2 : this.guardSize * 0.34 + 6;
    const telegraphing = this.currentAttack?.phase === "windup";
    const faltering = this.falterRemaining > 0;
    const poseTarget = this.getAttackPoseTarget();
    const bodyColor = stunned
      ? 0xe0cb97
      : this.guardRemaining > 0
        ? 0xd8d1be
      : this.frenzyActive
        ? 0xe0ae98
      : this.fervorRemaining > 0
        ? 0xc0d8b4
      : faltering
        ? 0xccb29c
        : this.slowRemaining > 0
          ? 0x8ca8bb
          : this.bleedRemaining > 0
            ? 0xad6761
            : this.baseColor;
    const strokeColor = stunned
      ? COLORS.gold
      : this.guardRemaining > 0
        ? 0xf1dd9b
      : telegraphing
        ? 0xf0c68a
      : this.frenzyActive
        ? 0xf1b47d
        : this.fervorRemaining > 0
          ? 0xcfe7a8
        : this.slowRemaining > 0
            ? 0xb8d7f2
            : COLORS.ghost;
    const headOffset = this.definition.visualStyle === "beast" ? this.size * 0.18 : this.size * 0.1;
    const headVerticalOffset = this.definition.visualStyle === "beast" ? -this.size * 0.08 : -this.size * 0.2;
    const detailColor = stunned ? 0xf1dfb7 : telegraphing ? 0xf0c68a : this.frenzyActive ? 0xffdcc2 : this.gearColor;
    const accentColor =
      stunned
        ? 0xf3ddb2
        : this.guardRemaining > 0
          ? 0xf0e2b9
        : telegraphing
          ? 0xf0c68a
          : this.definition.visualStyle === "caster"
            ? 0xe8efe3
            : this.frenzyActive
              ? 0xffcfaf
              : this.fervorRemaining > 0
                ? 0xd6ecb8
              : this.gearColor;
    const accentPose = this.getAccentPose();
    const mouthLift = beast ? -this.size * 0.06 : 0;
    const guardColor = beast
      ? stunned
        ? 0xe4c890
        : telegraphing
          ? 0xdca56c
          : 0xb69475
      : stunned
        ? COLORS.gold
        : telegraphing
          ? 0xe9b877
          : this.gearColor;
    const bladeColor = beast
      ? stunned
        ? 0xf7e6bc
        : telegraphing
          ? 0xf3d39f
          : isAttacking
            ? attackKind === "heavy"
              ? 0xe7d4bb
              : 0xf0e5d2
            : 0xf3ead8
      : stunned
        ? 0xf2e4b6
        : telegraphing
          ? 0xf2c38a
          : attackKind
            ? attackKind === "heavy"
              ? this.heavyAttack.tint
              : this.lightAttack.tint
            : this.gearColor;

    this.weaponForwardOffset = Phaser.Math.Linear(this.weaponForwardOffset, poseTarget.forward, 0.22);
    this.weaponSideOffset = Phaser.Math.Linear(this.weaponSideOffset, poseTarget.side, 0.22);
    this.weaponRotationOffset = Phaser.Math.Linear(this.weaponRotationOffset, poseTarget.rotation, 0.22);
    this.weaponLengthScale = Phaser.Math.Linear(this.weaponLengthScale, poseTarget.lengthScale, 0.22);
    this.weaponHeightScale = Phaser.Math.Linear(this.weaponHeightScale, poseTarget.heightScale, 0.22);
    this.bodyTilt = Phaser.Math.Linear(this.bodyTilt, poseTarget.bodyTilt, 0.2);

    const bladeScale = telegraphing ? (attackKind === "heavy" ? 1.24 : 1.1) : isAttacking ? (attackKind === "heavy" ? 1.18 : 1.06) : 1;

    this.bodyObject.setFillStyle(bodyColor);
    this.bodyObject.setStrokeStyle(2, strokeColor, stunned ? 0.6 : telegraphing ? 0.74 : 0.32);
    const bodyScaleX = (faltering ? 0.92 : telegraphing ? 1.04 : 1) * this.bodyScaleXBase * this.presentationScale;
    const bodyScaleY = (telegraphing ? 1.06 : faltering ? 1.08 : 1) * this.bodyScaleYBase * this.presentationScale;
    this.bodyObject.setScale(bodyScaleX, bodyScaleY);
    this.bodyObject.body.setSize(this.collisionWidth / bodyScaleX, this.collisionHeight / bodyScaleY, true);
    this.bodyObject.setRotation(this.bodyTilt);
    this.bodyShadow.setPosition(this.x, this.y + this.size * 0.42);
    this.bodyShadow.setScale((telegraphing ? 1.06 : 1) * this.presentationScale, (faltering ? 0.86 : 1) * this.presentationScale);
    this.bodyShadow.setFillStyle(0x060a10, this.alive ? (telegraphing ? 0.34 : 0.28) : 0.16);
    this.bodyDetail.setPosition(
      this.x - this.facing.x * this.size * 0.02 + perpendicular.x * this.bodyTilt * 40,
      this.y + this.size * 0.05 + perpendicular.y * this.bodyTilt * 40
    );
    this.bodyDetail.setRotation(angle * 0.08 + this.bodyTilt * 0.6);
    this.bodyDetail.setScale((telegraphing ? 1.06 : 1) * this.presentationScale, (faltering ? 1.08 : 1) * this.presentationScale);
    this.bodyDetail.setFillStyle(detailColor, stunned ? 0.3 : telegraphing ? 0.26 : 0.2);
    this.bodyAccent.setPosition(
      this.x + this.facing.x * accentPose.forward + perpendicular.x * accentPose.side + perpendicular.x * this.bodyTilt * 18,
      this.y + this.size * 0.04 + this.facing.y * accentPose.forward + perpendicular.y * accentPose.side + perpendicular.y * this.bodyTilt * 18
    );
    this.bodyAccent.setRotation(angle * accentPose.rotationScale + this.bodyTilt * 0.45);
    this.bodyAccent.setScale(
      (telegraphing ? 1.04 : 1) * accentPose.scaleX * this.presentationScale,
      (faltering ? 1.05 : 1) * accentPose.scaleY * this.presentationScale
    );
    this.bodyAccent.setFillStyle(accentColor, telegraphing ? Math.min(0.42, accentPose.alpha + 0.08) : accentPose.alpha);
    this.headDetail.setPosition(
      this.x + this.facing.x * headOffset + perpendicular.x * this.bodyTilt * 26,
      this.y + headVerticalOffset + this.facing.y * headOffset * 0.22 + perpendicular.y * this.bodyTilt * 26
    );
    this.headDetail.setRotation(angle * 0.12 + this.bodyTilt * 0.4);
    this.headDetail.setScale(this.presentationScale);
    this.headDetail.setFillStyle(stunned ? 0xf7e6bc : telegraphing ? 0xf3d39f : detailColor, telegraphing ? 0.34 : 0.28);
    this.weaponGuard.setPosition(
      this.x + this.facing.x * (guardReach + this.weaponForwardOffset * 0.38) + perpendicular.x * this.weaponSideOffset * 0.34,
      this.y + mouthLift + this.facing.y * (guardReach + this.weaponForwardOffset * 0.38) + perpendicular.y * this.weaponSideOffset * 0.34
    );
    this.weaponGuard.setRotation(angle + this.weaponRotationOffset * 0.38);
    this.weaponGuard.setScale(this.presentationScale);
    this.weaponGuard.setFillStyle(guardColor, 0.9);
    this.weaponBlade.setPosition(
      this.x + this.facing.x * (guardReach + (beast ? 2 : 6) + this.weaponForwardOffset) + perpendicular.x * this.weaponSideOffset,
      this.y + mouthLift + this.facing.y * (guardReach + (beast ? 2 : 6) + this.weaponForwardOffset) + perpendicular.y * this.weaponSideOffset
    );
    this.weaponBlade.setRotation(angle + this.weaponRotationOffset);
    this.weaponBlade.setScale(
      bladeScale * this.weaponLengthScale * this.presentationScale,
      (telegraphing ? 1.06 : 1) * this.weaponHeightScale * this.presentationScale
    );
    this.weaponBlade.setFillStyle(bladeColor, 0.95);
  }

  private applyDamage(
    amount: number,
    direction: { x: number; y: number },
    impact: HitImpactProfile,
    interrupt: boolean,
    flash: boolean
  ): boolean {
    if (!this.alive) {
      return false;
    }

    const guarding = this.guardRemaining > 0;
    const effectiveDamage = Math.max(1, Math.round(amount * (guarding ? 0.68 : 1)));
    const effectiveImpact: HitImpactProfile = guarding
      ? {
          displacement: Math.round(impact.displacement * 0.62),
          controlLossMs: Math.round(impact.controlLossMs * 0.72),
          interruptChance: impact.interruptChance * 0.35,
          hitstopMs: impact.hitstopMs,
          cameraShake: impact.cameraShake
        }
      : impact;

    this.hp = Math.max(0, this.hp - effectiveDamage);
    if (guarding) {
      this.guardRemaining = Math.max(0, this.guardRemaining - 180);
    }

    const shouldInterrupt = interrupt && Math.random() <= effectiveImpact.interruptChance;
    this.falterRemaining = Math.max(this.falterRemaining, effectiveImpact.controlLossMs);
    this.hesitationRemaining = Math.max(this.hesitationRemaining, effectiveImpact.controlLossMs * 0.35);

    if (shouldInterrupt) {
      this.currentAttack = null;
      this.queuedAttacks = [];
      this.chainGapRemaining = 0;
      this.attackCooldownRemaining = 320 + Math.round(effectiveImpact.controlLossMs * 0.4);
      this.bodyObject.body.setAcceleration(0, 0);
      this.bodyObject.body.setVelocity(direction.x * effectiveImpact.displacement, direction.y * effectiveImpact.displacement);
    } else {
      this.bodyObject.body.setVelocity(
        direction.x * effectiveImpact.displacement * 0.42,
        direction.y * effectiveImpact.displacement * 0.42
      );
    }

    this.bodyObject.setFillStyle(guarding ? 0xf0dfae : flash ? 0xe8a59d : 0xc5645f);
    this.scene.tweens.add({
      targets: this.bodyObject,
      scaleX: 0.82 * this.bodyScaleXBase,
      scaleY: 1.18 * this.bodyScaleYBase,
      duration: 70,
      yoyo: true
    });
    this.scene.time.delayedCall(flash ? 95 : 70, () => {
      if (!this.bodyObject.scene || !this.alive) {
        return;
      }

      this.syncPresentation(this.currentAttack !== null, this.currentAttack?.signal.kind ?? null, this.stunRemaining > 0);
    });

    if (this.hp === 0) {
      this.die();
      return true;
    }

    return false;
  }

  private die(): void {
    this.isDestroyed = true;
    this.currentAttack = null;
    this.queuedAttacks = [];
    this.bodyObject.body.setAcceleration(0, 0);
    this.bodyObject.body.setVelocity(0, 0);
    this.bodyObject.body.enable = false;

    this.scene.tweens.add({
      targets: [this.bodyShadow, this.bodyObject, this.bodyDetail, this.bodyAccent, this.headDetail, this.weaponGuard, this.weaponBlade],
      alpha: 0.34,
      scaleX: 1.18,
      scaleY: 0.86,
      duration: 220
    });
  }
}
