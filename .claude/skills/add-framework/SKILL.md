---
name: add-framework
description: Interactively adds a new framework to the layers-composition system. Asks the user for the framework name, its runtime, display label, an optional boilerplate directory, and then makes all required code changes across frameworks-layer.ts, prompt.port.ts, clack-prompt.ts, and create-input-validation-service.ts.
allowed-tools: AskUserQuestion Read Edit Bash Glob
---

# Add Framework

Guide the user through registering a new framework in the layers-composition system.

## Step 1 — Gather information

Ask the user these questions **one at a time** using `AskUserQuestion`:

1. **Framework key** — the machine-facing ID used in code and config (e.g. `fastify`, `hono`, `vite`). Must be lowercase kebab-case.
2. **Runtime** — which runtime this framework targets. Present the two options:
   - `node` — Node.js (TypeScript)
   - `static_web` — Static (HTML/CSS/JS)
3. **Display label** — the human-readable name shown in the CLI prompt (e.g. `Fastify`, `Hono`, `Vite`).
4. **Boilerplate directory** — an optional path to a directory containing example starter files (e.g. `/tmp/my-fastify-app`). If provided, the files in that directory will be used to populate the layer. If omitted, hand-write a minimal starter instead.

## Step 2 — Build the file map

### If a boilerplate directory was provided

Use `Glob` with pattern `**/*` on the directory to discover all files, then `Read` each file.

For each file:

- Use a path relative to the boilerplate root as the key (e.g. `src/index.ts`, `package.json`).
- Use the raw file content as the value.
- Replace any hard-coded project name strings with `{{name}}` (rendered at build time).

**Dependency version normalisation** — if the boilerplate contains a `package.json`, convert every dependency version to a caret major-only range before inlining it:

- `^1.2.3` → `^1`
- `~1.2.3` → `^1`
- `1.2.3` → `^1`
- `^0.9.1` → `^0` (preserve the major even when it is 0)

Apply this to all of `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies`.

### If no boilerplate directory was provided

Hand-write a minimal set of starter files appropriate for the runtime and framework. Model on the existing `express` (node) or `none` (static_web) entries in `frameworks-layer.ts`.

## Step 3 — Implement the framework layer

Open `src/commands/create/layers-composition/layers/frameworks-layer.ts`.

Add a new entry to the `frameworksLayer` object with the key `"frameworks/<key>"`:

```ts
"frameworks/<key>": {
  // include dockerfileData when runtime is node (see below)
  files: {
    "src/index.ts": `...`,
    "package.json": JSON.stringify({ ... }),
    // other files
  },
},
```

**Runtime guidance for `dockerfileData`:**

- **node**: include `dockerfileData` with at minimum `baseImage` (e.g. `"node:22-alpine"`) and `devCopySource`. Model it on the existing `express` or `typescript` entries.
- **static_web**: omit `dockerfileData` entirely — the base static layer supplies the Dockerfile.

Keep entries sorted alphabetically by key within the object.

## Step 4 — Register the option key and label

Open `src/commands/create/prompt/prompt.port.ts`.

1. Add the new key to `FRAMEWORK_OPTIONS` (alphabetical order):
   ```ts
   MYFRAMEWORK: "<key>",
   ```
2. Add the display label to `FRAMEWORK_LABELS` (same order):
   ```ts
   [FRAMEWORK_OPTIONS.MYFRAMEWORK]: "<Display Label>",
   ```

## Step 5 — Wire the framework into the prompt

Open `src/commands/create/prompt/clack-prompt.ts`.

- **node** runtime: add `FRAMEWORK_OPTIONS.<KEY>` to `NODE_FRAMEWORK_OPTIONS` (insert before `FRAMEWORK_OPTIONS.NONE`).
- **static_web** runtime: add `FRAMEWORK_OPTIONS.<KEY>` to `STATIC_FRAMEWORK_OPTIONS` (insert before `FRAMEWORK_OPTIONS.NONE`).

## Step 6 — Register in input validation

Open `src/commands/create/create-input-validation-service.ts`.

Add the new framework key to the appropriate supported list:

- **node** runtime: add `FRAMEWORK_OPTIONS.<KEY>` to `SUPPORTED_NODE_FRAMEWORKS` (keep sorted alphabetically).
- **static_web** runtime: add `FRAMEWORK_OPTIONS.<KEY>` to `SUPPORTED_STATIC_FRAMEWORKS` (keep sorted alphabetically).

Then open `src/commands/create/create-input-validation-service.test.ts` and add an acceptance test for the new combination, modelled on the existing `"accepts supported Static combination"` or `"accepts supported Node.js combinations"` test.

## Step 7 — Verify

Run `pnpm test` to confirm nothing is broken. If tests fail, diagnose and fix before finishing.

## Constraints

- Follow all rules in the `typescript-guidelines` skill when editing `.ts` files.
- Do not modify any files other than the four source files and their test files listed in steps 3–6.
- Do not add new test files — modify existing ones only.
