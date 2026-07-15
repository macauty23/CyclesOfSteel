import Phaser from "phaser";
import { gameManager } from "../core/GameManager";
import { SCENE_KEYS } from "../core/SceneKeys";
import type { SwordDefinition, SwordId } from "../core/types";
import { createButton, type ButtonHandle } from "../ui/createButton";
import { COLORS, TEXT, VIEWPORT, colorHex } from "../ui/theme";

export class SwordSelectScene extends Phaser.Scene {
  private selectedSwordId: SwordId = "armingSword";
  private readonly swordButtons = new Map<SwordId, ButtonHandle>();
  private detailsHeader!: Phaser.GameObjects.Text;
  private detailsText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.SwordSelect);
  }

  create(): void {
    this.swordButtons.clear();
    this.paintBackdrop();

    const swords = gameManager.getSwordRoster();
    this.selectedSwordId = gameManager.getState().selectedSwordId;

    this.add.text(84, 70, "Choose Your Blade", TEXT.title);
    this.add
      .text(
        88,
        132,
        "Each weapon starts with its own stance, speed, and attack identity. Your choice stays locked for the full run, then grows through the forge tech tree.",
        TEXT.body
      )
      .setWordWrapWidth(700);

    swords.forEach((sword, index) => {
      const button = createButton({
        scene: this,
        x: 230 + index * 410,
        y: 290,
        width: 336,
        height: 176,
        label: sword.name,
        hint: sword.epithet,
        accent: sword.accent,
        onClick: () => this.selectSword(sword.id)
      });

      this.swordButtons.set(sword.id, button);
    });

    this.add.rectangle(84, 418, 1112, 206, COLORS.panel, 0.95).setOrigin(0, 0).setStrokeStyle(2, COLORS.panelEdge, 1);
    this.detailsHeader = this.add.text(114, 444, "", { ...TEXT.heading, color: colorHex(COLORS.gold) });
    this.detailsText = this.add.text(114, 496, "", TEXT.body).setWordWrapWidth(1056);

    createButton({
      scene: this,
      x: 1028,
      y: 680,
      width: 220,
      height: 72,
      label: "Enter Arena",
      hint: "Begin level 1",
      accent: 0x2b5a5d,
      onClick: () => gameManager.beginRun(this, this.selectedSwordId)
    });

    createButton({
      scene: this,
      x: 196,
      y: 680,
      width: 220,
      height: 72,
      label: "Back",
      hint: "Return to menu",
      accent: 0x293744,
      onClick: () => gameManager.openMainMenu(this)
    });

    this.refreshSelectionDetails(swords);
  }

  private selectSword(swordId: SwordId): void {
    this.selectedSwordId = swordId;
    this.refreshSelectionDetails(gameManager.getSwordRoster());
  }

  private refreshSelectionDetails(swords: SwordDefinition[]): void {
    const selected = swords.find((sword) => sword.id === this.selectedSwordId) ?? swords[0];

    this.swordButtons.forEach((button, swordId) => {
      button.setSelected(swordId === this.selectedSwordId);
    });

    this.detailsHeader.setText(`${selected.name} / ${selected.epithet}`);
    this.detailsText.setText(
      [
        selected.summary,
        `Light: ${selected.lightSummary}`,
        `Heavy: ${selected.heavySummary}`
      ].join("\n\n")
    );
  }

  private paintBackdrop(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);

    const graphics = this.add.graphics();
    graphics.fillStyle(0x0f1824, 1);
    graphics.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    graphics.fillStyle(0x1c2c3d, 0.16);
    graphics.fillRect(0, 0, VIEWPORT.width, 98);
    graphics.fillStyle(0xc79353, 0.06);
    graphics.fillCircle(1090, 108, 118);
    graphics.lineStyle(1, 0x334555, 0.18);

    for (let y = 0; y < VIEWPORT.height; y += 58) {
      graphics.lineBetween(0, y, VIEWPORT.width, y);
    }
  }
}
