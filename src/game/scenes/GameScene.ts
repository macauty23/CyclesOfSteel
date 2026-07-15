import Phaser from "phaser";
import { gameManager } from "../core/GameManager";
import { SCENE_KEYS } from "../core/SceneKeys";
import type {
  AttackExecutionSignal,
  AttackKind,
  AttackProfile,
  AttackShape,
  CombatStats,
  EncounterConfig,
  EnemyDefinition,
  EnemyHazardSignal,
  EnemyArmorTier,
  EnemySpecialId,
  HitImpactProfile,
  MaterialCost,
  RunModifierId
} from "../core/types";
import { getEnemyDefinition } from "../data/enemies";
import { MATERIAL_ORDER, MATERIAL_TINTS, formatMaterialCost } from "../data/materials";
import { MaterialPickup } from "../entities/MaterialPickup";
import { PlaceholderEnemy } from "../entities/PlaceholderEnemy";
import { CombatController } from "../systems/CombatController";
import {
  TUTORIAL_COMPLETION_PAGES,
  TUTORIAL_FINAL_NODE_ID,
  TUTORIAL_PROMPT_IDS,
  getTutorialCombatPages
} from "../tutorial/tutorialData";
import { createGuidedOverlay, type GuidedOverlayHandle } from "../ui/createGuidedOverlay";
import { createButton } from "../ui/createButton";
import { ARENA, COLORS, TEXT, VIEWPORT, colorHex } from "../ui/theme";

type PlayerBody = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.Body;
};

interface EnemyProjectileState {
  visual: Phaser.GameObjects.Container;
  signal: AttackExecutionSignal;
  x: number;
  y: number;
  speed: number;
  width: number;
  length: number;
  travelled: number;
  maxTravel: number;
}

interface EnemyHazardState {
  visual: Phaser.GameObjects.Container;
  signal: EnemyHazardSignal;
  armDelayRemaining: number;
  durationRemaining: number;
}

export class GameScene extends Phaser.Scene {
  private player!: PlayerBody;
  private playerWeaponBlade!: Phaser.GameObjects.Rectangle;
  private playerWeaponGuard!: Phaser.GameObjects.Rectangle;
  private enemy!: PlaceholderEnemy;
  private controller!: CombatController;
  private currentStats!: CombatStats;
  private currentEncounter!: EncounterConfig;
  private pickups: MaterialPickup[] = [];
  private enemyProjectiles: EnemyProjectileState[] = [];
  private enemyHazards: EnemyHazardState[] = [];

  private activeAttack: AttackExecutionSignal | null = null;
  private activeAttackVisual: Phaser.GameObjects.Container | null = null;
  private attackResolved = false;

  private enemyActiveAttack: AttackExecutionSignal | null = null;
  private enemyAttackVisual: Phaser.GameObjects.Container | null = null;
  private enemyAttackResolved = false;

  private dropsSpawned = false;
  private forgeQueued = false;
  private combatLocked = false;
  private transitioningOut = false;
  private forgeTransitionEvent: Phaser.Time.TimerEvent | null = null;

  private playerHp = 0;
  private playerMaxHp = 0;
  private playerInvulnRemaining = 0;
  private comboCount = 0;
  private comboTimerRemaining = 0;
  private bestCombo = 0;
  private hitStopRemaining = 0;
  private firstBloodAvailable = true;
  private thrustStreak = 0;
  private nextAttackBonusDamage = 0;
  private postBindThrustCharges = 0;
  private postBindRewardRemaining = 0;
  private guardDamageScalePending = 1;
  private recentDashAttackWindowRemaining = 0;
  private lastSuccessfulAttackKind: AttackKind | null = null;
  private lastSuccessfulAttackShape: AttackShape | null = null;
  private playerWeaponForwardOffset = 0;
  private playerWeaponSideOffset = 0;
  private playerWeaponRotationOffset = 0;
  private playerWeaponLengthScale = 1;
  private playerWeaponHeightScale = 1;
  private playerBodyTilt = 0;

  private hudText!: Phaser.GameObjects.Text;
  private enemyText!: Phaser.GameObjects.Text;
  private lootText!: Phaser.GameObjects.Text;
  private guidanceText!: Phaser.GameObjects.Text;
  private swordModeText!: Phaser.GameObjects.Text;
  private measureGraphics!: Phaser.GameObjects.Graphics;
  private telegraphGraphics!: Phaser.GameObjects.Graphics;
  private lastFeedback = "";
  private feedbackColor: number = COLORS.gold;
  private feedbackRemaining = 0;
  private tutorialOverlay: GuidedOverlayHandle | null = null;
  private tutorialOverlayActive = false;

  constructor() {
    super(SCENE_KEYS.Game);
  }

  create(): void {
    this.physics.world.resume();
    this.pickups = [];
    this.activeAttack = null;
    this.activeAttackVisual = null;
    this.attackResolved = false;
    this.enemyActiveAttack = null;
    this.enemyAttackVisual = null;
    this.enemyAttackResolved = false;
    this.dropsSpawned = false;
    this.forgeQueued = false;
    this.combatLocked = false;
    this.transitioningOut = false;
    this.forgeTransitionEvent = null;
    this.comboCount = 0;
    this.comboTimerRemaining = 0;
    this.bestCombo = 0;
    this.hitStopRemaining = 0;
    this.firstBloodAvailable = true;
    this.thrustStreak = 0;
    this.nextAttackBonusDamage = 0;
    this.postBindThrustCharges = 0;
    this.postBindRewardRemaining = 0;
    this.guardDamageScalePending = 1;
    this.recentDashAttackWindowRemaining = 0;
    this.lastSuccessfulAttackKind = null;
    this.lastSuccessfulAttackShape = null;
    this.playerWeaponForwardOffset = 0;
    this.playerWeaponSideOffset = 0;
    this.playerWeaponRotationOffset = 0;
    this.playerWeaponLengthScale = 1;
    this.playerWeaponHeightScale = 1;
    this.playerBodyTilt = 0;
    this.lastFeedback = "";
    this.feedbackRemaining = 0;
    this.tutorialOverlay = null;
    this.tutorialOverlayActive = false;

    this.currentStats = gameManager.getCombatStats();
    this.currentEncounter = gameManager.getEncounterConfig();
    this.enemyProjectiles = [];
    this.enemyHazards = [];
    this.playerMaxHp = this.currentStats.maxHp;
    this.playerHp = this.playerMaxHp;
    this.playerInvulnRemaining = 0;

    this.input.mouse?.disableContextMenu();
    this.paintArena();
    this.drawHudChrome();
    this.measureGraphics = this.add.graphics().setDepth(9);
    this.telegraphGraphics = this.add.graphics().setDepth(3);

    this.physics.world.setBounds(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    const style = this.currentStats.combatStyle;
    const spawnX = ARENA.x + 112;
    const spawnY = ARENA.y + ARENA.height / 2;
    const playerBodySize = Math.min(style.bodyWidth, style.bodyHeight);

    this.player = this.add
      .rectangle(spawnX, spawnY, playerBodySize, playerBodySize, this.currentStats.sword.accent)
      .setStrokeStyle(2, COLORS.ghost, 0.4)
      .setDepth(5) as PlayerBody;
    this.playerWeaponGuard = this.add
      .rectangle(spawnX + 10, spawnY, style.guardSize, 6, style.accent, 0.95)
      .setOrigin(0.2, 0.5)
      .setDepth(6);
    this.playerWeaponBlade = this.add
      .rectangle(spawnX + 14, spawnY, style.bladeLength, style.bladeWidth, COLORS.ghost, 0.95)
      .setOrigin(0, 0.5)
      .setDepth(7);

    this.physics.add.existing(this.player);
    this.player.body.setAllowGravity(false);
    this.player.body.setDrag(this.currentStats.drag, this.currentStats.drag);
    this.player.body.setMaxVelocity(this.currentStats.moveSpeed * 1.5, this.currentStats.moveSpeed * 1.5);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(Math.max(22, playerBodySize - 8), Math.max(22, playerBodySize - 8), true);
    this.player.body.setBoundsRectangle(new Phaser.Geom.Rectangle(ARENA.x, ARENA.y, ARENA.width, ARENA.height));

    const enemyDefinition = this.getEncounterEnemyDefinition();

    this.enemy = new PlaceholderEnemy({
      scene: this,
      x: ARENA.x + ARENA.width - 146,
      y: ARENA.y + ARENA.height / 2,
      maxHp: this.currentEncounter.enemyHp,
      speed: this.currentEncounter.enemySpeed,
      acceleration: this.currentEncounter.enemyAcceleration,
      tint: this.currentEncounter.enemyTint,
      size: this.currentEncounter.enemySize,
      pattern: this.currentEncounter.pattern,
      definition: enemyDefinition,
      attackDamageBonus: this.currentEncounter.enemyDamageBonus,
      aggression: this.currentEncounter.enemyAggression
    });

    this.physics.add.collider(this.player, this.enemy.bodyObject);

    this.controller = new CombatController({
      scene: this,
      actor: this.player,
      pointer: this.input.activePointer,
      stats: this.currentStats,
      prepareAttackSignal: (signal) => this.preparePlayerAttackSignal(signal),
      onActionRejected: () => this.pushFeedback("Not enough stamina", COLORS.danger),
      onAttackActive: (signal) => this.openAttackWindow(signal),
      onAttackEnded: (signal) => this.closeAttackWindow(signal),
      onDashStart: (direction) => {
        this.recentDashAttackWindowRemaining = 280;
        this.playDashEffect(direction);
      }
    });

    this.add
      .text(VIEWPORT.width * 0.5, 28, this.currentEncounter.title, { ...TEXT.heading, fontSize: "24px" })
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.hudText = this.add.text(64, 28, "", TEXT.small).setDepth(20).setWordWrapWidth(310);
    this.guidanceText = this.add
      .text(VIEWPORT.width * 0.5, 86, "", { ...TEXT.small, color: colorHex(COLORS.gold), align: "center" })
      .setOrigin(0.5, 0)
      .setDepth(20)
      .setWordWrapWidth(420);
    this.swordModeText = this.add
      .text(640, 54, "", { ...TEXT.small, color: "#d9e2ea", align: "center" })
      .setOrigin(0.5, 0)
      .setDepth(20)
      .setWordWrapWidth(400);
    this.enemyText = this.add
      .text(1216, 28, "", { ...TEXT.small, color: colorHex(COLORS.danger), align: "right" })
      .setOrigin(1, 0)
      .setDepth(20)
      .setWordWrapWidth(320);
    this.add
      .text(64, 640, "Move WASD/Arrows  Dash Shift/Space  Bind Q\nLight J/LMB  Heavy K/RMB", TEXT.small)
      .setDepth(20)
      .setWordWrapWidth(400);
    this.lootText = this.add
      .text(1216, 640, "", { ...TEXT.small, color: "#d7dee6", align: "right" })
      .setOrigin(1, 0)
      .setDepth(20)
      .setWordWrapWidth(430);

    this.refreshHud();
    this.syncPlayerPresentation();
    this.maybeOpenTutorialOverlay();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.transitioningOut = true;
      this.forgeTransitionEvent?.remove(false);
      this.forgeTransitionEvent = null;
      this.activeAttack = null;
      this.enemyActiveAttack = null;
      this.hitStopRemaining = 0;

      if (this.physics?.world) {
        this.physics.world.resume();
      }

      this.measureGraphics?.destroy();
      this.telegraphGraphics?.destroy();
      this.activeAttackVisual?.destroy();
      this.enemyAttackVisual?.destroy();
      this.clearEnemyProjectiles();
      this.clearEnemyHazards();
      this.tutorialOverlay?.destroy();
    });
  }

  private getEncounterEnemyDefinition(): EnemyDefinition {
    const definition = getEnemyDefinition(this.currentEncounter.enemyId);

    if (this.currentEncounter.nodeType !== "miniboss") {
      return definition;
    }

    const specialIds = new Set<EnemySpecialId>(definition.specialIds ?? []);

    switch (definition.visualStyle) {
      case "archer":
        specialIds.add("burstShot");
        specialIds.add("sidestepBurst");
        break;
      case "caster":
        specialIds.add("snarePatch");
        specialIds.add("sidestepBurst");
        break;
      case "beast":
        specialIds.add("packFrenzy");
        specialIds.add("sidestepBurst");
        break;
      case "polearm":
        specialIds.add("rushdown");
        break;
      case "brute":
        specialIds.add("rushdown");
        specialIds.add("packFrenzy");
        break;
      case "guardian":
        specialIds.add("rushdown");
        specialIds.add("burstShot");
        break;
      case "raider":
        specialIds.add("sidestepBurst");
        break;
    }

    if ((definition.specialIds?.length ?? 0) === specialIds.size) {
      return definition;
    }

    return {
      ...definition,
      specialIds: [...specialIds]
    };
  }

  update(_time: number, delta: number): void {
    if (this.transitioningOut) {
      return;
    }

    if (this.playerInvulnRemaining > 0) {
      this.playerInvulnRemaining = Math.max(0, this.playerInvulnRemaining - delta);
    }

    if (this.feedbackRemaining > 0) {
      this.feedbackRemaining = Math.max(0, this.feedbackRemaining - delta);

    if (this.feedbackRemaining === 0) {
        this.lastFeedback = "";
      }
    }

    if (this.tutorialOverlayActive) {
      this.drawMeasureGuide();
      this.drawEnemyTelegraph();
      this.syncPlayerPresentation();
      this.refreshHud();
      return;
    }

    if (this.hitStopRemaining > 0) {
      this.hitStopRemaining = Math.max(0, this.hitStopRemaining - delta);

      if (this.hitStopRemaining === 0) {
        this.physics.world.resume();
      }

      this.drawMeasureGuide();
      this.drawEnemyTelegraph();
      this.refreshHud();
      return;
    }

    if (this.recentDashAttackWindowRemaining > 0) {
      this.recentDashAttackWindowRemaining = Math.max(0, this.recentDashAttackWindowRemaining - delta);
    }

    if (this.postBindRewardRemaining > 0) {
      this.postBindRewardRemaining = Math.max(0, this.postBindRewardRemaining - delta);

      if (this.postBindRewardRemaining === 0) {
        this.nextAttackBonusDamage = 0;
        this.postBindThrustCharges = 0;
      }
    }

    if (this.comboTimerRemaining > 0) {
      this.comboTimerRemaining = Math.max(0, this.comboTimerRemaining - delta);

      if (this.comboTimerRemaining === 0) {
        this.resetCombo();
      }
    }

    if (!this.combatLocked) {
      this.controller.update(delta);
      const playerStatus = this.controller.getStatus();
      const enemyEvents = this.enemy.update(
        this.player.x,
        this.player.y,
        {
          isAttacking: playerStatus.isAttacking,
          isDashing: playerStatus.isDashing,
          isParrying: playerStatus.isParrying
        },
        delta
      );

      if (enemyEvents.activatedAttack) {
        this.openEnemyAttackWindow(enemyEvents.activatedAttack);
      }

      if (enemyEvents.spawnedProjectiles) {
        enemyEvents.spawnedProjectiles.forEach((signal) => this.launchEnemyProjectile(signal));
      }

      if (enemyEvents.spawnedHazards) {
        enemyEvents.spawnedHazards.forEach((signal) => this.spawnEnemyHazard(signal));
      }

      if (enemyEvents.endedAttack) {
        this.closeEnemyAttackWindow();
      }

      this.updateAttackWindow();
      this.updateEnemyAttackWindow();
      this.updateEnemyProjectiles(delta);
      this.updateEnemyHazards(delta);
    }

    this.drawMeasureGuide();
    this.drawEnemyTelegraph();
    this.syncPlayerPresentation();
    this.updatePickups(delta);
    this.refreshHud();
  }

  private drawHudChrome(): void {
    this.add.rectangle(44, 18, 344, 86, COLORS.panel, 0.96).setOrigin(0, 0).setStrokeStyle(2, COLORS.panelEdge, 1);
    this.add.rectangle(414, 18, 452, 92, COLORS.panel, 0.96).setOrigin(0, 0).setStrokeStyle(2, COLORS.panelEdge, 1);
    this.add.rectangle(888, 18, 348, 86, COLORS.panel, 0.96).setOrigin(0, 0).setStrokeStyle(2, COLORS.panelEdge, 1);
    this.add.rectangle(44, 630, 424, 72, COLORS.panel, 0.94).setOrigin(0, 0).setStrokeStyle(2, COLORS.panelEdge, 1);
    this.add.rectangle(752, 630, 484, 72, COLORS.panel, 0.94).setOrigin(0, 0).setStrokeStyle(2, COLORS.panelEdge, 1);
  }

  private paintArena(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);

    const graphics = this.add.graphics();
    graphics.fillStyle(0x0d1520, 1);
    graphics.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    graphics.fillStyle(this.currentEncounter.arenaFill, 1);
    graphics.fillRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
    graphics.lineStyle(3, this.currentEncounter.arenaEdge, 0.95);
    graphics.strokeRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
    graphics.lineStyle(1, 0x314555, 0.18);

    for (let x = ARENA.x + 52; x < ARENA.x + ARENA.width; x += 52) {
      graphics.lineBetween(x, ARENA.y, x, ARENA.y + ARENA.height);
    }

    for (let y = ARENA.y + 52; y < ARENA.y + ARENA.height; y += 52) {
      graphics.lineBetween(ARENA.x, y, ARENA.x + ARENA.width, y);
    }
  }

  private hasTraining(modifierId: RunModifierId): boolean {
    return gameManager.hasOwnedRunModifier(modifierId);
  }

  private getTrainingHudLabel(): string {
    const owned = gameManager.getOwnedRunModifierDefinitions();

    if (owned.length === 0) {
      return "No Training";
    }

    const latest = gameManager.getActiveRunModifierDefinition()?.name ?? owned[owned.length - 1]?.name ?? "Training";
    return owned.length === 1 ? latest : `${latest} +${owned.length - 1}`;
  }

  private getCurrentComboMode(): { label: string; tier: 0 | 1 | 2 | 3 } {
    if (this.comboCount >= 6) {
      return { label: "Dominion", tier: 3 };
    }

    if (this.comboCount >= 4) {
      return { label: "Press", tier: 2 };
    }

    if (this.comboCount >= 2) {
      return { label: "Flow", tier: 1 };
    }

    return { label: "Calm", tier: 0 };
  }

  private getReferenceAttackProfile(): AttackProfile {
    return this.activeAttack?.profile ?? this.controller.getCurrentAttackSignal()?.profile ?? this.currentStats.lightAttack;
  }

  private getIdealMeasure(profile: AttackProfile): { ideal: number; tolerance: number } {
    const comboMode = this.getCurrentComboMode();
    const ideal = profile.shape === "thrust" ? profile.range * 0.84 : profile.range * 0.7;
    let tolerance = profile.shape === "thrust" ? 20 : Math.max(20, profile.width * 0.24);

    if (comboMode.tier >= 3) {
      tolerance += 8;
    }

    if (this.hasTraining("measuredApproach")) {
      tolerance += 8;
    }

    return { ideal, tolerance };
  }

  private getAttackFootprint(signal: AttackExecutionSignal): {
    length: number;
    width: number;
    offset: number;
    near: number;
    far: number;
  } {
    const rangeAnchor = signal.rangeAnchor ?? signal.profile.range;
    const rangeDelta = signal.profile.range - rangeAnchor;
    let baseLength = 0;
    let baseWidth = 0;
    let baseOffset = 0;

    if (signal.profile.delivery === "ranged") {
      baseLength = Math.max(28, rangeAnchor * 0.22);
      baseWidth = Math.max(10, signal.profile.width * 0.9);
      baseOffset = rangeAnchor * 0.72;
    } else if (signal.profile.attackClass === "lunge") {
      baseLength = rangeAnchor * 0.62;
      baseWidth = Math.max(12, signal.profile.width * 0.82);
      baseOffset = rangeAnchor * 0.56;
    } else if (signal.profile.attackClass === "cleave") {
      baseLength = rangeAnchor * 0.74;
      baseWidth = Math.max(18, signal.profile.width * 0.96);
      baseOffset = rangeAnchor * 0.32;
    } else if (signal.profile.shape === "thrust") {
      baseLength = rangeAnchor * 0.68;
      baseWidth = Math.max(10, signal.profile.width * 0.8);
      baseOffset = rangeAnchor * 0.48;
    } else {
      baseLength = rangeAnchor * 0.8;
      baseWidth = Math.max(18, signal.profile.width * 0.92);
      baseOffset = rangeAnchor * 0.36;
    }

    const near = baseOffset - baseLength * 0.5;
    const far = Math.max(near + 12, baseOffset + baseLength * 0.5 + rangeDelta);
    const length = Math.max(12, far - near);
    const offset = near + length * 0.5;

    return {
      length,
      width: baseWidth,
      offset,
      near,
      far
    };
  }

  private drawMeasureGuide(): void {
    if (!this.measureGraphics || !this.enemy?.alive) {
      this.measureGraphics?.clear();
      return;
    }

    const profile = this.getReferenceAttackProfile();
    const { ideal, tolerance } = this.getIdealMeasure(profile);
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.enemy.x, this.enemy.y);
    const within = Math.abs(distance - ideal) <= tolerance;
    const tooClose = distance < ideal - tolerance;
    const color = within ? COLORS.success : tooClose ? COLORS.danger : 0x82a8c8;

    this.measureGraphics.clear();
    this.measureGraphics.lineStyle(2, color, 0.44);
    this.measureGraphics.lineBetween(this.player.x, this.player.y, this.enemy.x, this.enemy.y);
  }

  private drawEnemyTelegraph(): void {
    if (!this.telegraphGraphics) {
      return;
    }

    this.telegraphGraphics.clear();

    const signal = this.enemy?.getTelegraphSignal();

    if (!signal) {
      return;
    }

    const center = this.getAttackCenter(this.enemy.x, this.enemy.y, signal);
    const footprint = this.getAttackFootprint(signal);
    const halfWidth = footprint.length * 0.5;
    const halfHeight = footprint.width * 0.5;

    if (signal.profile.delivery === "ranged") {
      this.telegraphGraphics.lineStyle(2, 0xf2c38a, 0.46);
      this.telegraphGraphics.lineBetween(this.enemy.x, this.enemy.y, center.x, center.y);
      this.telegraphGraphics.strokeEllipse(center.x, center.y, footprint.length, footprint.width + 6);
      return;
    }

    const localCorners = [
      new Phaser.Math.Vector2(-halfWidth, -halfHeight),
      new Phaser.Math.Vector2(halfWidth, -halfHeight),
      new Phaser.Math.Vector2(halfWidth, halfHeight),
      new Phaser.Math.Vector2(-halfWidth, halfHeight)
    ].map((point) => point.rotate(signal.angle).add(center));

    this.telegraphGraphics.lineStyle(2, 0xf2c38a, 0.34);
    this.telegraphGraphics.beginPath();
    this.telegraphGraphics.moveTo(localCorners[0].x, localCorners[0].y);
    localCorners.slice(1).forEach((corner) => this.telegraphGraphics.lineTo(corner.x, corner.y));
    this.telegraphGraphics.closePath();
    this.telegraphGraphics.strokePath();
    this.telegraphGraphics.lineStyle(1, 0xf6d7aa, 0.44);
    this.telegraphGraphics.lineBetween(this.enemy.x, this.enemy.y, center.x, center.y);
  }

  private pushFeedback(text: string, color: number = COLORS.gold): void {
    this.lastFeedback = text;
    this.feedbackColor = color;
    this.feedbackRemaining = 900;
    this.guidanceText.setColor(colorHex(color));
    this.guidanceText.setText(text);
  }

  private applyHitStop(durationMs: number): void {
    if (durationMs <= 0) {
      return;
    }

    this.hitStopRemaining = Math.max(this.hitStopRemaining, durationMs);
    this.physics.world.pause();
  }

  private preparePlayerAttackSignal(signal: AttackExecutionSignal): AttackExecutionSignal {
    const techniques = this.currentStats.sword.techniques;
    const comboMode = this.getCurrentComboMode();
    const profile = {
      ...signal.profile
    };

    profile.damage += this.currentStats.damageBonus;
    profile.range += this.currentStats.reachBonus;

    if (profile.shape === "thrust") {
      profile.range += techniques.thrustRangeBonus ?? 0;

      if (signal.kind === "heavy") {
        profile.lunge += techniques.heavyThrustLungeBonus ?? 0;
      }

      if (this.postBindRewardRemaining > 0 && this.postBindThrustCharges > 0) {
        profile.range += (techniques.postBindThrustRangeBonus ?? 0) + (techniques.perfectBindThrustRangeBonus ?? 0);
        profile.damage += (techniques.postBindThrustDamageBonus ?? 0) + (techniques.perfectBindThrustDamageBonus ?? 0);
        profile.lunge += techniques.perfectBindThrustLungeBonus ?? 0;
        this.postBindThrustCharges -= 1;
      }
    }

    if (profile.shape === "sweep") {
      profile.width += techniques.sweepWidthBonus ?? 0;
    }

    if (signal.kind === "heavy") {
      const impactMultiplier =
        (techniques.heavyPushMultiplier ?? 1) *
        (techniques.heavyKnockbackMultiplier ?? 1) *
        (profile.shape === "thrust" ? (techniques.heavyCarryMultiplier ?? 1) : 1);

      profile.impact = {
        ...profile.impact,
        displacement: Math.round(profile.impact.displacement * impactMultiplier),
        controlLossMs: Math.round(profile.impact.controlLossMs * Math.max(1, impactMultiplier * 0.9)),
        interruptChance: Math.min(0.98, profile.impact.interruptChance + 0.08)
      };
    }

    if (this.postBindRewardRemaining > 0 && this.nextAttackBonusDamage > 0) {
      profile.damage += this.nextAttackBonusDamage;
      this.nextAttackBonusDamage = 0;
    }

    if (this.recentDashAttackWindowRemaining > 0 && techniques.dashRecoveryScale) {
      profile.recovery = Math.max(48, Math.round(profile.recovery * techniques.dashRecoveryScale));
    }

    if (this.hasTraining("longStep") && profile.attackClass === "lunge") {
      profile.lunge += 24;
    }

    if (this.hasTraining("narrowGate") && signal.kind === "heavy") {
      profile.damage += 4;
      profile.commitWeight = Math.min(1, profile.commitWeight + 0.08);
    }

    if (this.hasTraining("bloodRush") && this.controller.getStatus().stamina >= this.currentStats.staminaMax * 0.7) {
      profile.recovery = Math.max(44, profile.recovery - 10);
    }

    if (comboMode.tier >= 2) {
      profile.impact = {
        ...profile.impact,
        controlLossMs: profile.impact.controlLossMs + 18,
        interruptChance: Math.min(0.98, profile.impact.interruptChance + 0.06)
      };
    }

    if (comboMode.tier >= 3) {
      profile.commitWeight = Math.max(0.24, profile.commitWeight - 0.06);
    }

    return {
      ...signal,
      profile
    };
  }

  private openAttackWindow(signal: AttackExecutionSignal): void {
    this.closeAttackWindow();
    this.applyAttackActivationAdjustments(signal);
    this.activeAttack = signal;
    this.attackResolved = false;
    this.activeAttackVisual = this.createAttackVisual(signal, false).setDepth(4);
    this.syncAttackVisual(this.activeAttackVisual, this.player.x, this.player.y, signal);
    this.spawnAttackFlash(this.player.x, this.player.y, signal, false);
    this.tweens.add({
      targets: this.activeAttackVisual,
      alpha: 0.05,
      scaleX: 1.08,
      scaleY: 1.05,
      duration: signal.profile.active,
      ease: "Quad.out"
    });
  }

  private openEnemyAttackWindow(signal: AttackExecutionSignal): void {
    this.closeEnemyAttackWindow();

    if (signal.profile.delivery === "ranged") {
      this.spawnAttackFlash(this.enemy.x, this.enemy.y, signal, true);
      this.launchEnemyProjectile(signal);
      return;
    }

    this.enemyActiveAttack = signal;
    this.enemyAttackResolved = false;
    this.enemyAttackVisual = this.createAttackVisual(signal, true).setDepth(4);
    this.syncAttackVisual(this.enemyAttackVisual, this.enemy.x, this.enemy.y, signal);
    this.spawnAttackFlash(this.enemy.x, this.enemy.y, signal, true);
    this.tweens.add({
      targets: this.enemyAttackVisual,
      alpha: 0.06,
      scaleX: 1.06,
      scaleY: 1.04,
      duration: signal.profile.active,
      ease: "Quad.out"
    });
  }

  private createAttackVisual(signal: AttackExecutionSignal, enemyOwned: boolean): Phaser.GameObjects.Container {
    const pieces: Phaser.GameObjects.GameObject[] = [];
    const strokeColor = enemyOwned ? 0xf0bbb7 : 0xf2e7d8;
    const attackAlpha = enemyOwned ? 0.2 : 0.18;
    const footprint = this.getAttackFootprint(signal);

    if (signal.profile.delivery === "ranged") {
      pieces.push(...this.createRangedProjectilePieces(signal, enemyOwned, footprint.length, footprint.width, strokeColor));
    } else if (signal.profile.attackClass === "lunge" || signal.profile.shape === "thrust") {
      const lane = this.add
        .rectangle(0, 0, footprint.length, footprint.width, signal.profile.tint, attackAlpha)
        .setStrokeStyle(2, strokeColor, 0.28)
        .setOrigin(0.5, 0.5);
      const tip = this.add.circle(footprint.length * 0.44, 0, Math.max(6, footprint.width * 0.42), signal.profile.tint, enemyOwned ? 0.24 : 0.26);
      const rail = this.add.rectangle(footprint.length * 0.1, 0, footprint.length * 0.44, Math.max(4, footprint.width * 0.34), 0xf5ead8, 0.18);
      pieces.push(lane, tip);
      if (signal.profile.attackClass === "lunge") {
        pieces.push(rail);
      }
    } else {
      const sweep = this.add
        .rectangle(0, 0, footprint.length, footprint.width, signal.profile.tint, signal.profile.attackClass === "cleave" ? 0.24 : 0.17)
        .setStrokeStyle(2, strokeColor, 0.24)
        .setOrigin(0.35, 0.5);
      const tail = this.add.rectangle(-footprint.length * 0.18, 0, footprint.length * 0.3, footprint.width * 0.56, signal.profile.tint, enemyOwned ? 0.12 : 0.14);
      pieces.push(sweep, tail);
      if (signal.profile.attackClass === "cleave") {
        const edge = this.add.rectangle(footprint.length * 0.16, 0, footprint.length * 0.46, Math.max(10, footprint.width * 0.34), 0xf4d6b0, 0.14);
        pieces.push(edge);
      }
    }

    return this.add.container(0, 0, pieces);
  }

  private createRangedProjectilePieces(
    signal: AttackExecutionSignal,
    enemyOwned: boolean,
    length: number,
    width: number,
    strokeColor: number
  ): Phaser.GameObjects.GameObject[] {
    const pieces: Phaser.GameObjects.GameObject[] = [];
    const enemyStyle = enemyOwned ? getEnemyDefinition(this.currentEncounter.enemyId).visualStyle : "archer";
    const coreColor = signal.profile.tint;
    const highlightColor = enemyStyle === "caster" ? 0xf4fff6 : 0xf7edd6;
    const headHalf = Math.max(5, width * 0.46);
    const shaftWidth = Math.max(4, width * 0.34);
    const tailWidth = Math.max(4, width * 0.28);

    if (enemyStyle === "caster") {
      const tail = this.add.triangle(
        -length * 0.26,
        0,
        -length * 0.24,
        0,
        length * 0.08,
        -Math.max(6, width * 0.42),
        length * 0.08,
        Math.max(6, width * 0.42),
        strokeColor,
        0.3
      );
      const halo = this.add.circle(-length * 0.04, 0, Math.max(8, width * 0.48), strokeColor, 0.18);
      const core = this.add.circle(0, 0, Math.max(6, width * 0.36), coreColor, 0.92).setStrokeStyle(2, highlightColor, 0.34);
      const spark = this.add.circle(length * 0.22, 0, Math.max(3, width * 0.18), highlightColor, 0.72);
      pieces.push(tail, halo, core, spark);
      return pieces;
    }

    if (enemyStyle === "raider") {
      const trail = this.add.rectangle(-length * 0.34, 0, length * 0.34, tailWidth, strokeColor, 0.18);
      const grip = this.add.rectangle(-length * 0.08, 0, length * 0.32, shaftWidth, coreColor, 0.44).setStrokeStyle(2, strokeColor, 0.26);
      const spike = this.add.triangle(
        length * 0.26,
        0,
        -length * 0.18,
        -headHalf,
        length * 0.22,
        0,
        -length * 0.18,
        headHalf,
        highlightColor,
        0.82
      );
      const rearFin = this.add.triangle(
        -length * 0.34,
        0,
        -length * 0.14,
        0,
        length * 0.06,
        -Math.max(5, width * 0.36),
        length * 0.06,
        Math.max(5, width * 0.36),
        strokeColor,
        0.44
      );
      pieces.push(trail, grip, rearFin, spike);
      return pieces;
    }

    const wake = this.add.rectangle(-length * 0.34, 0, length * 0.44, tailWidth, strokeColor, 0.16);
    const shaft = this.add
      .rectangle(-length * 0.04, 0, length * 0.72, shaftWidth, coreColor, enemyOwned ? 0.42 : 0.34)
      .setStrokeStyle(2, strokeColor, 0.26)
      .setOrigin(0.5, 0.5);
    const tip = this.add.triangle(
      length * 0.32,
      0,
      -length * 0.08,
      -headHalf,
      length * 0.18,
      0,
      -length * 0.08,
      headHalf,
      highlightColor,
      0.84
    );
    const upperFletch = this.add.triangle(
      -length * 0.32,
      -Math.max(2, width * 0.08),
      -length * 0.12,
      0,
      length * 0.08,
      -Math.max(5, width * 0.34),
      length * 0.08,
      0,
      strokeColor,
      0.42
    );
    const lowerFletch = this.add.triangle(
      -length * 0.32,
      Math.max(2, width * 0.08),
      -length * 0.12,
      0,
      length * 0.08,
      Math.max(5, width * 0.34),
      length * 0.08,
      0,
      strokeColor,
      0.42
    );
    pieces.push(wake, shaft, upperFletch, lowerFletch, tip);
    return pieces;
  }

  private closeAttackWindow(signal?: AttackExecutionSignal): void {
    const activeSignal = signal ?? this.activeAttack;

    if (activeSignal && this.activeAttack && activeSignal.id === this.activeAttack.id && !this.attackResolved && !this.combatLocked) {
      this.handlePlayerAttackMiss(activeSignal);
    }

    this.activeAttack = null;
    this.attackResolved = false;
    this.activeAttackVisual?.destroy();
    this.activeAttackVisual = null;
  }

  private closeEnemyAttackWindow(): void {
    this.enemyActiveAttack = null;
    this.enemyAttackResolved = false;
    this.enemyAttackVisual?.destroy();
    this.enemyAttackVisual = null;
  }

  private launchEnemyProjectile(signal: AttackExecutionSignal): void {
    const footprint = this.getAttackFootprint(signal);
    const origin = this.getProjectileSourcePoint(this.enemy.x, this.enemy.y, signal, true);
    const projectileVisual = this.createAttackVisual(signal, true).setDepth(8);

    projectileVisual.setPosition(origin.x, origin.y);
    projectileVisual.setRotation(signal.angle);

    this.enemyProjectiles.push({
      visual: projectileVisual,
      signal,
      x: origin.x,
      y: origin.y,
      speed: Math.max(380, signal.profile.range * 2.12),
      width: Math.max(10, footprint.width),
      length: Math.max(28, footprint.length),
      travelled: 0,
      maxTravel: signal.profile.range * 1.18
    });
  }

  private updateEnemyProjectiles(delta: number): void {
    if (this.enemyProjectiles.length === 0) {
      return;
    }

    const travelStep = delta / 1000;

    for (let index = this.enemyProjectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.enemyProjectiles[index];

      if (!projectile) {
        continue;
      }

      const stepDistance = projectile.speed * travelStep;

      projectile.travelled += stepDistance;
      projectile.x += projectile.signal.direction.x * stepDistance;
      projectile.y += projectile.signal.direction.y * stepDistance;
      projectile.visual.setPosition(projectile.x, projectile.y);
      projectile.visual.setRotation(projectile.signal.angle);

      const outOfBounds =
        projectile.x < ARENA.x - 48 ||
        projectile.x > ARENA.x + ARENA.width + 48 ||
        projectile.y < ARENA.y - 48 ||
        projectile.y > ARENA.y + ARENA.height + 48 ||
        projectile.travelled >= projectile.maxTravel;

      if (outOfBounds) {
        projectile.visual.destroy();
        this.enemyProjectiles.splice(index, 1);
        continue;
      }

      if (!this.targetInsideProjectile(projectile, this.player.x, this.player.y, 18)) {
        continue;
      }

      const playerStatus = this.controller.getStatus();

      if (playerStatus.isParrying) {
        const perfectBind = this.isPerfectBind(playerStatus);
        const bindImpactMultiplier = this.currentStats.sword.techniques.bindImpactMultiplier ?? 1;
        const reflectedDamage = Math.max(1, Math.round(projectile.signal.profile.damage * this.currentStats.parryReflectRatio));
        const reflectedDirection = {
          x: -projectile.signal.direction.x,
          y: -projectile.signal.direction.y
        };
        const reflectedImpact = {
          ...projectile.signal.profile.impact,
          displacement: Math.round(projectile.signal.profile.impact.displacement * (perfectBind ? 0.78 : 0.64) * bindImpactMultiplier),
          controlLossMs: Math.round(projectile.signal.profile.impact.controlLossMs * (perfectBind ? 1.08 : 0.9) * bindImpactMultiplier),
          interruptChance: Math.min(0.98, projectile.signal.profile.impact.interruptChance + (perfectBind ? 0.22 : 0.12)),
          hitstopMs: perfectBind ? 40 : 28
        };

        this.controller.resolveParrySuccess();
        projectile.visual.destroy();
        this.enemyProjectiles.splice(index, 1);

        const didKill = this.enemy.takeDamage(reflectedDamage, reflectedDirection, reflectedImpact);

        if (!didKill) {
          this.enemy.stun(this.currentStats.parryStunMs + (perfectBind ? 72 : 24));
          this.applyBindRewards(perfectBind);
        }

        this.spawnParryFx(this.player.x, this.player.y, projectile.x, projectile.y);
        this.cameras.main.shake(86, perfectBind ? 0.0036 : 0.003);
        this.applyHitStop(perfectBind ? 40 : 28);
        this.pushFeedback(perfectBind ? "Perfect bind" : "Shot turned aside", COLORS.gold);

        if (didKill) {
          this.onEnemyDefeated();
          return;
        }

        continue;
      }

      projectile.visual.destroy();
      this.enemyProjectiles.splice(index, 1);

      if (this.playerInvulnRemaining <= 0) {
        this.damagePlayer(projectile.signal.profile.damage, projectile.signal.direction, projectile.signal.profile.impact);

        if (this.combatLocked || this.transitioningOut) {
          return;
        }
      }
    }
  }

  private clearEnemyProjectiles(): void {
    for (const projectile of this.enemyProjectiles) {
      projectile.visual.destroy();
    }

    this.enemyProjectiles = [];
  }

  private spawnEnemyHazard(signal: EnemyHazardSignal): void {
    const overlap = this.enemyHazards.some(
      (hazard) => Phaser.Math.Distance.Between(hazard.signal.x, hazard.signal.y, signal.x, signal.y) <= Math.max(hazard.signal.radius, signal.radius)
    );

    if (overlap) {
      return;
    }

    const ring = this.add.circle(0, 0, signal.radius, signal.tint, signal.kind === "bearTrap" ? 0.14 : 0.12).setStrokeStyle(2, signal.tint, 0.5);
    const core = this.add.circle(0, 0, Math.max(6, signal.radius * 0.26), signal.tint, signal.kind === "bearTrap" ? 0.4 : 0.26);
    const markerA =
      signal.kind === "bearTrap"
        ? this.add.triangle(-signal.radius * 0.2, 0, 0, -8, 12, 0, 0, 8, 0xf3ead8, 0.86)
        : this.add.rectangle(0, 0, signal.radius * 1.18, 5, 0xe6f4ce, 0.82).setAngle(35);
    const markerB =
      signal.kind === "bearTrap"
        ? this.add.triangle(signal.radius * 0.2, 0, 0, -8, -12, 0, 0, 8, 0xf3ead8, 0.86)
        : this.add.rectangle(0, 0, signal.radius * 1.18, 5, 0xe6f4ce, 0.82).setAngle(-35);
    const visual = this.add.container(signal.x, signal.y, [ring, core, markerA, markerB]).setDepth(8).setAlpha(0.6);

    this.enemyHazards.push({
      visual,
      signal,
      armDelayRemaining: signal.armDelayMs,
      durationRemaining: signal.durationMs
    });
  }

  private updateEnemyHazards(delta: number): void {
    if (this.enemyHazards.length === 0) {
      return;
    }

    for (let index = this.enemyHazards.length - 1; index >= 0; index -= 1) {
      const hazard = this.enemyHazards[index];

      if (!hazard) {
        continue;
      }

      hazard.armDelayRemaining = Math.max(0, hazard.armDelayRemaining - delta);
      hazard.durationRemaining = Math.max(0, hazard.durationRemaining - delta);

      if (hazard.durationRemaining === 0) {
        hazard.visual.destroy();
        this.enemyHazards.splice(index, 1);
        continue;
      }

      const armed = hazard.armDelayRemaining === 0;
      const pulse = 1 + Math.sin((this.time.now + index * 80) / 110) * (armed ? 0.05 : 0.03);

      hazard.visual.setScale(pulse);
      hazard.visual.setAlpha(armed ? 0.92 : 0.5);

      if (!armed || this.playerInvulnRemaining > 0) {
        continue;
      }

      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.signal.x, hazard.signal.y) > hazard.signal.radius + 12) {
        continue;
      }

      this.triggerEnemyHazard(hazard);
      hazard.visual.destroy();
      this.enemyHazards.splice(index, 1);

      if (this.combatLocked || this.transitioningOut) {
        return;
      }
    }
  }

  private triggerEnemyHazard(hazard: EnemyHazardState): void {
    const direction = new Phaser.Math.Vector2(this.player.x - hazard.signal.x, this.player.y - hazard.signal.y);

    if (direction.lengthSq() <= 0.001) {
      direction.set(0, -1);
    } else {
      direction.normalize();
    }

    const impact: HitImpactProfile = {
      displacement: hazard.signal.kind === "bearTrap" ? 18 : 8,
      controlLossMs: hazard.signal.controlLockMs,
      interruptChance: 0.18,
      hitstopMs: hazard.signal.kind === "bearTrap" ? 20 : 14,
      cameraShake: hazard.signal.kind === "bearTrap" ? 0.0026 : 0.0018
    };

    this.damagePlayer(
      hazard.signal.damage,
      {
        x: direction.x,
        y: direction.y
      },
      impact
    );

    if (!this.combatLocked) {
      this.controller.applyControlLock(hazard.signal.controlLockMs);
      this.player.body.setVelocity(0, 0);
      this.spawnImpactFx(hazard.signal.x, hazard.signal.y, hazard.signal.tint, { x: direction.x, y: direction.y }, impact);
      this.pushFeedback(hazard.signal.triggerText, COLORS.danger);
    }
  }

  private clearEnemyHazards(): void {
    for (const hazard of this.enemyHazards) {
      hazard.visual.destroy();
    }

    this.enemyHazards = [];
  }

  private updateAttackWindow(): void {
    if (!this.activeAttack || !this.activeAttackVisual) {
      return;
    }

    this.syncAttackVisual(this.activeAttackVisual, this.player.x, this.player.y, this.activeAttack);

    if (!this.attackResolved && this.enemy.alive && this.targetInsideAttack(this.player.x, this.player.y, this.enemy.x, this.enemy.y, this.activeAttack, this.currentEncounter.enemySize * 0.34)) {
      this.attackResolved = true;
      const resolvedHit = this.resolvePlayerHit(this.activeAttack);
      const didKill = this.enemy.takeDamage(resolvedHit.damage, this.activeAttack.direction, resolvedHit.impact);
      this.closeEnemyAttackWindow();

      if (!didKill) {
        if (resolvedHit.bleedDamage > 0 && resolvedHit.bleedDurationMs > 0) {
          this.enemy.applyBleed(resolvedHit.bleedDamage, resolvedHit.bleedDurationMs);
        }

        if (resolvedHit.slowDurationMs > 0 && resolvedHit.slowFactor < 1) {
          this.enemy.applySlow(resolvedHit.slowDurationMs, resolvedHit.slowFactor);
        }

        if (resolvedHit.stunMs > 0) {
          this.enemy.stun(resolvedHit.stunMs);
        }
      }

      this.spawnImpactFx(this.enemy.x, this.enemy.y, this.activeAttack.profile.tint, this.activeAttack.direction, resolvedHit.impact);
      this.cameras.main.shake(70, resolvedHit.impact.cameraShake);
      this.applyHitStop(resolvedHit.impact.hitstopMs);
      this.pushFeedback(resolvedHit.cause, resolvedHit.feedbackColor);
      this.onPlayerHitResolved(this.activeAttack, resolvedHit);

      if (didKill) {
        this.onEnemyDefeated();
      }
    }
  }

  private updateEnemyAttackWindow(): void {
    if (!this.enemyActiveAttack || !this.enemyAttackVisual) {
      return;
    }

    this.syncAttackVisual(this.enemyAttackVisual, this.enemy.x, this.enemy.y, this.enemyActiveAttack);

    if (this.playerInvulnRemaining > 0 || this.enemyAttackResolved) {
      return;
    }

    if (this.targetInsideAttack(this.enemy.x, this.enemy.y, this.player.x, this.player.y, this.enemyActiveAttack, 18)) {
      const playerStatus = this.controller.getStatus();

      if (playerStatus.isParrying) {
        const perfectBind = this.isPerfectBind(playerStatus);
        const enemyDefinition = getEnemyDefinition(this.currentEncounter.enemyId);
        const beastBind = enemyDefinition.visualStyle === "beast";
        const bindImpactMultiplier = this.currentStats.sword.techniques.bindImpactMultiplier ?? 1;
        const reflectedDamage = Math.max(1, Math.round(this.enemyActiveAttack.profile.damage * this.currentStats.parryReflectRatio));
        const reflectedDirection = {
          x: -this.enemyActiveAttack.direction.x,
          y: -this.enemyActiveAttack.direction.y
        };
        const reflectedImpact = {
          ...this.enemyActiveAttack.profile.impact,
          displacement: Math.round(
            this.enemyActiveAttack.profile.impact.displacement *
              (beastBind ? (perfectBind ? 1.28 : 1.1) : perfectBind ? 0.82 : 0.7) * bindImpactMultiplier
          ),
          controlLossMs: Math.round(
            this.enemyActiveAttack.profile.impact.controlLossMs *
              (beastBind ? (perfectBind ? 1.32 : 1.08) : perfectBind ? 1.06 : 0.84) * bindImpactMultiplier
          ),
          interruptChance: Math.min(0.98, this.enemyActiveAttack.profile.impact.interruptChance + (perfectBind ? 0.18 : 0.08)),
          hitstopMs: perfectBind ? 42 : 32
        };

        this.controller.resolveParrySuccess();
        this.closeEnemyAttackWindow();

        const didKill = this.enemy.takeDamage(reflectedDamage, reflectedDirection, reflectedImpact);

        if (!didKill) {
          this.enemy.stun(this.currentStats.parryStunMs + (perfectBind ? 60 : 0) + (beastBind ? 70 : 0));
          this.applyBindRewards(perfectBind);
        }

        this.spawnParryFx(this.player.x, this.player.y, this.enemy.x, this.enemy.y);
        this.cameras.main.shake(90, 0.0034);
        this.applyHitStop(perfectBind ? 42 : 30);
        this.pushFeedback(perfectBind ? "Perfect bind" : "Bind won", COLORS.gold);

        if (didKill) {
          this.onEnemyDefeated();
        }

        return;
      }

      this.enemyAttackResolved = true;
      this.damagePlayer(
        this.enemyActiveAttack.profile.damage,
        this.enemyActiveAttack.direction,
        this.enemyActiveAttack.profile.impact
      );
    }
  }

  private applyAttackActivationAdjustments(signal: AttackExecutionSignal): void {
    const techniques = this.currentStats.sword.techniques;

    if (signal.kind === "heavy" && signal.fullyCharged && techniques.chargedHeavyBonus) {
      signal.profile.damage += techniques.chargedHeavyBonus;
    }
  }

  private handlePlayerAttackMiss(signal: AttackExecutionSignal): void {
    const techniques = this.currentStats.sword.techniques;
    let recoveryScale = techniques.missRecoveryScale ?? 1;
    let feedback = "Whiffed";

    if (signal.profile.shape === "thrust") {
      recoveryScale = Math.min(recoveryScale, techniques.thrustMissRecoveryScale ?? 1);
      feedback = "Missed the line";
    }

    if (this.recentDashAttackWindowRemaining > 0 && techniques.dashRecoveryScale) {
      recoveryScale *= techniques.dashRecoveryScale;
    }

    recoveryScale *= 1 + signal.profile.commitWeight * 0.18;

    if (recoveryScale !== 1) {
      this.controller.scaleCurrentRecovery(recoveryScale);
    }

    this.thrustStreak = 0;
    this.comboTimerRemaining = 0;
    this.resetCombo();
    this.pushFeedback(feedback, COLORS.subtext);
  }

  private resolvePlayerHit(signal: AttackExecutionSignal): {
    damage: number;
    impact: HitImpactProfile;
    stunMs: number;
    slowFactor: number;
    slowDurationMs: number;
    bleedDamage: number;
    bleedDurationMs: number;
    measured: boolean;
    initiative: boolean;
    cause: string;
    feedbackColor: number;
  } {
    const techniques = this.currentStats.sword.techniques;
    const enemyState = this.enemy.getCombatSnapshot();
    const enemyHealth = this.enemy.health;
    const enemyDefinition = getEnemyDefinition(this.currentEncounter.enemyId);
    let damage = signal.profile.damage;
    let impact: HitImpactProfile = {
      ...signal.profile.impact
    };
    let stunMs = signal.kind === "heavy" ? (techniques.heavyStunMs ?? 0) : 0;
    let slowFactor = 1;
    let slowDurationMs = 0;
    let bleedDamage = 0;
    let bleedDurationMs = 0;
    let cause = signal.profile.attackClass === "cleave" ? "Cleave caught" : signal.profile.attackClass === "lunge" ? "Lunge landed" : "Clean hit";
    let feedbackColor = signal.profile.attackClass === "lunge" ? 0xaec8e2 : signal.profile.attackClass === "cleave" ? 0xd9a56f : COLORS.success;

    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.enemy.x, this.enemy.y);
    const idealDistance = signal.profile.shape === "thrust" ? signal.profile.range * 0.84 : signal.profile.range * 0.68;
    const { tolerance: measureTolerance } = this.getIdealMeasure(signal.profile);
    const measureError = Math.abs(distance - idealDistance);
    const measured = measureError <= measureTolerance;
    const initiative = enemyState.phase === "windup" || enemyState.phase === "recovery";

    if (measured) {
      damage += (signal.profile.shape === "thrust" ? 6 : 4) + (techniques.measureBonusDamage ?? 0);
      impact = {
        ...impact,
        displacement: impact.displacement + (signal.kind === "heavy" ? 24 : 12),
        controlLossMs: impact.controlLossMs + 24
      };
      cause = "Measured strike";
      feedbackColor = COLORS.success;
    } else if (distance < idealDistance * 0.48) {
      damage = Math.max(1, damage - 2);
      cause = "Too close";
      feedbackColor = COLORS.danger;
    }

    if (initiative) {
      damage += enemyState.phase === "windup" ? 4 : 2;
      impact = {
        ...impact,
        interruptChance: Math.min(0.98, impact.interruptChance + 0.08)
      };
      if (cause === "Clean hit") {
        cause = "Initiative taken";
        feedbackColor = COLORS.gold;
      }
    }

    if (
      this.lastSuccessfulAttackKind === signal.kind &&
      this.lastSuccessfulAttackShape === signal.profile.shape &&
      !measured &&
      this.postBindRewardRemaining === 0
    ) {
      damage = Math.max(1, damage - 2);
    }

    if (this.firstBloodAvailable) {
      damage += techniques.firstHitBonusDamage ?? 0;
    }

    if (enemyDefinition.visualStyle === "polearm" && techniques.bonusDamageVsPolearm) {
      damage += techniques.bonusDamageVsPolearm;
      cause = "Pole broken";
      feedbackColor = COLORS.gold;
    }

    if (this.currentEncounter.armor === "light" && techniques.bonusDamageVsLightArmor) {
      damage += techniques.bonusDamageVsLightArmor;
      if (cause === "Clean hit") {
        cause = "Armor opened";
        feedbackColor = COLORS.success;
      }
    }

    if (techniques.alternateAttackBonus && this.lastSuccessfulAttackKind && this.lastSuccessfulAttackKind !== signal.kind) {
      damage += techniques.alternateAttackBonus;
    }

    if (signal.profile.shape === "thrust" && techniques.thrustStreakDamageStep) {
      damage += this.thrustStreak * techniques.thrustStreakDamageStep;
    }

    if (this.recentDashAttackWindowRemaining > 0) {
      damage += techniques.dashAttackBonus ?? 0;
      impact = {
        ...impact,
        displacement: impact.displacement + 18,
        controlLossMs: impact.controlLossMs + 20
      };
    }

    if (techniques.chargeDamageBonus) {
      const forwardSpeed = this.player.body.velocity.x * signal.direction.x + this.player.body.velocity.y * signal.direction.y;

      if (forwardSpeed > this.currentStats.moveSpeed * 0.72) {
        damage += techniques.chargeDamageBonus;
        if (cause === "Clean hit" || cause === "Measured strike") {
          cause = "Charge broken through";
          feedbackColor = COLORS.gold;
        }
      }
    }

    if (techniques.executeThreshold && enemyHealth.current <= enemyHealth.max * techniques.executeThreshold) {
      damage += techniques.executeDamageBonus ?? 0;
      cause = "Execution line";
      feedbackColor = COLORS.danger;
    }

    if (techniques.criticalChanceBonus && Math.random() < techniques.criticalChanceBonus + (measured ? 0.04 : 0)) {
      damage = Math.round(damage * (techniques.criticalDamageMultiplier ?? 1.4));
      cause = measured ? "Critical measure" : "Critical strike";
      feedbackColor = COLORS.gold;
    }

    damage = Math.max(1, Math.round(damage * this.getArmorDamageScale(this.currentEncounter.armor, signal)));

    if (this.hasTraining("measuredApproach") && measured) {
      impact = {
        ...impact,
        controlLossMs: impact.controlLossMs + 18
      };
    }

    if (this.hasTraining("guardTax") && initiative) {
      impact = {
        ...impact,
        interruptChance: Math.min(0.98, impact.interruptChance + 0.06)
      };
    }

    if (techniques.bleedOnHitDamage && techniques.bleedOnHitDurationMs) {
      bleedDamage += techniques.bleedOnHitDamage + Math.max(0, this.comboCount - 1) * (techniques.bleedStackStep ?? 0);
      bleedDurationMs = Math.max(bleedDurationMs, techniques.bleedOnHitDurationMs);
    }

    if (this.currentStats.onHitBurnDamage > 0 && this.currentStats.onHitBurnDurationMs > 0) {
      bleedDamage += this.currentStats.onHitBurnDamage;
      bleedDurationMs = Math.max(bleedDurationMs, this.currentStats.onHitBurnDurationMs);

      if (cause === "Clean hit") {
        cause = "Burning strike";
        feedbackColor = 0xe38857;
      }
    }

    if (signal.kind === "heavy" && signal.profile.shape === "thrust" && techniques.bleedOnHeavyDamage && techniques.bleedOnHeavyDurationMs) {
      bleedDamage += techniques.bleedOnHeavyDamage;
      bleedDurationMs = Math.max(bleedDurationMs, techniques.bleedOnHeavyDurationMs);
    }

    if (signal.kind === "heavy" && techniques.heavySlowFactor && techniques.heavySlowDurationMs) {
      slowFactor = techniques.heavySlowFactor;
      slowDurationMs = techniques.heavySlowDurationMs;
    }

    if (this.currentStats.onHitSlowFactor < 1 && this.currentStats.onHitSlowDurationMs > 0) {
      slowFactor = Math.min(slowFactor, this.currentStats.onHitSlowFactor);
      slowDurationMs = Math.max(slowDurationMs, this.currentStats.onHitSlowDurationMs);
    }

    return {
      damage,
      impact,
      stunMs,
      slowFactor,
      slowDurationMs,
      bleedDamage,
      bleedDurationMs,
      measured,
      initiative,
      cause,
      feedbackColor
    };
  }

  private onPlayerHitResolved(
    signal: AttackExecutionSignal,
    resolvedHit: {
      measured: boolean;
      initiative: boolean;
    }
  ): void {
    const techniques = this.currentStats.sword.techniques;

    this.registerComboHit();
    this.firstBloodAvailable = false;
    this.lastSuccessfulAttackKind = signal.kind;
    this.lastSuccessfulAttackShape = signal.profile.shape;

    if (signal.profile.shape === "thrust") {
      const maxStacks = techniques.thrustStreakMaxStacks ?? 0;
      this.thrustStreak = maxStacks > 0 ? Math.min(maxStacks, this.thrustStreak + 1) : this.thrustStreak;
    } else {
      this.thrustStreak = 0;
    }

    if (resolvedHit.measured) {
      this.controller.refundDashCooldown(26);
    }

    if (resolvedHit.initiative) {
      this.controller.refundDashCooldown(22);
    }

    const comboMode = this.getCurrentComboMode();

    if (comboMode.tier >= 1) {
      this.controller.refundStamina(signal.kind === "light" ? 5 : 3);
    }

    if (comboMode.tier >= 2) {
      this.controller.applyMoveBoost(1.08, 240);
    }

    if (comboMode.tier >= 3 && resolvedHit.measured) {
      this.controller.refundDashCooldown(42);
      this.controller.refundStamina(8);
    }

    if (this.hasTraining("measuredApproach") && resolvedHit.measured) {
      this.controller.refundStamina(7);
    }

    if (this.hasTraining("ironPulse") && this.controller.getStatus().stamina >= this.currentStats.staminaMax * 0.8) {
      this.controller.refundStamina(2);
    }

    if (techniques.dashRefundOnHit) {
      this.controller.refundDashCooldown(techniques.dashRefundOnHit);
    }

    if (signal.profile.shape === "thrust" && techniques.thrustHitDashRefund) {
      this.controller.refundDashCooldown(techniques.thrustHitDashRefund);
    }

    if (signal.kind === "heavy" && techniques.heavyHitDashRefund) {
      this.controller.refundDashCooldown(techniques.heavyHitDashRefund);
    }

    if (techniques.hitMoveBoostMultiplier && techniques.hitMoveBoostDurationMs) {
      this.controller.applyMoveBoost(techniques.hitMoveBoostMultiplier, techniques.hitMoveBoostDurationMs);
    }

    if (signal.kind === "light" && techniques.lightHitRecoveryScale) {
      this.controller.scaleCurrentRecovery(techniques.lightHitRecoveryScale);
    }

    if (signal.kind === "heavy" && techniques.heavyHitRecoveryScale) {
      this.controller.scaleCurrentRecovery(techniques.heavyHitRecoveryScale);
    }

    this.recentDashAttackWindowRemaining = 0;
  }

  private applyBindRewards(perfectBind: boolean): void {
    const techniques = this.currentStats.sword.techniques;
    const comboMode = this.getCurrentComboMode();

    this.postBindRewardRemaining = 840;
    this.nextAttackBonusDamage = Math.max(this.nextAttackBonusDamage, (techniques.riposteDamageBonus ?? 0) + (techniques.nextAttackAfterBindBonus ?? 0));

    if (techniques.postBindGuardDamageScale && techniques.postBindGuardDamageScale < 1) {
      this.guardDamageScalePending = Math.min(this.guardDamageScalePending, techniques.postBindGuardDamageScale);
    }

    if ((techniques.postBindThrustRangeBonus ?? 0) > 0 || (techniques.postBindThrustDamageBonus ?? 0) > 0) {
      this.postBindThrustCharges = Math.max(this.postBindThrustCharges, 1);
    }

    this.controller.refundStamina(perfectBind ? 12 : 8);

    if (!perfectBind) {
      return;
    }

    if (techniques.healOnPerfectBind) {
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + techniques.healOnPerfectBind);
    }

    if (techniques.perfectBindSlowFactor && techniques.perfectBindSlowDurationMs) {
      this.enemy.applySlow(techniques.perfectBindSlowDurationMs, techniques.perfectBindSlowFactor);
    }

    if (
      (techniques.perfectBindThrustRangeBonus ?? 0) > 0 ||
      (techniques.perfectBindThrustDamageBonus ?? 0) > 0 ||
      (techniques.perfectBindThrustLungeBonus ?? 0) > 0
    ) {
      this.postBindThrustCharges = Math.max(this.postBindThrustCharges, 1);
    }

    this.controller.refundDashCooldown(96 + comboMode.tier * 14);
  }

  private isPerfectBind(playerStatus: ReturnType<CombatController["getStatus"]>): boolean {
    const multiplier = this.currentStats.sword.techniques.perfectBindWindowMultiplier ?? 1;
    const perfectWindow = Math.min(this.currentStats.parryWindow - 14, Math.round(104 * multiplier));
    const threshold = Math.max(18, this.currentStats.parryWindow - perfectWindow);

    return playerStatus.parryWindowRemaining >= threshold;
  }

  private getArmorDamageScale(armor: EnemyArmorTier, signal: AttackExecutionSignal): number {
    const techniques = this.currentStats.sword.techniques;
    const thrust = signal.profile.shape === "thrust";
    const cleave = signal.profile.attackClass === "cleave";
    const lunge = signal.profile.attackClass === "lunge";
    let scale: number;

    if (armor === "unarmored") {
      return lunge ? 0.97 : cleave ? 1.08 : thrust ? 0.99 : 1.04;
    }

    if (armor === "light") {
      scale = lunge ? 1.06 : thrust ? 1.04 : cleave ? 1 : 0.98;
    } else if (thrust && techniques.ignoreArmorOnThrust) {
      scale = 1.12;
    } else if (thrust && signal.kind === "heavy" && signal.fullyCharged) {
      scale = 1.08;
    } else if (thrust) {
      scale = signal.kind === "heavy" || lunge ? 1.02 : 0.9;
    } else {
      scale = cleave ? 0.78 : signal.kind === "heavy" ? 0.82 : 0.7;
    }

    if (techniques.armorPierceRatio) {
      const pierceRatio = Phaser.Math.Clamp(techniques.armorPierceRatio, 0, 0.85);
      const pierceTarget = thrust ? 1.12 : armor === "light" ? 1.04 : 0.96;
      scale = Phaser.Math.Linear(scale, pierceTarget, pierceRatio);
    }

    return scale;
  }

  private formatArmorLabel(armor: EnemyArmorTier): string {
    switch (armor) {
      case "heavy":
        return "Heavy";
      case "light":
        return "Light";
      default:
        return "None";
    }
  }

  private syncAttackVisual(
    visual: Phaser.GameObjects.Container,
    ownerX: number,
    ownerY: number,
    signal: AttackExecutionSignal
  ): void {
    const center = this.getAttackCenter(ownerX, ownerY, signal);
    visual.setPosition(center.x, center.y);
    visual.setRotation(signal.angle);
  }

  private targetInsideAttack(
    ownerX: number,
    ownerY: number,
    targetX: number,
    targetY: number,
    signal: AttackExecutionSignal,
    targetRadius: number
  ): boolean {
    const center = this.getAttackCenter(ownerX, ownerY, signal);
    const dx = targetX - center.x;
    const dy = targetY - center.y;
    const cos = Math.cos(-signal.angle);
    const sin = Math.sin(-signal.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    const footprint = this.getAttackFootprint(signal);
    const halfWidth = footprint.length * 0.5 + targetRadius;
    const halfHeight = footprint.width * 0.5 + targetRadius;

    if (Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight) {
      return true;
    }

    if (signal.profile.delivery === "ranged") {
      return false;
    }

    if (signal.profile.shape === "sweep") {
      const sourceDistance = Phaser.Math.Distance.Between(ownerX, ownerY, targetX, targetY);
      const forwardness = (targetX - ownerX) * signal.direction.x + (targetY - ownerY) * signal.direction.y;
      const lateral = Math.abs((targetX - ownerX) * -signal.direction.y + (targetY - ownerY) * signal.direction.x);
      const lateralAllowance = footprint.width * 0.8 + Math.max(8, footprint.length * 0.08) + targetRadius;

      return (
        sourceDistance <= footprint.far + targetRadius &&
        forwardness >= footprint.near - targetRadius &&
        forwardness <= footprint.far + targetRadius &&
        lateral <= lateralAllowance
      );
    }

    return false;
  }

  private targetInsideProjectile(projectile: EnemyProjectileState, targetX: number, targetY: number, targetRadius: number): boolean {
    const dx = targetX - projectile.x;
    const dy = targetY - projectile.y;
    const cos = Math.cos(-projectile.signal.angle);
    const sin = Math.sin(-projectile.signal.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    const halfWidth = projectile.length * 0.5 + targetRadius;
    const halfHeight = projectile.width * 0.5 + targetRadius;

    return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
  }

  private getAttackCenter(ownerX: number, ownerY: number, signal: AttackExecutionSignal): Phaser.Math.Vector2 {
    const offset = this.getAttackFootprint(signal).offset;

    return new Phaser.Math.Vector2(ownerX + signal.direction.x * offset, ownerY + signal.direction.y * offset);
  }

  private getProjectileSourcePoint(
    ownerX: number,
    ownerY: number,
    signal: AttackExecutionSignal,
    enemyOwned: boolean
  ): Phaser.Math.Vector2 {
    const footprint = this.getAttackFootprint(signal);
    const forwardOffset = enemyOwned
      ? this.currentEncounter.enemySize * 0.32 + footprint.length * 0.3
      : this.currentStats.combatStyle.guardSize * 0.38 + footprint.length * 0.24;

    return new Phaser.Math.Vector2(ownerX + signal.direction.x * forwardOffset, ownerY + signal.direction.y * forwardOffset);
  }

  private isLargeWarBladeStyle(): boolean {
    const style = this.currentStats.combatStyle;
    return style.affinity === "war" && style.bladeLength >= 100;
  }

  private getPlayerAttackPoseTarget(
    signal: AttackExecutionSignal | null,
    phase: ReturnType<CombatController["getCurrentAttackPhase"]>
  ): {
    forward: number;
    side: number;
    rotation: number;
    lengthScale: number;
    heightScale: number;
    bodyTilt: number;
  } {
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
    const sweepSign = heavy ? 1 : -1;
    const largeWarBlade = this.isLargeWarBladeStyle();

    if (phase === "windup") {
      if (largeWarBlade) {
        return thrust
          ? {
              forward: heavy ? -12 : -8,
              side: heavy ? 1 : 0,
              rotation: heavy ? -0.04 : -0.02,
              lengthScale: 0.99,
              heightScale: heavy ? 1.04 : 1.02,
              bodyTilt: heavy ? -0.025 : -0.012
            }
          : {
              forward: heavy ? -8 : -5,
              side: (heavy ? 6 : 4) * -sweepSign,
              rotation: (heavy ? 0.1 : 0.07) * -sweepSign,
              lengthScale: 1,
              heightScale: heavy ? 1.04 : 1.02,
              bodyTilt: 0.028 * -sweepSign
            };
      }

      return thrust
        ? {
            forward: heavy ? -10 : -6,
            side: heavy ? 2 : 1,
            rotation: heavy ? -0.05 : -0.03,
            lengthScale: 0.99,
            heightScale: heavy ? 1.05 : 1.03,
            bodyTilt: heavy ? -0.03 : -0.015
          }
        : {
            forward: heavy ? -5 : -3,
            side: (heavy ? 10 : 7) * -sweepSign,
            rotation: (heavy ? 0.2 : 0.12) * -sweepSign,
            lengthScale: 1.01,
            heightScale: heavy ? 1.06 : 1.03,
            bodyTilt: 0.04 * -sweepSign
          };
    }

    if (phase === "active") {
      if (largeWarBlade) {
        return thrust
          ? {
              forward: lunge ? 28 : heavy ? 18 : 12,
              side: heavy ? -1 : 0,
              rotation: lunge ? 0.04 : 0.015,
              lengthScale: lunge ? 1.12 : 1.05,
              heightScale: heavy ? 0.98 : 1,
              bodyTilt: lunge ? 0.03 : 0.015
            }
          : {
              forward: heavy ? 14 : 10,
              side: (heavy ? 9 : 6) * sweepSign,
              rotation: (heavy ? 0.16 : 0.11) * sweepSign,
              lengthScale: heavy ? 1.07 : 1.04,
              heightScale: 0.98,
              bodyTilt: 0.05 * sweepSign
            };
      }

      return thrust
        ? {
            forward: lunge ? 30 : heavy ? 20 : 14,
            side: heavy ? -1 : 0,
            rotation: lunge ? 0.05 : 0.02,
            lengthScale: lunge ? 1.14 : 1.08,
            heightScale: heavy ? 0.97 : 0.99,
            bodyTilt: lunge ? 0.04 : 0.02
          }
        : {
            forward: heavy ? 12 : 9,
            side: (heavy ? 16 : 12) * sweepSign,
            rotation: (heavy ? 0.26 : 0.18) * sweepSign,
            lengthScale: heavy ? 1.1 : 1.06,
            heightScale: 0.96,
            bodyTilt: 0.07 * sweepSign
          };
    }

    if (largeWarBlade) {
      return thrust
        ? {
            forward: 4,
            side: 0,
            rotation: 0.008,
            lengthScale: 1.01,
            heightScale: 1.01,
            bodyTilt: 0.006
          }
        : {
            forward: 2,
            side: 3 * sweepSign,
            rotation: 0.035 * sweepSign,
            lengthScale: 1.01,
            heightScale: 1.01,
            bodyTilt: 0.015 * sweepSign
          };
    }

    return thrust
      ? {
          forward: 5,
          side: -1,
          rotation: 0.01,
          lengthScale: 1.02,
          heightScale: 1.01,
          bodyTilt: 0.008
        }
      : {
          forward: 3,
          side: 5 * sweepSign,
          rotation: 0.06 * sweepSign,
          lengthScale: 1.02,
          heightScale: 1.01,
          bodyTilt: 0.02 * sweepSign
        };
  }

  private spawnAttackFlash(ownerX: number, ownerY: number, signal: AttackExecutionSignal, enemyOwned: boolean): void {
    const center =
      signal.profile.delivery === "ranged"
        ? this.getProjectileSourcePoint(ownerX, ownerY, signal, enemyOwned)
        : this.getAttackCenter(ownerX, ownerY, signal);
    const angle = signal.angle;
    const footprint = this.getAttackFootprint(signal);
    const length = signal.profile.delivery === "ranged" ? footprint.length : signal.profile.attackClass === "lunge" ? footprint.length * 0.92 : footprint.length * 0.76;
    const width =
      signal.profile.delivery === "ranged"
        ? Math.max(6, footprint.width * 0.78)
        : signal.profile.shape === "thrust"
          ? Math.max(6, footprint.width * 0.72)
          : Math.max(10, footprint.width * 0.42);
    const coreColor = enemyOwned ? 0xf3c9bf : 0xf5ead8;
    const outerAlpha = enemyOwned ? 0.2 : 0.24;
    const core = this.add.rectangle(center.x, center.y, length, width, signal.profile.tint, outerAlpha).setRotation(angle).setDepth(8);
    const glint = this.add
      .rectangle(
        center.x + signal.direction.x * length * 0.16,
        center.y + signal.direction.y * length * 0.16,
        length * 0.58,
        Math.max(4, width * 0.44),
        coreColor,
        0.62
      )
      .setRotation(angle)
      .setDepth(9);

    this.tweens.add({
      targets: core,
      alpha: 0,
      scaleX: signal.profile.shape === "sweep" ? 1.16 : 1.08,
      scaleY: signal.profile.shape === "sweep" ? 1.08 : 1.02,
      duration: signal.profile.shape === "sweep" ? 120 : 100,
      onComplete: () => core.destroy()
    });
    this.tweens.add({
      targets: glint,
      alpha: 0,
      scaleX: 1.24,
      duration: 84,
      onComplete: () => glint.destroy()
    });
  }

  private syncPlayerPresentation(): void {
    const status = this.controller.getStatus();
    const facing = this.controller.getFacingVector();
    const angle = Math.atan2(facing.y, facing.x);
    const style = this.currentStats.combatStyle;
    const reach = style.guardSize * 0.34 + 6;
    const commitWeight = this.activeAttack?.profile.commitWeight ?? this.controller.getCurrentAttackSignal()?.profile.commitWeight ?? 0;
    const attackSignal = this.activeAttack ?? this.controller.getCurrentAttackSignal();
    const poseTarget = this.getPlayerAttackPoseTarget(attackSignal, this.controller.getCurrentAttackPhase());
    const perpendicular = new Phaser.Math.Vector2(-facing.y, facing.x);
    const largeWarBlade = this.isLargeWarBladeStyle();

    this.playerWeaponForwardOffset = Phaser.Math.Linear(this.playerWeaponForwardOffset, poseTarget.forward, 0.24);
    this.playerWeaponSideOffset = Phaser.Math.Linear(this.playerWeaponSideOffset, poseTarget.side, 0.24);
    this.playerWeaponRotationOffset = Phaser.Math.Linear(this.playerWeaponRotationOffset, poseTarget.rotation, 0.24);
    this.playerWeaponLengthScale = Phaser.Math.Linear(this.playerWeaponLengthScale, poseTarget.lengthScale, 0.24);
    this.playerWeaponHeightScale = Phaser.Math.Linear(this.playerWeaponHeightScale, poseTarget.heightScale, 0.24);
    this.playerBodyTilt = Phaser.Math.Linear(this.playerBodyTilt, poseTarget.bodyTilt, 0.22);

    const bladeScale = status.isParrying
      ? 1.08
      : status.isAttacking
        ? (largeWarBlade ? 1.02 + commitWeight * 0.22 : 1.04 + commitWeight * 0.32)
        : 1;
    const bodyScaleX =
      (status.isParrying
        ? 0.98
        : status.isDashing
          ? 1.08
          : status.isAttacking
            ? (largeWarBlade ? 1 + commitWeight * 0.05 : 1.01 + commitWeight * 0.08)
            : 1) +
      Math.abs(this.playerBodyTilt) * 0.12;
    const bodyScaleY =
      (status.isParrying
        ? 1.04
        : status.isDashing
          ? (largeWarBlade ? 0.94 : 0.9)
          : status.isAttacking
            ? (largeWarBlade ? 1 + commitWeight * 0.03 : 1 + commitWeight * 0.06)
            : 1) -
      Math.abs(this.playerBodyTilt) * 0.04;
    const guardTint = status.isParrying ? COLORS.gold : style.accent;
    const bladeTint = status.isParrying ? 0xf4e3b6 : this.activeAttack?.profile.tint ?? COLORS.ghost;
    const bodyTint = status.isParrying
      ? 0xd8b875
      : this.playerInvulnRemaining > 0 && Math.floor(this.playerInvulnRemaining / 45) % 2 === 0
        ? 0xf0b4ab
        : this.currentStats.sword.accent;

    this.player.setScale(bodyScaleX, bodyScaleY);
    this.player.setRotation(this.playerBodyTilt);
    this.player.setStrokeStyle(2, status.isParrying ? COLORS.gold : COLORS.ghost, status.isParrying ? 0.74 : 0.4);

    this.playerWeaponGuard.setPosition(
      this.player.x + facing.x * (reach + this.playerWeaponForwardOffset * 0.4) + perpendicular.x * this.playerWeaponSideOffset * 0.34,
      this.player.y + facing.y * (reach + this.playerWeaponForwardOffset * 0.4) + perpendicular.y * this.playerWeaponSideOffset * 0.34
    );
    this.playerWeaponGuard.setRotation(angle + this.playerWeaponRotationOffset * 0.4);
    this.playerWeaponGuard.setFillStyle(guardTint, 0.98);
    this.playerWeaponBlade.setPosition(
      this.player.x + facing.x * (reach + 6 + this.playerWeaponForwardOffset) + perpendicular.x * this.playerWeaponSideOffset,
      this.player.y + facing.y * (reach + 6 + this.playerWeaponForwardOffset) + perpendicular.y * this.playerWeaponSideOffset
    );
    this.playerWeaponBlade.setRotation(angle + this.playerWeaponRotationOffset);
    this.playerWeaponBlade.setScale(bladeScale * this.playerWeaponLengthScale, (status.isDashing ? 0.94 : 1) * this.playerWeaponHeightScale);
    this.playerWeaponBlade.setFillStyle(bladeTint, 0.95);
    this.player.setFillStyle(bodyTint);
  }

  private damagePlayer(amount: number, direction: { x: number; y: number }, impact: HitImpactProfile): void {
    if (this.combatLocked || this.playerInvulnRemaining > 0) {
      return;
    }

    const tradingHeavy =
      this.currentStats.sword.techniques.heavyCannotBeInterrupted &&
      this.controller.isCurrentAttackHeavy() &&
      this.controller.getCurrentAttackPhase() !== "recovery";
    const lowStaminaPunish =
      this.hasTraining("bloodRush") && this.controller.getStatus().stamina <= this.currentStats.staminaMax * 0.2 ? 2 : 0;
    const guardScale = this.guardDamageScalePending;
    this.guardDamageScalePending = 1;
    const scaledDamage = Math.max(1, Math.round(amount * this.currentStats.incomingDamageScale * guardScale));

    this.playerHp = Math.max(0, this.playerHp - scaledDamage - lowStaminaPunish);
    this.playerInvulnRemaining = 260;
    this.comboTimerRemaining = 0;
    this.postBindRewardRemaining = 0;
    this.nextAttackBonusDamage = 0;
    this.postBindThrustCharges = 0;
    this.thrustStreak = 0;
    this.resetCombo();
    this.player.body.setVelocity(
      direction.x * impact.displacement * (tradingHeavy ? 0.3 : 0.82),
      direction.y * impact.displacement * (tradingHeavy ? 0.3 : 0.82)
    );
    this.controller.applyControlLock(Math.round(impact.controlLossMs * (tradingHeavy ? 0.4 : 1)));
    this.spawnImpactFx(this.player.x, this.player.y, COLORS.danger, direction, {
      ...impact,
      hitstopMs: Math.round(impact.hitstopMs * 0.72),
      cameraShake: Math.max(impact.cameraShake, 0.0036)
    });
    this.cameras.main.shake(120, Math.max(0.0036, impact.cameraShake));
    this.applyHitStop(Math.round(impact.hitstopMs * 0.72));
    this.pushFeedback(
      lowStaminaPunish > 0 ? "Winded and punished" : guardScale < 1 ? "Guard softened the blow" : "Hit out of line",
      guardScale < 1 && lowStaminaPunish <= 0 ? COLORS.gold : COLORS.danger
    );

    if (this.playerHp === 0) {
      this.onPlayerDefeated();
    }
  }

  private registerComboHit(): void {
    const previousMode = this.getCurrentComboMode().label;
    this.comboCount += 1;
    this.comboTimerRemaining = this.currentStats.comboWindow;
    this.bestCombo = Math.max(this.bestCombo, this.comboCount);
    const nextMode = this.getCurrentComboMode().label;

    if (nextMode !== previousMode && nextMode !== "Calm") {
      this.pushFeedback(`${nextMode} online`, COLORS.gold);
    }

    if (this.comboCount >= 2) {
      const comboText = this.add
        .text(this.player.x, this.player.y - 46, `x${this.comboCount}`, { ...TEXT.heading, fontSize: "22px", color: "#f1ede6" })
        .setOrigin(0.5)
        .setDepth(12);

      this.tweens.add({
        targets: comboText,
        y: comboText.y - 20,
        alpha: 0,
        duration: 440,
        onComplete: () => comboText.destroy()
      });
    }
  }

  private resetCombo(): void {
    this.comboCount = 0;
  }

  private getEncounterRewardMaterials(): MaterialCost {
    return {
      ...this.currentEncounter.rewardMaterials,
      steel: (this.currentEncounter.rewardMaterials.steel ?? 0) + this.currentStats.bonusDrops
    };
  }

  private formatInventoryInline(materials: ReturnType<typeof gameManager.getState>["materials"]): string {
    const shortLabels: Record<(typeof MATERIAL_ORDER)[number], string> = {
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

    return MATERIAL_ORDER.map((materialId) => `${shortLabels[materialId]} ${Number.isFinite(materials[materialId]) ? materials[materialId] : "INF"}`).join("  ");
  }

  private onEnemyDefeated(): void {
    if (this.dropsSpawned) {
      return;
    }

    this.dropsSpawned = true;
    this.closeEnemyAttackWindow();
    this.clearEnemyProjectiles();
    this.clearEnemyHazards();
    const rewards = this.getEncounterRewardMaterials();
    this.lootText.setText(`Target broken. Collect ${formatMaterialCost(rewards)} to leave the arena.`);

    for (const materialId of MATERIAL_ORDER) {
      const count = rewards[materialId] ?? 0;

      for (let index = 0; index < count; index += 1) {
        this.pickups.push(
          new MaterialPickup({
            scene: this,
            x: this.enemy.x + Phaser.Math.Between(-30, 30),
            y: this.enemy.y + Phaser.Math.Between(-30, 30),
            materialId,
            value: 1,
            tint: MATERIAL_TINTS[materialId]
          })
        );
      }
    }
  }

  private onPlayerDefeated(): void {
    this.combatLocked = true;
    this.closeAttackWindow();
    this.closeEnemyAttackWindow();
    this.clearEnemyProjectiles();
    this.clearEnemyHazards();

    const veil = this.add.rectangle(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5, VIEWPORT.width, VIEWPORT.height, 0x060a10, 0.72).setDepth(40);
    const panel = this.add.rectangle(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5, 404, 238, COLORS.panel, 0.97).setDepth(41).setStrokeStyle(2, COLORS.panelEdge, 1);
    const title = this.add.text(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5 - 78, "Run Broken", TEXT.heading).setOrigin(0.5).setDepth(42);
    const copy = this.add
      .text(
        VIEWPORT.width * 0.5,
        VIEWPORT.height * 0.5 - 18,
        `Best combo x${this.bestCombo}\nThe enemy ${this.enemy.weaponName} overwhelmed you.`,
        { ...TEXT.body, align: "center" }
      )
      .setOrigin(0.5)
      .setDepth(42);

    const restart = createButton({
      scene: this,
      x: VIEWPORT.width * 0.5 - 92,
      y: VIEWPORT.height * 0.5 + 62,
      width: 160,
      height: 64,
      label: "Restart Run",
      hint: "Begin again",
      accent: 0x374c62,
      onClick: () => gameManager.beginRun(this)
    });
    restart.root.setDepth(42);

    const menu = createButton({
      scene: this,
      x: VIEWPORT.width * 0.5 + 92,
      y: VIEWPORT.height * 0.5 + 62,
      width: 160,
      height: 64,
      label: "Main Menu",
      hint: "Leave the arena",
      accent: 0x4b3f48,
      onClick: () => gameManager.openMainMenu(this)
    });
    menu.root.setDepth(42);

    // Keep references alive through scene lifetime without extra state bookkeeping.
    void veil;
    void panel;
    void title;
    void copy;
  }

  private updatePickups(delta: number): void {
    if (this.pickups.length === 0) {
      if (this.dropsSpawned && !this.forgeQueued) {
        this.queueForgeTransition();
      }

      return;
    }

    const remaining: MaterialPickup[] = [];

    for (const pickup of this.pickups) {
      pickup.update(this.player.x, this.player.y, delta);
      const pickupX = pickup.x;
      const pickupY = pickup.y;
      const gained = pickup.tryCollect(this.player.x, this.player.y, this.currentStats.pickupRadius);

      if (gained) {
        gameManager.addMaterials(gained.materialId, gained.value);
        this.spawnImpactFx(pickupX, pickupY, MATERIAL_TINTS[gained.materialId], { x: 0.2, y: -0.8 }, {
          displacement: 36,
          controlLossMs: 60,
          interruptChance: 0.1,
          hitstopMs: 0,
          cameraShake: 0
        });
      }

      if (!pickup.isCollected) {
        remaining.push(pickup);
      }
    }

    this.pickups = remaining;

    if (this.pickups.length === 0 && this.dropsSpawned && !this.forgeQueued) {
      this.queueForgeTransition();
    }
  }

  private queueForgeTransition(): void {
    if (this.forgeTransitionEvent || this.transitioningOut) {
      return;
    }

    this.forgeQueued = true;
    this.combatLocked = true;
    this.closeAttackWindow();
    this.closeEnemyAttackWindow();
    this.clearEnemyProjectiles();
    const encounterNode = gameManager.getCurrentEncounterNodeDefinition();
    const tutorialFinale = gameManager.isTutorialMode() && encounterNode?.id === TUTORIAL_FINAL_NODE_ID;

    this.lootText.setText(tutorialFinale ? "Final fight complete. Opening the tutorial summary." : "Materials collected. Returning to the upgrade screen.");
    this.forgeTransitionEvent = this.time.delayedCall(900, () => {
      this.forgeTransitionEvent = null;

      if (this.transitioningOut || !this.sys.isActive()) {
        return;
      }

      if (tutorialFinale) {
        this.openTutorialCompletionOverlay();
        return;
      }

      this.transitioningOut = true;
      gameManager.openForge(this);
    });
  }

  private maybeOpenTutorialOverlay(): void {
    if (!gameManager.isTutorialMode()) {
      return;
    }

    const encounterNode = gameManager.getCurrentEncounterNodeDefinition();
    const pages = encounterNode ? getTutorialCombatPages(encounterNode.id) : null;
    const promptId = this.getCombatTutorialPromptId(encounterNode?.id ?? null);

    if (!encounterNode || !pages || !promptId || gameManager.hasSeenTutorialPrompt(promptId)) {
      return;
    }

    this.physics.world.pause();
    this.tutorialOverlayActive = true;
    this.tutorialOverlay = createGuidedOverlay({
      scene: this,
      pages,
      finalLabel: "Fight",
      onComplete: () => {
        gameManager.markTutorialPromptSeen(promptId);
        this.tutorialOverlay = null;
        this.tutorialOverlayActive = false;

        if (!this.transitioningOut) {
          this.physics.world.resume();
        }
      }
    });
  }

  private openTutorialCompletionOverlay(): void {
    if (this.tutorialOverlayActive) {
      return;
    }

    this.physics.world.pause();
    this.tutorialOverlayActive = true;
    this.tutorialOverlay = createGuidedOverlay({
      scene: this,
      pages: TUTORIAL_COMPLETION_PAGES,
      finalLabel: "Return To Menu",
      onComplete: () => {
        gameManager.markTutorialPromptSeen(TUTORIAL_PROMPT_IDS.completion);
        this.tutorialOverlay = null;
        this.tutorialOverlayActive = false;
        this.transitioningOut = true;
        gameManager.completeTutorial(this);
      }
    });
  }

  private getCombatTutorialPromptId(nodeId: string | null): string | null {
    switch (nodeId) {
      case "tutorial-plains":
        return TUTORIAL_PROMPT_IDS.combatPlains;
      case "tutorial-savannah":
        return TUTORIAL_PROMPT_IDS.combatSavannah;
      case "tutorial-volcanic-land":
        return TUTORIAL_PROMPT_IDS.combatVolcanicLand;
      case "tutorial-lava-fields":
        return TUTORIAL_PROMPT_IDS.combatLavaFields;
      case TUTORIAL_FINAL_NODE_ID:
        return TUTORIAL_PROMPT_IDS.combatElite;
      default:
        return null;
    }
  }

  private spawnImpactFx(
    x: number,
    y: number,
    tint: number,
    direction: { x: number; y: number },
    impact: HitImpactProfile
  ): void {
    const heavy = impact.controlLossMs >= 190;
    const angle = Math.atan2(direction.y, direction.x);
    const ring = this.add.circle(x, y, heavy ? 16 : 10, tint, heavy ? 0.34 : 0.26).setDepth(8);
    const spark = this.add.circle(x, y, heavy ? 8 : 6, 0xf5ead8, 0.85).setDepth(8);
    const slash = this.add
      .rectangle(x + direction.x * 12, y + direction.y * 12, 42 + impact.displacement * 0.06, heavy ? 16 : 10, tint, 0.28)
      .setRotation(angle)
      .setDepth(8);

    this.tweens.add({
      targets: ring,
      scale: heavy ? 3.2 : 2.4,
      alpha: 0,
      duration: heavy ? 210 : 170,
      onComplete: () => ring.destroy()
    });
    this.tweens.add({
      targets: spark,
      scale: 0.1,
      alpha: 0,
      duration: 120,
      onComplete: () => spark.destroy()
    });
    this.tweens.add({
      targets: slash,
      scaleX: 1.28,
      alpha: 0,
      duration: 130,
      onComplete: () => slash.destroy()
    });
  }

  private spawnParryFx(playerX: number, playerY: number, enemyX: number, enemyY: number): void {
    const angle = Phaser.Math.Angle.Between(enemyX, enemyY, playerX, playerY);
    const ring = this.add.circle(playerX, playerY, 16, COLORS.gold, 0.2).setDepth(9);
    const flash = this.add.rectangle(playerX, playerY, 88, 12, 0xf5ead8, 0.82).setRotation(angle).setDepth(9);
    const spark = this.add.circle(playerX, playerY, 8, COLORS.gold, 0.95).setDepth(10);
    const cross = this.add.rectangle(playerX, playerY, 76, 8, 0xfff4d1, 0.78).setRotation(angle + Math.PI / 2).setDepth(9);

    this.tweens.add({
      targets: ring,
      scale: 3.2,
      alpha: 0,
      duration: 180,
      onComplete: () => ring.destroy()
    });
    this.tweens.add({
      targets: flash,
      scaleX: 1.45,
      alpha: 0,
      duration: 130,
      onComplete: () => flash.destroy()
    });
    this.tweens.add({
      targets: spark,
      scale: 0.18,
      alpha: 0,
      duration: 90,
      onComplete: () => spark.destroy()
    });
    this.tweens.add({
      targets: cross,
      scaleX: 1.32,
      alpha: 0,
      duration: 116,
      onComplete: () => cross.destroy()
    });
  }

  private playDashEffect(direction: { x: number; y: number }): void {
    const style = this.currentStats.combatStyle;
    const streak = this.add
      .rectangle(
        this.player.x - direction.x * 30,
        this.player.y - direction.y * 30,
        style.dashTrailLength + 10,
        style.dashTrailWidth + 2,
        style.accent,
        0.24
      )
      .setRotation(Math.atan2(direction.y, direction.x))
      .setDepth(3);

    this.tweens.add({
      targets: streak,
      alpha: 0,
      scaleX: 1.68,
      duration: 132,
      onComplete: () => streak.destroy()
    });
  }

  private refreshHud(): void {
    const state = gameManager.getState();
    const status = this.controller.getStatus();
    const enemyHealth = this.enemy.health;
    const dashText = status.dashCooldownRemaining <= 0 ? "ready" : `${(status.dashCooldownRemaining / 1000).toFixed(2)}s`;
    const comboLabel = this.comboCount > 1 ? `x${this.comboCount}` : "none";
    const bindReady = status.parryCooldownRemaining <= 0 ? "ready" : `${(status.parryCooldownRemaining / 1000).toFixed(2)}s`;
    const staminaText = `${Math.round(status.stamina)}/${Math.round(status.staminaMax)}`;
    const comboMode = this.getCurrentComboMode();
    const modifierLabel = this.getTrainingHudLabel();

    this.hudText.setText(
      [
        this.currentStats.sword.name,
        `HP ${this.playerHp}/${this.playerMaxHp}  Stamina ${staminaText}`,
        `Chain ${comboLabel}  ${this.formatInventoryInline(state.materials)}`,
        `Dash ${dashText}  Bind ${bindReady}`
      ].join("\n")
    );

    this.guidanceText.setColor(colorHex(this.feedbackColor));
    this.guidanceText.setText(this.lastFeedback || "Spacing matters: green ring means your next strike is in measure.");
    this.swordModeText.setText(`${comboMode.label}  |  ${modifierLabel}`);

    this.enemyText.setText(
      this.enemy.alive
        ? [
            `Enemy ${this.enemy.weaponName}`,
            `HP ${enemyHealth.current}/${enemyHealth.max}  Armor ${this.formatArmorLabel(this.currentEncounter.armor)}`,
            `Pattern ${this.currentEncounter.pattern}`
          ].join("\n")
        : "Enemy broken\nCollect the spoils"
    );

    if (!this.dropsSpawned && !this.combatLocked) {
      this.lootText.setText(`Defeat the ${this.enemy.weaponName.toLowerCase()} to earn ${formatMaterialCost(this.getEncounterRewardMaterials())}.`);
    }
  }
}
