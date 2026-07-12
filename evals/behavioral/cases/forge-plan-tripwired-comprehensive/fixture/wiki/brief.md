# Brief — shelfie

> Compiled by forge-discovery. Locked.

## What we're building

`shelfie` — a self-hosted, single-user web app for tracking my reading. Core
loop: I add a book by ISBN (metadata — title, author, cover URL, page count —
fetched from Open Library), set its status (want / reading / finished), and
while reading I log sessions (date, pages read, optional minutes). The app
gives me:

1. **Library view** — my books grouped by status, cover grid, searchable by
   title/author.
2. **Book page** — one book's detail: metadata, status controls, session log,
   a per-book progress bar (pages logged vs page count).
3. **Stats page** — books finished per year, pages per month (last 12 months),
   current pace (pages/day over the trailing 30 days), and my longest daily
   reading streak.
4. **Goodreads import** — one-shot CSV upload of my Goodreads export; maps
   title/author/ISBN/shelves/read-dates into my library; import is idempotent
   (re-uploading the same CSV creates no duplicates) and ends with a summary
   report (imported / skipped / failed rows and why).

Access is gated by a single passphrase (one user — me); sessions persist so I
log in roughly once per device. All data lives in SQLite on the server's disk.
Ships as one Docker container I run on my home server; the SQLite file lives on
a mounted volume so upgrades don't lose data.

## Who & when

Me (Matt). Logging a session takes under 15 seconds on my phone's browser at
the end of a reading sit; the stats page is a Sunday-morning coffee ritual.

## How it should feel

Calm and bookish, not dashboard-y. Logging a session is the sacred path — it
must be reachable in two taps from the library view and never make me think.
Numbers on the stats page should feel earned, like a notebook I kept honestly.

## The hard part

Two things. (1) Goodreads CSVs are filthy — missing ISBNs, ISBN-10 vs ISBN-13,
duplicate rows, shelves that don't map to my three statuses; the import must be
honest about what it skipped and why rather than silently mangling. (2) The
streak/pace math has real edge cases — multiple sessions a day, zero-page days,
timezone boundaries — and a stats page that's subtly wrong is worse than none.

## Constraints

- Server-rendered HTML with minimal JavaScript (progressive enhancement only —
  every feature works without JS). No SPA framework.
- SQLite as the only store. No external services besides the Open Library API.
- One Docker container, one mounted volume, one env var for the passphrase hash.
- Open Library is flaky: an ISBN lookup that fails must degrade to manual title/
  author entry, never block adding the book.
- Usable on a phone browser (that's where sessions get logged).

## Non-goals

- **Single user, full stop.** No accounts, no registration, no roles, no
  sharing, no social anything.
- **No recommendations, ratings, reviews, or notes.** It tracks reading, it
  doesn't opine.
- **No offline mode / PWA / service worker.** It's a website on my LAN/VPN.
- **No export, no API for other tools, no RSS.** (Maybe later; not this build.)
- No e-book file handling — it tracks books, it doesn't store them.

## Alternatives considered

Goodreads itself (owned by Amazon, cluttered, no pace math worth trusting),
StoryGraph (lovely but someone else's server), a spreadsheet (the phone logging
moment fails — 15 seconds becomes two minutes of cell-hunting). Self-hosting is
the point: the reading record should outlive any company.

## Sharpening

- **The specific moment:** closing the book at 11pm, phone in hand, logging
  "34 pages" before the light goes off — under 15 seconds or it won't happen.
- **The friction it replaces:** a Notes-app list I stopped updating in March.
- **Smallest useful version:** add by ISBN + status + session logging + library
  view. Stats and import make it *mine*, but tracking is the spine.
- **Ambition check (locked):** the import summary report and the honest streak
  math are the craft bar — both are named in "the hard part" on purpose.
