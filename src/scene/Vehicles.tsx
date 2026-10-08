import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { Euler, Quaternion, type Group, type Mesh, type MeshStandardMaterial } from 'three'
import { clampToPaved, COLORS, drivableAt, nearestPaved, roadAt, VEHICLES } from '../game/content'
import { playBlip } from '../game/audio'
import { held } from '../game/keys'
import { pad } from '../game/pad'
import { runtime, vehicleMarks } from '../game/runtime'
import { useGame } from '../game/store'

export type VehicleKind = 'boda' | 'tuktuk' | 'suv'

/**
 * Arcade handling tuned per vehicle.
 * accel: m/s², max: m/s on tarmac, brake: m/s² when braking, reverse: max reverse speed,
 * steer: rad/s at low speed, steerHigh: multiplier kept at top speed, grip: lateral grip 0..1,
 * lean: body roll on turns, wheel: front wheel steering angle.
 */
const STATS = {
  boda: { accel: 15, max: 26, brake: 30, reverse: 6, steer: 2.6, steerHigh: 0.42, grip: 0.86, lean: 0.34, wheel: 0.5 },
  tuktuk: { accel: 9.5, max: 16, brake: 22, reverse: 5, steer: 2.1, steerHigh: 0.5, grip: 0.8, lean: 0.12, wheel: 0.6 },
  suv: { accel: 12, max: 21, brake: 28, reverse: 7, steer: 1.75, steerHigh: 0.38, grip: 0.92, lean: 0.07, wheel: 0.55 },
} as const

const OFFROAD_SPEED = 0.58
const quat = new Quaternion()
const euler = new Euler(0, 0, 0, 'YXZ')

function yawOf(body: RapierRigidBody) {
  const rotation = body.rotation()
  quat.set(rotation.x, rotation.y, rotation.z, rotation.w)
  euler.setFromQuaternion(quat)
  return euler.y
}

const paint = { roughness: 0.32, metalness: 0.3 }
const glass = { color: '#9fd6ea', roughness: 0.08, metalness: 0.65, transparent: true, opacity: 0.72 }

export type Signals = { spin: number; steer: number; brake: number; reverse: boolean; headlights: boolean; driver: boolean }

export function freshSignals(driver = false): Signals {
  return { spin: 0, steer: 0, brake: 0, reverse: false, headlights: true, driver }
}

function Wheel({
  position,
  radius,
  signals,
  width = 0.18,
  steering = false,
}: {
  position: [number, number, number]
  radius: number
  signals: { current: Signals }
  width?: number
  steering?: boolean
}) {
  const ref = useRef<Group>(null)
  const hub = useRef<Group>(null)
  useFrame((_, dt) => {
    if (hub.current) hub.current.rotation.x += (signals.current.spin * Math.min(dt, 0.05)) / radius
    if (ref.current && steering) ref.current.rotation.y = -signals.current.steer
  })
  return (
    <group ref={ref} position={position}>
      <group ref={hub}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[radius, radius, width, 18]} />
          <meshStandardMaterial color="#1b1b1d" roughness={0.92} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[radius * 0.55, radius * 0.55, width + 0.02, 12]} />
          <meshStandardMaterial color="#cfd3d9" roughness={0.25} metalness={0.75} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} rotation={[(i / 5) * Math.PI * 2, 0, 0]} position={[0, 0, 0]}>
            <boxGeometry args={[width + 0.03, radius * 0.9, 0.04]} />
            <meshStandardMaterial color="#9aa1aa" roughness={0.3} metalness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Lamp({
  position,
  signals,
  kind,
  size = [0.3, 0.1, 0.05],
}: {
  position: [number, number, number]
  signals: { current: Signals }
  kind: 'brake' | 'head' | 'reverse'
  size?: [number, number, number]
}) {
  const ref = useRef<Mesh>(null)
  useFrame(() => {
    if (!ref.current) return
    const material = ref.current.material as MeshStandardMaterial
    const s = signals.current
    if (kind === 'brake') material.emissiveIntensity = 0.25 + s.brake * 1.6
    else if (kind === 'reverse') material.emissiveIntensity = s.reverse ? 1.6 : 0.05
    else material.emissiveIntensity = s.headlights ? 0.9 : 0.1
  })
  const color = kind === 'brake' ? COLORS.red : kind === 'reverse' ? '#ffffff' : '#fff6d6'
  const emissive = kind === 'brake' ? COLORS.red : kind === 'reverse' ? '#ffffff' : '#ffd36a'
  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.3} toneMapped={false} />
    </mesh>
  )
}

function Boda({ signals, color }: { signals: { current: Signals }; color: string }) {
  return (
    <group>
      <RoundedBox args={[0.28, 0.18, 1.45]} radius={0.06} position={[0, 0.58, 0]} castShadow>
        <meshStandardMaterial color="#202833" {...paint} />
      </RoundedBox>
      <RoundedBox args={[0.36, 0.14, 0.46]} radius={0.06} position={[0, 0.76, -0.1]} castShadow>
        <meshStandardMaterial color={color} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.3, 0.26, 0.4]} radius={0.08} position={[0, 0.62, 0.22]} castShadow>
        <meshStandardMaterial color={color} {...paint} />
      </RoundedBox>
      <mesh position={[0, 0.88, 0.48]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 8]} />
        <meshStandardMaterial color="#111418" metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.18, 0.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
        <meshStandardMaterial color="#111418" metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.8, 0.64]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshStandardMaterial color="#fff2c0" emissive={COLORS.yellow} emissiveIntensity={0.8} />
      </mesh>
      <Lamp position={[0, 0.72, -0.74]} signals={signals} kind="brake" size={[0.14, 0.08, 0.04]} />
      <Wheel position={[0, 0.32, 0.62]} radius={0.32} signals={signals} width={0.12} steering />
      <Wheel position={[0, 0.32, -0.62]} radius={0.32} signals={signals} width={0.14} />
    </group>
  )
}

function TukTuk({ signals, color }: { signals: { current: Signals }; color: string }) {
  return (
    <group>
      <RoundedBox args={[1.25, 0.9, 1.7]} radius={0.18} position={[0, 0.7, 0.1]} castShadow>
        <meshStandardMaterial color={color} {...paint} />
      </RoundedBox>
      <RoundedBox args={[1.38, 0.14, 1.9]} radius={0.06} position={[0, 1.22, 0.1]} castShadow>
        <meshStandardMaterial color={COLORS.green} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0.86, 0.97]}>
        <planeGeometry args={[1.05, 0.5]} />
        <meshStandardMaterial {...glass} side={2} />
      </mesh>
      {[-0.63, 0.63].map((x) => (
        <mesh key={x} position={[x, 0.9, 0.2]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.1, 0.42]} />
          <meshStandardMaterial {...glass} side={2} />
        </mesh>
      ))}
      <RoundedBox args={[1.2, 0.2, 1.9]} radius={0.05} position={[0, 0.45, 0.15]} castShadow>
        <meshStandardMaterial color="#243040" roughness={0.6} />
      </RoundedBox>
      <Lamp position={[0, 0.62, 1.06]} signals={signals} kind="head" size={[0.22, 0.14, 0.05]} />
      {[-0.42, 0.42].map((x) => (
        <Lamp key={x} position={[x, 0.7, -0.78]} signals={signals} kind="brake" size={[0.22, 0.1, 0.05]} />
      ))}
      <Wheel position={[-0.62, 0.3, 0.55]} radius={0.3} signals={signals} steering />
      <Wheel position={[0.62, 0.3, 0.55]} radius={0.3} signals={signals} steering />
      <Wheel position={[0, 0.3, -0.78]} radius={0.3} signals={signals} />
    </group>
  )
}

function Suv({ signals, color }: { signals: { current: Signals }; color: string }) {
  return (
    <group>
      <RoundedBox args={[1.7, 0.5, 3.8]} radius={0.14} position={[0, 0.58, 0]} castShadow>
        <meshStandardMaterial color={color} {...paint} />
      </RoundedBox>
      <RoundedBox args={[1.55, 0.72, 2.1]} radius={0.2} position={[0, 1.08, -0.15]} castShadow>
        <meshStandardMaterial color={color} {...paint} />
      </RoundedBox>
      <mesh position={[0, 1.1, 0.92]} rotation={[-0.3, 0, 0]}>
        <planeGeometry args={[1.4, 0.5]} />
        <meshStandardMaterial {...glass} side={2} />
      </mesh>
      <mesh position={[0, 1.1, -1.22]} rotation={[0.3, 0, 0]}>
        <planeGeometry args={[1.3, 0.46]} />
        <meshStandardMaterial {...glass} side={2} />
      </mesh>
      {[-0.79, 0.79].map((x) => (
        <mesh key={x} position={[x, 1.12, -0.15]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.8, 0.42]} />
          <meshStandardMaterial {...glass} side={2} />
        </mesh>
      ))}
      <RoundedBox args={[1.74, 0.12, 3.84]} radius={0.04} position={[0, 0.74, 0]}>
        <meshStandardMaterial color={COLORS.blue} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[1.5, 0.08, 1.6]} radius={0.03} position={[0, 1.48, -0.15]}>
        <meshStandardMaterial color="#1c2430" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0.5, 1.93]}>
        <boxGeometry args={[1.5, 0.2, 0.08]} />
        <meshStandardMaterial color="#1c2430" roughness={0.6} />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <Lamp key={x} position={[x, 0.66, 1.92]} signals={signals} kind="head" size={[0.34, 0.12, 0.06]} />
      ))}
      {[-0.6, 0.6].map((x) => (
        <Lamp key={x} position={[x, 0.66, -1.92]} signals={signals} kind="brake" size={[0.32, 0.1, 0.05]} />
      ))}
      {[-0.3, 0.3].map((x) => (
        <Lamp key={x} position={[x, 0.56, -1.92]} signals={signals} kind="reverse" size={[0.14, 0.06, 0.05]} />
      ))}
      <Wheel position={[-0.8, 0.34, 1.25]} radius={0.34} signals={signals} width={0.24} steering />
      <Wheel position={[0.8, 0.34, 1.25]} radius={0.34} signals={signals} width={0.24} steering />
      <Wheel position={[-0.8, 0.34, -1.25]} radius={0.34} signals={signals} width={0.24} />
      <Wheel position={[0.8, 0.34, -1.25]} radius={0.34} signals={signals} width={0.24} />
    </group>
  )
}

const DEFAULT_PAINT: Record<VehicleKind, string> = { boda: COLORS.red, tuktuk: COLORS.yellow, suv: '#f4f7fb' }

/** Seated driver, shown while someone is riding. Built in body space where +z is the nose. */
function Rider({ signals, seat, shirt }: { signals: { current: Signals }; seat: [number, number, number]; shirt: string }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.visible = signals.current.driver
  })
  return (
    <group ref={ref} position={seat} visible={false}>
      <mesh position={[0, 0.34, 0]} castShadow>
        <boxGeometry args={[0.42, 0.5, 0.26]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.74, 0.02]} castShadow>
        <sphereGeometry args={[0.15, 12, 10]} />
        <meshStandardMaterial color="#a86b45" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.84, 0]}>
        <sphereGeometry args={[0.16, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1b140f" roughness={1} />
      </mesh>
      {[-0.26, 0.26].map((x) => (
        <mesh key={x} position={[x, 0.42, 0.22]} rotation={[-0.9, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 0.46, 0.1]} />
          <meshStandardMaterial color={shirt} roughness={0.8} />
        </mesh>
      ))}
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.08, 0.2]} rotation={[-1.2, 0, 0]} castShadow>
          <boxGeometry args={[0.13, 0.5, 0.13]} />
          <meshStandardMaterial color="#243040" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Shared vehicle body used by player rides and AI traffic.
 * The meshes are modelled nose-toward +z; the sim drives toward -z, so the body is turned around here.
 */
export function VehicleBody({ kind, signals, color }: { kind: VehicleKind; signals: { current: Signals }; color?: string }) {
  const tint = color ?? DEFAULT_PAINT[kind]
  return (
    <group rotation={[0, Math.PI, 0]}>
      {kind === 'boda' && (
        <>
          <Boda signals={signals} color={tint} />
          <Rider signals={signals} seat={[0, 0.7, -0.12]} shirt="#1a73e8" />
        </>
      )}
      {kind === 'tuktuk' && (
        <>
          <TukTuk signals={signals} color={tint} />
          <Rider signals={signals} seat={[0, 0.36, 0.4]} shirt="#1a73e8" />
        </>
      )}
      {kind === 'suv' && <Suv signals={signals} color={tint} />}
    </group>
  )
}

export function colliderFor(kind: VehicleKind): [number, number, number] {
  return kind === 'boda' ? [0.4, 0.45, 1.05] : kind === 'tuktuk' ? [0.7, 0.65, 1.15] : [0.9, 0.65, 2.05]
}

function Ride({
  id,
  kind,
  label,
  x,
  z,
  yaw,
}: {
  id: string
  kind: VehicleKind
  label: string
  x: number
  z: number
  yaw: number
}) {
  const body = useRef<RapierRigidBody>(null)
  const heading = useRef(yaw)
  const signals = useRef<Signals>(freshSignals())
  const speedRef = useRef(0)
  const steerRef = useRef(0)
  const wasActive = useRef(false)
  const ring = useRef<Group>(null)
  const tilt = useRef<Group>(null)
  const lean = useRef(0)
  const pitchRef = useRef(0)
  const lastCrash = useRef(0)
  const stats = STATS[kind]
  const collider = colliderFor(kind)

  useFrame((_, dt) => {
    const rigid = body.current
    if (!rigid) return
    const step = Math.min(dt, 0.05)
    const state = useGame.getState()
    const active = state.vehicleId === id
    const pos = rigid.translation()
    vehicleMarks.set(id, { x: pos.x, y: pos.y, z: pos.z, label })

    if (active && !wasActive.current) {
      heading.current = yawOf(rigid)
      runtime.look = 0
      steerRef.current = 0
    }
    wasActive.current = active

    const vel = rigid.linvel()
    let steerInput = 0

    if (active) {
      const driving = state.phase === 'playing' && !state.dialogue
      if (driving) {
        if (held('KeyA') || held('ArrowLeft')) steerInput -= 1
        if (held('KeyD') || held('ArrowRight')) steerInput += 1
        steerInput = Math.max(-1, Math.min(1, steerInput + pad.x))
      }
      // Smooth steering: quick to turn in, quicker to return to center.
      const steerRate = steerInput === 0 ? 7 : 5
      steerRef.current += (steerInput - steerRef.current) * Math.min(1, step * steerRate)

      const road = roadAt(pos.x, pos.z)
      const onRoad = !!road
      runtime.onRoad = onRoad
      runtime.roadName = road?.name ?? ''
      const maxSpeed = stats.max * (onRoad ? 1 : OFFROAD_SPEED)

      const speed = speedRef.current
      const absSpeed = Math.abs(speed)
      const forward = driving && (held('KeyW') || held('ArrowUp') || pad.y > 0.28)
      const back = driving && (held('KeyS') || held('ArrowDown') || pad.y < -0.28)
      const handbrake = driving && held('Space')

      // Speed-sensitive steering: tight at low speed, settles at high speed.
      const turnAuthority = Math.min(1, absSpeed / 3.5)
      const highSpeedFade = stats.steerHigh + (1 - stats.steerHigh) / (1 + absSpeed / 9)
      const drift = handbrake && absSpeed > 5 ? 1.45 : 1
      heading.current += steerRef.current * stats.steer * turnAuthority * highSpeedFade * drift * step * Math.sign(speed || 1)

      // Longitudinal model: throttle, braking before reversing, drag, handbrake.
      let brake = 0
      let reversing = false
      if (forward) {
        if (speed < -0.5) {
          speedRef.current = Math.min(0, speed + stats.brake * step)
          brake = 1
        } else {
          const headroom = Math.max(0, 1 - speed / maxSpeed)
          speedRef.current = Math.min(maxSpeed, speed + stats.accel * (0.35 + 0.65 * headroom) * step)
        }
      } else if (back) {
        if (speed > 0.5) {
          speedRef.current = Math.max(0, speed - stats.brake * step)
          brake = 1
        } else {
          speedRef.current = Math.max(-stats.reverse, speed - stats.accel * 0.6 * step)
          reversing = true
        }
      } else {
        speedRef.current = speed * Math.exp((driving ? -0.55 : -5) * step) - Math.sign(speed) * Math.min(absSpeed, 0.9 * step)
        if (driving && absSpeed > 1) brake = 0.15
      }
      if (handbrake) {
        speedRef.current *= Math.exp(-2.1 * step)
        brake = 1
      }
      if (!onRoad && speedRef.current > maxSpeed) {
        speedRef.current += (maxSpeed - speedRef.current) * Math.min(1, step * 2.2)
      }
      const along = speedRef.current

      const fx = Math.sin(heading.current)
      const fz = -Math.cos(heading.current)
      const rx = Math.cos(heading.current)
      const rz = Math.sin(heading.current)

      // Collision feedback: if physics stopped the car, drop our commanded speed too.
      const actualAlong = vel.x * fx + vel.z * fz
      const now = performance.now()
      const recentlyKerbed = now - runtime.edgeStamp < 250
      if (!recentlyKerbed && Math.abs(along) > 4 && Math.abs(actualAlong) < Math.abs(along) * 0.45 && now - lastCrash.current > 350) {
        const force = Math.abs(along - actualAlong)
        speedRef.current = actualAlong * 0.6
        lastCrash.current = now
        runtime.crashStamp = now
        runtime.crashForce = force
        if (force > 6) playBlip(90)
      }

      const lateral = vel.x * rx + vel.z * rz
      const grip = handbrake ? 0.25 : stats.grip
      const side = lateral * (1 - grip) + steerRef.current * (handbrake ? -absSpeed * 0.28 : 0)
      let vx = fx * speedRef.current + rx * side
      let vz = fz * speedRef.current + rz * side

      // Road barrier: vehicles stay on tarmac. If the next step would leave every paved surface,
      // slide along the kerb of the nearest one instead and scrub some speed.
      const predictedX = pos.x + vx * step
      const predictedZ = pos.z + vz * step
      if (!drivableAt(predictedX, predictedZ)) {
        const paved = nearestPaved(pos.x, pos.z)
        const clamped = clampToPaved(paved, predictedX, predictedZ)
        const cx = (clamped.x - pos.x) / step
        const cz = (clamped.z - pos.z) / step
        const wanted = Math.hypot(vx, vz)
        const allowed = Math.hypot(cx, cz)
        const limit = Math.max(Math.abs(speedRef.current), 6)
        const scale = allowed > limit ? limit / allowed : 1
        vx = cx * scale
        vz = cz * scale
        if (wanted > 0.5) {
          const kept = Math.min(1, allowed / wanted)
          speedRef.current *= 0.75 + 0.25 * kept
          if (kept < 0.7 && now - runtime.edgeStamp > 400) {
            runtime.edgeStamp = now
            if (wanted > 6) playBlip(140)
          }
        }
      }

      euler.set(0, heading.current, 0)
      quat.setFromEuler(euler)
      rigid.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w }, true)
      rigid.setAngvel({ x: 0, y: 0, z: 0 }, true)
      rigid.setLinvel({ x: vx, y: vel.y, z: vz }, true)

      runtime.x = pos.x
      runtime.y = pos.y
      runtime.z = pos.z
      runtime.yaw = heading.current
      runtime.speed = speedRef.current
      runtime.steer = steerRef.current
      runtime.braking = brake
      runtime.reversing = reversing
      runtime.vehicleId = id
      runtime.vehicleLabel = label
      runtime.exitPoint = {
        x: pos.x + rx * (collider[0] + 1.3),
        y: pos.y + 0.4,
        z: pos.z + rz * (collider[0] + 1.3),
      }
      signals.current.spin = speedRef.current
      signals.current.brake = brake
      signals.current.reverse = reversing
      signals.current.steer = steerRef.current * stats.wheel
      signals.current.driver = true
      if (ring.current) ring.current.visible = false

      // Body pitch: nose lifts under throttle, dips under braking (rotation about +x lifts -z).
      const targetPitch = forward && !brake ? 0.028 : brake ? -0.04 * Math.min(1, absSpeed / 8) : 0
      pitchRef.current += (targetPitch - pitchRef.current) * Math.min(1, step * 5)
    } else {
      speedRef.current *= Math.exp(-2 * step)
      steerRef.current *= Math.exp(-4 * step)
      signals.current.spin = Math.hypot(vel.x, vel.z)
      signals.current.brake = 0
      signals.current.reverse = false
      signals.current.steer = steerRef.current * stats.wheel
      signals.current.driver = false
      pitchRef.current *= Math.exp(-4 * step)
      if (ring.current) {
        const dx = pos.x - runtime.x
        const dz = pos.z - runtime.z
        ring.current.visible = !state.vehicleId && dx * dx + dz * dz < 11
      }
    }

    // Bikes lean into the turn; cars roll outward.
    const leanSign = kind === 'boda' ? -1 : 1
    const targetLean = leanSign * steerRef.current * stats.lean * Math.min(1, Math.abs(speedRef.current) / 8)
    lean.current += (targetLean - lean.current) * Math.min(1, step * 6)
    if (tilt.current) {
      const rough = active && !runtime.onRoad ? Math.sin(performance.now() * 0.03) * 0.006 * Math.min(1, Math.abs(speedRef.current) / 5) : 0
      tilt.current.rotation.z = lean.current + rough
      tilt.current.rotation.x = pitchRef.current + rough * 0.5
    }
  })

  return (
    <RigidBody
      ref={body}
      position={[x, 1.3, z]}
      rotation={[0, yaw, 0]}
      colliders={false}
      mass={kind === 'suv' ? 260 : kind === 'tuktuk' ? 140 : 80}
      linearDamping={0.35}
      angularDamping={3}
      friction={0}
      restitution={0}
      ccd
      canSleep={false}
      enabledRotations={[false, true, false]}
    >
      <CuboidCollider args={collider} position={[0, collider[1] + 0.08, 0]} friction={0} />
      <group ref={tilt}>
        <VehicleBody kind={kind} signals={signals} />
      </group>
      <group ref={ring} position={[0, 0.05, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.1, 1.28, 32]} />
          <meshBasicMaterial color={COLORS.yellow} transparent opacity={0.8} />
        </mesh>
      </group>
    </RigidBody>
  )
}

export function Vehicles() {
  return (
    <group>
      {VEHICLES.map((vehicle) => (
        <Ride key={vehicle.id} {...vehicle} />
      ))}
    </group>
  )
}
