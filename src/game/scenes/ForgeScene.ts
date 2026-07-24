import Phaser from "phaser";
import { gameManager } from "../core/GameManager";
import { SCENE_KEYS } from "../core/SceneKeys";
import type { EnchantmentId, ForgeOfferId, ForgeTab, RunModifierId } from "../core/types";
import { formatMaterialCost, formatMaterialInventory } from "../data/materials";
import { WEAPON_TECH_TREE } from "../data/weaponTechTree";
import {
  TUTORIAL_FORGE_PAGES,
  TUTORIAL_PROMPT_IDS
} from "../tutorial/tutorialData";
import { createGuidedOverlay } from "../ui/createGuidedOverlay";
import { createButton, type ButtonHandle } from "../ui/createButton";
import { COLORS, TEXT, VIEWPORT, colorHex } from "../ui/theme";

export class ForgeScene extends Phaser.Scene {
  private activeTab: ForgeTab = "offers";
  private readonly tabButtons = new Map<ForgeTab, ButtonHandle>();
  private modificationButton: ButtonHandle | null = null;
  private immortalButton: ButtonHandle | null = null;
  private continueButton: ButtonHandle | null = null;
  private summaryText!: Phaser.GameObjects.Text;
  private sideDetailTitleText!: Phaser.GameObjects.Text;
  private sideDetailText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private contentContainer!: Phaser.GameObjects.Container;

  constructor() {
    super(SCENE_KEYS.Forge);
  }

  create(): void {
    this.tabButtons.clear();
    this.modificationButton = null;
    this.immortalButton = null;
    this.continueButton = null;
    this.activeTab = "offers";

    this.paintBackdrop();

    this.add.text(72, 72, "The Forge", TEXT.title);

    this.drawPanel(64, 190, 344, 434);
    this.add.text(90, 218, "Run Summary", TEXT.heading);
    this.summaryText = this.add.text(90, 266, "", TEXT.body).setWordWrapWidth(292);
    this.sideDetailTitleText = this.add.text(90, 490, "", TEXT.heading);
    this.sideDetailText = this.add.text(90, 530, "", TEXT.small).setWordWrapWidth(292);

    this.drawPanel(438, 190, 778, 434);
    this.feedbackText = this.add
      .text(470, 300, "", { ...TEXT.small, color: colorHex(COLORS.gold) })
      .setWordWrapWidth(708);

    if (gameManager.isTestModeEnabled()) {
      this.immortalButton = createButton({
        scene: this,
        x: 1126,
        y: 300,
        width: 150,
        height: 54,
        label: "Immortal Off",
        hint: "Ignore combat damage",
        accent: 0x6c5a2a,
        onClick: () => this.toggleImmortalMode()
      });
    }

    this.createTabs();
    this.contentContainer = this.add.container(0, 0);

    createButton({
      scene: this,
      x: 180,
      y: 660,
      width: 220,
      height: 62,
      label: "Main Menu",
      hint: "Reset the run",
      accent: 0x293844,
      onClick: () => gameManager.openMainMenu(this)
    });

    createButton({
      scene: this,
      x: 640,
      y: 660,
      width: 226,
      height: 72,
      label: "Full Tech Tree",
      hint: "Drag to pan",
      accent: 0x2d4a5f,
      onClick: () => gameManager.openTechTree(this)
    });

    this.continueButton = createButton({
      scene: this,
      x: 1058,
      y: 660,
      width: 246,
      height: 72,
      label: "Continue Expedition",
      hint: "Return to the world map",
      accent: 0x285648,
      onClick: () => gameManager.beginNextEncounter(this)
    });

    this.refreshView();
    const pendingMessage = gameManager.consumePendingSystemMessage();

    if (pendingMessage) {
      this.feedbackText.setText(pendingMessage);
    }

    this.maybeOpenTutorialOverlay();
  }

  private createTabs(): void {
    const tabSpecs: Array<{
      tab: ForgeTab;
      x: number;
      label: string;
      hint: string;
      accent: number;
    }> = [
      { tab: "offers", x: 540, label: "Offers", hint: "Choose 1 of 3", accent: 0x4e4c67 },
      { tab: "modifiers", x: 690, label: "Training", hint: "Permanent lesson", accent: 0x6a513f },
      { tab: "enchantments", x: 840, label: "Enchant", hint: "Random bless", accent: 0x5a4778 },
      { tab: "trinkets", x: 990, label: "Trinkets", hint: "Owned bonuses", accent: 0x486276 }
    ];

    for (const spec of tabSpecs) {
      this.tabButtons.set(
        spec.tab,
        createButton({
          scene: this,
          x: spec.x,
          y: 238,
          width: 132,
          height: 52,
          label: spec.label,
          hint: spec.hint,
          accent: spec.accent,
          onClick: () => this.setActiveTab(spec.tab)
        })
      );
    }

    this.modificationButton = createButton({
      scene: this,
      x: 1142,
      y: 238,
      width: 132,
      height: 52,
      label: "Modify",
      hint: "Blade parts",
      accent: 0x6a5b36,
      onClick: () => gameManager.openModification(this)
    });
  }

  private setActiveTab(tab: ForgeTab): void {
    this.activeTab = tab;
    this.refreshView();
  }

  private refreshView(): void {
    const state = gameManager.getState();
    const stats = gameManager.getCombatStats();
    const enchantment = gameManager.getCurrentEnchantmentDefinition();
    const pendingBias = gameManager.getPendingEnchantmentBiasDefinition();
    const relics = gameManager.getOwnedRelicDefinitions();

    this.summaryText.setText(
      [
        `Weapon: ${stats.sword.name}`,
        `Branch: ${this.formatCurrentBranch(state.unlockedTechNodeIds)}`,
        `Affinity: ${this.formatAffinity(stats.sword.affinity)}`,
        "",
        formatMaterialInventory(state.materials)
      ].join("\n")
    );

    if (this.activeTab === "offers") {
      this.sideDetailTitleText.setText("Active Trinkets");
      this.sideDetailText.setText(this.formatOwnedOffers(state.ownedOfferIds));
    } else if (this.activeTab === "modifiers") {
      this.sideDetailTitleText.setText("Owned Training");
      this.sideDetailText.setText(this.formatOwnedModifiers());
    } else if (this.activeTab === "trinkets") {
      this.sideDetailTitleText.setText("Collection");
      this.sideDetailText.setText(
        [
          `Relics: ${relics.length}`,
          `Trinkets: ${state.ownedOfferIds.length}`,
          `Enchantments: ${enchantment ? 1 : 0}`
        ].join("\n")
      );
    } else {
      this.sideDetailTitleText.setText("Current Enchantment");
      this.sideDetailText.setText(
        enchantment
          ? `${enchantment.name}\n\n${enchantment.summary}\n${enchantment.detail}${pendingBias ? `\n\nNext roll favor: ${pendingBias.name}` : ""}`
          : pendingBias
            ? `No enchantment bound to this blade.\n\nNext roll favor: ${pendingBias.name}`
            : "No enchantment bound to this blade."
      );
    }

    this.tabButtons.forEach((button, tab) => button.setSelected(tab === this.activeTab));
    this.modificationButton?.setSelected(false);
    this.refreshImmortalButton();
    if (this.continueButton) {
      const techTreeSeen = gameManager.hasSeenTutorialPrompt(TUTORIAL_PROMPT_IDS.techTree);
      const lockedByTutorial = gameManager.isTutorialMode() && !techTreeSeen;
      this.continueButton.setEnabled(!lockedByTutorial);
      this.continueButton.setHint(lockedByTutorial ? "Visit the tech tree first" : "Return to the world map");
    }
    this.rebuildContent();
  }

  private toggleImmortalMode(): void {
    const enabled = gameManager.toggleImmortalModeEnabled();
    this.refreshImmortalButton();
    this.feedbackText.setText(enabled ? "Immortal mode enabled for test runs." : "Immortal mode disabled.");
  }

  private refreshImmortalButton(): void {
    if (!this.immortalButton) {
      return;
    }

    const enabled = gameManager.isImmortalModeEnabled();
    this.immortalButton.setSelected(enabled);
    this.immortalButton.setText(enabled ? "Immortal On" : "Immortal Off");
    this.immortalButton.setHint(enabled ? "Combat damage ignored" : "Ignore combat damage");
  }

  private rebuildContent(): void {
    this.contentContainer.removeAll(true);

    switch (this.activeTab) {
      case "offers":
        this.buildOffersContent();
        return;
      case "modifiers":
        this.buildModifiersContent();
        return;
      case "enchantments":
        this.buildEnchantmentsContent();
        return;
      case "trinkets":
        this.buildTrinketsContent();
    }
  }

  private buildOffersContent(): void {
    const state = gameManager.getState();
    const offers = gameManager.getCurrentForgeOfferDefinitions();
    const testModeEnabled = gameManager.isTestModeEnabled();

    this.contentContainer.add(this.add.text(470, 330, "Choose Trinket", TEXT.heading));
    this.contentContainer.add(
      this.add
        .text(
          470,
          368,
          testModeEnabled
            ? "Test mode: take as many trinkets as you want."
            : state.hasTakenForgeOffer
              ? "Trinket taken this forge visit."
              : "Choose one trinket.",
          {
          ...TEXT.small,
          color: colorHex(testModeEnabled || state.hasTakenForgeOffer ? COLORS.success : COLORS.gold)
        }
        )
        .setWordWrapWidth(700)
    );

    offers.forEach((definition, index) => {
      const selected = state.claimedOfferId === definition.id;
      const enabled = gameManager.canClaimForgeOffer(definition.id);
      const card = this.createSelectionCard(
        584 + index * 236,
        500,
        212,
        220,
        definition.name,
        definition.summary,
        definition.detail,
        definition.accent,
        enabled || selected,
        selected,
        () => this.attemptClaimOffer(definition.id)
      );
      this.contentContainer.add(card);
    });
  }

  private buildModifiersContent(): void {
    const state = gameManager.getState();
    const modifiers = gameManager.getCurrentRunModifierDefinitions();
    const testModeEnabled = gameManager.isTestModeEnabled();

    this.contentContainer.add(this.add.text(470, 330, "Training", TEXT.heading));
    this.contentContainer.add(
      this.add
        .text(
          470,
          368,
          testModeEnabled
            ? "Test mode: take as many Training picks as you want."
            : state.claimedModifierId
              ? "Training taken this forge visit."
              : "Choose one permanent Training.",
          { ...TEXT.small, color: colorHex(testModeEnabled || state.claimedModifierId ? COLORS.success : COLORS.gold) }
        )
        .setWordWrapWidth(700)
    );

    modifiers.forEach((definition, index) => {
      const selected = state.claimedModifierId === definition.id;
      const enabled = gameManager.canClaimRunModifier(definition.id) || selected;
      const card = this.createSelectionCard(
        584 + index * 236,
        500,
        212,
        220,
        definition.name,
        definition.summary,
        definition.detail,
        definition.accent,
        enabled,
        selected,
        () => this.attemptClaimModifier(definition.id)
      );
      this.contentContainer.add(card);
    });
  }

  private buildEnchantmentsContent(): void {
    const enchantment = gameManager.getCurrentEnchantmentDefinition();
    const pendingBias = gameManager.getPendingEnchantmentBiasDefinition();
    const roster = gameManager.getEnchantmentRoster();
    const freeRolls = gameManager.hasOwnedRunModifier("arcaneDebt");

    this.contentContainer.add(this.add.text(470, 330, "Enchantments", TEXT.heading));
    this.contentContainer.add(
      this.add
        .text(
          470,
          368,
          enchantment
            ? pendingBias
              ? `${enchantment.name} is active. Next roll favors ${pendingBias.name}.`
              : `${enchantment.name} is active.`
            : pendingBias
              ? `No enchantment bound. Next roll favors ${pendingBias.name}.`
              : freeRolls
                ? "No enchantment bound. Arcane Debt makes rolls free, but the tech tree is sealed."
                : "No enchantment bound. Buy one random enchantment for 2 Essence.",
          { ...TEXT.small, color: colorHex(enchantment ? COLORS.success : COLORS.gold) }
        )
        .setWordWrapWidth(700)
    );

    const rollButton = createButton({
      scene: this,
      x: 1092,
      y: 356,
      width: 156,
      height: 56,
      label: "Roll",
      hint: freeRolls ? "Free roll" : "Cost 2 Essence",
      accent: 0x59427e,
      onClick: () => this.attemptRollEnchantments()
    });
    rollButton.setEnabled(gameManager.canRollEnchantments());
    this.contentContainer.add(rollButton.root);

    const copy = enchantment
      ? "The bound enchant stays on your weapon when you upgrade into a new sword."
      : "Rolling binds one random enchantment immediately.";
    this.contentContainer.add(this.add.text(470, 416, copy, TEXT.body).setWordWrapWidth(700));

    this.contentContainer.add(this.add.text(470, 446, "Catalyst Sacrifice", TEXT.heading));

    const buttonSpecs = [
      { x: 560, y: 502 },
      { x: 694, y: 502 },
      { x: 828, y: 502 },
      { x: 962, y: 502 },
      { x: 1096, y: 502 }
    ];

    roster.forEach((definition, index) => {
      const spec = buttonSpecs[index];

      if (!spec) {
        return;
      }

      const button = createButton({
        scene: this,
        x: spec.x,
        y: spec.y,
        width: 124,
        height: 48,
        label: definition.name,
        hint: definition.biasCost ? formatMaterialCost(definition.biasCost) : "No catalyst",
        accent: definition.accent,
        onClick: () => this.attemptPrimeEnchantmentBias(definition.id)
      });
      button.setSelected(pendingBias?.id === definition.id);
      button.setEnabled(gameManager.canPrimeEnchantmentBias(definition.id) || pendingBias?.id === definition.id);
      this.contentContainer.add(button.root);
    });
  }

  private buildTrinketsContent(): void {
    const state = gameManager.getState();
    const relics = gameManager.getOwnedRelicDefinitions();
    const enchantment = gameManager.getCurrentEnchantmentDefinition();

    this.contentContainer.add(this.add.text(470, 330, "Collected Bonuses", TEXT.heading));

    this.contentContainer.add(
      this.createCollectionPanel(
        584,
        504,
        210,
        248,
        "Relics",
        relics.length > 0 ? relics.map((entry) => entry.name).join("\n") : "No relics collected yet.",
        0x5a6a79
      )
    );
    this.contentContainer.add(
      this.createCollectionPanel(
        820,
        504,
        210,
        248,
        "Trinkets",
        this.formatOwnedOffers(state.ownedOfferIds),
        0x60577a
      )
    );
    this.contentContainer.add(
      this.createCollectionPanel(
        1056,
        504,
        210,
        248,
        "Enchantment",
        enchantment ? `${enchantment.name}\n\n${enchantment.summary}` : "No enchantment is active.",
        0x5a4778
      )
    );
  }

  private createSelectionCard(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    summary: string,
    detail: string,
    accent: number,
    enabled: boolean,
    selected: boolean,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const background = this.add
      .rectangle(0, 0, width, height, selected ? accent : enabled ? COLORS.panelSoft : COLORS.disabled, selected ? 0.98 : 0.95)
      .setStrokeStyle(2, selected ? COLORS.gold : COLORS.panelEdge, enabled || selected ? 1 : 0.45)
      .setInteractive({ useHandCursor: enabled || selected });
    const titleText = this.add
      .text(0, -70, title, { ...TEXT.button, fontSize: "20px", align: "center" })
      .setOrigin(0.5)
      .setWordWrapWidth(width - 36);
    const summaryText = this.add
      .text(0, -12, summary, { ...TEXT.body, fontSize: "16px", align: "center" })
      .setOrigin(0.5)
      .setWordWrapWidth(width - 36);
    const detailText = this.add
      .text(0, 72, detail, { ...TEXT.caption, align: "center", color: colorHex(COLORS.subtext) })
      .setOrigin(0.5)
      .setWordWrapWidth(width - 36);
    const root = this.add.container(x, y, [background, titleText, summaryText, detailText]);

    root.setAlpha(enabled || selected ? 1 : 0.64);
    titleText.setColor(enabled || selected ? colorHex(COLORS.ink) : "#7f8a94");
    summaryText.setColor(enabled || selected ? colorHex(COLORS.ink) : "#7f8a94");
    detailText.setColor(enabled || selected ? colorHex(COLORS.subtext) : "#65717c");

    background.on("pointerover", () => {
      if (enabled || selected) {
        root.setScale(1.02);
      }
    });
    background.on("pointerout", () => root.setScale(1));
    background.on("pointerdown", () => {
      if (enabled) {
        root.setScale(0.985);
      }
    });
    background.on("pointerup", () => {
      if (!enabled) {
        return;
      }

      root.setScale(1.02);
      onClick();
    });

    return root;
  }

  private createCollectionPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    body: string,
    accent: number
  ): Phaser.GameObjects.Container {
    const background = this.add
      .rectangle(0, 0, width, height, COLORS.panelSoft, 0.96)
      .setStrokeStyle(2, accent, 0.92);
    const titleText = this.add
      .text(0, -height * 0.5 + 24, title, { ...TEXT.button, fontSize: "18px", align: "center" })
      .setOrigin(0.5, 0);
    const bodyText = this.add
      .text(0, -height * 0.5 + 62, body, { ...TEXT.caption, fontSize: "13px", align: "center", color: colorHex(COLORS.ink) })
      .setOrigin(0.5, 0)
      .setWordWrapWidth(width - 28);

    return this.add.container(x, y, [background, titleText, bodyText]);
  }

  private attemptClaimOffer(offerId: ForgeOfferId): void {
    if (gameManager.claimForgeOffer(offerId)) {
      const offer = gameManager.getForgeOfferRoster().find((entry) => entry.id === offerId);
      this.feedbackText.setText(`${offer?.name ?? "Trinket"} claimed.`);
    } else {
      this.feedbackText.setText("No trinket choices left this visit.");
    }

    this.refreshView();
  }

  private attemptClaimModifier(modifierId: RunModifierId): void {
    if (gameManager.claimRunModifier(modifierId)) {
      const modifier = gameManager.getRunModifierRoster().find((entry) => entry.id === modifierId);
      this.feedbackText.setText(`${modifier?.name ?? "Training"} added.`);
    } else {
      this.feedbackText.setText("That Training pick is unavailable right now.");
    }

    this.refreshView();
  }

  private attemptRollEnchantments(): void {
    if (gameManager.rollEnchantmentOffers()) {
      this.feedbackText.setText(`The forge binds ${gameManager.getCurrentEnchantmentDefinition()?.name ?? "a new enchantment"}.`);
    } else {
      this.feedbackText.setText("Need 2 Essence to buy an enchantment.");
    }

    this.refreshView();
  }

  private attemptPrimeEnchantmentBias(enchantmentId: EnchantmentId): void {
    if (gameManager.primeEnchantmentBias(enchantmentId)) {
      const enchantment = gameManager.getEnchantmentRoster().find((entry) => entry.id === enchantmentId);
      this.feedbackText.setText(`${enchantment?.name ?? "That enchantment"} is favored on your next roll.`);
    } else {
      const enchantment = gameManager.getEnchantmentRoster().find((entry) => entry.id === enchantmentId);
      this.feedbackText.setText(`Need ${formatMaterialCost(enchantment?.biasCost ?? {})} to favor that enchantment.`);
    }

    this.refreshView();
  }

  private formatOwnedOffers(ownedOfferIds: ForgeOfferId[]): string {
    if (ownedOfferIds.length === 0) {
      return "No trinkets claimed.";
    }

    const counts = new Map<ForgeOfferId, number>();

    for (const id of ownedOfferIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    const offerNames = new Map(gameManager.getForgeOfferRoster().map((entry) => [entry.id, entry.name]));
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([id, count]) => `${offerNames.get(id) ?? id} x${count}`)
      .join("\n");
  }

  private formatOwnedModifiers(): string {
    const owned = gameManager.getOwnedRunModifierDefinitions();

    if (owned.length === 0) {
      return "No Training claimed.";
    }

    const counts = new Map<RunModifierId, number>();

    for (const definition of owned) {
      counts.set(definition.id, (counts.get(definition.id) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([id, count]) => `${gameManager.getRunModifierRoster().find((entry) => entry.id === id)?.name ?? id} x${count}`)
      .join("\n");
  }

  private formatCurrentBranch(unlockedTechNodeIds: string[]): string {
    const branchNode = unlockedTechNodeIds
      .map((nodeId) => WEAPON_TECH_TREE[nodeId as keyof typeof WEAPON_TECH_TREE])
      .find((definition) => definition && definition.branch !== "root");

    return branchNode ? branchNode.name : "Arming Sword";
  }

  private formatAffinity(affinity: string): string {
    return affinity.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
  }

  private drawPanel(x: number, y: number, width: number, height: number): void {
    this.add.rectangle(x, y, width, height, COLORS.panel, 0.95).setOrigin(0, 0).setStrokeStyle(2, COLORS.panelEdge, 1);
  }

  private paintBackdrop(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);

    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.background, 1);
    graphics.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    graphics.fillStyle(COLORS.panelSoft, 0.18);
    graphics.fillRect(0, 0, VIEWPORT.width, 110);
    graphics.fillStyle(COLORS.gold, 0.08);
    graphics.fillCircle(1112, 120, 134);
    graphics.lineStyle(1, COLORS.panelEdge, 0.18);

    for (let x = 0; x < VIEWPORT.width; x += 64) {
      graphics.lineBetween(x, 0, x, VIEWPORT.height);
    }
  }

  private maybeOpenTutorialOverlay(): void {
    if (!gameManager.isTutorialMode() || gameManager.hasSeenTutorialPrompt(TUTORIAL_PROMPT_IDS.forge)) {
      return;
    }

    createGuidedOverlay({
      scene: this,
      pages: TUTORIAL_FORGE_PAGES,
      finalLabel: "Open Tech Tree",
      onComplete: () => {
        gameManager.markTutorialPromptSeen(TUTORIAL_PROMPT_IDS.forge);
        gameManager.openTechTree(this);
      }
    });
  }
}
