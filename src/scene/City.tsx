import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Sky } from '@react-three/drei'
import type { Group, InstancedMesh, Mesh, MeshStandardMaterial } from 'three'
import { Object3D, Quaternion, Vector3 } from 'three'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import {
  BOLLARDS,
  BUILDINGS,
  COLORS,
  DRIVABLE,
  EVENT,
  LANDMARKS,
  ROADS,
  SIGNPOSTS,
  STATION,
  STREET_SIGNS,
  TREES,
  VEHICLES,
  gateOpen,
} from '../game/content'
import { useGame } from '../game/store'
import { Mascot } from './Mascot'
import { asphaltTexture, labelTexture, plateTexture, sandTexture, signTexture, venueBanner, windowTexture } from './textures'

const dummy = new Object3D()
const UP = new Vector3(0, 1, 0)

function Road() {
  const base = useMemo(() => asphaltTexture(), [])
  const maps = useMemo(
    () =>
      ROADS.map((road) => {
        const texture = base.clone()
        texture.repeat.set(road.w / 7, road.d / 7)
        texture.needsUpdate = true
        return texture
      }),
    [base],
  )
  return (
    <group>
      {ROADS.map((road, index) => {
        const vertical = road.d > road.w
        const dashes: number[] = []
        const length = vertical ? road.d : road.w
        for (let offset = -length / 2 + 3; offset < length / 2 - 3; offset += 7) dashes.push(offset)
        return (
          <group key={`${road.x}-${road.z}-${road.w}`} position={[road.x, 0, road.z]}>
            <mesh position={[0, 0.045, 0]} receiveShadow castShadow>
              <boxGeometry args={[road.w + 1.8, 0.1, road.d + 1.8]} />
              <meshStandardMaterial color={COLORS.curb} roughness={1} />
            </mesh>
            <mesh position={[0, 0.09, 0]} receiveShadow>
              <boxGeometry args={[road.w, 0.06, road.d]} />
              <meshStandardMaterial map={maps[index]} color="#101216" roughness={0.92} />
            </mesh>
            {dashes.map((offset) => (
              <mesh
                key={offset}
                position={vertical ? [0, 0.13, offset] : [offset, 0.13, 0]}
              >
                <boxGeometry args={vertical ? [0.2, 0.012, 3] : [3, 0.012, 0.2]} />
                <meshStandardMaterial color="#f7f7f2" roughness={0.8} />
              </mesh>
            ))}
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                position={vertical ? [side * (road.w / 2 - 0.35), 0.13, 0] : [0, 0.13, side * (road.d / 2 - 0.35)]}
              >
                <boxGeometry args={vertical ? [0.16, 0.012, road.d * 0.98] : [road.w * 0.98, 0.012, 0.16]} />
                <meshStandardMaterial color="#f7f7f2" roughness={0.8} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

/** Concrete lots, forecourts and tracks that vehicles may use besides the streets. */
function PavedAreas() {
  return (
    <group>
      {DRIVABLE.map((area) => (
        <mesh key={area.name} position={[area.x, 0.035, area.z]} receiveShadow>
          <boxGeometry args={[area.w, 0.07, area.d]} />
          <meshStandardMaterial color={area.name.includes('track') || area.name.includes('lane') ? '#b9a378' : '#cfc8ba'} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

/** Kerb bollards marking the road barrier: white posts with a red band. */
function Bollards() {
  const posts = useRef<InstancedMesh>(null)
  const bands = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    BOLLARDS.forEach((spot, index) => {
      dummy.position.set(spot.x, 0.45, spot.z)
      dummy.scale.set(1, 1, 1)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      posts.current?.setMatrixAt(index, dummy.matrix)
      dummy.position.set(spot.x, 0.78, spot.z)
      dummy.updateMatrix()
      bands.current?.setMatrixAt(index, dummy.matrix)
    })
    for (const mesh of [posts.current, bands.current]) {
      if (!mesh) continue
      mesh.instanceMatrix.needsUpdate = true
      mesh.frustumCulled = false
    }
  }, [])
  return (
    <group>
      <instancedMesh ref={posts} args={[undefined, undefined, BOLLARDS.length]} castShadow>
        <cylinderGeometry args={[0.11, 0.13, 0.9, 8]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={bands} args={[undefined, undefined, BOLLARDS.length]}>
        <cylinderGeometry args={[0.12, 0.12, 0.16, 8]} />
        <meshStandardMaterial color={COLORS.red} emissive={COLORS.red} emissiveIntensity={0.25} roughness={0.6} />
      </instancedMesh>
    </group>
  )
}

/** Hai Malakal Motor Station: the start. Covered bays, a dispatcher, and a sign. */
function MotorStation() {
  const bays = VEHICLES.filter((vehicle) => Math.abs(vehicle.z - STATION.bayZ) < 1 && Math.abs(vehicle.x - STATION.x) < STATION.w / 2)
  const board = useMemo(() => labelTexture('HAI MALAKAL MOTOR STATION', '#102033', '#f9ab00', 768, 128), [])
  const pick = useMemo(() => labelTexture('PICK A RIDE · F', COLORS.blue, '#ffffff', 512, 128), [])
  return (
    <group>
      {/* Canopy over the bays */}
      <RoundedBox args={[40, 0.5, 11]} radius={0.18} position={[STATION.x - 11, 4.4, STATION.bayZ - 0.5]} castShadow>
        <meshStandardMaterial color="#f7f3ea" roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[40.4, 0.18, 11.4]} radius={0.06} position={[STATION.x - 11, 4.75, STATION.bayZ - 0.5]}>
        <meshStandardMaterial color={COLORS.blue} roughness={0.5} />
      </RoundedBox>
      {[-18, -6, 6, 18].map((dx) => (
        <mesh key={dx} position={[STATION.x - 11 + dx, 2.2, STATION.bayZ - 5.5]} castShadow>
          <cylinderGeometry args={[0.16, 0.18, 4.4, 10]} />
          <meshStandardMaterial color="#d0d5dc" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
      {/* Bay markings */}
      {bays.map((vehicle) => (
        <group key={vehicle.id}>
          <mesh position={[vehicle.x, 0.075, vehicle.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[vehicle.kind === 'suv' ? 2.6 : vehicle.kind === 'tuktuk' ? 1.7 : 1.3, vehicle.kind === 'suv' ? 2.85 : vehicle.kind === 'tuktuk' ? 1.95 : 1.55, 36]} />
            <meshBasicMaterial color="#f3ead0" transparent opacity={0.85} />
          </mesh>
          <mesh position={[vehicle.x, 0.08, vehicle.z + (vehicle.kind === 'suv' ? 3.4 : 2.5)]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.4, 0.5]} />
            <meshBasicMaterial map={labelTexture(vehicle.label.toUpperCase(), '#f3ead0', '#102033', 512, 112)} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* Office + sign */}
      <RoundedBox args={[8, 3.4, 6]} radius={0.3} position={[STATION.x + 24, 1.7, STATION.z - 10]} castShadow receiveShadow>
        <meshStandardMaterial color="#f4efe6" roughness={0.85} />
      </RoundedBox>
      <mesh position={[STATION.x + 24, 2.0, STATION.z - 6.97]}>
        <planeGeometry args={[5.5, 1.6]} />
        <meshStandardMaterial color="#9fd6ea" roughness={0.1} metalness={0.5} transparent opacity={0.7} />
      </mesh>
      <group position={[STATION.x + 24, 0, STATION.z - 13.2]}>
        <mesh position={[0, 4.6, 0]} castShadow>
          <boxGeometry args={[0.4, 2.6, 0.4]} />
          <meshStandardMaterial color="#102033" />
        </mesh>
        <mesh position={[0, 6.2, 0]}>
          <planeGeometry args={[10, 1.7]} />
          <meshBasicMaterial map={board} toneMapped={false} side={2} />
        </mesh>
      </group>
      <mesh position={[STATION.x - 11, 3.2, STATION.bayZ + 5.2]}>
        <planeGeometry args={[4.6, 1.15]} />
        <meshBasicMaterial map={pick} toneMapped={false} side={2} />
      </mesh>
      {/* Dispatcher mascot and a lamp */}
      <group position={[STATION.x + 18, 0, STATION.z - 4]} rotation={[0, -0.9, 0]}>
        <Mascot color={COLORS.red} scale={0.9} glasses phase={0.8} />
      </group>
      <mesh position={[STATION.x + 30, 2.4, STATION.z + 14]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 4.8, 6]} />
        <meshStandardMaterial color="#d5d0c6" />
      </mesh>
      <mesh position={[STATION.x + 30, 4.9, STATION.z + 14]}>
        <sphereGeometry args={[0.2, 10, 8]} />
        <meshStandardMaterial color="#ffe7a3" emissive="#ffd56a" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

function Buildings() {
  const windows = useMemo(() => windowTexture(), [])
  return (
    <group>
      {BUILDINGS.map((building, index) => {
        const accent = building.accent ?? '#c9854a'
        const awning = index % 3 === 0
        return (
          <group key={`${building.x}-${building.z}`} position={[building.x, 0, building.z]}>
            <RoundedBox
              args={[building.w, building.h, building.d]}
              radius={Math.min(0.45, building.w * 0.06)}
              smoothness={2}
              position={[0, building.h / 2, 0]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial color={building.color} roughness={0.85} />
            </RoundedBox>
            <RoundedBox
              args={[building.w * 0.72, 0.36, building.d * 0.72]}
              radius={0.12}
              position={[0, building.h + 0.14, 0]}
              castShadow
            >
              <meshStandardMaterial color={accent} roughness={0.6} />
            </RoundedBox>
            <mesh position={[0, building.h * 0.55, building.d / 2 + 0.03]}>
              <planeGeometry args={[building.w * 0.72, building.h * 0.55]} />
              <meshStandardMaterial map={windows} roughness={0.35} metalness={0.15} />
            </mesh>
            <mesh position={[building.w / 2 + 0.03, building.h * 0.55, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[building.d * 0.7, building.h * 0.55]} />
              <meshStandardMaterial map={windows} roughness={0.35} metalness={0.15} />
            </mesh>
            {awning && (
              <mesh position={[0, 2.6, building.d / 2 + 0.9]} rotation={[0.35, 0, 0]} castShadow>
                <boxGeometry args={[building.w * 0.6, 0.08, 1.9]} />
                <meshStandardMaterial color={accent} roughness={0.7} />
              </mesh>
            )}
            <mesh position={[0, 1.1, building.d / 2 + 0.03]}>
              <planeGeometry args={[1.4, 2.2]} />
              <meshStandardMaterial color="#5b4634" roughness={0.9} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function Cable({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new Vector3(...from)
    const b = new Vector3(...to)
    const dir = b.clone().sub(a)
    const len = dir.length()
    const q = new Quaternion().setFromUnitVectors(UP, dir.clone().normalize())
    return { position: a.clone().add(b).multiplyScalar(0.5), quaternion: q, length: len }
  }, [from, to])
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.05, 0.05, length, 5]} />
      <meshStandardMaterial color="#f4f4f4" roughness={0.4} metalness={0.5} />
    </mesh>
  )
}

function NileBridge() {
  const x = -120
  const deckY = 3.4
  const pylonTop = 30
  const anchors = [-46, -34, -22, 22, 34, 46]
  return (
    <group position={[x, 0, 250]}>
      <mesh position={[0, deckY, 0]} castShadow receiveShadow>
        <boxGeometry args={[9, 0.7, 118]} />
        <meshStandardMaterial color="#dcdfe4" roughness={0.6} />
      </mesh>
      <mesh position={[0, deckY + 0.36, 0]}>
        <boxGeometry args={[7.2, 0.04, 118]} />
        <meshStandardMaterial color="#4a4f57" roughness={0.9} />
      </mesh>
      {[-4.2, 4.2].map((side) => (
        <mesh key={side} position={[side, deckY + 0.9, 0]}>
          <boxGeometry args={[0.16, 1.1, 118]} />
          <meshStandardMaterial color="#f3f3f3" />
        </mesh>
      ))}
      {[-4.6, 4.6].map((side) => (
        <group key={side}>
          <mesh position={[side, pylonTop / 2, 0]} castShadow>
            <boxGeometry args={[1.2, pylonTop, 1.6]} />
            <meshStandardMaterial color="#eef0f3" roughness={0.6} />
          </mesh>
          {anchors.map((z) => (
            <Cable key={z} from={[side, pylonTop - 1, 0]} to={[side, deckY + 0.4, z]} />
          ))}
        </group>
      ))}
      <mesh position={[0, pylonTop + 0.4, 0]}>
        <boxGeometry args={[10.4, 0.8, 1.6]} />
        <meshStandardMaterial color="#eef0f3" />
      </mesh>
      {[-4.6, 4.6].map((side) => (
        <mesh key={`beacon-${side}`} position={[side, pylonTop + 1.1, 0]}>
          <sphereGeometry args={[0.3, 10, 8]} />
          <meshStandardMaterial color={COLORS.red} emissive={COLORS.red} emissiveIntensity={1} />
        </mesh>
      ))}
    </group>
  )
}

function Clouds() {
  const group = useRef<Group>(null)
  const puffs = useMemo(() => {
    const list: { x: number; y: number; z: number; s: number }[] = []
    let seed = 99
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    }
    for (let i = 0; i < 9; i += 1) {
      list.push({ x: -380 + rand() * 760, y: 62 + rand() * 22, z: -320 + rand() * 560, s: 7 + rand() * 9 })
    }
    return list
  }, [])
  useFrame((_, dt) => {
    if (!group.current) return
    group.current.children.forEach((child) => {
      child.position.x += dt * 1.4
      if (child.position.x > 420) child.position.x = -420
    })
  })
  return (
    <group ref={group}>
      {puffs.map((puff, index) => (
        <group key={index} position={[puff.x, puff.y, puff.z]}>
          <mesh scale={[puff.s * 1.6, puff.s * 0.55, puff.s]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.92} />
          </mesh>
          <mesh position={[puff.s * 0.7, puff.s * 0.18, 0]} scale={[puff.s * 0.9, puff.s * 0.6, puff.s * 0.8]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.92} />
          </mesh>
          <mesh position={[-puff.s * 0.6, puff.s * 0.12, 0]} scale={[puff.s * 0.8, puff.s * 0.5, puff.s * 0.7]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.92} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Water() {
  const ref = useRef<Mesh>(null)
  useFrame((state) => {
    if (!ref.current) return
    const material = ref.current.material as MeshStandardMaterial
    material.roughness = 0.12 + Math.sin(state.clock.elapsedTime * 0.8) * 0.04
    ref.current.position.y = -0.35 + Math.sin(state.clock.elapsedTime * 0.6) * 0.04
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 250]} receiveShadow>
      <planeGeometry args={[900, 90]} />
      <meshStandardMaterial color="#2f8a93" roughness={0.12} metalness={0.35} />
    </mesh>
  )
}

const BROAD_TREES = TREES.filter((tree) => tree.kind === 0)
const TALL_TREES = TREES.filter((tree) => tree.kind === 1)

function placeInstances(mesh: InstancedMesh | null, list: { x: number; z: number; s: number }[], y: number, height: number) {
  if (!mesh) return
  list.forEach((tree, index) => {
    dummy.position.set(tree.x, y * tree.s, tree.z)
    dummy.scale.set(tree.s, tree.s * height, tree.s)
    dummy.rotation.set(0, 0, 0)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.frustumCulled = false
}

function Trees() {
  const trunks = useRef<InstancedMesh>(null)
  const canopyA = useRef<InstancedMesh>(null)
  const canopyB = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    placeInstances(trunks.current, TREES, 0.9, 1)
    placeInstances(canopyA.current, BROAD_TREES, 1.8, 0.65)
    placeInstances(canopyB.current, TALL_TREES, 2.4, 0.55)
  }, [])

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, TREES.length]}>
        <cylinderGeometry args={[0.16, 0.22, 1.6, 6]} />
        <meshStandardMaterial color="#6b4a32" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={canopyA} args={[undefined, undefined, Math.max(BROAD_TREES.length, 1)]}>
        <sphereGeometry args={[1.15, 8, 6]} />
        <meshStandardMaterial color="#3f7d45" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={canopyB} args={[undefined, undefined, Math.max(TALL_TREES.length, 1)]}>
        <coneGeometry args={[0.7, 1.8, 6]} />
        <meshStandardMaterial color="#2f6a43" roughness={1} />
      </instancedMesh>
    </group>
  )
}

function Sign({
  position,
  rotation = 0,
  text,
  color,
  width = 3.2,
}: {
  position: [number, number, number]
  rotation?: number
  text: string
  color: string
  width?: number
}) {
  const map = useMemo(() => labelTexture(text, color, '#ffffff'), [text, color])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 3, 6]} />
        <meshStandardMaterial color="#d9d3c8" />
      </mesh>
      <mesh position={[0, 2.7, 0]}>
        <planeGeometry args={[width, width * 0.28]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Market() {
  const stalls = [
    { x: -214, z: 18, c: COLORS.red },
    { x: -228, z: 18, c: COLORS.yellow },
    { x: -242, z: 18, c: COLORS.green },
    { x: -214, z: 2, c: COLORS.blue },
    { x: -228, z: 2, c: '#f6f0e6' },
    { x: -242, z: 2, c: COLORS.red },
  ]
  return (
    <group>
      {stalls.map((stall) => (
        <group key={`${stall.x}-${stall.z}`} position={[stall.x, 0, stall.z]}>
          <RoundedBox args={[3.2, 1.1, 2.2]} radius={0.12} position={[0, 0.55, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#c4a574" roughness={0.9} />
          </RoundedBox>
          {[-1.5, 1.5].map((px) => (
            <mesh key={px} position={[px, 1.6, 1]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 2.2, 6]} />
              <meshStandardMaterial color="#6b4a32" />
            </mesh>
          ))}
          <mesh position={[0, 2.6, 0.2]} rotation={[0.25, 0, 0]} castShadow>
            <boxGeometry args={[3.9, 0.08, 3]} />
            <meshStandardMaterial color={stall.c} roughness={0.75} />
          </mesh>
          {[-0.9, 0, 0.9].map((px, i) => (
            <mesh key={px} position={[px, 1.28, 0]} castShadow>
              <sphereGeometry args={[0.26, 10, 8]} />
              <meshStandardMaterial color={['#e35a2b', '#f2c744', '#5aa749'][i]} roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      <Sign position={[-198, 0, 40]} text="KONYO KONYO MARKET" color="#9a3412" width={5} />
    </group>
  )
}

/** Junction sign post with stacked directional boards. */
function Signpost({ x, z, yaw, arms }: (typeof SIGNPOSTS)[number]) {
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 4.4, 8]} />
        <meshStandardMaterial color="#aeb4bd" metalness={0.5} roughness={0.4} />
      </mesh>
      {arms.map((arm, index) => {
        const map = signTexture(arm.text, arm.dir, arm.color ?? '#1f6f43')
        const y = 4.1 - index * 0.62
        const shift = arm.dir === 'left' ? -1.25 : arm.dir === 'right' ? 1.25 : 0
        return (
          <group key={`${arm.text}-${index}`} position={[shift, y, 0.06]}>
            <mesh castShadow>
              <boxGeometry args={[2.6, 0.5, 0.05]} />
              <meshStandardMaterial color="#e9ecef" roughness={0.6} metalness={0.2} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <planeGeometry args={[2.55, 0.45]} />
              <meshBasicMaterial map={map} toneMapped={false} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function StreetPlate({ x, z, yaw, text }: (typeof STREET_SIGNS)[number]) {
  const map = plateTexture(text)
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 2.6, 6]} />
        <meshStandardMaterial color="#aeb4bd" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.5, 0.04]}>
        <planeGeometry args={[1.8, 0.45]} />
        <meshBasicMaterial map={map} toneMapped={false} side={2} />
      </mesh>
    </group>
  )
}

function Wayfinding() {
  return (
    <group>
      {SIGNPOSTS.map((post) => (
        <Signpost key={`${post.x}-${post.z}`} {...post} />
      ))}
      {STREET_SIGNS.map((plate) => (
        <StreetPlate key={`${plate.x}-${plate.z}-${plate.text}`} {...plate} />
      ))}
      {LANDMARKS.map((mark) => (
        <Sign key={`${mark.x}-${mark.z}`} position={[mark.x, 0, mark.z]} rotation={mark.yaw} text={mark.text} color={mark.color} width={Math.min(6.4, 1.6 + mark.text.length * 0.2)} />
      ))}
    </group>
  )
}

function Chapel() {
  return (
    <group position={[46, 0, -164]}>
      <mesh position={[0, 9.6, 6]} castShadow>
        <boxGeometry args={[2.2, 4.4, 2.2]} />
        <meshStandardMaterial color="#f7f2ea" roughness={0.85} />
      </mesh>
      <mesh position={[0, 12.6, 6]} castShadow>
        <coneGeometry args={[1.6, 2.4, 4]} />
        <meshStandardMaterial color="#5b4a8a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 14.4, 6]}>
        <boxGeometry args={[0.14, 1.2, 0.14]} />
        <meshStandardMaterial color="#f9ab00" emissive="#f9ab00" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 14.2, 6]}>
        <boxGeometry args={[0.7, 0.14, 0.14]} />
        <meshStandardMaterial color="#f9ab00" emissive="#f9ab00" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 5, 9.03]}>
        <circleGeometry args={[1.1, 24]} />
        <meshStandardMaterial color="#9fd6ea" roughness={0.1} metalness={0.5} />
      </mesh>
    </group>
  )
}

/** Entrance plaza where Amina waits, just past the Tongpiny checkpoint. */
function HubGatePlaza() {
  const bracket = useMemo(() => labelTexture('{ SCENIUS HUB }', '#102033', '#f9ab00', 640, 128), [])
  return (
    <group position={[0, 0, -158]}>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[9, 9, 0.06, 36]} />
        <meshStandardMaterial color="#e7dfd0" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7.6, 8.4, 48]} />
        <meshBasicMaterial color={COLORS.yellow} transparent opacity={0.7} />
      </mesh>
      <RoundedBox args={[9, 0.5, 0.7]} radius={0.12} position={[-14, 0.25, -2]} castShadow>
        <meshStandardMaterial color="#f4efe6" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[9, 0.5, 0.7]} radius={0.12} position={[14, 0.25, -2]} castShadow>
        <meshStandardMaterial color="#f4efe6" roughness={0.9} />
      </RoundedBox>
      <group position={[-9.5, 0, -1]}>
        <mesh position={[0, 2.4, 0]} castShadow>
          <boxGeometry args={[0.5, 4.8, 0.5]} />
          <meshStandardMaterial color="#102033" roughness={0.6} />
        </mesh>
        <mesh position={[0.3, 4.1, 0]} rotation={[0, 0.5, 0]}>
          <planeGeometry args={[6, 1.2]} />
          <meshBasicMaterial map={bracket} toneMapped={false} side={2} />
        </mesh>
      </group>
      <group position={[-5, 0, 3]} rotation={[0, 0.6, 0]}>
        <Mascot color={COLORS.green} scale={0.9} phase={0.4} />
      </group>
      <group position={[6, 0, 4]} rotation={[0, -0.7, 0]}>
        <Mascot color={COLORS.yellow} scale={0.8} glasses phase={1.7} />
      </group>
    </group>
  )
}

function FuelStation() {
  return (
    <group position={[164, 0, 112]}>
      <RoundedBox args={[12, 3.2, 7]} radius={0.35} position={[0, 1.6, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f4efe6" roughness={0.85} />
      </RoundedBox>
      <RoundedBox args={[14, 0.3, 11]} radius={0.1} position={[0, 4.2, 3]} castShadow>
        <meshStandardMaterial color={COLORS.green} roughness={0.6} />
      </RoundedBox>
      {[-5.5, 5.5].map((x) => (
        <mesh key={x} position={[x, 2.1, 7.5]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 4.2, 10]} />
          <meshStandardMaterial color="#d0d5dc" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
      {[-2.2, 2.2].map((x) => (
        <mesh key={x} position={[x, 0.7, 4.2]} castShadow>
          <boxGeometry args={[0.7, 1.4, 0.7]} />
          <meshStandardMaterial color="#d0d5dc" />
        </mesh>
      ))}
      <Sign position={[0, 0, 8]} text="SIGNAL FUEL" color={COLORS.green} width={3.6} />
    </group>
  )
}

function Cafe() {
  return (
    <group position={[90, 0, 78]}>
      <RoundedBox args={[16, 4.4, 10]} radius={0.4} position={[0, 2.2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f7f3ea" roughness={0.85} />
      </RoundedBox>
      <RoundedBox args={[16.4, 0.3, 10.4]} radius={0.1} position={[0, 4.55, 0]}>
        <meshStandardMaterial color={COLORS.yellow} roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 1.6, 5.02]}>
        <planeGeometry args={[11, 2.4]} />
        <meshStandardMaterial color="#9fd6ea" roughness={0.1} metalness={0.5} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 3.2, 6]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[9, 0.1, 2.6]} />
        <meshStandardMaterial color={COLORS.red} roughness={0.7} />
      </mesh>
      {[-2.5, 2.5].map((x) => (
        <group key={x} position={[x, 0, 6.2]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.7, 0.7, 0.12, 10]} />
            <meshStandardMaterial color="#8d5a3c" />
          </mesh>
        </group>
      ))}
      <Sign position={[-6, 0, 8]} rotation={0.6} text="NILE ROAST CAFÉ" color={COLORS.blue} width={4.2} />
    </group>
  )
}

function TechHub() {
  return <Sign position={[214, 0, 6]} text="HAI CINEMA TECH HUB" color={COLORS.blue} width={5} />
}

function Checkpoint() {
  const bar = useRef<Group>(null)
  useFrame((state) => {
    if (bar.current) bar.current.rotation.z = -1.25 + Math.sin(state.clock.elapsedTime * 0.6) * 0.03
  })
  return (
    <group position={[0, 0, -146]}>
      <mesh position={[-6, 0.6, 0]} castShadow>
        <boxGeometry args={[6, 1.2, 0.4]} />
        <meshStandardMaterial color="#f4f0e8" />
      </mesh>
      <mesh position={[7.5, 0.6, 0]} castShadow>
        <boxGeometry args={[5, 1.2, 0.4]} />
        <meshStandardMaterial color="#f4f0e8" />
      </mesh>
      <RoundedBox args={[2.4, 3, 2.4]} radius={0.2} position={[11, 1.5, 1.2]} castShadow>
        <meshStandardMaterial color="#e7dcc8" />
      </RoundedBox>
      <mesh position={[11, 3.2, 1.2]}>
        <boxGeometry args={[3, 0.2, 3]} />
        <meshStandardMaterial color={COLORS.red} roughness={0.6} />
      </mesh>
      <group position={[9.6, 1.1, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.4, 2.2, 0.4]} />
          <meshStandardMaterial color="#d7dbe0" />
        </mesh>
        <group ref={bar} position={[0, 1, 0]}>
          <mesh position={[0, 3.6, 0]} castShadow>
            <boxGeometry args={[0.16, 7.2, 0.16]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          {[1, 2.6, 4.2, 5.8].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <boxGeometry args={[0.18, 0.8, 0.18]} />
              <meshStandardMaterial color={COLORS.red} />
            </mesh>
          ))}
        </group>
      </group>
      <Sign position={[-10, 0, 2]} text="TONGPINY CHECKPOINT" color={COLORS.ink} width={5} />
    </group>
  )
}

function Venue() {
  const open = useGame((state) => gateOpen(state))
  const banner = useMemo(() => venueBanner(), [])
  const near = useGame((state) => {
    const phase = state.phase
    return phase === 'playing' || phase === 'paused' || phase === 'victory' || phase === 'loading'
  })
  const flags = useRef<Group>(null)
  useFrame((state) => {
    if (!flags.current) return
    flags.current.children.forEach((child, index) => {
      child.rotation.y = Math.sin(state.clock.elapsedTime * 1.4 + index) * 0.15
    })
  })

  return (
    <group>
      <mesh position={[0, 0.05, -250]} receiveShadow>
        <boxGeometry args={[78, 0.08, 100]} />
        <meshStandardMaterial color="#d9d3c4" />
      </mesh>
      <RoundedBox args={[16, 1.2, 8]} radius={0.3} position={[0, 0.7, -268]} receiveShadow>
        <meshStandardMaterial color="#1c2836" roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[20, 7.6, 1.2]} radius={0.5} position={[0, 4.3, -277.9]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 4.3, -277.2]}>
        <planeGeometry args={[18.4, 6.9]} />
        <meshBasicMaterial map={banner} toneMapped={false} />
      </mesh>
      {[-7, 7].map((x, index) => (
        <group key={x} position={[x, 0, -262]}>
          <Mascot color={index === 0 ? COLORS.blue : COLORS.yellow} glasses={index === 1} scale={1.5} phase={index * 2} />
        </group>
      ))}
      <group position={[-22, 0, -246]}>
        <Mascot color={COLORS.green} scale={1.2} phase={1} />
      </group>
      <group position={[22, 0, -246]}>
        <Mascot color={COLORS.red} scale={1.1} glasses phase={2.5} />
      </group>
      <Sign position={[-14, 0, -206]} rotation={0.3} text={EVENT.venue.toUpperCase()} color={COLORS.red} width={3.6} />
      <Sign position={[14, 0, -206]} rotation={-0.3} text={EVENT.date.toUpperCase()} color={COLORS.blue} width={4} />
      <mesh position={[-25.5, 0.7, -202]} castShadow>
        <boxGeometry args={[37, 1.4, 0.35]} />
        <meshStandardMaterial color="#efe8dc" />
      </mesh>
      <mesh position={[25.5, 0.7, -202]} castShadow>
        <boxGeometry args={[37, 1.4, 0.35]} />
        <meshStandardMaterial color="#efe8dc" />
      </mesh>
      <mesh position={[44, 0.7, -256]}>
        <boxGeometry args={[0.35, 1.4, 108]} />
        <meshStandardMaterial color="#efe8dc" />
      </mesh>
      <mesh position={[-44, 0.7, -256]}>
        <boxGeometry args={[0.35, 1.4, 108]} />
        <meshStandardMaterial color="#efe8dc" />
      </mesh>
      <mesh position={[0, 0.7, -310]}>
        <boxGeometry args={[88, 1.4, 0.35]} />
        <meshStandardMaterial color="#efe8dc" />
      </mesh>
      {[-7.4, 7.4].map((x) => (
        <RoundedBox key={x} args={[0.7, 4.2, 0.7]} radius={0.15} position={[x, 2.1, -202]} castShadow>
          <meshStandardMaterial color="#f7f3ea" roughness={0.7} />
        </RoundedBox>
      ))}
      <RoundedBox args={[16, 0.9, 0.8]} radius={0.2} position={[0, 4.4, -202]} castShadow>
        <meshStandardMaterial
          color={open ? COLORS.green : COLORS.red}
          emissive={open ? COLORS.green : COLORS.red}
          emissiveIntensity={0.35}
          roughness={0.5}
        />
      </RoundedBox>
      {!open && (
        <mesh position={[0, 1.4, -202]} castShadow>
          <boxGeometry args={[14, 0.14, 0.14]} />
          <meshStandardMaterial color={COLORS.yellow} />
        </mesh>
      )}
      <group ref={flags} position={[0, 0, -230]}>
        {[-18, -10, 10, 18].map((x, index) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 2.2, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 4.4, 5]} />
              <meshStandardMaterial color="#eeeeee" />
            </mesh>
            <mesh position={[0.7, 3.8, 0]}>
              <planeGeometry args={[1.3, 0.8]} />
              <meshStandardMaterial
                color={[COLORS.blue, COLORS.red, COLORS.yellow, COLORS.green][index]}
                side={2}
              />
            </mesh>
          </group>
        ))}
      </group>
      {near && <VenueCrowd />}
      <Sign position={[-12, 0, -166]} rotation={0.4} text={`${EVENT.name.toUpperCase()} · ${EVENT.venue.toUpperCase()}`} color="#102033" width={6} />
    </group>
  )
}

function VenueCrowd() {
  const shirts = [COLORS.blue, COLORS.red, COLORS.yellow, COLORS.green, '#f4f0ea', '#243040']
  const spots = [
    [-8, -248],
    [-4, -246],
    [0, -250],
    [4, -247],
    [8, -249],
    [-6, -242],
    [6, -241],
    [2, -238],
    [-12, -244],
    [12, -243],
  ]
  return (
    <group>
      {spots.map(([x, z], index) =>
        index % 3 === 1 ? (
          <group key={`${x}-${z}`} position={[x, 0, z]} rotation={[0, Math.PI, 0]}>
            <Mascot color={shirts[index % 4]} scale={0.7} glasses={index % 2 === 0} phase={index} />
          </group>
        ) : (
          <PersonProxy key={`${x}-${z}`} x={x} z={z} shirt={shirts[index % shirts.length]} />
        ),
      )}
    </group>
  )
}

function PersonProxy({ x, z, shirt }: { x: number; z: number; shirt: string }) {
  const ref = useRef<Group>(null)
  useFrame((state) => {
    if (ref.current) ref.current.position.y = Math.sin(state.clock.elapsedTime * 2 + x) * 0.03
  })
  return (
    <group ref={ref} position={[x, 0, z]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.7, 4, 8]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color="#8d5a3b" />
      </mesh>
    </group>
  )
}

function Lamps() {
  const poles = useRef<InstancedMesh>(null)
  const bulbs = useRef<InstancedMesh>(null)
  const spots = useMemo(() => {
    const list: { x: number; z: number }[] = []
    for (let z = 150; z >= -180; z -= 28) {
      list.push({ x: -12, z })
      list.push({ x: 12, z })
    }
    return list
  }, [])

  useLayoutEffect(() => {
    spots.forEach((spot, index) => {
      dummy.position.set(spot.x, 2.1, spot.z)
      dummy.scale.set(1, 1, 1)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      poles.current?.setMatrixAt(index, dummy.matrix)
      dummy.position.set(spot.x, 4.3, spot.z)
      dummy.updateMatrix()
      bulbs.current?.setMatrixAt(index, dummy.matrix)
    })
    if (poles.current) {
      poles.current.instanceMatrix.needsUpdate = true
      poles.current.frustumCulled = false
    }
    if (bulbs.current) {
      bulbs.current.instanceMatrix.needsUpdate = true
      bulbs.current.frustumCulled = false
    }
  }, [spots])

  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, spots.length]}>
        <cylinderGeometry args={[0.06, 0.08, 4.2, 5]} />
        <meshStandardMaterial color="#d5d0c6" />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, spots.length]}>
        <sphereGeometry args={[0.16, 8, 6]} />
        <meshStandardMaterial color="#ffe7a3" emissive="#ffd56a" emissiveIntensity={0.8} />
      </instancedMesh>
    </group>
  )
}

function StaticColliders() {
  const open = useGame((state) => gateOpen(state))
  return (
    <RigidBody type="fixed" colliders={false} friction={0.9}>
      <CuboidCollider args={[420, 2, 320]} position={[0, -2, -20]} />
      {BUILDINGS.map((building) => (
        <CuboidCollider
          key={`${building.x}-${building.z}`}
          args={[building.w / 2, building.h / 2, building.d / 2]}
          position={[building.x, building.h / 2, building.z]}
        />
      ))}
      <CuboidCollider args={[8, 2.2, 5]} position={[90, 2.2, 78]} />
      <CuboidCollider args={[3, 4, 280]} position={[378, 4, -40]} />
      <CuboidCollider args={[3, 4, 280]} position={[-378, 4, -40]} />
      <CuboidCollider args={[390, 4, 3]} position={[0, 4, -328]} />
      <CuboidCollider args={[390, 4, 3]} position={[0, 4, 212]} />
      <CuboidCollider args={[18.5, 1.4, 0.35]} position={[-25.5, 1.4, -202]} />
      <CuboidCollider args={[18.5, 1.4, 0.35]} position={[25.5, 1.4, -202]} />
      <CuboidCollider args={[0.4, 1.4, 54]} position={[44, 1.4, -256]} />
      <CuboidCollider args={[0.4, 1.4, 54]} position={[-44, 1.4, -256]} />
      <CuboidCollider args={[44, 1.4, 0.4]} position={[0, 1.4, -310]} />
      {!open && <CuboidCollider args={[7, 1.6, 0.45]} position={[0, 1.6, -202]} />}
      {[
        [-214, 18],
        [-228, 18],
        [-242, 18],
        [-214, 2],
        [-228, 2],
        [-242, 2],
      ].map(([x, z]) => (
        <CuboidCollider key={`stall-${x}`} args={[1.6, 0.7, 1.1]} position={[x, 0.7, z]} />
      ))}
      <CuboidCollider args={[6, 1.6, 3.5]} position={[164, 1.6, 112]} />
      <CuboidCollider args={[8, 0.6, 4]} position={[0, 0.6, -268]} />
      <CuboidCollider args={[4, 1.7, 3]} position={[STATION.x + 24, 1.7, STATION.z - 10]} />
      {[-18, -6, 6, 18].map((dx) => (
        <CuboidCollider key={`pillar-${dx}`} args={[0.2, 2.2, 0.2]} position={[STATION.x - 11 + dx, 2.2, STATION.bayZ - 5.5]} />
      ))}
    </RigidBody>
  )
}

function Ground() {
  const sand = useMemo(() => sandTexture(), [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]} receiveShadow>
      <planeGeometry args={[900, 680]} />
      <meshStandardMaterial map={sand} color="#f1dcb4" roughness={1} />
    </mesh>
  )
}

function Hills() {
  const bumps = [
    { x: -300, z: -300, s: 90 },
    { x: 120, z: -320, s: 110 },
    { x: 380, z: -200, s: 80 },
    { x: 420, z: 120, s: 70 },
    { x: -420, z: -80, s: 75 },
    { x: -200, z: 330, s: 95 },
    { x: 260, z: 340, s: 120 },
  ]
  return (
    <group>
      {bumps.map((bump) => (
        <mesh key={`${bump.x}-${bump.z}`} position={[bump.x, -bump.s * 0.62, bump.z]} scale={[bump.s * 1.8, bump.s, bump.s]}>
          <sphereGeometry args={[1, 18, 12]} />
          <meshStandardMaterial color="#b89a6b" roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

export function City() {
  return (
    <group>
      <Sky distance={450000} sunPosition={[70, 38, 24]} turbidity={5} rayleigh={1.3} mieCoefficient={0.004} mieDirectionalG={0.82} />
      <Ground />
      <Hills />
      <Water />
      <mesh position={[0, 0.5, 206]} receiveShadow>
        <boxGeometry args={[820, 1, 6]} />
        <meshStandardMaterial color={COLORS.sandDark} roughness={1} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-360 + i * 56, 1.3, 208]}>
          <cylinderGeometry args={[0.07, 0.07, 1.6, 6]} />
          <meshStandardMaterial color="#efe8dc" />
        </mesh>
      ))}
      <mesh position={[0, 2, 208]}>
        <boxGeometry args={[760, 0.08, 0.08]} />
        <meshStandardMaterial color="#efe8dc" />
      </mesh>
      <NileBridge />
      <Clouds />
      <PavedAreas />
      <Road />
      <Bollards />
      <MotorStation />
      <group name="solids">
        <Buildings />
      </group>
      <Trees />
      <Market />
      <FuelStation />
      <Cafe />
      <TechHub />
      <Checkpoint />
      <HubGatePlaza />
      <Chapel />
      <Venue />
      <Lamps />
      <Wayfinding />
      <StaticColliders />
      <hemisphereLight args={['#cfe7f7', '#c9a872', 0.7]} />
      <ambientLight intensity={0.22} />
    </group>
  )
}

