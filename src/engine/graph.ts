/**
 * Graph — a directed connection between things.
 *
 * The structure is uniform: nodes and directed edges.
 * The semantics vary by use case:
 *   - Scene hierarchy: edges = "is parent of", positions are relative
 *   - State machine: edges = "can transition to", one node is active
 *   - Render pipeline: edges = "feeds into", execution follows topological order
 *   - UI layout: edges = "contains", used for layout computation
 *
 * Key design decisions:
 *   1. Nodes are EntityIds — graphs describe relationships between entities
 *   2. Edges can carry data — transition conditions, weights, labels
 *   3. Multiple graphs can coexist — an entity can be in a scene graph AND a state machine
 *   4. Graphs are named/typed — so systems can query for specific graphs
 */

import type { EntityId } from "./types";

// Edge data is generic — different graph types carry different edge metadata
export interface Edge<T = unknown> {
  from: EntityId;
  to: EntityId;
  data: T;
}

// Graph type identifier — allows multiple graphs to coexist
export interface GraphType<TEdgeData = unknown> {
  readonly name: string;
  readonly _phantom?: TEdgeData;
}

export function defineGraph<T = void>(name: string): GraphType<T> {
  return { name };
}

// The Graph itself
export interface Graph<T = unknown> {
  readonly type: GraphType<T>;

  // Node membership (nodes are entities, but must be explicitly added to graph)
  addNode(entity: EntityId): void;
  removeNode(entity: EntityId): void;
  hasNode(entity: EntityId): boolean;
  nodes(): EntityId[];

  // Edge management
  addEdge(from: EntityId, to: EntityId, data: T): void;
  removeEdge(from: EntityId, to: EntityId): void;
  hasEdge(from: EntityId, to: EntityId): boolean;
  getEdge(from: EntityId, to: EntityId): Edge<T> | undefined;
  edges(): Edge<T>[];

  // Queries — the core graph operations
  outgoing(node: EntityId): Edge<T>[];      // edges leaving this node
  incoming(node: EntityId): Edge<T>[];      // edges entering this node
  children(node: EntityId): EntityId[];     // nodes this node points to
  parents(node: EntityId): EntityId[];      // nodes that point to this node

  // Tree-specific (when graph is a tree/forest)
  roots(): EntityId[];                       // nodes with no incoming edges
  leaves(): EntityId[];                      // nodes with no outgoing edges

  // Traversal
  dfs(start: EntityId, visit: (node: EntityId, depth: number) => void): void;
  bfs(start: EntityId, visit: (node: EntityId, depth: number) => void): void;
  topological(): EntityId[];                 // topological sort (for DAGs)

  // Subgraph
  descendants(node: EntityId): EntityId[];   // all nodes reachable from node
  ancestors(node: EntityId): EntityId[];     // all nodes that can reach node
}

// ============================================================================
// Implementation
// ============================================================================

export function createGraph<T = void>(type: GraphType<T>): Graph<T> {
  const nodes = new Set<EntityId>();
  const outgoingEdges = new Map<EntityId, Map<EntityId, T>>();
  const incomingEdges = new Map<EntityId, Set<EntityId>>();

  const graph: Graph<T> = {
    type,

    // Node management
    addNode(entity: EntityId): void {
      nodes.add(entity);
    },

    removeNode(entity: EntityId): void {
      nodes.delete(entity);
      // Clean up edges
      const outgoing = outgoingEdges.get(entity);
      if (outgoing) {
        for (const to of outgoing.keys()) {
          incomingEdges.get(to)?.delete(entity);
        }
        outgoingEdges.delete(entity);
      }
      // Remove incoming edges to this node
      for (const [_from, edges] of outgoingEdges) {
        if (edges.has(entity)) {
          edges.delete(entity);
        }
      }
      incomingEdges.delete(entity);
    },

    hasNode(entity: EntityId): boolean {
      return nodes.has(entity);
    },

    nodes(): EntityId[] {
      return [...nodes];
    },

    // Edge management
    addEdge(from: EntityId, to: EntityId, data: T): void {
      // Auto-add nodes if not present
      nodes.add(from);
      nodes.add(to);

      let fromEdges = outgoingEdges.get(from);
      if (!fromEdges) {
        fromEdges = new Map();
        outgoingEdges.set(from, fromEdges);
      }
      fromEdges.set(to, data);

      let toIncoming = incomingEdges.get(to);
      if (!toIncoming) {
        toIncoming = new Set();
        incomingEdges.set(to, toIncoming);
      }
      toIncoming.add(from);
    },

    removeEdge(from: EntityId, to: EntityId): void {
      outgoingEdges.get(from)?.delete(to);
      incomingEdges.get(to)?.delete(from);
    },

    hasEdge(from: EntityId, to: EntityId): boolean {
      return outgoingEdges.get(from)?.has(to) ?? false;
    },

    getEdge(from: EntityId, to: EntityId): Edge<T> | undefined {
      const data = outgoingEdges.get(from)?.get(to);
      if (data === undefined && !graph.hasEdge(from, to)) return undefined;
      return { from, to, data: data as T };
    },

    edges(): Edge<T>[] {
      const result: Edge<T>[] = [];
      for (const [from, edges] of outgoingEdges) {
        for (const [to, data] of edges) {
          result.push({ from, to, data });
        }
      }
      return result;
    },

    // Queries
    outgoing(node: EntityId): Edge<T>[] {
      const edges = outgoingEdges.get(node);
      if (!edges) return [];
      return [...edges.entries()].map(([to, data]) => ({ from: node, to, data }));
    },

    incoming(node: EntityId): Edge<T>[] {
      const fromNodes = incomingEdges.get(node);
      if (!fromNodes) return [];
      return [...fromNodes].map((from) => ({
        from,
        to: node,
        data: outgoingEdges.get(from)!.get(node)!,
      }));
    },

    children(node: EntityId): EntityId[] {
      const edges = outgoingEdges.get(node);
      return edges ? [...edges.keys()] : [];
    },

    parents(node: EntityId): EntityId[] {
      const fromNodes = incomingEdges.get(node);
      return fromNodes ? [...fromNodes] : [];
    },

    roots(): EntityId[] {
      return [...nodes].filter((n) => !incomingEdges.has(n) || incomingEdges.get(n)!.size === 0);
    },

    leaves(): EntityId[] {
      return [...nodes].filter((n) => !outgoingEdges.has(n) || outgoingEdges.get(n)!.size === 0);
    },

    // Traversal
    dfs(start: EntityId, visit: (node: EntityId, depth: number) => void): void {
      const visited = new Set<EntityId>();

      function traverse(node: EntityId, depth: number) {
        if (visited.has(node)) return;
        visited.add(node);
        visit(node, depth);
        for (const child of graph.children(node)) {
          traverse(child, depth + 1);
        }
      }

      traverse(start, 0);
    },

    bfs(start: EntityId, visit: (node: EntityId, depth: number) => void): void {
      const visited = new Set<EntityId>();
      const queue: Array<{ node: EntityId; depth: number }> = [{ node: start, depth: 0 }];

      while (queue.length > 0) {
        const { node, depth } = queue.shift()!;
        if (visited.has(node)) continue;
        visited.add(node);
        visit(node, depth);
        for (const child of graph.children(node)) {
          if (!visited.has(child)) {
            queue.push({ node: child, depth: depth + 1 });
          }
        }
      }
    },

    topological(): EntityId[] {
      const result: EntityId[] = [];
      const visited = new Set<EntityId>();
      const temp = new Set<EntityId>();

      function visit(node: EntityId): boolean {
        if (temp.has(node)) return false; // Cycle detected
        if (visited.has(node)) return true;

        temp.add(node);
        for (const child of graph.children(node)) {
          if (!visit(child)) return false;
        }
        temp.delete(node);
        visited.add(node);
        result.unshift(node);
        return true;
      }

      for (const node of nodes) {
        if (!visited.has(node)) {
          if (!visit(node)) {
            throw new Error("Graph contains a cycle, cannot topologically sort");
          }
        }
      }

      return result;
    },

    descendants(node: EntityId): EntityId[] {
      const result: EntityId[] = [];
      graph.dfs(node, (n, depth) => {
        if (depth > 0) result.push(n);
      });
      return result;
    },

    ancestors(node: EntityId): EntityId[] {
      // BFS backwards through parents
      const result: EntityId[] = [];
      const visited = new Set<EntityId>();
      const queue = graph.parents(node);

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        result.push(current);
        queue.push(...graph.parents(current));
      }

      return result;
    },
  };

  return graph;
}

// ============================================================================
// Common graph types (predefined semantics)
// ============================================================================

/** Scene hierarchy — edges mean "is parent of" */
export const SceneGraph = defineGraph<void>("scene");

/** State machine — edges are transitions with optional conditions */
export interface TransitionData {
  event?: string;           // Event that triggers this transition
  condition?: () => boolean; // Guard condition
}
export const StateMachine = defineGraph<TransitionData>("state-machine");

/** Render pipeline — edges mean "output feeds into input" */
export interface PipelineData {
  channel?: string;  // Named output/input channel
}
export const RenderPipeline = defineGraph<PipelineData>("render-pipeline");

/** Generic dependency graph */
export const DependencyGraph = defineGraph<void>("dependency");
