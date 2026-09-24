# Trouble Shooting: Components · Misc

[← Index](../troubleshooting.en.md)

<details>
<summary><strong>84. Reading type definitions: clearTimeout accepts undefined, not null</strong></summary>

**Problem**

"Expected 1 arguments, but got 0" type error with `useRef<ReturnType<typeof setTimeout>>()`

**Cause**

- `useRef` requires an initial value as a mandatory parameter
- `ReturnType<typeof setTimeout>` does not include `null`, and `clearTimeout` does not accept `null`

**Solution**

Explicitly provide `undefined` as the initial value and include it in the type

```tsx
// ❌ Wrong approach
const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(); // Error: initial value needed
const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // clearTimeout type error

// ✅ Correct approach
const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
  undefined,
);
```

**Insight**

`clearTimeout` accepts `undefined` but not `null`. Timer refs should be initialized with `undefined`


</details>

<details>
<summary><strong>85. Third-party DOM and z-index: manage stacking dynamically</strong></summary>

**Problem**

reCAPTCHA v3 badge was hidden behind the overlay when the Contact Drawer opened

**Cause**

- Contact Drawer backdrop is fixed positioned with `z-index: var(--z-overlay)` (40)
- The `.grecaptcha-badge` element injected by Google had a lower z-index than the backdrop

**Solution**

Dynamically set `z-index: 9999` on the badge when the drawer opens, remove when closed:

```tsx
badge.style.zIndex = isOpen ? "9999" : "";
```

**Insight**

DOM elements injected by third parties can have z-index conflicts with custom overlays/modals. z-index must be managed dynamically


</details>

<details>
<summary><strong>86. Continuous input vs transitions: snap during the resize stream</strong></summary>

**Problem**: On PC, the nav menu was pinned to viewport center with `position: absolute; left: 50%; transform: translateX(-50%)`. As `navActions` (lang / sound / theme / email / Bell / Logout) grew, there was a viewport range where the menu overlapped the right cluster. Switching to flex ("center between logo and actions") fixed the collision but introduced a new bug: the sliding indicator that highlights the active link lagged the menu by ~300ms during continuous resize because of its CSS transition, leaving a visible drift the whole time the user dragged the window edge

**Cause**:

1. Viewport-center pinning ignores left/right cluster widths — when one side grows or `--page-px` shrinks, collision is inevitable
2. After moving to flex, the lag came from `.navIndicator { transition: left var(--duration-moderate) ease, width ... }` being always-on. Every resize event pushes new left/width values, but the indicator eases from the previous value toward the new one — to the user, "the menu jumps to its new position, but the indicator drags ~300ms behind"

**Solution**:

1. **Layout** — `.navCenter` → `position: relative; flex: 1; justify-content: center`. Logo and actions occupy their natural widths, and the menu sits in the middle of the remaining space, with no overlap risk
2. **Make the indicator transition instant during resize** — listen on both `window resize` and `ResizeObserver(navCenter + nav)`. On every fire, `setIndicatorInstant(true)` + `updateIndicator()`, then a 120ms debounce sets it back to false. While instant, the indicator is rendered with `style={{ ...indicatorStyle, transition: "none" }}` so it snaps frame-by-frame to the new position; once resize ends, the normal hover/navigation transition is restored

```tsx
const [indicatorInstant, setIndicatorInstant] = useState(false);
useEffect(() => {
  let endTimer: ReturnType<typeof setTimeout> | null = null;
  const tick = () => {
    setIndicatorInstant(true);
    updateIndicator();
    if (endTimer) clearTimeout(endTimer);
    endTimer = setTimeout(() => setIndicatorInstant(false), 120);
  };
  const ro = new ResizeObserver(tick);
  ro.observe(navCenterRef.current!);
  if (navEl) ro.observe(navEl);
  window.addEventListener("resize", tick);
  // ...
}, [updateIndicator]);

// JSX
<span style={indicatorInstant ? { ...indicatorStyle, transition: "none" } : indicatorStyle} />
```

**Insight**:

① **Absolute viewport-center has no idea what's to the left or right** — for asymmetric/dynamic clusters, `flex: 1; justify-content: center` expresses "between" precisely
② **CSS transitions fit single user intents, not continuous input streams** — during resize / scroll, disable the transition so the element snaps every frame, then re-enable it after the stream ends. An inline `transition: "none"` toggled by a debounced state is the lightest pattern that preserves "smooth" semantics for hover-driven changes


</details>

<details>
<summary><strong>87. Static data key collisions: duplicate keys signal duplicate data</strong></summary>

**Problem**: During the emoji picker overhaul, React warned `two children with the same key: weather`.

**Cause**: `ICON_CATEGORIES` already had weather/shapes/dev categories, but adding the new icons **created duplicate categories under the same id**.

**Solution**: Remove the duplicate categories and merge the new icons into the existing ones

1. Remove the duplicate categories (weather/shapes/dev) and merge new icons into the existing categories
2. Also de-duplicate global icon ids

**Insight**: When extending a static list like categories/icons, check for collisions with existing ids first — a duplicate key is a signal of duplicate data.


</details>

<details>
<summary><strong>88. Detecting glyph presence: width measurement and frozen paths</strong></summary>

**Problem**: The logo symbol (✦) in the browser tab rendered differently on every device instead of in the configured brand font.

**Cause**: Two layers. Browsers do not fetch web fonts when drawing tab icons, so the `font-family` name in the SVG falls back to device fonts. And the brand font (Instrument Serif) does not contain the U+2726 glyph at all (.notdef) — even the on-page logo symbol was actually drawn by a system fallback font.

**Solution**: Extracted only the needed symbols from a symbol font (Noto Sans Symbols 2) into a base64 module, and the favicon route now converts the glyph to an outline `<path>` with opentype.js. The page loads the same font via `@font-face`, placed before generic names like serif in the stack — placed after, serif wins first.

**Insight**: `document.fonts.check()` returns true when a fallback can draw the glyph, so it cannot identify the rendering font. Which font actually drew a glyph was determined by rendering it per stack and measuring widths. Glyphs on surfaces web fonts cannot reach (like tabs) are safest frozen as paths.


</details>
