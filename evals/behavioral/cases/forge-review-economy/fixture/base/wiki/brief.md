# Brief — csvstats

> Locked. (Eval fixture.)

**What:** a zero-dependency Node CLI: `csvstats <file.csv>` prints the number of
data rows and the mean of each numeric column. Nothing else.

**Who & when:** me, when a CSV lands in a ticket and I want its shape in one command
without opening a spreadsheet.

**Feel:** instant, boring, trustworthy. The numbers must simply be right.

**Constraints:** Node ≥ 20, zero runtime dependencies, works on files up to ~50 MB.

**Non-goals:** no quoting-edge-case CSV parser ambitions (RFC 4180 minimal), no
output formats, no stdin mode in v1.
