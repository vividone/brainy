/**
 * Read-aloud via the Web Speech API.
 *
 * This is not a nice-to-have. A 7-year-old who can do the arithmetic will
 * still fail a word problem they cannot read, and we would record that as a
 * maths gap. See prd.md §2.1.
 */

let enabled = true
let rate = 0.9
let voice: SpeechSynthesisVoice | null = null

const supported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

export const speechSupported = supported

export function setSpeechEnabled(on: boolean): void {
  enabled = on
  if (!on) cancelSpeech()
}

export function setSpeechRate(value: number): void {
  rate = Math.min(1.4, Math.max(0.5, value))
}

/** Prefer an English voice; a French default reading English is unusable. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (!supported()) return null
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  return (
    voices.find((v) => /en-NG|en_NG/i.test(v.lang)) ??
    voices.find((v) => /en-GB|en_GB/i.test(v.lang)) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith('en')) ??
    voices[0]
  )
}

if (supported()) {
  voice = pickVoice()
  // Chrome populates the voice list asynchronously.
  window.speechSynthesis.onvoiceschanged = () => {
    voice = pickVoice()
  }
}

export function speak(text: string, opts: { force?: boolean } = {}): void {
  if (!supported()) return
  if (!enabled && !opts.force) return
  const clean = text
    .replace(/\n+/g, '. ')
    .replace(/☐/g, ' what ')
    .replace(/[×]/g, ' times ')
    .replace(/[÷]/g, ' divided by ')
    .replace(/−/g, ' minus ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!clean) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(clean)
  utterance.rate = rate
  utterance.pitch = 1.05
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
}

export function cancelSpeech(): void {
  if (supported()) window.speechSynthesis.cancel()
}
