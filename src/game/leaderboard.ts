/** Scores kept in this browser. There is no server, so the board is shared by everyone who plays on this device. */

export type ScoreEntry = {
  name: string
  xp: number
  elapsedMs: number
  at: number
}

const BOARD_KEY = 'devfest-juba-leaderboard-v1'
const NAME_KEY = 'devfest-juba-player-name'
const MAX_ROWS = 20

export function cleanName(value: string) {
  const trimmed = value.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16)
  return trimmed.length > 0 ? trimmed : 'Player'
}

export function readName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function writeName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, cleanName(name))
  } catch {
    /* private mode can refuse storage */
  }
}

export function readBoard(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(BOARD_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ScoreEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((row) => row && typeof row.name === 'string' && typeof row.xp === 'number')
      .map((row) => ({
        name: cleanName(row.name),
        xp: Math.max(0, Math.round(row.xp)),
        elapsedMs: Math.max(0, Math.round(row.elapsedMs || 0)),
        at: row.at || 0,
      }))
      .sort(byRank)
      .slice(0, MAX_ROWS)
  } catch {
    return []
  }
}

/** Higher XP ranks first. A faster time breaks a tie. */
function byRank(a: ScoreEntry, b: ScoreEntry) {
  return b.xp - a.xp || a.elapsedMs - b.elapsedMs || b.at - a.at
}

export function addScore(name: string, xp: number, elapsedMs: number): ScoreEntry {
  const entry: ScoreEntry = {
    name: cleanName(name),
    xp: Math.max(0, Math.round(xp)),
    elapsedMs: Math.max(0, Math.round(elapsedMs)),
    at: Date.now(),
  }
  const next = [...readBoard(), entry].sort(byRank).slice(0, MAX_ROWS)
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify(next))
    writeName(entry.name)
  } catch {
    /* the row still shows for this visit */
  }
  return entry
}
