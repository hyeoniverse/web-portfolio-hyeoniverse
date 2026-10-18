# Trouble Shooting: Layout · CSS

[← Index](../troubleshooting.md)

<details>
<summary><strong>21. Reserving space across locales: em-based min-height against layout shift</strong></summary>

**Symptom**: Switching between Korean and English in the Works intro section changed the height of the text areas and shifted the layout slightly.

**Cause**: The two languages have different text lengths, so line breaks and line counts differed. The intro is a flex container with `justify-content: center`, so when a child's height changed, the free space was redistributed.

**Fix**: Each text area got a `min-height` in `em` units (maximum line count × line-height), so both languages take the same height.

```css
@media (width > 1024px) and (height > 700px) {
  .introDesc   { min-height: 4.95em; } /* 3 lines × 1.65 */
  .introDetail { min-height: 6.6em; }  /* 4 lines × 1.65 */
  .introQuote  { min-height: 3.3em; }  /* 2 lines × 1.65 */
}
```

These are the rules in `WorksIntro.module.css`. They do not apply to narrow screens, where the content stacks vertically, and reserve space only in the desktop layout.

**Conclusion**: Reserving `min-height` for the maximum line count in multilingual text areas keeps the layout still when the language changes. With `em` units, the reserved height follows font-size changes.


</details>

<details>
<summary><strong>22. Silent var() failure: an undefined token voids the declaration</strong></summary>

**Symptom**: After a bulk replacement of design tokens, padding stopped applying in several CSS files. The build and type checks all passed.

**Cause**: The new token used in the replacement was never added to the definition file. When the variable referenced by `var()` is undefined and there is no fallback, the declaration becomes invalid at computed-value time and falls back to the inherited or initial value. The browser reports no error and build tools do not check it.

**Fix**: The missing token definition was added. Since then, every token replacement searches the usages and then confirms the definition file contains each token.

**Conclusion**: An undefined `var()` silently voids its declaration. When tokens change, usages and definitions must be verified together.


</details>

<details>
<summary><strong>23. When backdrop-filter does not show: isolation, transforms and prefixes</strong></summary>

**Symptom**: `backdrop-filter` failed to show as expected in two places. The blur on the home CTA button had no effect in Chrome. The sticky selection action bar in the admin lists did not blur the table rows passing behind it, so the right-hand cells stayed sharp, and the glass looked faint or yellowish.

**Cause**: There were several layers of causes.

1. `-webkit-backdrop-filter` was written after the standard property. Lightning CSS, used by the build, treats the two as the same property and keeps only the last declaration. The output CSS kept only the prefixed one, so Chrome had no blur.
2. The home `.home` entrance animation ran on `transform`. The compositing layer created on the ancestor cut the backdrop range the button could sample.
3. The action bar placed the glass on `::before { z-index: -1; backdrop-filter }`. The parent sticky bar creates a stacking context through z-index, so `::before` was isolated inside it and could not capture the sibling table rows as its backdrop.
4. Making the bar full-bleed with `transform: translateX`, or using `translateY` in its entrance animation, broke the blur.
5. `saturate()` amplified the warm colors of the rows behind, making the glass look yellowish.

**Fix**: All prefixed declarations were removed and stylelint now blocks them (design-system decision D17). The home entrance animation switched to `margin-top`, and today there is no entrance animation at all. The action bar (`.bulkBar` in `AdminTable.module.css`) applies `backdrop-filter: blur(24px)` directly to the element. A backdrop-filter on the element does not blur its child buttons and blurs only the rows passing behind. Full-bleed uses a negative `margin-inline` with `padding-inline`, and the entrance animation changes opacity only. `saturate` was dropped, leaving blur only with no background color.

**Conclusion**: `backdrop-filter` is not decided by its own declaration alone. When the effect does not show, check whether the standard property survived the build, whether the element is inside an isolated stacking context, and whether it or an ancestor has a transform. The related conflict with blend modes is covered in Top 10, item 7.


</details>

<details>
<summary><strong>24. Transition start values: final state on the mount frame means no transition</strong></summary>

**Symptom**: A dropdown rendered through a Portal (`Select`) appeared instantly when opened, with no transition.

**Cause**: The open-state class was already present at mount, so the transition's start and end values were the same. Browsers do not run a transition on a property whose value did not change.

**Fix**: A separate `animateOpen` state was added. The dropdown mounts closed, and after two `requestAnimationFrame` callbacks `animateOpen` becomes `true` and the open class is applied. This guarantees the order: mount, paint the closed state, open.

**Conclusion**: A transition runs only when a value changes. Rendering the final state at mount leaves nothing to transition, so the initial state must be painted for at least one frame.


</details>

<details>
<summary><strong>25. Blend compositing units: child exceptions require DOM separation</strong></summary>

**Symptom**: Applying `mix-blend-mode: difference` to the hero area inverted every piece of text inside it. The description text could not keep its original color.

**Cause**: A blend on a parent composites all of its children as one unit. Setting a color again on a child does not help, because the composite is applied on top of it. Per-child exceptions are impossible.

**Fix**: Only the title and category that need difference sit in their own element, and the description and details became a sibling overlay. The positions of the two are synchronized in requestAnimationFrame.

**Conclusion**: Blend exceptions can be made only per element. If only part of an area should be composited, the DOM has to be split.


</details>

<details>
<summary><strong>26. Independent grid containers: one row's min-width does not propagate</strong></summary>

**Symptom**: On mobile, scrolling the admin posts and works tables horizontally showed the rows' bottom borders stopping partway instead of reaching the end of the scroll.

**Cause**: `.colTitle { min-width: 280px }` reserved the title column width. But `.row`, `.tableHeader` and `.bulkBar` are separate CSS Grid containers, so track sizes are computed per row. Data rows had `col.className` applied, so their title track grew to 280px. The header's title `<span>` lacked that className and computed only 1fr. As a result, data rows were 868px wide while the header and bulk bar were 720px, and each border ended at its own width.

**Fix**: Two changes were made together.

1. The header `<span>` also gets `col.className`, so the header's title track grows to 280px as well.
2. A `.tableInner` wrapper was added inside the scroll container.

```css
.tableInner {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  width: max-content;
}
```

Children of a flex column stretch horizontally, and `width: max-content` sizes the wrapper to the widest child (868px). All rows, the header and the bulk bar end up the same width, and the border runs across the whole scroll area.

**Conclusion**: When each row is its own grid container, a min-width on one row does not propagate to the others. To keep borders continuous in a horizontal scroll, a wrapper with `width: max-content` and `min-width: 100%` must give every row the same width. When widths differ, first check that rows and the header carry the same className.


</details>

<details>
<summary><strong>27. JS-assisted masonry: pixel tracks with measured spans</strong></summary>

**Symptom**: The `/posts` bento layout mixes card variants of different heights. With a plain CSS Grid, row tracks sized to the tallest card and left empty cells under smaller cards. `grid-auto-flow: dense` alone could not fill that space.

**Cause**: Defining rows with `grid-template-rows: auto` or fixed ratios makes every cell in a row follow the tallest child. When a square card and a portrait card share a row, the square card leaves empty space equal to the height difference.

**Fix**: The layout became a masonry that combines CSS Grid with JS measurement. The CSS splits row tracks into 1px units with `grid-auto-rows: 1px` and sets `grid-auto-flow: dense`. The JS (`useMasonryRowSpans`) measures each card and sets `grid-row: span N` as an inline style.

```ts
function measureRowSpans(grid: HTMLElement): number[] {
  const rowGap = parseFloat(getComputedStyle(grid).rowGap) || 0;
  return Array.from(grid.children, (node) => {
    const el = node as HTMLElement;
    const h = (el.firstElementChild as HTMLElement | null)?.scrollHeight ?? el.scrollHeight;
    return h ? Math.ceil((h + rowGap) / (1 + rowGap)) : 0; // 1 = grid-auto-rows: 1px
  });
}
```

Height is measured from the `scrollHeight` of `firstElementChild`, not the card wrapper. It is recomputed on image load events, on `ResizeObserver` callbacks and on window resize, so late fonts and images still produce correct heights. Before hydration, an inline script (`ROW_SPANS_SCRIPT`) runs the same calculation and inserts nth-child rules into the head. When the hook mounts, it removes those rules and takes over.

**Conclusion**: `grid-template-rows: masonry` is not yet supported in Chrome. Gap-free packing works by splitting row tracks into pixels and assigning spans from heights measured in JS. Measurement must be repeated every time the content can change.


</details>

<details>
<summary><strong>28. Detecting sticky anchoring: rootMargin must match the real top</strong></summary>

**Symptom**: The `/posts` filter bar sticks with `position: sticky; top: var(--nav-height)`. With the IntersectionObserver that detects sticking set to a fixed `rootMargin` (`-44px 0px 0px 0px`), the detection point drifted whenever the nav height changed with screen width or the filter bar grew to two lines. Neighboring elements then looked about 1px overlapped or separated.

**Cause**: The sticky `top` changes through a CSS variable, but an IntersectionObserver's `rootMargin` is fixed at creation. After the sticky position changed, the observer kept judging against the old line.

**Fix**: `rootMargin` is computed from the real sticky `top`, and the observer is recreated on every window resize.

```ts
const setup = () => {
  observer?.disconnect();
  const stickyTop = parseFloat(window.getComputedStyle(fb).top) || 0;
  observer = new IntersectionObserver(
    ([entry]) => setIsStuck(!entry.isIntersecting),
    { rootMargin: `-${stickyTop + 1}px 0px 0px 0px`, threshold: 0 },
  );
  observer.observe(el);
};
setup();
window.addEventListener("resize", setup);
```

This is a shortened version of `src/hooks/useStickyFilterBar.ts`. It reads the sticky element's actual `top` with `getComputedStyle` and adds 1px to catch the moment it crosses the line. The post list and the tag page share this hook.

**Conclusion**: Detecting whether a sticky element is stuck with IntersectionObserver requires `rootMargin` to match the real sticky `top`. Where `top` changes through CSS variables or media queries, the observer must be recreated each time.


</details>

<details>
<summary><strong>29. Serialized inline styles: stored values beat your stylesheets</strong></summary>

**Symptom**: A float image placed beside body text rendered on the detail page with no gap between it and the adjacent text.

**Cause**: `plateSerializer` stored float figures with inline styles such as `style="float:left;margin:0"`. With zero horizontal margin, text touched the image. Inline styles take precedence over ordinary rules such as `.prose figure`, so the stylesheet could not override them.

**Fix**: The fix has two steps.

1. `plateSerializer.ts` now stores float figure margins as `0 24px 24px 0` (left) or `0 0 24px 24px` (right).
2. So that content saved earlier with `margin:0` also gets a gap, the body CSS overrides the inline value with an attribute selector and `!important`.

```css
.prose figure[style*="float:left"] {
  margin: 0 var(--spacing-20) var(--spacing-20) 0 !important;
}
```

Posts have this rule in `components/posts/PostArticleBody.module.css`, and works have the same rule on `.sectionProse` in `components/works/WorkArticleBody.module.css`.

**Conclusion**: Inline styles written at serialization take precedence over external CSS. First make the serializer store the right value, then override already-stored data with an attribute selector and `!important`.


</details>

<details>
<summary><strong>30. The scope of viewport meta: desktop browsers ignore width</strong></summary>

**Symptom**: Turning on "mobile mode" with `ViewModeToggle` on desktop changed nothing.

**Cause**: The toggle works by changing the viewport meta `width`. Desktop browsers ignore viewport meta `width`. That behavior exists only in mobile browsers.

**Fix**: The toggle is shown only on touch devices. The condition is `pointer: coarse` rather than viewport width, so after switching to PC mode the toggle remains and can switch back.

**Conclusion**: Overriding viewport meta `width` works only in mobile browsers. It is not a way to force a mobile width on desktop, so the feature should be limited to touch devices.


</details>

<details>
<summary><strong>31. Atomic inline boxes: a chip cannot fragment across lines</strong></summary>

**Symptom**: Long inline code did not wrap when it exceeded the container width. It stuck out on one line or was clipped.

**Cause**: The inline code chip used `display: inline-block`. With inline-block, vertical padding counts toward the line box, so it does not overlap neighboring lines. But it is an atomic inline box and cannot be split across lines. The chip either moves to the next line as a whole or overflows the container.

**Fix**: The chip switched to `display: inline` with `box-decoration-break`, and its look was redesigned as a background highlight. With `display: inline` the code wraps, but vertical padding does not grow the line box and can overlap neighboring lines. A bordered capsule also breaks into pieces at line breaks (`clone`) or ends open (`slice`). The border was therefore removed, leaving a subtle background. The background flows naturally across line breaks, and `box-decoration-break: slice` rounds only the two ends. line-height is not set and inherits the context value (1.6).

**Conclusion**: A chip-like inline element is a choice between inline-block (no wrapping) and inline (wraps, but padding does not grow the line). When multi-line wrapping is needed, a background design suits it better than a bordered capsule.


</details>

<details>
<summary><strong>32. Global defaults vs scoped variables: splitting strong color with a fallback</strong></summary>

**Symptom**: Bold text given a text color still appeared in the theme accent color in the body.

**Cause**: The global `strong { color: var(--text-accent) }` is a site-wide default, and it applied inside the editor and body too. Saved HTML puts the color on an outer span (`<span style="color: X"><strong>`). The global color set on the strong itself beat the color inherited from the span.

**Fix**: Inside the body scope (`.prose-content`), strong uses `color: var(--_strong-color, inherit)`. A strong inside a span whose style starts with a color declaration uses `inherit` and takes that color. The work body, whose text color differs, passes its default color through `--_strong-color`.

**Conclusion**: When a global default and a user-set value compete for the same property, a scoped variable with a fallback can express "default when unset, the value when set" in CSS alone.


</details>
