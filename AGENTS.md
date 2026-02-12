# AGENTS.md

## Project Structure

- Source code lives in `src/`
- Tests live in `test/`, not alongside source files
- CLI entry point is `src/cli.js`

## Testing

Use Node's built-in test runner. Test files go in the `test/` directory.

```js
import { test } from "node:test"
import assert from "node:assert/strict"

test("hello world", () => {
  assert.strictEqual(1, 1)
})
```

Commands:

- `npm test` or `node --test test/` — run all tests

## Linting

This project uses [oxlint](https://oxc.rs/docs/guide/usage/linter) for linting, configured in `.oxlintrc.json`.

- Plugins enabled: `unicorn`, `import`, `oxc`
- Categories: `correctness` (error), `suspicious` (warn), `perf` (warn)

Commands:

- `npm run lint` — run the linter
- `npm run lint:fix` — run the linter with auto-fix

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

- `npm run fmt` — format all files in place
- `npm run fmt:check` — check formatting without writing

All generated code must follow these formatting rules.

## Full Check

Run `npm run check` to execute all checks in sequence:

1. `oxlint` — linting
2. `oxfmt --check` — format verification

Always run `npm run check` before committing to ensure code passes all checks.

## CI

GitHub Actions runs on every push to `main` and on pull requests. The workflow (`.github/workflows/ci.yml`) runs each step separately for clear failure reporting:

1. Lint
2. Format check
3. Tests

## Publishing

The CLI is published to npm. Users install it with `npx git-xor` or `npm install -g git-xor`.

The entry point `src/cli.js` has a `#!/usr/bin/env node` shebang so it runs directly with Node.js. Only the `src/` directory is included in the published package (`"files": ["src"]`).

Publishing is automated via `.github/workflows/publish.yml`:

1. Create a GitHub release with a semver tag (e.g. `0.1.0`)
2. The workflow runs all checks, sets the version from the tag, and publishes to npm
3. Requires an `NPM_TOKEN` secret in the repository settings
