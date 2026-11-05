// Read a text aloud with the device's own voices (Web Speech API).
export function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.9
  const voices = speechSynthesis.getVoices()
  u.voice = voices.find((v) => v.lang === 'en-AU') ?? voices.find((v) => v.lang === 'en-GB') ?? null
  speechSynthesis.speak(u)
}

export const stopSpeaking = () => 'speechSynthesis' in window && speechSynthesis.cancel()

// ---------------------------------------------------------------- recite aloud

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

const Recognition = (): (new () => Recognition) | undefined =>
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as
        | (new () => Recognition)
        | undefined

/** The browser can turn speech into text (Chrome, Edge, Safari). */
export const canListen = () => !!Recognition()

/**
 * Listen until stop() is called. `onText` gets everything heard so far: the
 * settled words and the words still being recognised.
 */
export function listen(onText: (settled: string, pending: string) => void, onError: (msg: string) => void) {
  const R = Recognition()
  if (!R) throw new Error('Speech recognition is not available in this browser')
  const r = new R()
  r.lang = navigator.language?.startsWith('en') ? navigator.language : 'en-GB'
  r.continuous = true
  r.interimResults = true
  let settled = ''
  let stopped = false
  r.onresult = (e) => {
    let pending = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) settled += ' ' + res[0].transcript
      else pending += ' ' + res[0].transcript
    }
    onText(settled.trim(), pending.trim())
  }
  r.onerror = (e) => {
    if (e.error !== 'no-speech' && e.error !== 'aborted') onError(e.error === 'not-allowed' ? 'Microphone access was refused' : e.error)
  }
  // Browsers end a session after a pause; carry on until the learner stops.
  r.onend = () => {
    if (!stopped) r.start()
  }
  r.start()
  return {
    stop: () => {
      stopped = true
      r.stop()
      return settled.trim()
    },
  }
}
