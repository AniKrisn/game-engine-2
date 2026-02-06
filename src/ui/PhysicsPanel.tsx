import { useEffect, useState, useCallback } from "react";
import type { Editor } from "tldraw";
import type { World } from "../engine/types";
import type { PhysicsConfigData } from "../engine/physics-config";
import { PhysicsConfig } from "../engine/physics-config";
import { useTheme } from "./theme";
import { Slider } from "./Slider";
import { Toggle } from "./Toggle";

interface PhysicsPanelProps {
  world: World;
  editor: Editor | null;
}

export function PhysicsPanel({ world, editor }: PhysicsPanelProps) {
  const { theme } = useTheme();
  const [config, setConfig] = useState<PhysicsConfigData>(() =>
    world.getResource(PhysicsConfig)
  );

  // Sync local state with world resource periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setConfig({ ...world.getResource(PhysicsConfig) });
    }, 100);
    return () => clearInterval(interval);
  }, [world]);

  // Update config in world and local state
  const updateConfig = useCallback(
    (updates: Partial<PhysicsConfigData>) => {
      const currentConfig = world.getResource(PhysicsConfig);
      const newConfig = { ...currentConfig, ...updates };
      world.setResource(PhysicsConfig, newConfig);
      setConfig(newConfig);
    },
    [world]
  );

  // Update bounds and optionally zoom to fit
  const updateBounds = useCallback(
    (key: keyof PhysicsConfigData["bounds"], value: number) => {
      const currentConfig = world.getResource(PhysicsConfig);
      const newConfig = {
        ...currentConfig,
        bounds: { ...currentConfig.bounds, [key]: value },
      };
      world.setResource(PhysicsConfig, newConfig);
      setConfig(newConfig);
    },
    [world]
  );

  const zoomToFitBounds = useCallback(() => {
    if (!editor) return;
    const padding = 100;
    const bounds = {
      x: config.bounds.minX - padding,
      y: config.bounds.minY - padding,
      w: config.bounds.maxX - config.bounds.minX + padding * 2,
      h: config.bounds.maxY - config.bounds.minY + padding * 2,
    };
    editor.zoomToBounds(bounds);
  }, [editor, config.bounds]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    border: "none",
    borderRadius: 6,
    fontSize: 12,
    background: theme.panelContrast,
    color: theme.text,
    boxShadow: `inset 0 0 0 1px ${theme.divider}`,
  };

  return (
    <div style={{ fontSize: 13 }}>
      {/* Toggles */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 16 }}>
        <Toggle
          label="Physics"
          checked={config.physicsEnabled}
          onChange={(checked) => updateConfig({ physicsEnabled: checked })}
        />
        <Toggle
          label="Bounce"
          checked={config.bounceEnabled}
          onChange={(checked) => updateConfig({ bounceEnabled: checked })}
        />
      </div>

      <div style={{ height: 1, background: theme.divider, margin: "0 -16px 16px" }} />

      {/* Speed Multiplier */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: theme.text3 }}>Speed</span>
          <span style={{ fontSize: 12, fontFamily: "monospace", color: theme.text1 }}>
            {config.speedMultiplier.toFixed(2)}x
          </span>
        </div>
        <Slider
          value={config.speedMultiplier}
          min={0}
          max={3}
          step={0.1}
          onChange={(value) => updateConfig({ speedMultiplier: value })}
          label="Speed multiplier"
        />
      </div>

      {/* Gravity */}
      <div style={{ paddingBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: theme.text3 }}>Gravity</span>
          <span style={{ fontSize: 12, fontFamily: "monospace", color: theme.text1 }}>
            {config.gravity.toFixed(0)} px/s
          </span>
        </div>
        <Slider
          value={config.gravity}
          min={-500}
          max={500}
          step={10}
          onChange={(value) => updateConfig({ gravity: value })}
          label="Gravity"
        />
      </div>

      <div style={{ height: 1, background: theme.divider, margin: "0 -16px 16px" }} />

      {/* Bounds */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: theme.text3 }}>Bounce Bounds</span>
          <button
            onClick={zoomToFitBounds}
            style={{
              padding: "4px 8px",
              fontSize: 11,
              border: "none",
              borderRadius: 4,
              background: theme.panelContrast,
              color: theme.text3,
              cursor: "pointer",
              boxShadow: `inset 0 0 0 1px ${theme.divider}`,
            }}
          >
            Zoom to fit
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: theme.text3, minWidth: 28 }}>minX</span>
            <input
              type="number"
              value={config.bounds.minX}
              onChange={(e) => updateBounds("minX", parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: theme.text3, minWidth: 28 }}>maxX</span>
            <input
              type="number"
              value={config.bounds.maxX}
              onChange={(e) => updateBounds("maxX", parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: theme.text3, minWidth: 28 }}>minY</span>
            <input
              type="number"
              value={config.bounds.minY}
              onChange={(e) => updateBounds("minY", parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: theme.text3, minWidth: 28 }}>maxY</span>
            <input
              type="number"
              value={config.bounds.maxY}
              onChange={(e) => updateBounds("maxY", parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhysicsPanel;
