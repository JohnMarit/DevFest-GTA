/** Live bots register here so the weapon system can hit-test them without React. */
export type BotHandle = {
  position: () => { x: number; y: number; z: number }
  alive: () => boolean
  /** Apply damage with a push direction (unit vector in the XZ plane). */
  hit: (damage: number, dirX: number, dirZ: number) => void
}

export const botRegistry = new Map<string, BotHandle>()

if (import.meta.env.DEV) {
  ;(window as unknown as { __bots?: typeof botRegistry }).__bots = botRegistry
}

export type Shot = {
  ox: number
  oy: number
  oz: number
  dx: number
  dy: number
  dz: number
  range: number
}

export type Pick = { t: number; id: string; bot: BotHandle; x: number; y: number; z: number }

/**
 * Closest live bot along the aim ray. The test is done on the ground plane (XZ) with a generous
 * vertical window, so a third-person camera looking slightly down still lands shots on a bot
 * that is under the crosshair; this is the same soft aim assist arcade shooters use.
 */
export function pickBot(shot: Shot, radius: number, cone = 0): Pick | null {
  const flat = Math.hypot(shot.dx, shot.dz)
  if (flat < 0.05) return null
  const fx = shot.dx / flat
  const fz = shot.dz / flat
  let best: Pick | null = null
  for (const [id, bot] of botRegistry) {
    if (!bot.alive()) continue
    const p = bot.position()
    const px = p.x - shot.ox
    const pz = p.z - shot.oz
    const along = px * fx + pz * fz
    if (along < 0.5 || along > shot.range) continue
    const miss = Math.abs(px * fz - pz * fx)
    if (cone > 0) {
      // Hip fire: anything inside a horizontal cone in front of the camera counts.
      if (Math.atan2(miss, along) > cone) continue
    } else {
      if (miss > radius) continue
      // Height of the ray above the bot's feet where it passes the bot.
      const t = along / flat
      const rayY = shot.oy + shot.dy * t
      if (rayY < p.y - 1.6 || rayY > p.y + 2.6) continue
    }
    const t = along / flat
    if (!best || t < best.t) best = { t, id, bot, x: p.x, y: p.y + 0.4, z: p.z }
  }
  return best
}
