import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Raycaster, Vector3, type PerspectiveCamera } from 'three'
import { setEngine } from '../game/audio'
import { pad, touchPlay } from '../game/pad'
import { runtime } from '../game/runtime'
import { useGame } from '../game/store'
import { requestAttack } from './Life'

const raycaster = new Raycaster()

export function CameraRig() {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const gl = useThree((state) => state.gl)
  const smooth = useRef(new Vector3(-76, 7, 154))
  const look = useRef(new Vector3(-76, 1.6, 142))
  const desired = useRef(new Vector3())
  const head = useRef(new Vector3())
  const aimBlend = useRef(0)
  const aimPoint = useRef(new Vector3())
  const aimCam = useRef(new Vector3())

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __cam?: unknown }).__cam = camera
  }, [camera])

  useEffect(() => {
    const canvas = gl.domElement
    const lock = () => {
      const state = useGame.getState()
      // Phones have no pointer lock; looking around is a drag on the touch layer instead.
      if (touchPlay()) return
      if (state.phase === 'playing' && !state.dialogue) canvas.requestPointerLock()
    }
    const onMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return
      if (runtime.vehicleId) runtime.look += event.movementX * 0.0022
      else runtime.camYaw += event.movementX * 0.0022
      // Aiming may look a little lower so the crosshair can reach bots up close.
      const floor = runtime.aiming ? 0.0 : 0.18
      runtime.pitch = Math.min(1.02, Math.max(floor, runtime.pitch - event.movementY * 0.0015))
    }
    const onDown = (event: MouseEvent) => {
      if (event.button !== 0) return
      const state = useGame.getState()
      // With the pistol out, the first click shoots even before the pointer is locked.
      if (document.pointerLockElement === canvas || state.weapon === 'pistol') requestAttack()
    }
    const noMenu = (event: MouseEvent) => event.preventDefault()
    canvas.addEventListener('click', lock)
    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('contextmenu', noMenu)
    window.addEventListener('mousemove', onMove)
    return () => {
      canvas.removeEventListener('click', lock)
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('contextmenu', noMenu)
      window.removeEventListener('mousemove', onMove)
    }
  }, [gl])

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05)
    if (pad.lookX !== 0 || pad.lookY !== 0) {
      if (runtime.vehicleId) runtime.look += pad.lookX
      else runtime.camYaw += pad.lookX
      const floor = runtime.aiming ? 0 : 0.18
      runtime.pitch = Math.min(1.02, Math.max(floor, runtime.pitch - pad.lookY))
      pad.lookX = 0
      pad.lookY = 0
    }
    if (runtime.vehicleId) runtime.look *= Math.exp(-0.85 * step)
    const yaw = runtime.vehicleId ? runtime.yaw + runtime.look : runtime.camYaw
    const pitch = runtime.pitch
    const absSpeed = Math.abs(runtime.speed)
    const aiming = runtime.aiming && !runtime.vehicleId
    // Over-the-shoulder only while aiming. Releasing the aim button returns the camera behind you.
    const want = aiming ? 1 : 0
    aimBlend.current += (want - aimBlend.current) * Math.min(1, step * 9)
    const a = aimBlend.current
    const distance = runtime.vehicleId ? 7.8 + Math.min(2.6, absSpeed * 0.09) : 6.4
    const horizontal = distance * Math.cos(pitch)
    head.current.set(runtime.x, runtime.y + 1.35, runtime.z)
    desired.current.set(
      runtime.x - Math.sin(yaw) * horizontal,
      runtime.y + (runtime.vehicleId ? 0.8 : 1.15) + Math.sin(pitch) * distance,
      runtime.z + Math.cos(yaw) * horizontal,
    )

    // Over-the-shoulder aim camera: fixed distance behind the right shoulder, and the mouse pitch
    // becomes a true line-of-sight angle (pitch 0.3 is level) so the crosshair sits at target height.
    if (a > 0.001) {
      const aimPitch = pitch - 0.3
      const fwdX = Math.sin(yaw)
      const fwdZ = -Math.cos(yaw)
      const sideX = Math.cos(yaw) * 0.85
      const sideZ = Math.sin(yaw) * 0.85
      aimCam.current.set(
        runtime.x + sideX - fwdX * 3.4,
        runtime.y + 1.8 + Math.max(0, aimPitch) * 1.4,
        runtime.z + sideZ - fwdZ * 3.4,
      )
      const cp = Math.cos(aimPitch)
      aimPoint.current.set(
        aimCam.current.x + fwdX * cp * 40,
        aimCam.current.y - Math.sin(aimPitch) * 40,
        aimCam.current.z + fwdZ * cp * 40,
      )
      desired.current.lerp(aimCam.current, a)
    }
    if (desired.current.y < 0.7) desired.current.y = 0.7

    const solids = scene.getObjectByName('solids')
    if (solids) {
      const direction = desired.current.clone().sub(head.current)
      const length = direction.length()
      if (length > 0.4) {
        direction.multiplyScalar(1 / length)
        raycaster.set(head.current, direction)
        raycaster.far = length
        const hit = raycaster.intersectObject(solids, true)[0]
        if (hit && hit.distance < length - 0.3) {
          desired.current.copy(head.current).addScaledVector(direction, Math.max(1.2, hit.distance - 0.45))
        }
      }
    }

    if (a > 0.001) head.current.lerp(aimPoint.current, a)

    const blend = 1 - Math.exp(-(runtime.vehicleId ? 5.5 : aiming ? 22 : 7) * step)
    smooth.current.lerp(desired.current, blend)
    look.current.lerp(head.current, 1 - Math.exp(-(aiming ? 28 : 10) * step))
    camera.position.copy(smooth.current)
    const now = performance.now()
    const hurtAge = now - runtime.lastHurt
    if (hurtAge < 220) {
      const k = (1 - hurtAge / 220) * 0.12
      camera.position.x += Math.sin(hurtAge * 0.9) * k
      camera.position.y += Math.cos(hurtAge * 1.3) * k
    }
    const crashAge = now - runtime.crashStamp
    if (crashAge < 320 && runtime.crashForce > 3) {
      const k = (1 - crashAge / 320) * Math.min(0.35, runtime.crashForce * 0.03)
      camera.position.x += Math.sin(crashAge * 0.7) * k
      camera.position.y += Math.cos(crashAge * 1.1) * k
    }
    camera.lookAt(look.current)

    // Speed widens the lens; a hit on foot kicks it slightly.
    const cam = camera as PerspectiveCamera
    const shotAge = now - runtime.shotStamp
    const recoil = shotAge < 90 ? (1 - shotAge / 90) * 1.2 : 0
    const targetFov = 58 - 8 * a + (runtime.vehicleId ? Math.min(16, absSpeed * 0.62) : 0) + (hurtAge < 160 ? 3 : 0) + recoil
    const fov = cam.fov + (targetFov - cam.fov) * Math.min(1, step * (aiming ? 10 : 4))
    if (Math.abs(fov - cam.fov) > 0.01) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
    setEngine(runtime.speed, !!runtime.vehicleId && useGame.getState().phase === 'playing')
  })

  return null
}
