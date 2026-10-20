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
