import Phaser from "phaser";
import { gameManager } from "../core/GameManager";
import { SCENE_KEYS } from "../core/SceneKeys";
import { formatMaterialInventory, formatShortMaterialCost } from "../data/materials";
import type { WeaponTechNodeId } from "../core/types";
import { WEAPON_TECH_TREE } from "../data/weaponTechTree";
import {
  TUTORIAL_PROMPT_IDS,
  TUTORIAL_TECH_TREE_PAGES
} from "../tutorial/tutorialData";
import { TechTreeBoard } from "../ui/TechTreeBoard";
import { createGuidedOverlay, type GuidedOverlayHandle } from "../ui/createGuidedOverlay";
import { createButton } from "../ui/createButton";
import {
  TECH_TREE_DRAG_PADDING_X,
  TECH_TREE_DRAG_PADDING_Y,
  TECH_TREE_Y_OFFSET
} from "../ui/techTreeLayout";
import { COLORS, TEXT, VIEWPORT, colorHex } from "../ui/theme";

export class TechTreeScene extends Phaser.Scene {
  private static readonly HUD_BOUNDS = new Phaser.Geom.Rectangle(32, 32, 332, 656);
  private focusedTechNodeId: WeaponTechNodeId = "armingSword";
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private cameraStartX = 0;
  private cameraStartY = 0;
  private dragBounds!: Phaser.Geom.Rectangle;
  private techTreeBoard!: TechTreeBoard;
  private summaryText!: Phaser.GameObjects.Text;
  private detailTitleText!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private tutorialOverlay: GuidedOverlayHandle | null = null;
  private legendaryPromptOverlay: Phaser.GameObjects.Container | null = null;

  constructor() {
    super(SCENE_KEYS.TechTree);
  }

  create(): void {
    this.input.mouse?.disableContextMenu();
    const unlockedNodes = gameManager.getUnlockedWeaponTechDefinitions();
    this.focusedTechNodeId = unlockedNodes.length > 0 ? unlockedNodes[unlockedNodes.length - 1].id : "armingSword";

    this.techTreeBoard = new TechTreeBoard({
      scene: this,
      initialFocusedNodeId: this.focusedTechNodeId,
      onFocusChange: (nodeId) => {
        this.focusedTechNodeId = nodeId;
        this.refreshView();
      },
      onNodeActivated: (nodeId) => this.attemptUnlockTechNode(nodeId),
      onNodeAlternateActivated: (nodeId) => this.handleAlternateNodeActivation(nodeId)
    });

    this.dragBounds = this.createWorldBackdrop();
    this.createDragSurface();
    this.techTreeBoard.root.setDepth(1);
    this.createHud();
    this.bindShortcuts();
    this.centerCameraOnFocusedNode();
    this.refreshView();
    this.maybeOpenTutorialOverlay();
  }

  private createWorldBackdrop(): Phaser.Geom.Rectangle {
    const bounds = this.techTreeBoard.getLocalBounds();
    const worldBounds = new Phaser.Geom.Rectangle(
      bounds.minX - TECH_TREE_DRAG_PADDING_X,
      bounds.minY - TECH_TREE_DRAG_PADDING_Y,
      bounds.width + TECH_TREE_DRAG_PADDING_X * 2,
      bounds.height + TECH_TREE_DRAG_PADDING_Y * 2
    );

    this.cameras.main.setBackgroundColor(COLORS.background);
    this.cameras.main.setBounds(worldBounds.x, worldBounds.y, worldBounds.width, worldBounds.height);

    const graphics = this.add.graphics().setDepth(-10);
    graphics.fillStyle(COLORS.background, 1);
    graphics.fillRect(worldBounds.x, worldBounds.y, worldBounds.width, worldBounds.height);
    graphics.fillStyle(COLORS.panelSoft, 0.24);
    graphics.fillRect(worldBounds.x, worldBounds.y, worldBounds.width, 132);
    graphics.fillStyle(COLORS.gold, 0.08);
    graphics.fillCircle(bounds.minX + bounds.width * 0.52, bounds.minY + bounds.height * 0.42, 260);
    graphics.fillStyle(0x8f4f22, 0.05);
    graphics.fillCircle(bounds.minX + 260, bounds.minY + 180, 220);
    graphics.fillStyle(0x62544a, 0.05);
    graphics.fillCircle(bounds.maxX - 180, bounds.minY + 200, 240);
    graphics.lineStyle(1, COLORS.panelEdge, 0.1);

    const gridStep = 96;
    const startX = Math.floor(worldBounds.x / gridStep) * gridStep;
    const endX = worldBounds.x + worldBounds.width;
    for (let x = startX; x <= endX; x += gridStep) {
      graphics.lineBetween(x, worldBounds.y, x, worldBounds.y + worldBounds.height);
    }

    const startY = Math.floor(worldBounds.y / gridStep) * gridStep;
    const endY = worldBounds.y + worldBounds.height;
    for (let y = startY; y <= endY; y += gridStep) {
      graphics.lineBetween(worldBounds.x, y, worldBounds.x + worldBounds.width, y);
    }

    return worldBounds;
  }

  private createDragSurface(): void {
    const dragSurface = this.add
      .rectangle(this.dragBounds.x, this.dragBounds.y, this.dragBounds.width, this.dragBounds.height, 0x000000, 0.001)
      .setOrigin(0)
      .setDepth(-5)
      .setInteractive({ useHandCursor: true });

    dragSurface.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (TechTreeScene.HUD_BOUNDS.contains(pointer.x, pointer.y)) {
        return;
      }

      this.isDragging = true;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.cameraStartX = this.cameras.main.scrollX;
      this.cameraStartY = this.cameras.main.scrollY;
      if (dragSurface.input) {
        dragSurface.input.cursor = "grabbing";
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !pointer.isDown) {
        return;
      }

      this.cameras.main.scrollX = this.cameraStartX - (pointer.x - this.dragStartX);
      this.cameras.main.scrollY = this.cameraStartY - (pointer.y - this.dragStartY);
      this.clampCameraToBounds();
    });

    const stopDragging = (): void => {
      this.isDragging = false;
      if (dragSurface.input) {
        dragSurface.input.cursor = "pointer";
      }
    };

    this.input.on("pointerup", stopDragging);
    this.input.on("gameout", stopDragging);
  }

  private createHud(): void {
    this.add
      .rectangle(32, 32, 332, 502, COLORS.panel, 0.95)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.panelEdge, 1)
      .setScrollFactor(0)
      .setDepth(20);
    this.add
      .rectangle(32, 554, 332, 134, COLORS.panel, 0.95)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.panelEdge, 1)
      .setScrollFactor(0)
      .setDepth(20);

    this.add.text(56, 56, "Tech Tree", TEXT.heading).setScrollFactor(0).setDepth(21);
    this.add
      .text(56, 92, "Drag outside a node to pan the tech tree.", { ...TEXT.small, color: colorHex(COLORS.subtext) })
      .setScrollFactor(0)
      .setDepth(21);

    this.summaryText = this.add.text(56, 136, "", TEXT.small).setWordWrapWidth(284).setScrollFactor(0).setDepth(21);
    this.detailTitleText = this.add.text(56, 332, "", TEXT.heading).setWordWrapWidth(284).setScrollFactor(0).setDepth(21);
    this.detailText = this.add.text(56, 372, "", TEXT.small).setWordWrapWidth(284).setScrollFactor(0).setDepth(21);
    this.feedbackText = this.add
      .text(56, 578, "", { ...TEXT.small, color: colorHex(COLORS.gold) })
      .setWordWrapWidth(284)
      .setScrollFactor(0)
      .setDepth(21);

    const backButton = createButton({
      scene: this,
      x: 198,
      y: 650,
      width: 252,
      height: 64,
      label: "Back to Forge",
      hint: "Return to the forge",
      accent: 0x2e4557,
      scrollFactor: 0,
      onClick: () => gameManager.returnToForge(this)
    });
    backButton.root.setDepth(21);
  }

  private bindShortcuts(): void {
    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.legendaryPromptOverlay) {
        this.legendaryPromptOverlay.destroy();
        this.legendaryPromptOverlay = null;
        return;
      }

      if (this.tutorialOverlay) {
        return;
      }

      gameManager.returnToForge(this);
    });
  }

  private centerCameraOnFocusedNode(): void {
    const focus = WEAPON_TECH_TREE[this.focusedTechNodeId];
    this.cameras.main.centerOn(focus.position.x, focus.position.y + TECH_TREE_Y_OFFSET);
    this.clampCameraToBounds();
  }

  private clampCameraToBounds(): void {
    const minScrollX = this.dragBounds.x;
    const maxScrollX = Math.max(minScrollX, this.dragBounds.right - VIEWPORT.width);
    const minScrollY = this.dragBounds.y;
    const maxScrollY = Math.max(minScrollY, this.dragBounds.bottom - VIEWPORT.height);

    this.cameras.main.scrollX = Phaser.Math.Clamp(this.cameras.main.scrollX, minScrollX, maxScrollX);
    this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY, minScrollY, maxScrollY);
  }

  private attemptUnlockTechNode(nodeId: WeaponTechNodeId): void {
    const node = WEAPON_TECH_TREE[nodeId];
    const blockingNode = gameManager.getWeaponTechBlockingNode(nodeId);
    const prerequisitesMet = node.prerequisiteIds.every((prerequisiteId) => gameManager.isWeaponTechUnlocked(prerequisiteId));
    const arcaneDebtActive = gameManager.hasOwnedRunModifier("arcaneDebt");

    if (gameManager.isWeaponTechUnlocked(nodeId)) {
      this.feedbackText.setText(`${node.name} already forged.`);
      this.refreshView();
      return;
    }

    if (arcaneDebtActive) {
      this.feedbackText.setText("Arcane Debt seals the tech tree for this run.");
      this.refreshView();
      return;
    }

    if (blockingNode) {
      this.feedbackText.setText(`${blockingNode.name} sealed this branch.`);
      this.refreshView();
      return;
    }

    if (!prerequisitesMet) {
      this.feedbackText.setText(`${node.name} is still locked.`);
      this.refreshView();
      return;
    }

    if (gameManager.unlockWeaponTech(nodeId)) {
      this.feedbackText.setText(`${node.name} forged.`);
    } else {
      this.feedbackText.setText(`Need ${formatShortMaterialCost(node.cost)}.`);
    }

    this.refreshView();
  }

  private handleAlternateNodeActivation(nodeId: WeaponTechNodeId): void {
    if (nodeId !== "longsword") {
      this.feedbackText.setText("Only the Longsword holds a hidden ascension.");
      this.refreshView();
      return;
    }

    if (gameManager.canAscendLongswordToExcalibur()) {
      this.openExcaliburPrompt();
      return;
    }

    const ascension = gameManager.getExcaliburAscensionState();

    if (ascension.unlocked) {
      this.feedbackText.setText("Excalibur is already unlocked. Watch for The Sword In The Stone.");
    } else if (!ascension.honoredCleared) {
      this.feedbackText.setText("Defeat The Honored at least once to wake this ascension.");
    } else if (!ascension.ready) {
      this.feedbackText.setText(`Need 10 flawless Blessed Longsword wins. Current streak: ${ascension.flawlessStreak}/10.`);
    } else if (!ascension.onEligibleLeaf) {
      this.feedbackText.setText("Ascension is ready, but you must stand on a finished Longsword branch leaf first.");
    } else {
      this.feedbackText.setText("The longsword line is not ready to ascend yet.");
    }

    this.refreshView();
  }

  private refreshView(): void {
    const state = gameManager.getState();
    const stats = gameManager.getCombatStats();
    const focusedNode = WEAPON_TECH_TREE[this.focusedTechNodeId];
    const blockingNode = gameManager.getWeaponTechBlockingNode(focusedNode.id);
    const prerequisitesMet = focusedNode.prerequisiteIds.every((prerequisiteId) => state.unlockedTechNodeIds.includes(prerequisiteId));
    const unlocked = state.unlockedTechNodeIds.includes(focusedNode.id);
    const arcaneDebtActive = gameManager.hasOwnedRunModifier("arcaneDebt");
    const available = !unlocked && !blockingNode && prerequisitesMet;
    const affordable = available && gameManager.canAfford(focusedNode.cost);
    const excalibur = gameManager.getExcaliburAscensionState();
    const status = unlocked
      ? "Forged"
      : arcaneDebtActive
        ? "Sealed by Arcane Debt"
      : blockingNode
        ? `Sealed by ${blockingNode.shortName}`
        : available
          ? affordable
            ? `Cost ${formatShortMaterialCost(focusedNode.cost)}`
            : `Need ${formatShortMaterialCost(focusedNode.cost)}`
          : "Locked";

    this.summaryText.setText(
      [
        `Weapon: ${stats.sword.name}`,
        "",
        formatMaterialInventory(state.materials),
        `Branch: ${this.formatCurrentBranch(state.unlockedTechNodeIds)}`,
        `Affinity: ${this.formatAffinity(stats.sword.affinity)}`
      ].join("\n")
    );

    this.detailTitleText.setText(focusedNode.name);
    this.fitDetailTitle(this.detailTitleText, 284, 54);
    this.detailText.setY(346 + this.detailTitleText.height);
    this.detailText.setText(
      [
        status,
        focusedNode.summary,
        focusedNode.detail,
        focusedNode.id === "longsword"
          ? [
              "Hidden Ascension",
              excalibur.unlocked
                ? "Excalibur unlocked. A rare Sword In The Stone event can now upgrade future runs."
                : `Flawless Blessed Longsword streak: ${excalibur.flawlessStreak}/10`,
              excalibur.honoredCleared ? "The Honored has been defeated." : "Defeat The Honored once to qualify.",
              excalibur.ready
                ? excalibur.onEligibleLeaf
                  ? "Right-click Longsword to ascend."
                  : "Ascension is ready. Reach a finished Longsword branch leaf, then right-click Longsword."
                : "Ascension remains dormant."
            ].join("\n")
          : ""
      ]
        .filter((entry) => entry.length > 0)
        .join("\n\n")
    );
    this.techTreeBoard.setFocusedNodeId(this.focusedTechNodeId);
    this.techTreeBoard.refresh();
  }

  private formatCurrentBranch(unlockedTechNodeIds: WeaponTechNodeId[]): string {
    const branchNode = unlockedTechNodeIds
      .map((nodeId) => WEAPON_TECH_TREE[nodeId])
      .find((definition) => definition.branch !== "root");

    return branchNode ? branchNode.name : "Arming Sword";
  }

  private formatAffinity(affinity: string): string {
    if (!affinity) {
      return "Unknown";
    }

    return affinity.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
  }

  private fitDetailTitle(title: Phaser.GameObjects.Text, maxWidth: number, maxHeight: number): void {
    const fontSizes = [26, 24, 22, 20, 18];
    const lineSpacings = [0, -2, -4];

    for (const fontSize of fontSizes) {
      title.setFontSize(fontSize);

      for (const lineSpacing of lineSpacings) {
        title.setLineSpacing(lineSpacing);

        if (title.width <= maxWidth && title.height <= maxHeight) {
          return;
        }
      }
    }

    title.setFontSize(18);
    title.setLineSpacing(-4);
  }

  private maybeOpenTutorialOverlay(): void {
    if (!gameManager.isTutorialMode() || gameManager.hasSeenTutorialPrompt(TUTORIAL_PROMPT_IDS.techTree)) {
      return;
    }

    this.tutorialOverlay = createGuidedOverlay({
      scene: this,
      pages: TUTORIAL_TECH_TREE_PAGES,
      finalLabel: "Inspect The Tree",
      onComplete: () => {
        gameManager.markTutorialPromptSeen(TUTORIAL_PROMPT_IDS.techTree);
        this.tutorialOverlay = null;
        this.feedbackText.setText("Pan the tree, inspect a node, then return to the forge when you are ready.");
      }
    });
  }

  private openExcaliburPrompt(): void {
    this.legendaryPromptOverlay?.destroy();

    const veil = this.add
      .rectangle(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5, VIEWPORT.width, VIEWPORT.height, 0x060a10, 0.72)
      .setScrollFactor(0);
    const panel = this.add
      .rectangle(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5, 500, 280, COLORS.panel, 0.98)
      .setStrokeStyle(2, COLORS.gold, 0.92)
      .setScrollFactor(0);
    const title = this.add.text(VIEWPORT.width * 0.5, 252, "Ascend To Excalibur?", TEXT.heading).setOrigin(0.5).setScrollFactor(0);
    const copy = this.add
      .text(
        VIEWPORT.width * 0.5,
        314,
        "Would you like to ascend to Excalibur?\nThis upgrades the current run's sword into the hidden legendary blade.",
        { ...TEXT.small, align: "center", color: colorHex(COLORS.subtext) }
      )
      .setOrigin(0.5)
      .setWordWrapWidth(404)
      .setScrollFactor(0);

    const container = this.add.container(0, 0, [veil, panel, title, copy]);
    container.setDepth(40).setScrollFactor(0);
    [veil, panel, title, copy].forEach((entry) => entry.setDepth(40));

    const closePrompt = (): void => {
      container.destroy();
      this.legendaryPromptOverlay = null;
    };

    const yesButton = createButton({
      scene: this,
      x: VIEWPORT.width * 0.5 - 92,
      y: 434,
      width: 160,
      height: 62,
      label: "Ascend",
      hint: "Accept the legendary upgrade",
      accent: 0x6a5b2b,
      scrollFactor: 0,
      onClick: () => {
        if (gameManager.ascendLongswordToExcalibur()) {
          this.feedbackText.setText("Excalibur ascended from the longsword line.");
        } else {
          this.feedbackText.setText("The ascension failed to answer.");
        }

        closePrompt();
        this.refreshView();
      }
    });
    yesButton.root.setDepth(41);
    container.add(yesButton.root);

    const noButton = createButton({
      scene: this,
      x: VIEWPORT.width * 0.5 + 92,
      y: 434,
      width: 160,
      height: 62,
      label: "Wait",
      hint: "Keep the current blade for now",
      accent: 0x394554,
      scrollFactor: 0,
      onClick: closePrompt
    });
    noButton.root.setDepth(41);
    container.add(noButton.root);

    this.legendaryPromptOverlay = container;
  }
}
