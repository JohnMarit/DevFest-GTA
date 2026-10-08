import type { MissionDef, MissionId, MissionStatus, Objective, SaveData } from './types'

export const COLORS = {
  blue: '#1a73e8',
  red: '#ea4335',
  yellow: '#f9ab00',
  green: '#34a853',
  sand: '#e6cfa4',
  sandDark: '#c9ae7a',
  road: '#3c4148',
  curb: '#d7c09a',
  water: '#2c7f86',
  sky: '#8ec8e8',
  fog: '#e9d8bc',
  cream: '#f6f0e6',
  ink: '#1c2430',
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'find-developer',
    title: 'Finding Scenius',
    summary: 'Follow Airport Road north into Tongpiny and find Amina at the Scenius Hub gate.',
    reward: 100,
  },
  {
    id: 'fix-cloud',
    title: 'Fix The Cloud',
    summary: 'Collect the API Key, Cloud Config, and Deployment Token around the Hai Cinema tech hub, then return to Amina.',
    reward: 200,
  },
  {
    id: 'wifi-emergency',
    title: 'Wi-Fi Emergency',
    summary: 'Drive to three network relays across Juba and wake the venue internet.',
    reward: 300,
  },
  {
    id: 'speaker-rescue',
    title: 'Speaker Rescue',
    summary: 'Pick up Lado at Konyo Konyo Market and drive them to Scenius Hub.',
    reward: 400,
  },
  {
    id: 'doors-open',
    title: 'Doors Open',
    summary: 'Scenius Hub is open. Reach the DevFest stage.',
    reward: 500,
  },
]

export const CLOUD_ITEMS = [
  { id: 'api-key', label: 'API Key', x: 228, z: -4, color: COLORS.blue },
  { id: 'cloud-config', label: 'Cloud Config', x: 308, z: -36, color: COLORS.yellow },
  { id: 'deploy-token', label: 'Deployment Token', x: 236, z: -68, color: COLORS.green },
]

export const RELAYS = [
  { id: 'relay-tech', label: 'Tech Hub Relay', x: 292, z: -78 },
  { id: 'relay-nile', label: 'Nile Walk Relay', x: 36, z: 198 },
  { id: 'relay-west', label: 'West Ridge Relay', x: -318, z: 78 },
]

export const BADGES = [
  { id: 'badge-cafe', x: 96, z: 58 },
  { id: 'badge-market', x: -248, z: 8 },
  { id: 'badge-fuel', x: 182, z: 124 },
  { id: 'badge-nile', x: -20, z: 188 },
  { id: 'badge-checkpoint', x: 18, z: -128 },
  { id: 'badge-hub', x: 210, z: -48 },
  { id: 'badge-west', x: -140, z: 96 },
  { id: 'badge-venue', x: 24, z: -228 },
]

/** Hai Malakal Motor Station: the player spawns here and picks a ride from the bays. */
export const STATION = { x: -80, z: 132, w: 70, d: 40, bayZ: 122, name: 'Hai Malakal Motor Station' }

export const VEHICLES = [
  { id: 'boda-park', kind: 'boda' as const, label: 'Boda Sprint', x: -104, z: STATION.bayZ, yaw: Math.PI },
  { id: 'boda-park-2', kind: 'boda' as const, label: 'Boda Sprint', x: -98, z: STATION.bayZ, yaw: Math.PI },
  { id: 'tuktuk-park', kind: 'tuktuk' as const, label: 'Tuk Tempo', x: -89, z: STATION.bayZ, yaw: Math.PI },
  { id: 'suv-park', kind: 'suv' as const, label: 'Nile SUV', x: -77, z: STATION.bayZ, yaw: Math.PI },
  { id: 'boda-market', kind: 'boda' as const, label: 'Boda Sprint', x: -210, z: 30, yaw: 1.2 },
  { id: 'suv-hub', kind: 'suv' as const, label: 'Nile SUV', x: 226, z: -4, yaw: -0.6 },
  { id: 'tuktuk-fuel', kind: 'tuktuk' as const, label: 'Tuk Tempo', x: 156, z: 126, yaw: 2.4 },
]

export const PLAYER_START = { x: -88, y: 4, z: 138 }

export const MASCOTS = [
  { x: 84, z: 98, color: '#1a73e8', glasses: false, s: 1 },
  { x: 100, z: 100, color: '#f9ab00', glasses: true, s: 0.85 },
  { x: -196, z: 26, color: '#34a853', glasses: false, s: 0.9 },
  { x: 160, z: 126, color: '#ea4335', glasses: false, s: 0.8 },
  { x: -30, z: 170, color: '#1a73e8', glasses: true, s: 1.1 },
]

export const NPCS = {
  amina: { x: 5, z: -157, name: 'Amina' },
  barista: { x: 96, z: 92, name: 'Jok' },
  engineer: { x: 230, z: -8, name: 'Poni' },
  lado: { x: -220, z: 32, name: 'Lado' },
  officer: { x: 14, z: -138, name: 'Officer Kiden' },
}

export const DROPOFF = { x: 0, z: -196, radius: 16 }
export const STAGE = { x: 0, z: -268, radius: 9 }

export const EVENT = {
  name: 'DevFest Juba',
  date: '24 October 2026',
  venue: 'Scenius Hub',
  address: 'Tongpiny (Juba na Bari) · down Turkish Embassy Road, close to Winners Chapel',
  city: 'Juba, South Sudan',
  host: 'GDG Juba',
}

/** Named areas, inspired by real Juba neighbourhoods. First match wins, so smaller areas come first. */
export const DISTRICTS: { id: string; name: string; sub: string; x: number; z: number; radius: number }[] = [
  { id: 'scenius', name: 'Scenius Hub', sub: 'Tongpiny · Juba na Bari', x: 0, z: -250, radius: 52 },
  { id: 'konyo', name: 'Konyo Konyo Market', sub: 'Trading since forever', x: -228, z: 12, radius: 48 },
  { id: 'atlabara', name: 'Atlabara', sub: 'Signal Fuel · Unity Avenue', x: 164, z: 118, radius: 46 },
  { id: 'bridge', name: 'Juba Bridge', sub: 'Crossing the White Nile', x: -120, z: 230, radius: 40 },
  { id: 'tongpiny', name: 'Tongpiny', sub: 'Airport Road · Turkish Embassy Road', x: 0, z: -170, radius: 95 },
  { id: 'cinema', name: 'Hai Cinema', sub: 'Tech hub quarter', x: 250, z: -40, radius: 80 },
  { id: 'munuki', name: 'Munuki', sub: 'West Ridge', x: -300, z: 70, radius: 70 },
  { id: 'kator', name: 'Kator', sub: 'Old town, quiet streets', x: -140, z: -120, radius: 75 },
  { id: 'amarat', name: 'Amarat', sub: 'North-east quarter', x: 160, z: -140, radius: 70 },
  { id: 'malakal', name: 'Hai Malakal', sub: 'Home · Nile side', x: -90, z: 150, radius: 75 },
  { id: 'waterfront', name: 'Nile Waterfront', sub: 'Unity Avenue', x: 60, z: 190, radius: 120 },
  { id: 'town', name: 'Juba Town', sub: 'Ministries Road', x: 0, z: 10, radius: 110 },
]

export function districtAt(x: number, z: number) {
  for (const district of DISTRICTS) {
    if (Math.hypot(district.x - x, district.z - z) < district.radius) return district
  }
  return null
}

export type SignArm = { text: string; dir: 'left' | 'right' | 'up'; color?: string }

/** Directional sign posts at junctions, naming Juba places. `yaw` turns the post to face the road it stands on. */
export const SIGNPOSTS: { x: number; z: number; yaw: number; arms: SignArm[] }[] = [
  {
    x: -82,
    z: 120,
    yaw: 0,
    arms: [
      { text: 'JUBA TOWN', dir: 'up' },
      { text: 'AIRPORT RD · TONGPINY', dir: 'up', color: '#1a73e8' },
      { text: 'JUBA BRIDGE', dir: 'left', color: '#2f7f86' },
    ],
  },
  {
    x: 13,
    z: 54,
    yaw: 0,
    arms: [
      { text: 'SCENIUS HUB · DEVFEST', dir: 'up', color: '#ea4335' },
      { text: 'KONYO KONYO', dir: 'left', color: '#9a3412' },
      { text: 'HAI CINEMA · TECH HUB', dir: 'right', color: '#1a73e8' },
    ],
  },
  {
    x: -13,
    z: 30,
    yaw: Math.PI,
    arms: [
      { text: 'NILE WATERFRONT', dir: 'up', color: '#2f7f86' },
      { text: 'HAI MALAKAL', dir: 'up' },
      { text: 'ATLABARA · SIGNAL FUEL', dir: 'left', color: '#34a853' },
    ],
  },
  {
    x: -188,
    z: 54,
    yaw: 0,
    arms: [
      { text: 'KONYO KONYO MARKET', dir: 'up', color: '#9a3412' },
      { text: 'MUNUKI · WEST RIDGE', dir: 'left' },
      { text: 'JUBA TOWN', dir: 'right' },
    ],
  },
  {
    x: 226,
    z: 54,
    yaw: 0,
    arms: [
      { text: 'HAI CINEMA', dir: 'up', color: '#1a73e8' },
      { text: 'AMARAT', dir: 'up' },
      { text: 'JUBA TOWN', dir: 'left' },
    ],
  },
  {
    x: 202,
    z: 30,
    yaw: Math.PI,
    arms: [
      { text: 'ATLABARA', dir: 'up', color: '#34a853' },
      { text: 'UNITY AVE · NILE', dir: 'up', color: '#2f7f86' },
    ],
  },
  {
    x: 13,
    z: -96,
    yaw: 0,
    arms: [
      { text: 'TONGPINY CHECKPOINT', dir: 'up', color: '#102033' },
      { text: 'SCENIUS HUB  200 m', dir: 'up', color: '#ea4335' },
      { text: 'KATOR', dir: 'left' },
      { text: 'AMARAT', dir: 'right' },
    ],
  },
  {
    x: 13,
    z: -120,
    yaw: 0,
    arms: [
      { text: 'TURKISH EMBASSY RD', dir: 'up', color: '#1a73e8' },
      { text: 'WINNERS CHAPEL', dir: 'right' },
    ],
  },
  {
    x: 13,
    z: 164,
    yaw: 0,
    arms: [
      { text: 'JUBA BRIDGE', dir: 'left', color: '#2f7f86' },
      { text: 'JUBA PORT', dir: 'right', color: '#2f7f86' },
      { text: 'AIRPORT RD', dir: 'up' },
    ],
  },
]

/** Street name plates placed along the road edge. */
export const STREET_SIGNS: { x: number; z: number; yaw: number; text: string }[] = [
  { x: 11, z: 100, yaw: 0, text: 'AIRPORT ROAD' },
  { x: 11, z: -40, yaw: 0, text: 'AIRPORT ROAD' },
  { x: 11, z: -150, yaw: 0, text: 'TURKISH EMBASSY RD' },
  { x: -60, z: 52, yaw: Math.PI / 2, text: 'MINISTRIES ROAD' },
  { x: 130, z: 52, yaw: Math.PI / 2, text: 'MINISTRIES ROAD' },
  { x: -280, z: 52, yaw: Math.PI / 2, text: 'MINISTRIES ROAD' },
  { x: 300, z: 52, yaw: Math.PI / 2, text: 'MINISTRIES ROAD' },
  { x: -191, z: 120, yaw: 0, text: 'GUDELE ROAD' },
  { x: -191, z: -20, yaw: 0, text: 'GUDELE ROAD' },
  { x: 223, z: 120, yaw: 0, text: 'KOKORA ROAD' },
  { x: 223, z: -60, yaw: 0, text: 'KOKORA ROAD' },
  { x: -120, z: 185, yaw: Math.PI / 2, text: 'UNITY AVENUE' },
  { x: 120, z: 185, yaw: Math.PI / 2, text: 'UNITY AVENUE' },
  { x: -31, z: 90, yaw: 0, text: 'BILPAM ROAD' },
]

/** Landmark boards for well-known Juba places that live around the district. */
export const LANDMARKS: { x: number; z: number; yaw: number; text: string; color: string }[] = [
  { x: -108, z: 212, yaw: 0, text: 'JUBA BRIDGE · WHITE NILE', color: '#2f7f86' },
  { x: 40, z: -150, yaw: -0.6, text: 'WINNERS CHAPEL', color: '#5b4a8a' },
  { x: -60, z: 50, yaw: 0.2, text: 'DR. JOHN GARANG MAUSOLEUM →', color: '#102033' },
  { x: 60, z: 30, yaw: -0.2, text: 'UNIVERSITY OF JUBA →', color: '#1a73e8' },
  { x: -150, z: 60, yaw: 0.3, text: 'NYAKURON CULTURAL CENTRE ←', color: '#9a3412' },
  { x: 30, z: -60, yaw: 0, text: 'JUBA INTERNATIONAL AIRPORT ↑', color: '#102033' },
  { x: 150, z: 160, yaw: 0, text: 'JUBA PORT →', color: '#2f7f86' },
]

export type DangerZone = {
  id: string
  name: string
  x: number
  z: number
  radius: number
  bots: { x: number; z: number }[]
}

/** Dangerous checkpoints. Rogue bots patrol here and fight anyone who passes. */
export const DANGER_ZONES: DangerZone[] = [
  {
    id: 'glitch-alley',
    name: 'Glitch Alley',
    x: 0,
    z: -186,
    radius: 19,
    bots: [
      { x: -8, z: -178 },
      { x: 9, z: -188 },
      { x: -3, z: -198 },
    ],
  },
  {
    id: 'bot-yard',
    name: 'Bot Yard',
    x: 286,
    z: -70,
    radius: 20,
    bots: [
      { x: 278, z: -62 },
      { x: 296, z: -84 },
      { x: 290, z: -58 },
    ],
  },
  {
    id: 'west-ridge',
    name: 'West Ridge',
    x: -312,
    z: 74,
    radius: 20,
    bots: [
      { x: -304, z: 66 },
      { x: -322, z: 84 },
      { x: -312, z: 90 },
    ],
  },
]

export const SAFE_POINTS = [
  { x: PLAYER_START.x, z: PLAYER_START.z },
  { x: 72, z: 104 },
  { x: -200, z: 44 },
  { x: 164, z: 128 },
  { x: 14, z: -118 },
]

export const COMBAT = {
  maxHealth: 100,
  punchDamage: 40,
  punchRange: 2.4,
  punchCooldownMs: 420,
  botHealth: 100,
  botDamage: 12,
  botDamageInVehicle: 5,
  botCooldown: 1.1,
  botSpeed: 5.4,
  botRespawnSeconds: 75,
  killXp: 15,
  eliminationPenalty: 50,
}

/** The one firearm in the game: an original dev-themed "Pulse Pistol". Hitscan, aimed from the camera. */
export const PISTOL = {
  name: 'Pulse Pistol',
  damage: 34,
  range: 70,
  /** Minimum ms between shots. */
  fireMs: 190,
  clip: 12,
  startReserve: 48,
  maxReserve: 144,
  reloadMs: 1100,
  /** Bots this far from the aim ray (metres) count as a hit while aiming. */
  hitRadius: 0.75,
  /** Hip fire soft-lock: half-angle (radians) of the cone in front of the camera. */
  hipCone: 0.2,
  crateAmmo: 24,
  crateRespawnSeconds: 45,
}

export type Crate = { id: string; x: number; z: number; kind: 'pistol' | 'ammo' }

/** Pick-ups: the pistol waits at the Motor Station office; ammo sits on the approach to each checkpoint. */
export const CRATES: Crate[] = [
  { id: 'pistol-station', kind: 'pistol', x: STATION.x + 24, z: STATION.z - 3.4 },
  { id: 'ammo-checkpoint', kind: 'ammo', x: 12, z: -146 },
  { id: 'ammo-gate', kind: 'ammo', x: 11, z: -166 },
  { id: 'ammo-yard', kind: 'ammo', x: 232, z: -62 },
  { id: 'ammo-ridge', kind: 'ammo', x: -238, z: 86 },
]

export function zoneAt(x: number, z: number): DangerZone | null {
  for (const zone of DANGER_ZONES) {
    if (Math.hypot(zone.x - x, zone.z - z) < zone.radius) return zone
  }
  return null
}

export function nearestSafePoint(x: number, z: number) {
  return SAFE_POINTS.reduce((best, point) => {
    const d = (point.x - x) ** 2 + (point.z - z) ** 2
    const bd = (best.x - x) ** 2 + (best.z - z) ** 2
    return d < bd ? point : best
  })
}

export type Road = { x: number; z: number; w: number; d: number; name: string }

export const ROADS: Road[] = [
  { x: 0, z: -15, w: 18, d: 390, name: 'Airport Road' },
  { x: 10, z: 42, w: 700, d: 16, name: 'Ministries Road' },
  { x: -200, z: 55, w: 14, d: 250, name: 'Gudele Road' },
  { x: 214, z: 20, w: 14, d: 320, name: 'Kokora Road' },
  { x: 20, z: 176, w: 560, d: 14, name: 'Unity Avenue' },
  { x: -40, z: 110, w: 14, d: 134, name: 'Bilpam Road' },
]

/** Paved areas that are not streets but vehicles may use: lots, forecourts, campus grounds, promenade. */
export const DRIVABLE: Road[] = [
  { x: STATION.x, z: STATION.z, w: STATION.w, d: STATION.d, name: STATION.name },
  // Exit lane from the station bays straight down to Unity Avenue.
  { x: -76, z: 160, w: 16, d: 24, name: 'Station driveway' },
  { x: 0, z: -250, w: 78, d: 100, name: 'Scenius Hub grounds' },
  { x: 0, z: -196, w: 30, d: 14, name: 'Scenius Hub gate' },
  { x: 20, z: 193, w: 560, d: 22, name: 'Nile promenade' },
  { x: -226, z: 12, w: 46, d: 40, name: 'Konyo Konyo square' },
  { x: 165, z: 118, w: 34, d: 34, name: 'Signal Fuel forecourt' },
  { x: 165, z: 152, w: 12, d: 40, name: 'Signal Fuel driveway' },
  { x: 268, z: -38, w: 110, d: 90, name: 'Hai Cinema campus' },
  { x: -262, z: 78, w: 128, d: 12, name: 'West Ridge track' },
  { x: 267, z: -72, w: 110, d: 12, name: 'Bot Yard lane' },
]

const PAVED = [...ROADS, ...DRIVABLE]

export function roadAt(x: number, z: number): Road | null {
  for (const road of PAVED) {
    if (Math.abs(x - road.x) <= road.w / 2 + 0.6 && Math.abs(z - road.z) <= road.d / 2 + 0.6) return road
  }
  return null
}

/** Is the point on tarmac (street or paved lot) with the given margin inside the edge? */
export function drivableAt(x: number, z: number, margin = 0.4) {
  for (const road of PAVED) {
    if (Math.abs(x - road.x) <= road.w / 2 - margin && Math.abs(z - road.z) <= road.d / 2 - margin) return true
  }
  return false
}

/** Nearest paved rectangle to a point, used to slide a vehicle back onto the road. */
export function nearestPaved(x: number, z: number): Road {
  let best = PAVED[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const road of PAVED) {
    const dx = Math.max(0, Math.abs(x - road.x) - road.w / 2)
    const dz = Math.max(0, Math.abs(z - road.z) - road.d / 2)
    const distance = dx * dx + dz * dz
    if (distance < bestDistance) {
      bestDistance = distance
      best = road
    }
  }
  return best
}

/** Clamp a point into a paved rectangle, keeping `margin` from the edge. */
export function clampToPaved(road: Road, x: number, z: number, margin = 0.4) {
  return {
    x: Math.max(road.x - road.w / 2 + margin, Math.min(road.x + road.w / 2 - margin, x)),
    z: Math.max(road.z - road.d / 2 + margin, Math.min(road.z + road.d / 2 - margin, z)),
  }
}

/** Kerb bollards along street edges, skipped wherever another paved area joins. */
export const BOLLARDS: { x: number; z: number }[] = (() => {
  const list: { x: number; z: number }[] = []
  const spacing = 9
  for (const road of ROADS) {
    const vertical = road.d > road.w
    const length = vertical ? road.d : road.w
    for (let offset = -length / 2 + 2; offset <= length / 2 - 2; offset += spacing) {
      for (const side of [-1, 1]) {
        const x = vertical ? road.x + side * (road.w / 2 + 1) : road.x + offset
        const z = vertical ? road.z + offset : road.z + side * (road.d / 2 + 1)
        // Skip where the post would stand on another paved surface, or right next to one.
        if (drivableAt(x, z, -0.2)) continue
        let nearJoin = false
        for (const other of PAVED) {
          if (other === road) continue
          if (Math.abs(x - other.x) <= other.w / 2 + 3 && Math.abs(z - other.z) <= other.d / 2 + 3) {
            nearJoin = true
            break
          }
        }
        if (nearJoin) continue
        list.push({ x, z })
      }
    }
  }
  return list
})()

/* ---------- Road graph for the GPS route ---------- */

type Node = { x: number; z: number }
type RouteGraph = { nodes: Node[]; edges: Map<number, { to: number; cost: number }[]> }

function buildGraph(): RouteGraph {
  const nodes: Node[] = []
  const edges = new Map<number, { to: number; cost: number }[]>()
  const key = (x: number, z: number) => `${Math.round(x)}:${Math.round(z)}`
  const index = new Map<string, number>()
  const nodeAt = (x: number, z: number) => {
    const k = key(x, z)
    const found = index.get(k)
    if (found !== undefined) return found
    nodes.push({ x, z })
    index.set(k, nodes.length - 1)
    return nodes.length - 1
  }
  const link = (a: number, b: number) => {
    const cost = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z)
    if (!edges.has(a)) edges.set(a, [])
    if (!edges.has(b)) edges.set(b, [])
    edges.get(a)!.push({ to: b, cost })
    edges.get(b)!.push({ to: a, cost })
  }
  for (const road of ROADS) {
    const vertical = road.d > road.w
    const points: number[] = vertical
      ? [road.z - road.d / 2, road.z + road.d / 2]
      : [road.x - road.w / 2, road.x + road.w / 2]
    for (const other of ROADS) {
      if (other === road) continue
      const otherVertical = other.d > other.w
      if (otherVertical === vertical) continue
      if (vertical) {
        if (Math.abs(other.z - road.z) <= road.d / 2 && Math.abs(road.x - other.x) <= other.w / 2) points.push(other.z)
      } else if (Math.abs(other.x - road.x) <= road.w / 2 && Math.abs(road.z - other.z) <= other.d / 2) {
        points.push(other.x)
      }
    }
    points.sort((a, b) => a - b)
    let previous: number | null = null
    for (const point of points) {
      const id = vertical ? nodeAt(road.x, point) : nodeAt(point, road.z)
      if (previous !== null && previous !== id) link(previous, id)
      previous = id
    }
  }
  return { nodes, edges }
}

export const ROAD_GRAPH = buildGraph()

function projectToRoad(x: number, z: number) {
  let best: { x: number; z: number; d: number; road: Road } | null = null
  for (const road of ROADS) {
    const px = Math.max(road.x - road.w / 2, Math.min(road.x + road.w / 2, x))
    const pz = Math.max(road.z - road.d / 2, Math.min(road.z + road.d / 2, z))
    const vertical = road.d > road.w
    const cx = vertical ? road.x : px
    const cz = vertical ? pz : road.z
    const d = Math.hypot(cx - x, cz - z)
    if (!best || d < best.d) best = { x: cx, z: cz, d, road }
  }
  return best!
}

function nearestGraphNodes(point: { x: number; z: number; road: Road }) {
  const vertical = point.road.d > point.road.w
  const result: { id: number; cost: number }[] = []
  ROAD_GRAPH.nodes.forEach((node, id) => {
    const onRoad = vertical
      ? Math.abs(node.x - point.road.x) < 0.5 && Math.abs(node.z - point.road.z) <= point.road.d / 2 + 0.5
      : Math.abs(node.z - point.road.z) < 0.5 && Math.abs(node.x - point.road.x) <= point.road.w / 2 + 0.5
    if (onRoad) result.push({ id, cost: Math.hypot(node.x - point.x, node.z - point.z) })
  })
  result.sort((a, b) => a.cost - b.cost)
  return result.slice(0, 2)
}

/** Shortest road route between two world points; returns a polyline including both endpoints. */
export function routeBetween(from: { x: number; z: number }, to: { x: number; z: number }): { x: number; z: number }[] {
  const start = projectToRoad(from.x, from.z)
  const end = projectToRoad(to.x, to.z)
  if (start.road === end.road) return [from, { x: start.x, z: start.z }, { x: end.x, z: end.z }, to]
  const startNodes = nearestGraphNodes(start)
  const endNodes = nearestGraphNodes(end)
  const { nodes, edges } = ROAD_GRAPH
  const dist = new Array<number>(nodes.length).fill(Number.POSITIVE_INFINITY)
  const prev = new Array<number>(nodes.length).fill(-1)
  const done = new Array<boolean>(nodes.length).fill(false)
  for (const s of startNodes) dist[s.id] = s.cost
  for (let i = 0; i < nodes.length; i += 1) {
    let u = -1
    for (let j = 0; j < nodes.length; j += 1) {
      if (!done[j] && (u === -1 || dist[j] < dist[u])) u = j
    }
    if (u === -1 || dist[u] === Number.POSITIVE_INFINITY) break
    done[u] = true
    for (const edge of edges.get(u) ?? []) {
      const alt = dist[u] + edge.cost
      if (alt < dist[edge.to]) {
        dist[edge.to] = alt
        prev[edge.to] = u
      }
    }
  }
  let bestEnd = -1
  let bestCost = Number.POSITIVE_INFINITY
  for (const e of endNodes) {
    const total = dist[e.id] + e.cost
    if (total < bestCost) {
      bestCost = total
      bestEnd = e.id
    }
  }
  if (bestEnd === -1) return [from, to]
  const path: { x: number; z: number }[] = []
  for (let node = bestEnd; node !== -1; node = prev[node]) path.unshift(nodes[node])
  return [from, { x: start.x, z: start.z }, ...path, { x: end.x, z: end.z }, to]
}

/* ---------- Traffic ---------- */

export type TrafficRoute = { kind: 'boda' | 'tuktuk' | 'suv'; color: string; speed: number; loop: [number, number][]; offset: number }

/** Lane loops drive on the right: northbound x+4, southbound x-4, eastbound z+4, westbound z-4. */
export const TRAFFIC: TrafficRoute[] = [
  { kind: 'suv', color: '#d9e3ee', speed: 11, offset: 0, loop: [[4, 172], [4, 46], [210, 46], [210, 172]] },
  { kind: 'tuktuk', color: '#f9ab00', speed: 8, offset: 0.5, loop: [[4, 172], [4, 46], [210, 46], [210, 172]] },
  { kind: 'suv', color: '#2b3a4a', speed: 10, offset: 0, loop: [[-196, 172], [-196, 46], [-4, 46], [-4, 172]] },
  { kind: 'boda', color: '#ea4335', speed: 13, offset: 0.4, loop: [[-196, 172], [-196, 46], [-4, 46], [-4, 172]] },
  { kind: 'tuktuk', color: '#34a853', speed: 8, offset: 0, loop: [[-330, 46], [350, 46], [350, 38], [-330, 38]] },
  { kind: 'suv', color: '#f4f7fb', speed: 12, offset: 0.55, loop: [[-330, 46], [350, 46], [350, 38], [-330, 38]] },
  { kind: 'boda', color: '#1a73e8', speed: 14, offset: 0, loop: [[4, 170], [4, -128], [-4, -128], [-4, 170]] },
  { kind: 'tuktuk', color: '#f9ab00', speed: 7.5, offset: 0.6, loop: [[4, 170], [4, -128], [-4, -128], [-4, 170]] },
  { kind: 'suv', color: '#c94f3d', speed: 10, offset: 0.3, loop: [[218, 150], [218, -130], [210, -130], [210, 150]] },
]

export type Building = {
  x: number
  z: number
  w: number
  d: number
  h: number
  color: string
  accent?: string
}

export const BUILDINGS: Building[] = [
  { x: -108, z: 162, w: 12, d: 9, h: 5, color: '#f3e6cf' },
  { x: -126, z: 174, w: 9, d: 9, h: 4.2, color: '#ead7b8' },
  { x: -98, z: 188, w: 14, d: 10, h: 6, color: '#f7f1e4', accent: COLORS.blue },
  { x: -140, z: 138, w: 10, d: 8, h: 5.2, color: '#e7d2ae' },
  { x: -24, z: 186, w: 12, d: 9, h: 7, color: '#f4eadc' },
  { x: 8, z: 196, w: 16, d: 11, h: 8, color: '#e9dcc6', accent: COLORS.red },
  { x: -150, z: 96, w: 11, d: 10, h: 6, color: '#f0e2cc' },
  { x: -168, z: 118, w: 8, d: 8, h: 4.5, color: '#e6d3b4' },
  { x: 118, z: 96, w: 10, d: 8, h: 4, color: '#efe4d2' },
  { x: 248, z: -42, w: 20, d: 18, h: 28, color: '#d5dee8', accent: COLORS.blue },
  { x: 214, z: -22, w: 12, d: 10, h: 8, color: '#c9d4e0' },
  { x: 276, z: -18, w: 10, d: 10, h: 11, color: '#e7eef5' },
  { x: -236, z: 6, w: 18, d: 10, h: 4.2, color: '#f0d7a4' },
  { x: -258, z: 34, w: 10, d: 8, h: 5, color: '#e8d2b0' },
  { x: -40, z: 18, w: 12, d: 10, h: 10, color: '#f1e4d0', accent: COLORS.blue },
  { x: 48, z: 16, w: 14, d: 11, h: 13, color: '#e7d9c2' },
  { x: -34, z: 74, w: 9, d: 8, h: 6, color: '#f6efe4' },
  { x: 42, z: 70, w: 10, d: 9, h: 8, color: '#eadcc4', accent: COLORS.red },
  { x: -46, z: -78, w: 16, d: 11, h: 11, color: '#f3e7d4' },
  { x: 52, z: -92, w: 13, d: 12, h: 15, color: '#ddd4c6', accent: COLORS.yellow },
  { x: 36, z: -36, w: 11, d: 9, h: 8, color: '#efe2cc' },
  { x: -52, z: -28, w: 12, d: 10, h: 7, color: '#e8d6b8' },
  { x: 300, z: 46, w: 13, d: 12, h: 12, color: '#e5d8c4' },
  { x: 312, z: 86, w: 10, d: 10, h: 6, color: '#f4ead8', accent: COLORS.green },
  { x: 270, z: 128, w: 15, d: 10, h: 5, color: '#efe0c8' },
  { x: -268, z: 94, w: 12, d: 10, h: 6.5, color: '#f2e5d0' },
  { x: -292, z: 46, w: 11, d: 11, h: 9, color: '#e7d5b6', accent: COLORS.blue },
  { x: -230, z: 100, w: 10, d: 8, h: 5, color: '#f7f0e2' },
  { x: 130, z: -120, w: 12, d: 10, h: 9, color: '#e9dcc8' },
  { x: -120, z: -110, w: 14, d: 10, h: 8, color: '#f1e6d4' },
  { x: 180, z: -150, w: 11, d: 9, h: 7, color: '#e5d4b8' },
  { x: -160, z: -150, w: 12, d: 10, h: 6, color: '#f6eee2', accent: COLORS.red },
  { x: 0, z: -286, w: 42, d: 16, h: 11, color: '#f4f7fb', accent: COLORS.blue },
  { x: 46, z: -164, w: 12, d: 18, h: 7.5, color: '#f7f2ea', accent: '#5b4a8a' },
]

export const TREES: { x: number; z: number; s: number; kind: number }[] = (() => {
  const spots: { x: number; z: number; s: number; kind: number }[] = []
  let seed = 20261024
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const blocked = (x: number, z: number) => {
    if (Math.hypot(x - PLAYER_START.x, z - PLAYER_START.z) < 16) return true
    for (const road of [...ROADS, ...DRIVABLE]) {
      if (Math.abs(x - road.x) < road.w / 2 + 3 && Math.abs(z - road.z) < road.d / 2 + 3) return true
    }
    for (const b of BUILDINGS) {
      if (Math.abs(x - b.x) < b.w / 2 + 2 && Math.abs(z - b.z) < b.d / 2 + 2) return true
    }
    if (z > 205) return true
    if (Math.abs(x) < 48 && z < -190) return true
    return false
  }
  let guard = 0
  while (spots.length < 56 && guard < 800) {
    guard += 1
    const x = -350 + rand() * 700
    const z = -300 + rand() * 520
    if (blocked(x, z)) continue
    spots.push({ x, z, s: 0.75 + rand() * 0.7, kind: rand() > 0.45 ? 1 : 0 })
  }
  return spots
})()

const WALKERS = [
  { shirt: '#1a73e8', pants: '#243040', skin: '#8d552f', path: [[-80, 54], [80, 54], [80, 34], [-80, 34]] },
  { shirt: '#f4f0ea', pants: '#3d342c', skin: '#a86b45', path: [[14, 20], [14, 130], [22, 130], [22, 20]] },
  { shirt: '#ea4335', pants: '#2a3038', skin: '#6f442c', path: [[-250, 24], [-180, 24], [-180, 4], [-250, 4]] },
  { shirt: '#34a853', pants: '#243028', skin: '#c48a5a', path: [[40, 96], [110, 96], [110, 112], [40, 112]] },
  { shirt: '#f9ab00', pants: '#2c3138', skin: '#7a4b32', path: [[-20, -70], [70, -70], [70, -100], [-20, -100]] },
  { shirt: '#5f6f81', pants: '#1d2430', skin: '#96623d', path: [[190, 150], [250, 150], [250, 90], [190, 90]] },
]

export const PEDESTRIANS = WALKERS

export function freshMissions(): Record<MissionId, MissionStatus> {
  return {
    'find-developer': 'active',
    'fix-cloud': 'locked',
    'wifi-emergency': 'locked',
    'speaker-rescue': 'locked',
    'doors-open': 'locked',
  }
}

export function objectiveLine(save: SaveData): string {
  const m = save.missions
  if (m['find-developer'] === 'active') return 'Find Amina at the Scenius Hub gate in Tongpiny.'
  if (m['fix-cloud'] === 'active') {
    if (save.cloudPieces.length < 3) {
      return `Pick up the cloud credentials (${save.cloudPieces.length}/3).`
    }
    return 'Return the credentials to Amina.'
  }
  if (m['wifi-emergency'] === 'active') {
    return `Wake the network relays (${save.relays.length}/3).`
  }
  if (m['speaker-rescue'] === 'active') {
    if (!save.speakerOnBoard) return 'Drive to Lado at Konyo Konyo Market and press E.'
    return 'SPEAKER ON BOARD — drive to the Scenius Hub drop-off.'
  }
  if (m['doors-open'] === 'active') return 'Enter Scenius Hub and reach the stage.'
  if (m['doors-open'] === 'completed') return 'Welcome to DevFest Juba.'
  return 'Get to DevFest Juba.'
}

export function currentObjectives(save: SaveData): Objective[] {
  const m = save.missions
  if (m['find-developer'] === 'active') {
    return [{ id: 'amina', label: 'Scenius Hub', x: NPCS.amina.x, z: NPCS.amina.z, beacon: true }]
  }
  if (m['fix-cloud'] === 'active') {
    if (save.cloudPieces.length < 3) {
      return CLOUD_ITEMS.filter((item) => !save.cloudPieces.includes(item.id)).map((item) => ({
        id: item.id,
        label: item.label,
        x: item.x,
        z: item.z,
        beacon: true,
      }))
    }
    return [{ id: 'amina', label: 'Return to Amina', x: NPCS.amina.x, z: NPCS.amina.z, beacon: true }]
  }
  if (m['wifi-emergency'] === 'active') {
    return RELAYS.filter((relay) => !save.relays.includes(relay.id)).map((relay) => ({
      id: relay.id,
      label: relay.label,
      x: relay.x,
      z: relay.z,
      beacon: true,
    }))
  }
  if (m['speaker-rescue'] === 'active') {
    if (!save.speakerOnBoard) {
      return [{ id: 'lado', label: 'Lado · Konyo Konyo Market', x: NPCS.lado.x, z: NPCS.lado.z, beacon: true }]
    }
    return [{ id: 'dropoff', label: 'Scenius Hub drop-off', x: DROPOFF.x, z: DROPOFF.z, beacon: true }]
  }
  if (m['doors-open'] === 'active') {
    return [{ id: 'stage', label: 'DevFest stage', x: STAGE.x, z: STAGE.z, beacon: true }]
  }
  return []
}

export function nearestObjective(save: SaveData, x: number, z: number): Objective | null {
  const list = currentObjectives(save)
  if (!list.length) return null
  return list.reduce((best, item) => {
    const d = (item.x - x) ** 2 + (item.z - z) ** 2
    const bd = (best.x - x) ** 2 + (best.z - z) ** 2
    return d < bd ? item : best
  })
}

export function gateOpen(save: SaveData) {
  return save.missions['doors-open'] === 'active' || save.missions['doors-open'] === 'completed'
}
