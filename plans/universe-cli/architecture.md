# Universe CLI — Architecture Note

## Overview

Universe CLI follows a hexagonal (ports and adapters) architecture. Command handlers
form the application layer; all external capabilities are accessed exclusively through
port interfaces. No command handler may import a concrete adapter directly.

---

## Layer Diagram

```
┌─────────────────────────────────────────────────────┐
│                  CLI Entry Point                    │
│  (wires adapters → commands via container.ts)       │
└────────────────────┬────────────────────────────────┘
                     │ injects ports
┌────────────────────▼────────────────────────────────┐
│               Command Handlers                      │
│  src/commands/{name}.ts                             │
│  · create.ts  (fully implemented)                   │
│  · register.ts, deploy.ts, promote.ts, rollback.ts  │
│  · logs.ts, status.ts, list.ts, teardown.ts         │
│    (all emit DeferredCommandError in this spike)    │
└──────┬──────────────────────────────────────────────┘
       │ depends on (port interfaces only)
┌──────▼──────────────────────────────────────────────┐
│                    Ports                            │
│  src/ports/                                         │
│  · observability-client.ts  ObservabilityClient     │
│  · prompt-port.ts           PromptPort              │
│  · create-input-validator.ts CreateInputValidator   │
│  · layer-resolver.ts        LayerResolver           │
│  · filesystem-writer.ts     FilesystemWriter        │
│  · platform-manifest-generator.ts                   │
│                             PlatformManifestGenerator│
└──────────────────────────────────────────────────────┘
       ▲ implemented by
┌──────┴──────────────────────────────────────────────┐
│                   Adapters                          │
│  src/adapters/                                      │
│  · stub-observability-client.ts  (no-op, spike)     │
│  · clack-prompt-adapter.ts       (Phase 2)          │
│  · local-layer-resolver.ts       (Phase 3)          │
│  · local-filesystem-writer.ts    (Phase 3)          │
│  · local-platform-manifest-generator.ts  (Phase 3)  │
└─────────────────────────────────────────────────────┘
```

---

## Layers

### CLI Entry Point

`src/cli.ts` (added in Phase 1). Parses the CLI command, resolves the appropriate
command handler, injects wired adapters from `src/container.ts`, and delegates.
Catches all errors and maps them to the appropriate exit code.

### Command Handlers (`src/commands/`)

Pure application logic. Each handler receives its dependencies via constructor
injection as port interfaces. Handlers never `import` from `src/adapters/`.

### Ports (`src/ports/`)

TypeScript interfaces that define every external boundary. Ports are owned by the
application layer, not the adapters that implement them.

| Port                        | Boundary                        |
| --------------------------- | ------------------------------- |
| `ObservabilityClient`       | telemetry / error reporting     |
| `PromptPort`                | interactive terminal input      |
| `CreateInputValidator`      | user-input validation contract  |
| `LayerResolver`             | template-layer filesystem reads |
| `FilesystemWriter`          | project-folder writes           |
| `PlatformManifestGenerator` | `platform.yaml` generation      |

### Adapters (`src/adapters/`)

Concrete implementations of ports. All spike-phase adapters implement the
`SpikeSafeAdapter` marker interface (`isSpikeStub: true`) so the container guard
test can assert that no real backend is wired.

### Container (`src/container.ts`)

Wires concrete adapters to port slots and exports them for injection into command
handlers. This is the only place where adapter imports appear.

---

## Spike-Mode Guardrail

`src/container.test.ts` asserts that every adapter exported from `container.ts` is
an instance of a known stub class. This test fails at compile time if a non-stub
adapter is assigned to a typed slot, and fails at runtime if a non-stub instance
sneaks in.

---

## Test Suites

All suites run under a single command: `pnpm test`.

| Suite           | Location pattern                  | Purpose                           |
| --------------- | --------------------------------- | --------------------------------- |
| Unit            | `src/**/*.test.ts`                | Logic, validation, error taxonomy |
| Contract        | `src/adapters/*.test.ts`          | Adapter ↔ port conformance        |
| CLI integration | `src/**/*.cli.test.ts` (Phase 1+) | End-to-end command invocation     |
| E2E             | `src/**/*.e2e.test.ts` (Phase 4)  | Full scaffold generation flows    |

---

## Error Taxonomy and Exit Codes

See `src/errors/cli-errors.ts` for canonical error classes. Exit codes:

| Code | Error                                                     |
| ---- | --------------------------------------------------------- |
| 0    | Success                                                   |
| 1    | `DeferredCommandError` — command not implemented in spike |
| 2    | `InvalidNameError`                                        |
| 3    | `TargetDirectoryExistsError`                              |
| 4    | `UnsupportedRuntimeError`                                 |
| 5    | `UnsupportedFrameworkError`                               |
| 6    | `UnsupportedCombinationError`                             |
| 7    | `InvalidMultiSelectError`                                 |
| 8    | `MissingLayerError`                                       |
| 9    | `LayerConflictError`                                      |
| 10   | `ScaffoldWriteError`                                      |

---

## Invariants

1. **No adapter imports in command handlers.** Commands depend only on port interfaces.
2. **No real backends in spike.** All adapters in `container.ts` must implement `SpikeSafeAdapter`.
3. **O11y is best-effort.** All observability calls go through `safeTrack` / `safeError`; failures are swallowed and must not affect command exit codes.
4. **Deterministic layer composition.** Same inputs always produce the same resolved layer set.
5. **No partial scaffolds.** The filesystem writer rolls back on unrecoverable failure.
