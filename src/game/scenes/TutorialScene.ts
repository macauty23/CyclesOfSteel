import Phaser from "phaser";
import { gameManager } from "../core/GameManager";
import { SCENE_KEYS } from "../core/SceneKeys";
import { TUTORIAL_ROUTE_PREVIEW } from "../tutorial/tutorialData";
import { createButton } from "../ui/createButton";
import { COLORS, TEXT, VIEWPORT } from "../ui/theme";

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Tutorial);
  }

  create(): void {
    this.paintBackdrop();

    this.add.text(72, 70, "Tutorial", TEXT.title);
    this.add
      .text(
        76,
        130,
        "This tutorial explains movement, binds, stamina, upgrades, the tech tree, and a final fight in a fixed step-by-step sequence.",
        TEXT.body
      )
      .setWordWrapWidth(1120);

    this.drawPanel(64, 214, 328, 414, "Route", [
      "Plains",
      "Savannah",
      "Volcanic Lands",
      "Lava Fields",
      "Volcano"
    ]);
    this.drawPanel(888, 214, 328, 414, "You Will Learn", [
      "Movement, spacing, and stamina.",
      "Light and heavy commitment.",
      "Dash timing and binds on Q.",
      "Why biomes feed different materials.",
      "How the forge and tech tree shape your run.",
      "How to handle an elite without panic."
    ]);

    this.add.rectangle(424, 214, 432, 414, COLORS.panel, 0.95).setOrigin(0, 0).setStrokeStyle(2, COLORS.panelEdge, 1);
    this.add.text(452, 238, "Mini World Map", TEXT.heading);
    this.add
      .text(
        452,
        280,
        "The tutorial follows a fixed path so each stop can focus on one group of mechanics before the final fight.",
        TEXT.body
      )
      .setWordWrapWidth(376);
    this.drawRoutePreview();

    createButton({
      scene: this,
      x: 192,
      y: 656,
      width: 220,
      height: 68,
      label: "Main Menu",
      hint: "Return",
      accent: 0x2c3d4d,
      onClick: () => gameManager.openMainMenu(this)
    });

    createButton({
      scene: this,
      x: 1084,
      y: 656,
      width: 240,
      height: 68,
      label: "Begin Tutorial",
      hint: "Start the guided tutorial",
      accent: 0x2c5b4d,
      onClick: () => gameManager.beginTutorialRun(this)
    });
  }

  private drawPanel(x: number, y: number, width: number, height: number, title: string, lines: string[]): void {
    this.add.rectangle(x, y, width, height, COLORS.panel, 0.96).setOrigin(0, 0).setStrokeStyle(2, COLORS.panelEdge, 1);
    this.add.text(x + 24, y + 24, title, TEXT.heading);
    this.add
      .text(x + 24, y + 78, lines.join("\n\n"), TEXT.body)
      .setWordWrapWidth(width - 48);
  }

  private drawRoutePreview(): void {
    const graphics = this.add.graphics();
    const nodes = TUTORIAL_ROUTE_PREVIEW.map((label, index) => ({
      label,
      x: 468 + index * 72,
      y: index % 2 === 0 ? 460 : 518
    }));

    graphics.lineStyle(4, COLORS.panelEdge, 0.85);

    for (let index = 0; index < nodes.length - 1; index += 1) {
      const current = nodes[index];
      const next = nodes[index + 1];

      if (!current || !next) {
        continue;
      }

      graphics.lineBetween(current.x, current.y, next.x, next.y);
    }

    nodes.forEach((node, index) => {
      const accent = index === nodes.length - 1 ? 0xd18463 : index >= 2 ? 0xc79353 : 0x7ea16f;
      this.add.circle(node.x, node.y, 22, accent, 0.94).setStrokeStyle(2, COLORS.ghost, 0.4);
      this.add
        .text(node.x, node.y + 36, node.label, {
          ...TEXT.caption,
          align: "center",
          color: "#f1ede6"
        })
        .setOrigin(0.5, 0)
        .setWordWrapWidth(92);
    });
  }

  private paintBackdrop(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);
    const graphics = this.add.graphics();
    graphics.fillStyle(0x0f1824, 1);
    graphics.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    graphics.fillStyle(0x1d2c3e, 0.2);
    graphics.fillRect(0, 0, VIEWPORT.width, 112);
    graphics.fillStyle(0xc79353, 0.05);
    graphics.fillCircle(1090, 104, 128);
    graphics.lineStyle(1, 0x314355, 0.18);

    for (let x = 0; x < VIEWPORT.width; x += 64) {
      graphics.lineBetween(x, 0, x, VIEWPORT.height);
    }
  }
}
