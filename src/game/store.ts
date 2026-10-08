import { create } from 'zustand'
import { ensureEngine, playBlip, playPickup, playReload, resumeAudio, startMusic, stopMusic } from './audio'
import { COMBAT, freshMissions, MISSIONS, nearestSafePoint, PISTOL, PLAYER_START } from './content'
import { cleanName } from './leaderboard'
import { runtime, SAVE_KEY, vehicleMarks } from './runtime'
import type { Dialogue, MissionId, Phase, SaveData, ThenAction, Weapon } from './types'

const emptySave = (): SaveData => ({
  xp: 0,
  missions: freshMissions(),
  cloudPieces: [],
  relays: [],
  badges: [],
  speakerOnBoard: false,
  musicOn: true,
  hasPistol: false,
  ammo: 0,
  reserve: 0,
  elapsedMs: 0,
  playerName: '',
})

function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SaveData
    if (!parsed.missions) return null
    return { ...emptySave(), ...parsed, missions: { ...freshMissions(), ...parsed.missions } }
  } catch {
    return null
  }
}

function writeSave(data: SaveData) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}

type GameStore = SaveData & {
  phase: Phase
  dialogue: Dialogue | null
  toast: string | null
  prompt: string | null
  vehicleId: string | null
  session: number
  hasSave: boolean
  health: number
  kills: number
  danger: string | null
  dangerTipShown: boolean
  respawnToken: number
  respawnPoint: { x: number; z: number }
  district: string | null
  /** Big "mission passed" banner; cleared by the HUD. */
  banner: { title: string; reward: number; stamp: number; reachedMs: number } | null
  /** Slide-in card when a mission becomes active; cleared by the HUD. */
  missionStart: { id: MissionId; title: string; summary: string; stamp: number } | null
  /** Equipped weapon on foot. */
  weapon: Weapon
  /** Ids of crates currently picked up, with the time they come back (ms). */
  crateTaken: Record<string, number>
  equip: (weapon: Weapon) => void
  pickupCrate: (id: string, kind: 'pistol' | 'ammo') => void
  /** Spend one round. Returns false (and does nothing) when the clip is empty. */
  fireRound: () => boolean
  /** Begin a reload if there is reserve ammo and room in the clip. Returns true when started. */
  reload: () => boolean
  finishReload: () => void
  setDistrict: (id: string | null) => void
  clearBanner: () => void
  clearMissionStart: () => void
  boot: () => void
  damage: (amount: number) => void
  heal: (amount: number) => void
  setDanger: (zone: string | null) => void
  addKill: () => void
  respawn: () => void
  newGame: (name?: string) => void
  continueGame: () => void
  togglePause: () => void
  quitToMenu: () => void
  setPrompt: (prompt: string | null) => void
  clearToast: () => void
  setMusic: (on: boolean) => void
  saveNow: () => void
  interact: (id: string) => void
  advanceDialogue: () => void
  enterVehicle: (id: string) => void
  exitVehicle: () => void
  collectCloud: (id: string) => void
  activateRelay: (id: string) => void
  collectBadge: (id: string) => void
  completeDropoff: () => void
  reachStage: () => void
}

function resetRuntime() {
  runtime.x = PLAYER_START.x
  runtime.y = 2
  runtime.z = PLAYER_START.z
  runtime.yaw = 0
  runtime.pitch = 0.24
  runtime.look = 0
  runtime.speed = 0
  runtime.vehicleId = null
  runtime.vehicleLabel = ''
  runtime.nearbyVehicleId = null
  runtime.nearbyVehicleLabel = ''
  runtime.target = null
  runtime.attackStamp = 0
  runtime.punchUntil = 0
  runtime.lastHurt = 0
  runtime.dangerZone = null
  runtime.steer = 0
  runtime.braking = 0
  runtime.reversing = false
  runtime.crashStamp = 0
  runtime.crashForce = 0
  runtime.onRoad = true
  runtime.roadName = ''
  runtime.route = []
  runtime.routeStamp = 0
  runtime.stamina = 1
  runtime.camYaw = 0
  runtime.edgeStamp = 0
  runtime.aiming = false
  runtime.triggerStamp = 0
  runtime.shotStamp = 0
  runtime.reloadUntil = 0
  runtime.aimOnTarget = false
  runtime.reticle.on = false
  runtime.elapsedMs = 0
  runtime.elapsedMark = 0
  runtime.tracer.stamp = 0
  vehicleMarks.clear()
}

function startCard(id: MissionId) {
  const def = MISSIONS.find((mission) => mission.id === id)
  return def ? { id, title: def.title, summary: def.summary, stamp: performance.now() } : null
}

function snapshot(state: GameStore): SaveData {
  return {
    xp: state.xp,
    missions: state.missions,
    cloudPieces: state.cloudPieces,
    relays: state.relays,
    badges: state.badges,
    speakerOnBoard: state.speakerOnBoard,
    musicOn: state.musicOn,
    hasPistol: state.hasPistol,
    ammo: state.ammo,
    reserve: state.reserve,
    elapsedMs: runtime.elapsedMs,
    playerName: state.playerName,
  }
}

function reward(state: GameStore, id: MissionId, next: MissionId | null, toast: string): Partial<GameStore> {
  const def = MISSIONS.find((mission) => mission.id === id)
  return {
    xp: state.xp + (def?.reward ?? 0),
    missions: {
      ...state.missions,
      [id]: 'completed',
      ...(next ? { [next]: 'active' as const } : {}),
    },
    toast,
    banner: { title: def?.title ?? 'Mission', reward: def?.reward ?? 0, stamp: performance.now(), reachedMs: runtime.elapsedMs },
    missionStart: next ? startCard(next) : null,
    speakerOnBoard: id === 'speaker-rescue' ? false : state.speakerOnBoard,
  }
}

export const useGame = create<GameStore>((set, get) => ({
  ...emptySave(),
  phase: 'menu',
  dialogue: null,
  toast: null,
  prompt: null,
  vehicleId: null,
  session: 1,
  hasSave: typeof localStorage !== 'undefined' && !!readSave(),
  health: COMBAT.maxHealth,
  kills: 0,
  danger: null,
  dangerTipShown: false,
  respawnToken: 0,
  respawnPoint: { x: PLAYER_START.x, z: PLAYER_START.z },
  district: null,
  banner: null,
  missionStart: null,
  weapon: 'fists',
  crateTaken: {},

  equip: (weapon) => {
    const state = get()
    if (weapon === 'pistol' && !state.hasPistol) return
    if (state.weapon === weapon) return
    runtime.aiming = false
    set({ weapon })
    playBlip(weapon === 'pistol' ? 520 : 380)
  },

  pickupCrate: (id, kind) => {
    const state = get()
    if (state.phase !== 'playing') return
    const now = performance.now()
    if ((state.crateTaken[id] ?? 0) > now) return
    if (kind === 'pistol') {
      if (state.hasPistol) return
      set({
        hasPistol: true,
        weapon: 'pistol',
        ammo: PISTOL.clip,
        reserve: PISTOL.startReserve,
        crateTaken: { ...state.crateTaken, [id]: Number.POSITIVE_INFINITY },
        toast: `${PISTOL.name} acquired. Click to shoot, hold right-click to aim, R to reload. 1 and 2 switch between fists and pistol.`,
      })
    } else {
      if (!state.hasPistol || state.reserve >= PISTOL.maxReserve) return
      set({
        reserve: Math.min(PISTOL.maxReserve, state.reserve + PISTOL.crateAmmo),
        crateTaken: { ...state.crateTaken, [id]: now + PISTOL.crateRespawnSeconds * 1000 },
      })
    }
    playPickup()
    writeSave(snapshot(get()))
  },

  fireRound: () => {
    const state = get()
    if (state.ammo <= 0) return false
    set({ ammo: state.ammo - 1 })
    return true
  },

  reload: () => {
    const state = get()
    if (!state.hasPistol || state.reserve <= 0 || state.ammo >= PISTOL.clip) return false
    if (runtime.reloadUntil > performance.now()) return false
    runtime.reloadUntil = performance.now() + PISTOL.reloadMs
    playReload()
    return true
  },

  finishReload: () => {
    const state = get()
    const need = PISTOL.clip - state.ammo
    const take = Math.min(need, state.reserve)
    runtime.reloadUntil = 0
    if (take <= 0) return
    set({ ammo: state.ammo + take, reserve: state.reserve - take })
  },

  setDistrict: (id) => {
    if (get().district === id) return
    set({ district: id })
  },
  clearBanner: () => set({ banner: null }),
  clearMissionStart: () => set({ missionStart: null }),

  boot: () => {
    if (get().phase === 'loading') set({ phase: 'playing' })
  },

  damage: (amount) => {
    const state = get()
    if (state.phase !== 'playing') return
    const health = Math.max(0, state.health - amount)
    runtime.lastHurt = performance.now()
    if (health <= 0) {
      const point = nearestSafePoint(runtime.x, runtime.z)
      set({
        health: 0,
        phase: 'eliminated',
        dialogue: null,
        prompt: null,
        vehicleId: null,
        xp: Math.max(0, state.xp - COMBAT.eliminationPenalty),
        respawnPoint: point,
      })
      playBlip(180)
      writeSave(snapshot(get()))
      return
    }
    set({ health })
    playBlip(240)
  },

  heal: (amount) => {
    const state = get()
    if (state.health >= COMBAT.maxHealth) return
    set({ health: Math.min(COMBAT.maxHealth, state.health + amount) })
  },

  setDanger: (zone) => {
    const state = get()
    if (state.danger === zone) return
    const patch: Partial<GameStore> = { danger: zone }
    if (zone && !state.dangerTipShown) {
      patch.dangerTipShown = true
      patch.toast = state.hasPistol
        ? 'Rogue bots ahead. Right-click to aim, click to shoot, R to reload. Vehicles can ram them at speed.'
        : 'Rogue bots ahead. Q or click to punch, or grab the Pulse Pistol at the Motor Station office. Vehicles can ram them at speed.'
    }
    set(patch)
  },

  addKill: () => {
    const state = get()
    set({ kills: state.kills + 1, xp: state.xp + COMBAT.killXp })
    playBlip(560)
  },

  respawn: () => {
    const state = get()
    if (state.phase !== 'eliminated') return
    runtime.x = state.respawnPoint.x
    runtime.z = state.respawnPoint.z
    runtime.y = 1
    runtime.speed = 0
    runtime.vehicleId = null
    runtime.camYaw = runtime.yaw
    set({
      phase: 'playing',
      health: COMBAT.maxHealth,
      respawnToken: state.respawnToken + 1,
      toast: `Back on your feet. ${COMBAT.eliminationPenalty} XP lost to the bots.`,
    })
  },

  newGame: (name) => {
    const next = { ...emptySave(), playerName: cleanName(name ?? '') }
    set({
      ...next,
      phase: 'loading',
      dialogue: null,
      toast: 'Pick a ride at Hai Malakal Motor Station (walk up, press F), then follow Airport Road north to Scenius Hub.',
      prompt: null,
      vehicleId: null,
      session: get().session + 1,
      health: COMBAT.maxHealth,
      kills: 0,
      danger: null,
      dangerTipShown: false,
      district: null,
      banner: null,
      missionStart: startCard('find-developer'),
      weapon: 'fists',
      crateTaken: {},
    })
    writeSave(next)
    resetRuntime()
    set({ hasSave: true })
    void resumeAudio().then(() => {
      if (get().musicOn) startMusic()
    })
  },

  continueGame: () => {
    const saved = readSave()
    if (!saved) return
    resetRuntime()
    runtime.elapsedMs = saved.elapsedMs
    set({
      ...saved,
      phase: 'loading',
      dialogue: null,
      toast: null,
      prompt: null,
      vehicleId: null,
      session: get().session + 1,
      health: COMBAT.maxHealth,
      kills: 0,
      danger: null,
      dangerTipShown: false,
      district: null,
      banner: null,
      weapon: saved.hasPistol ? 'pistol' : 'fists',
      crateTaken: {},
      missionStart: (() => {
        const active = (Object.keys(saved.missions) as MissionId[]).find((id) => saved.missions[id] === 'active')
        return active ? startCard(active) : null
      })(),
    })
    void resumeAudio().then(() => {
      if (get().musicOn) startMusic()
    })
  },

  togglePause: () => {
    const phase = get().phase
    if (phase === 'playing') set({ phase: 'paused' })
    else if (phase === 'paused') set({ phase: 'playing' })
  },

  quitToMenu: () => {
    const state = get()
    writeSave(snapshot(state))
    stopMusic()
    set({
      phase: 'menu',
      dialogue: null,
      prompt: null,
      vehicleId: null,
      hasSave: true,
      banner: null,
      missionStart: null,
      district: null,
    })
  },

  setPrompt: (prompt) => {
    if (get().prompt === prompt) return
    set({ prompt })
  },

  clearToast: () => set({ toast: null }),

  setMusic: (on) => {
    set({ musicOn: on })
    writeSave(snapshot(get()))
    if (on) {
      void resumeAudio().then(() => startMusic())
    } else {
      stopMusic()
    }
  },

  saveNow: () => {
    writeSave(snapshot(get()))
    set({ toast: 'Progress saved on this browser.', hasSave: true })
  },

  interact: (id) => {
    const state = get()
    if (state.phase !== 'playing' || state.dialogue) return

    if (id === 'amina') {
      if (state.missions['find-developer'] === 'active') {
        set({
          dialogue: {
            index: 0,
            then: 'found-developer',
            lines: [
              { speaker: 'Amina', text: 'You found Scenius Hub! Down Turkish Embassy Road, close to Winners Chapel. Most people miss the turn.' },
              { speaker: 'You', text: 'The signposts helped. What is going on?' },
              { speaker: 'Amina', text: 'The DevFest deployment is broken. Find the missing cloud credentials around the Hai Cinema tech hub, east of Juba Town.' },
            ],
          },
        })
        return
      }
      if (state.missions['fix-cloud'] === 'active' && state.cloudPieces.length >= 3) {
        set({
          dialogue: {
            index: 0,
            then: 'cloud-fixed',
            lines: [
              { speaker: 'Amina', text: 'API key, config, token... you actually found all three?' },
              { speaker: 'You', text: 'They were floating. Slightly suspicious.' },
              { speaker: 'Amina', text: 'Production is alive again. Nobody touch anything.' },
              { speaker: 'Amina', text: 'New problem. The venue Wi-Fi is down, and the keynote slides live in the cloud. Obviously.' },
              { speaker: 'You', text: 'Obviously.' },
              { speaker: 'Amina', text: 'Three relay points around the city. Drive to each one and wake it up.' },
            ],
          },
        })
        return
      }
      if (state.missions['fix-cloud'] === 'active') {
        set({
          dialogue: {
            index: 0,
            lines: [
              { speaker: 'Amina', text: `Still missing ${3 - state.cloudPieces.length}. Take Airport Road south, then Ministries Road east to Hai Cinema. Look for the glowing cards, not the pigeons.` },
            ],
          },
        })
        return
      }
      if (state.missions['wifi-emergency'] === 'active') {
        set({
          dialogue: {
            index: 0,
            lines: [{ speaker: 'Amina', text: 'Relays first. If the slides fail, I will have to interpret the cloud with my hands.' }],
          },
        })
        return
      }
      if (state.missions['speaker-rescue'] === 'active') {
        set({
          dialogue: {
            index: 0,
            lines: [{ speaker: 'Amina', text: 'Lado is at Konyo Konyo Market, west along Ministries Road. They missed their boda. The keynote cannot start without a person.' }],
          },
        })
        return
      }
      set({
        dialogue: {
          index: 0,
          lines: [{ speaker: 'Amina', text: 'The demo stays up. I am watching the server like it owes me money.' }],
        },
      })
      return
    }

    if (id === 'lado') {
      if (state.missions['speaker-rescue'] !== 'active') {
        set({
          dialogue: {
            index: 0,
            lines: [
              { speaker: 'Lado', text: 'I wrote a talk about shipping on time. The irony is doing cardio.' },
            ],
          },
        })
        return
      }
      if (!state.vehicleId) {
        set({
          dialogue: {
            index: 0,
            lines: [
              { speaker: 'Lado', text: 'My talk is in twenty minutes and my shoes are not a vehicle. Come back with wheels.' },
            ],
          },
        })
        return
      }
      set({
        dialogue: {
          index: 0,
          then: 'board-speaker',
          lines: [
            { speaker: 'Lado', text: 'Bless this ride. Point it at DevFest and try not to invent a new shortcut.' },
            { speaker: 'You', text: 'Hold on. We are taking the actual road.' },
          ],
        },
      })
      return
    }

    if (id === 'engineer') {
      set({
        dialogue: {
          index: 0,
          lines: [
            {
              speaker: 'Poni',
              text: state.missions['fix-cloud'] === 'active'
                ? 'The credentials are floating because I deployed them to production space. Long story. Short map.'
                : 'Tech hub is quiet, which means something is on fire somewhere else.',
            },
          ],
        },
      })
      return
    }

    if (id === 'barista') {
      set({
        dialogue: {
          index: 0,
          lines: [
            { speaker: 'Jok', text: 'Oat milk is down. The cloud is also down. Today is a versatile disaster.' },
            { speaker: 'Jok', text: 'Password is on the cup. The cup is also the password. We contain multitudes.' },
          ],
        },
      })
      return
    }

    if (id === 'officer') {
      set({
        dialogue: {
          index: 0,
          lines: [
            { speaker: 'Officer Kiden', text: 'Tongpiny checkpoint, open for DevFest traffic. Scenius Hub gate is just ahead. Past the gate is Glitch Alley: rogue bots escaped a hackathon and they are not in a sharing mood.' },
            { speaker: 'Officer Kiden', text: 'Punch with Q or a click. Or drive through fast and let the bumper do the talking. If they get you, you wake up back here.' },
          ],
        },
      })
      return
    }

    if (id.startsWith('relay-')) {
      if (state.missions['wifi-emergency'] !== 'active') {
        set({
          dialogue: {
            index: 0,
            lines: [{ speaker: 'Relay', text: 'The mast hums, unimpressed. It is not your turn yet.' }],
          },
        })
        return
      }
      if (state.relays.includes(id)) {
        set({
          dialogue: {
            index: 0,
            lines: [{ speaker: 'Relay', text: 'This one is already awake. Leave it alone.' }],
          },
        })
        return
      }
      get().activateRelay(id)
      return
    }

    if (id === 'fuel') {
      set({
        dialogue: {
          index: 0,
          lines: [
            { speaker: 'Attendant', text: 'Fuel is conceptual today. The boda runs on enthusiasm and a confident two-stroke noise.' },
          ],
        },
      })
    }
  },

  advanceDialogue: () => {
    const dialogue = get().dialogue
    if (!dialogue) return
    if (dialogue.index < dialogue.lines.length - 1) {
      set({ dialogue: { ...dialogue, index: dialogue.index + 1 } })
      return
    }
    const then = dialogue.then
    set({ dialogue: null })
    if (then) applyThen(then)
  },

  enterVehicle: (id) => {
    if (get().phase !== 'playing' || get().dialogue) return
    ensureEngine()
    set({ vehicleId: id })
  },

  exitVehicle: () => set({ vehicleId: null }),

  collectCloud: (id) => {
    const state = get()
    if (state.missions['fix-cloud'] !== 'active') return
    if (state.cloudPieces.includes(id)) return
    const cloudPieces = [...state.cloudPieces, id]
    const done = cloudPieces.length >= 3
    set({
      cloudPieces,
      toast: done ? 'All three credentials. Get them back to Amina before they float off again.' : `Credential secured (${cloudPieces.length}/3).`,
    })
    playBlip(done ? 880 : 620)
    writeSave(snapshot(get()))
  },

  activateRelay: (id) => {
    const state = get()
    if (state.missions['wifi-emergency'] !== 'active') return
    if (state.relays.includes(id)) return
    const relays = [...state.relays, id]
    if (relays.length >= 3) {
      const patch = reward(
        { ...state, relays },
        'wifi-emergency',
        'speaker-rescue',
        'All relays green. Lado is stuck at Konyo Konyo Market.',
      )
      set({ ...patch, relays })
      playBlip(920)
      writeSave(snapshot(get()))
      return
    }
    set({ relays, toast: `Relay online (${relays.length}/3).` })
    playBlip(540)
    writeSave(snapshot(get()))
  },

  collectBadge: (id) => {
    const state = get()
    if (state.badges.includes(id)) return
    const badges = [...state.badges, id]
    set({ badges, xp: state.xp + 25, toast: `DevFest badge collected. +25 XP (${badges.length}/8)` })
    playBlip(740)
    writeSave(snapshot(get()))
  },

  completeDropoff: () => {
    const state = get()
    if (state.missions['speaker-rescue'] !== 'active' || !state.speakerOnBoard) return
    const patch = reward(
      state,
      'speaker-rescue',
      'doors-open',
      'Made it with minutes to spare. The keynote lives. Scenius Hub doors are opening.',
    )
    set(patch)
    playBlip(980)
    writeSave(snapshot(get()))
  },

  reachStage: () => {
    const state = get()
    if (state.missions['doors-open'] !== 'active') return
    const patch = reward(state, 'doors-open', null, 'Welcome to DevFest Juba.')
    set({ ...patch, phase: 'victory' })
    playBlip(1040)
    writeSave(snapshot(get()))
  },
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { __game?: typeof useGame }).__game = useGame
}

function applyThen(then: ThenAction) {
  const state = useGame.getState()
  if (then === 'found-developer') {
    const patch = reward(state, 'find-developer', 'fix-cloud', 'Scenius Hub found. The cloud is next.')
    useGame.setState(patch)
    playBlip(700)
  } else if (then === 'cloud-fixed') {
    const patch = reward(
      state,
      'fix-cloud',
      'wifi-emergency',
      'Production is alive again. Nobody touch anything.',
    )
    useGame.setState(patch)
    playBlip(820)
  } else if (then === 'board-speaker') {
    if (!state.vehicleId) return
    useGame.setState({
      speakerOnBoard: true,
      toast: 'SPEAKER ON BOARD. Drive to Scenius Hub in Tongpiny.',
    })
    playBlip(640)
  }
  writeSave(snapshot(useGame.getState()))
}
