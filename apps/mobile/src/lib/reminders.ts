import * as Notifications from 'expo-notifications'
import { AndroidImportance } from 'expo-notifications'
import { Platform } from 'react-native'
import { db } from '../../../../src/store/db.ts'
import { kv } from '../store/kv'

// A daily reminder when answers are due. The web app needs a self-hosted
// server to send a Web Push. The mobile app schedules local notifications on
// the device, so it needs no server and works with no connection.
//
// The app schedules one notification for each of the next 14 days that has
// answers due at the reminder time. It schedules them again each time the
// schedule changes, and each time the app starts.

const KEY = 'hearers.reminder'
const DAYS = 14
const CHANNEL = 'reminders'

/** Local notifications work on iOS and Android, also in Expo Go. Not on the web. */
export const canRemind = Platform.OS !== 'web'

/** The reminder hour (0–23), or undefined when reminders are off. */
export function reminderHour(): number | undefined {
  const raw = kv.get(KEY)
  return raw === undefined ? undefined : Number(raw)
}

/** Turn reminders on at a local hour, or change the hour. Returns a message for the learner when it fails. */
export async function enableReminders(hour: number): Promise<string | undefined> {
  if (!canRemind) return 'Reminders are not available here.'
  const current = await Notifications.getPermissionsAsync()
  const asked = current.granted ? current : await Notifications.requestPermissionsAsync()
  if (!asked.granted) return 'Notifications are off for Hearers. Turn them on in the settings of the device, then try again.'
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Reminders', importance: AndroidImportance.DEFAULT })
  kv.set(KEY, String(hour))
  await reschedule()
}

export async function disableReminders() {
  kv.remove(KEY)
  if (canRemind) await Notifications.cancelAllScheduledNotificationsAsync()
}

/** Units due at a time: the cards due by then, counted by unit. */
const dueAt = (cards: { unitId: string; due: number }[], t: number) => new Set(cards.filter((c) => c.due <= t).map((c) => c.unitId)).size

async function reschedule(now = Date.now()) {
  const hour = reminderHour()
  if (!canRemind || hour === undefined) return
  await Notifications.cancelAllScheduledNotificationsAsync()
  const cards = await db.cards.toArray()
  for (let d = 0; d <= DAYS; d++) {
    const at = new Date(now)
    at.setDate(at.getDate() + d)
    at.setHours(hour, 0, 0, 0)
    if (at.getTime() <= now) continue
    const n = dueAt(cards, at.getTime())
    if (!n) continue
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Hearers', body: `${n} ${n === 1 ? 'answer is' : 'answers are'} due for review.` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    })
  }
}

let timer: ReturnType<typeof setTimeout> | undefined

/** Schedule the reminders again a short time after the cards change (reviews here, or changes from sync). */
export function watchSchedule() {
  if (!canRemind) return
  const soon = () => {
    if (reminderHour() === undefined) return
    clearTimeout(timer)
    timer = setTimeout(() => void reschedule().catch(() => undefined), 3000)
  }
  db.cards.hook('creating', soon)
  db.cards.hook('updating', soon)
  db.cards.hook('deleting', soon)
  soon()
}
