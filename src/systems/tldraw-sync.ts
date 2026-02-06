import type { Editor, TLShapeId } from "tldraw";
import { createShapeId } from "tldraw";
import type { System, World, EntityId } from "../engine/types";
import { defineResource } from "../engine/types";
import { Position, TldrawShape } from "../components";

// tldraw's color palette
type TldrawColor =
  | "black" | "grey" | "light-violet" | "violet" | "blue" | "light-blue"
  | "yellow" | "orange" | "green" | "light-green" | "light-red" | "red" | "white";

const TLDRAW_COLORS: TldrawColor[] = [
  "blue", "red", "green", "orange", "violet", "light-blue", "light-green", "light-red"
];

// Resource to hold the tldraw editor reference
export const TldrawEditor = defineResource<Editor | null>("TldrawEditor", () => null);

// Track which entities need shapes created
const pendingShapes = new Set<EntityId>();

// Simple counter for color assignment
let colorIndex = 0;

// System that syncs entity positions to tldraw shapes
export const TldrawSyncSystem: System = {
  name: "TldrawSync",
  query: [Position, TldrawShape],

  run(world, _dt) {
    const editor = world.getResource(TldrawEditor);
    if (!editor) return;

    const entities = world.query(Position, TldrawShape);

    for (const entity of entities) {
      const pos = world.get(entity, Position)!;
      const shapeLink = world.get(entity, TldrawShape)!;

      if (!shapeLink.shapeId) {
        // Need to create a shape for this entity
        pendingShapes.add(entity);
        continue;
      }

      const shapeId = shapeLink.shapeId as TLShapeId;
      const shape = editor.getShape(shapeId);

      if (shape && (shape.x !== pos.x || shape.y !== pos.y)) {
        editor.updateShape({
          id: shapeId,
          type: shape.type,
          x: pos.x,
          y: pos.y,
        });
      }
    }
  },
};

// Create tldraw shapes for entities that need them
export function createShapesForEntities(world: World) {
  const editor = world.getResource(TldrawEditor);
  if (!editor) return;

  for (const entity of pendingShapes) {
    if (!world.exists(entity)) {
      pendingShapes.delete(entity);
      continue;
    }

    const pos = world.get(entity, Position);
    if (!pos) continue;

    const shapeId = createShapeId();
    const color = TLDRAW_COLORS[colorIndex % TLDRAW_COLORS.length];
    colorIndex++;

    editor.createShape({
      id: shapeId,
      type: "geo",
      x: pos.x,
      y: pos.y,
      props: {
        geo: "ellipse",
        w: 40,
        h: 40,
        fill: "solid",
        color,
      },
    });

    world.set(entity, TldrawShape, { shapeId: shapeId as string });
    pendingShapes.delete(entity);
  }
}

// Sync tldraw shape movements back to entity positions (for user dragging)
export function syncShapeToEntity(
  world: World,
  shapeId: TLShapeId,
  x: number,
  y: number
) {
  const entities = world.query(Position, TldrawShape);

  for (const entity of entities) {
    const shapeLink = world.get(entity, TldrawShape)!;
    if (shapeLink.shapeId === (shapeId as string)) {
      world.set(entity, Position, { x, y });
      break;
    }
  }
}
