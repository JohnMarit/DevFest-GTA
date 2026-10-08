import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import type { Group } from 'three'
import { PLAYER_START } from '../game/content'
import { held } from '../game/keys'
import { pad } from '../game/pad'
import { runtime } from '../game/runtime'
import { useGame } from '../game/store'
import { LowPolyPerson } from './Person'

const prev: Record<string, boolean> = {}

function edge(code: string) {
  const down = held(code)
  const fired = down && !prev[code]
  prev[code] = down
  return fired
}

export function Player() {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const face = useRef(0)
  const wasRiding = useRef(false)
  const seenRespawn = useRef(0)

  useFrame((_, dt) => {
    const rigid = body.current
    if (!rigid) return
    const state = useGame.getState()
    const step = Math.min(dt, 0.05)
    const riding = !!state.vehicleId

    if (state.respawnToken !== seenRespawn.current) {
      seenRespawn.current = state.respawnToken
      rigid.setTranslation({ x: state.respawnPoint.x, y: 1.5, z: state.respawnPoint.z }, true)
      rigid.setLinvel({ x: 0, y: 0, z: 0 }, true)
      wasRiding.current = false
      runtime.camYaw = runtime.yaw
    }
    if (visual.current) visual.current.visible = !riding
    if (wasRiding.current && !riding) {
      rigid.setTranslation(
        { x: runtime.exitPoint.x, y: Math.max(1, runtime.exitPoint.y), z: runtime.exitPoint.z },
        true,
      )
      rigid.setLinvel({ x: 0, y: 0, z: 0 }, true)
      // Keep the camera where the car left it; the character steps out facing the car's heading.
      runtime.camYaw = runtime.yaw
      face.current = runtime.yaw
    }
    wasRiding.current = riding

    if (riding) {
      rigid.setTranslation({ x: 0, y: -40, z: 0 }, true)
      rigid.setLinvel({ x: 0, y: 0, z: 0 }, true)
      rigid.setAngvel({ x: 0, y: 0, z: 0 }, true)
      pad.jump = false
      return
    }

    const pos = rigid.translation()
    const vel = rigid.linvel()
    const locked = state.phase !== 'playing' || !!state.dialogue

    if (!locked) {
      // Modern third-person controls: WASD is relative to the camera, the character turns to face
      // where they move, and the mouse orbits the camera freely.
      let ix = 0
      let iz = 0
      if (held('KeyA') || held('ArrowLeft')) ix -= 1
      if (held('KeyD') || held('ArrowRight')) ix += 1
      if (held('KeyW') || held('ArrowUp')) iz += 1
      if (held('KeyS') || held('ArrowDown')) iz -= 1
      if (Math.abs(pad.x) > 0.12) ix += pad.x
      if (Math.abs(pad.y) > 0.12) iz += pad.y
      const cam = runtime.camYaw
      const cfx = Math.sin(cam)
      const cfz = -Math.cos(cam)
      const crx = Math.cos(cam)
      const crz = Math.sin(cam)
      let mx = cfx * iz + crx * ix
      let mz = cfz * iz + crz * ix
      const length = Math.hypot(mx, mz)
      const moving = length > 0.01
      const aiming = runtime.aiming
      const recentShot = performance.now() - runtime.shotStamp < 600
      if (aiming || recentShot) {
        // Shooter stance: face where the camera looks and strafe.
        runtime.yaw += Math.atan2(Math.sin(cam - runtime.yaw), Math.cos(cam - runtime.yaw)) * Math.min(1, step * 20)
      }
      if (moving) {
        mx /= length
        mz /= length
        if (!aiming && !recentShot) {
          const targetYaw = Math.atan2(mx, -mz)
          runtime.yaw += Math.atan2(Math.sin(targetYaw - runtime.yaw), Math.cos(targetYaw - runtime.yaw)) * Math.min(1, step * 14)
          // Gentle camera follow while walking forward, like most third-person games.
          if (iz > 0 && ix === 0) {
            runtime.camYaw += Math.atan2(Math.sin(runtime.yaw - runtime.camYaw), Math.cos(runtime.yaw - runtime.camYaw)) * Math.min(1, step * 0.9)
          }
        }
      }
      const wantsSprint = (held('ShiftLeft') || held('ShiftRight') || pad.sprint) && moving && !aiming
      const sprint = wantsSprint && runtime.stamina > 0.02
      runtime.stamina = sprint
        ? Math.max(0, runtime.stamina - step * 0.22)
        : Math.min(1, runtime.stamina + step * (moving ? 0.16 : 0.3))
      const punching = performance.now() < runtime.punchUntil
      const speed = !moving ? 0 : punching ? 1.5 : aiming ? 3.4 : sprint ? 10.5 : 5.5
      const tx = mx * speed
      const tz = mz * speed
      const blend = Math.min(1, step * 12)
      const nx = vel.x + (tx - vel.x) * blend
      const nz = vel.z + (tz - vel.z) * blend
      const grounded = pos.y < 0.55 && vel.y < 2
      let nextY = vel.y
      if ((edge('Space') || pad.jump) && grounded) nextY = 8.2
      pad.jump = false
      rigid.setLinvel({ x: nx, y: nextY, z: nz }, true)
    } else {
      rigid.setLinvel({ x: 0, y: vel.y, z: 0 }, true)
      edge('Space')
      pad.jump = false
    }

    const next = rigid.translation()
    const nextVel = rigid.linvel()
    runtime.x = next.x
    runtime.y = next.y
    runtime.z = next.z
    runtime.vehicleId = null
    runtime.speed = Math.hypot(nextVel.x, nextVel.z)
    face.current += Math.atan2(Math.sin(runtime.yaw - face.current), Math.cos(runtime.yaw - face.current)) * Math.min(1, step * 12)
    if (visual.current) {
      visual.current.rotation.y = face.current
      visual.current.position.set(next.x, Math.max(0, next.y + 0.2), next.z)
    }
  })

  return (
    <>
      <RigidBody
        ref={body}
        colliders={false}
        lockRotations
        position={[PLAYER_START.x, PLAYER_START.y, PLAYER_START.z]}
        mass={70}
        friction={0}
        restitution={0}
        ccd
        canSleep={false}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider args={[0.42, 0.32]} position={[0, 0.95, 0]} friction={0} restitution={0} />
      </RigidBody>
      <group ref={visual} position={[PLAYER_START.x, 0, PLAYER_START.z]}>
        <LowPolyPerson shirt="#1a73e8" pants="#243040" skin="#a86b45" hair="#1b140f" followSpeed />
      </group>
    </>
  )
}
