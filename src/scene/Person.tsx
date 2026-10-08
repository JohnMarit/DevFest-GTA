import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { COLORS } from '../game/content'
import { runtime } from '../game/runtime'
import { useGame } from '../game/store'

type PersonProps = {
  shirt?: string
  pants?: string
  skin?: string
  hair?: string
  walking?: boolean
  followSpeed?: boolean
  marker?: boolean
}

export function LowPolyPerson({
  shirt = COLORS.blue,
  pants = '#243040',
  skin = '#8d552f',
  hair = '#1b140f',
  walking = false,
  followSpeed = false,
  marker = false,
}: PersonProps) {
  const leftLeg = useRef<Group>(null)
  const rightLeg = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const mark = useRef<Group>(null)
  const gun = useRef<Group>(null)
  const pose = useRef(0)

  useFrame((state, dt) => {
    const moving = followSpeed ? runtime.speed > 0.8 && !runtime.vehicleId : walking
    const rate = followSpeed && runtime.speed > 7 ? 11 : 8
    const swing = moving ? Math.sin(state.clock.elapsedTime * rate) * 0.55 : 0
    const now = performance.now()
    const punching = followSpeed && now < runtime.punchUntil
    const armed = followSpeed && useGame.getState().weapon === 'pistol' && useGame.getState().hasPistol
    // Shooter stance while aiming or just after a shot; eases in and out.
    const stance = armed && (runtime.aiming || now - runtime.shotStamp < 600) ? 1 : 0
    pose.current += (stance - pose.current) * Math.min(1, Math.min(dt, 0.05) * 14)
    const p = pose.current
    const recoil = armed && now - runtime.shotStamp < 110 ? (1 - (now - runtime.shotStamp) / 110) * 0.35 : 0
    if (gun.current) gun.current.visible = armed && !runtime.vehicleId
    if (leftLeg.current) leftLeg.current.rotation.x = swing
    if (rightLeg.current) rightLeg.current.rotation.x = -swing
    if (leftArm.current) {
      leftArm.current.rotation.x = punching ? -0.5 : -swing * (1 - p) + 1.25 * p
      leftArm.current.rotation.z = 0.45 * p
    }
    if (rightArm.current) {
      rightArm.current.rotation.x = punching ? 1.55 : swing * (1 - p) + (1.5 + recoil) * p
      rightArm.current.rotation.z = -0.12 * p
    }
    if (mark.current) {
      mark.current.position.y = 2.25 + Math.sin(state.clock.elapsedTime * 3) * 0.08
      mark.current.rotation.y += 0.02
    }
  })

  return (
    <group>
      <group ref={leftLeg} position={[-0.1, 0.78, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow>
          <boxGeometry args={[0.13, 0.5, 0.15]} />
          <meshStandardMaterial color={pants} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.1, 0.78, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow>
          <boxGeometry args={[0.13, 0.5, 0.15]} />
          <meshStandardMaterial color={pants} />
        </mesh>
      </group>
      <mesh position={[-0.1, 0.08, 0.03]} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.2]} />
        <meshStandardMaterial color="#1a1d22" />
      </mesh>
      <mesh position={[0.1, 0.08, 0.03]} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.2]} />
        <meshStandardMaterial color="#1a1d22" />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.46, 0.5, 0.24]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      <mesh position={[0, 1.22, -0.13]}>
        <boxGeometry args={[0.16, 0.1, 0.04]} />
        <meshStandardMaterial color={COLORS.yellow} />
      </mesh>
      <group ref={leftArm} position={[-0.32, 1.22, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.1, 0.42, 0.1]} />
          <meshStandardMaterial color={skin} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.32, 1.22, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.1, 0.42, 0.1]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        {followSpeed && (
          // Pulse Pistol, modelled along the arm (-y) so it points forward when the arm is raised.
          <group ref={gun} position={[0, -0.46, 0]} visible={false}>
            <mesh position={[0, 0, 0.01]} castShadow>
              <boxGeometry args={[0.075, 0.11, 0.12]} />
              <meshStandardMaterial color="#1f2630" roughness={0.4} metalness={0.5} />
            </mesh>
            <mesh position={[0, -0.14, -0.015]} castShadow>
              <boxGeometry args={[0.05, 0.22, 0.055]} />
              <meshStandardMaterial color="#2c3440" roughness={0.35} metalness={0.6} />
            </mesh>
            <mesh position={[0, 0.03, 0.1]}>
              <boxGeometry args={[0.05, 0.05, 0.1]} />
              <meshStandardMaterial color={COLORS.blue} roughness={0.5} />
            </mesh>
            <mesh position={[0, -0.26, -0.015]}>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshStandardMaterial color="#9be7ff" emissive="#4fd3ff" emissiveIntensity={1.4} />
            </mesh>
          </group>
        )}
      </group>
      <mesh position={[0, 1.52, 0]} castShadow>
        <sphereGeometry args={[0.18, 14, 12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0, 1.64, -0.01]} castShadow>
        <boxGeometry args={[0.22, 0.1, 0.2]} />
        <meshStandardMaterial color={hair} />
      </mesh>
      <mesh position={[-0.07, 1.54, -0.15]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.07, 1.54, -0.15]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {marker && (
        <group ref={mark} position={[0, 2.25, 0]}>
          <mesh>
            <octahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial color={COLORS.yellow} emissive={COLORS.yellow} emissiveIntensity={0.7} />
          </mesh>
        </group>
      )}
    </group>
  )
}
