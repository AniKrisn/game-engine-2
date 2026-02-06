import type { System } from "../engine/types";
import { Input } from "../engine/input";

/**
 * InputSystem — clears frame-specific input state at the end of each frame.
 * Should be added as the LAST system in the game loop.
 */
export const InputSystem: System = {
  name: "Input",
  query: [], // No entity queries needed — operates on resource only

  run(world, _dt) {
    const input = world.getResource(Input);

    // Clear "just pressed" and "just released" sets for next frame
    input.keysJustPressed.clear();
    input.keysJustReleased.clear();
  },
};
