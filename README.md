# Hearers

Memorise and study the Westminster Standards, the Three Forms of Unity,
Luther's Small and Large Catechisms, the ecumenical creeds, the Ten
Commandments and Scripture. Answers are learned
clause by clause with spaced repetition (FSRS), and every proof text opens
in the KJV.

See [SPEC.md](SPEC.md) for the design, content sources and roadmap.

If Hearers helps you, you can support it on [Ko-fi](https://ko-fi.com/lukeboyle).

## Run

Hearers needs Node 24 or later. The server uses the `node:sqlite` module.

```bash
npm install
npm run dev        # the app on http://localhost:5173, without sync
npm start          # the server on http://localhost:3000 (run `npm run build` first)
npm test
npm run build      # the static PWA in dist/
npm run mobile     # the iOS and Android app, in Expo Go (install apps/mobile first)
```

The repository includes the generated data in `public/data/`. The app runs
without a rebuild of the data.

The app works in two ways:

- **Static.** Put `dist/` on any web host. All progress stays in the browser
  (IndexedDB). Use Export and Import in Settings to move it.
- **With the server.** `npm start` serves `dist/` and a sync API. Progress
  stays in the browser for offline use. The server keeps a copy in SQLite.
  Each device that opens the server URL syncs with that copy.

To get sync in development, run `npm start` in one terminal and `npm run dev`
in a second terminal. Vite sends `/api` requests to port 3000.

## Mobile app

`apps/mobile/` holds the iOS and Android app, made with Expo. It has its own `package.json` and its
own `node_modules`. It uses the code in `src/data/`, `src/lib/`, `src/store/` and `shared/` with no
copy. It keeps the progress on the device, and it can sync with a self-hosted server. Read
[apps/mobile/README.md](apps/mobile/README.md) to run it in Expo Go and to build it for the stores.

The app gets two modules in place of the web modules. So the web app does not change:

- `src/data/files.ts`: the web app fetches the data. The mobile app reads it from its bundle.
- `src/store/host.ts`: the web app syncs with its own server. The mobile app syncs with the server
  that the learner types in Settings.

## Traditions

On the first start, the app asks for a tradition: Reformed, Lutheran, or both.
The choice sets the documents in the library. The creeds and Scripture show
for every choice. Settings can change the choice. Progress in a document of
the other tradition stays in the reviews.

| Tradition | Documents |
|-----------|-----------|
| Both | Apostles', Nicene and Athanasian Creeds, Chalcedonian Definition, Scripture |
| Reformed | WSC, WLC, WCF, Heidelberg, Belgic, Dort, Ten Commandments (Reformed numbering) |
| Lutheran | Luther's Small Catechism, Luther's Large Catechism |

`scripts/build-data.ts` gives each document a `tradition`. Add a new document
to the `TRADITION` map there.

## Links to other sites

Each proof text links to its verse in the
[Self-Interpreting Bible](https://self-interpreting-bible.pages.dev) of John Brown of Haddington. If that chapter is not
online yet, the link does not show.

- `scripts/fetch-sib.mjs` writes the list of online chapters to `public/sib.json`. CI runs it
  before each build. If the site is not reachable, the build uses the copy in git.
- `npm run data` writes `public/data/cited.json`. This file maps each verse to the answers that
  cite it. The Self-Interpreting Bible reads it to link each verse back to those answers. The file
  puts a proof of more than five verses under its first verse only.
- Each answer can show a list of further reading. The list has public-domain expositions on
  [Monergism](https://www.monergism.com) and [CCEL](https://ccel.org), for example Watson, Fisher,
  Vincent, Ursinus, Ridgley and Shaw. `sources/reading.json` holds the links. `npm run data` writes
  them to `public/data/reading.json`. Monergism blocks plain HTTP clients, so check its links in a
  browser.

## Website

`site/` holds the homepage, a Next.js static export from the Tailwind Plus
Primer template. The template is under the Tailwind Plus licence.

```bash
npm --prefix site install
npm run site        # the app, then the homepage, merged into site/out/
```

`site/out/` holds the homepage at `/`, the self-hosting guide at
`/docs/self-hosting/`, and the app at `/app/`. Put the folder on any static
host. For Cloudflare Pages, `site/public/_headers` sets the cache rules.

The homepage sends a visitor who uses the app straight to `/app/`. These
visits still show the homepage:

- a first visit
- a visit from a link inside the app
- any visit to `/?home`

The app shows "About Hearers" in its footer under `/app/`. That link goes to
`/?home`. The Docker image serves the app at its root, without the homepage.

The screenshots in `site/src/images/screens/` come from the real app, with a
demo learner that the FSRS scheduler generated.

### Deployment

CI owns the deployment to Cloudflare Pages. Do not deploy from a workstation.

1. A push to `main` starts the `Website` workflow. It runs the tests and builds
   `site/out/`.
2. When `Website` passes, the `Deploy to Cloudflare Pages` workflow starts.
3. That workflow downloads the `site/out/` artifact. It does not build again.
4. It makes the Pages project `catechize` if the project does not exist.
5. It deploys the artifact to the production branch `main`.
6. It checks the homepage, `/app/`, `/app/data/index.json` and the guide.

A pull request from this repository also gets a preview. The job summary of
the `Website` run shows the preview address.

The workflows need two repository secrets:

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | An API token with the permission Account, Cloudflare Pages, Edit |
| `CLOUDFLARE_ACCOUNT_ID` | The account ID from the Cloudflare dashboard |

To add a custom domain, open the `catechize` project in the Cloudflare
dashboard. Then open Custom domains.

## Reminders

Reminders are for the self-hosted server only. The hosted app keeps all data in the browser, so it
has no server to send reminders, and Settings does not show the reminder card.

On a self-hosted server, each device can turn on a daily reminder at a local hour. At that hour, on
a day with answers due, the device gets a notification. On iPhone and iPad, the learner must first
add the app to the Home Screen.

A push carries no data. When a push arrives, the service worker (`public/push-sw.js`) counts the due
answers in IndexedDB on the device. The server stores only the push subscription, the hour, the time
zone and the next due time. The push code is in `shared/push.ts`.

To turn on reminders:

1. Run `node server/vapid.ts` to make a key pair.
2. Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.
3. Optionally, set `VAPID_SUBJECT` to a `mailto:` address.

A new key pair stops all current reminders.

## Analytics

The website and the hosted app count visits with Umami, as lector.dev does. Umami uses no cookies.
The app sends no answers, no notes and no text that the learner types.

- A Pages Function, `functions/a/[[path]].ts`, serves `/a/`. It forwards the tracker and the events
  to Umami, so the Umami address stays secret. The code is in `functions/_lib/analytics.ts`.
- The loader is in `shared/analytics-loader.ts`. The `<head>` of the app (`index.html`) has a copy.
  A test makes sure that the two copies are the same.
- The loader loads the tracker after the first input of the visitor.
- An element with `data-event="Name"` sends that event when the visitor clicks it. In the app,
  `track()` in `src/lib/track.ts` sends an event.

To turn on analytics, set these secrets on the Pages project `catechize`:

```bash
npx wrangler pages secret put ANALYTICS_FORWARDING_URL --project-name=catechize
npx wrangler pages secret put ANALYTICS_WEBSITE_ID --project-name=catechize
```

`ANALYTICS_FORWARDING_URL` is the Umami origin, with no path. `ANALYTICS_WEBSITE_ID` is the UUID
of the Umami website for Hearers. Leave either one empty to keep analytics off.

Analytics counts only `hearers.app`, `www.hearers.app` and `catechize.pages.dev`. To count another domain, set `ANALYTICS_HOSTS` to a
list of hosts with commas between them, for example `example.org,www.example.org`. Branch
previews, `localhost` and self-hosted servers send nothing.

## Sync

The server keeps one SQLite file, `DATA_DIR/catechize.db`. Each learner
record is one row in the table `records`. The views `cards` and `reviews`
show the main fields as columns.

Each device pushes its changes and pulls the changes of other devices. Sync
starts at these times:

- when the app opens
- a short time after each change
- every 5 minutes
- when the device is online again

When two devices change the same record, the later change wins. The review
log only grows, so sync keeps every review.

If the server loses its data, or you restore an older backup, each device
sends all of its records to the server again.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | The HTTP port. |
| `DATA_DIR` | `./data` | The directory for `catechize.db`. |
| `STATIC_DIR` | `./dist` | The built app. |
| `HEARERS_TOKEN` | none | When set, sync needs this token. Enter it once on each device, in Settings. |

## Docker

GitHub Actions builds the image `ghcr.io/3stacks/hearers` for
`linux/amd64` and `linux/arm64`. A push to `main` publishes the tag `latest`.
A tag `v1.2.3` publishes the tag `1.2.3`.

```bash
docker run -d -p 3000:3000 -v ./data:/data ghcr.io/3stacks/hearers:latest
```

To make a backup while the server runs, use the backup script in the
container. A copy of the live file from the host can include a write that is
not complete.

```bash
docker exec catechize node server/backup.ts /data/backup.db
```

## Rebuild the data

```bash
scripts/fetch-sources.sh                 # pinned upstream texts → sources/cache/
npm run extract:creeds -- "<file>.docx" sources/creeds-annotated.json   # only if the docx changes
npm run extract:schaff                   # only if the Schaff text changes
npm run data                             # → public/data/, reports any unresolved reference
```

`sources/schaff.json` holds the English Heidelberg Catechism and Belgic
Confession from Schaff, *The Creeds of Christendom*, vol. 3 (1877), on
[CCEL](https://ccel.org/ccel/schaff/creeds3). The text is in the public domain.
`scripts/extract-schaff.py` writes the file and corrects the errors of the
CCEL transcription. The proof texts of the Heidelberg Catechism come from
Creeds.json. The build aligns them to the Schaff text.

`sources/small-catechism.json` holds Luther's Small Catechism in the Triglot
Concordia translation (1921), without the editors' bracketed additions. The
build fetches the Large Catechism from Project Gutenberg.

`sources/creeds-text.json` holds the canonical Apostles' and Nicene wording
the annotated table is matched against; edit it if the creed text changes.

## Layout

```
scripts/        build-data.ts, fetch-sources.sh, extract-creeds-docx.py, extract-schaff.py
sources/        hand-maintained inputs (annotated creeds); cache/ is fetched
src/lib/        refs (Scripture parsing), chunk, grade: pure, unit-tested
src/data/       data types and loaders
src/store/      IndexedDB (Dexie), FSRS scheduling, stats and sync
src/views/      screens; Drill.tsx is the memorisation engine
shared/         the sync protocol, used by the app and the server
apps/mobile/    the iOS and Android app (Expo), with its own package.json
server/         HTTP server, SQLite store, backup script
site/           the homepage (Next.js), built into site/out/ with the app at /app/
```
