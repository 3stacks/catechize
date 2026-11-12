# Hearers for iOS and Android

This folder holds the mobile app of Hearers. It uses Expo (SDK 58), React Native and Expo Router. It
has the same screens and the same features as the web app in `src/views/`. It uses the code of the
web app for the data, the schedule, the stats, sync and backups.

The app has all of the data in its bundle, and it keeps the progress of the learner on the device.
It works with no connection. The links to the Self-Interpreting Bible and the "Further reading" links
open in the in-app browser.

## Run

The app needs Node 24. Run these commands at the repository root:

```bash
npm install
npm --prefix apps/mobile install
npm run mobile     # copy the data into the app, then start Expo
```

### Run on an iPhone with Expo Go

1. Install Expo Go from the App Store.
2. Connect the iPhone and the computer to the same Wi-Fi network.
3. At the repository root, run `npm run mobile`.
4. Open the Camera app on the iPhone.
5. Point the camera at the QR code in the terminal.
6. Tap the link that the camera shows. Expo Go opens Hearers.

If the iPhone cannot reach the computer, use a tunnel. In `apps/mobile/`, run
`npx expo start --tunnel`. Expo asks to install `@expo/ngrok` the first time.

On Android, scan the QR code with Expo Go. On a computer with a simulator, press `i` for the iOS
Simulator or `a` for the Android emulator.

### Checks

Run these checks in `apps/mobile/` before a release:

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
npx expo export --platform ios --platform android   # the bundles must compile
```

The root `npm test` also runs `src/store/persist.test.ts`. That test checks the storage of the app.

## Screens

| Path | Screen | Web app |
| --- | --- | --- |
| `/` | Today (tab) | `#/` |
| `/library` | Library (tab) | `#/library` |
| `/progress` | Progress (tab) | `#/progress` |
| `/settings` | Settings (tab) | `#/settings` |
| `/doc/wsc` | A document | `#/doc/wsc` |
| `/unit/wsc/wsc-1` | A unit, with its proof texts | `#/unit/wsc/wsc-1` |
| `/harmony/creeds` | A harmony | `#/harmony/creeds` |
| `/learn/wsc` | The next unit of a course | `#/learn/wsc` |
| `/learn/wsc?unit=wsc-1` | One unit | `#/learn/wsc/wsc-1` |
| `/review` | The review of the answers that are due | `#/review` |
| `/trouble` | The trouble spots | `#/trouble` |
| `/add/John.3.16` | Add a passage to My verses | `#/add/John.3.16` |

The scheme is `hearers`. For example, the deep link `hearers://add/John.3.16` adds John 3:16 to My
verses.

## The parts of the app

### Shared code

The app imports the code of the web app from `../../src` and `../../shared`. It does not keep a
copy. The app shares these modules:

- `src/data/`: the data model, the loaders, and the suggestions for My verses
- `src/lib/`: Scripture references, chunks, grades, drill grades, and traditions
- `src/store/`: the Dexie database, the FSRS scheduler, the review queue, stats, sync and backups
- `shared/protocol.ts`: the sync protocol

`metro.config.js` lets Metro read these folders. It does three more things:

- A package that the shared code imports, for example `react` or `dexie`, comes from
  `apps/mobile/node_modules`. So the app has one copy of React.
- It puts `src/shims/data-files.ts` in place of `src/data/files.ts`. The web module fetches the data.
  The app reads the data from its bundle.
- It puts `src/shims/sync-host.ts` in place of `src/store/host.ts`. The web module syncs with the
  server that serves the page. The app syncs with the server that the learner types in Settings.

The screens are new. They use React Native components, a native stack, tabs, safe areas and the
dark mode of the device.

### Storage

React Native has no IndexedDB. The app keeps the Dexie code of the web app and runs it on
`fake-indexeddb`, a complete IndexedDB in memory. `src/store/persist.ts` writes each change through
to SQLite (`expo-sqlite`). When the app starts, it loads the rows from SQLite back into Dexie.

| Choice | Result |
| --- | --- |
| Dexie on `fake-indexeddb`, with each change written to SQLite | The app uses the schedule, sync and backup code of the web app with no change. The rows have the same shape. |
| A new store on `expo-sqlite` | The app needs new copies of the database code, the schedule code, sync and backups. The two copies can become different. |
| An IndexedDB shim on SQLite (`indexeddbshim`) | The shim needs the WebSQL API. The WebSQL API of `expo-sqlite` is not in SDK 58. |
| AsyncStorage | AsyncStorage has no indexes and no transactions. |

Some facts about this choice:

- Expo Go includes `expo-sqlite`, so the app runs in Expo Go.
- A Dexie middleware notes each key that a write changes. After 100 ms, the app reads those rows
  from Dexie and writes them to SQLite in one transaction. If a Dexie transaction fails, SQLite keeps
  the old rows.
- When the app goes to the background, it writes all changes at once.
- All of the progress of the learner is in memory. Thousands of reviews use a few megabytes.
- Each row keeps its change time (`_u`) and its push flag (`_dirty`), so sync continues after a
  restart.

A backup file from the app is the same as a backup file from the web app. The app shares the file
through the share sheet. To import a file, the app opens the document picker.

### Sync

Sync is optional. The app works with no server. To sync, the learner types the address of a
self-hosted Hearers server in Settings. The app then uses the sync protocol of the web app
(`shared/protocol.ts`) with that server. If the server has a token (`HEARERS_TOKEN`), Settings asks
for the token.

The address must start with `https://`. iOS and Android block plain `http://` to other hosts.

### Data

`scripts/mobile-data.ts` copies `public/data/` and `public/sib.json` into `apps/mobile/data/`. It
does not copy `cited.json`, because only the Self-Interpreting Bible reads that file. The script
also writes `data/files.ts`, which maps each path to a `require()`. If no `require()` names a file,
Metro does not put the file in the bundle.

Git does not keep `apps/mobile/data/`. These commands write it:

- `npm run mobile` at the repository root
- `npm run data` in `apps/mobile/`
- the `eas-build-post-install` script, which Expo Build runs after each install

### Reminders

The web app gets reminders from a self-hosted server through Web Push. The app makes local
notifications with `expo-notifications`. It needs no server. Each time the schedule changes, the app
schedules one notification for each of the next 14 days that has answers due. Local notifications
work in Expo Go.

## Web features that are not in the app

| Web feature | In the app | Reason |
| --- | --- | --- |
| "Say it": recite an answer aloud, with speech recognition | Not in the app | Expo Go has no speech recognition. The package `expo-speech-recognition` needs a development build. |
| "Listen": read the text aloud | Yes, with `expo-speech` | |
| Daily reminder through Web Push | Yes, as local notifications | See "Reminders". |
| Analytics (Umami) | Not in the app | The analytics loader is in the HTML page of the web app. The app has no loader, so `track()` sends nothing. |
| "Support on Ko-fi" | Android only | The App Store does not allow a link to outside payments for an app. |
| Sync with the server that serves the app | Sync with a server that the learner types | The app has no server of its own. |
| Download a backup file | Share the file | A phone has no downloads folder for an app. |

## Build for the stores

Expo Build makes the signed builds in the cloud. You do not need Xcode or Android Studio.

1. Create an Expo account.
2. In `apps/mobile/`, run `npx eas-cli@latest login`.
3. Run `npx eas-cli@latest init`. This command writes the project ID into `app.json`.
4. Run `npx eas-cli@latest build --platform all --profile production`.
5. Run `npx eas-cli@latest submit --platform ios`.
6. Run `npx eas-cli@latest submit --platform android`.

The App Store needs a membership of the Apple Developer Program. Google Play needs an account for the
Google Play Console. Expo Build asks for these accounts. It makes the keys that sign the app.

Expo Build uploads the full repository, because the app imports `../../src`. It installs only
`apps/mobile/`. After the install, the `eas-build-post-install` script runs
`scripts/mobile-data.ts`. That script uses only Node modules, so it needs no root install.

The app ID is `com.lukeboyle.hearers` on both stores. You cannot change it after the first release,
so make sure that it is correct before step 4.
