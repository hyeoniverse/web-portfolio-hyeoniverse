# Testing

[← README](../../README.en.md)

Unit tests (Vitest) plus smoke e2e (Playwright). The suite does not pin pixels; it only catches breakage.


**Stack**: Vitest + React Testing Library + jsdom

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on file changes)
npm run test:watch
```

**Test targets**:

**Utils & rendering** (`src/__tests__/`)

| File | Tests | Description |
| --- | --- | --- |
| `cn.test.ts` | 6 | Class name merge utility (`cn`) |
| `mobileCheck.test.ts` | 6 | Mobile layout detection (`checkMobileLayout`) |
| `renderHighlight.test.tsx` | 4 | Highlight markup transformation (`renderHighlight`) |
| `koSearch.test.ts` | 10 | Korean initial/jamo search matching |
| `codeBlockBar.test.tsx` | 3 | Code block top bar (language label, copy, wrap toggle) |
| `cssTokens.test.ts` | 1 | **Guard for undefined CSS tokens** — without a `var()` fallback the whole declaration is invalid, and CSS fails silently. 13 tokens across 57 sites were actually dead |

**Editor (Plate)** (`src/components/posts/plate/__tests__/`)

| File | Tests | Description |
| --- | --- | --- |
| `browserSafeGrammar.test.ts` | 15 | Browser safety of hljs grammars — whether registered regexes survive hljs's flag-less re-parse (troubleshooting #1). Node uses the original source, so the tests **synthesize the bundled shape** |
| `fitColumnsForInsert.test.ts` | 10 | Column width distribution — block cap, minimum width, remainder allocation |
| `columnHasContent.test.ts` | 9 | Content check before deleting a column — images and dividers count even with no text |
| `codePaste.test.ts` | 7 | Pasting code **outside** a code block — the markdown parser must not shred it on indentation |
| `codeBlockClear.test.ts` | 5 | Caret stays inside the block after "clear content" (if it escapes, pastes leak out) |
| `codeBlockStructure.test.ts` | 4 | `code_block` children are always `code_line` (a raw text child creates a state nothing can repair) |
| `tableRowHeight.test.ts` | 4 | Table row height HTML round-trip |

Config: `vitest.config.ts` (jsdom, `@platejs/*` inlined so the full EditorKit loads)

---

**Smoke e2e (Playwright)**

Verifies a refactor did not **break** the page (not a pixel comparison — UI changes are allowed). Each route is checked for page load (status < 400), runtime errors, error-boundary render, and empty screens.

```bash
npm run build              # production output required (a dev server is unstable due to overlays)
npm run test:smoke         # public routes
npm run test:smoke:admin   # admin routes (requires a login session — see below)
```

| Item | Value |
| --- | --- |
| Scope | 12 public routes × desktop (1440×900) / mobile (Pixel 7) = **24 shots** |
| | 16 admin routes (6 lists + 10 settings tabs) = **16 shots** |
| Checks | Screenshot diff + page runtime errors |
| Stability | public 24/24 across 3 runs · admin 16/16 across 2 runs (zero flakes) |

Two traps worth knowing: the full-screen `LoadingScreen` must be awaited or a "black screen + logo" frame gets baked into the baseline, and masking a WebGL canvas paints a rectangle *over* it — turning the whole page into a solid block (use `visibility: hidden` instead). Full notes and coverage gaps are in **[docs/perf-baseline.md](../perf-baseline.md#시각-회귀-baseline)**.

**Admin routes** need a login session. Put `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` in `.env.local` (use the owner account — a freshly created one has no role and gets rejected), then run `npm run test:smoke:admin`. The new-device gate makes the first run fail; flip `approved` to `true` on the new `admin_known_devices` row to clear it (**no real inbox needed** — that is all the approval link does). After that the stored session (`e2e/.auth/` — auth tokens, git-ignored) is reused.

> **Refactoring docs**: [Refactoring guide](../refactoring-guide.md) · [Performance baseline](../perf-baseline.md) · [Dead code inventory](../dead-code-inventory.md)
