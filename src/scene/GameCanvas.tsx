import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { Suspense, useRef } from 'react'
import type { DirectionalLight } from 'three'
import { COLORS } from '../game/content'
import { runtime } from '../game/runtime'
import { useGame } from '../game/store'
import { CameraRig } from './CameraRig'
import { City } from './City'
import { Enemies } from './Enemies'
import { Boot, Population, Rules } from './Life'
import { Player } from './Player'
import { Traffic } from './Traffic'
import { Vehicles } from './Vehicles'
import { Weapons } from './Weapons'

function Sun() {
  const light = useRef<DirectionalLight>(null)
  useFrame(() => {
    const sun = light.current
    if (!sun) return
    sun.position.set(runtime.x + 26, 42, runtime.z + 16)
    sun.target.position.set(runtime.x, 0, runtime.z)
    if (sun.target.parent !== sun.parent) sun.parent?.add(sun.target)
    sun.target.updateMatrixWorld()
  })
  return (
    <directionalLight
      ref={light}
      castShadow
      intensity={2.1}
      color="#fff0d0"
      shadow-mapSize={[2048, 2048]}
      shadow-camera-near={1}
      shadow-camera-far={110}
      shadow-camera-left={-40}
      shadow-camera-right={40}
      shadow-camera-top={40}
      shadow-camera-bottom={-40}
      shadow-bias={-0.0003}
      shadow-normalBias={0.02}
    />
  )
}

export function GameCanvas() {
  const session = useGame((state) => state.session)
  const paused = useGame(
    (state) => state.phase === 'paused' || state.phase === 'victory' || state.phase === 'eliminated',
  )
  return (
    <Canvas
      key={session}
      className="absolute inset-0"
      shadows="soft"
      dpr={[1, 1.6]}
      camera={{ fov: 58, near: 0.1, far: 900, position: [-76, 8, 156] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <fog attach="fog" args={[COLORS.fog, 110, 620]} />
      <AdaptiveDpr pixelated />
      <Sun />
      <pointLight position={[90, 7, 96]} intensity={8} distance={24} color="#ffc98a" />
      <pointLight position={[0, 8, -250]} intensity={14} distance={40} color="#b9d7ff" />
      <Suspense fallback={null}>
        <Physics gravity={[0, -24, 0]} timeStep={1 / 60} paused={paused}>
          <City />
          <Player />
          <Vehicles />
          <Traffic />
          <Enemies />
          <Weapons />
          <Population />
          <Rules />
          <Boot />
        </Physics>
      </Suspense>
      <CameraRig />
    </Canvas>
  )
}
