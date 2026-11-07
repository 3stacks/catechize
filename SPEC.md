# Hearers: spec

An offline-first app for memorising and studying the Reformed and Lutheran
confessions and catechisms, the creeds and Scripture.

## The problem it solves

Flashcards that test a whole catechism answer fail as the answers get
longer: one missed phrase fails the card, so the schedule is always wrong
and long answers never stick. Hearers schedules **chunks** (clauses of
about 4–12 words) independently and only asks for the whole answer once
every chunk is stable.

## Data model

```
Document  (WSC, WLC, WCF, HC, BC, Dort, creeds, Decalogue, My verses)
 ├─ groups[]      sections for browsing (WCF chapters, HC Lord's Days, …)
 └─ units[]       one memorisable text
     ├─ ref, prompt     "Q. 33", "What is justification?"
     ├─ text
     ├─ chunks[]        [start, end) offsets into text
     ├─ proofs[]        { span, refs[] }: each footnote attached to its phrase
     └─ notes[]         { span, refs[], hymn?, parallel? }: annotations
Harmony   side-by-side table of phrases or units across documents
```

Every span is a character range in the unit's text, so chunks, proof texts
and annotations all address the same string. Scripture references are
normalised to compact OSIS-style ids (`Rom.8.28-30`) and checked against
the KJV at build time; the build fails loudly (as warnings) on anything
that does not resolve.

Generated files live in `public/data/`:
`index.json`, `docs/<id>.json`, `harmonies/<id>.json`, `kjv/<Book>.json`.

## Chunking

`src/lib/chunk.ts` picks cut points by shortest path over word boundaries:

- chunk cost rises with distance from 8 words, steeply past 14;
- a cut after `. ; : ? !` is free, after `,` cheap, before a conjunction
  dearer, mid-phrase dearest;
- footnote positions and annotated-phrase boundaries get a small discount,
  since they mark the authors' own clause breaks.

Chunking is deterministic, so card ids (`<unitId>#<chunkIndex>`) are
stable across builds unless a text or the algorithm changes.

## Drill

| Stage  | What the learner sees | Graded |
|--------|-----------------------|--------|
| Read   | Whole text, chunk boundaries tinted, memory aid; "Listen" uses device TTS | no |
| Trace  | Words shown faintly; type through | no |
| Fade   | Every other word hidden; type through (Settings can turn it off) | no |
| Recall | Tested chunks blank; others shown dimmed as context; type, or "Say it" | yes, per chunk |

Input modes: **first letters** (default; one key per word) or **whole
words** (checked on space). Three wrong keys on a word, or "Show word",
reveal it.

Grading is automatic: per chunk, 0 errors = Good, 1 error (or ≤10%) = Hard,
more or any reveal = Again. No self-rating, but the results screen lets the
learner tap a grade to forgive a typo or a misheard word before it is saved.

**Spoken recitation.** Where the browser has speech recognition, "Say it"
listens to the rest of the answer and scores it with `diffWords`, leniently
(`soundsLike`: British/American spelling, one-letter slips in long words).
Extra words are ignored. Reviews record `mode: 'spoken'`.

**Memory aids.** A free-text note per unit (an acrostic, a picture, a verse
it echoes), shown on the read stage and the results screen.

## Scheduling

FSRS (`ts-fsrs`), target retention 90% (configurable to 85/95%).

- Learning a unit creates one card per chunk and records the first recall.
- Reviews hide only the due chunks of a unit.
- When every chunk has stability ≥ 14 days, a **whole** card unlocks:
  recite the full text with nothing showing. Chunks that fail during a
  whole recitation are sent back through their own reviews.
- Courses: work through a document in order at N new units/day.
- Optional: no new material on the Lord's Day, reviews only.
- Optional daily review limit (20/40/80 units); the most overdue go first
  and the rest wait, so a backlog after a break is spread over days.
- **Trouble spots** (leeches): a chunk with 4+ lapses that is still under
  21 days' stability. Today links to a practice session over them that does
  not touch the schedule, and the unit page suggests a memory aid.

## Progress

Streak (days in a row with a review; yesterday's streak lasts until today
ends), longest streak, a 26-week review heatmap, a 14-day forecast of units
due, true recall over 30 days (excluding each card's first attempt), mature
parts, and per-document counts.

## Storage and sync

All learner state is in IndexedDB on the device, so the app works offline.
Settings exports and imports a JSON backup (version 2; version 1 files still
import).

When served by `server/main.ts`, the app also syncs to SQLite:

- Synced tables: `cards`, `log` (reviews, string ids), `courses`,
  `learned`, `verses`, `settings`, `notes`. `meta` (sync position) and
  `tombstones` (pending deletions) stay on the device.
- Dexie hooks stamp each local write with `_u` (time) and `_dirty = 1`.
  Deletions go through `removeRows`, which records a tombstone.
- `POST /api/sync { epoch, since, changes }` applies the changes last-writer-
  wins on `_u`, then returns server changes with `seq > since` (paged).
- A new or restored server database (different epoch, or `since` ahead of
  the server) makes the client pull from 0 and push every row again.
- Optional bearer token (`HEARERS_TOKEN`), entered once per device.

## Content (built)

| Doc | Units | Proof texts | Source |
|-----|-------|-------------|--------|
| Westminster Shorter Catechism | 107 | OPC footnotes, aligned onto the 1647 text | Creeds.json + hubot-wsc |
| Westminster Larger Catechism | 196 | yes | Creeds.json |
| Westminster Confession (1646) | 172 sections | yes | Creeds.json |
| Ten Commandments | 16 | Deut. 5 parallels | KJV Exod. 20, Reformed numbering, short + full forms |
| Apostles' Creed | 3 articles | phrase-level, with hymns | Luke's annotated harmony |
| Nicene Creed | 3 articles | phrase-level, with hymns | Luke's annotated harmony |
| Athanasian Creed | 22 sections | – | Creeds.json |
| Chalcedonian Definition | 1 | – | Creeds.json |
| Heidelberg Catechism | 129, by Lord's Day | yes | Creeds.json |
| Belgic Confession | 37 | – | Creeds.json |
| Canons of Dort | 93 articles + rejections | inline in text | Creeds.json |
| Luther's Small Catechism | 39 parts (commandments, creed, prayer, sacraments, confession, daily prayers) | Scripture per part | Triglot Concordia (1921), Bente & Dau, via bookofconcord.org |
| Luther's Large Catechism | 354 paragraphs | – | Triglot Concordia (1921), Bente & Dau, Project Gutenberg #1722 |
| My verses | learner-added | – | KJV, from any proof text |

**Traditions.** Each document has `tradition: common | reformed | lutheran`.
The learner picks Reformed, Lutheran or both on first run (Settings can
change it); Library, Today's study tiles and harmonies filter by it. Creeds
and Scripture are common. The Ten Commandments document is Reformed because
of its numbering; Lutherans get Luther's numbering in the Small Catechism.

Harmonies: Apostles' ↔ Nicene phrase by phrase (Scripture + hymn per row);
each commandment ↔ WSC / WLC / Heidelberg questions.

### Licensing

Private use only for now. Before any public release:

- **Heidelberg**: upstream text appears to be the Canadian Reformed *Book of
  Praise* translation (copyright). Swap for Schaff (1877).
- **Belgic**: upstream text appears to be the CRC 1985 translation
  (copyright). Swap for a public-domain translation.
- **WSC proof texts**: the OPC's footnote selection. References are facts,
  but confirm before publishing or switch to the 1648 Assembly proofs.
- **Nicene wording**: from the annotated docx (LSB-style); confirm the
  source and its terms.
- Hymn references are titles and numbers only (Rejoice!, LSB).
- **Luther's catechisms**: Triglot Concordia (1921) is public domain. The
  Small Catechism text was taken from bookofconcord.org; confirm their terms
  for the transcription, or re-key it from a scan.
- **Public website**: `site/` publishes the app, so every item above must be
  settled before the site goes live.

## Roadmap

**Next**

1. **Reading plans**: Bible in a year (M'Cheyne, cover to cover,
   chronological) and in 2–3 years via a pace setting on the same plan.
   Catch-up options: shift the schedule, spread missed days over a week, or
   skip. Today's reading marks verses that are proof texts ("WSC 33,
   WCF 11.1") and long-press adds a verse to My verses.
2. **Lord's Prayer** (Matt. 6:9–13 KJV) with WSC 98–107 and HC LD 45–52,
   completing Creed / Commandments / Prayer.
3. **More drill modes**: cloze by phrase; chain recall (given chunk *n*,
   produce *n*+1).
4. **Daily reminder**: a push notification when reviews are due (needs
   Web Push keys on the server).

**Later**

- Topical harmony across WSC / WLC / WCF / HC / BC / Dort (e.g.
  justification: WSC 33, WLC 70–71, WCF 11, HC 59–64, BC 22–23).
- Public-domain commentary per unit: Watson's *Body of Divinity* and
  Fisher's *Catechism* (WSC), Ursinus (HC), Shaw and A. A. Hodge (WCF).
- WCF 1646 vs American revision (chapters 20, 23, 31) side by side.
- Children's / First Catechism; metrical psalms (1650 Scottish Psalter).
- Polity: Form of Presbyterial Church Government, Directory for Public
  Worship, a denomination's Book of Church Order.

Out of scope by decision: household and congregation features.
