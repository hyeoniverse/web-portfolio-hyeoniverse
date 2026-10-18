# Trouble Shooting: Animation · Interaction

[← Index](../troubleshooting.md)

<details>
<summary><strong>53. The library's source of truth: read Lenis velocity inside its event</strong></summary>

**Symptom**: The scroll-velocity parallax on images in the home works section did not apply.

**Cause**: The first attempt detected wheel events directly, which gave unstable values and conflicted with Lenis. The next attempt computed velocity from scroll position differences in a requestAnimationFrame loop, which was inaccurate because frame intervals vary. Reading the Lenis instance's `velocity` property outside its event returned values that had not been updated. Lenis computes velocity internally and exposes it as an instance property, but the accurate value has to be read inside the scroll event handler.

**Fix**: The instance's `velocity` is read inside Lenis's `on("scroll")` handler.

```tsx
const handleScroll = () => {
  const velocity: number = (lenis as unknown as { velocity: number }).velocity;
  if (Math.abs(velocity) > 0.05) {
    /* clamp the offset to a maximum scaled by screen width, then set the motion value */
    workImageOffsetY.set(offset);
  }
};
lenis.on("scroll", handleScroll);
```

This is a shortened version of `src/hooks/useScrollVelocity.ts`. `velocity` is not in Lenis's public types, so a type assertion is needed. When scrolling stops for a while, the offset returns to 0.

**Conclusion**: Values a library computes internally should not be recomputed by hand. They are accurate when read inside the event in which the library updates them.


</details>

<details>
<summary><strong>54. Wrapping scroll position: cycle the position, not the clones</strong></summary>

**Symptom**: The Works page's horizontal gallery repeated the project list several times to look infinite. Scrolling to the end still revealed a blank area.

**Cause**: With a finite number of repeated sets, both directions have an end. `scrollX` kept accumulating in the animation loop and left the content range. Adding more sets creates too many DOM nodes. Jumping back to the start with `window.scrollTo` at the end produced a visible jump.

**Fix**: The width of one set (`oneSetWidth`) is the difference between the `offsetLeft` of two intro elements. In the animation loop, `scrollX` and `targetScrollX` are both shifted by that width to bring them back into range.

```tsx
if (infiniteScroll && oneSetWidth > 0) {
  while (scrollX > oneSetWidth * WRAP_SETS) {
    scrollX -= oneSetWidth;
    targetScrollX -= oneSetWidth;
  }
  while (scrollX < -oneSetWidth * WRAP_SETS) {
    scrollX += oneSetWidth;
    targetScrollX += oneSetWidth;
  }
}
```

This is the code in `src/app/works/_hooks/useWorksHorizontalScroll.ts`. Only three sets (`INFINITE_SCROLL_SETS`) are rendered. Scrolling starts at the middle set, and the position wraps once it moves past one set (`WRAP_SETS`). The sets have identical content, so the wrap is invisible.

**Conclusion**: Infinite scrolling works in both directions without extra DOM by cycling the scroll position by one set width instead of adding clones. The current and target values must move by the same amount so interpolation is not interrupted.


</details>

<details>
<summary><strong>55. Viewport-dependent initialization: recompute via key remount</strong></summary>

**Symptom**: Resizing the window across desktop, tablet and mobile left GSAP ScrollTrigger pins and requestAnimationFrame-based movement calculated for the previous viewport, and the layout broke.

**Cause**: ScrollTrigger's `start`, `end` and `pin` are calculated from the viewport size at creation. The requestAnimationFrame calculations also run on the initial width. Existing instances do not update when the viewport changes. Re-running effects with a resize listener in each component duplicated code and missed some places. `ScrollTrigger.refresh()` could not handle cases where the DOM structure changes, such as switching between horizontal and vertical layouts.

**Fix**: `BreakpointGuard` remounts all of its children through `key` when the viewport crosses a breakpoint. Providers above it stay mounted, so global state is not lost. It was first placed in the root layout. Today only `src/app/profile/page.tsx` uses it.

The current implementation changed in two ways. The breakpoint considers width (1024px) and height (640px) together. The `key` is the number of crossings (`generation`), not the breakpoint name. The key used to start as `"desktop-tall"` and receive the real value in the first effect. On mobile that changed the key right after the visit, so the whole page was rebuilt once, the already painted hero was redrawn as a new node, and LCP was delayed. Now the first effect only records the baseline and does not change the key. When a breakpoint is crossed, an opaque cover appears in the same render and `generation` increments. After 150ms the cover fades out over 450ms, and a breakpoint change that happened in between is handled once more.

**Conclusion**: Animations that depend on the viewport at creation are more reliable when remounted through a `key` change than when partially refreshed. Keep the remount scope below the Providers, and do not change the key on the first mount.


</details>

<details>
<summary><strong>56. State plus synchronous refs: resetting residue on mode switches</strong></summary>

**Symptom**: After custom cursors (↔, ↕, ⤡ and so on) were added to the resize handles of editor images and column blocks, the cursor arrows rotated and stretched depending on mouse direction.

**Cause**: CursorTrail's animation loop computes `angleRef` (rotation) and `scaleRef` (scale) from mouse velocity. The previous values remained after entering resize mode. Detecting resize mode through classList also lagged one or two frames behind React's render.

**Fix**: A synchronous ref, `cursorTypeRef`, is updated together with `setCursorType`. When the cursor switches to a resize cursor, `angleRef` and `scaleRef` reset to 0. The animation loop reads `cursorTypeRef.current` to detect resize mode and turns off rotation and scaling.

**Conclusion**: Animation values in components whose mode changes often should be kept as state paired with a synchronous ref, and the previous values must be reset explicitly when a mode is entered, or residue remains.


</details>

<details>
<summary><strong>57. Enter/leave asymmetry: the limits of transition-delay and the hover area</strong></summary>

**Symptom**: Hovering a series card on `/posts` should fan it out like a deck, revealing the series' post layers one by one. The first implementation flickered as if the deck disappeared and reappeared when it opened, opened too quickly after hover, and showed all layers at once instead of in sequence. Once open, moving the mouse across the gaps between layers ended the hover, closed the deck and opened it again.

**Cause**:

1. The layers' sequence used CSS `transition-delay`. When the hover ended, every delay was cancelled at once and the layers vanished together.
2. The transform easing was an overshooting `cubic-bezier(0.34, 1.45, ...)`, so the deck looked slightly spread even before it opened.
3. The opening delay was 0, so the deck opened as soon as the mouse entered.
4. To push the next card aside on open, `margin-right` grew. Margin changes only the visible layout and does not enlarge the element's hit area. The gaps between layers counted as outside the card, so the hover ended there.

**Fix**:

1. JS decides when the deck opens. `useSeriesDeck` switches to the open state after the hover lasts 800ms (`HOVER_OPEN_MS`) and only clears the timer when the hover ends.
2. Each layer gets `--deck-i` and opens in order with `transition-delay: calc((var(--deck-i, 1) - 1) * 0.18s)`. JS starts the opening, so the CSS has no base delay.
3. The easing changed to the non-overshooting `--ease-standard`.
4. The card has an `::after` whose width snaps to the opened layers' width (`var(--deck-count) * 176px`) when open. That area also counts as the card's hover area, so passing over the gaps keeps the hover.

**Conclusion**: CSS `transition-delay` applies equally to enter and leave, so asymmetric behavior such as "wait, then open; close immediately on leave" needs a JS timer to decide the start. Overshooting easing does not suit motion that should clearly rest and then move. Margin does not enlarge the hit area, so a pseudo-element is needed to widen the hover area.


</details>

<details>
<summary><strong>58. Pointer capture and clicks: capture only after a drag has started</strong></summary>

**Symptom**: Child clicks did not work inside containers that move by dragging. Pressing a team member's polaroid card inside a horizontal carousel did not flip it, even though the card had a working `onClick`. Reordering chips in the relation picker (`RelationPicker`) with HTML5 drag and drop sometimes did not start and sometimes worked in one direction only.

**Cause**: For mouse drag scrolling, the carousel called `el.setPointerCapture()` immediately in `onPointerDown`. Once the pointer is captured, all subsequent pointer events go to the carousel, so the child card's click (a pointerdown and pointerup pair) never reaches the card. The capture meant for dragging also took taps and clicks.

Chip reordering failed because of how HTML5 drag and drop works. The browser reads the DOM `draggable` attribute only once, when a drag starts. Toggling it with state, as in `draggable={dragId === id}`, updated it too late and the drag did not start. When the drag source node was moved by reconciliation or unmounted, the drag session was cancelled.

**Fix**: Capture is set only after an actual drag has started.

```tsx
const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
  const dx = e.clientX - state.startX;
  if (Math.abs(dx) > 4 && !state.moved) {
    state.moved = true;
    el.setAttribute("data-cursor", "grab");
    el.setPointerCapture(e.pointerId);
  }
  el.scrollLeft = state.startLeft - dx;
};
```

This is a shortened version of `HorizontalCarousel`. `onPointerDown` only records the start coordinate, and capture happens after more than 4px of movement. Releasing before 4px never captures, so the click reaches the child. `onClickCapture` blocks the click only when `moved` is true, which prevents an unintended click at the end of a drag.

Other places where child clicks matter do not use capture. `TagCloud3D` tracks rotation with document-level `pointermove` and `pointerup` listeners and decides a drag with a movement threshold. The `RelationPicker` chips were rebuilt with pointer events instead of HTML5 drag and drop. The handle's `pointerdown` adds listeners on the document, every `pointermove` finds the target chip with `document.elementFromPoint()` and `closest("[data-chip-id]")`, and `pointerup` splices the array to reorder.

**Conclusion**: Calling `setPointerCapture` immediately on pointerdown leaves no chance to tell a click from a drag. Capturing only after a movement threshold, or using document-level listeners with a distance check, keeps child clicks working. Reordering small items within one page behaves more consistently with pointer events than with HTML5 drag and drop.


</details>

<details>
<summary><strong>59. Events pause during drag: bridging coordinates with dragover</strong></summary>

**Symptom**: Starting an HTML5 drag, for example in admin sort lists, froze the custom cursor (CursorTrail) in place instead of following the mouse. While dragging, the cursor shape also changed to "text", "big" and so on whenever the mouse passed over other elements.

**Cause**: During an HTML5 drag, the browser stops sending `pointermove` and `mousemove` and sends `dragover` instead. CursorTrail listened only to `pointermove`, so its coordinates stopped updating. `runHitTest` also chooses the cursor shape from `elementFromPoint`, and it kept running during the drag, changing the shape for each element passed.

**Fix**: Two changes were made together. `dragover` events are passed on to `handleMouseMove`. Only `clientX` and `clientY`, which DragEvent and PointerEvent share, are used, so the event is passed with a type assertion. The cursor shape is locked when a drag starts.

```ts
let isHtml5Dragging = false;
const onDragStart = () => {
  isHtml5Dragging = true;
  cursorTypeRef.current = "grab";
  setCursorType("grab");
};
document.addEventListener("dragstart", onDragStart, true);

const runHitTest = (mx: number, my: number) => {
  if (isHtml5Dragging) return;
  // …
};
```

This is the code in `CursorTrail.tsx`. `dragend` and `drop` set `isHtml5Dragging` back to `false`.

**Conclusion**: Pointer events stop while an HTML5 drag is in progress. Coordinates can still come from `dragover`, but without tracking the drag's start and end separately, the hit test cannot know a drag is in progress. A component that changes mode on hover should lock its mode when a drag starts and release it when the drag ends.


</details>

<details>
<summary><strong>60. Axis-based wheel routing: a blanket prevent kills vertical scroll too</strong></summary>

**Symptom**: With the mouse over a code block, scrolling the wheel vertically did not move the page.

**Cause**: To keep horizontal scrolling for wide code, the whole code block `<pre>` had `data-lenis-prevent`. Lenis ignores wheel events over an element with that marker. Even when the block did not overflow vertically, vertical wheel input was ignored and the page did not move. On pages that use Lenis, it does not fall back to the body's native vertical scroll either.

**Fix**: Instead of blocking the whole block, the wheel is routed by axis (`attachWheelRouting` in `highlightCodeBlocks.ts`).

1. For a horizontal gesture (`|deltaX| > |deltaY|` or shift+wheel), the block scrolls horizontally if it overflows horizontally.
2. For a vertical gesture, the block scrolls only if it can scroll vertically and has not reached the end in that direction. Otherwise the event is left alone.
3. Lenis listens for wheel on window in the bubble phase. `stopPropagation()` is called only when the block handled the event, so events left alone reach Lenis and scroll the page. Touch keeps native scrolling through `data-lenis-prevent-touch`.

**Conclusion**: When a region on top of a smooth-scroll library needs its own scrolling, blocking the whole region also blocks vertical scrolling. Handle only the needed direction based on axis and edge position, and pass the rest to the library, so nested scrolling feels natural.


</details>

<details>
<summary><strong>61. Events outside the library's contract: pair preventDefault with opt-out markers</strong></summary>

**Symptom**: In a horizontal scroll section, the panels moved sideways while the page also slid down.

**Cause**: The global Lenis attaches its own wheel listener on window, takes the delta and scrolls the page directly with `scrollTo`. In Lenis 1.0.42, `onVirtualScroll` does not check `event.defaultPrevented`. `preventDefault()` blocks only the browser's default scroll.

**Fix**: Elements that take over the wheel get a `data-lenis-prevent-wheel` marker. When Lenis finds that marker in the event path (`composedPath`), it does not handle the event. When the horizontal scroll reaches its end and should hand off to vertical scrolling, the marker is removed so Lenis can take over. If the cleanup function does not remove the marker, vertical scrolling stops working in the mobile layout.

**Conclusion**: Scroll libraries operate outside the browser's default event contract. `preventDefault` and the library's own opt-out marker have to be managed as a pair.


</details>

<details>
<summary><strong>62. What links give you for free: on canvas you rebuild all of it</strong></summary>

<p align="center">
  <img src="../../../public/images/screenshots/pc/works-cylinder-light.png" width="100%" alt="Works Cylinder: 3D cylinder layout" />
</p>

**Symptom**: Middle-clicking a work panel in the cylinder layout did not open a new tab. There was no way to reach the panels with the keyboard.

**Cause**: Browsers send `auxclick` instead of `click` for a middle click, and react-three-fiber does not handle `auxclick`. Wrapping the canvas in an `<a>` was not an option, because the custom cursor (CursorTrail) checks `closest("a, button")` and would draw a link cursor even where there is no panel.

**Fix**: In the mesh's `onPointerDown` and `onPointerUp`, presses and releases with `button === 1` on the same mesh are paired and treated as a click, and `onPointerLeave` clears the record. Modifier-key clicks and middle clicks open with `window.open(href, "_blank", "noopener")`. For keyboard users, a list of links becomes visible when it receives focus, and the cylinder rotates to the panel as focus moves.

**Conclusion**: Making canvas interactions behave like links means rebuilding, one by one, what browsers give links by default (middle click, modifier keys, keyboard focus). Missing any of them leaves an accessibility gap.


</details>
