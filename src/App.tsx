import { useEffect, useState } from "react";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";

import type { World } from "./engine";
import { createWorld } from "./engine";
import { Position, Velocity, TldrawShape } from "./components";
import { PhysicsSystem, BounceSystem } from "./systems/physics";
import { PhysicsConfig } from "./engine/physics-config";
import {
  TldrawBridgeSystem,
  TldrawEditor,
  createShapesForEntities,
  syncAppearanceToShapes,
} from "./systems/tldraw-bridge";
import { SaveLoadPanel, InputPanel, EntityInspector, EntityDetailPanel, PhysicsPanel } from "./ui";
import { ThemeProvider, useTheme } from "./ui/theme";

function App() {
  const [world, setWorld] = useState<World | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [running, setRunning] = useState(true);

  // Initialize world once
  useEffect(() => {
    const newWorld = createWorld();

    // Register systems in order
    newWorld.addSystem(PhysicsSystem);
    newWorld.addSystem(BounceSystem);
    newWorld.addSystem(TldrawBridgeSystem);

    setWorld(newWorld);
  }, []);

  // Connect editor to world
  useEffect(() => {
    if (!editor || !world) return;

    world.setResource(TldrawEditor, editor);

    // Create initial entities after editor is ready
    createInitialEntities(world);

    // Create shapes for initial entities and zoom to fit bounds
    setTimeout(() => {
      createShapesForEntities(world);
      // Zoom to fit the physics bounds with padding
      const config = world.getResource(PhysicsConfig);
      const padding = 100;
      const bounds = {
        x: config.bounds.minX - padding,
        y: config.bounds.minY - padding,
        w: config.bounds.maxX - config.bounds.minX + padding * 2,
        h: config.bounds.maxY - config.bounds.minY + padding * 2,
      };
      editor.zoomToBounds(bounds);
    }, 100);
  }, [editor, world]);

  // Game loop
  useEffect(() => {
    if (!world || !running) return;

    let lastTime = performance.now();
    let frameId: number;

    const loop = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000; // Convert to seconds
      lastTime = now;

      world.tick(dt);
      createShapesForEntities(world);
      syncAppearanceToShapes(world);

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameId);
  }, [running, world]);

  const spawnEntity = () => {
    if (!world) return;

    const entity = world.spawn();

    world.attach(entity, Position, {
      x: 200 + Math.random() * 400,
      y: 200 + Math.random() * 200,
    });

    world.attach(entity, Velocity, {
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
    });

    world.attach(entity, TldrawShape);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }}>
      <ThemeProvider editor={editor}>
        <Sidebar
          world={world}
          editor={editor}
          running={running}
          onSpawn={spawnEntity}
          onToggleRunning={() => setRunning(!running)}
        />
      </ThemeProvider>

      {/* Canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        <Tldraw
          onMount={setEditor}
          components={{
            DebugPanel: null,
            DebugMenu: null,
          }}
        />
        {/* Floating detail panel */}
        <ThemeProvider editor={editor}>
          {world && <EntityDetailPanel world={world} editor={editor} />}
        </ThemeProvider>
      </div>
    </div>
  );
}

interface SidebarProps {
  world: World | null;
  editor: Editor | null;
  running: boolean;
  onSpawn: () => void;
  onToggleRunning: () => void;
}

function Sidebar({ world, editor, running, onSpawn, onToggleRunning }: SidebarProps) {
  const { theme, isDark } = useTheme();

  const compactButtonStyle: React.CSSProperties = {
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
    <div
      className={isDark ? "tl-theme__dark" : ""}
      style={{
        width: 220,
        borderRight: `1px solid ${theme.divider}`,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        display: "flex",
        flexDirection: "column",
        background: theme.panel,
        overflow: "hidden",
      }}
    >
      {/* Compact controls */}
      <div style={{ padding: 12, borderBottom: `1px solid ${theme.divider}` }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={onSpawn}
            style={compactButtonStyle}
            onMouseOver={(e) => (e.currentTarget.style.background = theme.hoverBg)}
            onMouseOut={(e) => (e.currentTarget.style.background = theme.panelContrast)}
          >
            Spawn
          </button>
          <button
            onClick={onToggleRunning}
            style={{
              ...compactButtonStyle,
              background: running ? theme.panelContrast : theme.selected,
              color: running ? theme.text0 : theme.selectedContrast,
            }}
            onMouseOver={(e) => {
              if (running) e.currentTarget.style.background = theme.hoverBg;
            }}
            onMouseOut={(e) => {
              if (running) e.currentTarget.style.background = theme.panelContrast;
            }}
          >
            {running ? "Pause" : "Play"}
          </button>
        </div>
      </div>

      {/* Scrollable panels */}
      <div
        className="hide-scrollbar"
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
        {world && (
          <>
            <div style={{ padding: 16 }}>
              <PhysicsPanel world={world} editor={editor} />
            </div>
            <div style={{ height: 1, background: theme.divider }} />
            <div style={{ padding: 16 }}>
              <EntityInspector world={world} editor={editor} />
            </div>
            <div style={{ height: 1, background: theme.divider }} />
            <div style={{ padding: 16 }}>
              <InputPanel world={world} />
            </div>
          </>
        )}
      </div>

      {/* Footer with Save/Load */}
      {world && (
        <div style={{ padding: 12, borderTop: `1px solid ${theme.divider}` }}>
          <SaveLoadPanel world={world} />
        </div>
      )}
    </div>
  );
}

function createInitialEntities(world: World) {
  for (let i = 0; i < 5; i++) {
    const entity = world.spawn();

    world.attach(entity, Position, {
      x: 200 + i * 80,
      y: 250 + (i % 2) * 50,
    });

    world.attach(entity, Velocity, {
      x: (Math.random() - 0.5) * 150,
      y: (Math.random() - 0.5) * 150,
    });

    world.attach(entity, TldrawShape);
  }
}

export default App;
