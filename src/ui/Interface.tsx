import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BUILDINGS,
  CRATES,
  DANGER_ZONES,
  DISTRICTS,
  DRIVABLE,
  EVENT,
  MISSIONS,
  nearestObjective,
  objectiveLine,
  PISTOL,
  ROADS,
  routeBetween,
} from '../game/content'
import { playFanfare } from '../game/audio'
import { runtime, vehicleMarks } from '../game/runtime'
import { useGame } from '../game/store'
import { TouchControls } from './TouchControls'

const XP_PER_LEVEL = 400

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`
  return `${minutes}:${pad(seconds)}`
}

/* ------------------------------------------------------------------ */
/* Frame data polled from the sim                                      */
/* ------------------------------------------------------------------ */

function useHudPulse() {
  const [pulse, setPulse] = useState({
    speed: 0,
    distance: 0,
    routeDistance: 0,
    label: '',
    riding: false,
    vehicle: '',
    onRoad: true,
    road: '',
    stamina: 1,
    kerb: false,
    elapsedMs: 0,
    aiming: false,
    onTarget: false,
    /** 0..1 while reloading, -1 when idle. */
    reload: -1,
  })
  useEffect(() => {
    const id = window.setInterval(() => {
      const state = useGame.getState()
      const goal = nearestObjective(state, runtime.x, runtime.z)
      const now = performance.now()
      if (goal && now - runtime.routeStamp > 500) {
        runtime.route = routeBetween({ x: runtime.x, z: runtime.z }, goal)
        runtime.routeStamp = now
      } else if (!goal) {
        runtime.route = []
      }
      let routeDistance = 0
      for (let i = 1; i < runtime.route.length; i += 1) {
        routeDistance += Math.hypot(runtime.route[i].x - runtime.route[i - 1].x, runtime.route[i].z - runtime.route[i - 1].z)
      }
      setPulse({
        speed: Math.abs(runtime.speed) * 3.6,
        distance: goal ? Math.hypot(goal.x - runtime.x, goal.z - runtime.z) : 0,
        routeDistance,
        label: goal?.label ?? '',
        riding: !!state.vehicleId,
        vehicle: runtime.vehicleLabel,
        onRoad: runtime.onRoad,
        road: runtime.roadName,
        stamina: runtime.stamina,
        kerb: now - runtime.edgeStamp < 700,
        elapsedMs: runtime.elapsedMs,
        aiming: runtime.aiming,
        onTarget: runtime.aimOnTarget,
        reload: runtime.reloadUntil > 0 ? 1 - Math.min(1, (runtime.reloadUntil - now) / PISTOL.reloadMs) : -1,
      })
    }, 80)
    return () => window.clearInterval(id)
  }, [])
  return pulse
}

/* ------------------------------------------------------------------ */
/* Radar / map                                                          */
/* ------------------------------------------------------------------ */

function drawWorld(ctx: CanvasRenderingContext2D, detail: boolean) {
  // Water strip along the Nile.
  ctx.fillStyle = '#2f8a93'
  ctx.fillRect(-460, 205, 920, 200)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillRect(-460, 205, 920, 3)
  // Paved lots and tracks, then roads with curbs.
  for (const area of DRIVABLE) {
    ctx.fillStyle = '#bfb6a4'
    ctx.fillRect(area.x - area.w / 2, area.z - area.d / 2, area.w, area.d)
  }
  for (const road of ROADS) {
    ctx.fillStyle = '#cdb98f'
    ctx.fillRect(road.x - road.w / 2 - 1.6, road.z - road.d / 2 - 1.6, road.w + 3.2, road.d + 3.2)
  }
  for (const road of ROADS) {
    ctx.fillStyle = '#14161c'
    ctx.fillRect(road.x - road.w / 2, road.z - road.d / 2, road.w, road.d)
  }
  // Venue grounds.
  ctx.fillStyle = '#d9d3c4'
  ctx.fillRect(-39, -300, 78, 100)
  if (detail) {
    ctx.fillStyle = '#f4ede0'
    for (const b of BUILDINGS) ctx.fillRect(b.x - b.w / 2, b.z - b.d / 2, b.w, b.d)
  }
  for (const zone of DANGER_ZONES) {
    ctx.beginPath()
    ctx.arc(zone.x, zone.z, zone.radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(234,67,53,0.22)'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(234,67,53,0.8)'
    ctx.stroke()
  }
}

/** Pistol / ammo crates that are currently available. */
function drawCrates(ctx: CanvasRenderingContext2D, scale: number) {
  const state = useGame.getState()
  const now = performance.now()
  for (const crate of CRATES) {
    if (crate.kind === 'pistol' && state.hasPistol) continue
    if (crate.kind === 'ammo' && !state.hasPistol) continue
    if ((state.crateTaken[crate.id] ?? 0) > now) continue
    const r = 3.6 / scale
    ctx.fillStyle = crate.kind === 'pistol' ? '#1a73e8' : '#ff8a3d'
    ctx.strokeStyle = '#102033'
    ctx.lineWidth = 1 / scale
    ctx.fillRect(crate.x - r, crate.z - r, r * 2, r * 2)
    ctx.strokeRect(crate.x - r, crate.z - r, r * 2, r * 2)
  }
}

function drawRoute(ctx: CanvasRenderingContext2D, width: number) {
  const route = runtime.route
  if (route.length < 2) return
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = width + 2
  ctx.strokeStyle = 'rgba(20,10,40,0.45)'
  ctx.beginPath()
  ctx.moveTo(route[0].x, route[0].z)
  for (let i = 1; i < route.length; i += 1) ctx.lineTo(route[i].x, route[i].z)
  ctx.stroke()
  ctx.lineWidth = width
  ctx.strokeStyle = '#b57bff'
  ctx.stroke()
}

function drawGoal(ctx: CanvasRenderingContext2D, x: number, z: number, scale: number) {
  const r = 5 / scale
  ctx.beginPath()
  ctx.arc(x, z, r * 1.8, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(249,171,0,0.28)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, z, r, 0, Math.PI * 2)
  ctx.fillStyle = '#f9ab00'
  ctx.fill()
  ctx.lineWidth = 1.5 / scale
  ctx.strokeStyle = '#102033'
  ctx.stroke()
}

function Radar() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let frame = 0
    const draw = () => {
      frame = requestAnimationFrame(draw)
      const w = canvas.width
      const h = canvas.height
      const scale = runtime.vehicleId ? 0.82 : 1.15
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#d8c093'
      ctx.fillRect(0, 0, w, h)
      ctx.save()
      ctx.translate(w / 2, h * 0.6)
      ctx.rotate(-runtime.yaw)
      ctx.scale(scale, scale)
      ctx.translate(-runtime.x, -runtime.z)
      drawWorld(ctx, true)
      drawRoute(ctx, 4 / scale)
      drawCrates(ctx, scale)
      const state = useGame.getState()
      const goal = state.phase === 'playing' ? nearestObjective(state, runtime.x, runtime.z) : null
      if (goal) drawGoal(ctx, goal.x, goal.z, scale)
      for (const [id, mark] of vehicleMarks) {
        if (id === runtime.vehicleId) continue
        ctx.fillStyle = '#1a73e8'
        ctx.beginPath()
        ctx.arc(mark.x, mark.z, 2.2 / scale, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()

      // Player arrow at the pivot, always pointing up.
      ctx.save()
      ctx.translate(w / 2, h * 0.6)
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#102033'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, -9)
      ctx.lineTo(7, 8)
      ctx.lineTo(0, 4)
      ctx.lineTo(-7, 8)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()

      // North needle.
      ctx.save()
      ctx.translate(w / 2, h * 0.6)
      ctx.rotate(-runtime.yaw)
      ctx.translate(0, -h * 0.5 + 12)
      ctx.rotate(runtime.yaw)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(0, 0, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#102033'
      ctx.font = '800 10px Outfit, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('N', 0, 0.5)
      ctx.restore()
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <canvas
      ref={ref}
      width={232}
      height={232}
      className="h-[9.5rem] w-[9.5rem] rounded-[1.4rem] border-[3px] border-white/70 shadow-[0_18px_40px_rgba(6,14,24,0.4)] sm:h-44 sm:w-44"
    />
  )
}

function FullMap() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let frame = 0
    const draw = () => {
      frame = requestAnimationFrame(draw)
      const w = canvas.width
      const h = canvas.height
      const scale = Math.min(w / 800, h / 600)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#d8c093'
      ctx.fillRect(0, 0, w, h)
      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.scale(scale, scale)
      ctx.translate(-5, 20)
      drawWorld(ctx, true)
      drawRoute(ctx, 5 / scale)
      drawCrates(ctx, scale)
      const state = useGame.getState()
      const goal = nearestObjective(state, runtime.x, runtime.z)
      if (goal) drawGoal(ctx, goal.x, goal.z, scale)
      ctx.fillStyle = '#102033'
      ctx.font = `800 ${11 / scale}px Outfit, sans-serif`
      ctx.textAlign = 'center'
      for (const district of DISTRICTS) {
        if (district.id === 'town' || district.id === 'waterfront' || district.id === 'tongpiny') continue
        ctx.fillStyle = 'rgba(16,32,51,0.75)'
        ctx.fillText(district.name.toUpperCase(), district.x, district.z - district.radius * 0.35)
      }
      ctx.fillText('JUBA TOWN', 0, 30)
      ctx.fillText('TONGPINY', 0, -120)
      ctx.fillStyle = '#eefafb'
      ctx.fillText('WHITE NILE', 60, 240)
      ctx.save()
      ctx.translate(runtime.x, runtime.z)
      ctx.rotate(runtime.yaw)
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#102033'
      ctx.lineWidth = 2 / scale
      ctx.beginPath()
      ctx.moveTo(0, -9 / scale)
      ctx.lineTo(7 / scale, 8 / scale)
      ctx.lineTo(0, 4 / scale)
      ctx.lineTo(-7 / scale, 8 / scale)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      ctx.restore()
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [])
  return <canvas ref={ref} width={720} height={540} className="h-auto w-full rounded-2xl border border-white/20 shadow-xl" />
}

/* ------------------------------------------------------------------ */
/* HUD pieces                                                           */
/* ------------------------------------------------------------------ */

const HIGHLIGHTS = [
  'Scenius Hub',
  'Tongpiny',
  'Amina',
  'Lado',
  'Konyo Konyo Market',
  'Hai Cinema',
  'Airport Road',
  'SPEAKER ON BOARD',
  'stage',
  'network relays',
  'cloud credentials',
  'credentials',
  'drop-off',
]

function Highlighted({ text }: { text: string }) {
  const parts = useMemo(() => {
    const pattern = new RegExp(`(${HIGHLIGHTS.map((h) => h.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`, 'g')
    return text.split(pattern)
  }, [text])
  return (
    <>
      {parts.map((part, index) =>
        HIGHLIGHTS.includes(part) ? (
          <span key={index} className="font-extrabold text-[#f9ab00]">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  )
}

function XpTicker() {
  const xp = useGame((state) => state.xp)
  const previous = useRef(xp)
  const [pops, setPops] = useState<{ id: number; amount: number }[]>([])
  useEffect(() => {
    const delta = xp - previous.current
    previous.current = xp
    if (delta === 0) return
    const id = performance.now() + Math.random()
    setPops((list) => [...list, { id, amount: delta }])
    const timer = window.setTimeout(() => setPops((list) => list.filter((pop) => pop.id !== id)), 1500)
    return () => window.clearTimeout(timer)
  }, [xp])
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const progress = (xp % XP_PER_LEVEL) / XP_PER_LEVEL
  return (
    <section className="pointer-events-none absolute right-4 top-4 text-right">
      <div className="hud-glass hud-tilt-right relative min-w-[8.5rem] rounded-2xl px-4 py-2.5">
        <div className="absolute -left-2 top-1/2 -translate-y-1/2">
          {pops.map((pop) => (
            <span
              key={pop.id}
              className={`animate-hud-pop absolute right-full mr-3 whitespace-nowrap font-display text-2xl ${pop.amount > 0 ? 'text-[#5ee07a]' : 'text-[#ff6b5e]'} text-outline`}
            >
              {pop.amount > 0 ? '+' : ''}
              {pop.amount} XP
            </span>
          ))}
        </div>
        <div className="flex items-end justify-end gap-3">
          <span className="rounded-md bg-[#f9ab00] px-1.5 py-0.5 text-[10px] font-extrabold text-[#102033]">LVL {level}</span>
          <p className="font-display text-[1.75rem] leading-none text-[#5ee07a] text-outline">{xp.toLocaleString()} XP</p>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-[#f9ab00] transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </section>
  )
}

function MissionHeader({ index, title, label, routeDistance, elapsedMs }: { index: number; title: string; label: string; routeDistance: number; elapsedMs: number }) {
  return (
    <section className="pointer-events-none absolute left-4 top-4">
      <div className="hud-glass hud-tilt-left rounded-2xl px-4 py-2.5 text-white">
        <p className="flex items-center justify-between gap-4 text-[10px] font-extrabold tracking-[0.26em] text-white/55">
          <span>
            <span className="text-[#f9ab00]">{'{ '}</span>
            MISSION {String(index).padStart(2, '0')}
            <span className="text-[#34a853]">{' }'}</span>
          </span>
          <span className="font-display text-base tracking-[0.12em] text-white">{formatTime(elapsedMs)}</span>
        </p>
        <h2 className="font-display mt-0.5 text-[1.5rem] leading-none text-outline">{title}</h2>
        {label && (
          <p className="mt-1.5 flex items-center gap-2 text-xs font-bold text-white/85">
            <span className="inline-block h-2 w-2 rounded-full bg-[#f9ab00] shadow-[0_0_10px_#f9ab00]" />
            {label}
            <span className="text-white/50">{Math.round(routeDistance)} m</span>
          </p>
        )}
      </div>
    </section>
  )
}

function Vitals({ stamina, road, onRoad, aiming }: { stamina: number; road: string; onRoad: boolean; aiming: boolean }) {
  const health = useGame((state) => state.health)
  const district = useGame((state) => state.district)
  const place = DISTRICTS.find((d) => d.id === district)
  const healthColor = health > 60 ? '#5ee07a' : health > 30 ? '#f9ab00' : '#ff5146'
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-1.5">
      {/* The place name sits where the character stands while aiming over the shoulder, so it steps aside. */}
      <div className={`px-1 text-white transition-opacity duration-300 ${aiming ? 'opacity-0' : 'opacity-100'}`}>
        <p className="font-display text-lg leading-none text-outline">{place?.name ?? 'Juba'}</p>
        <p className="text-[10px] font-semibold text-white/70 text-outline">{road ? road : onRoad ? 'On the road' : 'Off-road'}</p>
      </div>
      <Radar />
      <div className="flex w-[9.5rem] gap-1 sm:w-44">
        <div className="h-1.5 flex-[3] overflow-hidden rounded-full border border-white/30 bg-[#102033]/70">
          <div className="h-full rounded-full transition-[width,background-color] duration-200" style={{ width: `${health}%`, backgroundColor: healthColor }} />
        </div>
        <div className="h-1.5 flex-[2] overflow-hidden rounded-full border border-white/30 bg-[#102033]/70">
          <div className="h-full rounded-full bg-[#4aa3ff] transition-[width] duration-150" style={{ width: `${stamina * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

function Speedometer({ speed, vehicle, onRoad, kerb }: { speed: number; vehicle: string; onRoad: boolean; kerb: boolean }) {
  const max = 100
  const ratio = Math.min(1, speed / max)
  const start = -210
  const sweep = 240
  const r = 46
  const toXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return [60 + r * Math.cos(rad), 60 + r * Math.sin(rad)]
  }
  const arc = (from: number, to: number) => {
    const [x1, y1] = toXY(from)
    const [x2, y2] = toXY(to)
    const large = to - from > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }
  const end = start + sweep * ratio
  return (
    <div className="hud-glass hud-tilt-right relative h-28 w-28 rounded-full">
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <path d={arc(start, start + sweep)} stroke="rgba(255,255,255,0.18)" strokeWidth="8" fill="none" strokeLinecap="round" />
        {ratio > 0.01 && (
          <path d={arc(start, end)} stroke={speed > 70 ? '#ff5146' : speed > 45 ? '#f9ab00' : '#5ee07a'} strokeWidth="8" fill="none" strokeLinecap="round" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <p className="font-display text-[2.1rem] leading-none text-outline">{Math.round(speed)}</p>
        <p className="text-[9px] font-extrabold tracking-[0.2em] text-white/60">KM/H</p>
        <p className="mt-0.5 max-w-[5.5rem] truncate text-[10px] font-bold text-[#8ab4f8]">{vehicle}</p>
      </div>
      {(kerb || !onRoad) && (
        <span className={`absolute top-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[8px] font-extrabold tracking-[0.18em] ${kerb ? 'bg-[#ea4335] text-white' : 'bg-[#f9ab00] text-[#102033]'}`}>
          {kerb ? 'KERB' : 'OFF-ROAD'}
        </span>
      )}
    </div>
  )
}

function PistolGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 20" className={className} fill="currentColor" aria-hidden>
      <path d="M2 4h26a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H14l-2 7H6l2-7H4a2 2 0 0 1-2-2V4z" />
      <rect x="20" y="11" width="6" height="2" rx="1" opacity="0.6" />
    </svg>
  )
}

function WeaponChip({ reload }: { reload: number }) {
  const weapon = useGame((state) => state.weapon)
  const hasPistol = useGame((state) => state.hasPistol)
  const ammo = useGame((state) => state.ammo)
  const reserve = useGame((state) => state.reserve)
  if (!hasPistol) return null
  const pistol = weapon === 'pistol'
  const low = pistol && ammo <= 3
  return (
    <div className="hud-glass hud-tilt-right relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-white">
      <div className={`flex h-9 w-12 items-center justify-center rounded-xl ${pistol ? 'bg-[#1a73e8]' : 'bg-white/10'}`}>
        {pistol ? <PistolGlyph className="h-5 w-8" /> : <span className="font-display text-base">FISTS</span>}
      </div>
      <div className="text-right">
        <p className="text-[9px] font-extrabold tracking-[0.22em] text-white/55">{pistol ? PISTOL.name.toUpperCase() : 'UNARMED · 2 TO DRAW'}</p>
        {pistol ? (
          <p className="font-display text-[1.6rem] leading-none text-outline">
            <span className={low ? 'text-[#ff6b5e]' : ''}>{reload >= 0 ? '··' : ammo}</span>
            <span className="mx-1 text-white/40">/</span>
            <span className="text-lg text-white/75">{reserve}</span>
          </p>
        ) : (
          <p className="font-display text-[1.6rem] leading-none text-outline">
            {ammo}
            <span className="mx-1 text-white/40">/</span>
            <span className="text-lg text-white/75">{reserve}</span>
          </p>
        )}
      </div>
      {reload >= 0 && (
        <div className="absolute inset-x-4 -bottom-1 h-1 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-[#9be7ff]" style={{ width: `${reload * 100}%` }} />
        </div>
      )}
    </div>
  )
}

/** Centre crosshair while the pistol is out on foot. */
function Crosshair({ aiming, onTarget, reload }: { aiming: boolean; onTarget: boolean; reload: number }) {
  const weapon = useGame((state) => state.weapon)
  const hasPistol = useGame((state) => state.hasPistol)
  const riding = useGame((state) => !!state.vehicleId)
  const [kick, setKick] = useState(0)
  const [box, setBox] = useState({ x: 0.5, y: 0.5, on: false })
  useEffect(() => {
    const id = window.setInterval(() => {
      if (runtime.shotStamp > kick) setKick(runtime.shotStamp)
    }, 40)
    return () => window.clearInterval(id)
  }, [kick])
  useEffect(() => {
    let frame = 0
    const tick = () => {
      frame = requestAnimationFrame(tick)
      const next = runtime.reticle
      setBox((prev) => (prev.on === next.on && Math.abs(prev.x - next.x) < 0.002 && Math.abs(prev.y - next.y) < 0.002 ? prev : { x: next.x, y: next.y, on: next.on }))
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])
  if (!hasPistol || weapon !== 'pistol' || riding || !box.on) return null
  const gap = aiming ? 7 : 12
  const color = onTarget ? '#ff5146' : '#ffffff'
  const tick = `absolute bg-current shadow-[0_0_4px_rgba(0,0,0,0.6)]`
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, color }}
    >
      {onTarget && (
        <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2">
          <span className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-current" />
          <span className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-current" />
          <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-current" />
          <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-current" />
        </div>
      )}
      <div key={kick} className={`relative h-12 w-12 ${kick ? 'animate-crosshair-kick' : ''}`}>
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current shadow-[0_0_4px_rgba(0,0,0,0.6)]" />
        <span className={`${tick} left-1/2 h-2.5 w-0.5 -translate-x-1/2`} style={{ top: `calc(50% - ${gap + 10}px)` }} />
        <span className={`${tick} left-1/2 h-2.5 w-0.5 -translate-x-1/2`} style={{ top: `calc(50% + ${gap}px)` }} />
        <span className={`${tick} top-1/2 h-0.5 w-2.5 -translate-y-1/2`} style={{ left: `calc(50% - ${gap + 10}px)` }} />
        <span className={`${tick} top-1/2 h-0.5 w-2.5 -translate-y-1/2`} style={{ left: `calc(50% + ${gap}px)` }} />
        {reload >= 0 && (
          <span
            className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: `conic-gradient(#9be7ff ${reload * 360}deg, rgba(255,255,255,0.18) 0deg)`, mask: 'radial-gradient(circle, transparent 17px, black 18px)', WebkitMask: 'radial-gradient(circle, transparent 17px, black 18px)' }}
          />
        )}
      </div>
    </div>
  )
}

function SessionButtons() {
  const togglePause = useGame((state) => state.togglePause)
  const quit = useGame((state) => state.quitToMenu)
  const release = () => {
    if (document.pointerLockElement) document.exitPointerLock()
  }
  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-30 flex -translate-x-1/2 gap-2">
      <button
        type="button"
        className="rounded-full bg-[#102033]/75 px-3 py-1 text-[11px] font-extrabold tracking-[0.16em] text-white shadow-lg backdrop-blur"
        onClick={() => {
          release()
          togglePause()
        }}
      >
        PAUSE
      </button>
      <button
        type="button"
        className="rounded-full bg-[#102033]/75 px-3 py-1 text-[11px] font-extrabold tracking-[0.16em] text-white shadow-lg backdrop-blur"
        onClick={() => {
          release()
          quit()
        }}
      >
        EXIT
      </button>
    </div>
  )
}

function Prompt() {
  const prompt = useGame((state) => state.prompt)
  if (!prompt) return null
  const groups = prompt.split('·').map((part) => part.trim())
  return (
    <div className="pointer-events-none flex flex-wrap items-center justify-center gap-2">
      {groups.map((group) => {
        const [key, ...rest] = group.split(/\s{2,}/)
        return (
          <span key={group} className="flex items-center gap-2 rounded-full bg-white/92 px-3 py-1.5 text-sm font-bold text-[#102033] shadow-lg">
            <kbd className="hud-key">{key}</kbd>
            <span>{rest.join(' ') || key}</span>
          </span>
        )
      })}
    </div>
  )
}

/** Objective text appears as a subtitle for a few seconds whenever it changes, then gets out of the way. */
function Objective({ line }: { line: string }) {
  const [show, setShow] = useState<{ line: string; stamp: number } | null>(null)
  useEffect(() => {
    setShow({ line, stamp: performance.now() })
    const id = window.setTimeout(() => setShow(null), 7000)
    return () => window.clearTimeout(id)
  }, [line])
  return (
    <div className="pointer-events-none absolute bottom-[13rem] left-1/2 flex w-[calc(100%-2rem)] -translate-x-1/2 flex-col items-center gap-2 text-center lg:bottom-6 lg:w-[min(34rem,calc(100%-24rem))]">
      <Prompt />
      <Toast />
      {show && (
        <p key={show.stamp} className="animate-subtitle inline-block rounded-xl bg-[#060b12]/70 px-4 py-2 text-[15px] font-semibold leading-snug text-white shadow-lg backdrop-blur-sm">
          <Highlighted text={show.line} />
        </p>
      )}
    </div>
  )
}

function DangerStrip() {
  const danger = useGame((state) => state.danger)
  if (!danger) return null
  return (
    <div className="pointer-events-none absolute left-4 top-[7.25rem] lg:left-1/2 lg:top-14 lg:-translate-x-1/2">
      <div className="animate-danger flex items-center gap-3 rounded-full border border-[#ff8a80]/60 bg-[#ea4335] px-5 py-1.5 text-white shadow-xl">
        <span className="h-2 w-2 animate-ping rounded-full bg-white" />
        <span className="font-display text-lg leading-none tracking-[0.12em]">{danger.toUpperCase()}</span>
        <span className="text-[10px] font-bold tracking-[0.2em] text-white/85">ROGUE BOTS</span>
      </div>
    </div>
  )
}

function MissionStartCard() {
  const card = useGame((state) => state.missionStart)
  const clear = useGame((state) => state.clearMissionStart)
  useEffect(() => {
    if (!card) return
    const id = window.setTimeout(() => clear(), 6000)
    return () => window.clearTimeout(id)
  }, [card, clear])
  if (!card) return null
  return (
    <div key={card.stamp} className="pointer-events-none w-[min(22rem,calc(100vw-2rem))]">
      <div className="animate-slide-right flex overflow-hidden rounded-2xl bg-[#060b12]/85 text-white shadow-2xl backdrop-blur">
        <div className="w-2 bg-gradient-to-b from-[#f9ab00] via-[#ea4335] to-[#1a73e8]" />
        <div className="px-4 py-3">
          <p className="text-[10px] font-extrabold tracking-[0.3em] text-[#f9ab00]">NEW MISSION</p>
          <p className="font-display mt-1 text-3xl leading-none">{card.title}</p>
          <p className="mt-1.5 text-sm text-white/80">{card.summary}</p>
        </div>
      </div>
    </div>
  )
}

function MissionPassed() {
  const banner = useGame((state) => state.banner)
  const clear = useGame((state) => state.clearBanner)
  useEffect(() => {
    if (!banner) return
    playFanfare()
    const id = window.setTimeout(() => clear(), 4300)
    return () => window.clearTimeout(id)
  }, [banner, clear])
  if (!banner) return null
  return (
    <div key={banner.stamp} className="pointer-events-none absolute inset-x-0 top-[28%] flex flex-col items-center">
      <div className="animate-banner w-full bg-gradient-to-r from-transparent via-[#060b12]/85 to-transparent py-5">
        <div className="animate-banner-text text-center text-white">
          <p className="font-display text-[3.4rem] leading-none tracking-[0.08em] text-[#f9ab00] text-outline sm:text-[4.6rem]">MISSION PASSED</p>
          <p className="mt-1 text-lg font-bold text-white/90">{banner.title}</p>
          <p className="mt-1 text-sm font-bold tracking-[0.16em] text-white/75">REACHED IN {formatTime(banner.reachedMs)}</p>
          <p className="font-display mt-1 text-3xl text-[#5ee07a] text-outline">+{banner.reward} XP</p>
        </div>
      </div>
    </div>
  )
}

function AreaName() {
  const district = useGame((state) => state.district)
  const [show, setShow] = useState<{ id: string; stamp: number } | null>(null)
  const seen = useRef<string | null>(null)
  useEffect(() => {
    if (!district || district === seen.current) return
    seen.current = district
    setShow({ id: district, stamp: performance.now() })
    const id = window.setTimeout(() => setShow(null), 4500)
    return () => window.clearTimeout(id)
  }, [district])
  if (!show) return null
  const place = DISTRICTS.find((d) => d.id === show.id)
  if (!place) return null
  return (
    <div key={show.stamp} className="pointer-events-none text-right text-white">
      <div className="animate-area-name">
        <p className="font-display text-[2.6rem] leading-none text-outline">{place.name}</p>
        <p className="text-sm font-bold text-[#f9ab00] text-outline">{place.sub}</p>
      </div>
    </div>
  )
}

function Hud() {
  const line = useGame((state) => objectiveLine(state))
  const active = useGame((state) => MISSIONS.find((mission) => state.missions[mission.id] === 'active'))
  const speaker = useGame((state) => state.speakerOnBoard && state.missions['speaker-rescue'] === 'active')
  const cinematic = useGame((state) => !!state.dialogue)
  const pulse = useHudPulse()
  const index = active ? MISSIONS.indexOf(active) + 1 : MISSIONS.length
  if (cinematic) {
    // Dialogue runs letterboxed; keep only the pop-up layers alive so timers keep ticking.
    return (
      <>
        <div className="pointer-events-none absolute right-4 top-[7.25rem] flex flex-col items-end gap-3 lg:top-auto lg:bottom-[9rem]">
          <MissionStartCard />
        </div>
        <MissionPassed />
      </>
    )
  }
  return (
    <>
      <MissionHeader index={index} title={active?.title ?? 'City Quest'} label={pulse.label} routeDistance={pulse.routeDistance} elapsedMs={pulse.elapsedMs} />
      <XpTicker />
      <DangerStrip />
      <Vitals stamina={pulse.stamina} road={pulse.road} onRoad={pulse.onRoad} aiming={pulse.aiming} />
      {/* Pop-ups (area name, new mission) stack in one column: top-right under the score on narrow
          windows, bottom-right above the speedometer / weapon chip on wide ones. */}
      <div className="pointer-events-none absolute right-4 top-[7.25rem] flex flex-col items-end gap-3 lg:top-auto lg:bottom-[9rem]">
        <AreaName />
        <MissionStartCard />
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4">
        {pulse.riding ? (
          <Speedometer speed={pulse.speed} vehicle={pulse.vehicle} onRoad={pulse.onRoad} kerb={pulse.kerb} />
        ) : (
          <WeaponChip reload={pulse.reload} />
        )}
      </div>
      <Objective line={speaker ? 'SPEAKER ON BOARD — drive to the Scenius Hub drop-off.' : line} />
      <Crosshair aiming={pulse.aiming} onTarget={pulse.onTarget} reload={pulse.reload} />
      <MissionPassed />
    </>
  )
}

function HurtVignette() {
  const health = useGame((state) => state.health)
  const [flash, setFlash] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => {
      const age = performance.now() - runtime.lastHurt
      const crash = performance.now() - runtime.crashStamp
      const crashFlash = crash < 300 && runtime.crashForce > 5 ? (1 - crash / 300) * 0.5 : 0
      setFlash(Math.max(age < 400 ? 1 - age / 400 : 0, crashFlash))
    }, 50)
    return () => window.clearInterval(id)
  }, [])
  const low = health < 35 ? (35 - health) / 35 : 0
  const strength = Math.max(flash * 0.6, low * 0.35)
  if (strength <= 0.01) return null
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: `radial-gradient(ellipse at center, rgba(234,67,53,0) 50%, rgba(234,67,53,${strength}) 100%)`,
      }}
    />
  )
}

/** Help / status message. Lives in the bottom-centre column in play; floats on its own on menus. */
function Toast({ floating = false }: { floating?: boolean }) {
  const toast = useGame((state) => state.toast)
  const clearToast = useGame((state) => state.clearToast)
  useEffect(() => {
    if (!toast) return
    // Longer messages stay a little longer.
    const id = window.setTimeout(() => clearToast(), Math.min(8000, 3600 + toast.length * 35))
    return () => window.clearTimeout(id)
  }, [toast, clearToast])
  if (!toast) return null
  const body = (
    <div className="rounded-2xl border border-[#f9ab00]/50 bg-[#060b12]/85 px-4 py-2.5 text-center text-sm font-bold text-white shadow-xl backdrop-blur">
      <Highlighted text={toast} />
    </div>
  )
  if (!floating) return body
  return <div className="pointer-events-none absolute left-1/2 top-32 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2">{body}</div>
}

function DialogueBox() {
  const dialogue = useGame((state) => state.dialogue)
  useEffect(() => {
    if (dialogue && document.pointerLockElement) document.exitPointerLock()
  }, [dialogue])
  if (!dialogue) return null
  const line = dialogue.lines[dialogue.index]
  const you = line.speaker === 'You'
  return (
    <>
      <div className="animate-letterbox pointer-events-none absolute inset-x-0 top-0 h-[9vh] origin-top bg-black" />
      <div className="animate-letterbox pointer-events-none absolute inset-x-0 bottom-0 h-[9vh] origin-bottom bg-black" />
      <div className="absolute inset-x-0 bottom-[10vh] px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className={`font-display inline-block rounded-md px-3 py-0.5 text-lg tracking-[0.12em] ${you ? 'bg-[#1a73e8] text-white' : 'bg-[#f9ab00] text-[#102033]'}`}>
            {line.speaker.toUpperCase()}
          </p>
          <p className="mt-3 text-xl font-semibold leading-snug text-white text-outline sm:text-2xl">{line.text}</p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-bold tracking-wide text-white/80">
            <kbd className="hud-key">E</kbd> CONTINUE
            <span className="text-white/40">
              {dialogue.index + 1}/{dialogue.lines.length}
            </span>
          </p>
        </div>
      </div>
    </>
  )
}

function MissionList() {
  const missions = useGame((state) => state.missions)
  return (
    <ul className="space-y-2 text-left text-sm">
      {MISSIONS.map((mission, index) => {
        const status = missions[mission.id]
        const tone =
          status === 'completed' ? 'text-[#5ee07a]' : status === 'active' ? 'text-[#f9ab00]' : 'text-white/40'
        return (
          <li key={mission.id} className={`rounded-xl px-3 py-2 ${status === 'active' ? 'bg-white/10 ring-1 ring-[#f9ab00]/60' : 'bg-white/5'}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-bold">
                <span className="font-display text-base text-white/50">{String(index + 1).padStart(2, '0')}</span>
                {mission.title}
              </span>
              <span className={`text-[11px] font-extrabold tracking-wide ${tone}`}>
                {status.toUpperCase()} · {mission.reward} XP
              </span>
            </div>
            <p className="text-white/70">{mission.summary}</p>
          </li>
        )
      })}
    </ul>
  )
}

function ControlsCopy() {
  const rows: [string, string][] = [
    ['W A S D', 'Move relative to the camera; your character turns to face the way you go. In a vehicle: throttle, steer, brake (then reverse)'],
    ['Mouse', 'Orbit the camera after you click the city. With the pistol out, look to slide the target onto what you want to shoot'],
    ['Kerbs', 'Vehicles stay on tarmac: streets, lots and tracks. Park and walk for anything on the sand'],
    ['Shift', 'Sprint while stamina (blue bar) lasts'],
    ['Space', 'Jump, or handbrake to slide a vehicle through a corner'],
    ['E', 'Talk, activate a relay, continue dialogue'],
    ['F', 'Enter or leave a boda, tuk-tuk, or SUV'],
    ['Q / click', 'Punch rogue bots. Ramming at speed works too'],
    ['Pistol', 'Grab the Pulse Pistol crate at the Motor Station office. 2 draws it, 1 puts it away'],
    ['RMB', 'Hold to aim over the shoulder. The target turns red and follows a bot while it sits on them'],
    ['LMB', 'Shoot whatever the target is on. R reloads; orange crates near checkpoints carry ammo'],
    ['Phone', 'Drag to move the target onto a bot. FIRE shoots, AIM holds the sight, USE talks, RIDE gets in'],
    ['Esc', 'Pause and open the map'],
  ]
  return (
    <ul className="space-y-1.5 text-sm text-white/85">
      {rows.map(([key, text]) => (
        <li key={key} className="flex items-start gap-3">
          <kbd className="hud-key mt-0.5 shrink-0">{key}</kbd>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  )
}

function Blob({ className, color, glasses = false }: { className: string; color: string; glasses?: boolean }) {
  return (
    <div className={`absolute ${className}`} aria-hidden>
      <div className="relative h-full w-full rounded-[48%] shadow-[inset_-18px_-14px_30px_rgba(0,0,0,0.12),0_22px_40px_rgba(16,32,51,0.18)]" style={{ backgroundColor: color }}>
        <div className="absolute left-[28%] top-[38%] h-[16%] w-[16%] rounded-full bg-white">
          <div className="absolute left-[30%] top-[30%] h-[46%] w-[46%] rounded-full bg-[#17191d]" />
          {glasses && <div className="absolute -inset-[22%] rounded-full border-[3px] border-[#17191d]" />}
        </div>
        <div className="absolute right-[28%] top-[38%] h-[16%] w-[16%] rounded-full bg-white">
          <div className="absolute left-[30%] top-[30%] h-[46%] w-[46%] rounded-full bg-[#17191d]" />
          {glasses && <div className="absolute -inset-[22%] rounded-full border-[3px] border-[#17191d]" />}
        </div>
        <div className="absolute left-1/2 top-[62%] h-[9%] w-[18%] -translate-x-1/2 rounded-b-full border-b-[3px] border-[#17191d]" />
      </div>
    </div>
  )
}

function Eliminated() {
  const respawn = useGame((state) => state.respawn)
  const kills = useGame((state) => state.kills)
  const [left, setLeft] = useState(4)
  useEffect(() => {
    setLeft(4)
    const id = window.setInterval(() => setLeft((value) => value - 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    if (left <= 0) respawn()
  }, [left, respawn])
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-[#2a0c0c]/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md text-center text-white">
        <p className="text-xs font-extrabold tracking-[0.4em] text-[#ff8a80]">ROGUE BOTS</p>
        <h2 className="font-display mt-2 text-[5.5rem] leading-none text-outline">ELIMINATED</h2>
        <p className="mt-3 text-white/80">The dangerous checkpoint won this round. You lose 50 XP and wake up at the nearest safe spot.</p>
        <p className="mt-2 text-sm font-semibold text-white/60">Bots taken down so far: {kills}</p>
        <button className="mt-6 rounded-full bg-white px-7 py-3 font-extrabold text-[#102033] shadow-xl transition hover:scale-[1.03]" onClick={respawn}>
          Respawn {left > 0 ? `(${left})` : ''}
        </button>
      </div>
    </div>
  )
}

function PauseMenu() {
  const togglePause = useGame((state) => state.togglePause)
  const quitToMenu = useGame((state) => state.quitToMenu)
  const saveNow = useGame((state) => state.saveNow)
  const musicOn = useGame((state) => state.musicOn)
  const setMusic = useGame((state) => state.setMusic)
  const xp = useGame((state) => state.xp)
  const kills = useGame((state) => state.kills)
  const badges = useGame((state) => state.badges.length)
  const hasPistol = useGame((state) => state.hasPistol)
  const ammo = useGame((state) => state.ammo)
  const reserve = useGame((state) => state.reserve)
  const [tab, setTab] = useState<'map' | 'missions' | 'controls'>('map')
  const stats: [string, string][] = [
    ['XP', xp.toLocaleString()],
    ['Level', String(Math.floor(xp / XP_PER_LEVEL) + 1)],
    ['Bots', String(kills)],
    ['Badges', `${badges}/8`],
    ['Pistol', hasPistol ? `${ammo} / ${reserve}` : 'Not found'],
  ]
  const tabs: ['map' | 'missions' | 'controls', string][] = [
    ['map', 'Map'],
    ['missions', 'Missions'],
    ['controls', 'Controls'],
  ]
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-[#060b12]/70 p-4 backdrop-blur-md">
      <div className="hud-glass max-h-[92vh] w-full max-w-4xl overflow-auto rounded-3xl p-5 text-white sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.3em] text-[#f9ab00]">PAUSED</p>
            <h2 className="font-display text-5xl leading-none">City Quest</h2>
            <p className="mt-1 text-sm text-white/70">
              {EVENT.name} · {EVENT.date} · {EVENT.venue}, {EVENT.city}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full bg-[#f9ab00] px-5 py-2 font-extrabold text-[#102033] transition hover:scale-[1.03]" onClick={togglePause}>
              Resume
            </button>
            <button className="rounded-full bg-white/10 px-5 py-2 font-bold transition hover:bg-white/20" onClick={saveNow}>
              Save
            </button>
            <button className="rounded-full bg-white/10 px-5 py-2 font-bold transition hover:bg-white/20" onClick={() => setMusic(!musicOn)}>
              Music {musicOn ? 'on' : 'off'}
            </button>
            <button className="rounded-full bg-white/10 px-5 py-2 font-bold transition hover:bg-white/20" onClick={quitToMenu}>
              Main menu
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white/5 px-3 py-2">
              <p className="text-[10px] font-extrabold tracking-[0.2em] text-white/50">{label.toUpperCase()}</p>
              <p className="font-display text-2xl leading-none">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-1 rounded-full bg-white/10 p-1">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={`font-display flex-1 rounded-full px-4 py-1.5 text-lg tracking-[0.1em] transition ${tab === id ? 'bg-white text-[#102033]' : 'text-white/70 hover:text-white'}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {tab === 'map' && (
            <div>
              <FullMap />
              <p className="mt-2 text-xs text-white/60">
                Purple line: GPS route by road to the current objective. Red circles: dangerous checkpoints patrolled by rogue bots.
              </p>
            </div>
          )}
          {tab === 'missions' && <MissionList />}
          {tab === 'controls' && <ControlsCopy />}
        </div>
      </div>
    </div>
  )
}

export function Interface() {
  const phase = useGame((state) => state.phase)
  const [help, setHelp] = useState(false)
  const newGame = useGame((state) => state.newGame)
  const continueGame = useGame((state) => state.continueGame)
  const hasSave = useGame((state) => state.hasSave)
  const quitToMenu = useGame((state) => state.quitToMenu)
  const xp = useGame((state) => state.xp)

  return (
    <div className="pointer-events-none absolute inset-0">
      {phase === 'menu' && (
        <div className="pointer-events-auto absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,_#f7f1ea_0%,_#e7eef9_45%,_#cfe3f4_100%)]">
          <div className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-[#1a73e8]/10 blur-3xl" />
          <div className="absolute -left-20 bottom-10 h-80 w-80 rounded-full bg-[#f9ab00]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 right-0 h-[26%] bg-gradient-to-t from-[#4aa2b5] to-[#9fd3df]" />
          <div className="absolute bottom-[26%] left-0 right-0 h-10 bg-[#b9a27a]" />
          <div className="absolute bottom-[29%] right-[6%] h-40 w-10 rounded-t-xl bg-[#e8eef5]" />
          <div className="absolute bottom-[29%] right-[11%] h-56 w-12 rounded-t-xl bg-[#f3f6fa]" />
          <div className="absolute bottom-[29%] right-[16%] h-32 w-14 rounded-t-xl bg-[#dfe6ee]" />
          <div className="absolute bottom-[29%] right-[22%] h-24 w-28 rounded-[40%_40%_0_0] bg-[#1a73e8]/80" />
          <div className="absolute bottom-[29%] right-[30%] h-48 w-2 rounded-full bg-white/90" />
          <div className="absolute bottom-[29%] right-[30%] h-1 w-[32%] origin-right -rotate-[14deg] bg-white/80" />
          <div className="absolute bottom-[29%] right-[30%] h-1 w-[28%] origin-right -rotate-[26deg] bg-white/70" />
          <div className="absolute bottom-[29%] right-[30%] h-1 w-[22%] origin-right -rotate-[40deg] bg-white/60" />
          <Blob className="-bottom-6 left-[2%] h-40 w-48 lg:h-56 lg:w-64" color="#1a73e8" />
          <Blob className="bottom-10 left-[14%] hidden h-28 w-32 lg:block lg:h-36 lg:w-40" color="#34a853" />
          <Blob className="-bottom-4 left-[20%] h-32 w-36 lg:left-[24%] lg:h-44 lg:w-48" color="#f9ab00" glasses />
          <Blob className="-bottom-2 left-[34%] hidden h-24 w-28 lg:block" color="#ea4335" />
          <div className="relative mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-6 pb-24 text-center">
            <p className="text-sm font-bold tracking-[0.1em] text-[#102033]/70">
              <span className="font-extrabold text-[#102033]">GDG</span> Juba presents
            </p>
            <h1 className="mt-3 flex items-end gap-2 text-7xl font-extrabold leading-none text-[#102033] sm:text-8xl">
              <span className="text-[#f9ab00]">{'{'}</span>
              <span>DevFest</span>
              <span className="text-[#34a853]">{'}'}</span>
            </h1>
            <p className="mt-1 text-6xl font-extrabold leading-none sm:text-7xl">
              <span className="text-[#1a73e8]">J</span>
              <span className="text-[#ea4335]">u</span>
              <span className="text-[#f9ab00]">b</span>
              <span className="text-[#34a853]">a</span>
            </p>
            <p className="font-display mt-3 text-4xl tracking-[0.18em] text-[#102033]/80">CITY QUEST</p>
            <div className="mt-5 flex items-center gap-3 rounded-full bg-white/90 px-5 py-2 text-sm font-bold text-[#102033] shadow-lg backdrop-blur">
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1a73e8]" />
                24th October 2026
              </span>
              <span className="h-4 w-px bg-[#102033]/20" />
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ea4335]" />
                Scenius Hub · Tongpiny, Juba
              </span>
            </div>
            <p className="mt-5 max-w-xl text-[#102033]/75">
              Drive Airport Road to Tongpiny, find Scenius Hub, fix the cloud, wake the Wi-Fi, rescue a speaker, and fight
              through the rogue-bot checkpoints to open DevFest.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button className="rounded-full bg-[#1a73e8] px-7 py-3 font-extrabold text-white shadow-lg shadow-[#1a73e8]/30 transition hover:scale-[1.03]" onClick={newGame}>
                New game
              </button>
              <button
                className="rounded-full bg-white px-7 py-3 font-extrabold text-[#102033] shadow-lg transition hover:scale-[1.03] disabled:opacity-40"
                disabled={!hasSave}
                onClick={continueGame}
              >
                Continue
              </button>
              <button className="rounded-full border-2 border-[#102033]/20 bg-white/40 px-7 py-3 font-bold text-[#102033] backdrop-blur transition hover:scale-[1.03]" onClick={() => setHelp((value) => !value)}>
                How to play
              </button>
            </div>
            {help && (
              <div className="mt-5 max-w-xl rounded-3xl bg-[#102033] p-4 text-left text-white shadow-2xl">
                <ControlsCopy />
              </div>
            )}
            <p className="mt-6 max-w-xl text-xs text-[#102033]/60">
              Community demo for DevFest Juba. Streets, characters, vehicles, bots, and music are original to this game.
              Place names are a nod to real Juba neighbourhoods. Add this page to your home screen to play it full screen.
            </p>
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-[#060b12]">
          <div className="text-center text-white">
            <p className="text-xs font-extrabold tracking-[0.3em] text-[#f9ab00]">DEVFEST JUBA</p>
            <p className="font-display mt-2 text-5xl">Loading Juba…</p>
            <p className="mt-2 text-sm text-white/60">Tip: follow the purple GPS line on the radar. Tarmac is faster than sand.</p>
          </div>
        </div>
      )}

      {(phase === 'playing' || phase === 'paused' || phase === 'eliminated') && <Hud />}
      {phase === 'playing' && <SessionButtons />}
      <TouchControls />
      {phase === 'playing' && (
        <>
          <HurtVignette />
          <DialogueBox />
        </>
      )}
      {(phase === 'paused' || phase === 'victory') && <Toast floating />}
      {phase === 'eliminated' && <Eliminated />}
      {phase === 'paused' && <PauseMenu />}

      {phase === 'victory' && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-[#060b12]/80 p-4 backdrop-blur-sm">
          <div className="hud-glass w-full max-w-lg rounded-3xl p-7 text-white">
            <p className="text-xs font-extrabold tracking-[0.22em] text-[#8ab4f8]">24 OCTOBER 2026 · SCENIUS HUB · TONGPINY · JUBA</p>
            <h2 className="font-display mt-2 text-6xl leading-none">Welcome to DevFest Juba</h2>
            <p className="mt-3 text-lg text-white/85">You kept the city online. The keynote can start.</p>
            <p className="mt-3 text-sm font-bold tracking-[0.18em] text-white/70">FINISHED IN {formatTime(runtime.elapsedMs)}</p>
            <p className="font-display mt-4 text-5xl text-[#f9ab00]">{xp.toLocaleString()} XP</p>
            <div className="mt-5 flex gap-2">
              <button className="rounded-full bg-white px-5 py-2 font-extrabold text-[#102033]" onClick={newGame}>
                Play again
              </button>
              <button className="rounded-full border border-white/30 px-5 py-2 font-bold" onClick={quitToMenu}>
                Main menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
