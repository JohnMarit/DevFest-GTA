import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Float } from '@react-three/drei'
import type { Group, Mesh } from 'three'
import {
  BADGES,
  CLOUD_ITEMS,
  COLORS,
  COMBAT,
  currentObjectives,
  districtAt,
  DROPOFF,
  MASCOTS,
  NPCS,
  PEDESTRIANS,
  RELAYS,
  roadAt,
  STAGE,
  zoneAt,
} from '../game/content'
import { playBlip } from '../game/audio'
import { held } from '../game/keys'
import { runtime, vehicleMarks } from '../game/runtime'
import { useGame } from '../game/store'
import { labelTexture } from './textures'
import { Mascot } from './Mascot'
import { LowPolyPerson } from './Person'

const edges: Record<string, boolean> = {}

function edge(code: string) {
  const down = held(code)
  const fired = down && !edges[code]
  edges[code] = down
  return fired
}

export function Boot() {
  const boot = useGame((state) => state.boot)
  useEffect(() => {
    boot()
  }, [boot])
  return null
}

export function requestPunch() {
  const state = useGame.getState()
  if (state.phase !== 'playing' || state.dialogue || state.vehicleId) return
  const now = performance.now()
  if (now - runtime.attackStamp < COMBAT.punchCooldownMs) return
  runtime.attackStamp = now
  runtime.punchUntil = now + 260
  playBlip(320)
}

/** Left click / Q: shoot when the pistol is out, otherwise punch. */
export function requestAttack() {
  const state = useGame.getState()
  if (state.phase !== 'playing' || state.dialogue || state.vehicleId) return
  if (state.weapon === 'pistol' && state.hasPistol) {
    runtime.triggerStamp = performance.now()
    return
  }
  requestPunch()
}

const regen = { current: 0 }

export function Rules() {
  useFrame(() => {
    const state = useGame.getState()
    const nowMs = performance.now()
    if (state.phase === 'playing') {
      if (runtime.elapsedMark > 0) runtime.elapsedMs += nowMs - runtime.elapsedMark
      runtime.elapsedMark = nowMs
    } else {
      runtime.elapsedMark = 0
    }
    if (edge('Escape')) {
      if (state.phase === 'playing' || state.phase === 'paused') {
        if (document.pointerLockElement) document.exitPointerLock()
        state.togglePause()
      }
    }
    if (edge('KeyE')) {
      if (state.phase === 'playing') {
        if (state.dialogue) state.advanceDialogue()
        else if (runtime.target) state.interact(runtime.target.id)
      }
    }
    if (edge('KeyF')) {
      if (state.phase === 'playing' && !state.dialogue) {
        if (state.vehicleId) state.exitVehicle()
        else if (runtime.nearbyVehicleId) state.enterVehicle(runtime.nearbyVehicleId)
      }
    }
    if (edge('KeyQ')) requestAttack()

    if (state.phase !== 'playing' || state.dialogue) {
      state.setPrompt(null)
      return
    }

    const zone = zoneAt(runtime.x, runtime.z)
    runtime.dangerZone = zone?.id ?? null
    state.setDanger(zone?.name ?? null)
    state.setDistrict(districtAt(runtime.x, runtime.z)?.id ?? null)
    if (!state.vehicleId) {
      const road = roadAt(runtime.x, runtime.z)
      runtime.onRoad = !!road
      runtime.roadName = road?.name ?? ''
      runtime.braking = 0
      runtime.reversing = false
    }
    const sinceHurt = performance.now() - runtime.lastHurt
    if (!zone && sinceHurt > 4000 && state.health < COMBAT.maxHealth) {
      regen.current += Math.min(0.05, 1 / 60) * 6
      if (regen.current >= 1) {
        state.heal(Math.floor(regen.current))
        regen.current -= Math.floor(regen.current)
      }
    }

    const lado =
      state.missions['speaker-rescue'] === 'completed'
        ? { x: 8, z: -252 }
        : { x: NPCS.lado.x, z: NPCS.lado.z }
    const talks = [
      { id: 'amina', x: NPCS.amina.x, z: NPCS.amina.z, prompt: 'E  Talk to Amina' },
      { id: 'barista', x: NPCS.barista.x, z: NPCS.barista.z, prompt: 'E  Talk to Jok' },
      { id: 'engineer', x: NPCS.engineer.x, z: NPCS.engineer.z, prompt: 'E  Talk to Poni' },
      { id: 'officer', x: NPCS.officer.x, z: NPCS.officer.z, prompt: 'E  Officer Kiden' },
      { id: 'fuel', x: 164, z: 121, prompt: 'E  Attendant' },
    ]
    if (!(state.speakerOnBoard && state.missions['speaker-rescue'] === 'active')) {
      const ladoPrompt =
        state.missions['speaker-rescue'] === 'active'
          ? state.vehicleId
            ? 'E  Pick up Lado'
            : 'E  Talk to Lado'
          : 'E  Talk to Lado'
      talks.push({ id: 'lado', x: lado.x, z: lado.z, prompt: ladoPrompt })
    }

    let prompt: string | null = null
    let target: { id: string; prompt: string } | null = null
    let best = 3.2
    for (const talk of talks) {
      const distance = Math.hypot(talk.x - runtime.x, talk.z - runtime.z)
      if (distance < best) {
        best = distance
        target = { id: talk.id, prompt: talk.prompt }
        prompt = talk.prompt
      }
    }
    for (const relay of RELAYS) {
      const distance = Math.hypot(relay.x - runtime.x, relay.z - runtime.z)
      if (distance < 4 && distance < best) {
        best = distance
        const label = state.relays.includes(relay.id) ? 'E  Relay online' : 'E  Activate relay'
        target = { id: relay.id, prompt: label }
        prompt = label
      }
    }

    let nearId: string | null = null
    let nearLabel = ''
    let nearDist = 3.4
    if (!state.vehicleId) {
      for (const [id, mark] of vehicleMarks) {
        const distance = Math.hypot(mark.x - runtime.x, mark.z - runtime.z)
        if (distance < nearDist) {
          nearDist = distance
          nearId = id
          nearLabel = mark.label
        }
      }
    }
    runtime.nearbyVehicleId = nearId
    runtime.nearbyVehicleLabel = nearLabel
    runtime.target = target

    if (state.vehicleId) prompt = 'F  Exit vehicle'
    else if (prompt && nearId) prompt = `${prompt}    ·    F  Ride ${nearLabel}`
    else if (nearId) prompt = `F  Ride ${nearLabel}`
    else if (zone && state.hasPistol && state.weapon !== 'pistol') prompt = '2  Draw pistol'
    else if (zone && state.weapon === 'pistol') prompt = 'RMB  Aim    ·    LMB  Shoot    ·    R  Reload'
    else if (zone) prompt = 'Q / click  Punch'
    state.setPrompt(prompt)

    if (state.missions['fix-cloud'] === 'active') {
      for (const item of CLOUD_ITEMS) {
        if (state.cloudPieces.includes(item.id)) continue
        if (Math.hypot(item.x - runtime.x, item.z - runtime.z) < 2.5) state.collectCloud(item.id)
      }
    }
    for (const badge of BADGES) {
      if (state.badges.includes(badge.id)) continue
      if (Math.hypot(badge.x - runtime.x, badge.z - runtime.z) < 2.2) state.collectBadge(badge.id)
    }
    if (state.missions['speaker-rescue'] === 'active' && state.speakerOnBoard) {
      if (Math.hypot(DROPOFF.x - runtime.x, DROPOFF.z - runtime.z) < DROPOFF.radius) state.completeDropoff()
    }
    if (state.missions['doors-open'] === 'active') {
      if (Math.hypot(STAGE.x - runtime.x, STAGE.z - runtime.z) < STAGE.radius) state.reachStage()
    }
  })
  return null
}

function Walker({
  path,
  shirt,
  skin,
}: {
  path: number[][]
  shirt: string
  skin: string
}) {
  const ref = useRef<Group>(null)
  const seg = useRef(0)
  const along = useRef(0)
  useFrame((_, dt) => {
    const from = path[seg.current]
    const to = path[(seg.current + 1) % path.length]
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1
    along.current += (Math.min(dt, 0.05) * 1.7) / length
    if (along.current >= 1) {
      along.current = 0
      seg.current = (seg.current + 1) % path.length
    }
    const x = from[0] + (to[0] - from[0]) * along.current
    const z = from[1] + (to[1] - from[1]) * along.current
    if (!ref.current) return
    ref.current.position.set(x, 0, z)
    ref.current.rotation.y = Math.atan2(to[0] - from[0], -(to[1] - from[1]))
  })
  return (
    <group ref={ref}>
      <LowPolyPerson shirt={shirt} skin={skin} walking />
    </group>
  )
}

function Beacon({ x, z }: { x: number; z: number }) {
  const gem = useRef<Mesh>(null)
  useFrame((state) => {
    if (!gem.current) return
    gem.current.position.y = 2.5 + Math.sin(state.clock.elapsedTime * 3) * 0.12
    gem.current.rotation.y += 0.02
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 8, 0]}>
        <cylinderGeometry args={[0.15, 0.4, 16, 6]} />
        <meshBasicMaterial color={COLORS.yellow} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh ref={gem}>
        <octahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color={COLORS.yellow} emissive={COLORS.yellow} emissiveIntensity={0.85} />
      </mesh>
    </group>
  )
}

function CloudCard({ label, x, z, color }: { label: string; x: number; z: number; color: string }) {
  const map = useMemo(() => labelTexture(label, color), [label, color])
  return (
    <Float speed={2.2} rotationIntensity={0.25} floatIntensity={0.55} position={[x, 1.5, z]}>
      <mesh castShadow>
        <boxGeometry args={[0.95, 0.58, 0.08]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
      </mesh>
      <Billboard position={[0, 0.62, 0]}>
        <mesh>
          <planeGeometry args={[1.7, 0.4]} />
          <meshBasicMaterial map={map} toneMapped={false} />
        </mesh>
      </Billboard>
    </Float>
  )
}

function Badge({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <Float speed={3} rotationIntensity={0.8} floatIntensity={0.4} position={[x, 1.1, z]}>
      <mesh>
        <octahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
      </mesh>
    </Float>
  )
}

function Relay({ id, x, z }: { id: string; x: number; z: number }) {
  const on = useGame((state) => state.relays.includes(id))
  const hot = useGame((state) => state.missions['wifi-emergency'] === 'active' && !state.relays.includes(id))
  const bulb = useRef<Mesh>(null)
  useFrame((state) => {
    if (!bulb.current) return
    const scale = 1 + Math.sin(state.clock.elapsedTime * (hot ? 6 : 2)) * 0.08
    bulb.current.scale.setScalar(scale)
  })
  const color = on ? COLORS.green : hot ? COLORS.yellow : COLORS.red
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 6, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 12, 6]} />
        <meshStandardMaterial color="#c5ced6" />
      </mesh>
      <mesh position={[0, 11.2, 0]}>
        <boxGeometry args={[2.4, 0.12, 0.12]} />
        <meshStandardMaterial color="#9aa7b4" />
      </mesh>
      <mesh ref={bulb} position={[0, 12.1, 0]}>
        <sphereGeometry args={[0.38, 12, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
      </mesh>
    </group>
  )
}

export function Population() {
  const missions = useGame((state) => state.missions)
  const cloudPieces = useGame((state) => state.cloudPieces)
  const relays = useGame((state) => state.relays)
  const speakerOnBoard = useGame((state) => state.speakerOnBoard)
  const badges = useGame((state) => state.badges)
  const objectives = useMemo(
    () => currentObjectives({ xp: 0, missions, cloudPieces, relays, badges, speakerOnBoard, musicOn: true, hasPistol: false, ammo: 0, reserve: 0, elapsedMs: 0, playerName: '' }),
    [missions, cloudPieces, relays, badges, speakerOnBoard],
  )
  const showCloud = missions['fix-cloud'] === 'active'
  const markAmina = objectives.some((item) => item.id === 'amina')
  const markLado = objectives.some((item) => item.id === 'lado')
  const speakerRiding = speakerOnBoard && missions['speaker-rescue'] === 'active'
  const ladoHome = missions['speaker-rescue'] !== 'completed'
  const colors = [COLORS.blue, COLORS.red, COLORS.yellow, COLORS.green]

  return (
    <group>
      {objectives.map((objective) => (
        <Beacon key={objective.id} x={objective.x} z={objective.z} />
      ))}
      {showCloud &&
        CLOUD_ITEMS.filter((item) => !cloudPieces.includes(item.id)).map((item) => (
          <CloudCard key={item.id} label={item.label} x={item.x} z={item.z} color={item.color} />
        ))}
      {BADGES.filter((badge) => !badges.includes(badge.id)).map((badge, index) => (
        <Badge key={badge.id} x={badge.x} z={badge.z} color={colors[index % colors.length]} />
      ))}
      {RELAYS.map((relay) => (
        <Relay key={relay.id} {...relay} />
      ))}
      <group position={[NPCS.amina.x, 0, NPCS.amina.z]}>
        <LowPolyPerson shirt={COLORS.blue} skin="#8d552f" marker={markAmina} />
      </group>
      <group position={[NPCS.barista.x, 0, NPCS.barista.z]} rotation={[0, 0.4, 0]}>
        <LowPolyPerson shirt="#f4efe6" pants="#3a2a24" skin="#c48a5a" />
      </group>
      <group position={[NPCS.engineer.x, 0, NPCS.engineer.z]}>
        <LowPolyPerson shirt="#17324d" skin="#6f442c" hair="#111" />
      </group>
      <group position={[NPCS.officer.x, 0, NPCS.officer.z]} rotation={[0, Math.PI, 0]}>
        <LowPolyPerson shirt="#1d4f3a" pants="#1b2420" skin="#7a4b32" />
      </group>
      <group position={[164, 0, 121]}>
        <LowPolyPerson shirt={COLORS.green} skin="#a86b45" />
      </group>
      {!speakerRiding && (
        <group position={ladoHome ? [NPCS.lado.x, 0, NPCS.lado.z] : [8, 0, -252]} rotation={[0, ladoHome ? 0.8 : Math.PI, 0]}>
          <LowPolyPerson shirt="#f7f1e6" pants="#2c3138" skin="#96623d" marker={markLado} />
        </group>
      )}
      {PEDESTRIANS.map((person) => (
        <Walker key={person.shirt + person.path[0][0]} path={person.path} shirt={person.shirt} skin={person.skin} />
      ))}
      {MASCOTS.map((mascot, index) => (
        <group key={`${mascot.x}-${mascot.z}`} position={[mascot.x, 0, mascot.z]} rotation={[0, Math.PI + index * 0.6, 0]}>
          <Mascot color={mascot.color} glasses={mascot.glasses} scale={mascot.s} phase={index * 1.3} />
        </group>
      ))}
    </group>
  )
}
