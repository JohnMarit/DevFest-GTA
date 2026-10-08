export type InteractTarget = {
  id: string
  prompt: string
}

/** Frame data shared by the sim and the HTML HUD without React re-renders. */
export const runtime = {
  x: -76,
  y: 0,
  z: 142,
  yaw: 0,
  pitch: 0.24,
  speed: 0,
  vehicleId: null as string | null,
  vehicleLabel: '',
  look: 0,
  nearbyVehicleId: null as string | null,
  nearbyVehicleLabel: '',
  exitPoint: { x: -76, y: 1, z: 145 },
  target: null as InteractTarget | null,
  /** performance.now() of the last punch request; bots consume it once each. */
  attackStamp: 0,
  punchUntil: 0,
  lastHurt: 0,
  dangerZone: null as string | null,
  steer: 0,
  /** 0..1 brake light strength, 1 when reversing. */
  braking: 0,
  reversing: false,
  /** performance.now() of the last hard collision while driving. */
  crashStamp: 0,
  crashForce: 0,
  onRoad: true,
  roadName: '',
  /** Cached GPS polyline toward the current objective, refreshed by the HUD. */
  route: [] as { x: number; z: number }[],
  routeStamp: 0,
  /** Sprint stamina 0..1 on foot. */
  stamina: 1,
  /** Camera orbit yaw on foot (character faces the movement direction, camera is free). */
  camYaw: 0,
  /** performance.now() of the last time the road barrier pushed a vehicle back. */
  edgeStamp: 0,
  /** Right mouse button held with the pistol out: over-the-shoulder aim. */
  aiming: false,
  /** performance.now() of the last trigger pull request; the weapon system consumes it. */
  triggerStamp: 0,
  /** performance.now() of the last shot actually fired (muzzle flash, HUD recoil). */
  shotStamp: 0,
  /** performance.now() until which a reload is in progress (0 when idle). */
  reloadUntil: 0,
  /** True while the centre crosshair is over a live bot. */
  aimOnTarget: false,
  /** Screen position (0..1) of the bot the sights have settled on. */
  reticle: { x: 0.5, y: 0.5, on: false },
  /** Time spent playing, in ms. Pauses when the game is not in play. */
  elapsedMs: 0,
  /** performance.now() of the last timer tick, or 0 while frozen. */
  elapsedMark: 0,
  /** Last tracer, world space, consumed by the tracer renderer. */
  tracer: { fromX: 0, fromY: 0, fromZ: 0, toX: 0, toY: 0, toZ: 0, stamp: 0 },
}

export const vehicleMarks = new Map<string, { x: number; y: number; z: number; label: string }>()

if (import.meta.env.DEV) {
  ;(window as unknown as { __rt?: typeof runtime }).__rt = runtime
}

export const SAVE_KEY = 'devfest-juba-city-quest-v1'
