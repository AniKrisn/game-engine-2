import { defineComponent } from "../engine/types";

// Position in 2D space
export const Position = defineComponent("Position", () => ({
  x: 0,
  y: 0,
}));

export type PositionData = ReturnType<typeof Position.default>;

// Velocity for movement
export const Velocity = defineComponent("Velocity", () => ({
  x: 0,
  y: 0,
}));

export type VelocityData = ReturnType<typeof Velocity.default>;

// Visual appearance
export const Appearance = defineComponent("Appearance", () => ({
  color: "#3b82f6",
  radius: 20,
}));

export type AppearanceData = ReturnType<typeof Appearance.default>;

// Links an entity to a tldraw shape
export const TldrawShape = defineComponent("TldrawShape", () => ({
  shapeId: "" as string,
}));

export type TldrawShapeData = ReturnType<typeof TldrawShape.default>;
