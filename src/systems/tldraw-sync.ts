import type { Editor, TLShapeId, HistoryEntry, TLRecord } from "tldraw";
import { createShapeId } from "tldraw";
import type { System, World, EntityId } from "../engine/types";
import { defineResource } from "../engine/types";
import { Position, Velocity, TldrawShape } from "../components";

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

// Flag to prevent feedback loop: true when we're updating shapes programmatically
let isSyncingToTldraw = false;

// System that syncs entity positions to tldraw shapes
export const TldrawSyncSystem: System = {
  name: "TldrawSync",
  query: [Position, TldrawShape],

  run(world, _dt) {
    const editor = world.getResource(TldrawEditor);
    if (!editor) return;

    const entities = world.query(Position, TldrawShape);

    // Set flag to prevent listener from processing our updates
    isSyncingToTldraw = true;

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

    isSyncingToTldraw = false;
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

// Track which entities are currently being dragged (to pause physics)
const draggingEntities = new Set<EntityId>();

// Sync tldraw shape movements back to entity positions (for user dragging)
export function syncShapeToEntity(
  world: World,
  shapeId: TLShapeId,
  x: number,
  y: number,
  pauseVelocity: boolean = true
) {
  const entities = world.query(Position, TldrawShape);

  for (const entity of entities) {
    const shapeLink = world.get(entity, TldrawShape)!;
    if (shapeLink.shapeId === (shapeId as string)) {
      const currentPos = world.get(entity, Position)!;

      // Skip if position already matches (prevents feedback loop)
      if (Math.abs(currentPos.x - x) < 0.01 && Math.abs(currentPos.y - y) < 0.01) {
        return;
      }

      world.set(entity, Position, { x, y });

      // Optionally pause velocity so physics doesn't fight the drag
      if (pauseVelocity && world.has(entity, Velocity)) {
        world.set(entity, Velocity, { x: 0, y: 0 });
        draggingEntities.add(entity);
      }
      break;
    }
  }
}

// Check if an entity is currently being dragged
export function isEntityDragging(entity: EntityId): boolean {
  return draggingEntities.has(entity);
}

// Clear dragging state for an entity
export function clearDraggingState(entity: EntityId): void {
  draggingEntities.delete(entity);
}

// Set up a listener for tldraw shape changes to enable bidirectional sync
export function setupShapeChangeListener(
  editor: Editor,
  world: World
): () => void {
  // Listen to store changes for shape updates
  // Only process when user is actively pointing (dragging)
  const unsubscribe = editor.store.listen(
    (entry: HistoryEntry<TLRecord>) => {
      // Skip if we're the ones updating shapes (prevent feedback loop)
      if (isSyncingToTldraw) return;

      // Only process if user is actively dragging (pointer is down)
      const isPointerDown = editor.inputs.isPointing;
      if (!isPointerDown) return;

      const { changes } = entry;

      // Process updated shapes (when user drags them)
      if (changes.updated) {
        for (const [_from, to] of Object.values(changes.updated)) {
          // Only handle shape records with x/y properties
          if (to.typeName === "shape" && "x" in to && "y" in to) {
            const shape = to as { id: TLShapeId; x: number; y: number };
            syncShapeToEntity(world, shape.id, shape.x, shape.y, true);
          }
        }
      }
    },
    { source: "user", scope: "document" }
  );

  return unsubscribe;
}
