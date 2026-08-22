import Phaser from "phaser";
import { gameManager } from "../core/GameManager";
import { SCENE_KEYS } from "../core/SceneKeys";
import type {
  SwordDefinition,
  SwordPartId,
  SwordPartOptionDefinition,
  SwordPartOptionId,
  SwordPartStatAdjustments
} from "../core/types";
import { formatMaterialCost, formatMaterialInventory } from "../data/materials";
import { createButton, type ButtonHandle } from "../ui/createButton";
import { fadeInMajorScene } from "../ui/sceneFades";
import { COLORS, TEXT, VIEWPORT, colorHex } from "../ui/theme";

const PART_ORDER: SwordPartId[] = ["blade", "crossGuard", "pommel", "hilt", "tip"];

const PART_COPY: Record<SwordPartId, { label: string; description: string }> = {
  blade: {
    label: "Blade",
    description: ""
  },
  crossGuard: {
    label: "Cross-Guard",
    description: ""
  },
  pommel: {
    label: "Pommel",
    description: ""
  },
  hilt: {
    label: "Hilt",
    description: ""
  },
  tip: {
    label: "Tip",
    description: ""
  }
};

interface OptionCardHandle {
  root: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  titleText: Phaser.GameObjects.Text;
  metaText: Phaser.GameObjects.Text;
}

export class ModificationScene extends Phaser.Scene {
  private selectedPartId: SwordPartId = "blade";
  private selectedOptionId: SwordPartOptionId = "";
  private readonly partButtons = new Map<SwordPartId, ButtonHandle>();
  private readonly optionCards = new Map<SwordPartOptionId, OptionCardHandle>();
  private optionCardRoots: Phaser.GameObjects.Container[] = [];
  private summaryText!: Phaser.GameObjects.Text;
  private partDescriptionText!: Phaser.GameObjects.Text;
  private detailTitleText!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private optionActionButton!: ButtonHandle;
  private bladeShape!: Phaser.GameObjects.Rectangle;
  private crossGuardShape!: Phaser.GameObjects.Rectangle;
  private hiltShape!: Phaser.GameObjects.Rectangle;
  private pommelShape!: Phaser.GameObjects.Arc;
  private tipShape!: Phaser.GameObjects.Rectangle;

  constructor() {
    super(SCENE_KEYS.Modification);
  }

  create(): void {
    fadeInMajorScene(this);
    this.partButtons.clear();
    this.optionCards.clear();
    this.optionCardRoots = [];
    this.paintBackdrop();

    const equippedIds = gameManager.getEquippedSwordPartOptionIds();
    this.selectedOptionId = equippedIds[this.selectedPartId];

    this.add.text(72, 72, "Sword Modification", TEXT.title);

    this.drawPanel(64, 190, 404, 474);
    this.drawPanel(500, 190, 716, 474);

    this.add.text(92, 220, "Current Weapon", TEXT.heading);
    this.summaryText = this.add.text(92, 472, "", TEXT.small).setWordWrapWidth(348);
    this.partDescriptionText = this.add
      .text(532, 298, "", {
        ...TEXT.small,
        color: colorHex(COLORS.subtext)
      })
      .setWordWrapWidth(652);
    this.detailTitleText = this.add.text(532, 528, "", TEXT.heading);
    this.detailText = this.add
      .text(532, 564, "", { ...TEXT.small, fontSize: "13px", color: colorHex(COLORS.ink) })
      .setWordWrapWidth(652);
    this.feedbackText = this.add
      .text(532, 636, "", { ...TEXT.small, color: colorHex(COLORS.gold) })
      .setWordWrapWidth(652);

    this.createSwordPreview();
    this.createPartButtons();
    this.rebuildOptionCards();

    this.optionActionButton = createButton({
      scene: this,
      x: 1048,
      y: 662,
      width: 248,
      height: 72,
      label: "Forge Option",
      hint: "Spend materials",
      accent: 0x575839,
      onClick: () => this.handleSelectedOptionAction()
    });

    createButton({
      scene: this,
      x: 196,
      y: 662,
      width: 224,
      height: 68,
      label: "Return to Forge",
      hint: "Back to the forge tabs",
      accent: 0x314454,
      onClick: () => gameManager.returnToForge(this)
    });

    this.refreshView();
  }

  private createSwordPreview(): void {
    const currentSword = gameManager.getSelectedSword();
    const centerX = 266;
    const centerY = 344;
    const baseBladeLength = Phaser.Math.Clamp(Math.round(currentSword.bladeLength * 0.92), 154, 262);
    const baseBladeWidth = Phaser.Math.Clamp(Math.round(currentSword.bladeWidth * 1.35), 10, 20);
    const baseHiltLength = Phaser.Math.Clamp(Math.round(currentSword.bodyWidth * 2.1), 86, 156);
    const baseHiltWidth = Phaser.Math.Clamp(Math.round(currentSword.bodyHeight * 0.34), 18, 28);
    const baseGuardLength = Phaser.Math.Clamp(Math.round(currentSword.guardSize * 1.8), 66, 124);
    const baseGuardWidth = Phaser.Math.Clamp(Math.round(currentSword.guardSize * 0.22), 14, 22);
    const basePommelRadius = Phaser.Math.Clamp(Math.round(currentSword.bodyHeight * 0.22), 14, 26);
    const baseTipSize = Phaser.Math.Clamp(Math.round(currentSword.bladeWidth * 1.8), 18, 30);

    this.bladeShape = this.add
      .rectangle(centerX + baseBladeLength * 0.26, centerY, baseBladeLength, baseBladeWidth, 0xdce5ee, 0.96)
      .setStrokeStyle(2, COLORS.panelEdge, 1);
    this.tipShape = this.add
      .rectangle(centerX + baseBladeLength * 0.53, centerY, baseTipSize, baseTipSize, 0xe6edf4, 0.96)
      .setAngle(45)
      .setStrokeStyle(2, COLORS.panelEdge, 1);
    this.crossGuardShape = this.add
      .rectangle(centerX - 36, centerY, baseGuardWidth, baseGuardLength, 0xc39a72, 0.96)
      .setStrokeStyle(2, COLORS.panelEdge, 1);
    this.hiltShape = this.add
      .rectangle(centerX - 102, centerY, baseHiltLength, baseHiltWidth, 0x956948, 0.98)
      .setStrokeStyle(2, COLORS.panelEdge, 1);
    this.pommelShape = this.add.circle(centerX - 164, centerY, basePommelRadius, 0xb2bcc9, 0.98).setStrokeStyle(2, COLORS.panelEdge, 1);
  }

  private createPartButtons(): void {
    PART_ORDER.forEach((partId, index) => {
      this.partButtons.set(
        partId,
        createButton({
          scene: this,
          x: 562 + index * 132,
          y: 248,
          width: 118,
          height: 52,
          label: PART_COPY[partId].label,
          accent: 0x435467,
          onClick: () => {
            this.selectedPartId = partId;
            this.selectedOptionId = gameManager.getEquippedSwordPartOptionIds()[partId];
            this.rebuildOptionCards();
            this.refreshView();
          }
        })
      );
    });
  }

  private rebuildOptionCards(): void {
    this.optionCards.clear();
    this.optionCardRoots.forEach((root) => root.destroy());
    this.optionCardRoots = [];

    const options = gameManager.getSwordPartOptionDefinitions(this.selectedPartId);

    options.forEach((definition, index) => {
      const column = index % 5;
      const row = Math.floor(index / 5);
      const x = 562 + column * 132;
      const y = 332 + row * 74;
      const background = this.add
        .rectangle(0, 0, 122, 64, COLORS.panelSoft, 0.96)
        .setStrokeStyle(2, COLORS.panelEdge, 0.88)
        .setInteractive({ useHandCursor: true });
      const titleText = this.add
        .text(0, -8, definition.name, { ...TEXT.caption, fontSize: "12px", align: "center", color: colorHex(COLORS.ink) })
        .setOrigin(0.5)
        .setWordWrapWidth(98);
      const metaText = this.add
        .text(0, 18, "", { ...TEXT.caption, fontSize: "11px", align: "center", color: colorHex(COLORS.subtext) })
        .setOrigin(0.5)
        .setWordWrapWidth(102);
      const root = this.add.container(x, y, [background, titleText, metaText]);

      background.on("pointerover", () => {
        root.setScale(1.02);
      });
      background.on("pointerout", () => {
        root.setScale(1);
      });
      background.on("pointerdown", () => root.setScale(0.985));
      background.on("pointerup", () => {
        root.setScale(1.02);
        this.selectedOptionId = definition.id;
        this.refreshView();
      });

      this.optionCards.set(definition.id, {
        root,
        background,
        titleText,
        metaText
      });
      this.optionCardRoots.push(root);
    });
  }

  private refreshView(): void {
    const sword = gameManager.getSelectedSword();
    const state = gameManager.getState();
    const equippedIds = gameManager.getEquippedSwordPartOptionIds();
    const selectedOption =
      gameManager.getSwordPartOptionDefinition(this.selectedOptionId) ??
      gameManager.getEquippedSwordPartOptionDefinition(this.selectedPartId);
    this.selectedOptionId = selectedOption.id;

    this.summaryText.setText(
      [
        `${sword.name}`,
        "",
        formatMaterialInventory(state.materials),
        "",
        `Blade: ${gameManager.getEquippedSwordPartOptionDefinition("blade").name}`,
        `Cross-Guard: ${gameManager.getEquippedSwordPartOptionDefinition("crossGuard").name}`,
        `Pommel: ${gameManager.getEquippedSwordPartOptionDefinition("pommel").name}`,
        `Hilt: ${gameManager.getEquippedSwordPartOptionDefinition("hilt").name}`
      ].join("\n")
    );

    const selectedPartCopy = PART_COPY[this.selectedPartId];
    const owned = gameManager.isSwordPartOptionOwned(selectedOption.id);
    const equipped = equippedIds[this.selectedPartId] === selectedOption.id;
    const costText = formatMaterialCost(selectedOption.cost);
    const statusText = equipped ? "Equipped" : owned ? "Owned" : costText === "Free" ? "Available" : `Forge: ${costText}`;
    const adjustmentText = this.formatAdjustmentText(selectedOption.effects);

    this.partDescriptionText.setText(selectedPartCopy.description);
    this.detailTitleText.setText(`${selectedPartCopy.label} - ${selectedOption.name}`);
    this.detailText.setText(
      [
        `Lore: ${selectedOption.detail}`,
        `Role: ${selectedOption.summary}`,
        `Adjustments: ${adjustmentText}`,
        `Traits: ${this.formatTraitText(selectedOption.effects)}`,
        `Status: ${statusText}`
      ].join("\n")
    );

    if (equipped) {
      this.optionActionButton.setText("Equipped");
      this.optionActionButton.setHint("Already active");
      this.optionActionButton.setEnabled(false);
    } else if (owned) {
      this.optionActionButton.setText("Equip Option");
      this.optionActionButton.setHint("Swap active fitting");
      this.optionActionButton.setEnabled(true);
    } else {
      this.optionActionButton.setText("Forge Option");
      this.optionActionButton.setHint(costText);
      this.optionActionButton.setEnabled(gameManager.canForgeSwordPartOption(selectedOption.id));
    }

    this.partButtons.forEach((button, partId) => button.setSelected(partId === this.selectedPartId));
    this.refreshOptionCards(equippedIds, selectedOption.id);
    this.renderPreview(sword, equippedIds, selectedOption);
  }

  private refreshOptionCards(
    equippedIds: Record<SwordPartId, SwordPartOptionId>,
    selectedOptionId: SwordPartOptionId
  ): void {
    for (const [optionId, handle] of this.optionCards.entries()) {
      const definition = gameManager.getSwordPartOptionDefinition(optionId);

      if (!definition) {
        continue;
      }

      const owned = gameManager.isSwordPartOptionOwned(optionId);
      const equipped = equippedIds[definition.partId] === optionId;
      const selected = selectedOptionId === optionId;
      const fill = equipped ? definition.accent : owned ? COLORS.panelSoft : COLORS.disabled;
      const strokeColor = selected ? COLORS.gold : equipped ? definition.accent : COLORS.panelEdge;
      const strokeWidth = selected || equipped ? 3 : 2;

      handle.background.setFillStyle(fill, equipped ? 0.98 : 0.95);
      handle.background.setStrokeStyle(strokeWidth, strokeColor, owned || equipped || selected ? 1 : 0.46);
      handle.root.setAlpha(owned || equipped ? 1 : 0.72);
      handle.titleText.setColor(owned || equipped ? colorHex(COLORS.ink) : "#8a97a3");
      handle.metaText.setColor(
        selected ? colorHex(COLORS.gold) : equipped ? "#f1ede6" : owned ? colorHex(COLORS.subtext) : "#6f7b86"
      );
      handle.metaText.setText(
        equipped
          ? "Equipped"
          : owned
            ? "Owned"
            : this.formatShortCost(definition.cost)
      );
    }
  }

  private renderPreview(
    sword: SwordDefinition,
    equippedIds: Record<SwordPartId, SwordPartOptionId>,
    selectedOption: SwordPartOptionDefinition
  ): void {
    const resolveDefinition = (partId: SwordPartId): SwordPartOptionDefinition =>
      partId === this.selectedPartId
        ? selectedOption
        : gameManager.getSwordPartOptionDefinition(equippedIds[partId]) ?? gameManager.getEquippedSwordPartOptionDefinition(partId);

    const bladeOption = resolveDefinition("blade");
    const guardOption = resolveDefinition("crossGuard");
    const pommelOption = resolveDefinition("pommel");
    const hiltOption = resolveDefinition("hilt");
    const tipOption = resolveDefinition("tip");

    const bladeLength = Phaser.Math.Clamp(
      Math.round(sword.bladeLength * 0.92) + (bladeOption.visual.bladeLength ?? 0),
      150,
      286
    );
    const bladeWidth = Phaser.Math.Clamp(
      Math.round(sword.bladeWidth * 1.35) + (bladeOption.visual.bladeWidth ?? 0),
      9,
      24
    );
    const guardLength = Phaser.Math.Clamp(
      Math.round(sword.guardSize * 1.8) + (guardOption.visual.guardLength ?? 0),
      62,
      140
    );
    const guardWidth = Phaser.Math.Clamp(
      Math.round(sword.guardSize * 0.22) + (guardOption.visual.guardWidth ?? 0),
      12,
      28
    );
    const hiltLength = Phaser.Math.Clamp(
      Math.round(sword.bodyWidth * 2.1) + (hiltOption.visual.hiltLength ?? 0),
      84,
      176
    );
    const hiltWidth = Phaser.Math.Clamp(
      Math.round(sword.bodyHeight * 0.34) + (hiltOption.visual.hiltWidth ?? 0),
      17,
      32
    );
    const pommelRadius = Phaser.Math.Clamp(
      Math.round(sword.bodyHeight * 0.22) + (pommelOption.visual.pommelRadius ?? 0),
      12,
      32
    );
    const tipSize = Phaser.Math.Clamp(
      Math.round(sword.bladeWidth * 1.8) + (tipOption.visual.tipSize ?? 0),
      16,
      38
    );

    const centerX = 266;
    const centerY = 344;

    this.bladeShape.setPosition(centerX + bladeLength * 0.26, centerY);
    this.bladeShape.setSize(bladeLength, bladeWidth);
    this.tipShape.setPosition(centerX + bladeLength * 0.53, centerY);
    this.tipShape.setSize(tipSize, tipSize);
    this.crossGuardShape.setPosition(centerX - 36, centerY);
    this.crossGuardShape.setSize(guardWidth, guardLength);
    this.hiltShape.setPosition(centerX - 102, centerY);
    this.hiltShape.setSize(hiltLength, hiltWidth);
    this.pommelShape.setPosition(centerX - 164, centerY);
    this.pommelShape.setRadius(pommelRadius);

    this.bladeShape.setFillStyle(bladeOption.visual.tint ?? 0xdce5ee, 0.98);
    this.tipShape.setFillStyle(tipOption.visual.tint ?? 0xe6edf4, 0.98);
    this.crossGuardShape.setFillStyle(guardOption.accent, 0.98);
    this.hiltShape.setFillStyle(hiltOption.accent, 0.98);
    this.pommelShape.setFillStyle(pommelOption.accent, 0.98);

    this.bladeShape.setStrokeStyle(2, this.selectedPartId === "blade" ? COLORS.gold : COLORS.panelEdge, this.selectedPartId === "blade" ? 1 : 0.85);
    this.tipShape.setStrokeStyle(2, this.selectedPartId === "tip" ? COLORS.gold : COLORS.panelEdge, this.selectedPartId === "tip" ? 1 : 0.85);
    this.crossGuardShape.setStrokeStyle(
      2,
      this.selectedPartId === "crossGuard" ? COLORS.gold : COLORS.panelEdge,
      this.selectedPartId === "crossGuard" ? 1 : 0.85
    );
    this.hiltShape.setStrokeStyle(2, this.selectedPartId === "hilt" ? COLORS.gold : COLORS.panelEdge, this.selectedPartId === "hilt" ? 1 : 0.85);
    this.pommelShape.setStrokeStyle(2, this.selectedPartId === "pommel" ? COLORS.gold : COLORS.panelEdge, this.selectedPartId === "pommel" ? 1 : 0.85);
  }

  private handleSelectedOptionAction(): void {
    const option = gameManager.getSwordPartOptionDefinition(this.selectedOptionId);

    if (!option) {
      this.feedbackText.setText("That fitting could not be found.");
      return;
    }

    if (gameManager.isSwordPartOptionOwned(option.id)) {
      if (gameManager.equipSwordPartOption(option.id)) {
        this.feedbackText.setText(`${option.name} equipped on the ${PART_COPY[option.partId].label.toLowerCase()}.`);
      } else {
        this.feedbackText.setText("That fitting could not be equipped.");
      }
    } else if (gameManager.forgeSwordPartOption(option.id)) {
      this.feedbackText.setText(`${option.name} forged and fitted.`);
    } else {
      this.feedbackText.setText(`Need ${formatMaterialCost(option.cost)}.`);
    }

    this.refreshView();
  }

  private formatShortCost(cost: ReturnType<typeof gameManager.getSwordPartOptionDefinition> extends infer _T ? SwordPartOptionDefinition["cost"] : never): string {
    const entries = Object.entries(cost).filter(([, value]) => (value ?? 0) > 0) as Array<[string, number]>;
    const shortLabels: Record<string, string> = {
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

    if (entries.length === 0) {
      return "Default";
    }

    return entries
      .slice(0, 2)
      .map(([materialId, value]) => `${shortLabels[materialId] ?? materialId.slice(0, 2)} ${value}`)
      .join("  ");
  }

  private formatAdjustmentText(effects: SwordPartStatAdjustments): string {
    const labels: Array<[keyof SwordPartStatAdjustments, (value: number) => string]> = [
      ["maxHp", (value) => `HP ${this.formatSignedNumber(value)}`],
      ["moveSpeed", (value) => `Move ${this.formatSignedNumber(value)}`],
      ["moveAcceleration", (value) => `Accel ${this.formatSignedNumber(value)}`],
      ["dashSpeed", (value) => `Dash Spd ${this.formatSignedNumber(value)}`],
      ["dashDuration", (value) => `Dash Time ${this.formatSignedNumber(value)}`],
      ["dashCooldown", (value) => `Dash CD ${this.formatSignedNumber(value)}`],
      ["attackControlWindup", (value) => `Windup Ctrl ${this.formatSignedNumber(value)}`],
      ["attackControlActive", (value) => `Active Ctrl ${this.formatSignedNumber(value)}`],
      ["parryWindow", (value) => `Bind Window ${this.formatSignedNumber(value)}`],
      ["parryReflectRatio", (value) => `Reflect ${this.formatSignedPercent(value)}`],
      ["staminaMax", (value) => `Stamina ${this.formatSignedNumber(value)}`],
      ["staminaRegen", (value) => `Regen ${this.formatSignedNumber(value)}`],
      ["incomingDamageScale", (value) => `Damage Taken ${this.formatSignedPercent(value)}`],
      ["pickupRadius", (value) => `Pickup ${this.formatSignedNumber(value)}`],
      ["lightDamage", (value) => `Light Dmg ${this.formatSignedNumber(value)}`],
      ["heavyDamage", (value) => `Heavy Dmg ${this.formatSignedNumber(value)}`],
      ["lightRange", (value) => `Light Reach ${this.formatSignedNumber(value)}`],
      ["heavyRange", (value) => `Heavy Reach ${this.formatSignedNumber(value)}`],
      ["lightWidth", (value) => `Light Arc ${this.formatSignedNumber(value)}`],
      ["heavyWidth", (value) => `Heavy Arc ${this.formatSignedNumber(value)}`],
      ["lightRecovery", (value) => `Light Rec ${this.formatSignedNumber(value)}`],
      ["heavyRecovery", (value) => `Heavy Rec ${this.formatSignedNumber(value)}`],
      ["lightWindup", (value) => `Light Windup ${this.formatSignedNumber(value)}`],
      ["heavyWindup", (value) => `Heavy Windup ${this.formatSignedNumber(value)}`],
      ["lightLunge", (value) => `Light Lunge ${this.formatSignedNumber(value)}`],
      ["heavyLunge", (value) => `Heavy Lunge ${this.formatSignedNumber(value)}`],
      ["lightImpactControlLoss", (value) => `Light Control ${this.formatSignedNumber(value)}`],
      ["heavyImpactControlLoss", (value) => `Heavy Control ${this.formatSignedNumber(value)}`],
      ["lightImpactDisplacement", (value) => `Light Push ${this.formatSignedNumber(value)}`],
      ["heavyImpactDisplacement", (value) => `Heavy Push ${this.formatSignedNumber(value)}`]
    ];
    const entries = labels
      .map(([key, formatter]) => {
        const value = effects[key];
        return typeof value === "number" && value !== 0 ? formatter(value) : null;
      })
      .filter((entry): entry is string => Boolean(entry));

    return entries.length > 0 ? entries.join("  |  ") : "Keeps the stock handling.";
  }

  private formatTraitText(effects: SwordPartStatAdjustments): string {
    const traits: string[] = [];

    if ((effects.parryWindow ?? 0) > 0 || (effects.parryReflectRatio ?? 0) > 0 || (effects.incomingDamageScale ?? 0) < 0) {
      traits.push("Stronger binds and safer defensive structure");
    }

    if ((effects.lightRange ?? 0) > 0 || (effects.heavyRange ?? 0) > 0 || (effects.lightLunge ?? 0) > 0 || (effects.heavyLunge ?? 0) > 0) {
      traits.push("Better point control and cleaner line entries");
    }

    if ((effects.lightWidth ?? 0) > 0 || (effects.heavyWidth ?? 0) > 0) {
      traits.push("Broader cutting coverage through the arc");
    }

    if ((effects.lightRecovery ?? 0) < 0 || (effects.heavyRecovery ?? 0) < 0 || (effects.moveSpeed ?? 0) > 0) {
      traits.push("Quicker resets and livelier footwork");
    }

    if ((effects.heavyDamage ?? 0) > 0 || (effects.heavyImpactControlLoss ?? 0) > 0 || (effects.heavyImpactDisplacement ?? 0) > 0) {
      traits.push("Heavier contact that wins space on impact");
    }

    if ((effects.staminaMax ?? 0) > 0 || (effects.staminaRegen ?? 0) > 0) {
      traits.push("Improved endurance in longer exchanges");
    }

    return traits.length > 0 ? traits.slice(0, 2).join("; ") : "A refinement that preserves the weapon's stock identity.";
  }

  private formatSignedNumber(value: number): string {
    return value > 0 ? `+${value}` : `${value}`;
  }

  private formatSignedPercent(value: number): string {
    const percent = Math.round(value * 100);
    return percent > 0 ? `+${percent}%` : `${percent}%`;
  }

  private drawPanel(x: number, y: number, width: number, height: number): void {
    this.add.rectangle(x, y, width, height, COLORS.panel, 0.96).setOrigin(0).setStrokeStyle(2, COLORS.panelEdge, 1);
  }

  private paintBackdrop(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.background, 1);
    graphics.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    graphics.fillStyle(COLORS.panelSoft, 0.18);
    graphics.fillRect(0, 0, VIEWPORT.width, 112);
    graphics.fillStyle(COLORS.gold, 0.08);
    graphics.fillCircle(1118, 118, 132);
    graphics.lineStyle(1, COLORS.panelEdge, 0.16);

    for (let x = 0; x < VIEWPORT.width; x += 64) {
      graphics.lineBetween(x, 0, x, VIEWPORT.height);
    }
  }
}
