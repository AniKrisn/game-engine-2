import { useEffect, useState } from "react";
import type { World } from "../engine/types";
import {
  Input,
  setupInputListeners,
  cleanupInputListeners,
} from "../engine/input";
import { useTheme } from "./theme";

interface InputPanelProps {
  world: World;
}

interface InputSnapshot {
  keys: string[];
  mouse: { x: number; y: number };
  mouseButtons: number[];
}

const MOUSE_BUTTON_NAMES: Record<number, string> = {
  0: "Left",
  1: "Middle",
  2: "Right",
};

export function InputPanel({ world }: InputPanelProps) {
  const { theme } = useTheme();
  const [snapshot, setSnapshot] = useState<InputSnapshot>({
    keys: [],
    mouse: { x: 0, y: 0 },
    mouseButtons: [],
  });

  useEffect(() => {
    setupInputListeners(world);

    let frameId: number;
    const update = () => {
      const input = world.getResource(Input);
      setSnapshot({
        keys: Array.from(input.keys),
        mouse: { x: input.mouse.x, y: input.mouse.y },
        mouseButtons: Array.from(input.mouseButtons),
      });
      frameId = requestAnimationFrame(update);
    };

    frameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(frameId);
      cleanupInputListeners();
    };
  }, [world]);

  const tagStyle: React.CSSProperties = {
    padding: "3px 8px",
    background: theme.panelContrast,
    borderRadius: 4,
    color: theme.text0,
    fontFamily: "monospace",
    fontSize: 11,
    boxShadow: `inset 0 0 0 1px ${theme.divider}`,
  };

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontSize: 12, color: theme.text3, marginBottom: 10 }}>
        Input State
      </div>

      {/* Keys */}
      <div style={{ marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ color: theme.text3, minWidth: 50, flexShrink: 0 }}>Keys:</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {snapshot.keys.length === 0 ? (
            <span style={{ color: theme.text3, fontStyle: "italic" }}>None</span>
          ) : (
            snapshot.keys.map((key) => (
              <span key={key} style={tagStyle}>
                {key}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Mouse Position */}
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: theme.text3, minWidth: 50, flexShrink: 0 }}>Mouse:</span>
        <span style={{ color: theme.text0, fontFamily: "monospace" }}>
          ({snapshot.mouse.x}, {snapshot.mouse.y})
        </span>
      </div>

      {/* Mouse Buttons */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ color: theme.text3, minWidth: 50, flexShrink: 0 }}>Buttons:</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {snapshot.mouseButtons.length === 0 ? (
            <span style={{ color: theme.text3, fontStyle: "italic" }}>None</span>
          ) : (
            snapshot.mouseButtons.map((btn) => (
              <span key={btn} style={tagStyle}>
                {MOUSE_BUTTON_NAMES[btn] ?? `Button ${btn}`}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default InputPanel;
