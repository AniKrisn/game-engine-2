import type {
  EntityId,
  ComponentType,
  ResourceType,
  SignalType,
  System,
  World,
} from "./types";
import { createEntityId } from "./types";

type ComponentStorage = Map<string, Map<EntityId, unknown>>;
type ResourceStorage = Map<string, unknown>;
type SignalSubscribers = Map<string, Set<(payload: unknown) => void>>;

export function createWorld(): World {
  const entities = new Set<EntityId>();
  const components: ComponentStorage = new Map();
  const resources: ResourceStorage = new Map();
  const signals: SignalSubscribers = new Map();
  const systems: System[] = [];

  // Track last run time for frequency-limited systems
  const systemLastRun = new Map<string, number>();

  const world: World = {
    // Entity management
    spawn(): EntityId {
      const id = createEntityId();
      entities.add(id);
      return id;
    },

    despawn(entity: EntityId): void {
      entities.delete(entity);
      // Clean up all components for this entity
      for (const store of components.values()) {
        store.delete(entity);
      }
    },

    exists(entity: EntityId): boolean {
      return entities.has(entity);
    },

    // Component management
    attach<T>(entity: EntityId, component: ComponentType<T>, value?: T): void {
      if (!entities.has(entity)) return;

      let store = components.get(component.name);
      if (!store) {
        store = new Map();
        components.set(component.name, store);
      }
      store.set(entity, value ?? component.default());
    },

    detach<T>(entity: EntityId, component: ComponentType<T>): void {
      const store = components.get(component.name);
      if (store) {
        store.delete(entity);
      }
    },

    get<T>(entity: EntityId, component: ComponentType<T>): T | undefined {
      const store = components.get(component.name);
      return store?.get(entity) as T | undefined;
    },

    set<T>(entity: EntityId, component: ComponentType<T>, value: T): void {
      const store = components.get(component.name);
      if (store && store.has(entity)) {
        store.set(entity, value);
      }
    },

    has<T>(entity: EntityId, component: ComponentType<T>): boolean {
      const store = components.get(component.name);
      return store?.has(entity) ?? false;
    },

    // Queries — select entities by component signature
    query(...requiredComponents: ComponentType<unknown>[]): EntityId[] {
      const result: EntityId[] = [];

      for (const entity of entities) {
        let matches = true;
        for (const component of requiredComponents) {
          if (!world.has(entity, component)) {
            matches = false;
            break;
          }
        }
        if (matches) {
          result.push(entity);
        }
      }

      return result;
    },

    // Resources
    getResource<T>(resource: ResourceType<T>): T {
      if (!resources.has(resource.name)) {
        resources.set(resource.name, resource.default());
      }
      return resources.get(resource.name) as T;
    },

    setResource<T>(resource: ResourceType<T>, value: T): void {
      resources.set(resource.name, value);
    },

    // Signals
    emit<T>(signal: SignalType<T>, payload: T): void {
      const subscribers = signals.get(signal.name);
      if (subscribers) {
        for (const handler of subscribers) {
          handler(payload);
        }
      }
    },

    subscribe<T>(
      signal: SignalType<T>,
      handler: (payload: T) => void
    ): () => void {
      let subscribers = signals.get(signal.name);
      if (!subscribers) {
        subscribers = new Set();
        signals.set(signal.name, subscribers);
      }
      subscribers.add(handler as (payload: unknown) => void);

      // Return unsubscribe function
      return () => {
        subscribers!.delete(handler as (payload: unknown) => void);
      };
    },

    // Systems
    addSystem(system: System): void {
      systems.push(system);
      systemLastRun.set(system.name, 0);
    },

    tick(dt: number): void {
      const now = performance.now();

      for (const system of systems) {
        // Check frequency limit
        if (system.frequency !== undefined) {
          const lastRun = systemLastRun.get(system.name) ?? 0;
          const interval = 1000 / system.frequency;
          if (now - lastRun < interval) {
            continue;
          }
          systemLastRun.set(system.name, now);
        }

        system.run(world, dt);
      }
    },
  };

  return world;
}
