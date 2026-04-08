# `universe create` Supported Matrix (Spike Lock)

This table is the explicit support lock for the create-first spike.

| Runtime              | Framework | Databases               | Platform services            | Status    |
| -------------------- | --------- | ----------------------- | ---------------------------- | --------- |
| Node.js (TypeScript) | Express   | PostgreSQL, Redis, None | Auth, Email, Analytics, None | supported |
| Node.js (TypeScript) | None      | PostgreSQL, Redis, None | Auth, Email, Analytics, None | supported |
| Static (HTML/CSS/JS) | None      | None only               | None only                    | supported |

## Rules

- `None` excludes all other values in the same multi-select group.
- Static supports `None` only for databases and platform services.
- Any runtime, framework, database, or platform service combination not listed as supported is unsupported in this spike.

## Deferred options

The following options are explicitly deferred for later phases:

- Runtime: Python, Go
- Framework: Next.js, Fastify, Hono, Flask
- Database: MongoDB, SQLite
