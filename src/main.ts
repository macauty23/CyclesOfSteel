import "./style.css";
import Phaser from "phaser";
import { gameManager } from "./game/core/GameManager";
import { ForgeScene } from "./game/scenes/ForgeScene";
import { GameScene } from "./game/scenes/GameScene";
import { MainMenuScene } from "./game/scenes/MainMenuScene";
import { ModificationScene } from "./game/scenes/ModificationScene";
import { SwordSelectScene } from "./game/scenes/SwordSelectScene";
import { TechTreeScene } from "./game/scenes/TechTreeScene";
import { TutorialScene } from "./game/scenes/TutorialScene";
import { WorldMapScene } from "./game/scenes/WorldMapScene";
import { installLocalizationHooks } from "./game/ui/localization";
import { VIEWPORT } from "./game/ui/theme";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app container.");
}

gameManager.reset();
installLocalizationHooks();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: app,
  backgroundColor: "#08111d",
  width: VIEWPORT.width,
  height: VIEWPORT.height,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  render: {
    antialias: true,
    roundPixels: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEWPORT.width,
    height: VIEWPORT.height
  },
  scene: [
    MainMenuScene,
    TutorialScene,
    SwordSelectScene,
    WorldMapScene,
    GameScene,
    ForgeScene,
    TechTreeScene,
    ModificationScene
  ]
};

new Phaser.Game(config);
