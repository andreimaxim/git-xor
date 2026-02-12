# AGENTS.md

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Use `Bun.$` for shell commands (e.g. `await Bun.$`git log``)

## Project Structure

- Source code lives in `src/`
- Tests live in `test/`, not alongside source files
- CLI entry point is `src/cli.ts`

## Testing

Use `bun test` to run tests. Test files go in the `test/` directory.

```ts
import { test, expect } from "bun:test"

test("hello world", () => {
  expect(1).toBe(1)
})
```

## Linting

This project uses [oxlint](https://oxc.rs/docs/guide/usage/linter) for linting, configured in `.oxlintrc.json`.

- Plugins enabled: `typescript`, `unicorn`, `import`, `oxc`
- Categories: `correctness` (error), `suspicious` (warn), `perf` (warn)

Commands:

- `bun run lint` — run the linter
- `bun run lint:fix` — run the linter with auto-fix

## Formatting

This project uses [oxfmt](https://oxc.rs/docs/guide/usage/formatter) for formatting, configured in `.oxfmtrc.json`.

Style rules:

- No semicolons
- No trailing commas
- Double quotes
- 2-space indentation
- 100 character print width
- LF line endings

Commands:

- `bun run fmt` — format all files in place
- `bun run fmt:check` — check formatting without writing

All generated code must follow these formatting rules.

## Full Check

Run `bun run check` to execute all checks in sequence:

1. `tsc --noEmit` — type checking
2. `oxlint` — linting
3. `oxfmt --check` — format verification

Always run `bun run check` before committing to ensure code passes all checks.
