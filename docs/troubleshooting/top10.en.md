# Trouble Shooting: Top 10 Deep Dives

[← Index](../troubleshooting.en.md)

<details>
<summary><strong>1. Bundler downleveling: a regex that passes every test but dies only in the browser</strong></summary>

**Problem**: In the editor's code block, **only HTML (xml)** got no colors. Detection worked — the label read "HTML / XML" — yet the code stayed monochrome. Other languages like CSS were fine. `npm run build`, `tsc` and the tests all passed; it reproduced **only in the browser**.

**Cause**: Three things had to line up.

1. hljs `xml.js` defines tag names as `/[\p{L}_]/u`
2. **The bundler expands it.** Even with a modern browserslist (chrome 148), Next compiles node_modules against a conservative target, so `\p{L}` becomes explicit codepoint ranges — including **astral ranges (`\u{10000}-…`)**, a braced form that cannot be parsed at all without the `u` flag
3. hljs's `countMatchGroups` re-parses that regex via `new RegExp(re.toString() + "|")` — **without flags** → `SyntaxError`

```
SyntaxError: Invalid regular expression: /<(?=[A-Z…\u{10000}-\u{1000B}…
    at countMatchGroups (core.js:456)
```

Plate catches the throw and **silently falls back to plaintext**, so the UI only shows "no colors" while the cause sits in the console. CSS was unaffected because `css.js` contains no `\p{}` at all.

**It never reproduces under node** — node uses the untranspiled source (`\p{L}` + `u` flag) and is fine. The expanded form **exists only in the browser bundle**. Verifying the DOM, the classes, the CSS, even the served chunks turned up nothing; only the browser console's stack trace pinned it.

**Solution**: Two stages.

1. **Reader and comments → Prism.** It uses no Unicode property escapes, so the trap doesn't exist, and it was already a dependency. `utils/prismHighlight.ts` became the single entry point and every hljs import was stripped from `highlightCodeBlocks.ts` (bash, missing from the Prism bundle, is defined by hand)
2. **Editor → patch the grammar.** Plate's code-block plugin **takes a lowlight instance as its API**, so Prism isn't an option. At registration we walk the grammar object, strip astral escapes and drop the `u` flag (`browserSafeGrammar` in `lowlightInstance.ts`). Astral-plane "letters" are effectively never used in tag names, and the BMP (Korean, CJK, Latin extended) survives untouched. Plate ships the same workaround for python (`ensureStablePythonGrammar`), so this is the standard answer

Gotcha: transforming only `RegExp` instances fixed nothing. hljs's `regex.concat()` returns **a concatenated source string, not a RegExp** (`core.js: return joined`) — the astral escapes lived inside strings.

Verification: the real failure can't be reproduced under node, so the tests **synthesize the bundled shape** (`plate/__tests__/browserSafeGrammar.test.ts`) — (1) the input really does break the re-parse, (2) the transformed output survives it, (3) Korean text still highlights.

**"the tests pass" is not "it works".** When the environment your tests run in (node) differs from where the code actually runs (the browser bundle), bugs living in that gap are invisible to tests by construction. **Swallowed exceptions** widen it further — the further apart the symptom and the cause, the earlier you must stop guessing and go get evidence.

Key code — the grammar object is walked recursively at registration, converting string sources too (`lowlightInstance.ts`):

```ts
export function browserSafeGrammar(node: any, seen = new WeakMap<object, any>()): any {
  /* hljs regex.concat() returns a joined STRING, not a RegExp — skip strings and nothing gets fixed */
  if (typeof node === "string") return node.includes("\\u{") ? stripAstral(node) : node;
  if (node instanceof RegExp) return toBrowserSafeRegex(node);
  if (Array.isArray(node)) return node.map((n) => browserSafeGrammar(n, seen));
  /* …objects recurse with a WeakMap guarding cycles */
}
```

**Insight**: A library's source can be fine while the bundler's down-leveling manufactures a runtime-only bomb — and code that throws at module top level kills every page that imports it, so treating a passing build as a safety signal is a mistake.


</details>

<details>
<summary><strong>2. CSS invalidation scope: global recalc from `:has(:hover)` with a universal descendant</strong></summary>

**Problem**: In the works editor, roughly two keystrokes out of ten triggered a full style recalculation over 6,357 elements, spiking input delay p90. Merely moving the mouse did the same.

**Cause**: A single rule: `.chip:has([data-close-trigger]:hover) .label *`. Typing changes the element under the pointer, causing hover recalculation, and when `:has()` contains `:hover` with a universal `*` descendant after it, Chrome invalidates the entire body subtree. The same shape without the `*` was fine.

**Solution**: Kept the selector structure and moved only the condition to JS. The close button's onPointerEnter/Leave toggles `data-remove-hover` on the chip, and CSS matches `.chip[data-remove-hover] .label *`.

```css
/* ❌ every keystroke/mouse move invalidates the whole body subtree (6,357 elements) */
.chip:has([data-close-trigger]:hover) .label * { text-decoration: line-through; }

/* ✅ move only the condition to a JS attribute — same look, invalidation stays inside the chip */
.chip[data-remove-hover] .label * {
  text-decoration: line-through;
  text-decoration-color: var(--text-accent);
}
```

**Insight**: The culprit rule was found not by guessing but by deleting rules from the CSSOM and bisecting. The combination of `:has(:hover)` and a universal descendant invites global invalidation.


</details>

<details>
<summary><strong>3. Resource priority and streaming reveal: the serial gates that delay LCP</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/post-detail-light.png" width="100%" alt="Post detail: the cover image is the LCP element" />
</p>

**Problem**: Mobile LCP regressed on the posts list and detail pages. The cover image arrived late, sharing bandwidth with CSS and fonts, and even after arriving, the reveal was delayed.

**Cause**: Two gates stacked. Next 16's `priority` only injects a head preload and no longer sets the `fetchpriority` attribute, so the LCP image is requested as Low. And React 19.2 reveals late-arriving Suspense boundaries 300ms after the first frame once the shell has painted. An LCP element inside a loading.tsx boundary takes that delay in full.

**Solution**: Pass `fetchPriority="high"` alongside `priority`. Moved the detail cover outside the loading boundary into `[slug]/layout.tsx` (DetailShell) so it paints with the shell.

```tsx
/* Next 16 priority only injects a <head> preload and no fetchpriority attribute (15 set high)
   — ProgressiveImage.tsx */
<Image priority={priority} fetchPriority={priority ? "high" : undefined} … />
```

**Insight**: LCP gates apply serially. Fixing only the request priority or only the reveal timing moves nothing. The fundamental fix is placing the LCP element in the layout, outside the streaming boundary.


</details>

<details>
<summary><strong>4. State signals over timelines: lift the transition cover on route commit</strong></summary>

| From (list) | To (detail) |
|:---:|:---:|
| <img src="../../public/images/screenshots/pc/works-light.png" width="100%" alt="Works list" /> | <img src="../../public/images/screenshots/pc/work-detail-light.png" width="100%" alt="Work detail" /> |

**Problem**: Navigating from a list to a detail page, the departed list stayed visible for about half a second after the transition cover lifted.

**Cause**: The morph transition ran on a fixed timeline (380ms expand, then 260ms morph) and the cover lifted unconditionally at 640ms. The new route's commit time is unrelated to that timeline. List card links do not prefetch, so the RSC payload is fetched only after the click; the measured commit on the deployed build was 1161ms.

**Solution**: Added a `cover` phase that keeps the screen covered when the expansion finishes but the route has not committed yet, and starts the morph only after confirming the commit. The commit signal comes from `usePathname()` inside the overlay, which only exists during a transition.

Key code — the expand end branches on commit state, and cover lifts only after the commit is confirmed (`PageTransitionProvider.tsx`):

```tsx
/* if the route has not committed when the expand ends, keep covering (cover) */
const t = setTimeout(() => onPhase(navPendingRef.current ? "cover" : "morph"), EXPAND_MS);

/* cover → morph: two frames after the new route commits — let the new tree paint under the cover first */
useEffect(() => {
  if (phase !== "cover" || navPending) return;
  const raf1 = requestAnimationFrame(() => {
    raf2 = requestAnimationFrame(() => onPhase("morph"));
  });
  /* … COVER_MAX_MS caps the wait so a failed commit never traps the cover */
}, [phase, navPending, onPhase]);
```

**Insight**: A transition choreographed by timetable leaks the screen the moment the network diverges. Lift the cover on the actual route commit, not on time. Verification used Playwright recordings turned into ffmpeg contact sheets to inspect frames.


</details>

<details>
<summary><strong>5. Static prerender lacks context: hydration mismatch from a path-less 404</strong></summary>

**Problem**: 404 screens under prefixes like `/admin/unknown` threw React #418 (HTML mismatch). Unknown URLs in the public area were fine.

**Cause**: Unmatched URLs receive the static `/_not-found` HTML rendered at build time, which was drawn with no path and therefore contains the public navigation and footer. The root layout's Navigation and Footer change shape based on the path prefix (`/admin`, `/design-system`), so the browser render disagrees with the server HTML.

**Solution**: Added a catch-all route (`[...missing]`) for every prefix that changes the layout's shape, calling `notFound()` there so the 404 renders at request time with the correct path. Making the root not-found dynamic was rejected: every 404 would then query the DB.

```tsx
// src/app/admin/[...missing]/page.tsx — one per prefix that reshapes the layout
export default function AdminMissingPage() {
  notFound(); // re-renders the 404 at request time, on this path
}
```

**Insight**: When the root layout shapes itself by path, every such prefix needs its 404 rendered on that same path. It is easy to forget that a static 404 is rendered in a "no path" state.


</details>

<details>
<summary><strong>6. Shorthand resets and specificity: a global transition erasing component transitions</strong></summary>

**Problem**

A global CSS rule `html[data-theme-ready] * { transition: background-color, color ... }` was applied for smooth dark/light theme switching, but **component transitions using `max-height`, `opacity`, `transform` were all silently ignored** — editor toolbar collapse, toggle open, etc.

**Cause**

`transition` is a **shorthand property**, so `transition: background-color 0.3s` completely **overwrites** a component's `transition: max-height 0.3s, opacity 0.2s`. The global selector `html[attr] *` has specificity `(0,1,1)`, which beats CSS Module single-class selectors `(0,1,0)` every time

```css
/* Global (0,1,1) — wins */
html[data-theme-ready] * { transition: background-color 0.3s, color 0.3s; }

/* Component (0,1,0) — loses, max-height transition vanishes */
.toolbar { transition: max-height 0.3s ease; }
```

**Solution**

Changed the global transition to use a `data-theme-transitioning` attribute that is **only active during a 350ms window when the theme actually switches**. During normal operation, the global transition is inactive, so component transitions work as expected

```css
/* ✅ Only active during theme switch moment */
html[data-theme-transitioning] * {
  transition: background-color var(--duration-base) ease, ...;
}
```

**Insight**

CSS `transition` is a shorthand — specifying just a few properties globally **removes all other property transitions** from components. Use an attribute toggle (`data-theme-transitioning`) to activate only when needed instead of leaving it always-on


</details>

<details>
<summary><strong>7. Backdrop Root: why backdrop-filter and mix-blend-mode cannot feed each other</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/editor-color-light.png" width="100%" alt="A glass panel with the color menu floating over a video" />
</p>

**Problem**: Building a popover that stays readable over any background — `backdrop-filter` on the panel, `difference` on the inner text — left the blend unable to see the background.

**Cause**: `backdrop-filter` / `isolation: isolate` establish a Backdrop Root, cutting off what backdrop-filter can see. On top of that, a `backdrop-filter`'s output is not offered to descendants or siblings as a blendable backdrop, which makes **per-text difference inside a popover impossible in principle**.

**Solution**: Work around it with a color-inversion trick, then adopt something else as the default

1. `filter: invert(1)` on the content + `mix-blend-mode: difference` on the panel → `|backdrop − (1−color)|` restores the original color
2. That combination carries too many constraints, so **glass (translucent + blur) became the default** and `difference` remains as a `Popover` variant

```css
/* difference on the panel, invert(1) on the content → |backdrop − (1−color)| restores the color (Popover.module.css) */
.dropdown.dropdownDifference > * {
  filter: invert(1);
}
```

**Insight**: `backdrop-filter` and `mix-blend-mode` look like they're reading the same "stuff behind," but neither can be the other's input — before combining both on one element, check where the Backdrop Root cuts the chain.


</details>

<details>
<summary><strong>8. Write races and server reassignment: parallel PATCHes shuffling sort order</strong></summary>

**Problem**: Changing the sort order in the editor mutated other works' order before saving, and saving produced an order different from the intent.

**Cause**: The drag list's onChange sent a PATCH in parallel for every displaced work, and the server re-read everything and reassigned 1..N on every sort_order PATCH. The reassignment outcome depended on arrival order — a race.

**Solution**: The editor now reflects reordering as a preview only and sends no requests for other works. On save it sends only its own position, and the server's placement logic (`placeWork`) inserts at the end then moves to the received position. The race was reproduced by running the real routes in vitest against an in-memory table fake with per-call read delays that flip the write order.

```
❌ before  a parallel PATCH per displaced work while dragging → server reassigns 1..N on every request
           → arrival order decides the result (dragging E to 2 alone yields A1 B2 C3 E4 D5)
✅ after   the editor only previews, zero requests → on save it sends its own position once
           → placeWork inserts at the end then moves to the received slot (atomic placement)
```

**Insight**: Sending parallel writes to an API that "reassigns everything each time" makes the result depend on arrival order. Derived state like ordering must be sent as one request at save time.


</details>

<details>
<summary><strong>9. Designing fallback conditions: an empty result is not an unavailable source</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/works-grid-dark.png" width="100%" alt="Works Grid — published works list" />
</p>

**Problem**: After unpublishing every work in the admin, the public list showed the static demo list bundled in the code instead of going empty.

**Cause**: `getWorks` keeps a static `data/projects.ts` fallback so a fresh clone without a DB still renders. But "the table has no rows" and "rows exist but all are unpublished" both arrive as the same empty array. Falling back on length alone means the demo list fills the screen the moment everything is unpublished.

**Solution**: Moved the fallback condition from "the result is empty" to "the source is unavailable". "Could not use the DB" (missing env, query failure) becomes `null`, "nothing published" stays an empty array, and only the former falls back to static data. The seed that inserted demo data as published into an empty table was removed too — it was why deleting every work resurrected seven demos on the next visit.

```ts
/** null when the DB is unusable (missing env, query failure) — empty array when nothing is published (getHomeWorks.ts) */
async function fetchRankedProjects(): Promise<Project[] | null> { /* … */ }

/* only null falls back to the static list — an empty array is the answer "nothing published" and must stay empty */
if (ranked === null) return toWorkItems(projects);
```

**Insight**: A fallback condition must be defined as "the source is unavailable", not "the result is empty". When two states return the same value, ask again to tell them apart.


</details>

<details>
<summary><strong>10. Package resolution: optional peers must still be resolvable</strong></summary>

**Problem**: `npm i @vercel/analytics` failed with an ERESOLVE peer conflict on `@sveltejs/vite-plugin-svelte`. This project has no Svelte in it.

**Cause**: `@vercel/analytics` declares vue, nuxt, svelte and friends as optional peers to ship per-framework entry points. npm 11 still walks the peers of candidates that will never be installed. Along that path, `@sveltejs/vite-plugin-svelte@5` requires `vite ^6`, clashing with this repo's vite 8.

**Solution**: Added `"@sveltejs/vite-plugin-svelte": "^7"` to `overrides` so only the candidate npm inspects changes to a vite 8 compatible version. No svelte package ends up in the installed tree. `--legacy-peer-deps` was rejected because it silences the whole check, including real conflicts.

```jsonc
// package.json — instead of --legacy-peer-deps (which disables the whole check), override only the conflicting candidate
"overrides": {
  "@sveltejs/vite-plugin-svelte": "^7"
}
```

**Insight**: An optional peer is not "ignored when unused" — it still has to be resolvable. Overriding just the conflicting node keeps the check alive while letting the install pass.


</details>
