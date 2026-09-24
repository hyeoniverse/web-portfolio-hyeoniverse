# Trouble Shooting: Layout · CSS

[← Index](../troubleshooting.md)

<details>
<summary><strong>26. Reserving space across locales: em-based min-height against layout shift</strong></summary>

**Problem**

When switching between Korean and English in the Works intro section, the text area height changed causing slight layout movement

**Cause**

- Different text lengths between Korean and English cause different line break positions
- In a flex container with `justify-content: center`, child height changes redistribute space

**Solution**

Set `min-height` in `em` units (number of lines x line-height) to ensure consistent space for both languages

```css
/* Reserve min-height based on maximum line count */
.introDesc {
  min-height: 4.95em;
} /* 3 lines x 1.65 line-height */
.introDetail {
  min-height: 6.6em;
} /* 4 lines x 1.65 line-height */
.introQuote {
  min-height: 3.3em;
} /* 2 lines x 1.65 line-height */

/* Not needed on mobile since it uses vertical scroll */
@media (max-width: 768px) {
  .introDesc,
  .introDetail,
  .introQuote {
    min-height: auto;
  }
}
```

**Insight**

When supporting multiple languages, reserving space with `min-height` based on maximum line count prevents layout shift on language switch. Using `em` units automatically adapts to font-size changes


</details>

<details>
<summary><strong>27. Breakpoint-only elements: hide them at the opposite breakpoint</strong></summary>

**Problem**

The mobile-only DB list (`dbMobileList`) in the About page's Backend panel was rendering on desktop viewports, breaking the layout

**Cause**

The `dbMobileList` element was missing a `display: none` media query for desktop breakpoints. It occupied DOM space and displayed on desktop even though it was intended for mobile only

**Solution**

CSS-only fix — added `display: none` at the desktop breakpoint so the element only renders on mobile

**Insight**

Responsive-only elements **must have `display: none` at the opposite breakpoint**. CSS media queries alone are often sufficient without JS branching


</details>

<details>
<summary><strong>28. Silent var() failure: an undefined token voids the declaration</strong></summary>

**Problem**

The `--box-3xs-xs` token was used as `padding: var(--box-3xs-xs)` across 11 CSS files, but was never defined in `_spacing.css`, causing all those paddings to silently fail

**Cause**

During a CSS token audit, `padding: var(--spacing-3xs) var(--spacing-xs)` (2px 8px) was batch-replaced with the box shorthand `var(--box-3xs-xs)`, but the token definition was never added to the Compound block in `_spacing.css`. CSS `var()` silently invalidates declarations when undefined — **undetectable by build or typecheck**

**Solution**

Added `--box-3xs-xs: var(--spacing-3xs) var(--spacing-xs)` definition to `_spacing.css`. Future token replacements should follow a two-step verification: **grep for usage → confirm definition exists**

**Insight**: An undefined `var()` fails silently. Token replacement must verify usage sites and definitions as a pair.


</details>

<details>
<summary><strong>29. Compositing layers and backdrop sampling: an ancestor transform kills the effect</strong></summary>

**Problem**: The `backdrop-filter` on the home CTA button had no effect in Chrome.

**Cause**: The `.home` entrance animation ran on a `y` transform, which created a compositing layer on an ancestor. That layer cut off the backdrop sampling range, so the button had no backdrop to reference. The `-webkit-backdrop-filter` prefix additionally confused Chrome's declaration parsing and killed the effect.

**Solution**: Switched the entrance animation from transform to `marginTop` so no compositing layer is created, and removed the prefixed declaration.

**Insight**: `backdrop-filter` is not decided by its own declaration alone. A compositing layer created by an ancestor cuts the sampling range, so when the effect is missing, check ancestor transforms first.


</details>

<details>
<summary><strong>30. Transition start values: final state on the mount frame means no transition</strong></summary>

**Problem**: Dropdowns rendered through a portal appeared instantly with no open transition.

**Cause**: The open-state class was already applied at mount, so the transition's start and end values were identical. The browser does not run a transition on a property whose value never changed.

**Solution**: Added a separate `animateOpen` state and used two `requestAnimationFrame` calls to guarantee the mount, closed, open order. Raised specificity with a compound selector so the global theme transition rule does not override it.

**Insight**: A transition needs a value change. Rendering the final state at mount leaves nothing to transition, so the initial state must persist for at least one frame.


</details>

<details>
<summary><strong>31. Blend compositing units: child exceptions require DOM separation</strong></summary>

**Problem**: Applying `mix-blend-mode: difference` to the hero inverted every piece of text inside it, making it impossible to keep the description in its original color.

**Cause**: Blending a parent composites all of its children as one unit. Re-declaring a color on a child does not help because the blend applies on top of it, so per-child exceptions cannot exist.

**Solution**: Kept only the title and category in the difference element, and moved the description and details into a sibling overlay. The two elements are position-synced in rAF.

**Insight**: Blending can only be excepted at the element level. When only part of the content should blend, the DOM has to be split.


</details>

<details>
<summary><strong>32. Independent grid containers: one row's min-width does not propagate</strong></summary>

**Problem**: On mobile, horizontally scrolling admin/posts and admin/works tables caused row border-bottoms to stop mid-scroll instead of extending across the full scrollable width

**Cause**: `.colTitle { min-width: 280px }` was applied to guarantee a readable title column, but `.row` / `.tableHeader` / `.bulkBar` are each **independent CSS Grid containers**, so track expansion is computed per-row. Data rows had `col.className` applied, expanding the title track to 280px — but the header's title `<span>` had no className, leaving the 1fr track at its natural size. This created a **width mismatch: rows grew to 868px while header/bulkBar stayed at 720px**. On scroll, row borders drew out to 868px but header/bulkBar borders cut off at 720px

**Solution**: Two simultaneous fixes

1. **Apply `col.className` to header `<span>`** — so `.colTitle` applies to the header's title cell too, expanding the header title track to 280px
2. **Add `.tableInner` wrapper** inside the scroll container (`.table`, `.tableScroll`):

```css
.tableInner {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  width: max-content;
}
```

In a flex column, items auto-stretch on the cross-axis (horizontal), and `width: max-content` sizes the wrapper to the widest child's max-content (868px). **All rows/header/bulkBar align to the same 868px width**, so border-bottom extends continuously across the full scrollable area

**Insight**: When each row is an independent grid container, **track expansion is computed per-row** — a `min-width` on one row's cell doesn't propagate to siblings. For continuous borders during horizontal scroll, every row must share the same total width. The `width: max-content + min-width: 100%` wrapper pattern enforces this by sizing to the widest child. Additionally, **className mismatches between row and header** (where `col.className` is applied to rows but omitted in headers) are a common source of width divergence


</details>

<details>
<summary><strong>33. JS-assisted masonry: pixel tracks with measured spans</strong></summary>

**Problem**: The `/posts` bento mixes five variants — wide / banner (21:9) / square (1:1) / portrait (3:4) / standard. With plain CSS Grid, row tracks stretch to the tallest card in that row, leaving **empty cells** beside smaller cards. `grid-auto-flow: dense` alone can't backfill the leftover vertical space when card aspect ratios differ widely

**Cause**: `grid-template-rows: auto` (or any fixed ratio) sizes a row to the tallest child, so a square next to a portrait leaves dead space below the square equal to the height delta

**Solution**: Implement true masonry as a JS + CSS Grid hybrid

1. CSS — `grid-auto-rows: 1px` shreds row tracks to the pixel, plus `grid-auto-flow: dense` and `gap: var(--bento-gap)` only
2. JS — a `useEffect` measures every card's `firstElementChild.scrollHeight` → computes `span = ceil((h + gap) / (rowUnit + gap))` → assigns `style.gridRow = span ${span}`
3. Recalculate on `ResizeObserver(grid)` and image `onLoad` so font/image loads can't leave stale spans
4. On mobile (`<= 640px`), all variants flatten to a uniform 16:10 ratio and JS measurement is disabled

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 1px;
  grid-auto-flow: dense;
  gap: var(--bento-gap);
}
```

```ts
const recomputeRowSpans = () => {
  const grid = gridRef.current;
  if (!grid) return;
  const rowUnit = parseFloat(getComputedStyle(grid).gridAutoRows) || 1;
  const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
  itemRefs.current.forEach((el) => {
    const h = (el.firstElementChild as HTMLElement | null)?.scrollHeight ?? el.scrollHeight;
    const span = Math.max(1, Math.ceil((h + gap) / (rowUnit + gap)));
    el.style.gridRow = `span ${span}`;
  });
};
```

**Insight**: CSS-only masonry is still experimental (`grid-template-rows: masonry` isn't shipped in Chrome). The de facto standard for gap-free packing is **shred row tracks to a fine pixel unit, then have JS assign spans from measured heights**. `firstElementChild.scrollHeight` is the most accurate source (immune to wrapper padding), and you must recompute on both image `onLoad` and `ResizeObserver` to correct heights captured before fonts/images settled


</details>

<details>
<summary><strong>34. Detecting sticky anchoring: rootMargin must match the real top</strong></summary>

**Problem**: `/posts` filterBar uses `position: sticky; top: var(--nav-height)`, but the sentinel's `rootMargin` was hard-coded (`-44px 0px 0px 0px`). When PC ↔ mobile nav heights differ or the filterBar grows from one row to two, the anchor moment falls out of sync — the bar visually overlaps Popular Posts by ~1px or leaves a hairline gap

**Cause**: `top` is dynamic (driven by a CSS variable), but `IntersectionObserver`'s `rootMargin` is set once at construction. When the filterBar height changed from 44px to 80px (added search row), the sentinel kept gating on the old offset

**Solution**: Sync `rootMargin` with the component's actual sticky `top`

1. Read `getComputedStyle(filterBar).top`, then set `rootMargin: -${stickyTop + 1}px 0px 0px 0px` (the +1px is a cross-frame safety margin)
2. On every `resize`, disconnect and rebuild the observer so nav-height changes are picked up
3. Updated the sibling sidebar's `top` to use the same arithmetic (`calc(var(--nav-height) + 80px + ...)`) so both elements share one anchor line

```ts
useEffect(() => {
  const setup = () => {
    const top = parseFloat(getComputedStyle(filterBarRef.current!).top) || 0;
    const observer = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting),
      { rootMargin: `-${top + 1}px 0px 0px 0px`, threshold: 0 });
    observer.observe(sentinelRef.current!);
    return () => observer.disconnect();
  };
  let cleanup = setup();
  const onResize = () => { cleanup(); cleanup = setup(); };
  window.addEventListener("resize", onResize);
  return () => { cleanup(); window.removeEventListener("resize", onResize); };
}, []);
```

**Insight**: For a sticky element, the `IntersectionObserver` that detects "now stuck" must use a `rootMargin` that **matches the actual sticky top to the pixel**. When that top is dynamic (CSS variable / media query), the observer must rebuild alongside it — otherwise you get a viewport that looks correct but a 1px drift after `resize`


</details>

<details>
<summary><strong>35. Serialized inline styles: stored values beat your stylesheets</strong></summary>

**Problem**: A float image wrapped beside the body text rendered **flush against the adjacent text with no gap** on the detail page.

**Cause**: plateSerializer saved the float figure with **inline-style `margin:0`**, like `style="float:left;margin:0"`.

- With zero horizontal margin, the text clung to the image
- And **inline styles win on specificity**, so a generic CSS rule like `.prose figure` couldn't override it

**Solution**: Fix the serialized value itself, and also force it via CSS `!important`

1. `plateSerializer.ts` — change the float figure's serialized margin to `0 24px 24px 0` (left) / `0 0 24px 24px` (right). Side/bottom spacing is applied at the serialization step
2. `PostDetail.module.css` / `WorkDetail.module.css` — force side/bottom spacing (`--spacing-lg`) with `margin: ... !important` on `.prose figure[style*="float:left"]` / `.sectionProse figure[style*="float:right"]`. This applies the gap consistently **even to old content saved with `margin:0`** (covering it regardless of the serialized value)

**Insight**:

① When serialization bakes in an inline style, that value **outranks external CSS** and is hard to override later — putting the right value in at the serialization step is the first line of defense
② To also cover already-broken legacy data, add a second line of defense: an attribute selector (`[style*="float"]`) + `!important` to **neutralize the inline value**


</details>

<details>
<summary><strong>36. Specificity against global rules: compound selectors to save transitions</strong></summary>

**Problem**: After moving EmojiPicker from inline styles to a CSS module, transitions like the indicator slide and category opacity stopped working.

**Cause**: The global rule `html[data-theme-ready] *` (specificity `(0,1,1)`) transition overrides a single-class `(0,1,0)` component transition.

**Solution**: For properties not in the global rule, raise specificity with a compound selector

1. Set properties absent from the global transition rule — indicator slide, category opacity — via compound selectors `(0,2,0)` like `.tabHeader .indicator`, `.picker .catBtn`

**Insight**: The global theme-transition rule `(0,1,1)` overrides single-class component transitions, so properties not in the global rule (transform/opacity, etc.) need a compound selector to win on specificity.


</details>

<details>
<summary><strong>37. The scope of viewport meta: desktop browsers ignore width</strong></summary>

**Problem**: Toggling "mobile mode" with ViewModeToggle on desktop produced no change.

**Cause**: Desktop browsers ignore the viewport meta `width` (it's a mobile-browser-only behavior).

**Solution**: Show the toggle only on touch devices

1. The viewport override is only meaningful as "view PC version" on mobile, so the toggle is shown only on touch devices (`pointer:coarse`)

**Insight**: A viewport meta `width` override only takes effect in mobile browsers — it isn't a way to force a mobile width on desktop, so limiting the feature to touch devices is the correct scope.


</details>

<details>
<summary><strong>38. :has() combinators define scope: enumerate the renderer's DOM shapes</strong></summary>

**Problem**: The `:has()` rule that removes bullets from checkbox lists missed some lists (bullets remained) and over-matched others (bullets vanished from perfectly normal lists).

**Cause**: `marked` emits tight lists as `<li><input>` and loose lists (blank line between items) as `<li><p><input>`. `:has(> li > input)` alone misses the loose form, while collapsing it to a descendant combinator `:has(input)` removes **the parent list's bullets too** whenever a checkbox sublist sits inside an ordinary bullet list.

**Solution**: Spell out only the two direct paths

1. `:has(> li > input[type="checkbox"], > li > p > input[type="checkbox"])` — catches both tight and loose forms while excluding descendant matches

**Insight**: With `:has()`, the combinator choice *is* the match scope — widening it to a descendant combinator contaminates ancestors in nested structures. Enumerating **every DOM shape the markdown renderer actually produces** and nailing them down as direct paths is the safer route.


</details>

<details>
<summary><strong>39. Resets and revert: appearance alone will not revive native widgets</strong></summary>

**Problem**: `<input type="checkbox">` survived sanitize and was present in the DOM, yet no checkbox appeared on screen — `appearance: auto` didn't help.

**Cause**: The global reset `input { border: none; background: none }` in `src/styles/globals/_base.css` wipes the UA default styles, leaving the native checkbox with no surface to render on.

**Solution**: Restore the UA default styling

1. `background: revert; border: revert` on the checkbox — the point is reverting the two properties the reset erased, not `appearance`
2. `background` / `border` are shorthands, so they fall outside stylelint's `declaration-strict-value` — no conflict with the token rules

**Insight**: `appearance: auto` only says "draw this as a native widget" — it does not resurrect a `background`/`border` already erased by a reset. In a project with a global reset, bringing back a native control means restoring the UA styles themselves with `revert`.


</details>

<details>
<summary><strong>40. Atomic inline boxes: a chip cannot fragment across lines</strong></summary>

**Problem**: Long inline code overflowed the container as a single line (or got clipped) instead of wrapping.

**Cause**: The inline-code chip used `display: inline-block`. inline-block reflects vertical padding into the line box (so it doesn't overlap neighboring lines), but it is an **atomic box that cannot fragment across lines** (the whole chip moves to the next line or overflows the container).

**Solution**: Switch to `display: inline` + `box-decoration-break`, and ultimately redesign it as a background style (Notion-like).

1. With `display: inline` it wraps, but vertical padding can't widen the line box (risk of overlapping neighbors), and a bordered capsule fragments at wrap points (`clone`) or gets cut open (`slice`)
2. Dropping the border and keeping only a subtle background makes the highlight flow naturally even when wrapped — capsule caps only at the two ends (`slice`), line-height inherited from context (1.6, not hardcoded)

**Insight**: A "chip-like" inline element has a trade-off between inline-block (no wrap) and inline (wraps, but padding doesn't widen the line) — if multi-line wrapping is required, a background style fits fundamentally better than a bordered capsule.


</details>

<details>
<summary><strong>41. Stacking contexts and backdrops: an isolated sibling cannot be blurred</strong></summary>

**Problem**: The admin selection action bar was made a sticky glass, but the rows behind it didn't blur (only the right-hand cells stayed sharp) and the frost was faint or yellowish.

**Cause**: Three things overlapped

1. The frost sat on `::before{ z-index:-1; backdrop-filter }`, but the parent sticky creates a stacking context via z-index, so the `::before` can't grab its sibling table rows as backdrop
2. Doing full-bleed with `transform: translateX` breaks backdrop-filter
3. saturate amplified the warm color of the rows behind, turning it yellowish

**Solution**: Strip the isolation and blur the element directly

1. Put backdrop-filter on the element, not `::before` — child buttons then don't blur
2. full-bleed via margin/left-right (`-page-px`), no `transform`
3. Drop saturate, blur only; transparent background color

**Insight**: backdrop-filter can't see "siblings outside the stacking context the element belongs to" as backdrop — watch out for isolation (z-index/transform).


</details>

<details>
<summary><strong>42. space-between with a single child: the branch that overlaps fixed elements</strong></summary>

**Problem**: After hiding the center menu (`navCenter`) with `display: none` on mobile, the right-hand button group (`navActions`) moved left and overlapped the fixed logo.

**Cause**: `.nav` uses `justify-content: space-between`, and when only one child remains it aligns to the start. The logo is fixed, outside the flex flow, drawn at the same spot with `left: var(--page-px)`.

**Solution**: Forced `.nav { justify-content: flex-end }` in the mobile media query. The logo is outside the flex flow, but with the buttons on the right the layout reads "logo, space, buttons" naturally.

**Insight**: `space-between` changes its alignment result as the child count changes. A container that overlays a fixed element needs the single-child branch spelled out separately.


</details>

<details>
<summary><strong>43. Global defaults vs scoped variables: splitting strong color with a fallback</strong></summary>

<p align="center">
  <img src="../../../public/images/screenshots/pc/editor-light.png" width="100%" alt="Editor: bold and colored text" />
</p>

**Problem**: Bold text always appeared in the theme accent color in article bodies, even when a text color was explicitly set on it.

**Cause**: The global `strong { color: var(--text-accent) }` is the site-wide default, and it also applied to the editor and article bodies. Saved HTML writes colors on an outer span (`<span style="color: X"><strong>`), so the global color on strong itself beat the inherited value.

**Solution**: In the prose scope (`.prose-content`), strong is `color: var(--_strong-color, inherit)`, and only strong inside spans whose style starts with a color declaration gets `inherit` to follow that color. Contexts whose body text color differs (work bodies) pass the default through `--_strong-color`.

**Insight**: When a global default and a user-set value fight over the same property, a scoped variable with a fallback expresses "default unless specified" in pure CSS.


</details>
