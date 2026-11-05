# Catechize

Memorise and study the Westminster Standards, the Three Forms of Unity,
Luther's Small and Large Catechisms, the ecumenical creeds, the Ten
Commandments and Scripture. Answers are learned
clause by clause with spaced repetition (FSRS), and every proof text opens
in the KJV.

See [SPEC.md](SPEC.md) for the design, content sources and roadmap.

If Catechize helps you, you can support it on [Ko-fi](https://ko-fi.com/lukeboyle).

## Run

Catechize needs Node 24 or later. The server uses the `node:sqlite` module.

```bash
npm install
npm run dev        # the app on http://localhost:5173, without sync
npm start          # the server on http://localhost:3000 (run `npm run build` first)
npm test
npm run build      # the static PWA in dist/
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

The app shows "About Catechize" in its footer under `/app/`. That link goes to
`/?home`. The Docker image serves the app at its root, without the homepage.

The screenshots in `site/src/images/screens/` come from the real app, with a
demo learner that the FSRS scheduler generated.

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
| `CATECHIZE_TOKEN` | none | When set, sync needs this token. Enter it once on each device, in Settings. |

## Docker

GitHub Actions builds the image `ghcr.io/3stacks/catechize` for
`linux/amd64` and `linux/arm64`. A push to `main` publishes the tag `latest`.
A tag `v1.2.3` publishes the tag `1.2.3`.

```bash
docker run -d -p 3000:3000 -v ./data:/data ghcr.io/3stacks/catechize:latest
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
npm run data                             # → public/data/, reports any unresolved reference
```

`sources/small-catechism.json` holds Luther's Small Catechism in the Triglot
Concordia translation (1921), without the editors' bracketed additions. The
build fetches the Large Catechism from Project Gutenberg.

`sources/creeds-text.json` holds the canonical Apostles' and Nicene wording
the annotated table is matched against; edit it if the creed text changes.

## Layout

```
scripts/        build-data.ts, fetch-sources.sh, extract-creeds-docx.py
sources/        hand-maintained inputs (annotated creeds); cache/ is fetched
src/lib/        refs (Scripture parsing), chunk, grade: pure, unit-tested
src/data/       data types and loaders
src/store/      IndexedDB (Dexie), FSRS scheduling, stats and sync
src/views/      screens; Drill.tsx is the memorisation engine
shared/         the sync protocol, used by the app and the server
server/         HTTP server, SQLite store, backup script
site/           the homepage (Next.js), built into site/out/ with the app at /app/
```
