import Phaser from "phaser";
import { gameManager } from "../core/GameManager";
import { SCENE_KEYS } from "../core/SceneKeys";
import {
  TEST_MODE_PASSWORD,
  TUTORIAL_SKIP_WARNING
} from "../tutorial/tutorialData";
import { createGuidedOverlay, type GuidedOverlayHandle } from "../ui/createGuidedOverlay";
import { createButton, type ButtonHandle } from "../ui/createButton";
import { fadeInMajorScene } from "../ui/sceneFades";
import { applyLocalizedText, localizeTextStyle, translateUiText } from "../ui/localization";
import { COLORS, TEXT, VIEWPORT, colorHex } from "../ui/theme";

export class MainMenuScene extends Phaser.Scene {
  private feedbackText!: Phaser.GameObjects.Text;
  private menuOverlay: GuidedOverlayHandle | null = null;
  private settingsOverlay: Phaser.GameObjects.Container | null = null;

  constructor() {
    super(SCENE_KEYS.MainMenu);
  }

  create(): void {
    fadeInMajorScene(this);
    this.paintBackdrop();

    applyLocalizedText(
      this.add.text(VIEWPORT.width * 0.5 + 4, 82, "", {
        ...localizeTextStyle(TEXT.title),
        fontSize: "56px",
        color: "#101113"
      })
        .setOrigin(0.5, 0)
        .setDepth(4)
        .setAlpha(0.55),
      "Cycles of Steel"
    );
    applyLocalizedText(
      this.add.text(VIEWPORT.width * 0.5, 74, "", {
        ...localizeTextStyle(TEXT.title),
        fontSize: "56px",
        color: colorHex(COLORS.ink),
        stroke: colorHex(COLORS.gold),
        strokeThickness: 2
      })
        .setOrigin(0.5, 0)
        .setDepth(5),
      "Cycles of Steel"
    );
    this.add.rectangle(VIEWPORT.width * 0.5, 146, 404, 2, COLORS.gold, 0.72).setDepth(5);
    this.add.rectangle(VIEWPORT.width * 0.5, 152, 272, 2, 0xe7d6b4, 0.38).setDepth(5);

    this.drawPanel(384, 228, 512, 280, "Combat Basics");
    applyLocalizedText(
      this.add.text(
        408,
        284,
        "",
        localizeTextStyle(TEXT.body)
      ).setWordWrapWidth(456),
      [
        "Move with WASD or the arrow keys.",
        "Dash with Shift or Space.",
        "Bind with Q to turn incoming strikes aside.",
        "Hold E to Guard: E+RMB Day, E+LMB Ox, E+Space Fool.",
        "Use J or left mouse for light attacks.",
        "Use K or right mouse for heavy attacks.",
        "Aim with the mouse to keep attacks precise.",
        "Watch the spacing ring and stamina bar.",
        "Plan around sword path, enchantment, and part upgrades."
      ].join("\n")
    );
    this.feedbackText = this.add
      .text(VIEWPORT.width * 0.5, 540, "", localizeTextStyle(TEXT.small))
      .setOrigin(0.5, 0)
      .setWordWrapWidth(520);
    const pendingMessage = gameManager.consumePendingSystemMessage();

    if (pendingMessage) {
      applyLocalizedText(this.feedbackText, pendingMessage);
    }

    createButton({
      scene: this,
      x: gameManager.hasSavedRun() ? VIEWPORT.width * 0.5 - 132 : VIEWPORT.width * 0.5 - 146,
      y: 620,
      width: 260,
      height: 78,
      label: "Start Run",
      hint: gameManager.hasCompletedTutorial() ? "Begin with arming sword" : "Skip guided tutorial",
      accent: 0x71411f,
      onClick: () => this.handleStartRun()
    });

    if (gameManager.hasSavedRun()) {
      createButton({
        scene: this, x: VIEWPORT.width * 0.5 + 132, y: 620, width: 240, height: 78,
        label: "Resume Run", hint: "Continue saved run", accent: 0x49634e,
        onClick: () => gameManager.resumeSavedRun(this)
      });
    }

    createButton({
      scene: this,
      x: gameManager.hasSavedRun() ? VIEWPORT.width - 250 : VIEWPORT.width * 0.5 + 146,
      y: 620,
      width: 260,
      height: 78,
      label: "Tutorial",
      hint: "Live guided run",
      accent: 0x3b3d41,
      onClick: () => gameManager.openTutorial(this)
    });

    const settingsButton = createButton({
      scene: this,
      x: 138,
      y: 56,
      width: 220,
      height: 58,
      label: "Settings",
      hint: "Game options",
      accent: 0x4b3a2b,
      onClick: () => this.openSettingsMenu()
    });
    settingsButton.root.setDepth(6);

    const testModeButton = createButton({
      scene: this,
      x: VIEWPORT.width - 138,
      y: 56,
      width: 220,
      height: 58,
      label: "Test Mode",
      hint: "",
      accent: 0x684121,
      onClick: () => this.handleTestModeToggle(testModeButton)
    });
    this.refreshTestModeButton(testModeButton);
  }

  private handleStartRun(): void {
    if (this.menuOverlay) {
      return;
    }

    if (gameManager.hasCompletedTutorial()) {
      gameManager.beginRun(this);
      return;
    }

    this.menuOverlay = createGuidedOverlay({
      scene: this,
      width: 620,
      height: 282,
      finalLabel: "Open Tutorial",
      showBackButton: false,
      pages: [
        {
          title: "Skip The Tutorial?",
          body: TUTORIAL_SKIP_WARNING,
          accent: COLORS.gold
        }
      ],
      secondaryAction: {
        label: "Skip Anyway",
        hint: "Start without the tutorial",
        accent: 0x5a4540,
        onClick: () => {
          this.menuOverlay = null;
          gameManager.beginRun(this);
        }
      },
      onComplete: () => {
        this.menuOverlay = null;
        gameManager.openTutorial(this);
      }
    });
  }

  private openSettingsMenu(): void {
    if (this.settingsOverlay || this.menuOverlay) {
      return;
    }

    const depth = 60;
    const centerX = VIEWPORT.width * 0.5;
    const centerY = VIEWPORT.height * 0.5;
    const veil = this.add
      .rectangle(centerX, centerY, VIEWPORT.width, VIEWPORT.height, 0x05090f, 0.76)
      .setInteractive()
      .setScrollFactor(0);
    const panel = this.add
      .rectangle(centerX, centerY, 500, 250, COLORS.panel, 0.98)
      .setStrokeStyle(2, COLORS.panelEdge, 1)
      .setScrollFactor(0);
    const accentBar = this.add
      .rectangle(centerX, centerY - 109, 468, 8, COLORS.gold, 1)
      .setScrollFactor(0);
    const title = this.add
      .text(centerX, centerY - 84, "", localizeTextStyle(TEXT.heading))
      .setOrigin(0.5, 0)
      .setScrollFactor(0);
    const language = this.add
      .text(centerX, centerY - 36, "", localizeTextStyle({
        ...TEXT.small,
        color: colorHex(COLORS.subtext)
      }))
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    applyLocalizedText(title, "Settings");
    applyLocalizedText(language, "Language");

    const root = this.add.container(0, 0, [veil, panel, accentBar, title, language]);
    root.setDepth(depth).setScrollFactor(0);
    this.settingsOverlay = root;

    const thaiModeButton = createButton({
      scene: this,
      x: centerX,
      y: centerY + 16,
      width: 260,
      height: 58,
      label: "Thai Mode",
      hint: gameManager.isThaiModeEnabled() ? "Menu text in Thai" : "Translate menu text",
      accent: 0x4b3a2b,
      selected: gameManager.isThaiModeEnabled(),
      scrollFactor: 0,
      onClick: () => {
        this.closeSettingsMenu();
        gameManager.toggleThaiModeEnabled();
        this.scene.restart();
      }
    });
    thaiModeButton.root.setDepth(depth + 1);
    root.add(thaiModeButton.root);

    const closeButton = createButton({
      scene: this,
      x: centerX,
      y: centerY + 88,
      width: 180,
      height: 52,
      label: "Close",
      accent: 0x45413d,
      scrollFactor: 0,
      onClick: () => this.closeSettingsMenu()
    });
    closeButton.root.setDepth(depth + 1);
    root.add(closeButton.root);

    veil.on("pointerup", () => this.closeSettingsMenu());
  }

  private closeSettingsMenu(): void {
    this.settingsOverlay?.destroy(true);
    this.settingsOverlay = null;
  }
  private handleTestModeToggle(testModeButton: ButtonHandle): void {
    if (gameManager.isTestModeEnabled()) {
      gameManager.setTestModeEnabled(false);
      applyLocalizedText(this.feedbackText, "Test mode disabled.");
      this.refreshTestModeButton(testModeButton);
      return;
    }

    const password = window.prompt(translateUiText("Enter the Test Mode password."));

    if (password === TEST_MODE_PASSWORD) {
      gameManager.setTestModeEnabled(true);
      applyLocalizedText(
        this.feedbackText,
        gameManager.isTestModeUnlocked()
          ? "Test mode enabled."
          : "Test mode enabled. The password can still be earned later by beating the first elite."
      );
    } else if (password !== null) {
      applyLocalizedText(
        this.feedbackText,
        gameManager.isTestModeUnlocked()
          ? "Wrong password."
          : "Wrong password. You can still be given the password after beating the first elite."
      );
    }

    this.refreshTestModeButton(testModeButton);
  }

  private refreshTestModeButton(testModeButton: ButtonHandle): void {
    const enabled = gameManager.isTestModeEnabled();
    testModeButton.setSelected(enabled);
    testModeButton.setHint(
      enabled ? "On: free upgrades" : gameManager.isTestModeUnlocked() ? "Password awarded" : "Try or earn it later"
    );
  }

  private drawPanel(x: number, y: number, width: number, height: number, title: string): void {
    this.add.rectangle(x, y, width, height, COLORS.panel, 0.95).setOrigin(0, 0).setStrokeStyle(2, COLORS.panelEdge, 1);
    applyLocalizedText(this.add.text(x + 24, y + 24, "", localizeTextStyle(TEXT.heading)), title);
  }

  private paintBackdrop(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);

    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.background, 1);
    graphics.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    graphics.fillStyle(COLORS.panelSoft, 0.2);
    graphics.fillRect(0, 0, VIEWPORT.width, 112);
    graphics.fillStyle(COLORS.gold, 0.08);
    graphics.fillCircle(1106, 112, 126);
    graphics.lineStyle(1, COLORS.panelEdge, 0.18);

    for (let x = 0; x < VIEWPORT.width; x += 64) {
      graphics.lineBetween(x, 0, x, VIEWPORT.height);
    }
  }
}
