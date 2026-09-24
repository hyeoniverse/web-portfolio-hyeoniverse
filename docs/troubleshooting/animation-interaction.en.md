# Trouble Shooting: Animation · Interaction

[← Index](../troubleshooting.en.md)

<details>
<summary><strong>67. The library's source of truth: read Lenis velocity inside its event</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/works-dark.png" width="100%" alt="Works — Scroll Velocity" />
</p>

**Problem**

Scroll speed-based parallax effect was not being applied to images in the Works section

Failed attempts:

1. **Direct wheel event detection**: Unstable and conflicted with Lenis
2. **RAF polling to calculate scroll delta**: Inaccurate velocity measurement
3. **Direct type assertion on Lenis velocity property**: Values not updated when accessed outside scroll events

**Cause**

- When calculating scroll position directly via RAF polling, the inter-frame delta is inconsistent, resulting in inaccurate velocity measurement
- Lenis internally calculates velocity and provides it as an instance property, but accurate values are only accessible within the scroll event handler

**Solution**

Used Lenis's native `on('scroll')` event to access the velocity property directly from the instance

```tsx
// ❌ Wrong approach - RAF polling
useEffect(() => {
  const updateOffset = () => {
    const currentScroll = lenis.scroll;
    const delta = currentScroll - prevScrollRef.current; // Inaccurate velocity
    prevScrollRef.current = currentScroll;
    rafIdRef.current = requestAnimationFrame(updateOffset);
  };
  rafIdRef.current = requestAnimationFrame(updateOffset);
}, []);

// ✅ Correct approach - Lenis scroll event
useEffect(() => {
  const handleScroll = () => {
    const velocity = (lenis as any).velocity; // Accurate velocity
    if (Math.abs(velocity) > 0.05) {
      const offset = Math.max(-50, Math.min(50, velocity * 30));
      workImageOffsetY.set(offset);
    }
  };
  lenis.on("scroll", handleScroll);
  return () => lenis.off("scroll", handleScroll);
}, [lenis]);
```

**Insight**

Lenis internally calculates velocity and provides it as an instance property, making it more accurate than manually calculating delta


</details>

<details>
<summary><strong>68. Inline transform conflicts: Framer Motion and CSS fight over one property</strong></summary>

**Problem**

Using CSS `transform: translate(-50%, -50%)` for image centering caused Framer Motion's `y` property to stop working

**Cause**

- Framer Motion's `style={{ y }}` property generates an inline `transform: translateY()`
- When a CSS `transform` property is already set, Framer Motion's transform gets overwritten or conflicts

**Solution**

Switched to margin-based centering to avoid using CSS transform

```css
/* ❌ Wrong approach - using CSS transform */
.workImageInner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); /* Conflicts with Framer Motion */
}

/* ✅ Correct approach - margin-based alignment */
.workImageInner {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130%;
  height: 130%;
  margin-left: -65%; /* Half of width */
  margin-top: -65%; /* Half of height */
}
```

**Insight**

Framer Motion's style prop generates inline transform, so it must be used separately from CSS transform


</details>

<details>
<summary><strong>69. Infinite scroll math: modulo loops instead of teleports</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/works-dark.png" width="49%" alt="Works — Dark" />
  <img src="../../public/images/screenshots/pc/works-light.png" width="49%" alt="Works — Light" />
</p>

**Problem**

Horizontal scroll on the Works page would scroll in reverse direction when reaching the end, not appearing as infinite scroll

Failed attempts:

1. **Scroll position teleport**: Moving to start via `window.scrollTo` on reaching end -> visible jump
2. **Separate Bridge section**: Adding Bridge as separate section -> disrupted flow by transitioning from horizontal to vertical scroll
3. **Lenis infinite + teleport**: Conflict when controlling both Lenis and ScrollTrigger simultaneously

**Cause**

- GSAP ScrollTrigger has a finite scroll range defined by the `end` property
- Directly changing scroll position creates a visible jump for users
- Horizontal scroll converts vertical scrolling to horizontal movement, so adding separate sections creates vertical scroll segments

**Solution**

Set scroll distance very long and cycle only the container position using modulo operation

```tsx
// Clone content 3x
const allProjects = [...projects, ...projects, ...projects];

// Set scroll distance to 10x (effectively infinite)
const scrollDistance = oneSetWidth * 10;

gsap.to(container, {
  scrollTrigger: {
    end: () => `+=${scrollDistance}`,
    onUpdate: (self) => {
      // Modulo for position cycling - scroll continues but visually loops
      const totalProgress = self.progress * scrollDistance;
      const loopedX = totalProgress % oneSetWidth;
      gsap.set(container, { x: -loopedX });
    },
  },
});
```

**Insight**

A long scroll range + visual position loop approach provides a more natural infinite scroll experience than scroll position teleportation


</details>

<details>
<summary><strong>70. Wrapping scroll position: cycle the position, not the clones</strong></summary>

**Problem**

In the Works page horizontal scroll gallery, projects were repeated 10 sets, but scrolling to the end showed a blank screen — not truly infinite scroll

Failed attempts:

1. **Increase set count**: More repeated sets led to excessive DOM nodes and performance degradation
2. **Teleport from end to start**: Visible scroll position jump

**Cause**

- With a finite number of repeated sets (10), ends exist in both directions
- In GSAP's requestAnimationFrame loop, scrollX keeps accumulating beyond the content range

**Solution**

Calculate one set width (`oneSetWidth`) from the `offsetLeft` difference of intro elements, and wrap scrollX/targetScrollX with `while` loops

```tsx
// Calculate one set width (distance between consecutive intros)
const introEls = slider.querySelectorAll(`.${styles.intro}`);
let oneSetWidth = 0;
if (introEls.length >= 2) {
  oneSetWidth = introEls[1].offsetLeft - introEls[0].offsetLeft;
}

// Bidirectional wrapping in animation loop
if (oneSetWidth > 0) {
  while (scrollX > oneSetWidth * 3) {
    scrollX -= oneSetWidth;
    targetScrollX -= oneSetWidth;
  }
  while (scrollX < -oneSetWidth * 3) {
    scrollX += oneSetWidth;
    targetScrollX += oneSetWidth;
  }
}
```

**Insight**

Rather than increasing content duplication sets, wrapping the scroll position itself achieves truly infinite scroll without DOM overhead


</details>

<details>
<summary><strong>71. Viewport-dependent initialization: recompute via key remount</strong></summary>

| PC | Tablet | Mobile |
|:---:|:---:|:---:|
| <img src="../../public/images/screenshots/pc/works-dark.png" width="100%" /> | <img src="../../public/images/screenshots/tablet/works-dark.png" width="100%" /> | <img src="../../public/images/screenshots/mobile/works-dark.png" width="100%" /> |

**Problem**

When resizing viewport between desktop, tablet, and mobile, GSAP ScrollTrigger pin, RAF counter-translation, and other animations remained fixed to the previous viewport dimensions, breaking the layout

**Cause**

- GSAP ScrollTrigger's `start`, `end`, and `pin` settings are calculated based on viewport size at creation time
- RAF-based counter-translation also operates based on the initial `extraWidth` value
- Existing instances do not auto-update when viewport size changes

Attempted approaches:

1. **Track breakpoint in individual components**: Resize listener + effect re-execution in each panel -> code duplication, some panels missed
2. **ScrollTrigger.refresh()**: Works in some cases, but cannot handle fundamental DOM structure changes like horizontal-to-vertical layout transitions

**Solution**

Added `BreakpointGuard` component to root layout to remount all page content on breakpoint change

```tsx
// src/components/common/BreakpointGuard.tsx
function getBreakpoint(): "desktop" | "tablet" | "mobile" {
  const w = window.innerWidth;
  if (w > 1024) return "desktop";
  if (w >= 768) return "tablet";
  return "mobile";
}

export default function BreakpointGuard({ children }) {
  const [bp, setBp] = useState("desktop");

  useEffect(() => {
    const check = () => setBp(getBreakpoint());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return <div key={bp}>{children}</div>; // key change -> children remount
}

// src/app/layout.tsx
<main>
  <BreakpointGuard>{children}</BreakpointGuard>
</main>;
```

Placing above Providers (Theme, Language, Lenis) would reset state, so it is placed inside `<main>` within the Providers to maintain Provider state while remounting only page content

Side effects and fixes:

- Video elements removed from DOM cause `play()` Promise to reject with AbortError -> Added `.catch(() => {})`
- All component `useState` initial values reset -> Supplemented with module-level flags (e.g., `hasCompletedInitialLoad`)

**Insight**

For animations that depend on viewport size at creation time (like GSAP ScrollTrigger), a full remount via React's `key` prop is more stable than partial updates with `ScrollTrigger.refresh()`. Placing Providers outside the remount scope enables page-level reinitialization without global state loss


</details>

<details>
<summary><strong>72. Occlusion vs start signals: animations running under the loader</strong></summary>

**Problem**

When entering the About page, HeroPanel content (text, animations) was already rendering and playing behind the loading screen, so the first impression after loading completed was not as intended

**Cause**

HeroPanel's entrance animations started immediately on component mount. The loading screen only covered the panel via `z-index`, while animations underneath had already played to completion

**Solution**

Added a `heroReady` class that is only applied after loading completes. HeroPanel's entrance animations and content visibility depend on this class, keeping the panel **visually inactive** until loading finishes

**Insight**

Content behind a loading screen **cannot be hidden by z-index alone**. Animation start timing must be tied to loading completion to guarantee the intended first impression


</details>

<details>
<summary><strong>73. State plus synchronous refs: resetting residue on mode switches</strong></summary>

**Problem**

After applying custom cursors (↔, ↕, ⤡) to image/column resize handles, the cursor arrows rotated and distorted based on mouse movement direction

**Cause**

The CursorTrail animation loop calculated `angleRef` (rotation) and `scaleRef` (scale) based on mouse velocity. When entering resize mode, previous values persisted. Additionally, detecting resize via classList caused 1-2 frame delays due to React render timing

**Solution**

Added `cursorTypeRef` (synchronous ref) updated simultaneously with `setCursorType`. On resize mode entry, immediately reset `angleRef`/`scaleRef` to 0. The animation loop uses `cursorTypeRef.current` to detect resize mode and completely disables rotation/scale

**Insight**: Animation values that switch modes often need a synchronous ref paired with state, and the previous values must be reset explicitly on mode entry or they linger.


</details>

<details>
<summary><strong>74. Placeholder sizing: the skeleton decides the first layout pass</strong></summary>

**Problem**: Opening the About page, the first panel started off-screen or stopped at a misaligned position.

**Cause**: The skeleton width of a dynamically imported panel did not match its real width. ErdPanel's skeleton was 350vw while the real panel was 100vw. On top of that, React strict mode's second mount reset the GSAP transform in cleanup, throwing the calculation off once more.

**Solution**: Matched the skeleton width to the real width, stopped resetting the transform in cleanup, and guarded double initialization with an `initializedRef`.

**Insight**: Horizontal scroll math depends on placeholder sizes. A skeleton with a different size from the real content skews the first calculation entirely.


</details>

<details>
<summary><strong>75. Silent animation callbacks: equal values never fire</strong></summary>

**Problem**: Navigating from a PostCard to a post detail, **the overlay morphed down to hero size and then never dismissed — it stayed in the hold phase forever**. Worse, immediately after the morph the `loading.tsx` skeleton was visible beneath the now-smaller overlay, producing the awkward sequence "image shrinks → skeleton lingers for a long time"

**Cause**: Two issues compounded

1. The original design auto-progressed `expand → morph (hero) → hold` and triggered dismissal via an `onAnimationStart` callback on the DetailLayout's hero `motion.div`. But with `initial={{ opacity: isTransitioning ? 1 : 0 }}` + `animate={{ opacity: 1 }}`, when `isTransitioning` was true both equaled `1` — framer-motion treats this as a no-op and **never fires onAnimationStart**, so the phase stayed at "hold" forever
2. The morph ran on a fixed timer (~1s after click), shrinking the overlay **before the new page was ready**. With the Suspense fallback (`loading.tsx`) underneath, the skeleton was exposed the moment the morph completed

**Solution**: Restructured the transition state machine

1. **Replaced the dismissal trigger** — removed the `onAnimationStart` dependency, added a `useEffect` in DetailLayout that calls `endTransition()` on mount
2. **Backdrop now stays fullscreen** — during the hold phase the backdrop covers the entire viewport, hiding the skeleton even after the overlay has morphed (previously the backdrop only filled the hero area)
3. **`SAFETY_MS = 5000` backstop** — PageTransitionProvider force-dismisses if `endTransition` isn't called for any reason
4. **`endRequestedRef` short-circuit** — for fast cached mounts, `endTransition` calls during expand/morph let the current phase finish and then jump straight to done, skipping hold

**Insight**: ① **Animation lifecycle callbacks (`onAnimationStart`, `onAnimationComplete`) should not be the sole trigger for critical state transitions** — they can fail silently when initial equals animate (no-op cases), and behavior varies by library version and render timing. Always pair them with a useEffect-based fallback or a setTimeout safety net. ② When designing "morph-into-hero" transitions in a Suspense-aware environment, **always remember the visual contract: shrinking the overlay reveals what's beneath**. The only fixes are (a) **keep the backdrop covering the full viewport even after morph**, or (b) **defer morph until the new page mounts**


</details>

<details>
<summary><strong>76. Enter/leave asymmetry: the limits of transition-delay</strong></summary>

**Problem**: Hovering a Series row card on `/posts` should fan it out into a deck of preview layers. Initial implementation suffered from (1) the deck appearing to "vanish then reappear" when unfolding, (2) cards spreading immediately on enter — the deliberate hold beat was invisible, (3) all four layers reaching their final position simultaneously instead of staggering

**Cause**:

1. Layer entrance used CSS `transition-delay` for stagger, but **on hover-out every delay cancels at the same moment**, collapsing all layers in unison — the eye reads this as "vanishing" rather than "folding back"
2. The transform easing was `cubic-bezier(0.34, 1.45, ...)` (overshoot), so the cards looked partially spread *before* animation start — the "stop → animate" beat was invisible
3. With `transition-delay: 0s`, hover entry started the spread immediately — no perceptible hold

**Solution**: Move stagger / delay / easing all into JS state

1. **Trigger via JS state** — `setTimeout(() => setOpen(true), 800)` after enter, with `clearTimeout` on leave. Distinct, cancellable, no CSS-delay weirdness
2. **Per-layer stagger via CSS variable** — assign `--deck-i` per layer and use `transition-delay: calc(1s + (var(--deck-i, 1) - 1) * 0.4s)`, so each layer waits for the previous to fully unfold (4 layers × 0.4s = 1.6s of clear progression)
3. **Standard ease** — `cubic-bezier(0.4, 0, 0.2, 1)` removes the overshoot tell that made the deck look pre-spread
4. **Opacity fade** — layer label/title fade in on the same stagger so each layer feels "lifted" one at a time

**Insight**: ① **CSS `transition-delay` applies equally to enter and leave.** Asymmetric "all leave at once + sequential enter" is hard to achieve in pure CSS — pair JS state with explicit timers when enter/leave timing must differ. ② "Hold then unfold" microinteractions read better when triggered by `setTimeout + state flip` than `transition-delay`, since cancellation is clean and the intent is explicit. ③ Overshoot easing makes microinteractions look "already started" — when the **stop → animate** moment must read clearly, standard ease is more appropriate


</details>

<details>
<summary><strong>77. Pointer capture and hit areas: margin is not a hit area</strong></summary>

**Problem**: With the deck unfolded, (1) clicking any layer card never dispatched its `onClick` — SeriesCard navigation was dead, and (2) when the cursor crossed the gap between layers (16px), hover ended and the deck collapsed; re-entering a layer triggered the unfold again, producing visible flicker

**Cause**:

1. The parent row uses `setPointerCapture(e.pointerId)` to support horizontal drag-scroll. While the parent has captured the pointer, **child clicks are absorbed by the parent** and `onClick` on layers never fires
2. To push the next sibling card aside while unfolding, `margin-right: 660px` was added — but margins move visual position only, they don't extend the element's hit area (regardless of `box-sizing`). When the cursor crossed a gap between layers, it landed outside the card's hit area, ending hover

**Solution**:

1. Drop `setPointerCapture` entirely. Track drag with **document-level `pointermove` / `pointerup` listeners** and a click-suppression flag (`draggedRef.current = movement > 5px`)
2. While unfolded, attach an `::after` pseudo: `position: absolute; left: 0; top: 0; bottom: 0; width: calc(100% + 660px);` — this extends the hit area to the last layer without intercepting clicks, since pseudo-elements aren't event targets for descendants

```css
.card.deckOpen {
  margin-right: 660px;  /* visual push — moves the next card aside */
}
.card.deckOpen::after {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: calc(100% + 660px); /* hit-area extension — prevents flicker */
  pointer-events: auto;
}
```

**Insight**: ① `setPointerCapture` **is convenient for drag tracking but absorbs all child clicks**. If your component needs child-level clicks, prefer document-level pointer listeners + a distance-based click-suppression flag. ② **Margin moves visual position only — it doesn't extend the hit area.** To enlarge a hover region, use `padding-right` (with `box-sizing: content-box`) or an `::after` pseudo. content-box has too many layout side effects; pseudo is cleaner. ③ Multi-step hover interactions (deck unfold) are exquisitely sensitive — even a microsecond of hover loss between two layers causes flicker, so **define the hover region one step wider than the visual boundary**


</details>

<details>
<summary><strong>78. Events pause during drag: bridging coordinates with dragover</strong></summary>

**Problem**: Once an HTML5 drag begins (RelationPicker / SortOrderDragList / series reorder), (1) `CursorTrail` stops following the cursor and freezes in place, and (2) as the mouse passes over other elements during the drag, cursor type flickers between "text" / "big" / "" etc., breaking the visual continuity of "I'm holding something"

**Cause**: Browsers **deliberately suppress `pointermove` / `mousemove` while an HTML5 drag is active**, surfacing `dragover` instead. `CursorTrail` only listens for `pointermove`, so its tracked position freezes the moment the drag starts. Separately, `runHitTest` recomputes cursor type on a 60ms throttle from `elementFromPoint` — keep that running during a drag, and the cursor type ping-pongs between every element the user passes over, instead of staying locked to "grab"

**Solution**: Two patches together

1. **Forward `dragover` into `handleMouseMove`** — `DragEvent` and `PointerEvent` share `clientX/Y`, so a cast is enough to restore the coordinate stream
2. **Lock cursor type at drag-start** — on `dragstart`, set `isHtml5Dragging = true` + `cursorTypeRef.current = "grab"` + `setCursorType("grab")`. Have `runHitTest` early-return whenever dragging is active. Clear the flag on `dragend` / `drop`

```ts
let isHtml5Dragging = false;
const onDragStart = () => {
  isHtml5Dragging = true;
  cursorTypeRef.current = "grab";
  setCursorType("grab");
};
document.addEventListener("dragstart", onDragStart, true);
window.addEventListener("dragover", (e) => handleMouseMove(e as unknown as PointerEvent));

const runHitTest = (mx: number, my: number) => {
  if (isHtml5Dragging) return; // grab is locked — never reflect hovered elements
  // ...
};
```

**Insight**: While native HTML5 drag is active, pointer events are **suspended at the system level**. `dragover` can keep coordinates flowing, but unless you separately track drag-start and drag-end, your hit-test has no idea the user is mid-drag. For any cursor-state component that flips modes per hover, **freeze the mode on drag-start and release on drag-end via a ref-based lock** — otherwise the cursor's identity collapses into whatever the mouse passes over


</details>

<details>
<summary><strong>79. The limits of HTML5 D&D: micro-reorders belong to pointer events</strong></summary>

**Problem**: Two reorder UIs (RelationPicker chips, SortOrderDragList paged items) were hit by three HTML5 D&D quirks simultaneously

1. Toggling `draggable={dragId === id}` from state — the DOM attribute update lagged React batching, so drags wouldn't start
2. Asymmetric behavior — "back-to-front" reorder worked but "front-to-back" didn't, despite identical code
3. When the source chip lived on a paginated list and a page change unmounted it mid-drag, the browser immediately cancelled the drag

**Cause**: HTML5 D&D **reads the DOM `draggable` attribute once at drag-start** and never reacts to later changes. It also cancels the session when the source node unmounts. The "front-to-back" asymmetry is the same mechanism — when sibling chips reorder, React's key-based reconciliation can move the source DOM into a new slot, breaking the drag tracker. Combine these and small reorder UIs end up with more quirks than features

**Solution**: Replace both with **pointer-based drag**

1. **`pointerdown` on the handle → document-level tracking** — per `pointermove`, do `elementFromPoint(ev.clientX, ev.clientY)` → `closest("[data-chip-id]")` to track the hovered target id. On `pointerup`, splice `selectedIds` and call `onChange`
2. **Edge handling for paginated lists** — when the source nears a list edge (60px), call `apply()` to **actually reorder** the source into the first/last slot of the adjacent page. A bare `setPage` would unmount the source and cancel the drag, so the position change itself keeps it mounted
3. **Avoid `setPointerCapture`** — it would absorb child clicks and kill the chip's × button

```tsx
onPointerDown={(e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  const sourceId = id;
  setDragId(sourceId);
  let lastTargetId: string | null = null;
  const onMove = (ev: PointerEvent) => {
    const elem = document.elementFromPoint(ev.clientX, ev.clientY);
    const tId = elem?.closest("[data-chip-id]")?.getAttribute("data-chip-id") ?? null;
    if (tId && tId !== sourceId && tId !== lastTargetId) {
      lastTargetId = tId;
      setDragOverId(tId);
    }
  };
  const onUp = (ev: PointerEvent) => { /* splice + onChange */ };
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}}
```

**Insight**: Native HTML5 D&D is optimized for "drag an image/file to another OS app" — **for in-page micro-reorder of chips or list items, the sum of its quirks is bigger than its convenience.** State-driven `draggable` toggling, source-unmount cancellation, child-click absorption (with `setPointerCapture`), front-to-back asymmetry — all fall out of the spec. **For micro-reorder UIs, write pointer-event drag from the start** — it ends up shorter and behaves consistently


</details>

<details>
<summary><strong>80. Deferred capture: keep clicks alive below a movement threshold</strong></summary>

**Problem**: Clicking a team polaroid (flip) card inside the horizontal carousel didn't toggle it. The card had a working `onClick`, yet the event never reached it.

**Cause**: For mouse drag-scroll, the carousel called **`el.setPointerCapture()` immediately on `onPointerDown`**.

- Once the pointer is captured, all subsequent pointer events get redirected to the carousel, so the child card's `click` (a pointerdown→up pair) never reaches the card
- In other words, "capture to drag" also swallowed the "tap/click"

**Solution**: Defer the capture **from pointerdown to the moment a real drag begins**

1. `onPointerDown` only records the start coords (`active: true`) — no capture
2. `onPointerMove` calls `setPointerCapture()` + sets `data-cursor="grab"` only **once the move exceeds 4px** → judged a real drag
3. Release under 4px and no capture happens, so `click` propagates to the child normally. `onClickCapture` swallows the click only when the `moved` flag is set, blocking the unintended click at the end of a drag

**Insight**:

① Calling `setPointerCapture` straight on pointerdown **removes any chance to distinguish click from drag** — the capture takes the child's events wholesale
② "Don't capture until the move exceeds a threshold (4px)" is the standard pattern for letting click and drag coexist (same cause/fix as TagCloud3D and Series Deck)


</details>

<details>
<summary><strong>81. Axis-based wheel routing: a blanket prevent kills vertical scroll too</strong></summary>

**Problem**: Hovering a code block and scrolling vertically didn't move the page — the code block felt like it was swallowing the scroll.

**Cause**: The code block `<pre>` had a blanket `data-lenis-prevent`. It was meant to keep horizontal scroll alive (wide code), but Lenis ignores wheel over that element entirely, so when the block didn't overflow vertically, scrolling vertically moved nothing (Lenis doesn't scroll the body directly, so native vertical scroll doesn't kick in either).

**Solution**: Replace the blanket prevent with axis-based wheel routing.

1. Horizontal gesture (`|deltaX|>|deltaY|` or shift+wheel) → scroll the block horizontally if it overflows
2. Vertical gesture → scroll the block if it can scroll vertically and isn't at the edge, otherwise let the event fall through
3. Lenis listens for wheel on `window` (bubble) and uses `composedPath` — calling `stopPropagation` inside the block makes Lenis skip that event; not calling it lets Lenis scroll the page. Touch stays native via `data-lenis-prevent-touch`

**Insight**: On a smooth-scroll library, a blanket prevent to make "one region scroll itself" also blocks vertical pass-through — you have to judge axis/boundary, intercept only the direction you need, and let the rest fall through to the library for nested scrolling to feel natural.


</details>

<details>
<summary><strong>82. Events outside the library's contract: pair preventDefault with opt-out markers</strong></summary>

**Problem**: In a horizontal scroll section the panels rotated sideways, but the page also scrolled vertically at the same time.

**Cause**: The global Lenis attaches its own wheel listener on window and drives the page directly with `scrollTo`. `onVirtualScroll` in Lenis 1.0.42 never checks `event.defaultPrevented`. `preventDefault()` only stops the browser's native scroll.

**Solution**: Marked the wheel-capturing element with `data-lenis-prevent-wheel`, which Lenis looks for in `composedPath`. When the section reaches its end and should hand scrolling back, the attribute is removed so Lenis takes over. The cleanup function must remove the attribute, or vertical scrolling dies in the mobile layout.

**Insight**: Smooth-scroll libraries operate outside the browser's event contract. `preventDefault` and the library's own opt-out marker must be managed as a pair.


</details>

<details>
<summary><strong>83. What links give you for free: on canvas you rebuild all of it</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/works-cylinder-light.png" width="100%" alt="Works Cylinder — 3D layout" />
</p>

**Problem**: Middle-clicking a work panel in the cylinder layout did not open a new tab, and there was no keyboard access to the panels at all.

**Cause**: Browsers fire `auxclick` instead of `click` for middle clicks, and react-three-fiber does not listen for auxclick. Wrapping the canvas in an `<a>` was unusable because the custom cursor (CursorTrail) matches `closest("a, button")` and drew the link cursor even where no panel exists.

**Solution**: Pair `button === 1` in the mesh's `onPointerDown` and `onPointerUp` on the same mesh, clearing the record in `onPointerLeave`. Modified clicks open via `window.open(href, "_blank", "noopener")`. Keyboard access is a link list that appears on focus, rotating the cylinder as focus moves.

**Insight**: Making canvas interactions behave like links means re-implementing everything the browser gives links for free: middle click, modifier keys, keyboard focus. Missing any one becomes an accessibility hole.


</details>
