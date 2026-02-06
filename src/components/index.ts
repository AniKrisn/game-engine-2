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

// tldraw's color palette
export type TldrawColor =
  | "black" | "grey" | "light-violet" | "violet" | "blue" | "light-blue"
  | "yellow" | "orange" | "green" | "light-green" | "light-red" | "red" | "white";

export const TLDRAW_COLORS: TldrawColor[] = [
  "blue", "red", "green", "orange", "violet", "light-blue", "light-green", "light-red", "yellow", "black", "grey"
];

// Visual appearance
export const Appearance = defineComponent("Appearance", () => ({
  color: "blue" as TldrawColor,
  size: 40,
}));

export type AppearanceData = ReturnType<typeof Appearance.default>;

// Links an entity to a tldraw shape
export const TldrawShape = defineComponent("TldrawShape", () => ({
  shapeId: "" as string,
}));

export type TldrawShapeData = ReturnType<typeof TldrawShape.default>;
