// Entity — just an ID. No data, no behavior.
export type EntityId = string & { readonly __brand: unique symbol };

export function createEntityId(): EntityId {
  return crypto.randomUUID() as EntityId;
}

// Component — a typed data blob. Pure data, no logic.
export interface ComponentType<T> {
  readonly name: string;
  readonly default: () => T;
}

export function defineComponent<T>(
  name: string,
  defaultValue: () => T
): ComponentType<T> {
  return { name, default: defaultValue };
}

// System — a function that queries for entities and transforms them.
export interface System {
  readonly name: string;
  readonly query: ComponentType<unknown>[];
  readonly run: (world: World, dt: number) => void;
  readonly frequency?: number; // Hz, undefined = every frame
}

// Resource — shared, global-ish data.
export interface ResourceType<T> {
  readonly name: string;
  readonly default: () => T;
}

export function defineResource<T>(
  name: string,
  defaultValue: () => T
): ResourceType<T> {
  return { name, default: defaultValue };
}

// Signal — an event or message for decoupled communication.
export interface SignalType<T> {
  readonly name: string;
  readonly _phantom?: T; // Preserve type parameter
}

export function defineSignal<T>(name: string): SignalType<T> {
  return { name };
}

// World interface (forward declaration for System)
export interface World {
  // Entity management
  spawn(): EntityId;
  despawn(entity: EntityId): void;
  exists(entity: EntityId): boolean;

  // Component management
  attach<T>(entity: EntityId, component: ComponentType<T>, value?: T): void;
  detach<T>(entity: EntityId, component: ComponentType<T>): void;
  get<T>(entity: EntityId, component: ComponentType<T>): T | undefined;
  set<T>(entity: EntityId, component: ComponentType<T>, value: T): void;
  has<T>(entity: EntityId, component: ComponentType<T>): boolean;

  // Queries
  query(...components: ComponentType<unknown>[]): EntityId[];

  // Resources
  getResource<T>(resource: ResourceType<T>): T;
  setResource<T>(resource: ResourceType<T>, value: T): void;

  // Signals
  emit<T>(signal: SignalType<T>, payload: T): void;
  subscribe<T>(signal: SignalType<T>, handler: (payload: T) => void): () => void;

  // Systems
  addSystem(system: System): void;
  tick(dt: number): void;
}
