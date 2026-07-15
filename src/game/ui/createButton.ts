import Phaser from "phaser";
import { applyLocalizedText, localizeTextStyle, translateUiText } from "./localization";
import { COLORS, TEXT, colorHex } from "./theme";

export interface ButtonHandle {
  root: Phaser.GameObjects.Container;
  setEnabled(enabled: boolean): void;
  setSelected(selected: boolean): void;
  setText(value: string): void;
  setHint(value: string): void;
}

interface ButtonConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  hint?: string;
  accent?: number;
  enabled?: boolean;
  selected?: boolean;
  scrollFactor?: number;
  onClick: () => void;
}

export function createButton(config: ButtonConfig): ButtonHandle {
  const {
    scene,
    x,
    y,
    width,
    height,
    label,
    hint = "",
    accent = COLORS.panelSoft,
    enabled: enabledDefault = true,
    selected: selectedDefault = false,
    scrollFactor = 1,
    onClick
  } = config;

  let enabled = enabledDefault;
  let selected = selectedDefault;

  const background = scene.add
    .rectangle(0, 0, width, height, COLORS.panel, 0.96)
    .setStrokeStyle(2, COLORS.panelEdge, 1)
    .setInteractive({ useHandCursor: true })
    .setScrollFactor(scrollFactor);

  const labelText = scene.add
    .text(0, hint ? -height * 0.18 : 0, translateUiText(label), localizeTextStyle({
      ...TEXT.button,
      align: "center",
      wordWrap: { width: Math.max(40, width - 28) }
    }))
    .setOrigin(0.5)
    .setScrollFactor(scrollFactor);
  const hintText = scene.add
    .text(0, height * 0.18, translateUiText(hint), localizeTextStyle({
      ...TEXT.caption,
      color: colorHex(COLORS.subtext),
      align: "center",
      wordWrap: { width: Math.max(40, width - 24) }
    }))
    .setOrigin(0.5)
    .setScrollFactor(scrollFactor);

  const root = scene.add.container(x, y, [background, labelText, hintText]);
  root.setSize(width, height);
  root.setScrollFactor(scrollFactor);

  const refresh = (): void => {
    const fillColor = selected ? accent : enabled ? COLORS.panel : COLORS.disabled;
    const strokeColor = selected ? COLORS.gold : COLORS.panelEdge;
    const strokeAlpha = enabled || selected ? 1 : 0.45;
    const labelColor = enabled || selected ? colorHex(COLORS.ink) : "#7f8b96";
    const hintColor = enabled || selected ? colorHex(COLORS.subtext) : "#66717c";

    background.setFillStyle(fillColor, selected ? 1 : 0.96);
    background.setStrokeStyle(2, strokeColor, strokeAlpha);
    labelText.setColor(labelColor);
    hintText.setColor(hintColor);
    root.setAlpha(enabled || selected ? 1 : 0.68);
  };

  background.on("pointerover", () => {
    if (!enabled && !selected) {
      return;
    }

    root.setScale(1.02);
  });

  background.on("pointerout", () => {
    root.setScale(1);
  });

  background.on("pointerdown", () => {
    if (!enabled) {
      return;
    }

    root.setScale(0.985);
  });

  background.on("pointerup", () => {
    if (!enabled) {
      return;
    }

    root.setScale(1.02);
    onClick();
  });

  refresh();

  return {
    root,
    setEnabled(value: boolean) {
      enabled = value;
      if (!enabled) {
        root.setScale(1);
      }

      refresh();
    },
    setSelected(value: boolean) {
      selected = value;
      refresh();
    },
    setText(value: string) {
      applyLocalizedText(labelText, value);
    },
    setHint(value: string) {
      applyLocalizedText(hintText, value);
    }
  };
}
