# Serverless / Lambda Focus Pack

Load when the PR touches `lambdas/**`, `serverless.ts`/`serverless.yml`, SAM/CDK
function definitions, Lambda packaging or bundling config, function env vars or IAM,
runtime versions, or native dependencies.

Deployment artifacts are a first-class review surface, not config noise — a diff
that deploys is a diff that can take production down without a single code bug.

Look for:

- **Platform limits.** Lambda caps a function's total env-var configuration at
  4 KB and deployment packages at 50 MB zipped / 250 MB unzipped. Adding a large
  value — an RSA/PEM private key, a cert chain, a JSON blob — to a function's env
  map can push it over the limit and break every subsequent deploy.
- **Large secrets never ride env vars.** Private keys, certs, signing keys, and
  blobs default to a runtime fetch (Secrets Manager / SSM parameter, cached across
  invocations); env injection is for small scalars.
- **Container conventions don't transfer.** The same env-var pattern that is safe
  on ECS/EC2 can be unsafe in Lambda configuration. A cited ECS precedent proves
  nothing about a Lambda — check the target platform's own limits.
- **Native and bundled dependencies.** Anything with a compiled component must be
  explicitly packaged, layered, marked external, or verified present in the
  runtime; "works locally" is not evidence.
- **Module-scope initialization.** Connections and clients created at module scope
  live across warm invocations. A cached connection promise that can hold a
  rejection poisons every later invocation of the warm container — init must clear
  its cache on rejection or retry. Anything added at module scope is also
  cold-start cost; weigh it.
- **IAM, timeout, memory.** Permission changes scoped to least privilege;
  timeout/memory changes justified against what the handler actually does.
