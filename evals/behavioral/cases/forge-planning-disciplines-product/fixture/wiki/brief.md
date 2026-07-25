# Brief — Crewly

## What it is
A multi-tenant SaaS for volunteer-run organizations: events/shifts, accountless
mobile signup, waitlists, reminders, hours/reports, org roles, Stripe billing,
onboarding, support admin, and a marketing site.

## Who & when
An organizer publishes a shift link; a volunteer signs up on a phone in under a minute.

## How it should feel
Warm, immediate, and impossible to double-book or ghost-remind.

## The hard/interesting part
Tenant isolation and the concurrent drop → waitlist promotion → reminder lifecycle.

## The friction it replaces
WhatsApp and spreadsheets. No real organization has yet used a Crewly workflow.

## Smallest useful version
One org creates an event, shares a link, and volunteers sign up/drop without accounts.

## Human evidence
Unknown — schedule a human-evidence gate after the smallest useful workflow and
before billing/scale/polish. Two real organizations should run one live event.

## Constraints
Web-first, mobile responsive, email first; SMS and Stripe are external providers.

## Non-goals
No native apps, payroll, ticketing, social feed, or enterprise SSO.

## Shape chosen
One modular web app plus worker and Postgres, multi-tenant from the first migration.

## What you're drawn to / unsure about
Drawn to the accountless volunteer flow; unsure whether automatic promotion feels safe.
