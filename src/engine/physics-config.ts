import { defineResource } from "./types";

export interface PhysicsConfigData {
  /** Multiplier for delta time passed to physics systems (1.0 = normal speed) */
  speedMultiplier: number;
  /** Gravity applied to velocity each frame (pixels/second) */
  gravity: number;
  /** Bounce boundaries */
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  /** Whether the physics system is enabled */
  physicsEnabled: boolean;
  /** Whether the bounce system is enabled */
  bounceEnabled: boolean;
}

export const PhysicsConfig = defineResource<PhysicsConfigData>(
  "PhysicsConfig",
  () => ({
    speedMultiplier: 1.0,
    gravity: 0,
    bounds: {
      minX: 100,
      maxX: 700,
      minY: 100,
      maxY: 500,
    },
    physicsEnabled: true,
    bounceEnabled: true,
  })
);
