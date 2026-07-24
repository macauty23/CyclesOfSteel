import Phaser from "phaser";
import { gameManager } from "../core/GameManager";
import type { WeaponTechDefinition, WeaponTechNodeId } from "../core/types";
import { formatShortMaterialCost } from "../data/materials";
import { WEAPON_TECH_TREE } from "../data/weaponTechTree";
import { COLORS, TEXT, colorHex } from "./theme";
import { TECH_NODE_HEIGHT, TECH_NODE_WIDTH, TECH_TREE_Y_OFFSET, getTechTreeBounds } from "./techTreeLayout";

interface TechNodeCardHandle {
  root: Phaser.GameObjects.Container;
  setFocused(focused: boolean): void;
  setState(state: {
    unlocked: boolean;
    available: boolean;
    affordable: boolean;
    locked: boolean;
    adjacentToUnlocked: boolean;
  }): void;
}

interface TechTreeBoardConfig {
  scene: Phaser.Scene;
  x?: number;
  y?: number;
  initialFocusedNodeId?: WeaponTechNodeId;
  onFocusChange?: (nodeId: WeaponTechNodeId) => void;
  onNodeActivated?: (nodeId: WeaponTechNodeId) => void;
  onNodeAlternateActivated?: (nodeId: WeaponTechNodeId) => void;
}

export class TechTreeBoard {
  readonly root: Phaser.GameObjects.Container;

  private readonly scene: Phaser.Scene;
  private readonly lineGraphics: Phaser.GameObjects.Graphics;
  private readonly onFocusChange?: (nodeId: WeaponTechNodeId) => void;
  private readonly onNodeActivated?: (nodeId: WeaponTechNodeId) => void;
  private readonly onNodeAlternateActivated?: (nodeId: WeaponTechNodeId) => void;
  private readonly techNodeCards = new Map<WeaponTechNodeId, TechNodeCardHandle>();

  private focusedTechNodeId: WeaponTechNodeId;

  constructor(config: TechTreeBoardConfig) {
    const {
      scene,
      x = 0,
      y = 0,
      initialFocusedNodeId = "armingSword",
      onFocusChange,
      onNodeActivated,
      onNodeAlternateActivated
    } = config;

    this.scene = scene;
    this.onFocusChange = onFocusChange;
    this.onNodeActivated = onNodeActivated;
    this.onNodeAlternateActivated = onNodeAlternateActivated;
    this.focusedTechNodeId = initialFocusedNodeId;
    this.root = scene.add.container(x, y);
    this.lineGraphics = scene.add.graphics();
    this.root.add(this.lineGraphics);

    for (const definition of gameManager.getWeaponTechRoster()) {
      const card = this.createTechNodeCard(definition);
      this.techNodeCards.set(definition.id, card);
      this.root.add(card.root);
    }

    this.refresh();
  }

  getFocusedNodeId(): WeaponTechNodeId {
    return this.focusedTechNodeId;
  }

  setFocusedNodeId(nodeId: WeaponTechNodeId): void {
    if (this.focusedTechNodeId === nodeId) {
      return;
    }

    this.focusedTechNodeId = nodeId;
    this.techNodeCards.forEach((card, id) => {
      card.setFocused(id === nodeId);
    });
    this.onFocusChange?.(nodeId);
  }

  refresh(): void {
    const state = gameManager.getState();
    const unlockedNodeIds = new Set(state.unlockedTechNodeIds);
    const roster = gameManager.getWeaponTechRoster();

    this.techNodeCards.forEach((card, nodeId) => {
      const node = WEAPON_TECH_TREE[nodeId];
      const unlocked = unlockedNodeIds.has(nodeId);
      const locked = gameManager.getWeaponTechBlockingNode(nodeId) !== null;
      const prerequisitesMet = node.prerequisiteIds.every((prerequisiteId) => unlockedNodeIds.has(prerequisiteId));
      const available = !unlocked && !locked && prerequisitesMet;
      const affordable = available && gameManager.canAfford(node.cost);
      const adjacentToUnlocked =
        node.prerequisiteIds.some((prerequisiteId) => unlockedNodeIds.has(prerequisiteId)) ||
        roster.some((candidate) => candidate.prerequisiteIds.includes(nodeId) && unlockedNodeIds.has(candidate.id));

      card.setFocused(nodeId === this.focusedTechNodeId);
      card.setState({
        unlocked,
        available,
        affordable,
        locked,
        adjacentToUnlocked
      });
    });

    this.drawConnections();
  }

  getLocalBounds(): ReturnType<typeof getTechTreeBounds> {
    return getTechTreeBounds(gameManager.getWeaponTechRoster());
  }

  private createTechNodeCard(definition: WeaponTechDefinition): TechNodeCardHandle {
    let focused = definition.id === this.focusedTechNodeId;
    let unlocked = false;
    let available = false;
    let affordable = false;
    let locked = false;
    let adjacentToUnlocked = false;

    const shadow = this.scene.add
      .rectangle(0, 7, TECH_NODE_WIDTH + 14, TECH_NODE_HEIGHT + 14, 0x05090f, 0.34)
      .setStrokeStyle(1, 0x000000, 0.14);
    const glow = this.scene.add.rectangle(0, 0, TECH_NODE_WIDTH + 18, TECH_NODE_HEIGHT + 18, definition.accent, 0.06);
    const background = this.scene.add
      .rectangle(0, 0, TECH_NODE_WIDTH, TECH_NODE_HEIGHT, COLORS.panel, 0.98)
      .setStrokeStyle(2, COLORS.panelEdge, 1)
      .setInteractive({ useHandCursor: true });
    const innerPanel = this.scene.add.rectangle(0, 0, TECH_NODE_WIDTH - 10, TECH_NODE_HEIGHT - 10, COLORS.panelSoft, 0.98);
    const accentBarGlow = this.scene.add.rectangle(
      0,
      -TECH_NODE_HEIGHT * 0.5 + 10,
      TECH_NODE_WIDTH - 20,
      11,
      definition.accent,
      0
    );
    const accentBar = this.scene.add.rectangle(
      0,
      -TECH_NODE_HEIGHT * 0.5 + 10,
      TECH_NODE_WIDTH - 30,
      5,
      definition.accent,
      0.9
    );
    const crest = this.scene.add
      .rectangle(0, -TECH_NODE_HEIGHT * 0.5 + 10, 12, 12, definition.accent, 0.5)
      .setAngle(45);
    const title = this.scene.add
      .text(0, -8, definition.shortName, {
        ...TEXT.caption,
        fontSize: "13px",
        align: "center",
        wordWrap: { width: 94, useAdvancedWrap: true }
      })
      .setOrigin(0.5);
    this.fitNodeTitle(title, 94, 28);
    const costText = this.scene.add.text(0, 18, "", { ...TEXT.caption, fontSize: "11px" }).setOrigin(0.5);
    const root = this.scene.add.container(definition.position.x, definition.position.y + TECH_TREE_Y_OFFSET, [
      shadow,
      glow,
      background,
      innerPanel,
      accentBarGlow,
      accentBar,
      crest,
      title,
      costText
    ]);

    const refresh = (): void => {
      const fillColor = unlocked
        ? mixColor(COLORS.panel, definition.accent, 0.36)
        : locked
          ? 0x26211d
          : available
            ? mixColor(COLORS.panel, definition.accent, 0.14)
            : COLORS.disabled;
      const innerColor = unlocked
        ? mixColor(COLORS.panelSoft, definition.accent, 0.16)
        : locked
          ? 0x1c1815
          : available
            ? COLORS.panelSoft
            : 0x2d2925;
      const strokeColor = focused
        ? COLORS.gold
        : unlocked
          ? definition.accent
          : locked
            ? 0x5a4f4f
            : available
            ? COLORS.panelEdge
            : 0x5a5148;
      const titleColor = unlocked || available ? colorHex(COLORS.ink) : locked ? "#9d8b8a" : "#7f8b96";
      const costColor = unlocked
        ? colorHex(COLORS.success)
        : locked
          ? "#9d8b8a"
          : available && affordable
            ? colorHex(COLORS.gold)
            : available
              ? "#b7c2cd"
              : "#6a7681";
      const glowAlpha = !adjacentToUnlocked ? 0 : focused ? 0.2 : unlocked ? 0.13 : available ? 0.11 : 0.05;
      const accentBarGlowAlpha = !adjacentToUnlocked ? 0 : focused ? 0.3 : unlocked ? 0.22 : available ? 0.2 : 0.08;
      const accentHighlightColor = adjacentToUnlocked ? COLORS.gold : definition.accent;

      shadow.setFillStyle(0x05090f, focused ? 0.42 : unlocked ? 0.38 : available ? 0.33 : 0.24);
      glow.setFillStyle(definition.accent, glowAlpha);
      background.setFillStyle(fillColor, unlocked ? 0.98 : available ? 0.96 : 0.9);
      background.setStrokeStyle(2, strokeColor, focused || unlocked || available || locked ? 1 : 0.55);
      innerPanel.setFillStyle(innerColor, 0.98);
      accentBarGlow.setFillStyle(locked ? 0x5a4f4f : accentHighlightColor, accentBarGlowAlpha);
      accentBar.setFillStyle(
        locked ? 0x5a4f4f : accentHighlightColor,
        locked ? 0.22 : adjacentToUnlocked ? focused ? 1 : unlocked ? 0.98 : available ? 0.92 : 0.42 : unlocked ? 0.94 : available ? 0.76 : 0.34
      );
      crest.setFillStyle(
        locked ? 0x5a4f4f : focused ? COLORS.gold : definition.accent,
        locked ? 0.18 : focused ? 0.75 : unlocked ? 0.56 : available ? 0.4 : 0.2
      );
      title.setColor(titleColor);
      costText.setColor(costColor);
      root.setAlpha(unlocked ? 1 : locked ? 0.56 : available ? affordable ? 1 : 0.86 : 0.62);
      root.setDepth(focused ? 12 : unlocked ? 9 : available ? 7 : 5);
    };

    background.on("pointerover", () => {
      if (!locked) {
        root.setScale(1.03);
      }
    });
    background.on("pointerout", () => {
      root.setScale(1);
    });
    background.on("pointerdown", () => {
      if (locked) {
        return;
      }

      root.setScale(0.98);
    });
    background.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      root.setScale(1.03);
      this.setFocusedNodeId(definition.id);

      if (pointer.button === 2) {
        this.onNodeAlternateActivated?.(definition.id);
        return;
      }

      if (!locked) {
        this.onNodeActivated?.(definition.id);
      }
    });

    return {
      root,
      setFocused(value) {
        focused = value;
        refresh();
      },
      setState(nextState) {
        unlocked = nextState.unlocked;
        available = nextState.available;
        affordable = nextState.affordable;
        locked = nextState.locked;
        adjacentToUnlocked = nextState.adjacentToUnlocked;
        costText.setText(
          unlocked ? "Forged" : locked ? "Sealed" : available ? formatShortMaterialCost(definition.cost) : "Locked"
        );
        refresh();
      }
    };
  }

  private drawConnections(): void {
    const state = gameManager.getState();

    this.lineGraphics.clear();

    for (const node of gameManager.getWeaponTechRoster()) {
      for (const prerequisiteId of node.prerequisiteIds) {
        const prerequisite = WEAPON_TECH_TREE[prerequisiteId];

        if (!prerequisite) {
          continue;
        }

        const parentUnlocked = state.unlockedTechNodeIds.includes(prerequisiteId);
        const childUnlocked = state.unlockedTechNodeIds.includes(node.id);
        const childLocked = gameManager.getWeaponTechBlockingNode(node.id) !== null;
        const childAvailable =
          !childLocked && node.prerequisiteIds.every((requiredId) => state.unlockedTechNodeIds.includes(requiredId));
        const color = childUnlocked ? COLORS.gold : childLocked ? 0x5a4f4f : childAvailable && parentUnlocked ? node.accent : COLORS.panelEdge;
        const alpha = childUnlocked ? 0.82 : childLocked ? 0.16 : parentUnlocked ? 0.52 : 0.24;

        this.lineGraphics.lineStyle(8, color, alpha * 0.15);
        this.drawConnectionPath(
          prerequisite.position.x,
          prerequisite.position.y + TECH_TREE_Y_OFFSET,
          node.position.x,
          node.position.y + TECH_TREE_Y_OFFSET
        );
        this.lineGraphics.lineStyle(3.5, color, alpha);
        this.drawConnectionPath(
          prerequisite.position.x,
          prerequisite.position.y + TECH_TREE_Y_OFFSET,
          node.position.x,
          node.position.y + TECH_TREE_Y_OFFSET
        );
      }
    }
  }

  private fitNodeTitle(title: Phaser.GameObjects.Text, maxWidth: number, maxHeight: number): void {
    const fontSizes = [13, 12, 11, 10, 9, 8, 7];
    const lineSpacings = [0, -1, -2, -3];

    for (const fontSize of fontSizes) {
      title.setFontSize(fontSize);

      for (const lineSpacing of lineSpacings) {
        title.setLineSpacing(lineSpacing);

        if (title.width <= maxWidth && title.height <= maxHeight) {
          title.setY(title.height > 22 ? -9 : -8);
          return;
        }
      }
    }

    title.setFontSize(7);
    title.setLineSpacing(-3);
    title.setY(-9);
  }

  private drawConnectionPath(startX: number, startY: number, endX: number, endY: number): void {
    this.lineGraphics.lineBetween(startX, startY, endX, endY);
  }
}

function mixColor(base: number, accent: number, amount: number): number {
  const baseColor = Phaser.Display.Color.IntegerToColor(base);
  const accentColor = Phaser.Display.Color.IntegerToColor(accent);

  return Phaser.Display.Color.GetColor(
    Phaser.Math.Linear(baseColor.red, accentColor.red, amount),
    Phaser.Math.Linear(baseColor.green, accentColor.green, amount),
    Phaser.Math.Linear(baseColor.blue, accentColor.blue, amount)
  );
}
