let ctx: AudioContext | null = null
let musicNodes: { stop: () => void } | null = null
let engineOsc: OscillatorNode | null = null
let engineGain: GainNode | null = null
let engineFilter: BiquadFilterNode | null = null

function context() {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

export async function resumeAudio() {
  const audio = context()
  if (audio.state !== 'running') await audio.resume()
}

/** Original pentatonic loop written for this demo. No sampled music. */
export function startMusic() {
  if (musicNodes) return
  const audio = context()
  const master = audio.createGain()
  master.gain.value = 0.045
  master.connect(audio.destination)

  const notes = [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 261.63]
  const step = 0.28
  const schedule = () => {
    const t0 = audio.currentTime + 0.05
    notes.forEach((freq, i) => {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = i % 2 === 0 ? 'triangle' : 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t0 + i * step)
      gain.gain.exponentialRampToValueAtTime(0.9, t0 + i * step + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * step + step * 0.9)
      osc.connect(gain)
      gain.connect(master)
      osc.start(t0 + i * step)
      osc.stop(t0 + i * step + step)
    })
    const bass = audio.createOscillator()
    const bassGain = audio.createGain()
    bass.type = 'sine'
    bass.frequency.value = 110
    bassGain.gain.setValueAtTime(0.0001, t0)
    bassGain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.05)
    bassGain.gain.exponentialRampToValueAtTime(0.0001, t0 + notes.length * step)
    bass.connect(bassGain)
    bassGain.connect(master)
    bass.start(t0)
    bass.stop(t0 + notes.length * step)
  }

  schedule()
  const timer = window.setInterval(schedule, notes.length * step * 1000)
  musicNodes = {
    stop: () => {
      window.clearInterval(timer)
      master.disconnect()
      musicNodes = null
    },
  }
}

export function stopMusic() {
  musicNodes?.stop()
}

export function ensureEngine() {
  if (engineOsc || !ctx) return
  const audio = context()
  engineOsc = audio.createOscillator()
  engineFilter = audio.createBiquadFilter()
  engineGain = audio.createGain()
  engineOsc.type = 'sawtooth'
  engineOsc.frequency.value = 48
  engineFilter.type = 'lowpass'
  engineFilter.frequency.value = 240
  engineGain.gain.value = 0
  engineOsc.connect(engineFilter)
  engineFilter.connect(engineGain)
  engineGain.connect(audio.destination)
  engineOsc.start()
}

export function setEngine(speed: number, active: boolean) {
  if (!engineGain || !engineOsc || !engineFilter || !ctx) return
  const now = ctx.currentTime
  const vol = active ? Math.min(0.03, Math.abs(speed) * 0.0016) : 0
  engineGain.gain.setTargetAtTime(vol, now, 0.08)
  engineOsc.frequency.setTargetAtTime(42 + Math.abs(speed) * 4.5, now, 0.08)
  engineFilter.frequency.setTargetAtTime(180 + Math.abs(speed) * 18, now, 0.08)
}

/** Short original three-note fanfare for "mission passed". */
export function playFanfare() {
  if (!ctx) return
  const audio = ctx
  const notes = [392, 523.25, 659.25, 783.99]
  notes.forEach((freq, i) => {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = i === notes.length - 1 ? 'triangle' : 'square'
    osc.frequency.value = freq
    const t = audio.currentTime + i * 0.12
    const length = i === notes.length - 1 ? 0.7 : 0.16
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start(t)
    osc.stop(t + length + 0.02)
  })
}

let noiseBuffer: AudioBuffer | null = null

function noise(audio: AudioContext) {
  if (!noiseBuffer) {
    noiseBuffer = audio.createBuffer(1, audio.sampleRate * 0.3, audio.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  }
  const source = audio.createBufferSource()
  source.buffer = noiseBuffer
  return source
}

/** Pulse pistol: a short synthesized crack with a bright pitch sweep. Original, no samples. */
export function playShot() {
  if (!ctx) return
  const audio = ctx
  const t = audio.currentTime
  const burst = noise(audio)
  const burstFilter = audio.createBiquadFilter()
  burstFilter.type = 'bandpass'
  burstFilter.frequency.setValueAtTime(2600, t)
  burstFilter.frequency.exponentialRampToValueAtTime(600, t + 0.09)
  burstFilter.Q.value = 0.8
  const burstGain = audio.createGain()
  burstGain.gain.setValueAtTime(0.16, t)
  burstGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
  burst.connect(burstFilter)
  burstFilter.connect(burstGain)
  burstGain.connect(audio.destination)
  burst.start(t)
  burst.stop(t + 0.14)

  const tone = audio.createOscillator()
  const toneGain = audio.createGain()
  tone.type = 'square'
  tone.frequency.setValueAtTime(1400, t)
  tone.frequency.exponentialRampToValueAtTime(240, t + 0.08)
  toneGain.gain.setValueAtTime(0.07, t)
  toneGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
  tone.connect(toneGain)
  toneGain.connect(audio.destination)
  tone.start(t)
  tone.stop(t + 0.12)
}

/** Two mechanical clicks for a reload. */
export function playReload() {
  if (!ctx) return
  const audio = ctx
  for (const offset of [0, 0.42, 0.78]) {
    const t = audio.currentTime + offset
    const click = noise(audio)
    const filter = audio.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 1800
    const gain = audio.createGain()
    gain.gain.setValueAtTime(0.09, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
    click.connect(filter)
    filter.connect(gain)
    gain.connect(audio.destination)
    click.start(t)
    click.stop(t + 0.05)
  }
}

/** Dry-fire click when the clip is empty. */
export function playEmpty() {
  if (!ctx) return
  const audio = ctx
  const t = audio.currentTime
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(900, t)
  osc.frequency.exponentialRampToValueAtTime(300, t + 0.03)
  gain.gain.setValueAtTime(0.06, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(t)
  osc.stop(t + 0.06)
}

/** Rising two-note chime for picking something up. */
export function playPickup() {
  if (!ctx) return
  const audio = ctx
  ;[660, 990].forEach((freq, i) => {
    const t = audio.currentTime + i * 0.09
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.07, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start(t)
    osc.stop(t + 0.24)
  })
}

export function playBlip(freq = 660) {
  if (!ctx) return
  const audio = ctx
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.18)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start()
  osc.stop(audio.currentTime + 0.2)
}
