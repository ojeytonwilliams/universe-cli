# Repository Organisation Plan

## Goals

Keep complexity under control as the eight stubbed commands are implemented by:

- Giving each command its own file (and optionally its own directory for private logic)
- Grouping platform clients by external system, not by command
- Isolating runtime-type branching (static vs server) in a service layer, keeping command handlers agnostic

---

## 1. Split `commands.ts` into per-command files

Replace the single `src/commands.ts` with one directory per command, each containing an `index.ts` handler plus any private logic:

```
src/commands/
  create/
    index.ts                  ← command handler
    package-manager/          ← private to create; mirrors current src/package-manager/
      package-manager.port.ts
      package-manager.service.ts
      pnpm-package-manager.ts
      bun-package-manager.ts
      package-manager.stub.ts
    prompt/                   ← private to create; mirrors current src/prompt/
      prompt.port.ts
      clack-prompt.ts
      prompt.stub.ts
  register/
    index.ts
  deploy/
    index.ts
    deployment-id.ts          ← example of command-private logic
  promote/
    index.ts
  rollback/
    index.ts
  logs/
    index.ts
  status/
    index.ts
  list/
    index.ts
  teardown/
    index.ts
```

Command handlers stay thin — they wire services and platform clients together and handle user-facing output. Business logic belongs in `services/`; infrastructure belongs in `platform/`.

Private logic that is not shared with any other command lives inside the command's directory. Only promote something to `services/` when two or more commands need it.
