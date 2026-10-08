import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import type { Group, Mesh, MeshStandardMaterial } from 'three'
import { botRegistry } from '../game/combat'
import { COMBAT, DANGER_ZONES, type DangerZone } from '../game/content'
import { runtime } from '../game/runtime'
import { useGame } from '../game/store'

type BotProps = {
  zone: DangerZone
  index: number
  spawn: { x: number; z: number }
}

function RogueBot({ zone, index, spawn }: BotProps) {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const shell = useRef<Mesh>(null)
  const visor = useRef<Mesh>(null)
  const hp = useRef(COMBAT.botHealth)
  const alive = useRef(true)
  const respawnAt = useRef(0)
  const cooldown = useRef(0)
  const flash = useRef(0)
  const seenAttack = useRef(0)
  const face = useRef(0)
  const clock = useRef(0)
  /** Clock time until which the bot hunts the player even outside its zone (after being shot). */
  const alerted = useRef(0)

  // Expose this bot to the weapon system (hitscan from the camera).
  useEffect(() => {
    const id = `${zone.id}-${index}`
    botRegistry.set(id, {
      position: () => {
        const p = body.current?.translation()
        return p ? { x: p.x, y: p.y, z: p.z } : { x: spawn.x, y: -100, z: spawn.z }
      },
      alive: () => alive.current,
      hit: (damage, dirX, dirZ) => {
        if (!alive.current) return
        hp.current -= damage
        flash.current = 1
        alerted.current = clock.current + 8
        body.current?.applyImpulse({ x: dirX * 70, y: 30, z: dirZ * 70 }, true)
        if (hp.current <= 0) {
          alive.current = false
          respawnAt.current = clock.current + COMBAT.botRespawnSeconds
          useGame.getState().addKill()
        }
      },
    })
    return () => {
      botRegistry.delete(id)
    }
  }, [zone.id, index, spawn.x, spawn.z])

  useFrame((state, dt) => {
    const rigid = body.current
    if (!rigid) return
    const game = useGame.getState()
    const step = Math.min(dt, 0.05)
    const now = state.clock.elapsedTime
    clock.current = now

    if (!alive.current) {
      if (visual.current) visual.current.visible = false
      if (now >= respawnAt.current) {
        alive.current = true
        hp.current = COMBAT.botHealth
        rigid.setTranslation({ x: spawn.x, y: 1.2, z: spawn.z }, true)
        rigid.setLinvel({ x: 0, y: 0, z: 0 }, true)
      } else {
        rigid.setTranslation({ x: spawn.x, y: -60 - index * 5, z: spawn.z }, true)
        rigid.setLinvel({ x: 0, y: 0, z: 0 }, true)
        return
      }
    }
    if (visual.current) visual.current.visible = true

    const pos = rigid.translation()
    const vel = rigid.linvel()
    const dx = runtime.x - pos.x
    const dz = runtime.z - pos.z
    const dist = Math.hypot(dx, dz)
    const nearZone = Math.hypot(runtime.x - zone.x, runtime.z - zone.z) < zone.radius + 5
    // Bots hunt anyone inside the checkpoint, and chase a shooter for a while even from outside it.
    const playerInZone = nearZone || (now < alerted.current && dist < zone.radius + 45)
    const active = game.phase === 'playing' && !game.dialogue
    cooldown.current = Math.max(0, cooldown.current - step)
    flash.current = Math.max(0, flash.current - step * 4)

    let vx = 0
    let vz = 0
    if (active && playerInZone && dist > 0.9) {
      // Moving target: weave sideways, back off when close, and lunge in on a beat.
      const fx = dx / dist
      const fz = dz / dist
      const weave = Math.sin(now * 2.4 + index * 2.1)
      const dart = Math.sin(now * 0.7 + index * 1.4) > 0.55
      const approach = dist > 8 ? 1 : dist < 3.4 && !dart ? -0.5 : dart ? 1 : 0.08
      vx = fx * approach - fz * weave
      vz = fz * approach + fx * weave
      const mag = Math.hypot(vx, vz) || 1
      const speed = COMBAT.botSpeed * (dart ? 1.15 : 0.9)
      vx = (vx / mag) * speed
      vz = (vz / mag) * speed
    } else if (active && !playerInZone) {
      // Patrol a ring around the checkpoint instead of hovering on the spawn point.
      const angle = now * 0.55 + (index * Math.PI * 2) / 3
      const radius = Math.max(6, zone.radius * 0.62)
      const tx = zone.x + Math.cos(angle) * radius - pos.x
      const tz = zone.z + Math.sin(angle) * radius - pos.z
      const td = Math.hypot(tx, tz)
      if (td > 0.6) {
        vx = (tx / td) * 3.4
        vz = (tz / td) * 3.4
      }
    }
    if (!active) {
      vx = 0
      vz = 0
    }
    rigid.setLinvel({ x: vx, y: vel.y, z: vz }, true)

    if (active && playerInZone && dist < 1.75 && cooldown.current <= 0) {
      const slow = Math.abs(runtime.speed) < 3
      if (!runtime.vehicleId) {
        game.damage(COMBAT.botDamage)
        cooldown.current = COMBAT.botCooldown
      } else if (slow) {
        game.damage(COMBAT.botDamageInVehicle)
        cooldown.current = COMBAT.botCooldown
      }
    }

    if (runtime.attackStamp > seenAttack.current) {
      seenAttack.current = runtime.attackStamp
      if (!runtime.vehicleId && dist < COMBAT.punchRange) {
        const fx = Math.sin(runtime.yaw)
        const fz = -Math.cos(runtime.yaw)
        const facing = (-dx * fx + -dz * fz) / Math.max(0.001, dist)
        if (facing > 0.25) {
          hp.current -= COMBAT.punchDamage
          flash.current = 1
          rigid.applyImpulse({ x: (-dx / dist) * 180, y: 60, z: (-dz / dist) * 180 }, true)
          if (hp.current <= 0) eliminate(now)
        }
      }
    }

    if (alive.current && runtime.vehicleId && dist < 2.3 && Math.abs(runtime.speed) > 6) {
      eliminate(now)
    }

    if (visual.current) {
      visual.current.position.set(pos.x, pos.y - 0.6 + Math.sin(now * 3 + index) * 0.08, pos.z)
      const target = dist > 0.1 ? Math.atan2(dx, dz) : face.current
      face.current += Math.atan2(Math.sin(target - face.current), Math.cos(target - face.current)) * Math.min(1, step * 8)
      visual.current.rotation.y = face.current
      visual.current.rotation.z = -(vx * Math.cos(face.current) - vz * Math.sin(face.current)) * 0.03
    }
    if (shell.current) {
      const material = shell.current.material as MeshStandardMaterial
      material.emissiveIntensity = flash.current * 1.4
    }
    if (visor.current) {
      const material = visor.current.material as MeshStandardMaterial
      material.emissiveIntensity = playerInZone ? 1.6 + Math.sin(now * 9) * 0.4 : 0.6
    }

    function eliminate(time: number) {
      alive.current = false
      respawnAt.current = time + COMBAT.botRespawnSeconds
      useGame.getState().addKill()
    }
  })

  return (
    <>
      <RigidBody
        ref={body}
        colliders={false}
        lockRotations
        position={[spawn.x, 1.2, spawn.z]}
        mass={60}
        friction={0}
        restitution={0}
        canSleep={false}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider args={[0.3, 0.4]} position={[0, 0.7, 0]} friction={0} />
      </RigidBody>
      <group ref={visual} position={[spawn.x, 0.6, spawn.z]}>
        <mesh ref={shell} position={[0, 0.95, 0]} castShadow>
          <sphereGeometry args={[0.52, 20, 16]} />
          <meshStandardMaterial color="#2b303a" roughness={0.45} metalness={0.35} emissive="#ea4335" emissiveIntensity={0} />
        </mesh>
        <mesh ref={visor} position={[0, 1.02, 0.4]}>
          <boxGeometry args={[0.46, 0.14, 0.1]} />
          <meshStandardMaterial color="#ff5146" emissive="#ea4335" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.36, 0.22, 0.4, 14]} />
          <meshStandardMaterial color="#1c2026" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.06, 14]} />
          <meshStandardMaterial color="#8ab4f8" emissive="#1a73e8" emissiveIntensity={0.9} transparent opacity={0.7} />
        </mesh>
        <mesh position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.4, 6]} />
          <meshStandardMaterial color="#9aa3af" />
        </mesh>
        <mesh position={[0, 1.84, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color="#ea4335" emissive="#ea4335" emissiveIntensity={1.2} />
        </mesh>
        {[-0.5, 0.5].map((x) => (
          <mesh key={x} position={[x, 0.85, 0.1]} castShadow>
            <sphereGeometry args={[0.16, 12, 10]} />
            <meshStandardMaterial color="#3a404c" roughness={0.5} metalness={0.4} />
          </mesh>
        ))}
      </group>
    </>
  )
}

function ZoneMarker({ zone }: { zone: DangerZone }) {
  const lights = useRef<Group>(null)
  useFrame((state) => {
    if (!lights.current) return
    const on = Math.sin(state.clock.elapsedTime * 5) > 0
    lights.current.children.forEach((child, index) => {
      const mesh = child as Mesh
      const material = mesh.material as MeshStandardMaterial
      material.emissiveIntensity = (index % 2 === 0) === on ? 1.6 : 0.2
    })
  })
  const posts = [0, 1, 2, 3, 4, 5].map((i) => {
    const angle = (i / 6) * Math.PI * 2
    return [zone.x + Math.cos(angle) * zone.radius, zone.z + Math.sin(angle) * zone.radius] as const
  })
  return (
    <group>
      <mesh position={[zone.x, 0.12, zone.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[zone.radius - 0.6, zone.radius, 48]} />
        <meshBasicMaterial color="#ea4335" transparent opacity={0.5} />
      </mesh>
      <mesh position={[zone.x, 0.11, zone.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[zone.radius - 1.6, zone.radius - 1.0, 48]} />
        <meshBasicMaterial color="#f9ab00" transparent opacity={0.35} />
      </mesh>
      {posts.map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.7, z]} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 1.4, 8]} />
          <meshStandardMaterial color="#f4efe6" />
        </mesh>
      ))}
      <group ref={lights}>
        {posts.map(([x, z]) => (
          <mesh key={`l-${x}-${z}`} position={[x, 1.5, z]}>
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshStandardMaterial color="#ea4335" emissive="#ea4335" emissiveIntensity={1} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function Enemies() {
  return (
    <group>
      {DANGER_ZONES.map((zone) => (
        <group key={zone.id}>
          <ZoneMarker zone={zone} />
          {zone.bots.map((spawn, index) => (
            <RogueBot key={`${zone.id}-${index}`} zone={zone} index={index} spawn={spawn} />
          ))}
        </group>
      ))}
    </group>
  )
}
