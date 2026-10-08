import { useEffect } from 'react'
import { bindKeys } from './game/keys'
import { bindMouse } from './game/mouse'
import { useGame } from './game/store'
import { GameCanvas } from './scene/GameCanvas'
import { Interface } from './ui/Interface'

export default function App() {
  const phase = useGame((state) => state.phase)
  useEffect(() => bindKeys(), [])
  useEffect(() => bindMouse(), [])
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#102033] text-white">
      {phase !== 'menu' && <GameCanvas />}
      <Interface />
    </div>
  )
}
