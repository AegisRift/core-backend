# Event Versioning Strategy

- Start with internal event bus + outbox.
- Keep integration events in `v1` namespaces.
- Introduce dual publishing with feature flag (`KAFKA_ENABLED=true`).
- Maintain backward compatibility for payload evolution.
- Use dead-letter topics and idempotent consumers when migrating to external brokers.
