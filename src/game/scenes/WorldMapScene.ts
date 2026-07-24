import Phaser from "phaser";
import { gameManager } from "../core/GameManager";
import { SCENE_KEYS } from "../core/SceneKeys";
import type { MaterialCost, RegionId, WorldNodeDefinition } from "../core/types";
import { MATERIAL_LABELS, formatMaterialCost, formatMaterialInventory, materialCostEntries } from "../data/materials";
import { getArenaEnvironmentDefinition } from "../data/arenaEnvironments";
import { getBossDefinition } from "../data/bosses";
import { getChallengeShrineDefinition } from "../data/challengeShrines";
import { RELICS } from "../data/relics";
import { RUN_MODIFIERS } from "../data/runModifiers";
import { getRunEventDefinition, type RunEventChoice } from "../data/runEvents";
import {
  TUTORIAL_PROMPT_IDS,
  TUTORIAL_WORLD_MAP_PAGES
} from "../tutorial/tutorialData";
import { createGuidedOverlay, type GuidedOverlayHandle } from "../ui/createGuidedOverlay";
import { createButton, type ButtonHandle } from "../ui/createButton";
import { applyLocalizedText, localizeTextStyle } from "../ui/localization";
import { COLORS, TEXT, VIEWPORT, colorHex } from "../ui/theme";

interface NodeCardHandle {
  flare: Phaser.GameObjects.Ellipse;
  background: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
  subtitle: Phaser.GameObjects.Text;
  tag: Phaser.GameObjects.Text;
}

interface MerchantOption {
  name: string;
  hint: string;
  payment: MaterialCost;
  reward: MaterialCost;
}

export class WorldMapScene extends Phaser.Scene {
  private static readonly HUD_BOUNDS = new Phaser.Geom.Rectangle(32, 32, 340, 650);
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

  constructor() {
    super(SCENE_KEYS.WorldMap);
  }

  create(): void {
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

    this.dragBounds = this.paintBackdrop(visibleNodes);
    this.createDragSurface();
    this.drawRegionBands(visibleNodes);
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
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.background, 1);
    graphics.fillRect(worldBounds.x, worldBounds.y, worldBounds.width, worldBounds.height);
    graphics.fillStyle(COLORS.panelSoft, 0.22);
    graphics.fillRect(worldBounds.x, worldBounds.y, worldBounds.width, 112);
    graphics.fillStyle(COLORS.gold, 0.07);
    graphics.fillCircle(worldBounds.right - 120, worldBounds.y + 108, 160);
    graphics.lineStyle(1, COLORS.panelEdge, 0.16);

    for (let x = worldBounds.x; x <= worldBounds.right; x += 64) {
      graphics.lineBetween(x, worldBounds.y, x, worldBounds.bottom);
    }

    for (let y = worldBounds.y; y <= worldBounds.bottom; y += 64) {
      graphics.lineBetween(worldBounds.x, y, worldBounds.right, y);
    }

    return worldBounds;
  }

  private drawRegionBands(nodes: WorldNodeDefinition[]): void {
    const graphics = this.add.graphics().setDepth(-2);
    const sortedNodes = [...nodes].sort((left, right) => {
      const leftDepth = left.worldDepth ?? left.depth;
      const rightDepth = right.worldDepth ?? right.depth;

      if (leftDepth !== rightDepth) {
        return leftDepth - rightDepth;
      }

      return left.lane - right.lane;
    });
    const clusters: Array<{
      regionId: RegionId;
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      minWorldDepth: number;
      maxWorldDepth: number;
    }> = [];

    for (const node of sortedNodes) {
      const position = this.getNodePosition(node);
      const worldDepth = node.worldDepth ?? node.depth;
      let cluster: (typeof clusters)[number] | undefined;

      for (let index = clusters.length - 1; index >= 0; index -= 1) {
        const candidate = clusters[index];

        if (candidate.regionId !== node.regionId) {
          continue;
        }

        if (worldDepth > candidate.maxWorldDepth + 1) {
          break;
        }

        if (worldDepth >= candidate.minWorldDepth - 1 && worldDepth <= candidate.maxWorldDepth + 1) {
          cluster = candidate;
          break;
        }
      }

      if (!cluster) {
        clusters.push({
          regionId: node.regionId,
          minX: position.x - 76,
          maxX: position.x + 76,
          minY: position.y - 70,
          maxY: position.y + 70,
          minWorldDepth: worldDepth,
          maxWorldDepth: worldDepth
        });
        continue;
      }

      cluster.minX = Math.min(cluster.minX, position.x - 76);
      cluster.maxX = Math.max(cluster.maxX, position.x + 76);
      cluster.minY = Math.min(cluster.minY, position.y - 70);
      cluster.maxY = Math.max(cluster.maxY, position.y + 70);
      cluster.minWorldDepth = Math.min(cluster.minWorldDepth, worldDepth);
      cluster.maxWorldDepth = Math.max(cluster.maxWorldDepth, worldDepth);
    }

    for (const bounds of clusters) {
      const region = gameManager.getRegionDefinition(bounds.regionId);
      const isSpecial = WorldMapScene.SPECIAL_REGION_IDS.has(bounds.regionId);
      graphics.fillStyle(region.fill, isSpecial ? 0.8 : 0.7);
      graphics.fillRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
      graphics.lineStyle(isSpecial ? 3 : 2, isSpecial ? COLORS.gold : region.edge, isSpecial ? 0.56 : 0.42);
      graphics.strokeRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
      this.add
        .text(bounds.minX + 10, bounds.minY + 10, region.name, { ...TEXT.caption, color: colorHex(isSpecial ? COLORS.gold : region.accent) })
        .setDepth(-1);
    }
  }

  private drawConnections(nodes: WorldNodeDefinition[]): void {
    const graphics = this.add.graphics().setDepth(1);
    const nodesById = new Map(nodes.map((node) => [node.id, node]));

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

        graphics.lineStyle(8, 0x081019, 0.34);
        graphics.lineBetween(startX, startY, endX, endY);

        graphics.lineStyle(3, region.edge, 0.82);
        graphics.lineBetween(startX, startY, endX, endY);

        graphics.fillStyle(region.edge, 0.28);
        graphics.fillCircle(startX, startY, 4);
        graphics.fillCircle(endX, endY, 4);
      }
    }
  }

  private drawNodes(nodes: WorldNodeDefinition[]): void {
    for (const node of nodes) {
      const position = this.getNodePosition(node);
      const interactive = this.add
        .rectangle(position.x, position.y, 112, 68, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true })
        .setDepth(4);
      const flare = this.add.ellipse(position.x, position.y, 116, 74, 0xd9b67a, 0.08).setDepth(1.5);
      const background = this.add
        .rectangle(position.x, position.y, 100, 58, COLORS.panelSoft, 0.96)
        .setDepth(2)
        .setStrokeStyle(2, COLORS.panelEdge, 1);
      const title = this.add
        .text(position.x, position.y - 8, "", { ...TEXT.button, fontSize: "14px", align: "center" })
        .setOrigin(0.5)
        .setWordWrapWidth(82)
        .setDepth(3);
      const subtitle = this.add
        .text(position.x, position.y + 12, "", { ...TEXT.caption, fontSize: "11px", align: "center" })
        .setOrigin(0.5)
        .setWordWrapWidth(82)
        .setDepth(3);
      const tag = this.add
        .text(position.x, position.y - 30, "", { ...TEXT.caption, color: colorHex(COLORS.gold) })
        .setOrigin(0.5)
        .setDepth(3);

      interactive.on("pointerup", () => {
        this.selectedNodeId = node.id;
        this.refreshView();
      });

      this.nodeCards.set(node.id, {
        flare,
        background,
        title,
        subtitle,
        tag
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
      .rectangle(36, 36, 340, 650, COLORS.panel, 0.98)
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
    const ownedTraining = gameManager.getOwnedRunModifierDefinitions();
    const latestTraining = ownedTraining.slice(-2).map((modifier) => modifier.name);
    const trainingLabel =
      latestTraining.length === 0
        ? "None"
        : latestTraining.join(", ") + (ownedTraining.length > latestTraining.length ? ` +${ownedTraining.length - latestTraining.length}` : "");

    if (!selectedNode && visibleNodes[0]) {
      this.selectedNodeId = visibleNodes[0].id;
    }

    this.summaryText.setText(
      [
        `Weapon: ${stats.sword.name}`,
        `Branch: ${this.formatCurrentBranch()}`,
        "",
        formatMaterialInventory(state.materials),
        "",
        `Training: ${trainingLabel}`
      ].join("\n")
    );

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
      handle.tag.setText(boss ? "BOSS" : challenge ? "VOW" : node.type === "miniboss" ? "Elite" : "");
      handle.tag.setAlpha(boss || challenge || node.type === "miniboss" ? 1 : 0);
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
    const available = gameManager.canTravelToWorldNode(selectedNode.id);
    const routeTargets = this.getRouteTargets(selectedNode);
    const bossDefinition = selectedNode.bossId ? getBossDefinition(selectedNode.bossId) : null;
    const challengeDefinition = selectedNode.challengeId ? getChallengeShrineDefinition(selectedNode.challengeId) : null;
    const arenaEnvironment = selectedNode.arenaEnvironmentId ? getArenaEnvironmentDefinition(selectedNode.arenaEnvironmentId) : null;
    const eventDefinition = selectedNode.eventId ? getRunEventDefinition(selectedNode.eventId) : undefined;
    const eventTraining = eventDefinition?.choices
      .map((choice) => (choice.modifierId ? RUN_MODIFIERS[choice.modifierId]?.name : null))
      .filter((entry): entry is string => Boolean(entry));

    this.detailTitleText.setText(selectedNode.title);
    this.detailText.setText(
      [
        region.name,
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
          : selectedNode.type === "battle" || selectedNode.type === "miniboss" || selectedNode.type === "challenge"
            ? `Enemy roster: ${region.enemyRoster.join(", ")}`
            : `Site: ${this.describeNodeType(selectedNode)}`,
        routeTargets.length > 0 ? `Useful for: ${routeTargets.join(", ")}` : "Useful for: General expedition stock"
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

    if (gameManager.resolveWorldNodeVisit(node.id)) {
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
          if (gameManager.completeMerchantExchange(node.id, option.payment, option.reward)) {
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
      if (gameManager.resolveWorldNodeVisit(node.id)) {
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
    if (gameManager.resolveRunEvent(node.id, choice.payment, choice.reward, choice.modifierId, choice.upgradeSwordId)) {
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
        (node.type === "battle" || node.type === "miniboss" || node.type === "boss") &&
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
      return "Boss";
    }

    return node.type === "miniboss" ? "Elite" : "Battle";
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

  private getRouteTargets(node: WorldNodeDefinition): string[] {
    const state = gameManager.getState();

    return gameManager
      .getWeaponTechRoster()
      .filter((definition) => !state.unlockedTechNodeIds.includes(definition.id))
      .filter((definition) => !gameManager.getWeaponTechBlockingNode(definition.id))
      .map((definition) => {
        const score = materialCostEntries(definition.cost).reduce((sum, [materialId, amount]) => {
          const reward = node.rewardMaterials[materialId] ?? 0;
          return sum + Math.min(amount, reward);
        }, 0);

        return {
          name: definition.name,
          score
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map((entry) => entry.name);
  }

  private formatCurrentBranch(): string {
    const unlockedTech = gameManager.getUnlockedWeaponTechDefinitions().find((definition) => definition.branch !== "root");
    return unlockedTech ? unlockedTech.name : "Arming Sword";
  }
}
