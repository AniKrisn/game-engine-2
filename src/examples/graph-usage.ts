/**
 * Graph Usage Examples
 *
 * Same API, different semantics. The structure is uniform —
 * the interpretation layer gives it meaning.
 */

import {
  createWorld,
  createGraph,
  defineGraph,
  SceneGraph,
  StateMachine,
  RenderPipeline,
  defineComponent,
} from "../engine";
import type { EntityId, TransitionData } from "../engine";

// ============================================================================
// Example 1: Scene Hierarchy
// ============================================================================
// Edges mean "is parent of". A SceneSystem would traverse this to compute
// world transforms from local transforms.

export function sceneHierarchyExample() {
  const world = createWorld();
  const scene = createGraph(SceneGraph);

  // Create entities
  const root = world.spawn();
  const player = world.spawn();
  const weapon = world.spawn();
  const particle1 = world.spawn();
  const particle2 = world.spawn();

  // Build hierarchy: root -> player -> weapon -> particles
  scene.addEdge(root, player, undefined);
  scene.addEdge(player, weapon, undefined);
  scene.addEdge(weapon, particle1, undefined);
  scene.addEdge(weapon, particle2, undefined);

  // Queries
  console.log("Roots:", scene.roots());           // [root]
  console.log("Leaves:", scene.leaves());         // [particle1, particle2]
  console.log("Player children:", scene.children(player)); // [weapon]
  console.log("Weapon descendants:", scene.descendants(weapon)); // [particle1, particle2]

  // A SceneSystem would do:
  scene.dfs(root, (_entity, depth) => {
    // Compute world transform = parent world transform * local transform
    console.log("  ".repeat(depth) + `Entity at depth ${depth}`);
  });
}

// ============================================================================
// Example 2: State Machine
// ============================================================================
// Edges are transitions. A StateMachineSystem tracks the "current" node
// and follows edges when events/conditions match.

export const ActiveState = defineComponent("ActiveState", () => ({
  current: null as EntityId | null,
}));

export function stateMachineExample() {
  const world = createWorld();
  const fsm = createGraph(StateMachine);

  // Create states as entities (they can have their own components!)
  const idle = world.spawn();
  const walking = world.spawn();
  const running = world.spawn();
  const jumping = world.spawn();

  // Define transitions with conditions
  fsm.addEdge(idle, walking, { event: "move" });
  fsm.addEdge(walking, idle, { event: "stop" });
  fsm.addEdge(walking, running, { event: "sprint" });
  fsm.addEdge(running, walking, { event: "walk" });
  fsm.addEdge(idle, jumping, { event: "jump" });
  fsm.addEdge(walking, jumping, { event: "jump" });
  fsm.addEdge(jumping, idle, { event: "land" });

  // Query available transitions from a state
  function getTransitions(state: EntityId): TransitionData[] {
    return fsm.outgoing(state).map((e) => e.data);
  }

  console.log("From idle, can:", getTransitions(idle)); // move, jump
  console.log("From walking, can:", getTransitions(walking)); // stop, sprint, jump

  // A StateMachineSystem would:
  // 1. Check incoming events
  // 2. Find matching transition from current state
  // 3. If condition passes, update current state
}

// ============================================================================
// Example 3: Render Pipeline
// ============================================================================
// Edges mean "output feeds input". Topological sort gives execution order.

interface RenderPass {
  name: string;
  execute: () => void;
}

const RenderPassComponent = defineComponent("RenderPass", (): RenderPass => ({
  name: "",
  execute: () => {},
}));

export function renderPipelineExample() {
  const world = createWorld();
  const pipeline = createGraph(RenderPipeline);

  // Create render passes as entities
  const geometry = world.spawn();
  const lighting = world.spawn();
  const shadows = world.spawn();
  const postProcess = world.spawn();
  const ui = world.spawn();

  world.attach(geometry, RenderPassComponent, { name: "Geometry", execute: () => {} });
  world.attach(lighting, RenderPassComponent, { name: "Lighting", execute: () => {} });
  world.attach(shadows, RenderPassComponent, { name: "Shadows", execute: () => {} });
  world.attach(postProcess, RenderPassComponent, { name: "PostProcess", execute: () => {} });
  world.attach(ui, RenderPassComponent, { name: "UI", execute: () => {} });

  // Define data flow
  pipeline.addEdge(geometry, lighting, { channel: "gbuffer" });
  pipeline.addEdge(geometry, shadows, { channel: "depth" });
  pipeline.addEdge(shadows, lighting, { channel: "shadowmap" });
  pipeline.addEdge(lighting, postProcess, { channel: "color" });
  pipeline.addEdge(postProcess, ui, { channel: "color" });

  // Get execution order via topological sort
  const order = pipeline.topological();
  console.log("Execution order:");
  for (const passEntity of order) {
    const pass = world.get(passEntity, RenderPassComponent)!;
    console.log(`  - ${pass.name}`);
  }
  // Output: Geometry -> Shadows -> Lighting -> PostProcess -> UI
}

// ============================================================================
// Example 4: Custom Graph Type — Dialogue Tree
// ============================================================================

interface DialogueChoice {
  text: string;
  condition?: () => boolean;
}

const DialogueGraph = defineGraph<DialogueChoice>("dialogue");

const DialogueNode = defineComponent("DialogueNode", () => ({
  speaker: "",
  text: "",
}));

export function dialogueExample() {
  const world = createWorld();
  const dialogue = createGraph(DialogueGraph);

  // Create dialogue nodes
  const greeting = world.spawn();
  const askAboutWeather = world.spawn();
  const askAboutQuest = world.spawn();
  const weatherResponse = world.spawn();
  const questResponse = world.spawn();
  const goodbye = world.spawn();

  world.attach(greeting, DialogueNode, { speaker: "NPC", text: "Hello traveler!" });
  world.attach(askAboutWeather, DialogueNode, { speaker: "Player", text: "Nice weather today." });
  world.attach(askAboutQuest, DialogueNode, { speaker: "Player", text: "Any work available?" });
  world.attach(weatherResponse, DialogueNode, { speaker: "NPC", text: "Indeed it is!" });
  world.attach(questResponse, DialogueNode, { speaker: "NPC", text: "There's a dragon..." });
  world.attach(goodbye, DialogueNode, { speaker: "NPC", text: "Safe travels!" });

  // Build dialogue tree
  dialogue.addEdge(greeting, askAboutWeather, { text: "Talk about weather" });
  dialogue.addEdge(greeting, askAboutQuest, { text: "Ask about work" });
  dialogue.addEdge(askAboutWeather, weatherResponse, { text: "" });
  dialogue.addEdge(askAboutQuest, questResponse, { text: "" });
  dialogue.addEdge(weatherResponse, goodbye, { text: "Goodbye" });
  dialogue.addEdge(questResponse, goodbye, { text: "I'll think about it" });

  // Get player choices at any node
  function getChoices(node: EntityId): string[] {
    return dialogue.outgoing(node).map((e) => e.data.text).filter(Boolean);
  }

  console.log("At greeting, choices:", getChoices(greeting));
  // ["Talk about weather", "Ask about work"]
}

// ============================================================================
// The Key Insight
// ============================================================================
//
// All four examples use the SAME Graph<T> interface:
//   - addEdge, removeEdge, children, parents, dfs, bfs, topological...
//
// What differs is:
//   1. Edge data type (void, TransitionData, PipelineData, DialogueChoice)
//   2. The System that interprets the graph
//
// A SceneSystem reads SceneGraph and computes transforms.
// A StateMachineSystem reads StateMachine and handles events.
// A RenderSystem reads RenderPipeline and executes passes in order.
// A DialogueSystem reads DialogueGraph and drives conversation UI.
//
// The Graph is just structure. Systems provide semantics.
