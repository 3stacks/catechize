# Catechize

Memorise and study the Westminster Standards, the Three Forms of Unity, the
ecumenical creeds, the Ten Commandments and Scripture. Answers are learned
clause by clause with spaced repetition (FSRS), and every proof text opens
in the KJV.

See [SPEC.md](SPEC.md) for the design, content sources and roadmap.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test
npm run build      # static PWA in dist/
```

The generated data in `public/data/` is committed, so the app runs without
rebuilding it.

## Rebuild the data

```bash
scripts/fetch-sources.sh                 # pinned upstream texts → sources/cache/
npm run extract:creeds -- "<file>.docx" sources/creeds-annotated.json   # only if the docx changes
npm run data                             # → public/data/, reports any unresolved reference
```

`sources/creeds-text.json` holds the canonical Apostles' and Nicene wording
the annotated table is matched against; edit it if the creed text changes.

## Layout

```
scripts/        build-data.ts, fetch-sources.sh, extract-creeds-docx.py
sources/        hand-maintained inputs (annotated creeds); cache/ is fetched
src/lib/        refs (Scripture parsing), chunk, grade: pure, unit-tested
src/data/       data types and loaders
src/store/      IndexedDB (Dexie) and FSRS scheduling
src/views/      screens; Drill.tsx is the memorisation engine
```
