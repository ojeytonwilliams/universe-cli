# Universe CLI

## Project

The planning documents (PRD, summary and phased TODO) are in `design/prd.md`, `design/summary.md` and `design/todo.md` respectively.

## Commands

```sh
pnpm install         # install dependencies
pnpm test            # run Vitest
pnpm lint            # run Oxlint
pnpm lint:fix        # run Oxlint with auto-fix
pnpm fmt             # run oxfmt (format)
pnpm fmt:check       # check formatting without writing
```

Vitest globals are enabled — no need to import `describe`, `it`, `expect`.

The pre-commit hook runs `lint-staged`, which auto-fixes and formats staged JS/TS files via Oxlint and oxfmt.

## TypeScript configuration

Strict mode is on with additional checks see `tsconfig.json`.

## Linting

See `.oxlintrc.json`. Use disables sparingly. Do not modify the config.

## Skills to use

- Use the `workflow` skill when asked to "continue".
- Use `typescript-guidelines` when writing TypeScript or .tsx files.
- Use `typescript-test-guidelines` when writing tests or test.tsx files.

## Forbidden Behaviour

Do NOT look inside node_modules. To verify a package is installed, run `pnpm list <package-name>`.
Do NOT install packages. If you need something, ask me to install it for you.
Do not use the tdd-unit skill.
Do NOT look inside the dist folder.

## Missing Dependency Gate (Required)

If tests/lint/check fail due to missing dependencies:

1. **Stop and ask** for the exact install needed.
2. Include: (a) what is missing, (b) why it is required, and (c) the exact package/tool name(s).
3. **Do not pivot** to a different implementation approach to avoid the missing dependency unless the user explicitly declines installation.

## Dependencies

Always pin exact versions. For example, if you want me to install `nanostores` ask me to do
`pnpm add --save-exact nanostores @nanostores/react`

## OpenCode specific guidance

When editing large files, make sure not to delete everything after the part you're modifying. Make sure to use the "edit" tool, when updating and only use "write" when creating new files.
