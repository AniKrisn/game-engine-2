# Game Engine

A lightweight Entity-Component-System (ECS) game engine built with TypeScript. Features a React frontend with tldraw integration for visual editing and debugging.

## Architecture

```
src/
├── engine/           # Core ECS engine
│   ├── types.ts      # Entity, Component, System, Resource, Signal types
│   ├── world.ts      # World implementation (entity/component storage, system runner)
│   ├── graph.ts      # Directed graph for scene hierarchies, state machines, etc.
│   ├── input.ts      # Input state management (keyboard, mouse)
│   └── serialization.ts  # World snapshot save/load
├── components/       # Component definitions (Position, Velocity, etc.)
├── systems/          # System implementations (Physics, Bounce, TldrawSync)
└── App.tsx           # React app with tldraw canvas
```

## Core Concepts

**Entity**: Just an ID. No data, no behavior.

**Component**: A typed data blob attached to entities. Pure data, no logic.

**System**: A function that queries entities by component signature and transforms them each frame.

**Resource**: Shared global state (e.g., input state, editor reference).

**Signal**: Events for decoupled communication between systems.

**Graph**: Directed relationships between entities (scene hierarchy, state machines, render pipelines).

## Usage

```typescript
import { createWorld, defineComponent, type System } from "./engine";

// Define components
const Position = defineComponent("Position", () => ({ x: 0, y: 0 }));
const Velocity = defineComponent("Velocity", () => ({ x: 0, y: 0 }));

// Create a system
const PhysicsSystem: System = {
  name: "Physics",
  query: [Position, Velocity],
  run(world, dt) {
    for (const entity of world.query(Position, Velocity)) {
      const pos = world.get(entity, Position)!;
      const vel = world.get(entity, Velocity)!;
      world.set(entity, Position, {
        x: pos.x + vel.x * dt,
        y: pos.y + vel.y * dt,
      });
    }
  },
};

// Create world and run
const world = createWorld();
world.addSystem(PhysicsSystem);

const entity = world.spawn();
world.attach(entity, Position, { x: 100, y: 100 });
world.attach(entity, Velocity, { x: 50, y: 0 });

// Game loop
world.tick(deltaTime);
```

## Development

```bash
npm install
npm run dev
```

## Features

- Type-safe components and resources with TypeScript generics
- Frequency-limited systems (run at fixed Hz instead of every frame)
- Graph structures for scene hierarchies, state machines, and dependency graphs
- World serialization/deserialization for save states
- Input handling (keyboard and mouse)
- tldraw integration for visual entity representation
