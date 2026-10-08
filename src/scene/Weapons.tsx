import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Float } from '@react-three/drei'
import { Group, Mesh, MeshStandardMaterial, PointLight, Raycaster, Vector3 } from 'three'
import { playEmpty, playShot } from '../game/audio'
import { pickBot, type Shot } from '../game/combat'
import { COLORS, CRATES, PISTOL, type Crate as CrateDef } from '../game/content'
import { held } from '../game/keys'
import { pressed } from '../game/mouse'
import { pad } from '../game/pad'
import { runtime } from '../game/runtime'
import { useGame } from '../game/store'
import { labelTexture } from './textures'

const edges: Record<string, boolean> = {}
function edge(code: string) {
  const down = held(code)
  const fired = down && !edges[code]
  edges[code] = down
  return fired
}

const raycaster = new Raycaster()
const origin = new Vector3()
const direction = new Vector3()
const up = new Vector3(0, 1, 0)
const mid = new Vector3()
const delta = new Vector3()

/** Input, hitscan and reload logic for the Pulse Pistol. Renders tracer + muzzle flash. */
function PistolSystem() {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const tracer = useRef<Mesh>(null)
  const flash = useRef<Mesh>(null)
  const light = useRef<PointLight>(null)
  const spark = useRef<Mesh>(null)
  const seenTrigger = useRef(0)
  const lastShot = useRef(0)
  const lastEmptyTip = useRef(0)
  const holdFire = useRef(false)

  useFrame(() => {
    const state = useGame.getState()
    const now = performance.now()
    const onFoot = !state.vehicleId
    const live = state.phase === 'playing' && !state.dialogue && onFoot

    // Weapon select + reload.
    if (edge('Digit1')) state.equip('fists')
    if (edge('Digit2')) state.equip('pistol')
    if (edge('KeyR') && live && state.weapon === 'pistol') state.reload()
    if (runtime.reloadUntil > 0 && now >= runtime.reloadUntil) state.finishReload()

    const pistolOut = live && state.weapon === 'pistol' && state.hasPistol
    runtime.aiming = pistolOut && (pressed(2) || pad.aim)

    // Hitscan ray straight out of the camera through the crosshair.
    camera.getWorldDirection(direction)
    origin.copy(camera.position)
    const shot = {
      ox: origin.x,
      oy: origin.y,
      oz: origin.z,
      dx: direction.x,
      dy: direction.y,
      dz: direction.z,
      range: PISTOL.range + 8,
    }
    // Aimed shots follow the crosshair exactly; hip fire snaps to a bot inside a cone ahead (soft lock).
    const target = pistolOut ? pickBot(shot, PISTOL.hitRadius, runtime.aiming ? 0 : PISTOL.hipCone) : null
    runtime.aimOnTarget = !!target

    // Holding the left button fires at the pistol's rate; a click always fires at least once.
    const wantsFire = pistolOut && (runtime.triggerStamp > seenTrigger.current || (holdFire.current && pressed(0)) || pad.fire)
    if (runtime.triggerStamp > seenTrigger.current) {
      seenTrigger.current = runtime.triggerStamp
      holdFire.current = true
    }
    if (!pressed(0) && !pad.fire) holdFire.current = false

    if (wantsFire && now - lastShot.current >= PISTOL.fireMs && runtime.reloadUntil === 0) {
      lastShot.current = now
      if (!state.fireRound()) {
        playEmpty()
        if (!state.reload() && state.reserve <= 0 && now - lastEmptyTip.current > 6000) {
          lastEmptyTip.current = now
          useGame.setState({ toast: 'Out of ammo. Orange crates near the checkpoints refill the Pulse Pistol.' })
        }
      } else {
        fire(shot, target)
      }
    }

    // Tracer, muzzle flash and impact spark fade out over a few frames.
    const age = now - runtime.tracer.stamp
    if (tracer.current) tracer.current.visible = age < 90
    if (flash.current) {
      flash.current.visible = age < 60
      flash.current.scale.setScalar(1 - age / 60)
    }
    if (light.current) light.current.intensity = age < 70 ? 18 * (1 - age / 70) : 0
    if (spark.current) {
      spark.current.visible = age < 140 && runtime.tracer.toY > 0.05
      spark.current.scale.setScalar(0.6 + age / 140)
    }
  })

  function fire(shot: Shot, target: ReturnType<typeof pickBot>) {
    const now = performance.now()
    // Anything solid between the camera and the target blocks the shot.
    raycaster.set(origin, direction)
    raycaster.far = PISTOL.range + 8
    const solids = scene.getObjectByName('solids')
    const block = solids ? raycaster.intersectObject(solids, true)[0] : undefined
    let hitDistance = Math.min(PISTOL.range + 8, block?.distance ?? Number.POSITIVE_INFINITY)
    let landed = false
    if (target && target.t < hitDistance) {
      hitDistance = target.t
      landed = true
    } else if (shot.dy < -0.001) {
      // Nothing hit: the tracer ends where the ray meets the ground.
      hitDistance = Math.min(hitDistance, (0.05 - shot.oy) / shot.dy)
    }

    // Face the camera direction and fire from the right hand.
    runtime.yaw = runtime.camYaw
    const fx = Math.sin(runtime.yaw)
    const fz = -Math.cos(runtime.yaw)
    const rx = Math.cos(runtime.yaw)
    const rz = Math.sin(runtime.yaw)
    const fromX = runtime.x + rx * 0.3 + fx * 0.55
    const fromY = runtime.y + 1.32
    const fromZ = runtime.z + rz * 0.3 + fz * 0.55
    const toX = landed && target ? target.x : shot.ox + shot.dx * hitDistance
    const toY = landed && target ? target.y : shot.oy + shot.dy * hitDistance
    const toZ = landed && target ? target.z : shot.oz + shot.dz * hitDistance
    Object.assign(runtime.tracer, { fromX, fromY, fromZ, toX, toY, toZ, stamp: now })
    runtime.shotStamp = now
    playShot()

    if (landed && target) {
      const push = Math.hypot(shot.dx, shot.dz) || 1
      target.bot.hit(PISTOL.damage, shot.dx / push, shot.dz / push)
    }

    if (tracer.current) {
      mid.set((fromX + toX) / 2, (fromY + toY) / 2, (fromZ + toZ) / 2)
      delta.set(toX - fromX, toY - fromY, toZ - fromZ)
      const length = delta.length() || 0.01
      tracer.current.position.copy(mid)
      tracer.current.scale.set(1, length, 1)
      tracer.current.quaternion.setFromUnitVectors(up, delta.multiplyScalar(1 / length))
    }
    if (flash.current) flash.current.position.set(fromX, fromY, fromZ)
    if (light.current) light.current.position.set(fromX, fromY + 0.2, fromZ)
    if (spark.current) spark.current.position.set(toX, toY, toZ)
  }

  return (
    <group>
      <mesh ref={tracer} visible={false}>
        <cylinderGeometry args={[0.025, 0.025, 1, 6, 1, true]} />
        <meshBasicMaterial color="#9be7ff" transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh ref={flash} visible={false}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshBasicMaterial color="#dff6ff" toneMapped={false} />
      </mesh>
      <pointLight ref={light} intensity={0} distance={7} color="#9be7ff" />
      <mesh ref={spark} visible={false}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshBasicMaterial color="#ffb347" toneMapped={false} />
      </mesh>
    </group>
  )
}

/** A glowing supply crate. Pistol crate is one-shot; ammo crates come back after a while. */
function Crate({ crate }: { crate: CrateDef }) {
  const group = useRef<Group>(null)
  const shell = useRef<Mesh>(null)
  const color = crate.kind === 'pistol' ? COLORS.blue : '#ff8a3d'
  const label = useMemo(
    () => labelTexture(crate.kind === 'pistol' ? PISTOL.name.toUpperCase() : 'AMMO · +' + PISTOL.crateAmmo, '#102033', color, 512, 112),
    [crate.kind, color],
  )
  useFrame((state) => {
    const game = useGame.getState()
    const now = performance.now()
    const gone = (game.crateTaken[crate.id] ?? 0) > now || (crate.kind === 'pistol' && game.hasPistol)
    if (group.current) group.current.visible = !gone
    if (gone) return
    if (shell.current) {
      const material = shell.current.material as MeshStandardMaterial
      material.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.25
    }
    if (game.phase !== 'playing' || game.vehicleId || game.dialogue) return
    if (Math.hypot(crate.x - runtime.x, crate.z - runtime.z) < 1.9) game.pickupCrate(crate.id, crate.kind)
  })
  return (
    <group ref={group} position={[crate.x, 0, crate.z]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.1, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} />
      </mesh>
      <Float speed={2.4} rotationIntensity={0.6} floatIntensity={0.5} position={[0, 0.75, 0]}>
        <mesh ref={shell} castShadow>
          <boxGeometry args={[0.8, 0.5, 0.6]} />
          <meshStandardMaterial color="#1f2630" emissive={color} emissiveIntensity={0.5} roughness={0.45} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.31]}>
          <boxGeometry args={[0.5, 0.26, 0.02]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <boxGeometry args={[0.84, 0.06, 0.12]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </Float>
      <Billboard position={[0, 1.65, 0]}>
        <mesh>
          <planeGeometry args={[1.9, 0.42]} />
          <meshBasicMaterial map={label} toneMapped={false} transparent />
        </mesh>
      </Billboard>
    </group>
  )
}

export function Weapons() {
  return (
    <group>
      <PistolSystem />
      {CRATES.map((crate) => (
        <Crate key={crate.id} crate={crate} />
      ))}
    </group>
  )
}
