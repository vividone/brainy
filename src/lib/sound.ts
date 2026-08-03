/**
 * Synthesised sound effects via the Web Audio API.
 *
 * No audio files means nothing to download, nothing to license, and no
 * silent-failure-on-slow-network. Every sound is a few oscillators.
 */

let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(on: boolean): void {
  enabled = on
}

function audio(): AudioContext | null {
  if (!enabled) return null
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  // Browsers suspend audio until a user gesture; every call site is one.
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface ToneOpts {
  freq: number
  duration: number
  type?: OscillatorType
  volume?: number
  delay?: number
  slideTo?: number
}

function tone({ freq, duration, type = 'sine', volume = 0.16, delay = 0, slideTo }: ToneOpts): void {
  const ac = audio()
  if (!ac) return
  const start = ac.currentTime + delay
  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration)

  // A short attack and a smooth tail — square-edged gain clicks.
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  osc.connect(gain).connect(ac.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export const sfx = {
  tap: () => tone({ freq: 660, duration: 0.06, type: 'triangle', volume: 0.08 }),

  correct: () => {
    tone({ freq: 523.25, duration: 0.12, type: 'triangle' })
    tone({ freq: 659.25, duration: 0.12, type: 'triangle', delay: 0.09 })
    tone({ freq: 783.99, duration: 0.22, type: 'triangle', delay: 0.18 })
  },

  /** Deliberately soft and low — a wrong answer is information, not a buzzer. */
  wrong: () => {
    tone({ freq: 300, duration: 0.16, type: 'sine', volume: 0.1 })
    tone({ freq: 240, duration: 0.22, type: 'sine', volume: 0.1, delay: 0.1 })
  },

  coin: () => {
    tone({ freq: 987.77, duration: 0.07, type: 'square', volume: 0.06 })
    tone({ freq: 1318.51, duration: 0.14, type: 'square', volume: 0.06, delay: 0.06 })
  },

  star: (index = 0) => {
    tone({ freq: 659.25 * Math.pow(1.26, index), duration: 0.26, type: 'triangle', volume: 0.14 })
  },

  levelUp: () => {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, duration: 0.3, type: 'triangle', delay: i * 0.11, volume: 0.15 }),
    )
  },

  complete: () => {
    ;[523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, duration: 0.34, type: 'sine', delay: i * 0.09, volume: 0.13 }),
    )
  },

  unlock: () => {
    tone({ freq: 392, duration: 0.18, type: 'triangle', slideTo: 784, volume: 0.14 })
  },

  whoosh: () => {
    tone({ freq: 800, duration: 0.18, type: 'sine', slideTo: 220, volume: 0.05 })
  },
}

/** Light haptic feedback where the device supports it. */
export function buzz(pattern: number | number[] = 12): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* Unsupported or blocked — never worth an error. */
    }
  }
}
