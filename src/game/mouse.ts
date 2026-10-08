/** Mouse button state, mirrored from window events the same way `keys.ts` does for the keyboard. */
export const buttons = new Set<number>()

export function bindMouse() {
  const down = (event: MouseEvent) => buttons.add(event.button)
  const up = (event: MouseEvent) => buttons.delete(event.button)
  const clear = () => buttons.clear()
  window.addEventListener('mousedown', down)
  window.addEventListener('mouseup', up)
  window.addEventListener('blur', clear)
  return () => {
    window.removeEventListener('mousedown', down)
    window.removeEventListener('mouseup', up)
    window.removeEventListener('blur', clear)
  }
}

export function pressed(button: number) {
  return buttons.has(button)
}
