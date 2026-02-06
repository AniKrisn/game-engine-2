import type { Editor, TLShapeId, TLShape } from "tldraw";
import { createShapeId } from "tldraw";
import type { System, World, EntityId } from "../engine/types";
import { defineResource } from "../engine/types";
import { Position, Velocity, TldrawShape, Appearance, TLDRAW_COLORS } from "../components";
import { PhysicsConfig } from "../engine/physics-config";

// Resource to hold the tldraw editor reference
export const TldrawEditor = defineResource<Editor | null>("TldrawEditor", () => null);

// Track which entities need shapes created
const pendingShapes = new Set<EntityId>();

// Simple counter for color assignment
let colorIndex = 0;

// Track entities being dragged (for physics to skip)
const draggingEntities = new Set<EntityId>();

// Store original velocities to restore after drag
const savedVelocities = new Map<EntityId, { x: number; y: number }>();

// Map from shapeId to entityId for fast lookups
const shapeToEntity = new Map<string, EntityId>();

// Track previous drag state to detect transitions
let wasDragging = false;

// ID for the bounds visualization shape
let boundsShapeId: TLShapeId | null = null;

// Previous bounds to detect changes
let prevBounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;

// System that syncs entity positions to tldraw shapes
export const TldrawBridgeSystem: System = {
  name: "TldrawBridge",
  query: [Position, TldrawShape],

  run(world, _dt) {
    const editor = world.getResource(TldrawEditor);
    if (!editor) return;

    // Update bounds visualization
    updateBoundsShape(editor, world);

    // Check if user is currently dragging shapes
    const isUserDragging = editor.isIn("select.translating");

    // Handle drag state transitions
    if (isUserDragging && !wasDragging) {
      onDragStart(editor, world);
    } else if (!isUserDragging && wasDragging) {
      onDragEnd(world);
    }
    wasDragging = isUserDragging;

    // If user is dragging, sync shape positions TO entities (reverse direction)
    if (isUserDragging) {
      syncDraggedShapesToEntities(editor, world);
    }

    // Get selected shapes to skip during normal sync
    const selectedShapeIds = new Set(
      isUserDragging ? editor.getSelectedShapeIds() : []
    );

    const entities = world.query(Position, TldrawShape);

    for (const entity of entities) {
      const pos = world.get(entity, Position)!;
      const shapeLink = world.get(entity, TldrawShape)!;

      if (!shapeLink.shapeId) {
        pendingShapes.add(entity);
        continue;
      }

      // Keep the shape→entity map updated
      shapeToEntity.set(shapeLink.shapeId, entity);

      const shapeId = shapeLink.shapeId as TLShapeId;

      // Don't update shapes that are currently being dragged
      if (selectedShapeIds.has(shapeId)) {
        continue;
      }

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

function onDragStart(editor: Editor, world: World) {
  // Get all selected shapes and save their velocities
  const selectedIds = editor.getSelectedShapeIds();

  for (const shapeId of selectedIds) {
    const entity = shapeToEntity.get(shapeId as string);
    if (entity && world.exists(entity)) {
      draggingEntities.add(entity);
      // Save velocity to restore after drag
      if (world.has(entity, Velocity)) {
        const vel = world.get(entity, Velocity)!;
        savedVelocities.set(entity, { x: vel.x, y: vel.y });
      }
    }
  }
}

function onDragEnd(world: World) {
  // Restore saved velocities and clear dragging state
  for (const entity of draggingEntities) {
    const savedVel = savedVelocities.get(entity);
    if (savedVel && world.exists(entity) && world.has(entity, Velocity)) {
      world.set(entity, Velocity, savedVel);
    }
  }
  draggingEntities.clear();
  savedVelocities.clear();
}

function syncDraggedShapesToEntities(editor: Editor, world: World) {
  // Sync selected shapes' positions back to their entities
  const selectedIds = editor.getSelectedShapeIds();

  for (const shapeId of selectedIds) {
    const shape = editor.getShape(shapeId as TLShapeId) as TLShape | undefined;
    if (!shape) continue;

    const entity = shapeToEntity.get(shapeId as string);
    if (entity && world.exists(entity)) {
      world.set(entity, Position, { x: shape.x, y: shape.y });
    }
  }
}

// Check if an entity is currently being dragged
export function isEntityDragging(entity: EntityId): boolean {
  return draggingEntities.has(entity);
}

// Update the bounds visualization shape
function updateBoundsShape(editor: Editor, world: World) {
  const config = world.getResource(PhysicsConfig);
  const bounds = config.bounds;

  // Check if bounds changed
  const boundsChanged =
    !prevBounds ||
    prevBounds.minX !== bounds.minX ||
    prevBounds.maxX !== bounds.maxX ||
    prevBounds.minY !== bounds.minY ||
    prevBounds.maxY !== bounds.maxY;

  if (!boundsChanged && boundsShapeId && editor.getShape(boundsShapeId)) {
    return; // No change needed
  }

  prevBounds = { ...bounds };

  const x = bounds.minX;
  const y = bounds.minY;
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;

  if (boundsShapeId && editor.getShape(boundsShapeId)) {
    // Update existing shape
    editor.updateShape({
      id: boundsShapeId,
      type: "geo",
      x,
      y,
      props: {
        w,
        h,
      },
    });
  } else {
    // Create new shape
    boundsShapeId = createShapeId();
    editor.createShape({
      id: boundsShapeId,
      type: "geo",
      x,
      y,
      isLocked: true,
      props: {
        geo: "rectangle",
        w,
        h,
        fill: "none",
        dash: "dashed",
        color: "grey",
      },
    });
    // Send to back so entities render on top
    editor.sendToBack([boundsShapeId]);
  }
}

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

    // Get or create Appearance component
    let appearance = world.get(entity, Appearance);
    if (!appearance) {
      // Auto-attach Appearance with cycling color
      const color = TLDRAW_COLORS[colorIndex % TLDRAW_COLORS.length];
      colorIndex++;
      world.attach(entity, Appearance, { color, size: 40 });
      appearance = world.get(entity, Appearance)!;
    }

    const shapeId = createShapeId();
    const size = appearance.size;

    editor.createShape({
      id: shapeId,
      type: "geo",
      x: pos.x,
      y: pos.y,
      props: {
        geo: "ellipse",
        w: size,
        h: size,
        fill: "solid",
        color: appearance.color,
      },
    });

    const shapeIdStr = shapeId as string;
    world.set(entity, TldrawShape, { shapeId: shapeIdStr });
    shapeToEntity.set(shapeIdStr, entity);
    pendingShapes.delete(entity);
  }
}

// Sync appearance changes to tldraw shapes
export function syncAppearanceToShapes(world: World) {
  const editor = world.getResource(TldrawEditor);
  if (!editor) return;

  const entities = world.query(TldrawShape, Appearance);

  for (const entity of entities) {
    const shapeLink = world.get(entity, TldrawShape)!;
    const appearance = world.get(entity, Appearance)!;

    if (!shapeLink.shapeId) continue;

    const shapeId = shapeLink.shapeId as TLShapeId;
    const shape = editor.getShape(shapeId);

    if (!shape || shape.type !== "geo") continue;

    // Check if appearance differs from shape
    const props = shape.props as { w?: number; h?: number; color?: string };
    if (props.w !== appearance.size || props.h !== appearance.size || props.color !== appearance.color) {
      editor.updateShape({
        id: shapeId,
        type: "geo",
        props: {
          w: appearance.size,
          h: appearance.size,
          color: appearance.color,
        },
      });
    }
  }
}
