import React, { useRef, useState, useMemo } from "react";
import type { World } from "../engine/types";
import {
  createComponentRegistry,
  serializeWorld,
  deserializeWorld,
  snapshotToJSON,
  snapshotFromJSON,
  type ComponentRegistry,
} from "../engine/serialization";
import { Position, Velocity, TldrawShape } from "../components";
import { useTheme } from "./theme";

interface SaveLoadPanelProps {
  world: World;
  onWorldLoaded?: (world: World) => void;
}

export function SaveLoadPanel({ world, onWorldLoaded }: SaveLoadPanelProps) {
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Create component registry with all known components
  const componentRegistry: ComponentRegistry = useMemo(() => {
    const registry = createComponentRegistry();
    registry.register(Position);
    registry.register(Velocity);
    registry.register(TldrawShape);
    return registry;
  }, []);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSave = () => {
    try {
      const snapshot = serializeWorld(world, componentRegistry);
      const json = snapshotToJSON(snapshot);

      // Create and trigger download
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `world-save-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastSaveTime(new Date());
      showFeedback("success", "World saved successfully");
    } catch (err) {
      console.error("Save failed:", err);
      showFeedback("error", `Save failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const snapshot = snapshotFromJSON(json);
        const newWorld = deserializeWorld(snapshot, { componentRegistry });

        if (onWorldLoaded) {
          onWorldLoaded(newWorld);
        }

        showFeedback("success", `Loaded ${snapshot.entities.length} entities`);
      } catch (err) {
        console.error("Load failed:", err);
        showFeedback("error", `Load failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    };

    reader.onerror = () => {
      showFeedback("error", "Failed to read file");
    };

    reader.readAsText(file);

    // Reset input so the same file can be loaded again
    event.target.value = "";
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const buttonStyle: React.CSSProperties = {
    flex: 1,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    border: "none",
    borderRadius: 6,
    background: theme.panelContrast,
    color: theme.text0,
    cursor: "pointer",
    transition: "background 0.1s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={handleSave}
          style={buttonStyle}
          onMouseOver={(e) => (e.currentTarget.style.background = theme.hoverBg)}
          onMouseOut={(e) => (e.currentTarget.style.background = theme.panelContrast)}
        >
          Save
        </button>

        <button
          onClick={handleLoadClick}
          style={buttonStyle}
          onMouseOver={(e) => (e.currentTarget.style.background = theme.hoverBg)}
          onMouseOut={(e) => (e.currentTarget.style.background = theme.panelContrast)}
        >
          Load
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {lastSaveTime && (
        <div style={{ fontSize: 11, color: theme.text3 }}>
          Last saved: {formatTime(lastSaveTime)}
        </div>
      )}

      {feedback && (
        <div
          style={{
            fontSize: 12,
            padding: "8px 10px",
            borderRadius: 6,
            background: feedback.type === "success" ? theme.success : theme.danger,
            color: theme.selectedContrast,
          }}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}

export default SaveLoadPanel;
