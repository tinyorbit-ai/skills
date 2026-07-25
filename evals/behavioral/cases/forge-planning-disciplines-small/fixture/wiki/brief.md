# Brief — envsure

## What it is
A Node/TypeScript CLI. `envsure.yaml` declares environment variables. The CLI
validates `.env`, generates `.env.example`, and checks `process.env.X` references.

## Who & when
A developer runs it locally and in CI before a deploy.

## How it should feel
Fast, exact, and boringly trustworthy.

## The hard/interesting part
Source scanning may use regex or an AST; false positives and native parser
platform support are unknown. The npm package/bin name must work via npx.

## The friction it replaces
Hand-maintained examples and runtime failures caused by drift.

## Smallest useful version
Schema validation plus `.env.example` sync on one fixture repository.

## Human evidence
Observed by the builder on two real repositories.

## Constraints
Node 20+, TypeScript, MIT, npm package, bin `envsure`, Linux/macOS/Windows.

## Non-goals
No daemon, GUI, secret manager, monorepo orchestration, or non-Node scanner.

## Shape chosen
One package with a pure core and thin CLI.
