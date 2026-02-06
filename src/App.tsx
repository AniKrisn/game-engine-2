import { useEffect, useRef, useState } from "react";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";

import type { World } from "./engine";
import { createWorld } from "./engine";
import { Position, Velocity, TldrawShape } from "./components";
import { PhysicsSystem, BounceSystem } from "./systems/physics";
import {
  TldrawSyncSystem,
  TldrawEditor,
  createShapesForEntities,
} from "./systems/tldraw-sync";

function App() {
  const worldRef = useRef<World | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [entityCount, setEntityCount] = useState(0);
  const [running, setRunning] = useState(true);

  // Initialize world once
  useEffect(() => {
    const world = createWorld();

    // Register systems in order
    world.addSystem(PhysicsSystem);
    world.addSystem(BounceSystem);
    world.addSystem(TldrawSyncSystem);

    worldRef.current = world;
  }, []);

  // Connect editor to world
  useEffect(() => {
    if (!editor || !worldRef.current) return;

    const world = worldRef.current;
    world.setResource(TldrawEditor, editor);

    // Create initial entities after editor is ready
    createInitialEntities(world);
    setEntityCount(world.query(Position).length);

    // Create shapes for initial entities
    setTimeout(() => createShapesForEntities(world), 100);
  }, [editor]);

  // Game loop
  useEffect(() => {
    if (!worldRef.current || !running) return;

    let lastTime = performance.now();
    let frameId: number;

    const loop = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000; // Convert to seconds
      lastTime = now;

      worldRef.current!.tick(dt);
      createShapesForEntities(worldRef.current!);

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameId);
  }, [running]);

  const spawnEntity = () => {
    if (!worldRef.current) return;

    const world = worldRef.current;
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

    setEntityCount(world.query(Position).length);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }}>
      {/* Control panel */}
      <div
        style={{
          width: 240,
          padding: 16,
          borderRight: "1px solid #e5e5e5",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "#fafafa",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Engine Demo</h2>

        <div style={{ fontSize: 14, color: "#666" }}>
          Entities: {entityCount}
        </div>

        <button onClick={spawnEntity} style={buttonStyle}>
          Spawn Entity
        </button>

        <button onClick={() => setRunning(!running)} style={buttonStyle}>
          {running ? "Pause" : "Resume"}
        </button>

        <div
          style={{ marginTop: "auto", fontSize: 12, color: "#999", lineHeight: 1.5 }}
        >
          <strong>Primitives:</strong>
          <br />
          • Entity (ID only)
          <br />
          • Components (Position, Velocity)
          <br />
          • Systems (Physics, Bounce, Sync)
          <br />
          <br />
          Shapes are tldraw geo shapes synced to entity Position.
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <Tldraw
          onMount={setEditor}
          components={{
            // Hide some UI for cleaner demo
            DebugPanel: null,
            DebugMenu: null,
          }}
        />
      </div>
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

const buttonStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 14,
  border: "1px solid #ddd",
  borderRadius: 6,
  background: "white",
  cursor: "pointer",
};

export default App;
