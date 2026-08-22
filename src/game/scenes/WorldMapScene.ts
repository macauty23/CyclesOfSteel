import Phaser from "phaser";
import { gameManager } from "../core/GameManager";
import { SCENE_KEYS } from "../core/SceneKeys";
import type { MaterialCost, RegionId, WorldNodeDefinition } from "../core/types";
import { MATERIAL_LABELS, formatMaterialCost, formatMaterialInventory, materialCostEntries } from "../data/materials";
import { getArenaEnvironmentDefinition } from "../data/arenaEnvironments";
import { getBossDefinition } from "../data/bosses";
import { getChallengeShrineDefinition } from "../data/challengeShrines";
import { getEnemyDefinition } from "../data/enemies";
import { RELICS } from "../data/relics";
import { RUN_MODIFIERS } from "../data/runModifiers";
import { getRunEventDefinition, type RunEventChoice } from "../data/runEvents";
import {
  TUTORIAL_PROMPT_IDS,
  TUTORIAL_WORLD_MAP_PAGES
} from "../tutorial/tutorialData";
import { createGuidedOverlay, type GuidedOverlayHandle } from "../ui/createGuidedOverlay";
import {
  BIOME_BACKGROUND_KEYS,
  getBiomeBackgroundConfig,
  preloadBiomeBackgrounds,
  type BiomeBackgroundConfig
} from "../ui/biomeBackgrounds";
import { createButton, type ButtonHandle } from "../ui/createButton";
import { fadeInMajorScene } from "../ui/sceneFades";
import { applyLocalizedText, localizeTextStyle } from "../ui/localization";
import { COLORS, TEXT, VIEWPORT, colorHex } from "../ui/theme";

interface NodeCardHandle {
  flare: Phaser.GameObjects.Ellipse;
  backdrop: Phaser.GameObjects.Image;
  background: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
  subtitle: Phaser.GameObjects.Text;
}

interface MerchantOption {
  name: string;
  hint: string;
  payment: MaterialCost;
  reward: MaterialCost;
}

interface BiomeBackgroundFrame {
  image: Phaser.GameObjects.Image;
  wash: Phaser.GameObjects.Image;
  haze: Phaser.GameObjects.Image;
  imageAlpha: number;
  hazeAlpha: number;
  washTextureKey: string;
  hazeTextureKey: string;
}

export class WorldMapScene extends Phaser.Scene {
  private static readonly HUD_BOUNDS = new Phaser.Geom.Rectangle(32, 32, 340, 650);
  private static readonly NODE_CARD_WIDTH = 100;
  private static readonly NODE_CARD_HEIGHT = 58;
  private static readonly NODE_BACKDROP_PADDING = 6;
  private static readonly NODE_BACKDROP_TEXTURE_KEY = "world-map-node-card-backdrop";
  private static readonly MAP_CONTENT_X = 396;
  private static readonly MAP_CONTENT_WIDTH = VIEWPORT.width - WorldMapScene.MAP_CONTENT_X - 24;
  private static readonly MAP_ARTWORK_X = WorldMapScene.MAP_CONTENT_X;
  private static readonly MAP_ARTWORK_WIDTH = WorldMapScene.MAP_CONTENT_WIDTH;
  private static readonly SPECIAL_REGION_IDS = new Set<RegionId>([
    "frostlands",
    "frozenPeaks",
    "volcanicLand",
    "volcano",
    "crystalCaverns",
    "glacier",
    "iceCaves",
    "lavaFields",
    "obsidianWastes",
    "grandReef",
    "sunkenRuins",
    "crystalValley",
    "skyIslands"
  ]);
  private readonly nodeCards = new Map<string, NodeCardHandle>();
  private connectionGraphics: Phaser.GameObjects.Graphics | null = null;
  private selectedNodeId = "";
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private cameraStartX = 0;
  private cameraStartY = 0;
  private dragBounds = new Phaser.Geom.Rectangle(0, 0, VIEWPORT.width, VIEWPORT.height);
  private summaryText!: Phaser.GameObjects.Text;
  private detailTitleText!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private travelHintText!: Phaser.GameObjects.Text;
  private travelButton: ButtonHandle | null = null;
  private merchantOverlay: Phaser.GameObjects.Container | null = null;
  private eventOverlay: Phaser.GameObjects.Container | null = null;
  private runMenuOverlay: Phaser.GameObjects.Container | null = null;
  private tutorialOverlay: GuidedOverlayHandle | null = null;
  private lastTestModeEnterNodeId = "";
  private lastTestModeEnterAt = -Infinity;
  private forcedTestNodeId: string | null = null;
  private biomeBackgroundFrame: BiomeBackgroundFrame | null = null;
  private biomeBackgroundKey = "";

  constructor() {
    super(SCENE_KEYS.WorldMap);
  }

  preload(): void {
    preloadBiomeBackgrounds(this);
  }

  create(): void {
    fadeInMajorScene(this);
    const available = gameManager.getAvailableWorldNodeDefinitions();
    const visibleNodes = gameManager.getCurrentChapterWorldNodeDefinitions();
    this.selectedNodeId = available[0]?.id ?? visibleNodes[0]?.id ?? "";
    this.nodeCards.clear();
    this.merchantOverlay = null;
    this.eventOverlay = null;
    this.runMenuOverlay = null;
    this.tutorialOverlay = null;
    this.travelButton = null;
    this.lastTestModeEnterNodeId = "";
    this.lastTestModeEnterAt = -Infinity;
    this.forcedTestNodeId = null;
    this.biomeBackgroundFrame = null;
    this.biomeBackgroundKey = "";
    this.connectionGraphics = null;

    this.clearRetiredBiomeSliceTextures();
    this.updateBiomeBackground(gameManager.getWorldNodeDefinition(this.selectedNodeId)?.regionId ?? "plains", true);
    this.dragBounds = this.paintBackdrop(visibleNodes);
    this.createDragSurface();
    this.drawConnections(visibleNodes);
    this.drawNodes(visibleNodes);
    this.drawHud();
    this.bindShortcuts();
    this.centerCameraOnSelectedNode();
    this.refreshView();
    this.maybeOpenTutorialOverlay();
  }

  private paintBackdrop(nodes: WorldNodeDefinition[]): Phaser.Geom.Rectangle {
    const worldBounds = this.getWorldBounds(nodes);

    this.cameras.main.setBackgroundColor(COLORS.background);
    this.cameras.main.setBounds(worldBounds.x, worldBounds.y, worldBounds.width, worldBounds.height);

    return worldBounds;
  }

  private clearRetiredBiomeSliceTextures(): void {
    for (const textureKey of Object.values(BIOME_BACKGROUND_KEYS)) {
      for (const layerId of ["topSky", "bottomForeground", "leftDecoration", "rightDecoration"]) {
        const retiredFrameKey = `world-map-frame-${textureKey}-${layerId}`;

        if (this.textures.exists(retiredFrameKey)) {
          this.textures.remove(retiredFrameKey);
        }
      }

      const retiredWashKey = `world-map-readability-wash-${textureKey}`;

      if (this.textures.exists(retiredWashKey)) {
        this.textures.remove(retiredWashKey);
      }

      const retiredHazeKey = `world-map-horizon-haze-${textureKey}`;

      if (this.textures.exists(retiredHazeKey)) {
        this.textures.remove(retiredHazeKey);
      }
    }
  }

  private createReadabilityWashTexture(config: BiomeBackgroundConfig): string {
    const washTextureKey = `world-map-readability-wash-${config.textureKey}`;

    if (this.textures.exists(washTextureKey)) {
      return washTextureKey;
    }

    const canvasTexture = this.textures.createCanvas(
      washTextureKey,
      WorldMapScene.MAP_ARTWORK_WIDTH,
      VIEWPORT.height
    );

    if (!canvasTexture) {
      throw new Error(`Unable to create World Map readability wash: ${washTextureKey}`);
    }

    const context = canvasTexture.context;
    const width = WorldMapScene.MAP_ARTWORK_WIDTH;
    const height = VIEWPORT.height;
    const centerX = width * config.washCenterX;
    const centerY = height * config.washCenterY;
    const radiusX = width * config.washRadiusX;
    const radiusY = height * config.washRadiusY;
    const verticalScale = radiusY / radiusX;

    context.save();
    context.translate(centerX, centerY);
    context.scale(1, verticalScale);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radiusX);
    gradient.addColorStop(0, `rgba(5, 12, 19, ${config.washCenterAlpha})`);
    gradient.addColorStop(0.48, `rgba(5, 12, 19, ${config.washCenterAlpha * 0.82})`);
    gradient.addColorStop(0.8, `rgba(5, 12, 19, ${Math.max(config.washEdgeAlpha, config.washCenterAlpha * 0.46)})`);
    gradient.addColorStop(1, `rgba(5, 12, 19, ${config.washEdgeAlpha})`);
    context.fillStyle = gradient;
    context.fillRect(-centerX, -centerY / verticalScale, width, height / verticalScale);
    context.restore();
    canvasTexture.refresh();

    return washTextureKey;
  }

  private createHorizonHazeTexture(config: BiomeBackgroundConfig): string {
    const hazeTextureKey = `world-map-horizon-haze-${config.textureKey}`;

    if (this.textures.exists(hazeTextureKey)) {
      return hazeTextureKey;
    }

    const canvasTexture = this.textures.createCanvas(
      hazeTextureKey,
      WorldMapScene.MAP_ARTWORK_WIDTH,
      VIEWPORT.height
    );

    if (!canvasTexture) {
      throw new Error(`Unable to create World Map horizon haze: ${hazeTextureKey}`);
    }

    const context = canvasTexture.context;
    const width = WorldMapScene.MAP_ARTWORK_WIDTH;
    const height = VIEWPORT.height;
    const hazeColor = Phaser.Display.Color.IntegerToColor(config.horizonHazeColor ?? 0xc7ddea);
    const hazeHeight = height * (config.horizonHazeHeight ?? 0.18);
    const centerY = height * (config.horizonY ?? 0.35);
    const startY = Phaser.Math.Clamp(centerY - hazeHeight * 0.5, 0, height);
    const endY = Phaser.Math.Clamp(centerY + hazeHeight * 0.5, 0, height);
    const gradient = context.createLinearGradient(0, startY, 0, endY);
    const rgba = (alpha: number): string => `rgba(${hazeColor.red}, ${hazeColor.green}, ${hazeColor.blue}, ${alpha})`;

    gradient.addColorStop(0, rgba(0));
    gradient.addColorStop(0.3, rgba(0.52));
    gradient.addColorStop(0.5, rgba(1));
    gradient.addColorStop(0.7, rgba(0.52));
    gradient.addColorStop(1, rgba(0));
    context.fillStyle = gradient;
    context.fillRect(0, startY, width, endY - startY);
    canvasTexture.refresh();

    return hazeTextureKey;
  }

  private createNodeBackdropTexture(): string {
    const textureKey = WorldMapScene.NODE_BACKDROP_TEXTURE_KEY;

    if (this.textures.exists(textureKey)) {
      return textureKey;
    }

    const padding = WorldMapScene.NODE_BACKDROP_PADDING;
    const width = WorldMapScene.NODE_CARD_WIDTH + padding * 2;
    const height = WorldMapScene.NODE_CARD_HEIGHT + padding * 2;
    const canvasTexture = this.textures.createCanvas(textureKey, width, height);

    if (!canvasTexture) {
      throw new Error(`Unable to create World Map node backdrop: ${textureKey}`);
    }

    const context = canvasTexture.context;
    context.clearRect(0, 0, width, height);
    context.save();
    context.fillStyle = "rgba(5, 12, 19, 0.92)";
    context.shadowColor = "rgba(1, 5, 10, 0.95)";
    context.shadowBlur = 8;
    context.fillRect(padding, padding, WorldMapScene.NODE_CARD_WIDTH, WorldMapScene.NODE_CARD_HEIGHT);
    context.restore();
    canvasTexture.refresh();

    return textureKey;
  }

  private createBiomeBackground(config: BiomeBackgroundConfig, alphaMultiplier: number): BiomeBackgroundFrame {
    const source = this.textures.get(config.textureKey).getSourceImage();
    const scale = Math.max(WorldMapScene.MAP_ARTWORK_WIDTH / source.width, VIEWPORT.height / source.height);
    const displayWidth = source.width * scale;
    const displayHeight = source.height * scale;
    const desiredX =
      WorldMapScene.MAP_ARTWORK_X + WorldMapScene.MAP_ARTWORK_WIDTH * 0.5 - displayWidth * config.focalX;
    const desiredY = VIEWPORT.height * 0.5 - displayHeight * config.focalY;
    const imageX = Phaser.Math.Clamp(
      desiredX,
      WorldMapScene.MAP_ARTWORK_X + WorldMapScene.MAP_ARTWORK_WIDTH - displayWidth,
      WorldMapScene.MAP_ARTWORK_X
    );
    const imageY = Phaser.Math.Clamp(desiredY, VIEWPORT.height - displayHeight, 0);
    const washTextureKey = this.createReadabilityWashTexture(config);
    const hazeTextureKey = this.createHorizonHazeTexture(config);
    const hazeAlpha = config.horizonHazeAlpha ?? 0;

    return {
      image: this.add
        .image(imageX, imageY, config.textureKey)
        .setOrigin(0)
        .setDisplaySize(displayWidth, displayHeight)
        .setScrollFactor(0)
        .setDepth(-10)
        .setAlpha(config.imageAlpha * alphaMultiplier),
      wash: this.add
        .image(WorldMapScene.MAP_ARTWORK_X, 0, washTextureKey)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(-8)
        .setAlpha(alphaMultiplier),
      haze: this.add
        .image(WorldMapScene.MAP_ARTWORK_X, 0, hazeTextureKey)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(-7)
        .setAlpha(hazeAlpha * alphaMultiplier),
      imageAlpha: config.imageAlpha,
      hazeAlpha,
      washTextureKey,
      hazeTextureKey
    };
  }

  private destroyBiomeBackground(frame: BiomeBackgroundFrame): void {
    this.tweens.killTweensOf(frame.image);
    this.tweens.killTweensOf(frame.wash);
    this.tweens.killTweensOf(frame.haze);
    frame.image.destroy();
    frame.wash.destroy();
    frame.haze.destroy();

    if (this.textures.exists(frame.washTextureKey)) {
      this.textures.remove(frame.washTextureKey);
    }

    if (this.textures.exists(frame.hazeTextureKey)) {
      this.textures.remove(frame.hazeTextureKey);
    }
  }

  private updateBiomeBackground(regionId: RegionId, immediate = false): void {
    const config = getBiomeBackgroundConfig(regionId);
    const textureKey = config.textureKey;

    if (textureKey === this.biomeBackgroundKey && this.biomeBackgroundFrame) {
      return;
    }

    const nextFrame = this.createBiomeBackground(config, immediate ? 1 : 0);
    const previousFrame = this.biomeBackgroundFrame;
    this.biomeBackgroundFrame = nextFrame;
    this.biomeBackgroundKey = textureKey;

    if (immediate || !previousFrame) {
      if (previousFrame) {
        this.destroyBiomeBackground(previousFrame);
      }
      return;
    }

    this.tweens.add({
      targets: [previousFrame.image, previousFrame.wash, previousFrame.haze],
      alpha: 0,
      duration: 520,
      ease: "Sine.easeInOut",
      onComplete: () => this.destroyBiomeBackground(previousFrame)
    });
    this.tweens.add({
      targets: nextFrame.image,
      alpha: nextFrame.imageAlpha,
      duration: 520,
      ease: "Sine.easeInOut"
    });
    this.tweens.add({
      targets: nextFrame.wash,
      alpha: 1,
      duration: 520,
      ease: "Sine.easeInOut"
    });
    this.tweens.add({
      targets: nextFrame.haze,
      alpha: nextFrame.hazeAlpha,
      duration: 520,
      ease: "Sine.easeInOut"
    });
  }

  private drawConnections(nodes: WorldNodeDefinition[]): void {
    this.connectionGraphics = this.add.graphics().setDepth(1);
    this.refreshConnections(nodes);
  }

  private refreshConnections(nodes: WorldNodeDefinition[]): void {
    const graphics = this.connectionGraphics;

    if (!graphics) {
      return;
    }

    graphics.clear();
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const state = gameManager.getState();

    for (const node of nodes) {
      const start = this.getNodePosition(node);

      for (const nextNodeId of node.nextNodeIds) {
        const nextNode = nodesById.get(nextNodeId);

        if (!nextNode) {
          continue;
        }

        const end = this.getNodePosition(nextNode);
        const region = gameManager.getRegionDefinition(nextNode.regionId);
        const direction = new Phaser.Math.Vector2(end.x - start.x, end.y - start.y);

        if (direction.lengthSq() === 0) {
          continue;
        }

        direction.normalize();
        const startX = start.x + direction.x * 52;
        const startY = start.y + direction.y * 22;
        const endX = end.x - direction.x * 52;
        const endY = end.y - direction.y * 22;
        const completed = state.visitedNodeIds.includes(node.id) && state.visitedNodeIds.includes(nextNode.id);
        const selected = node.id === this.selectedNodeId || nextNode.id === this.selectedNodeId;
        const reachable = !completed && (state.availableNodeIds.includes(node.id) || state.availableNodeIds.includes(nextNode.id));
        const color = selected ? COLORS.gold : completed ? 0x647381 : reachable ? region.edge : 0x3b4651;
        const alpha = selected ? 0.94 : completed ? 0.42 : reachable ? 0.64 : 0.27;
        const width = selected ? 4 : reachable ? 2.5 : completed ? 2 : 1.5;

        graphics.lineStyle(width + 2, 0x071019, selected ? 0.5 : 0.28);
        graphics.lineBetween(startX, startY, endX, endY);
        graphics.lineStyle(width, color, alpha);
        graphics.lineBetween(startX, startY, endX, endY);
        graphics.fillStyle(color, alpha * 0.45);
        graphics.fillCircle(startX, startY, selected ? 4 : 3);
        graphics.fillCircle(endX, endY, selected ? 4 : 3);
      }
    }
  }

  private drawNodes(nodes: WorldNodeDefinition[]): void {
    const backdropTextureKey = this.createNodeBackdropTexture();

    for (const node of nodes) {
      const position = this.getNodePosition(node);
      const interactive = this.add
        .rectangle(position.x, position.y, 112, 68, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true })
        .setDepth(4);
      const flare = this.add.ellipse(position.x, position.y, 116, 74, 0xd9b67a, 0.08).setDepth(1.5);
      const backdrop = this.add
        .image(position.x, position.y, backdropTextureKey)
        .setDisplaySize(
          WorldMapScene.NODE_CARD_WIDTH + WorldMapScene.NODE_BACKDROP_PADDING * 2,
          WorldMapScene.NODE_CARD_HEIGHT + WorldMapScene.NODE_BACKDROP_PADDING * 2
        )
        .setDepth(1.75)
        .setAlpha(0.16);
      const background = this.add
        .rectangle(
          position.x,
          position.y,
          WorldMapScene.NODE_CARD_WIDTH,
          WorldMapScene.NODE_CARD_HEIGHT,
          COLORS.panelSoft,
          0.96
        )
        .setDepth(2)
        .setStrokeStyle(2, COLORS.panelEdge, 1);
      const title = this.add
        .text(position.x, position.y - 8, "", { ...TEXT.button, fontSize: "14px", align: "center" })
        .setOrigin(0.5)
        .setWordWrapWidth(82)
        .setShadow(1, 1, "#091019", 2, false, true)
        .setDepth(3);
      const subtitle = this.add
        .text(position.x, position.y + 12, "", { ...TEXT.caption, fontSize: "11px", align: "center" })
        .setOrigin(0.5)
        .setWordWrapWidth(82)
        .setShadow(1, 1, "#091019", 2, false, true)
        .setDepth(3);
      interactive.on("pointerup", () => {
        this.selectedNodeId = node.id;
        this.refreshView();
      });

      this.nodeCards.set(node.id, {
        flare,
        backdrop,
        background,
        title,
        subtitle
      });
    }
  }

  private drawHud(): void {
    this.add
      .rectangle(30, 30, 352, 662, 0x111214, 0.46)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(19);
    this.add
      .rectangle(36, 36, 340, 650, COLORS.panel, 1)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.panelEdge, 1)
      .setScrollFactor(0)
      .setDepth(20);
    this.add.text(60, 62, "World Map", TEXT.heading).setScrollFactor(0).setDepth(21);
    this.add
      .text(
        60,
        96,
        "Chart a route through the current chapter, picking materials and trades that suit the weapon path you want next.",
        { ...TEXT.small, color: colorHex(COLORS.subtext) }
      )
      .setWordWrapWidth(294)
      .setScrollFactor(0)
      .setDepth(21);
    this.summaryText = this.add.text(60, 148, "", TEXT.small).setWordWrapWidth(294).setScrollFactor(0).setDepth(21);
    this.detailTitleText = this.add.text(60, 430, "", TEXT.heading).setScrollFactor(0).setDepth(21);
    this.detailText = this.add.text(60, 470, "", TEXT.small).setWordWrapWidth(294).setScrollFactor(0).setDepth(21);
    this.feedbackText = this.add
      .text(60, 630, "", { ...TEXT.small, color: colorHex(COLORS.gold) })
      .setWordWrapWidth(294)
      .setScrollFactor(0)
      .setDepth(21);
    this.travelHintText = this.add
      .text(1184, 692, "", { ...TEXT.heading, color: colorHex(COLORS.gold) })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(21);
    this.travelHintText.setText("");

    this.travelButton = createButton({
      scene: this,
      x: 1070,
      y: 694,
      width: 190,
      height: 58,
      label: "Next Stage",
      hint: "Select an open route",
      accent: 0x315442,
      scrollFactor: 0,
      onClick: () => this.handleSelectedNode()
    });
    this.travelButton.root.setDepth(21);

    const menuButton = createButton({
      scene: this,
      x: 132,
      y: 694,
      width: 152,
      height: 58,
      label: "Leave Run",
      hint: "Open run menu",
      accent: 0x37424d,
      scrollFactor: 0,
      onClick: () => this.openRunMenu()
    });
    menuButton.root.setDepth(21);
  }

  private refreshView(): void {
    const state = gameManager.getState();
    const stats = gameManager.getCombatStats();
    const visibleNodes = gameManager.getCurrentChapterWorldNodeDefinitions();
    const selectedNode = gameManager.getWorldNodeDefinition(this.selectedNodeId) ?? visibleNodes[0] ?? null;
    if (!selectedNode && visibleNodes[0]) {
      this.selectedNodeId = visibleNodes[0].id;
    }

    this.summaryText.setText(
      [
        `Weapon: ${stats.sword.name}`,
        `Branch: ${this.formatCurrentBranch()}`,
        "",
        formatMaterialInventory(state.materials)
      ].join("\n")
    );

    this.refreshConnections(visibleNodes);

    for (const node of visibleNodes) {
      const handle = this.nodeCards.get(node.id);

      if (!handle) {
        continue;
      }

      const region = gameManager.getRegionDefinition(node.regionId);
      const available = state.availableNodeIds.includes(node.id);
      const visited = state.visitedNodeIds.includes(node.id);
      const selected = node.id === this.selectedNodeId;
      const special = WorldMapScene.SPECIAL_REGION_IDS.has(node.regionId);
      const boss = node.type === "boss";
      const challenge = node.type === "challenge";
      const fill = selected ? region.accent : available ? region.fill + 0x0b1010 : visited ? 0x243341 : COLORS.disabled;
      const alpha = available || selected ? 1 : visited ? 0.78 : 0.52;

      handle.flare.setVisible(boss || challenge);
      handle.flare.setFillStyle(
        boss ? (selected ? COLORS.gold : region.accent) : selected ? 0xe3c07a : 0xc19a57,
        selected ? 0.28 : available ? 0.18 : 0.1
      );
      handle.flare.setAlpha(alpha);
      handle.backdrop.setAlpha(selected ? 0.18 : available ? 0.16 : visited ? 0.14 : 0.12);
      handle.background.setFillStyle(fill, selected ? 0.96 : 0.9);
      handle.background.setStrokeStyle(
        boss ? 4 : challenge ? 3 : special && (available || visited || selected) ? 3 : 2,
        boss
          ? selected
            ? COLORS.gold
            : available
              ? 0xf0d7a3
              : 0xb79663
          : challenge
            ? selected
              ? COLORS.gold
              : 0xd3b178
          : selected
            ? COLORS.gold
            : available
              ? special
                ? COLORS.gold
                : region.edge
              : special
                ? region.accent
                : COLORS.panelEdge,
        available || selected ? 1 : 0.45
      );
      handle.background.setAlpha(alpha);
      handle.title.setText(node.title);
      handle.subtitle.setText(this.getNodeSubtitle(node));
      handle.title.setColor(available || selected ? colorHex(COLORS.ink) : "#8b98a4");
      handle.subtitle.setColor(
        boss ? colorHex(COLORS.gold) : challenge ? "#e1c489" : available || selected ? colorHex(COLORS.subtext) : "#66727d"
      );
    }

    if (!selectedNode) {
      this.detailTitleText.setText("No Frontier");
      this.detailText.setText("No node is currently selected.");
      this.travelHintText.setText("");
      this.travelButton?.setText("Next Stage");
      this.travelButton?.setHint("Select an open route");
      this.travelButton?.setEnabled(false);
      return;
    }

    const region = gameManager.getRegionDefinition(selectedNode.regionId);
    this.updateBiomeBackground(selectedNode.regionId);
    const available = gameManager.canTravelToWorldNode(selectedNode.id);
    const bossDefinition = selectedNode.bossId ? getBossDefinition(selectedNode.bossId) : null;
    const challengeDefinition = selectedNode.challengeId ? getChallengeShrineDefinition(selectedNode.challengeId) : null;
    const selectedEnemy = selectedNode.enemyId ? getEnemyDefinition(selectedNode.eliteEnemyId ?? selectedNode.enemyId) : null;
    const arenaEnvironment = selectedNode.arenaEnvironmentId ? getArenaEnvironmentDefinition(selectedNode.arenaEnvironmentId) : null;
    const eventDefinition = selectedNode.eventId ? getRunEventDefinition(selectedNode.eventId) : undefined;
    const eventTraining = eventDefinition?.choices
      .map((choice) => (choice.modifierId ? RUN_MODIFIERS[choice.modifierId]?.name : null))
      .filter((entry): entry is string => Boolean(entry));

    this.detailTitleText.setText(selectedNode.title);
    this.detailText.setText(
      [
        region.theme,
        region.summary,
        "",
        selectedNode.type === "boss" && bossDefinition ? `Lesson: ${bossDefinition.lesson}` : "",
        selectedNode.type === "boss" && bossDefinition ? `Core rule: ${bossDefinition.coreRule}` : "",
        selectedNode.type === "boss" && selectedNode.relicId ? `Boss reward: ${RELICS[selectedNode.relicId]?.name ?? "Unique relic"}` : "",
        selectedNode.type === "challenge" && challengeDefinition ? `Vow: ${challengeDefinition.ruleText}` : "",
        selectedNode.type === "challenge" && selectedNode.relicId ? `Cursed reward: ${RELICS[selectedNode.relicId]?.name ?? "Cursed relic"}` : "",
        selectedNode.type === "event" && eventDefinition ? `Surprise: ${eventDefinition.summary}` : "",
        selectedNode.type === "event" && (eventTraining?.length ?? 0) > 0 ? `Possible training: ${eventTraining?.join(", ")}` : "",
        `Rewards: ${formatMaterialCost(selectedNode.rewardMaterials)}`,
        `Primary materials: ${region.primaryMaterials.map((id) => MATERIAL_LABELS[id]).join(", ")}`,
        arenaEnvironment ? `Arena condition: ${arenaEnvironment.name} - ${arenaEnvironment.summary}` : "",
        selectedNode.type === "boss"
          ? `Boss arena: ${bossDefinition?.arenaTitle ?? selectedNode.title}`
          : selectedNode.type === "battle"
            ? `Enemy pool:\n${region.enemyRoster.map((enemyName) => `• ${enemyName}`).join("\n")}`
            : selectedNode.type === "miniboss" || selectedNode.type === "challenge"
            ? `Opponent: ${selectedEnemy?.name ?? "Unknown"}`
            : `Site: ${this.describeNodeType(selectedNode)}`
      ]
        .filter((entry) => entry.length > 0)
        .join("\n")
    );

    this.travelHintText.setText("");
    this.travelButton?.setText("Next Stage");
    this.travelButton?.setHint(
      !available
        ? "Select an open route"
        : selectedNode.type === "merchant"
          ? "Open trade"
          : selectedNode.type === "event"
            ? "Choose outcome"
          : selectedNode.type === "boss"
            ? "Enter boss arena"
            : selectedNode.type === "battle" || selectedNode.type === "miniboss" || selectedNode.type === "challenge"
              ? "Enter combat"
            : "Resolve route"
    );
    this.travelButton?.setEnabled(available);
  }

  private handleSelectedNode(forceTravel = false): void {
    if (this.tutorialOverlay || this.merchantOverlay || this.eventOverlay || this.runMenuOverlay) {
      return;
    }

    const node = gameManager.getWorldNodeDefinition(this.selectedNodeId);

    if (!node || (!forceTravel && !gameManager.canTravelToWorldNode(node.id))) {
      this.feedbackText.setText("That route is not open yet.");
      this.refreshView();
      return;
    }

    this.forcedTestNodeId = forceTravel ? node.id : null;

    if (node.type === "battle" || node.type === "miniboss" || node.type === "boss" || node.type === "challenge") {
      gameManager.startWorldNode(this, node.id, forceTravel);
      return;
    }

    if (node.type === "merchant") {
      this.openMerchantOverlay(node);
      return;
    }

    if (node.type === "event") {
      this.openEventOverlay(node);
      return;
    }

    if (gameManager.resolveWorldNodeVisit(node.id, forceTravel)) {
      this.feedbackText.setText(node.type === "relic" ? "Relic secured. Back to the forge." : "Route resolved. Back to the forge.");
      this.time.delayedCall(160, () => {
        if (this.sys.isActive()) {
          gameManager.openForge(this);
        }
      });
    } else {
      this.feedbackText.setText("That route could not be resolved.");
      this.refreshView();
    }
  }

  private openMerchantOverlay(node: WorldNodeDefinition): void {
    this.merchantOverlay?.destroy();

    const options = this.getMerchantOptions(node);
    const veil = this.add
      .rectangle(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5, VIEWPORT.width, VIEWPORT.height, 0x060a10, 0.72)
      .setScrollFactor(0);
    const panel = this.add
      .rectangle(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5, 520, 360, COLORS.panel, 0.97)
      .setStrokeStyle(2, COLORS.panelEdge, 1)
      .setScrollFactor(0);
    const title = this.add.text(VIEWPORT.width * 0.5, 214, node.title, TEXT.heading).setOrigin(0.5).setScrollFactor(0);
    const copy = this.add
      .text(
        VIEWPORT.width * 0.5,
        254,
        "Trade expedition stock for the materials your current forge plan wants most.",
        { ...TEXT.small, align: "center", color: colorHex(COLORS.subtext) }
      )
      .setOrigin(0.5)
      .setWordWrapWidth(430)
      .setScrollFactor(0);

    const container = this.add.container(0, 0, [veil, panel, title, copy]);
    container.setDepth(40).setScrollFactor(0);
    [veil, panel, title, copy].forEach((entry) => entry.setDepth(40));

    options.forEach((option, index) => {
      const y = 358 + index * 108;
      const detail = this.add
        .text(
          VIEWPORT.width * 0.5,
          y - 44,
          `${materialCostEntries(option.payment).length > 0 ? `Pay ${formatMaterialCost(option.payment)}  ->  ` : ""}${formatMaterialCost(option.reward)}`,
          { ...TEXT.caption, align: "center", color: colorHex(COLORS.gold) }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(41);
      container.add(detail);

      const button = createButton({
        scene: this,
        x: VIEWPORT.width * 0.5,
        y,
        width: 330,
        height: 62,
        label: option.name,
        hint: option.hint,
        accent: index === 0 ? 0x49634e : 0x5c4f39,
        scrollFactor: 0,
        onClick: () => {
          if (gameManager.completeMerchantExchange(node.id, option.payment, option.reward, this.forcedTestNodeId === node.id)) {
            container.destroy();
            this.merchantOverlay = null;
            this.feedbackText.setText("Trade made. Back to the forge.");
            gameManager.openForge(this);
          } else {
            this.feedbackText.setText("Not enough materials for that trade.");
            this.refreshView();
          }
        }
      });
      button.setEnabled(gameManager.canAfford(option.payment));
      button.root.setDepth(41);
      container.add(button.root);
    });

    const closeButton = createButton({
      scene: this,
      x: VIEWPORT.width * 0.5,
      y: 600,
      width: 150,
      height: 52,
      label: "Close",
      hint: "Keep browsing",
      accent: 0x394554,
      scrollFactor: 0,
      onClick: () => {
        container.destroy();
        this.merchantOverlay = null;
      }
    });
    closeButton.root.setDepth(41);
    container.add(closeButton.root);

    this.merchantOverlay = container;
  }

  private openEventOverlay(node: WorldNodeDefinition): void {
    this.eventOverlay?.destroy();

    const eventDefinition = node.eventId ? getRunEventDefinition(node.eventId) : undefined;

    if (!eventDefinition) {
      if (gameManager.resolveWorldNodeVisit(node.id, this.forcedTestNodeId === node.id)) {
        this.feedbackText.setText("Route resolved. Back to the forge.");
        gameManager.openForge(this);
      } else {
        this.feedbackText.setText("That route could not be resolved.");
        this.refreshView();
      }
      return;
    }

    const veil = this.add
      .rectangle(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5, VIEWPORT.width, VIEWPORT.height, 0x060a10, 0.74)
      .setScrollFactor(0);
    const panel = this.add
      .rectangle(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5, 560, 390, COLORS.panel, 0.98)
      .setStrokeStyle(2, eventDefinition.accent, 0.96)
      .setScrollFactor(0);
    const title = this.add.text(VIEWPORT.width * 0.5, 204, eventDefinition.title, TEXT.heading).setOrigin(0.5).setScrollFactor(0);
    const copy = this.add
      .text(
        VIEWPORT.width * 0.5,
        248,
        `${eventDefinition.summary}\n\nRoute salvage: ${formatMaterialCost(node.rewardMaterials)}`,
        { ...TEXT.small, align: "center", color: colorHex(COLORS.subtext) }
      )
      .setOrigin(0.5)
      .setWordWrapWidth(460)
      .setScrollFactor(0);

    const container = this.add.container(0, 0, [veil, panel, title, copy]);
    container.setDepth(40).setScrollFactor(0);
    [veil, panel, title, copy].forEach((entry) => entry.setDepth(40));

    eventDefinition.choices.forEach((choice, index) => {
      const y = 360 + index * 108;
      const rewardLabel = formatMaterialCost(choice.reward);
      const modifierName = choice.modifierId ? RUN_MODIFIERS[choice.modifierId]?.name ?? "Training" : null;
      const upgradeLabel = choice.upgradeSwordId ? `Upgrade into ${choice.upgradeSwordId === "excalibur" ? "Excalibur" : choice.upgradeSwordId}` : null;
      const detail = this.add
        .text(
          VIEWPORT.width * 0.5,
          y - 42,
          [
            materialCostEntries(choice.payment).length > 0 ? `Pay ${formatMaterialCost(choice.payment)}` : "No payment",
            `Gain ${rewardLabel}`,
            modifierName ? `Plus ${modifierName}` : "",
            upgradeLabel ?? ""
          ]
            .filter((entry) => entry.length > 0)
            .join("  |  "),
          { ...TEXT.caption, align: "center", color: colorHex(COLORS.gold) }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(41);
      container.add(detail);

      const button = createButton({
        scene: this,
        x: VIEWPORT.width * 0.5,
        y,
        width: 360,
        height: 62,
        label: choice.name,
        hint: choice.hint,
        accent: index === 0 ? 0x4a5f72 : 0x4f5f45,
        scrollFactor: 0,
        onClick: () => this.resolveEventChoice(node, choice, container)
      });
      button.setEnabled(
        gameManager.canAfford(choice.payment) &&
          (!choice.upgradeSwordId || gameManager.canUpgradeCurrentSwordToLegendary(choice.upgradeSwordId))
      );
      button.root.setDepth(41);
      container.add(button.root);
    });

    const closeButton = createButton({
      scene: this,
      x: VIEWPORT.width * 0.5,
      y: 632,
      width: 150,
      height: 52,
      label: "Close",
      hint: "Choose later",
      accent: 0x394554,
      scrollFactor: 0,
      onClick: () => {
        container.destroy();
        this.eventOverlay = null;
      }
    });
    closeButton.root.setDepth(41);
    container.add(closeButton.root);

    this.eventOverlay = container;
  }

  private resolveEventChoice(node: WorldNodeDefinition, choice: RunEventChoice, container: Phaser.GameObjects.Container): void {
    if (gameManager.resolveRunEvent(node.id, choice.payment, choice.reward, choice.modifierId, choice.upgradeSwordId, this.forcedTestNodeId === node.id)) {
      container.destroy();
      this.eventOverlay = null;
      this.feedbackText.setText(
        choice.upgradeSwordId
          ? "The sword answered your hand. Back to the forge."
          : choice.modifierId
            ? "Event resolved. New training added."
            : "Event resolved. Back to the forge."
      );
      gameManager.openForge(this);
      return;
    }

    this.feedbackText.setText("Not enough materials for that choice.");
    this.refreshView();
  }

  private openRunMenu(): void {
    this.runMenuOverlay?.destroy();
    this.isDragging = false;
    const canReturnToForge =
      gameManager.getCurrentForgeOfferDefinitions().length > 0 || gameManager.getCurrentRunModifierDefinitions().length > 0;

    const veil = this.add
      .rectangle(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5, VIEWPORT.width, VIEWPORT.height, 0x060a10, 0.72)
      .setScrollFactor(0)
      .setInteractive();
    const panel = this.add
      .rectangle(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5, 420, 420, COLORS.panel, 0.97)
      .setStrokeStyle(2, COLORS.panelEdge, 1)
      .setScrollFactor(0);
    const title = applyLocalizedText(
      this.add.text(VIEWPORT.width * 0.5, 232, "", localizeTextStyle(TEXT.heading)).setOrigin(0.5).setScrollFactor(0),
      "Leave Run"
    );
    const copy = applyLocalizedText(
      this.add.text(VIEWPORT.width * 0.5, 272, "", {
        ...localizeTextStyle(TEXT.small),
        align: "center",
        color: colorHex(COLORS.subtext)
      })
        .setOrigin(0.5)
        .setWordWrapWidth(330)
        .setScrollFactor(0),
      "Choose whether to step back to the forge, leave for the main menu, or keep the expedition going."
    );

    const container = this.add.container(0, 0, [veil, panel, title, copy]);
    container.setDepth(50).setScrollFactor(0);
    [veil, panel, title, copy].forEach((entry) => entry.setDepth(50));

    const closeMenu = (): void => {
      container.destroy();
      this.runMenuOverlay = null;
    };

    const forgeButton = createButton({
      scene: this,
      x: VIEWPORT.width * 0.5,
      y: 372,
      width: 240,
      height: 60,
      label: "Return to Forge",
      hint: "Back to upgrades",
      accent: 0x405968,
      scrollFactor: 0,
      onClick: () => {
        closeMenu();
        gameManager.returnToForge(this);
      }
    });
    forgeButton.setEnabled(canReturnToForge);
    forgeButton.root.setDepth(51);
    container.add(forgeButton.root);

    const mainMenuButton = createButton({
      scene: this,
      x: VIEWPORT.width * 0.5,
      y: 450,
      width: 240,
      height: 60,
      label: "Return to Main Menu",
      hint: "End this run",
      accent: 0x4d3d46,
      scrollFactor: 0,
      onClick: () => {
        closeMenu();
        gameManager.openMainMenu(this);
      }
    });
    mainMenuButton.root.setDepth(51);
    container.add(mainMenuButton.root);

    const continueButton = createButton({
      scene: this,
      x: VIEWPORT.width * 0.5,
      y: 528,
      width: 240,
      height: 60,
      label: "Continue",
      hint: "Keep exploring",
      accent: 0x315442,
      scrollFactor: 0,
      onClick: closeMenu
    });
    continueButton.root.setDepth(51);
    container.add(continueButton.root);

    this.runMenuOverlay = container;
  }

  private bindShortcuts(): void {
    this.input.keyboard?.on("keydown-ENTER", () => {
      if (this.tutorialOverlay) {
        return;
      }

      const node = gameManager.getWorldNodeDefinition(this.selectedNodeId);

      if (
        gameManager.isTestModeEnabled() &&
        node &&
        !gameManager.canTravelToWorldNode(node.id)
      ) {
        const now = this.time.now;
        const repeatedSelection = this.lastTestModeEnterNodeId === node.id && now - this.lastTestModeEnterAt <= 650;
        this.lastTestModeEnterNodeId = node.id;
        this.lastTestModeEnterAt = now;

        if (repeatedSelection) {
          this.handleSelectedNode(true);
        } else {
          this.feedbackText.setText("Test Mode: press Enter again to jump into this node.");
          this.refreshView();
        }
        return;
      }

      this.lastTestModeEnterNodeId = node?.id ?? "";
      this.lastTestModeEnterAt = this.time.now;
      this.handleSelectedNode();
    });
  }

  private maybeOpenTutorialOverlay(): void {
    if (!gameManager.isTutorialMode() || gameManager.hasSeenTutorialPrompt(TUTORIAL_PROMPT_IDS.worldMap)) {
      return;
    }

    this.tutorialOverlay = createGuidedOverlay({
      scene: this,
      pages: TUTORIAL_WORLD_MAP_PAGES,
      finalLabel: "Open The Route",
      onComplete: () => {
        gameManager.markTutorialPromptSeen(TUTORIAL_PROMPT_IDS.worldMap);
        this.tutorialOverlay = null;
      }
    });
  }

  private getMerchantOptions(node: WorldNodeDefinition): MerchantOption[] {
    const freeCache: MerchantOption = {
      name: "Take Cache",
      hint: "Free salvage from the route",
      payment: {},
      reward: node.rewardMaterials
    };

    const specialty = {
      forest: {
        name: "Timber Exchange",
        hint: "Turn hides into timber and steel",
        payment: { leather: 1 },
        reward: { wood: 1, steel: 1 }
      },
      woods: {
        name: "Camp Quartermaster",
        hint: "Swap wood for cleaner steel",
        payment: { wood: 1 },
        reward: { steel: 2 }
      },
      sea: {
        name: "Deck Salvage",
        hint: "Convert scrap into bright stone",
        payment: { wood: 1 },
        reward: { gemstone: 1, leather: 1 }
      },
      ocean: {
        name: "Storm Wager",
        hint: "Trade metal for deeper essence",
        payment: { steel: 1 },
        reward: { essence: 1, gemstone: 1 }
      },
      mountain: {
        name: "Pass Forge",
        hint: "Compress hides into steel",
        payment: { leather: 1, wood: 1 },
        reward: { steel: 2 }
      },
      volcano: {
        name: "Smelter Deal",
        hint: "Heat stock into essence",
        payment: { steel: 1 },
        reward: { essence: 1, gemstone: 1 }
      },
      grasslands: {
        name: "Caravan Trade",
        hint: "Swap spare hides for mixed stock",
        payment: { leather: 1 },
        reward: { wood: 1, steel: 1 }
      },
      savannah: {
        name: "Dust Barter",
        hint: "Turn leather into hotter craft",
        payment: { leather: 1, wood: 1 },
        reward: { steel: 1, essence: 1 }
      },
      plains: {
        name: "Road Warden Deal",
        hint: "Trade timber for iron",
        payment: { wood: 1 },
        reward: { steel: 2 }
      },
      tundra: {
        name: "Cold Camp Swap",
        hint: "Preserved stock for steadier steel",
        payment: { leather: 1 },
        reward: { steel: 1, wood: 1 }
      },
      frostlands: {
        name: "Ice Broker",
        hint: "Trade steel for bright stone",
        payment: { steel: 1 },
        reward: { gemstone: 2 }
      },
      volcanicLand: {
        name: "Ash Caravan",
        hint: "Refine scavenged metal",
        payment: { steel: 1, leather: 1 },
        reward: { essence: 1, steel: 1 }
      },
      shore: {
        name: "Tide Market",
        hint: "Trade wood for mixed salvage",
        payment: { wood: 1 },
        reward: { leather: 1, gemstone: 1 }
      },
      village: {
        name: "Village Trader",
        hint: "Simple stock for simple gains",
        payment: { wood: 1, leather: 1 },
        reward: { steel: 2 }
      },
      town: {
        name: "Town Exchange",
        hint: "More refined conversion",
        payment: { wood: 1, steel: 1 },
        reward: { gemstone: 1, leather: 1 }
      },
      kingdom: {
        name: "Royal Factor",
        hint: "Convert hard stock into rare stock",
        payment: { steel: 1, gemstone: 1 },
        reward: { essence: 1, leather: 1 }
      },
      frozenPeaks: {
        name: "Peak Relay",
        hint: "Shave off risk into essence",
        payment: { gemstone: 1 },
        reward: { steel: 1, essence: 1 }
      },
      grove: {
        name: "Hermit Trade",
        hint: "Turn wood into calmer essence",
        payment: { wood: 1 },
        reward: { essence: 1, leather: 1 }
      },
      jungle: {
        name: "Canopy Broker",
        hint: "Trade hides for rare current stock",
        payment: { leather: 1 },
        reward: { wood: 1, essence: 1 }
      },
      river: {
        name: "Ferry Market",
        hint: "Swap common goods into motion-ready stock",
        payment: { wood: 1 },
        reward: { leather: 1, essence: 1 }
      }
    } as Record<RegionId, MerchantOption>;

    Object.assign(specialty, {
      desert: {
        name: "Dune Broker",
        hint: "Trade leather for amber and steel",
        payment: { leather: 1 },
        reward: { amber: 1, steel: 1 }
      },
      oasis: {
        name: "Spring Caravan",
        hint: "Swap wood into amber and leather",
        payment: { wood: 1 },
        reward: { amber: 1, leather: 1 }
      },
      canyon: {
        name: "Ridge Smelter",
        hint: "Convert steel into obsidian",
        payment: { steel: 1 },
        reward: { obsidian: 1, gemstone: 1 }
      },
      badlands: {
        name: "Dust Fence",
        hint: "Trade leather into obsidian and steel",
        payment: { leather: 1 },
        reward: { obsidian: 1, steel: 1 }
      },
      marsh: {
        name: "Marsh Gatherer",
        hint: "Turn leather into amber and essence",
        payment: { leather: 1 },
        reward: { amber: 1, essence: 1 }
      },
      swamp: {
        name: "Bog Trader",
        hint: "Trade amber for calmer essence",
        payment: { amber: 1 },
        reward: { essence: 2 }
      },
      wetlands: {
        name: "Fen Exchange",
        hint: "Swap wood into amber",
        payment: { wood: 1 },
        reward: { amber: 2 }
      },
      highlands: {
        name: "Hill Factor",
        hint: "Trade timber into crystal and steel",
        payment: { wood: 1 },
        reward: { crystal: 1, steel: 1 }
      },
      cliffs: {
        name: "Cliff Relay",
        hint: "Convert gemstone into stormglass",
        payment: { gemstone: 1 },
        reward: { stormglass: 1, steel: 1 }
      },
      caverns: {
        name: "Tunnel Broker",
        hint: "Trade steel for crystal and obsidian",
        payment: { steel: 1 },
        reward: { crystal: 1, obsidian: 1 }
      },
      crystalCaverns: {
        name: "Facet Dealer",
        hint: "Exchange crystal into essence",
        payment: { crystal: 1 },
        reward: { essence: 1, gemstone: 1 }
      },
      redwoodForest: {
        name: "Redwood Camp",
        hint: "Trade wood into amber",
        payment: { wood: 1 },
        reward: { amber: 1, leather: 1 }
      },
      bambooForest: {
        name: "Cane Market",
        hint: "Swap wood for bamboo",
        payment: { wood: 1 },
        reward: { bamboo: 2 }
      },
      cherryGrove: {
        name: "Petal Exchange",
        hint: "Trade wood into blossom",
        payment: { wood: 1 },
        reward: { blossom: 1, essence: 1 }
      },
      rainforest: {
        name: "Canopy Trader",
        hint: "Convert leather into bamboo",
        payment: { leather: 1 },
        reward: { bamboo: 1, wood: 1 }
      },
      pineForest: {
        name: "Needle Camp",
        hint: "Trade wood into amber and steel",
        payment: { wood: 1 },
        reward: { amber: 1, steel: 1 }
      },
      glacier: {
        name: "Ice Relay",
        hint: "Trade steel into crystal and essence",
        payment: { steel: 1 },
        reward: { crystal: 1, essence: 1 }
      },
      iceCaves: {
        name: "Rime Broker",
        hint: "Refine crystal into gemstone",
        payment: { crystal: 1 },
        reward: { gemstone: 2 }
      },
      snowyForest: {
        name: "Winter Camp",
        hint: "Trade wood into crystal",
        payment: { wood: 1 },
        reward: { crystal: 1, leather: 1 }
      },
      ashlands: {
        name: "Ash Trader",
        hint: "Convert steel into brimstone",
        payment: { steel: 1 },
        reward: { brimstone: 2 }
      },
      lavaFields: {
        name: "Furnace Relay",
        hint: "Trade steel for obsidian and brimstone",
        payment: { steel: 1 },
        reward: { obsidian: 1, brimstone: 1 }
      },
      obsidianWastes: {
        name: "Glass Dealer",
        hint: "Turn obsidian into essence",
        payment: { obsidian: 1 },
        reward: { essence: 1, steel: 1 }
      },
      sulfurSprings: {
        name: "Steam Broker",
        hint: "Trade brimstone into essence",
        payment: { brimstone: 1 },
        reward: { essence: 2 }
      },
      scorchedPlateau: {
        name: "Plateau Fence",
        hint: "Swap leather into brimstone",
        payment: { leather: 1 },
        reward: { brimstone: 1, obsidian: 1 }
      },
      archipelago: {
        name: "Island Market",
        hint: "Trade wood into coral and gemstone",
        payment: { wood: 1 },
        reward: { coral: 1, gemstone: 1 }
      },
      coralCoast: {
        name: "Reef Exchange",
        hint: "Trade leather into coral",
        payment: { leather: 1 },
        reward: { coral: 2 }
      },
      coralReef: {
        name: "Deep Reef Broker",
        hint: "Turn coral into essence",
        payment: { coral: 1 },
        reward: { essence: 1, gemstone: 1 }
      },
      grandReef: {
        name: "Channel Trader",
        hint: "Trade coral into rarer stock",
        payment: { coral: 1 },
        reward: { essence: 1, stormglass: 1 }
      },
      mangrove: {
        name: "Root Market",
        hint: "Swap wood into coral and leather",
        payment: { wood: 1 },
        reward: { coral: 1, leather: 1 }
      },
      ancientRuins: {
        name: "Archive Broker",
        hint: "Trade gemstone for stormglass",
        payment: { gemstone: 1 },
        reward: { stormglass: 1, essence: 1 }
      },
      forgottenTemple: {
        name: "Temple Factor",
        hint: "Convert essence into blossom and stormglass",
        payment: { essence: 1 },
        reward: { blossom: 1, stormglass: 1 }
      },
      sacredGrove: {
        name: "Sanctified Exchange",
        hint: "Trade blossom into essence",
        payment: { blossom: 1 },
        reward: { essence: 2 }
      },
      spiritMarsh: {
        name: "Lantern Broker",
        hint: "Refine amber into blossom and essence",
        payment: { amber: 1 },
        reward: { blossom: 1, essence: 1 }
      },
      sunkenRuins: {
        name: "Drowned Factor",
        hint: "Trade coral into stormglass",
        payment: { coral: 1 },
        reward: { stormglass: 1, essence: 1 }
      },
      crystalValley: {
        name: "Valley Dealer",
        hint: "Trade crystal into stormglass",
        payment: { crystal: 1 },
        reward: { stormglass: 1, gemstone: 1 }
      },
      skyIslands: {
        name: "Cloud Relay",
        hint: "Trade stormglass into essence",
        payment: { stormglass: 1 },
        reward: { essence: 2 }
      }
    } satisfies Partial<Record<RegionId, MerchantOption>>);

    return [freeCache, specialty[node.regionId]];
  }

  private getNodePosition(node: WorldNodeDefinition): { x: number; y: number } {
    return {
      x: 420 + (node.worldDepth ?? node.depth) * 156,
      y: 128 + node.lane * 112
    };
  }

  private getWorldBounds(nodes: WorldNodeDefinition[]): Phaser.Geom.Rectangle {
    const positions = nodes.map((node) => this.getNodePosition(node));
    let maxX: number = VIEWPORT.width;
    let maxY: number = VIEWPORT.height;

    for (const position of positions) {
      maxX = Math.max(maxX, position.x);
      maxY = Math.max(maxY, position.y);
    }

    return new Phaser.Geom.Rectangle(0, 0, maxX + 220, maxY + 160);
  }

  private createDragSurface(): void {
    const dragSurface = this.add
      .rectangle(this.dragBounds.x, this.dragBounds.y, this.dragBounds.width, this.dragBounds.height, 0x000000, 0.001)
      .setOrigin(0)
      .setDepth(-6)
      .setInteractive({ useHandCursor: true });

    dragSurface.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (WorldMapScene.HUD_BOUNDS.contains(pointer.x, pointer.y)) {
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

  private centerCameraOnSelectedNode(): void {
    const selectedNode = gameManager.getWorldNodeDefinition(this.selectedNodeId);

    if (!selectedNode) {
      this.clampCameraToBounds();
      return;
    }

    const position = this.getNodePosition(selectedNode);
    this.cameras.main.scrollX = Math.max(this.dragBounds.x, position.x - 456);
    this.cameras.main.scrollY = Math.max(this.dragBounds.y, position.y - VIEWPORT.height * 0.5);
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

  private getNodeSubtitle(node: WorldNodeDefinition): string {
    if (node.type === "merchant") {
      return "Merchant";
    }

    if (node.type === "relic") {
      return "Relic";
    }

    if (node.type === "event") {
      return "Event";
    }

    if (node.type === "challenge") {
      return "Challenge";
    }

    if (node.type === "boss") {
      return "";
    }

    return node.type === "miniboss" ? "" : "Battle";
  }

  private describeNodeType(node: WorldNodeDefinition): string {
    switch (node.type) {
      case "merchant":
        return "Trade route";
      case "relic":
        return "Relic site";
      case "event":
        return "Hidden event";
      case "challenge":
        return "Challenge shrine";
      case "miniboss":
        return "Optional hunt";
      case "boss":
        return "Boss arena";
      default:
        return "Combat route";
    }
  }

  private formatCurrentBranch(): string {
    const unlockedTech = gameManager.getUnlockedWeaponTechDefinitions().find((definition) => definition.branch !== "root");
    return unlockedTech ? unlockedTech.name : "Arming Sword";
  }
}
