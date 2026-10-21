# Testing

[← README](../../README.en.md)

Unit tests (Vitest) and e2e tests (Playwright) are used together. The e2e tests do not compare screens pixel by pixel. They only check whether a page is broken, whether something that should be there is missing, and whether an API returns the expected status code.

## Commands

| Command | Runs |
| --- | --- |
| `npm test` | `vitest run`: all unit tests |
| `npm run test:watch` | `vitest`: reruns on file changes |
| `npm run test:smoke` | Playwright `desktop` · `mobile` projects — public screens |
| `npm run test:smoke:admin` | Playwright `admin` project — admin screens (needs a signed-in session) |
| `npm run test:api` | Playwright `api` · `api-auth` projects — API routes |

Playwright starts `npm run start` through `webServer`, so `npm run build` must finish before the e2e tests. The dev server is not used because the HMR overlay makes it unstable. If a server is already on port 3000, local runs reuse it (`reuseExistingServer`).

```bash
npm run build
npm run test:smoke
```

The two lines above are the minimum order to run the public-screen e2e tests.

## Unit tests (Vitest)

**Stack**: Vitest + React Testing Library + jsdom. The config is [`vitest.config.ts`](../../vitest.config.ts).

- It picks up `src/**/*.test.{ts,tsx}`. There are 169 files today: 156 in `src/__tests__/` and 13 in the editor's `src/components/posts/plate/__tests__/`.
- Shared setup lives in `src/__tests__/setup.ts`.
- `@platejs/*` is inlined so vite transforms it. This lets tests load the full EditorKit. The katex CSS is swapped for an empty file.
- The timeout is 5 seconds locally and 20 seconds on CI. CI runners have few cores, and even short tests occasionally went past 5 seconds.

This document does not list every file. A few tests guard the repository state rather than code, so they are listed here.

| File | Guards |
| --- | --- |
| `styleRatchet.test.ts` | The "target" counts in [design-system.md](../design-system.md) do not grow, and when they shrink the baseline (`scripts/style-ratchet.baseline.json`) shrinks with them |
| `cssTokens.test.ts` | No CSS uses an undefined token. A `var()` without a fallback silently invalidates the whole declaration |
| `tokenDoc.test.ts` | [tokens.md](../tokens.md) matches the token CSS (regenerate with `npm run tokens:doc`) |
| `apiMap.test.ts` · `erdSchema.test.ts` | The pre-build generated files (`apiMap.ts` · `erdSchema.ts`) match their sources |

## e2e (Playwright)

The config is [`playwright.config.ts`](../../playwright.config.ts), and the specs are the 16 files under `e2e/`. Every project sets `reducedMotion: "reduce"` and a dark color scheme to calm animations. Marquees, GSAP, and three.js keep running and make load timing jittery, so `retries: 2` absorbs that.

| Project | Specs | Environment |
| --- | --- | --- |
| `desktop` | `smoke` · `nav` · `designsystem` · `about` · `postsindex` · `profile` · `dates` · `detail` · `home` | Desktop Chrome 1440×900 |
| `mobile` | `smoke` · `about` | Pixel 7 |
| `setup` | `auth.setup.ts`: signs in as admin once and saves the session | |
| `api` | `api.spec.ts`: calls APIs without signing in | no browser |
| `api-auth` | `api-auth.spec.ts`: calls APIs with the saved session | after `setup` |
| `admin` | `admin` · `dashboard` · `editor` · `workeditor` · `settings` · `adminposts` | after `setup`, Desktop Chrome 1440×900 |

**Smoke tests** (`smoke.spec.ts` · `admin.spec.ts`) open each route in [`e2e/routes.ts`](../../e2e/routes.ts): 20 public routes and 16 admin routes (6 lists + 10 settings tabs). For each route they check:

- the response status is below 400
- the error boundary (`app/error.tsx`) did not show
- the screen is not empty and not the 404 page
- the sections named in `expectVisible` are visible. This catches sections that silently drop out when data fails to load
- there are no new runtime errors. Known errors are filtered by the route's `knownPageErrors`

`/design-system` is left out of the smoke list. The page is very long and full of interactive demos, so it never settles. `designsystem.spec.ts` in the `desktop` project covers it separately.

### Preparing the admin session

The `admin` · `api-auth` projects need a signed-in session.

1. Put `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` in `.env.local`. Use the owner (`OWNER_EMAIL`) account. A newly created account has no role in `app_metadata` and cannot enter the admin screens.
2. A session from a password sign-in alone is aal1, so admin pages redirect to `/admin/mfa`. In Settings › Account, use **Add authenticator** to register one more authenticator just for e2e, and put the key shown under the QR code into `E2E_TOTP_SECRET` in `.env.local`. The setup computes the 6-digit code from it (RFC 6238). The key is the authenticator itself, so keep it inside `.env.local` and remove that authenticator in settings once you stop using it.
3. Run `npm run test:smoke:admin`. The session is saved to `e2e/.auth/admin.json`. The file holds auth tokens and is in `.gitignore`.

## Pre-commit checks

`.husky/pre-commit` first checks that the commit author and committer are not the tool account (`anthropic.com`), then runs `npx lint-staged`. The rules are in [`.lintstagedrc.mjs`](../../.lintstagedrc.mjs).

| Staged files | Runs |
| --- | --- |
| `*.{ts,tsx}` | `eslint` |
| `*.{css,module.css}` | `stylelint --allow-empty-input` |
| `*.{ts,tsx,css}` | `vitest run src/__tests__/styleRatchet.test.ts` (once, without a file list) |

Commit messages are checked by commitlint from `.husky/commit-msg` ([commit-convention.md](../commit-convention.md), Korean).

## CI

`.github/workflows/ci.yml` runs the following on every push and PR to master. e2e tests do not run on CI.

1. `npm run typecheck`
2. `npm run lint`: fails above the warning cap (`--max-warnings`)
3. `npm run lint:css`
4. `npm test`
5. `npm run knip -- --no-exit-code`: unused export and file report (does not fail)
6. `npm run knip:deps`: fails on unregistered dependencies
7. `npm run type-coverage`: fails below 97.93%

> **Refactoring docs**: [Refactoring guide](../refactoring-guide.md) · [Performance baseline](../perf-baseline.md)
