# Ports/Adapters Reorganisation

## Motivation

The current flat `src/adapters/` and `src/ports/` folders mix unrelated concerns: platform client stubs (deploy, list, logs, etc.) live alongside local infrastructure adapters (filesystem, git, prompts, package managers). As internal services grow to own their own adapters (e.g. `PackageManagerService` owns `BunPackageManager` and `PnpmPackageManager`), the clutter compounds.

## Target Structure

Reorganise by **domain co-location**: each domain folder owns its port(s), adapter(s), and service (if any). Remove the top-level `src/adapters/` and `src/ports/` folders entirely.

```
src/
  platform/
    deploy-client.port.ts
    deploy-client.stub.ts
    list-client.port.ts
    list-client.stub.ts
    logs-client.port.ts
    logs-client.stub.ts
    promote-client.port.ts
    promote-client.stub.ts
    registration-client.port.ts
    registration-client.stub.ts
    rollback-client.port.ts
    rollback-client.stub.ts
    status-client.port.ts
    status-client.stub.ts
    teardown-client.port.ts
    teardown-client.stub.ts
  package-manager/
    package-manager.port.ts
    bun-package-manager.ts
    pnpm-package-manager.ts
    package-manager.stub.ts
    package-manager.service.ts
  io/
    filesystem-writer.port.ts
    local-filesystem-writer.ts
    project-reader.port.ts
    local-project-reader.ts
    repo-initialiser.port.ts
    git-repo-initialiser.ts
    repo-initialiser.stub.ts
  prompt/
    prompt.port.ts
    clack-prompt.ts
  observability/
    observability-client.port.ts
    safe-observability-client.ts
    observability-client.stub.ts
  services/
    layers/
      always-layer.ts
      base-node-layer.ts
      base-static-layer.ts
      frameworks-layer.ts
      package-managers-layer.ts
      services-layer.ts
    layer-composition-service.ts
    create-input-validation-service.ts
    platform-manifest-service.ts
```

## Naming Conventions

- **Port files** use a `.port.ts` secondary extension: `deploy-client.port.ts`
- **Adapter files** are named after the technology they wrap: `bun-package-manager.ts`, `clack-prompt.ts`, `git-repo-initialiser.ts`, `local-filesystem-writer.ts`
- **Stub files** use a `.stub.ts` secondary extension: `deploy-client.stub.ts`
- **Service files** use a `.service.ts` secondary extension when co-located inside a domain folder: `package-manager.service.ts`
- Services that do not own adapters live in `src/services/` and keep their current `-service.ts` suffix

The dot secondary extension groups related files by their shared root in file tree listings:

```
deploy-client.port.ts
deploy-client.stub.ts   ← pairing is visually obvious
```

## Class/Interface Naming

Type and class names do **not** repeat the role — the file path carries that context:

| File                      | Exported name              |
| ------------------------- | -------------------------- |
| `deploy-client.port.ts`   | `interface DeployClient`   |
| `deploy-client.stub.ts`   | `class StubDeployClient`   |
| `bun-package-manager.ts`  | `class BunPackageManager`  |
| `clack-prompt.ts`         | `class ClackPrompt`        |
| `git-repo-initialiser.ts` | `class GitRepoInitialiser` |

## `src/services/` scope

`src/services/` is for pure-logic services that do not own adapters. Currently:

- `LayerCompositionService`
- `CreateInputValidationService`
- `PlatformManifestService`

`PackageManagerService` moves to `src/package-manager/` because it owns and delegates to adapters.

## Files to move (current → target)

| Current                                               | Target                                                |
| ----------------------------------------------------- | ----------------------------------------------------- |
| `src/ports/deploy-client.ts`                          | `src/platform/deploy-client.port.ts`                  |
| `src/adapters/stub-deploy-client.ts`                  | `src/platform/deploy-client.stub.ts`                  |
| `src/adapters/stub-deploy-client.test.ts`             | `src/platform/deploy-client.stub.test.ts`             |
| `src/ports/list-client.ts`                            | `src/platform/list-client.port.ts`                    |
| `src/adapters/stub-list-client.ts`                    | `src/platform/list-client.stub.ts`                    |
| `src/adapters/stub-list-client.test.ts`               | `src/platform/list-client.stub.test.ts`               |
| `src/ports/logs-client.ts`                            | `src/platform/logs-client.port.ts`                    |
| `src/adapters/stub-logs-client.ts`                    | `src/platform/logs-client.stub.ts`                    |
| `src/adapters/stub-logs-client.test.ts`               | `src/platform/logs-client.stub.test.ts`               |
| `src/ports/promote-client.ts`                         | `src/platform/promote-client.port.ts`                 |
| `src/adapters/stub-promote-client.ts`                 | `src/platform/promote-client.stub.ts`                 |
| `src/adapters/stub-promote-client.test.ts`            | `src/platform/promote-client.stub.test.ts`            |
| `src/ports/registration-client.ts`                    | `src/platform/registration-client.port.ts`            |
| `src/adapters/stub-registration-client.ts`            | `src/platform/registration-client.stub.ts`            |
| `src/adapters/stub-registration-client.test.ts`       | `src/platform/registration-client.stub.test.ts`       |
| `src/ports/rollback-client.ts`                        | `src/platform/rollback-client.port.ts`                |
| `src/adapters/stub-rollback-client.ts`                | `src/platform/rollback-client.stub.ts`                |
| `src/adapters/stub-rollback-client.test.ts`           | `src/platform/rollback-client.stub.test.ts`           |
| `src/ports/status-client.ts`                          | `src/platform/status-client.port.ts`                  |
| `src/adapters/stub-status-client.ts`                  | `src/platform/status-client.stub.ts`                  |
| `src/adapters/stub-status-client.test.ts`             | `src/platform/status-client.stub.test.ts`             |
| `src/ports/teardown-client.ts`                        | `src/platform/teardown-client.port.ts`                |
| `src/adapters/stub-teardown-client.ts`                | `src/platform/teardown-client.stub.ts`                |
| `src/adapters/stub-teardown-client.test.ts`           | `src/platform/teardown-client.stub.test.ts`           |
| `src/ports/package-manager.ts`                        | `src/package-manager/package-manager.port.ts`         |
| `src/adapters/bun-package-manager-adapter.ts`         | `src/package-manager/bun-package-manager.ts`          |
| `src/adapters/bun-package-manager-adapter.test.ts`    | `src/package-manager/bun-package-manager.test.ts`     |
| `src/adapters/pnpm-package-manager-adapter.ts`        | `src/package-manager/pnpm-package-manager.ts`         |
| `src/adapters/pnpm-package-manager-adapter.test.ts`   | `src/package-manager/pnpm-package-manager.test.ts`    |
| `src/adapters/stub-package-manager-adapter.ts`        | `src/package-manager/package-manager.stub.ts`         |
| `src/services/package-manager-service.ts`             | `src/package-manager/package-manager.service.ts`      |
| `src/services/package-manager-service.test.ts`        | `src/package-manager/package-manager.service.test.ts` |
| `src/ports/filesystem-writer.ts`                      | `src/io/filesystem-writer.port.ts`                    |
| `src/adapters/local-filesystem-writer.ts`             | `src/io/local-filesystem-writer.ts`                   |
| `src/adapters/local-filesystem-writer.test.ts`        | `src/io/local-filesystem-writer.test.ts`              |
| `src/ports/project-reader.ts`                         | `src/io/project-reader.port.ts`                       |
| `src/adapters/local-project-reader.ts`                | `src/io/local-project-reader.ts`                      |
| `src/adapters/local-project-reader.test.ts`           | `src/io/local-project-reader.test.ts`                 |
| `src/ports/repo-initialiser.ts`                       | `src/io/repo-initialiser.port.ts`                     |
| `src/adapters/git-repo-initialiser-adapter.ts`        | `src/io/git-repo-initialiser.ts`                      |
| `src/adapters/git-repo-initialiser-adapter.test.ts`   | `src/io/git-repo-initialiser.test.ts`                 |
| `src/adapters/stub-repo-initialiser-adapter.ts`       | `src/io/repo-initialiser.stub.ts`                     |
| `src/ports/prompt.ts`                                 | `src/prompt/prompt.port.ts`                           |
| `src/adapters/clack-prompt-adapter.ts`                | `src/prompt/clack-prompt.ts`                          |
| `src/adapters/clack-prompt-adapter.test.ts`           | `src/prompt/clack-prompt.test.ts`                     |
| `src/ports/observability-client.ts`                   | `src/observability/observability-client.port.ts`      |
| `src/adapters/base-safe-observability-client.ts`      | `src/observability/safe-observability-client.ts`      |
| `src/adapters/base-safe-observability-client.test.ts` | `src/observability/safe-observability-client.test.ts` |
| `src/adapters/stub-observability-client.ts`           | `src/observability/observability-client.stub.ts`      |
