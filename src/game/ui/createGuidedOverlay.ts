import Phaser from "phaser";
import { createButton } from "./createButton";
import { applyLocalizedText, localizeTextStyle } from "./localization";
import { COLORS, TEXT, VIEWPORT, colorHex } from "./theme";

export interface GuidedOverlayPage {
  title: string;
  body: string;
  accent?: number;
}

interface GuidedOverlayAction {
  label: string;
  hint?: string;
  accent?: number;
  onClick: () => void;
}

interface GuidedOverlayConfig {
  scene: Phaser.Scene;
  pages: GuidedOverlayPage[];
  width?: number;
  height?: number;
  depth?: number;
  scrollFactor?: number;
  nextLabel?: string;
  finalLabel?: string;
  showBackButton?: boolean;
  secondaryAction?: GuidedOverlayAction;
  onComplete?: () => void;
}

export interface GuidedOverlayHandle {
  root: Phaser.GameObjects.Container;
  destroy(): void;
}

export function createGuidedOverlay(config: GuidedOverlayConfig): GuidedOverlayHandle {
  const {
    scene,
    pages,
    width = 640,
    height = 360,
    depth = 60,
    scrollFactor = 0,
    nextLabel = "Continue",
    finalLabel = "Begin",
    showBackButton = true,
    secondaryAction,
    onComplete
  } = config;

  let pageIndex = 0;
  let destroyed = false;

  const veil = scene.add
    .rectangle(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5, VIEWPORT.width, VIEWPORT.height, 0x05090f, 0.76)
    .setInteractive()
    .setScrollFactor(scrollFactor);
  const panel = scene.add
    .rectangle(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5, width, height, COLORS.panel, 0.98)
    .setStrokeStyle(2, COLORS.panelEdge, 1)
    .setScrollFactor(scrollFactor);
  const accentBar = scene.add
    .rectangle(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5 - height * 0.5 + 16, width - 32, 8, COLORS.gold, 1)
    .setScrollFactor(scrollFactor);
  const titleText = scene.add
    .text(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5 - height * 0.5 + 46, "", localizeTextStyle(TEXT.heading))
    .setOrigin(0.5, 0)
    .setScrollFactor(scrollFactor);
  const bodyText = scene.add
    .text(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5 - height * 0.5 + 96, "", {
      ...localizeTextStyle(TEXT.body),
      align: "center",
      color: colorHex(COLORS.ink)
    })
    .setOrigin(0.5, 0)
    .setWordWrapWidth(width - 92)
    .setScrollFactor(scrollFactor);
  const pageText = scene.add
    .text(VIEWPORT.width * 0.5 + width * 0.5 - 50, VIEWPORT.height * 0.5 - height * 0.5 + 22, "", {
      ...TEXT.caption,
      color: colorHex(COLORS.subtext)
    })
    .setOrigin(1, 0)
    .setScrollFactor(scrollFactor);

  const root = scene.add.container(0, 0, [veil, panel, accentBar, titleText, bodyText, pageText]);
  root.setDepth(depth).setScrollFactor(scrollFactor);

  const destroy = (): void => {
    if (destroyed) {
      return;
    }

    destroyed = true;
    root.destroy(true);
  };

  const buttonOffsets =
    showBackButton && secondaryAction
      ? [-160, 0, 160]
      : showBackButton || secondaryAction
        ? [-124, 124]
        : [0];
  let buttonIndex = 0;
  let backButton: ReturnType<typeof createButton> | null = null;

  if (showBackButton) {
    backButton = createButton({
      scene,
      x: VIEWPORT.width * 0.5 + buttonOffsets[buttonIndex],
      y: VIEWPORT.height * 0.5 + height * 0.5 - 48,
      width: 144,
      height: 56,
      label: "Back",
      hint: "Previous page",
      accent: 0x45413d,
      scrollFactor,
      onClick: () => {
        pageIndex = Math.max(0, pageIndex - 1);
        refresh();
      }
    });
    backButton.root.setDepth(depth + 1);
    root.add(backButton.root);
    buttonIndex += 1;
  }

  let secondaryButton: ReturnType<typeof createButton> | null = null;
  if (secondaryAction) {
    secondaryButton = createButton({
      scene,
      x: VIEWPORT.width * 0.5 + buttonOffsets[buttonIndex],
      y: VIEWPORT.height * 0.5 + height * 0.5 - 48,
      width: 176,
      height: 56,
      label: secondaryAction.label,
      hint: secondaryAction.hint ?? "",
      accent: secondaryAction.accent ?? 0x5d463e,
      scrollFactor,
      onClick: () => {
        destroy();
        secondaryAction.onClick();
      }
    });
    secondaryButton.root.setDepth(depth + 1);
    root.add(secondaryButton.root);
    buttonIndex += 1;
  }

  const nextButton = createButton({
    scene,
    x: VIEWPORT.width * 0.5 + buttonOffsets[buttonIndex],
    y: VIEWPORT.height * 0.5 + height * 0.5 - 48,
    width: 180,
    height: 56,
    label: nextLabel,
    hint: "Continue",
    accent: COLORS.gold,
    scrollFactor,
    onClick: () => {
      if (pageIndex < pages.length - 1) {
        pageIndex += 1;
        refresh();
        return;
      }

      destroy();
      onComplete?.();
    }
  });
  nextButton.root.setDepth(depth + 1);
  root.add(nextButton.root);

  const refresh = (): void => {
    const page = pages[pageIndex] ?? pages[0];
    const lastPage = pageIndex >= pages.length - 1;

    applyLocalizedText(titleText, page?.title ?? "");
    applyLocalizedText(bodyText, page?.body ?? "");
    pageText.setText(`${pageIndex + 1}/${pages.length}`);
    accentBar.setFillStyle(page?.accent ?? COLORS.gold, 1);
    backButton?.setEnabled(pageIndex > 0);
    nextButton.setText(lastPage ? finalLabel : nextLabel);
    nextButton.setHint(lastPage ? "Continue" : "Next page");
    nextButton.setSelected(lastPage);
  };

  refresh();

  return {
    root,
    destroy
  };
}
