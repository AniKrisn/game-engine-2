import { defineResource, type World } from "./types";

/**
 * InputState — tracks keyboard and mouse input state.
 * Designed to be polled by systems each frame.
 */
export interface InputState {
  /** Currently held keys (by key code, e.g., "KeyW", "Space") */
  keys: Set<string>;
  /** Keys pressed this frame */
  keysJustPressed: Set<string>;
  /** Keys released this frame */
  keysJustReleased: Set<string>;
  /** Mouse position relative to the document */
  mouse: { x: number; y: number };
  /** Currently pressed mouse buttons (0=left, 1=middle, 2=right) */
  mouseButtons: Set<number>;

  /** Check if a key is currently held down */
  isKeyDown(key: string): boolean;
  /** Check if a key was pressed this frame */
  wasKeyPressed(key: string): boolean;
}

/**
 * Creates a fresh InputState with all collections empty.
 */
function createInputState(): InputState {
  const state: InputState = {
    keys: new Set(),
    keysJustPressed: new Set(),
    keysJustReleased: new Set(),
    mouse: { x: 0, y: 0 },
    mouseButtons: new Set(),

    isKeyDown(key: string): boolean {
      return state.keys.has(key);
    },

    wasKeyPressed(key: string): boolean {
      return state.keysJustPressed.has(key);
    },
  };
  return state;
}

/**
 * Input resource — global input state accessible by systems.
 */
export const Input = defineResource<InputState>("Input", createInputState);

// Store references to event handlers so we can remove them later
let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let keyupHandler: ((e: KeyboardEvent) => void) | null = null;
let mousemoveHandler: ((e: MouseEvent) => void) | null = null;
let mousedownHandler: ((e: MouseEvent) => void) | null = null;
let mouseupHandler: ((e: MouseEvent) => void) | null = null;

/**
 * Attaches DOM event listeners to track input state.
 * Call this once when initializing the game.
 */
export function setupInputListeners(world: World): void {
  const input = world.getResource(Input);

  keydownHandler = (e: KeyboardEvent) => {
    // Avoid repeat events from held keys
    if (!e.repeat) {
      input.keys.add(e.code);
      input.keysJustPressed.add(e.code);
    }
  };

  keyupHandler = (e: KeyboardEvent) => {
    input.keys.delete(e.code);
    input.keysJustReleased.add(e.code);
  };

  mousemoveHandler = (e: MouseEvent) => {
    input.mouse.x = e.clientX;
    input.mouse.y = e.clientY;
  };

  mousedownHandler = (e: MouseEvent) => {
    input.mouseButtons.add(e.button);
  };

  mouseupHandler = (e: MouseEvent) => {
    input.mouseButtons.delete(e.button);
  };

  // Attach all listeners
  window.addEventListener("keydown", keydownHandler);
  window.addEventListener("keyup", keyupHandler);
  window.addEventListener("mousemove", mousemoveHandler);
  window.addEventListener("mousedown", mousedownHandler);
  window.addEventListener("mouseup", mouseupHandler);
}

/**
 * Removes all input event listeners.
 * Call this when cleaning up the game.
 */
export function cleanupInputListeners(): void {
  if (keydownHandler) {
    window.removeEventListener("keydown", keydownHandler);
    keydownHandler = null;
  }
  if (keyupHandler) {
    window.removeEventListener("keyup", keyupHandler);
    keyupHandler = null;
  }
  if (mousemoveHandler) {
    window.removeEventListener("mousemove", mousemoveHandler);
    mousemoveHandler = null;
  }
  if (mousedownHandler) {
    window.removeEventListener("mousedown", mousedownHandler);
    mousedownHandler = null;
  }
  if (mouseupHandler) {
    window.removeEventListener("mouseup", mouseupHandler);
    mouseupHandler = null;
  }
}
