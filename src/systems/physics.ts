import type { System } from "../engine/types";
import { Position, Velocity } from "../components";
import { isEntityDragging } from "./tldraw-bridge";

// Physics system: applies velocity to position
export const PhysicsSystem: System = {
  name: "Physics",
  query: [Position, Velocity],

  run(world, dt) {
    const entities = world.query(Position, Velocity);

    for (const entity of entities) {
      // Skip entities being dragged by user
      if (isEntityDragging(entity)) continue;

      const pos = world.get(entity, Position)!;
      const vel = world.get(entity, Velocity)!;

      // Simple Euler integration
      world.set(entity, Position, {
        x: pos.x + vel.x * dt,
        y: pos.y + vel.y * dt,
      });
    }
  },
};

// Bounce system: reverses velocity at boundaries
export const BounceSystem: System = {
  name: "Bounce",
  query: [Position, Velocity],

  run(world, _dt) {
    const entities = world.query(Position, Velocity);
    const bounds = { minX: 100, maxX: 700, minY: 100, maxY: 500 };

    for (const entity of entities) {
      const pos = world.get(entity, Position)!;
      const vel = world.get(entity, Velocity)!;

      let newVelX = vel.x;
      let newVelY = vel.y;

      if (pos.x < bounds.minX || pos.x > bounds.maxX) {
        newVelX = -vel.x;
      }
      if (pos.y < bounds.minY || pos.y > bounds.maxY) {
        newVelY = -vel.y;
      }

      if (newVelX !== vel.x || newVelY !== vel.y) {
        world.set(entity, Velocity, { x: newVelX, y: newVelY });
      }
    }
  },
};
