# Architecture

**Components & boundaries:** one file, `src/csvstats.js` — parse, compute, print.
The boundary is the CLI surface itself; nothing else earns a module at this size.

**Data flow:** argv → read file → split lines → header + data rows → numeric column
means → stdout.

**Central bet:** RFC-4180-minimal parsing (split on commas, no quoted-field
handling) is enough for the CSVs this tool actually meets. Revisit if a real file
with quoted commas shows up.

**Scale assumptions:** whole-file read is fine to ~50 MB (the brief's ceiling);
streaming would be the 10× answer and no phase needs it.

**Parts list:** `node:fs` (file read — brief: zero deps), `node:test` (tests —
brief: zero deps).
