import type { System } from "../engine/types";
import { Position, Velocity, Appearance } from "../components";
import { PhysicsConfig } from "../engine/physics-config";
import { isEntityDragging } from "./tldraw-bridge";

// Default entity size if no Appearance component
const DEFAULT_ENTITY_SIZE = 40;

// Physics system: applies velocity to position
export const PhysicsSystem: System = {
  name: "Physics",
  query: [Position, Velocity],

  run(world, dt) {
    const config = world.getResource(PhysicsConfig);

    // Skip if physics is disabled
    if (!config.physicsEnabled) return;

    // Apply speed multiplier to delta time
    const adjustedDt = dt * config.speedMultiplier;

    const entities = world.query(Position, Velocity);

    for (const entity of entities) {
      // Skip entities being dragged by user
      if (isEntityDragging(entity)) continue;

      const pos = world.get(entity, Position)!;
      const vel = world.get(entity, Velocity)!;

      // Apply gravity to velocity
      const newVelY = vel.y + config.gravity * adjustedDt;
      if (newVelY !== vel.y) {
        world.set(entity, Velocity, { x: vel.x, y: newVelY });
      }

      // Simple Euler integration
      world.set(entity, Position, {
        x: pos.x + vel.x * adjustedDt,
        y: pos.y + newVelY * adjustedDt,
      });
    }
  },
};

// Bounce system: reverses velocity at boundaries and clamps position
export const BounceSystem: System = {
  name: "Bounce",
  query: [Position, Velocity],

  run(world, _dt) {
    const config = world.getResource(PhysicsConfig);

    // Skip if bounce is disabled
    if (!config.bounceEnabled) return;

    const entities = world.query(Position, Velocity);
    const bounds = config.bounds;

    for (const entity of entities) {
      // Skip entities being dragged
      if (isEntityDragging(entity)) continue;

      const pos = world.get(entity, Position)!;
      const vel = world.get(entity, Velocity)!;

      // Get entity size from Appearance or use default
      const appearance = world.get(entity, Appearance);
      const entitySize = appearance?.size ?? DEFAULT_ENTITY_SIZE;

      // Effective bounds accounting for entity size
      const effectiveMaxX = bounds.maxX - entitySize;
      const effectiveMaxY = bounds.maxY - entitySize;

      let newPosX = pos.x;
      let newPosY = pos.y;
      let newVelX = vel.x;
      let newVelY = vel.y;

      // Clamp X and bounce if needed
      if (pos.x < bounds.minX) {
        newPosX = bounds.minX;
        if (vel.x < 0) newVelX = Math.abs(vel.x);
      } else if (pos.x > effectiveMaxX) {
        newPosX = effectiveMaxX;
        if (vel.x > 0) newVelX = -Math.abs(vel.x);
      }

      // Clamp Y and bounce if needed
      if (pos.y < bounds.minY) {
        newPosY = bounds.minY;
        if (vel.y < 0) newVelY = Math.abs(vel.y);
      } else if (pos.y > effectiveMaxY) {
        newPosY = effectiveMaxY;
        if (vel.y > 0) newVelY = -Math.abs(vel.y);
      }

      // Update position if clamped
      if (newPosX !== pos.x || newPosY !== pos.y) {
        world.set(entity, Position, { x: newPosX, y: newPosY });
      }

      // Update velocity if bounced
      if (newVelX !== vel.x || newVelY !== vel.y) {
        world.set(entity, Velocity, { x: newVelX, y: newVelY });
      }
    }
  },
};
