import type { EntityId, ComponentType, ResourceType, World } from "./types";
import { createWorld } from "./world";

// ============================================================================
// Types
// ============================================================================

/**
 * Serialized representation of an entity's components.
 */
export interface SerializedEntity {
  id: string;
  components: Record<string, unknown>;
}

/**
 * Serialized representation of resources.
 */
export type SerializedResources = Record<string, unknown>;

/**
 * A snapshot of the entire world state — JSON-serializable.
 */
export interface WorldSnapshot {
  version: number;
  entities: SerializedEntity[];
  resources: SerializedResources;
}

/**
 * Registry for component types — needed to reconstruct typed components.
 */
export interface ComponentRegistry {
  register<T>(component: ComponentType<T>): void;
  get(name: string): ComponentType<unknown> | undefined;
  getAll(): ComponentType<unknown>[];
}

/**
 * Options for serialization.
 */
export interface SerializeOptions {
  /** Resource names to include. If undefined, includes all serializable resources. */
  includeResources?: string[];
  /** Resource names to exclude. Takes precedence over includeResources. */
  excludeResources?: string[];
}

/**
 * Options for deserialization.
 */
export interface DeserializeOptions {
  /** Component registry to reconstruct typed components. */
  componentRegistry: ComponentRegistry;
  /** Resource registry to reconstruct typed resources. */
  resourceRegistry?: ResourceRegistry;
}

/**
 * Registry for resource types — needed to reconstruct typed resources.
 */
export interface ResourceRegistry {
  register<T>(resource: ResourceType<T>): void;
  get(name: string): ResourceType<unknown> | undefined;
  getAll(): ResourceType<unknown>[];
}

// ============================================================================
// Component Registry Implementation
// ============================================================================

/**
 * Creates a component registry for tracking registered component types.
 */
export function createComponentRegistry(): ComponentRegistry {
  const components = new Map<string, ComponentType<unknown>>();

  return {
    register<T>(component: ComponentType<T>): void {
      components.set(component.name, component as ComponentType<unknown>);
    },

    get(name: string): ComponentType<unknown> | undefined {
      return components.get(name);
    },

    getAll(): ComponentType<unknown>[] {
      return Array.from(components.values());
    },
  };
}

/**
 * Creates a resource registry for tracking registered resource types.
 */
export function createResourceRegistry(): ResourceRegistry {
  const resources = new Map<string, ResourceType<unknown>>();

  return {
    register<T>(resource: ResourceType<T>): void {
      resources.set(resource.name, resource as ResourceType<unknown>);
    },

    get(name: string): ResourceType<unknown> | undefined {
      return resources.get(name);
    },

    getAll(): ResourceType<unknown>[] {
      return Array.from(resources.values());
    },
  };
}

// ============================================================================
// Serialization
// ============================================================================


/**
 * Checks if a value is JSON-serializable.
 */
function isSerializable(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") return true;
  if (typeof value === "function" || typeof value === "symbol") return false;

  if (Array.isArray(value)) {
    return value.every(isSerializable);
  }

  if (typeof value === "object") {
    // Skip DOM elements, functions, etc.
    if (value instanceof HTMLElement) return false;
    if (value instanceof Map || value instanceof Set) return false;
    if (value instanceof WeakMap || value instanceof WeakSet) return false;
    if (value instanceof Promise) return false;

    // Check if it's a plain object
    const proto = Object.getPrototypeOf(value);
    if (proto !== null && proto !== Object.prototype) {
      // Not a plain object — might have methods or special behavior
      // Still try to serialize if all values are serializable
    }

    try {
      for (const key of Object.keys(value)) {
        if (!isSerializable((value as Record<string, unknown>)[key])) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Serializes a world to a JSON-serializable snapshot.
 *
 * @param world - The world to serialize
 * @param componentRegistry - Registry of all component types in use
 * @param options - Serialization options
 * @returns A WorldSnapshot that can be JSON.stringify'd
 */
export function serializeWorld(
  world: World,
  componentRegistry: ComponentRegistry,
  _options: SerializeOptions = {}
): WorldSnapshot {

  // Get all registered components
  const componentTypes = componentRegistry.getAll();

  // Build a set of all entities by querying each component type
  const entitySet = new Set<EntityId>();
  for (const componentType of componentTypes) {
    const entities = world.query(componentType);
    for (const entity of entities) {
      entitySet.add(entity);
    }
  }

  // Also query for entities that might have no components (edge case)
  // Unfortunately, the World interface doesn't expose a way to get all entities directly.
  // We can only find entities that have at least one registered component.

  // Serialize entities
  const serializedEntities: SerializedEntity[] = [];
  for (const entityId of entitySet) {
    const components: Record<string, unknown> = {};

    for (const componentType of componentTypes) {
      if (world.has(entityId, componentType)) {
        const value = world.get(entityId, componentType);
        if (isSerializable(value)) {
          components[componentType.name] = value;
        }
      }
    }

    serializedEntities.push({
      id: entityId as string,
      components,
    });
  }

  // Serialize resources
  const serializedResources: SerializedResources = {};

  // Since World interface doesn't expose all resources, we need a ResourceRegistry
  // For now, we'll skip resource serialization unless explicitly provided
  // This is a limitation of the current World interface design

  // If includeResources is provided, we would need resource types to get their values
  // For now, resources serialization requires the user to provide a ResourceRegistry

  return {
    version: 1,
    entities: serializedEntities,
    resources: serializedResources,
  };
}

/**
 * Extended serialization that includes resources.
 */
export function serializeWorldWithResources(
  world: World,
  componentRegistry: ComponentRegistry,
  resourceRegistry: ResourceRegistry,
  options: SerializeOptions = {}
): WorldSnapshot {
  const { includeResources, excludeResources = [] } = options;

  // First, serialize entities
  const baseSnapshot = serializeWorld(world, componentRegistry, options);

  // Then serialize resources
  const serializedResources: SerializedResources = {};
  const resourceTypes = resourceRegistry.getAll();

  for (const resourceType of resourceTypes) {
    const name = resourceType.name;

    // Check exclusion list
    if (excludeResources.includes(name)) continue;

    // Check inclusion list (if provided)
    if (includeResources && !includeResources.includes(name)) continue;

    // Get resource value
    const value = world.getResource(resourceType);

    // Only include if serializable
    if (isSerializable(value)) {
      serializedResources[name] = value;
    }
  }

  return {
    ...baseSnapshot,
    resources: serializedResources,
  };
}

// ============================================================================
// Deserialization
// ============================================================================

/**
 * Deserializes a world snapshot back into a World instance.
 *
 * @param snapshot - The snapshot to deserialize
 * @param options - Deserialization options including component registry
 * @returns A new World populated with the snapshot data
 */
export function deserializeWorld(
  snapshot: WorldSnapshot,
  options: DeserializeOptions
): World {
  const { componentRegistry, resourceRegistry } = options;

  // Validate version
  if (snapshot.version !== 1) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`);
  }

  // Create a new world
  const world = createWorld();

  // We need to spawn entities with specific IDs, but the World interface
  // only provides spawn() which generates new IDs.
  // This is a limitation — we need to either:
  // 1. Modify World to support spawning with a specific ID
  // 2. Accept that entity IDs will be different after deserialization
  //
  // For now, we'll create a mapping from old IDs to new IDs
  const idMapping = new Map<string, EntityId>();

  // Deserialize entities
  for (const serializedEntity of snapshot.entities) {
    const newId = world.spawn();
    idMapping.set(serializedEntity.id, newId);

    // Attach components
    for (const [componentName, componentValue] of Object.entries(serializedEntity.components)) {
      const componentType = componentRegistry.get(componentName);
      if (componentType) {
        world.attach(newId, componentType, componentValue);
      } else {
        console.warn(`Unknown component type during deserialization: ${componentName}`);
      }
    }
  }

  // Deserialize resources
  if (resourceRegistry) {
    for (const [resourceName, resourceValue] of Object.entries(snapshot.resources)) {
      const resourceType = resourceRegistry.get(resourceName);
      if (resourceType) {
        world.setResource(resourceType, resourceValue);
      } else {
        console.warn(`Unknown resource type during deserialization: ${resourceName}`);
      }
    }
  }

  return world;
}

/**
 * Returns the ID mapping from deserialization.
 * Useful when you need to remap references after loading.
 */
export function deserializeWorldWithMapping(
  snapshot: WorldSnapshot,
  options: DeserializeOptions
): { world: World; idMapping: Map<string, EntityId> } {
  const { componentRegistry, resourceRegistry } = options;

  if (snapshot.version !== 1) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`);
  }

  const world = createWorld();
  const idMapping = new Map<string, EntityId>();

  for (const serializedEntity of snapshot.entities) {
    const newId = world.spawn();
    idMapping.set(serializedEntity.id, newId);

    for (const [componentName, componentValue] of Object.entries(serializedEntity.components)) {
      const componentType = componentRegistry.get(componentName);
      if (componentType) {
        world.attach(newId, componentType, componentValue);
      }
    }
  }

  if (resourceRegistry) {
    for (const [resourceName, resourceValue] of Object.entries(snapshot.resources)) {
      const resourceType = resourceRegistry.get(resourceName);
      if (resourceType) {
        world.setResource(resourceType, resourceValue);
      }
    }
  }

  return { world, idMapping };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Converts a WorldSnapshot to a JSON string.
 */
export function snapshotToJSON(snapshot: WorldSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

/**
 * Parses a JSON string into a WorldSnapshot.
 */
export function snapshotFromJSON(json: string): WorldSnapshot {
  const parsed = JSON.parse(json) as WorldSnapshot;

  // Basic validation
  if (typeof parsed.version !== "number") {
    throw new Error("Invalid snapshot: missing version");
  }
  if (!Array.isArray(parsed.entities)) {
    throw new Error("Invalid snapshot: entities must be an array");
  }
  if (typeof parsed.resources !== "object" || parsed.resources === null) {
    throw new Error("Invalid snapshot: resources must be an object");
  }

  return parsed;
}
