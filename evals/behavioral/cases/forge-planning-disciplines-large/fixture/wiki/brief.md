# Brief — Beacon

## What it is
A self-hosted uptime monitor and public status-page platform: HTTP/TCP/heartbeat
checks, confirmation-before-alerting, incidents, 90-day history, and owner/member auth.

## Who & when
One operator or a five-person team runs up to 1,000 monitors at 30-second intervals.

## How it should feel
Quiet, trustworthy, and operable by a small team.

## The hard/interesting part
Scheduler drift, crash recovery, honest uptime math, and portable SQLite/Postgres state.

## The friction it replaces
Separate monitors, alert glue, and status pages that disagree during an outage.

## Smallest useful version
Docker run, add one HTTP monitor, observe an outage/recovery, and show it publicly.

## Human evidence
Observed with two operators using their current tools.

## Constraints
Single multi-arch Docker image; SQLite default, Postgres optional; useful within
10 minutes. Target p99 scheduler drift under 2 seconds at 1,000 monitors.

## Non-goals
No multi-region probe network, enterprise SSO, or Kubernetes operator.

## Shape chosen
One Go binary with an embedded UI, scheduler/worker pool, and explicit store boundary.
