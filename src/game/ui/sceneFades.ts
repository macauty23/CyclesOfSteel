import Phaser from "phaser";

export const MAJOR_SCENE_FADE_MS = 120;

/** A deliberately tiny fade used only between major run screens and arenas. */
export function fadeInMajorScene(scene: Phaser.Scene, durationMs = MAJOR_SCENE_FADE_MS): void {
  scene.cameras.main.fadeIn(durationMs, 5, 9, 15);
}

export function fadeOutMajorScene(scene: Phaser.Scene, durationMs = MAJOR_SCENE_FADE_MS): void {
  scene.cameras.main.fadeOut(durationMs, 5, 9, 15);
}
