export type MissionStatus = 'locked' | 'available' | 'active' | 'completed'

export type MissionId =
  | 'find-developer'
  | 'fix-cloud'
  | 'wifi-emergency'
  | 'speaker-rescue'
  | 'doors-open'

export type Phase = 'menu' | 'loading' | 'playing' | 'paused' | 'victory' | 'eliminated'

export type Line = { speaker: string; text: string }

export type ThenAction =
  | 'found-developer'
  | 'cloud-fixed'
  | 'board-speaker'

export type Dialogue = {
  lines: Line[]
  index: number
  then?: ThenAction
}

export type MissionDef = {
  id: MissionId
  title: string
  summary: string
  reward: number
}

export type Objective = {
  id: string
  label: string
  x: number
  z: number
  beacon?: boolean
}

export type SaveData = {
  xp: number
  missions: Record<MissionId, MissionStatus>
  cloudPieces: string[]
  relays: string[]
  badges: string[]
  speakerOnBoard: boolean
  musicOn: boolean
  hasPistol: boolean
  /** Rounds in the clip and in reserve. */
  ammo: number
  reserve: number
}

export type Weapon = 'fists' | 'pistol'
