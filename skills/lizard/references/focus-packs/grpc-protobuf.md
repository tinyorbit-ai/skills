# gRPC and Protobuf Focus Pack

Load when changed files or PR context mention `.proto`, protobuf, gRPC, RPC services, generated RPC clients/servers, wire formats, or schema evolution.

Look for:

- Breaking schema changes: reused field/tag numbers, deleted fields without reserved numbers/names, changed field types, scalar/repeated changes, renamed enum values used for interchange, or newly required fields.
- Rollout/version-skew risks where clients and servers might not deploy together or might roll back independently.
- Enum evolution problems: missing unspecified/default value, reused enum numbers, or aliases/removals that old clients cannot handle.
- RPC robustness gaps: missing/changed deadlines, cancellation behavior, retries, idempotency, streaming/backpressure, or error/status mapping.
- Storage/API coupling where one message shape is reused for long-term storage and external RPC contracts despite different evolution needs.
- Generated-code/package options that can collide with hand-written code or other generated packages.

Good findings cite the compatibility or rollout risk, explain who breaks under version skew, and suggest the smallest compatible direction: reserve names/numbers, add instead of mutate, introduce a new field/message/RPC, preserve old behavior during rollout, or document required migration order.

Reference basis: Protocol Buffers best practices; gRPC deadlines/cancellation guidance.
