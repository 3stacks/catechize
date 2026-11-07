import { generateVapidKeys } from '../shared/push.ts'

// Print a new VAPID key pair for review reminders.
//   node server/vapid.ts >> .env
// Keep the private key secret. A new pair ends every existing subscription.

const k = await generateVapidKeys()
console.log(`VAPID_PUBLIC_KEY=${k.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${k.privateKey}`)
