# Brief — shotsort

## What it is
A personal Python script. Point it at a folder of photos and it renames each
file to its EXIF capture date, then files it into `YYYY/YYYY-MM-DD/`.

## Who & when
Me, on my own laptop, a few times a year after emptying a camera card.

## How it should feel
Run it, glance at the summary, trust it. No thinking required.

## The hard/interesting part
Files with no EXIF at all, and two shots in the same second. Deciding what to
do with those without silently losing anything.

## The friction it replaces
Half an hour of dragging files into folders by hand and squinting at dates.

## Smallest useful version
Renames and files one folder of JPEGs correctly, and prints what it did.

## Human evidence
Observed by the builder — this replaces something I already do by hand.

## Constraints
Python 3.12, standard library plus Pillow. Runs from a cloned repo with
`python shotsort.py <folder>`. macOS only.

## Non-goals
Not published anywhere — no PyPI package, no installer, no releases. No GUI, no
server, no sync, no sharing, no other users, no undo history, no database, no
cloud storage, no video, no RAW.

## Shape chosen
One file, run directly. No package layout, because nobody installs it.

## What you're drawn to / unsure about
Drawn to the moment it prints "412 photos filed". Unsure about the no-EXIF pile.
