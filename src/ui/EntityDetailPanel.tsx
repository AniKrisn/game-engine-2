import { useEffect, useState, useCallback } from "react";
import type { Editor } from "tldraw";
import type { World, EntityId } from "../engine/types";
import { Position, Velocity, TldrawShape, Appearance } from "../components";
import type { TldrawColor } from "../components";
import { useTheme } from "./theme";
import { Slider } from "./Slider";

// tldraw color order (matches style panel)
const STYLE_PANEL_COLORS: TldrawColor[] = [
  "black", "grey", "light-violet", "violet",
  "blue", "light-blue", "yellow", "orange",
  "green", "light-green", "light-red", "red",
];

// tldraw color hex values
const COLOR_HEX: Record<TldrawColor, string> = {
  "black": "#1d1d1d",
  "grey": "#9ea0a2",
  "light-violet": "#c3a4f7",
  "violet": "#ae63e4",
  "blue": "#4263eb",
  "light-blue": "#4ba1f1",
  "yellow": "#f5bc2e",
  "orange": "#f38336",
  "green": "#099268",
  "light-green": "#40c057",
  "light-red": "#ff6b6b",
  "red": "#e03131",
  "white": "#ffffff",
};

interface EntityDetailPanelProps {
  world: World;
  editor: Editor | null;
}

interface ComponentData {
  Position?: { x: number; y: number };
  Velocity?: { x: number; y: number };
  Appearance?: { color: TldrawColor; size: number };
}

export function EntityDetailPanel({ world, editor }: EntityDetailPanelProps) {
  const { theme, isDark } = useTheme();
  const [selectedEntity, setSelectedEntity] = useState<EntityId | null>(null);
  const [componentData, setComponentData] = useState<ComponentData>({});

  // Find entity by shapeId
  const findEntityByShapeId = useCallback(
    (shapeId: string): EntityId | null => {
      const entities = world.query(TldrawShape);
      for (const entity of entities) {
        const shape = world.get(entity, TldrawShape);
        if (shape && shape.shapeId === shapeId) {
          return entity;
        }
      }
      return null;
    },
    [world]
  );

  // Load component data for selected entity
  const loadComponentData = useCallback(
    (entity: EntityId) => {
      const data: ComponentData = {};
      if (world.has(entity, Position)) {
        data.Position = world.get(entity, Position);
      }
      if (world.has(entity, Velocity)) {
        data.Velocity = world.get(entity, Velocity);
      }
      if (world.has(entity, Appearance)) {
        data.Appearance = world.get(entity, Appearance);
      }
      setComponentData(data);
    },
    [world]
  );

  // Handle selection changes from tldraw
  useEffect(() => {
    if (!editor) return;

    const handleSelectionChange = () => {
      const selectedIds = editor.getSelectedShapeIds();
      if (selectedIds.length === 1) {
        const shapeId = selectedIds[0] as string;
        const entity = findEntityByShapeId(shapeId);
        if (entity) {
          setSelectedEntity(entity);
          loadComponentData(entity);
          return;
        }
      }
      setSelectedEntity(null);
      setComponentData({});
    };

    const cleanup = editor.store.listen(handleSelectionChange, {
      source: "user",
      scope: "document",
    });
    handleSelectionChange();
    return cleanup;
  }, [editor, findEntityByShapeId, loadComponentData]);

  // Periodically refresh component data
  useEffect(() => {
    if (!selectedEntity) return;
    const interval = setInterval(() => {
      if (world.exists(selectedEntity)) {
        loadComponentData(selectedEntity);
      } else {
        setSelectedEntity(null);
        setComponentData({});
      }
    }, 100);
    return () => clearInterval(interval);
  }, [selectedEntity, world, loadComponentData]);

  // Update a numeric field
  const updateField = (
    componentName: "Position" | "Velocity",
    field: "x" | "y",
    value: string
  ) => {
    if (!selectedEntity) return;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    const component = componentName === "Position" ? Position : Velocity;
    const currentData = world.get(selectedEntity, component);
    if (currentData) {
      world.set(selectedEntity, component, { ...currentData, [field]: numValue });
    }
  };

  // Reset velocity
  const resetVelocity = () => {
    if (!selectedEntity) return;
    world.set(selectedEntity, Velocity, { x: 0, y: 0 });
  };

  // Update appearance
  const updateAppearance = (updates: Partial<{ color: TldrawColor; size: number }>) => {
    if (!selectedEntity) return;
    const current = world.get(selectedEntity, Appearance);
    if (current) {
      world.set(selectedEntity, Appearance, { ...current, ...updates });
    }
  };

  // Delete entity
  const deleteEntity = () => {
    if (!selectedEntity || !editor) return;
    // Get the shape ID before despawning
    const shapeLink = world.get(selectedEntity, TldrawShape);
    if (shapeLink?.shapeId) {
      editor.deleteShape(shapeLink.shapeId as import("tldraw").TLShapeId);
    }
    world.despawn(selectedEntity);
    setSelectedEntity(null);
    setComponentData({});
  };

  if (!selectedEntity) return null;

  const inputStyle: React.CSSProperties = {
    width: 48,
    padding: "4px 6px",
    border: "none",
    borderRadius: 4,
    fontSize: 11,
    background: theme.panelContrast,
    color: theme.text,
    boxShadow: `inset 0 0 0 1px ${theme.divider}`,
  };

  return (
    <div
      className={isDark ? "tl-theme__dark" : ""}
      style={{
        position: "absolute",
        top: 300,
        left: 8,
        width: 148,
        background: theme.panel,
        borderRadius: 8,
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontSize: 11,
        boxShadow: "0 2px 8px rgba(0,0,0,0.16)",
        zIndex: 100,
      }}
    >
      {/* Position */}
      {componentData.Position && (
        <div>
          <div style={{ color: theme.text3, marginBottom: 6, fontSize: 11 }}>Position</div>
          <div style={{ display: "flex", gap: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 3, color: theme.text0 }}>
              x
              <input
                type="number"
                value={componentData.Position.x.toFixed(0)}
                onChange={(e) => updateField("Position", "x", e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 3, color: theme.text0 }}>
              y
              <input
                type="number"
                value={componentData.Position.y.toFixed(0)}
                onChange={(e) => updateField("Position", "y", e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
        </div>
      )}

      {/* Velocity */}
      {componentData.Velocity && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ color: theme.text3, fontSize: 11 }}>Velocity</span>
            <button
              onClick={resetVelocity}
              style={{
                padding: "2px 6px",
                fontSize: 9,
                border: "none",
                borderRadius: 3,
                background: theme.panelContrast,
                color: theme.text3,
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 3, color: theme.text0 }}>
              x
              <input
                type="number"
                value={componentData.Velocity.x.toFixed(0)}
                onChange={(e) => updateField("Velocity", "x", e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 3, color: theme.text0 }}>
              y
              <input
                type="number"
                value={componentData.Velocity.y.toFixed(0)}
                onChange={(e) => updateField("Velocity", "y", e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
        </div>
      )}

      {/* Appearance */}
      {componentData.Appearance && (
        <div>
          {/* Size */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: theme.text3 }}>Size</span>
              <span style={{ fontFamily: "monospace", color: theme.text1 }}>
                {componentData.Appearance.size}
              </span>
            </div>
            <Slider
              value={componentData.Appearance.size}
              min={10}
              max={100}
              step={5}
              onChange={(value) => updateAppearance({ size: value })}
              label="Size"
            />
          </div>

          {/* Color */}
          <div style={{ color: theme.text3, marginBottom: 6, fontSize: 11 }}>Color</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0,
            }}
          >
            {STYLE_PANEL_COLORS.map((color) => {
              const isActive = componentData.Appearance?.color === color;
              return (
                <button
                  key={color}
                  onClick={() => updateAppearance({ color })}
                  title={color}
                  style={{
                    height: 32,
                    padding: 0,
                    border: "none",
                    background: isActive ? theme.muted : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 4,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: COLOR_HEX[color],
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete button */}
      <button
        onClick={deleteEntity}
        style={{
          marginTop: 8,
          padding: "6px 0",
          fontSize: 11,
          border: "none",
          borderRadius: 6,
          background: theme.panelContrast,
          color: theme.text3,
          cursor: "pointer",
          width: "100%",
        }}
      >
        Delete
      </button>
    </div>
  );
}

export default EntityDetailPanel;
