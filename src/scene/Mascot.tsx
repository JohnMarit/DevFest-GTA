import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

type MascotProps = {
  color: string
  scale?: number
  glasses?: boolean
  phase?: number
}

/** Soft rounded mascot in the DevFest Juba poster style. Original design. */
export function Mascot({ color, scale = 1, glasses = false, phase = 0 }: MascotProps) {
  const body = useRef<Group>(null)
  useFrame((state) => {
    if (!body.current) return
    const t = state.clock.elapsedTime * 2.2 + phase
    const squash = 1 + Math.sin(t) * 0.045
    body.current.scale.set(scale * (2 - squash), scale * squash, scale * (2 - squash))
    body.current.rotation.y = Math.sin(t * 0.35) * 0.25
  })
  return (
    <group ref={body}>
      <mesh position={[0, 0.62, 0]} castShadow>
        <sphereGeometry args={[0.62, 24, 18]} />
        <meshStandardMaterial color={color} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.5, 20, 14]} />
        <meshStandardMaterial color={color} roughness={0.72} />
      </mesh>
      <mesh position={[-0.6, 0.5, 0]} castShadow>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.72} />
      </mesh>
      <mesh position={[0.6, 0.5, 0]} castShadow>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.72} />
      </mesh>
      {[-0.2, 0.2].map((x) => (
        <group key={x} position={[x, 0.74, -0.52]}>
          <mesh>
            <sphereGeometry args={[0.12, 14, 10]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, -0.08]}>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshStandardMaterial color="#17191d" roughness={0.2} />
          </mesh>
          {glasses && (
            <mesh rotation={[0, 0, 0]}>
              <torusGeometry args={[0.15, 0.022, 8, 20]} />
              <meshStandardMaterial color="#17191d" />
            </mesh>
          )}
        </group>
      ))}
      <mesh position={[0, 0.5, -0.56]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.13, 0.03, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#17191d" />
      </mesh>
      <mesh position={[-0.34, 0.6, -0.5]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshStandardMaterial color="#ff8aa0" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0.34, 0.6, -0.5]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshStandardMaterial color="#ff8aa0" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}
