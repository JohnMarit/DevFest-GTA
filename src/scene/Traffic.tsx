import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { Euler, Quaternion, type Group } from 'three'
import { TRAFFIC, type TrafficRoute } from '../game/content'
import { runtime } from '../game/runtime'
import { useGame } from '../game/store'
import { colliderFor, freshSignals, VehicleBody, type Signals } from './Vehicles'

const quat = new Quaternion()
const euler = new Euler(0, 0, 0, 'YXZ')

/** Positions along a closed polyline, returned as the car's rest spot plus heading. */
function sample(loop: [number, number][], distance: number) {
  let remaining = distance
  for (let i = 0; i < loop.length; i += 1) {
    const from = loop[i]
    const to = loop[(i + 1) % loop.length]
    const length = Math.hypot(to[0] - from[0], to[1] - from[1])
    if (remaining <= length) {
      const t = remaining / length
      return {
        x: from[0] + (to[0] - from[0]) * t,
        z: from[1] + (to[1] - from[1]) * t,
        yaw: Math.atan2(to[0] - from[0], -(to[1] - from[1])),
        corner: Math.min(remaining, length - remaining),
      }
    }
    remaining -= length
  }
  return { x: loop[0][0], z: loop[0][1], yaw: 0, corner: 99 }
}

function loopLength(loop: [number, number][]) {
  let total = 0
  for (let i = 0; i < loop.length; i += 1) {
    const from = loop[i]
    const to = loop[(i + 1) % loop.length]
    total += Math.hypot(to[0] - from[0], to[1] - from[1])
  }
  return total
}

function Car({ route, index }: { route: TrafficRoute; index: number }) {
  const body = useRef<RapierRigidBody>(null)
  const tilt = useRef<Group>(null)
  const signals = useRef<Signals>(freshSignals(true))
  const total = loopLength(route.loop)
  const progress = useRef(total * route.offset + index * 7)
  const speed = useRef(route.speed)
  const heading = useRef(0)
  const lastHit = useRef(0)
  const collider = colliderFor(route.kind)

  useFrame((_, dt) => {
    const rigid = body.current
    if (!rigid) return
    const state = useGame.getState()
    if (state.phase !== 'playing') return
    const step = Math.min(dt, 0.05)
    const here = sample(route.loop, progress.current)

    // Slow for corners, and for the player when they are ahead in the lane.
    let target = route.speed
    if (here.corner < 10) target = Math.min(target, 4 + here.corner * 0.5)
    const fx = Math.sin(here.yaw)
    const fz = -Math.cos(here.yaw)
    const dx = runtime.x - here.x
    const dz = runtime.z - here.z
    const ahead = dx * fx + dz * fz
    const lateral = Math.abs(dx * -fz + dz * fx)
    if (ahead > 0 && ahead < 14 && lateral < 3.2) {
      target = Math.min(target, Math.max(0, (ahead - 4) * 0.9))
    }
    const accel = target < speed.current ? 14 : 5
    speed.current += (target - speed.current) * Math.min(1, step * (accel / 6))
    progress.current = (progress.current + speed.current * step) % total

    const next = sample(route.loop, progress.current)
    // Pedestrians (the player on foot) get knocked when a car is still moving into them.
    const now = performance.now()
    if (!runtime.vehicleId && speed.current > 3 && Math.hypot(dx, dz) < 1.9 && now - lastHit.current > 1500) {
      lastHit.current = now
      state.damage(18)
      runtime.crashStamp = now
      runtime.crashForce = speed.current
    }
    heading.current += Math.atan2(Math.sin(next.yaw - heading.current), Math.cos(next.yaw - heading.current)) * Math.min(1, step * 6)
    euler.set(0, heading.current, 0)
    quat.setFromEuler(euler)
    rigid.setNextKinematicTranslation({ x: next.x, y: 0.05, z: next.z })
    rigid.setNextKinematicRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w })

    signals.current.spin = speed.current
    signals.current.brake = target < speed.current - 0.5 ? 1 : 0.15
    if (tilt.current) {
      const turn = Math.atan2(Math.sin(next.yaw - heading.current), Math.cos(next.yaw - heading.current))
      tilt.current.rotation.z = -turn * 0.4
    }
  })

  const start = sample(route.loop, progress.current)
  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[start.x, 0.05, start.z]}
      rotation={[0, start.yaw, 0]}
    >
      <CuboidCollider args={collider} position={[0, collider[1] + 0.08, 0]} />
      <group ref={tilt}>
        <VehicleBody kind={route.kind} signals={signals} color={route.color} />
      </group>
    </RigidBody>
  )
}

export function Traffic() {
  return (
    <group>
      {TRAFFIC.map((route, index) => (
        <Car key={index} route={route} index={index} />
      ))}
    </group>
  )
}
