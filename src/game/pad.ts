/**
 * On-screen controls for touch play. The sim reads these every frame the same way it reads the keyboard.
 * `lookX` / `lookY` are radians accumulated since the last frame and cleared by the camera.
 */
export const pad = {
  /** Strafe, -1..1. In a vehicle this is steering. */
  x: 0,
  /** Forward, -1..1. In a vehicle this is throttle and brake. */
  y: 0,
  sprint: false,
  aim: false,
  fire: false,
  /** One-shot jump request, consumed by the player. */
  jump: false,
  lookX: 0,
  lookY: 0,
}

export function touchPlay() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches
}
