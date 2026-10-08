import { useEffect, useRef, useState } from 'react'
import { pad } from '../game/pad'
import { runtime } from '../game/runtime'
import { useGame } from '../game/store'
import { requestAttack } from '../scene/Life'

function hold(set: (down: boolean) => void) {
  return {
    onPointerDown: (event: React.PointerEvent) => {
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      set(true)
    },
    onPointerUp: () => set(false),
    onPointerCancel: () => set(false),
  }
}

function RoundButton({
  label,
  big = false,
  active = false,
  onPress,
  heldDown,
}: {
  label: string
  big?: boolean
  active?: boolean
  onPress?: () => void
  heldDown?: (down: boolean) => void
}) {
  const events = heldDown
    ? hold(heldDown)
    : {
        onPointerDown: (event: React.PointerEvent) => {
          event.stopPropagation()
          onPress?.()
        },
      }
  return (
    <button
      type="button"
      className={`pointer-events-auto flex items-center justify-center rounded-full border border-white/25 font-extrabold tracking-wide text-white shadow-lg backdrop-blur ${
        big ? 'h-20 w-20 text-sm' : 'h-12 w-12 text-[10px]'
      } ${active ? 'bg-[#1a73e8]' : 'bg-[#102033]/55'}`}
      {...events}
    >
      {label}
    </button>
  )
}

function Joystick() {
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const release = () => {
    pad.x = 0
    pad.y = 0
    pad.sprint = false
    setKnob({ x: 0, y: 0 })
  }
  const place = (event: React.PointerEvent) => {
    const rect = base.current?.getBoundingClientRect()
    if (!rect) return
    let dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
    let dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
    const mag = Math.hypot(dx, dy)
    if (mag > 1) {
      dx /= mag
      dy /= mag
    }
    pad.x = dx
    pad.y = -dy
    pad.sprint = mag > 0.82
    setKnob({ x: dx, y: dy })
  }
  return (
    <div
      ref={base}
      className="pointer-events-auto relative h-32 w-32 rounded-full border border-white/30 bg-[#102033]/40 shadow-lg backdrop-blur"
      style={{ touchAction: 'none' }}
      onPointerDown={(event) => {
        event.stopPropagation()
        event.currentTarget.setPointerCapture(event.pointerId)
        place(event)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) place(event)
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/85 shadow"
        style={{ transform: `translate(calc(-50% + ${knob.x * 36}px), calc(-50% + ${knob.y * 36}px))` }}
      />
    </div>
  )
}

/** Stick, look-drag and action buttons. Shown only on phones and tablets. */
export function TouchControls() {
  const phase = useGame((state) => state.phase)
  const dialogue = useGame((state) => !!state.dialogue)
  const advance = useGame((state) => state.advanceDialogue)
  const riding = useGame((state) => !!state.vehicleId)
  const hasPistol = useGame((state) => state.hasPistol)
  const weapon = useGame((state) => state.weapon)
  const interact = useGame((state) => state.interact)
  const enterVehicle = useGame((state) => state.enterVehicle)
  const exitVehicle = useGame((state) => state.exitVehicle)
  const reload = useGame((state) => state.reload)
  const [show, setShow] = useState(false)
  const [portrait, setPortrait] = useState(false)
  const [aiming, setAiming] = useState(false)
  const lookId = useRef<number | null>(null)
  const last = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const media = window.matchMedia('(hover: none) and (pointer: coarse)')
    const update = () => setShow(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const update = () => setPortrait(window.innerHeight > window.innerWidth + 80)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  useEffect(() => {
    if (phase !== 'playing') {
      pad.x = 0
      pad.y = 0
      pad.fire = false
      pad.aim = false
      pad.sprint = false
      setAiming(false)
    }
  }, [phase])

  if (!show || phase !== 'playing') return null

  if (dialogue) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-[18vh] flex justify-center">
        <button
          type="button"
          className="pointer-events-auto rounded-full bg-white px-8 py-3 text-sm font-extrabold text-[#102033] shadow-xl"
          onPointerDown={(event) => {
            event.stopPropagation()
            advance()
          }}
        >
          Continue
        </button>
      </div>
    )
  }

  const pistol = hasPistol && weapon === 'pistol' && !riding
  return (
    <div className="pointer-events-none absolute inset-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div
        className="pointer-events-auto absolute inset-0"
        style={{ touchAction: 'none' }}
        onPointerDown={(event) => {
          if (lookId.current !== null) return
          lookId.current = event.pointerId
          last.current = { x: event.clientX, y: event.clientY }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (event.pointerId !== lookId.current) return
          pad.lookX += (event.clientX - last.current.x) * 0.0045
          pad.lookY += (event.clientY - last.current.y) * 0.0032
          last.current = { x: event.clientX, y: event.clientY }
        }}
        onPointerUp={(event) => {
          if (event.pointerId === lookId.current) lookId.current = null
        }}
        onPointerCancel={() => {
          lookId.current = null
        }}
      />
      {portrait && (
        <p className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-[#102033]/70 px-3 py-1 text-[11px] font-bold text-white">
          Turn sideways for a wider view
        </p>
      )}
      <div className="absolute bottom-[13rem] left-3">
        <Joystick />
      </div>
      <div className="absolute bottom-[6.5rem] right-3 flex items-end gap-3">
        <div className="flex flex-col gap-2">
          {!riding && <RoundButton label="JUMP" onPress={() => { pad.jump = true }} />}
          <RoundButton
            label={riding ? 'EXIT' : 'RIDE'}
            onPress={() => {
              const state = useGame.getState()
              if (state.vehicleId) exitVehicle()
              else if (runtime.nearbyVehicleId) enterVehicle(runtime.nearbyVehicleId)
            }}
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          {pistol && (
            <div className="flex gap-2">
              <RoundButton
                label="AIM"
                active={aiming}
                heldDown={(down) => {
                  pad.aim = down
                  setAiming(down)
                }}
              />
              <RoundButton label="LOAD" onPress={() => reload()} />
            </div>
          )}
          {!riding && (
            <RoundButton
              label={pistol ? 'FIRE' : 'HIT'}
              big
              heldDown={(down) => {
                pad.fire = down
                if (down) requestAttack()
              }}
            />
          )}
          <RoundButton
            label="USE"
            onPress={() => {
              const state = useGame.getState()
              if (state.dialogue) state.advanceDialogue()
              else if (runtime.target) interact(runtime.target.id)
            }}
          />
        </div>
      </div>
    </div>
  )
}
