import Phaser from "phaser";
import type { MaterialId } from "../core/types";
import { ARENA } from "../ui/theme";

interface MaterialPickupConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  materialId: MaterialId;
  value: number;
  tint: number;
}

export class MaterialPickup {
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly materialId: MaterialId;
  readonly value: number;

  private readonly velocity = new Phaser.Math.Vector2();
  private magnetDelay = 120;
  private collected = false;

  constructor(config: MaterialPickupConfig) {
    const { scene, x, y, materialId, value, tint } = config;

    this.materialId = materialId;
    this.value = value;
    this.shadow = scene.add.ellipse(x, y + 10, 18, 10, 0x000000, 0.18).setDepth(1);
    this.sprite = scene.add.rectangle(x, y, 14, 14, tint).setAngle(45).setStrokeStyle(2, 0xf5ead8, 0.5).setDepth(5);
    this.velocity.set(Phaser.Math.Between(-110, 110), Phaser.Math.Between(-130, 90));
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  get isCollected(): boolean {
    return this.collected;
  }

  update(targetX: number, targetY: number, deltaMs: number): void {
    if (this.collected) {
      return;
    }

    this.magnetDelay = Math.max(0, this.magnetDelay - deltaMs);
    this.sprite.angle += 0.18 * deltaMs;
    const deltaSeconds = deltaMs / 1000;

    if (this.magnetDelay <= 0) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));

      if (distance <= 240) {
        const pull = Phaser.Math.Linear(560, 1900, 1 - distance / 240);
        this.velocity.x += (dx / distance) * pull * deltaSeconds;
        this.velocity.y += (dy / distance) * pull * deltaSeconds;
      } else {
        this.velocity.scale(0.94);
      }
    } else {
      this.velocity.scale(0.972);
    }

    this.velocity.limit(280);
    const nextX = Phaser.Math.Clamp(this.x + this.velocity.x * deltaSeconds, ARENA.x + 8, ARENA.x + ARENA.width - 8);
    const nextY = Phaser.Math.Clamp(this.y + this.velocity.y * deltaSeconds, ARENA.y + 8, ARENA.y + ARENA.height - 8);

    if (nextX <= ARENA.x + 8 || nextX >= ARENA.x + ARENA.width - 8) {
      this.velocity.x *= -0.42;
    }

    if (nextY <= ARENA.y + 8 || nextY >= ARENA.y + ARENA.height - 8) {
      this.velocity.y *= -0.42;
    }

    this.sprite.setPosition(nextX, nextY);
    this.shadow.setPosition(nextX, nextY + 10);
  }

  tryCollect(targetX: number, targetY: number, radius: number): { materialId: MaterialId; value: number } | null {
    if (this.collected) {
      return null;
    }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);

    if (distance > radius) {
      return null;
    }

    this.collected = true;
    this.shadow.destroy();
    this.sprite.destroy();
    return {
      materialId: this.materialId,
      value: this.value
    };
  }
}
