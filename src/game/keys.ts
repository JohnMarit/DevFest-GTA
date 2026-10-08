export const keys = new Set<string>()

const BLOCKED = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])

export function bindKeys() {
  const down = (event: KeyboardEvent) => {
    keys.add(event.code)
    if (BLOCKED.has(event.code)) event.preventDefault()
  }
  const up = (event: KeyboardEvent) => {
    keys.delete(event.code)
  }
  const blur = () => keys.clear()
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', blur)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('blur', blur)
  }
}

export function held(code: string) {
  return keys.has(code)
}
