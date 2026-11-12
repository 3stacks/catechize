import * as Speech from 'expo-speech'

// The mobile app's copy of the "Listen" part of src/lib/speech.ts. It reads a
// text aloud with the voices of the device. The web app can also listen to the
// learner ("Say it"). Expo Go has no speech recognition, so the mobile app
// does not have that part.

export function speak(text: string) {
  Speech.stop()
  Speech.speak(text, { rate: 0.9, language: 'en-AU' })
}

export const stopSpeaking = () => void Speech.stop()
