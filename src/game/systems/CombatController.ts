import Phaser from "phaser";
import type { AttackExecutionSignal, AttackKind, CombatStats, CombatStatusSnapshot } from "../core/types";

type ControlledActor = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.Body;
};

type ControlKeys = {
  up: Phaser.Input.Keyboard.Key | null;
  down: Phaser.Input.Keyboard.Key | null;
  left: Phaser.Input.Keyboard.Key | null;
  right: Phaser.Input.Keyboard.Key | null;
  dash: Phaser.Input.Keyboard.Key | null;
  altDash: Phaser.Input.Keyboard.Key | null;
  parry: Phaser.Input.Keyboard.Key | null;
  light: Phaser.Input.Keyboard.Key | null;
  heavy: Phaser.Input.Keyboard.Key | null;
};

interface AttackState {
  signal: AttackExecutionSignal;
  phase: "windup" | "active" | "recovery";
  remaining: number;
  recoveryScale: number;
  driftVelocity: Phaser.Math.Vector2;
}

interface CombatControllerConfig {
  scene: Phaser.Scene;
  actor: ControlledActor;
  pointer: Phaser.Input.Pointer;
  stats: CombatStats;
  prepareAttackSignal?: (signal: AttackExecutionSignal) => AttackExecutionSignal;
  canStartDash?: () => boolean;
  canStartAttack?: (kind: AttackKind) => boolean;
  onActionRejected?: (reason: "stamina" | "challenge") => void;
  onAttackActive: (signal: AttackExecutionSignal) => void;
  onAttackEnded: (signal: AttackExecutionSignal) => void;
  onDashStart?: (direction: { x: number; y: number }) => void;
}

export class CombatController {
  private readonly scene: Phaser.Scene;
  private readonly actor: ControlledActor;
  private readonly pointer: Phaser.Input.Pointer;
  private readonly stats: CombatStats;
  private readonly keys: ControlKeys;
  private readonly cursors: Partial<Phaser.Types.Input.Keyboard.CursorKeys>;
  private readonly prepareAttackSignal?: (signal: AttackExecutionSignal) => AttackExecutionSignal;
  private readonly canStartDash?: () => boolean;
  private readonly canStartAttack?: (kind: AttackKind) => boolean;
  private readonly onActionRejected?: (reason: "stamina" | "challenge") => void;
  private readonly onAttackActive: (signal: AttackExecutionSignal) => void;
  private readonly onAttackEnded: (signal: AttackExecutionSignal) => void;
  private readonly onDashStart?: (direction: { x: number; y: number }) => void;

  private readonly movementInput = new Phaser.Math.Vector2();
  private readonly facing = new Phaser.Math.Vector2(1, 0);
  private readonly dashDirection = new Phaser.Math.Vector2(1, 0);
  private currentAttack: AttackState | null = null;
  private attackId = 0;
  private dashCooldownRemaining = 0;
  private dashRemaining = 0;
  private parryCooldownRemaining = 0;
  private parryWindowRemaining = 0;
  private parryGraceRemaining = 0;
  private parryRecoveryRemaining = 0;
  private controlLockRemaining = 0;
  private moveBoostRemaining = 0;
  private moveBoostMultiplier = 1;
  private stamina = 0;
  private previousPrimaryDown = false;
  private previousSecondaryDown = false;

  constructor(config: CombatControllerConfig) {
    const {
      scene,
      actor,
      pointer,
      stats,
      prepareAttackSignal,
      canStartDash,
      canStartAttack,
      onActionRejected,
      onAttackActive,
      onAttackEnded,
      onDashStart
    } = config;
    const keyboard = scene.input.keyboard;

    this.scene = scene;
    this.actor = actor;
    this.pointer = pointer;
    this.stats = stats;
    this.prepareAttackSignal = prepareAttackSignal;
    this.canStartDash = canStartDash;
    this.canStartAttack = canStartAttack;
    this.onActionRejected = onActionRejected;
    this.onAttackActive = onAttackActive;
    this.onAttackEnded = onAttackEnded;
    this.onDashStart = onDashStart;
    this.keys = keyboard
      ? (keyboard.addKeys({
          up: Phaser.Input.Keyboard.KeyCodes.W,
          down: Phaser.Input.Keyboard.KeyCodes.S,
          left: Phaser.Input.Keyboard.KeyCodes.A,
          right: Phaser.Input.Keyboard.KeyCodes.D,
          dash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
          altDash: Phaser.Input.Keyboard.KeyCodes.SPACE,
          parry: Phaser.Input.Keyboard.KeyCodes.Q,
          light: Phaser.Input.Keyboard.KeyCodes.J,
          heavy: Phaser.Input.Keyboard.KeyCodes.K
        }) as ControlKeys)
      : {
          up: null,
          down: null,
          left: null,
          right: null,
          dash: null,
          altDash: null,
          parry: null,
          light: null,
          heavy: null
        };
    this.cursors = keyboard ? keyboard.createCursorKeys() : {};
    this.stamina = this.stats.staminaMax;

    this.actor.body.setAllowGravity(false);
    this.actor.body.setDrag(this.stats.drag, this.stats.drag);
    this.actor.body.setMaxVelocity(this.stats.moveSpeed * 1.5, this.stats.moveSpeed * 1.5);
  }

  update(deltaMs: number): void {
    this.pointer.updateWorldPoint(this.scene.cameras.main);

    this.updateTimers(deltaMs);
    this.updateMovementInput();
    this.updateFacing();
    this.consumeActions();
    this.applyMovement();
  }

  getFacingVector(): Phaser.Math.Vector2 {
    return this.facing.clone();
  }

  getStatus(): CombatStatusSnapshot {
    return {
      facing: {
        x: this.facing.x,
        y: this.facing.y
      },
      dashCooldownRemaining: this.dashCooldownRemaining,
      parryCooldownRemaining: this.parryCooldownRemaining,
      parryWindowRemaining: this.parryWindowRemaining,
      actionTimeRemaining: this.currentAttack ? this.currentAttack.remaining : 0,
      moveBoostRemaining: this.moveBoostRemaining,
      stamina: this.stamina,
      staminaMax: this.stats.staminaMax,
      isDashing: this.dashRemaining > 0,
      isAttacking: this.currentAttack !== null,
      isParrying: this.parryWindowRemaining > 0 || this.parryGraceRemaining > 0
    };
  }

  getCurrentAttackSignal(): AttackExecutionSignal | null {
    return this.currentAttack?.signal ?? null;
  }

  getCurrentAttackPhase(): AttackState["phase"] | null {
    return this.currentAttack?.phase ?? null;
  }

  isCurrentAttackHeavy(): boolean {
    return this.currentAttack?.signal.kind === "heavy";
  }

  refundDashCooldown(amountMs: number): void {
    this.dashCooldownRemaining = Math.max(0, this.dashCooldownRemaining - Math.max(0, amountMs));
  }

  refundStamina(amount: number): void {
    this.stamina = Phaser.Math.Clamp(this.stamina + amount, 0, this.stats.staminaMax);
  }

  applyMoveBoost(multiplier: number, durationMs: number): void {
    if (multiplier <= 1 || durationMs <= 0) {
      return;
    }

    this.moveBoostMultiplier = Math.max(this.moveBoostMultiplier, multiplier);
    this.moveBoostRemaining = Math.max(this.moveBoostRemaining, durationMs);
  }

  scaleCurrentRecovery(factor: number): void {
    if (!this.currentAttack || factor === 1) {
      return;
    }

    if (this.currentAttack.phase === "active") {
      this.currentAttack.recoveryScale = Phaser.Math.Clamp(this.currentAttack.recoveryScale * factor, 0.45, 1.7);
      return;
    }

    if (this.currentAttack.phase === "recovery") {
      this.currentAttack.remaining = Math.max(28, Math.round(this.currentAttack.remaining * factor));
    }
  }

  applyControlLock(durationMs: number): void {
    this.controlLockRemaining = Math.max(this.controlLockRemaining, durationMs);
  }

  resolveParrySuccess(): void {
    this.parryWindowRemaining = 0;
    this.parryGraceRemaining = 0;
    this.parryRecoveryRemaining = 0;
    this.parryCooldownRemaining = Math.max(0, this.parryCooldownRemaining - 90);
    this.actor.body.setAcceleration(0, 0);
  }

  private updateTimers(deltaMs: number): void {
    this.dashCooldownRemaining = Math.max(0, this.dashCooldownRemaining - deltaMs);
    this.parryCooldownRemaining = Math.max(0, this.parryCooldownRemaining - deltaMs);
    this.parryRecoveryRemaining = Math.max(0, this.parryRecoveryRemaining - deltaMs);
    this.parryWindowRemaining = Math.max(0, this.parryWindowRemaining - deltaMs);
    this.parryGraceRemaining = Math.max(0, this.parryGraceRemaining - deltaMs);
    this.controlLockRemaining = Math.max(0, this.controlLockRemaining - deltaMs);
    this.moveBoostRemaining = Math.max(0, this.moveBoostRemaining - deltaMs);
    this.regenerateStamina(deltaMs);

    if (this.dashRemaining > 0) {
      this.dashRemaining = Math.max(0, this.dashRemaining - deltaMs);
    }

    if (this.moveBoostRemaining === 0) {
      this.moveBoostMultiplier = 1;
      this.actor.body.setMaxVelocity(this.stats.moveSpeed * 1.5, this.stats.moveSpeed * 1.5);
    }

    if (!this.currentAttack) {
      return;
    }

    this.currentAttack.remaining -= deltaMs;

    if (this.currentAttack.remaining > 0) {
      return;
    }

    if (this.currentAttack.phase === "windup") {
      if (this.currentAttack.signal.kind === "heavy" && this.isHeavyInputHeld()) {
        this.currentAttack.signal.fullyCharged = true;
      }

      this.currentAttack.phase = "active";
      this.currentAttack.remaining = this.currentAttack.signal.profile.active;
      this.actor.body.setVelocity(
        this.currentAttack.signal.direction.x * this.currentAttack.signal.profile.lunge,
        this.currentAttack.signal.direction.y * this.currentAttack.signal.profile.lunge
      );
      this.onAttackActive(this.currentAttack.signal);
      return;
    }

    if (this.currentAttack.phase === "active") {
      this.currentAttack.phase = "recovery";
      this.currentAttack.remaining = Math.max(44, Math.round(this.currentAttack.signal.profile.recovery * this.currentAttack.recoveryScale));
      this.onAttackEnded(this.currentAttack.signal);
      return;
    }

    this.currentAttack = null;
  }

  private updateMovementInput(): void {
    const horizontal =
      this.readAxis(this.keys.left, this.keys.right) + this.readAxis(this.cursors.left, this.cursors.right);
    const vertical =
      this.readAxis(this.keys.up, this.keys.down) + this.readAxis(this.cursors.up, this.cursors.down);

    this.movementInput.set(
      Phaser.Math.Clamp(horizontal, -1, 1),
      Phaser.Math.Clamp(vertical, -1, 1)
    );

    if (this.movementInput.lengthSq() > 1) {
      this.movementInput.normalize();
    }
  }

  private updateFacing(): void {
    if (this.currentAttack && this.currentAttack.phase !== "recovery") {
      return;
    }

    const pointerVector = new Phaser.Math.Vector2(this.pointer.worldX - this.actor.x, this.pointer.worldY - this.actor.y);

    if (pointerVector.lengthSq() > 196) {
      pointerVector.normalize();
      this.facing.copy(pointerVector);
      return;
    }

    if (this.movementInput.lengthSq() > 0.01) {
      this.facing.copy(this.movementInput);
    }
  }

  private consumeActions(): void {
    const primaryDown = this.pointer.leftButtonDown();
    const secondaryDown = this.pointer.rightButtonDown();
    const dashPressed = this.isJustDown(this.keys.dash) || this.isJustDown(this.keys.altDash);
    const parryPressed = this.isJustDown(this.keys.parry);
    const lightPressed = this.isJustDown(this.keys.light) || (primaryDown && !this.previousPrimaryDown);
    const heavyPressed = this.isJustDown(this.keys.heavy) || (secondaryDown && !this.previousSecondaryDown);

    this.previousPrimaryDown = primaryDown;
    this.previousSecondaryDown = secondaryDown;

    if (
      this.controlLockRemaining <= 0 &&
      !this.currentAttack &&
      this.dashRemaining <= 0 &&
      this.parryRecoveryRemaining <= 0 &&
      this.parryWindowRemaining <= 0 &&
      parryPressed &&
      this.parryCooldownRemaining <= 0
    ) {
      this.startParry();
      return;
    }

    if (this.controlLockRemaining <= 0 && !this.currentAttack && this.dashRemaining <= 0 && dashPressed && this.dashCooldownRemaining <= 0) {
      if (this.canStartDash && !this.canStartDash()) {
        this.onActionRejected?.("challenge");
      } else {
        this.startDash();
      }
    }

    if (
      this.controlLockRemaining <= 0 &&
      !this.currentAttack &&
      this.dashRemaining <= 0 &&
      this.parryRecoveryRemaining <= 0 &&
      this.parryWindowRemaining <= 0
    ) {
      if (heavyPressed) {
        if (this.canStartAttack && !this.canStartAttack("heavy")) {
          this.onActionRejected?.("challenge");
        } else {
          this.startAttack("heavy");
        }
      } else if (lightPressed) {
        if (this.canStartAttack && !this.canStartAttack("light")) {
          this.onActionRejected?.("challenge");
        } else {
          this.startAttack("light");
        }
      }
    }
  }

  private applyMovement(): void {
    if (this.dashRemaining > 0) {
      this.actor.body.setAcceleration(0, 0);
      this.actor.body.setVelocity(this.dashDirection.x * this.stats.dashSpeed, this.dashDirection.y * this.stats.dashSpeed);
      return;
    }

    if (this.controlLockRemaining > 0) {
      this.actor.body.setAcceleration(0, 0);
      this.actor.body.setVelocity(this.actor.body.velocity.x * 0.88, this.actor.body.velocity.y * 0.88);
      return;
    }

    if (this.parryWindowRemaining > 0 || this.parryRecoveryRemaining > 0) {
      this.actor.body.setAcceleration(0, 0);
      this.actor.body.setVelocity(this.actor.body.velocity.x * 0.82, this.actor.body.velocity.y * 0.82);
      return;
    }

    const controlFactor = this.currentAttack
      ? this.currentAttack.phase === "active"
        ? this.stats.attackControlActive
        : this.stats.attackControlWindup
      : 1;
    const footworkFactor = this.getFootworkFactor();
    const moveBoost = this.moveBoostMultiplier;

    this.actor.body.setMaxVelocity(
      this.stats.moveSpeed * 1.5 * moveBoost,
      this.stats.moveSpeed * 1.5 * moveBoost
    );

    if (this.movementInput.lengthSq() === 0) {
      this.actor.body.setAcceleration(0, 0);
      this.applyAttackDrift();
      return;
    }

    this.actor.body.setAcceleration(
      this.movementInput.x * this.stats.moveAcceleration * controlFactor * footworkFactor * moveBoost,
      this.movementInput.y * this.stats.moveAcceleration * controlFactor * footworkFactor * moveBoost
    );
    this.applyAttackDrift();
  }

  private startDash(): void {
    if (this.stamina < this.stats.dashStaminaCost) {
      this.onActionRejected?.("stamina");
      return;
    }

    const dashVector = this.movementInput.lengthSq() > 0.01 ? this.movementInput.clone() : this.facing.clone();

    if (dashVector.lengthSq() <= 0.0001) {
      dashVector.set(1, 0);
    }

    dashVector.normalize();
    this.dashDirection.copy(dashVector);
    this.dashRemaining = this.stats.dashDuration;
    this.dashCooldownRemaining = this.stats.dashCooldown;
    this.stamina = Math.max(0, this.stamina - this.stats.dashStaminaCost);
    this.actor.body.setAcceleration(0, 0);
    this.actor.body.setVelocity(this.dashDirection.x * this.stats.dashSpeed, this.dashDirection.y * this.stats.dashSpeed);
    this.onDashStart?.({
      x: this.dashDirection.x,
      y: this.dashDirection.y
    });
  }

  private startParry(): void {
    this.parryWindowRemaining = this.stats.parryWindow;
    this.parryGraceRemaining = Math.max(24, Math.round(this.stats.parryWindow * 0.22));
    this.parryRecoveryRemaining = this.stats.parryWindow + this.stats.parryRecovery;
    this.parryCooldownRemaining = this.stats.parryCooldown;
    this.actor.body.setAcceleration(0, 0);
    this.actor.body.setVelocity(this.actor.body.velocity.x * 0.24, this.actor.body.velocity.y * 0.24);
  }

  private startAttack(kind: AttackKind): void {
    const profile = { ...(kind === "light" ? this.stats.lightAttack : this.stats.heavyAttack) };
    const baseRange = kind === "light" ? this.stats.combatStyle.lightAttack.range : this.stats.combatStyle.heavyAttack.range;

    if (this.stamina < profile.staminaCost) {
      this.onActionRejected?.("stamina");
      return;
    }

    const direction = this.facing.clone().normalize();
    const baseSignal: AttackExecutionSignal = {
      id: ++this.attackId,
      kind,
      profile,
      rangeAnchor: baseRange,
      fullyCharged: false,
      direction: {
        x: direction.x,
        y: direction.y
      },
      angle: direction.angle()
    };
    const signal = this.prepareAttackSignal ? this.prepareAttackSignal(baseSignal) : baseSignal;

    this.currentAttack = {
      signal,
      phase: "windup",
      remaining: signal.profile.windup,
      recoveryScale: 1,
      driftVelocity: direction.scale(signal.profile.lunge * signal.profile.drift * signal.profile.commitWeight * 0.82)
    };
    this.stamina = Math.max(0, this.stamina - profile.staminaCost);
  }

  private getFootworkFactor(): number {
    if (this.movementInput.lengthSq() <= 0.001) {
      return 1;
    }

    const forward = Phaser.Math.Clamp(this.movementInput.dot(this.facing), -1, 1);

    if (forward <= -0.35) {
      return 0.64;
    }

    if (forward <= 0.2) {
      return 0.78;
    }

    return 1;
  }

  private regenerateStamina(deltaMs: number): void {
    const actionScale =
      this.currentAttack && this.currentAttack.phase !== "recovery"
        ? 0.28
        : this.dashRemaining > 0
          ? 0.18
          : this.parryWindowRemaining > 0 || this.parryRecoveryRemaining > 0
            ? 0.4
            : 1;
    const staminaDelta = (this.stats.staminaRegen * actionScale * deltaMs) / 1000;

    this.stamina = Phaser.Math.Clamp(this.stamina + staminaDelta, 0, this.stats.staminaMax);
  }

  private applyAttackDrift(): void {
    if (!this.currentAttack) {
      return;
    }

    const phaseScale =
      this.currentAttack.phase === "windup"
        ? 0.56
        : this.currentAttack.phase === "active"
          ? 0.24
          : 0.46;
    const driftScale = phaseScale * this.currentAttack.signal.profile.commitWeight;

    this.actor.body.velocity.x += (this.currentAttack.driftVelocity.x * driftScale - this.actor.body.velocity.x) * 0.08;
    this.actor.body.velocity.y += (this.currentAttack.driftVelocity.y * driftScale - this.actor.body.velocity.y) * 0.08;
  }

  private isHeavyInputHeld(): boolean {
    return this.keys.heavy?.isDown === true || this.pointer.rightButtonDown();
  }

  private isJustDown(key: Phaser.Input.Keyboard.Key | null | undefined): boolean {
    return key ? Phaser.Input.Keyboard.JustDown(key) : false;
  }

  private readAxis(negative: Phaser.Input.Keyboard.Key | null | undefined, positive: Phaser.Input.Keyboard.Key | null | undefined): number {
    const negativeValue = negative?.isDown ? 1 : 0;
    const positiveValue = positive?.isDown ? 1 : 0;

    return positiveValue - negativeValue;
  }
}
