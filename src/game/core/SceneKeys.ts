export const SCENE_KEYS = {
  MainMenu: "MainMenuScene",
  Tutorial: "TutorialScene",
  SwordSelect: "SwordSelectScene",
  Game: "GameScene",
  Forge: "ForgeScene",
  TechTree: "TechTreeScene",
  WorldMap: "WorldMapScene",
  Modification: "ModificationScene"
} as const;

export type SceneKey = (typeof SCENE_KEYS)[keyof typeof SCENE_KEYS];
