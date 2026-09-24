# Trouble Shooting: Plate Editor

[← Index](../troubleshooting.en.md)

<details>
<summary><strong>44. Preserving inline flow: a div inside an inline void blocks the caret</strong></summary>

**Problem**

Images in the Plate (Slate) editor were configured as inline void (`isInline: true, isVoid: true`), but it was **impossible to click to place the cursor or use arrow keys to navigate** beside the image, making text insertion impossible

**Cause**

Slate's normalization correctly inserts empty text nodes (zero-width spaces) around inline voids, but the ImageElement internally nested `<div>` elements (BlockDropZone + wrapper) inside an inline `<span>` (PlateElement). **`<div>` is a block element that breaks inline flow**, causing the browser to block cursor access to adjacent text nodes

```
❌ <span display="inline">          ← PlateElement (inline)
     <div>                          ← BlockDropZone (block!)
       <div contentEditable={false}> ← wrapper (block!)
         <div>                       ← hover container (block!)
           <img />
```

**Solution**

Created a separate rendering branch for `imgLayout === "inline"` that **converts all wrappers to `<span>`** and removes BlockDropZone. Also added absolute-positioned 6px-wide `InlineCursorTarget` components on each side of the image that **use `editor.api.before()`/`after()` to precisely place the cursor on click**

```
✅ <span display="inline">          ← PlateElement (inline)
     <span display="inline-block">  ← single wrapper (inline!)
       <InlineCursorTarget left />  ← click → cursor before
       <img />
       <InlineCursorTarget right /> ← click → cursor after
```

**Insight**

Placing `<div>` inside an inline void element **destroys the browser's inline flow**, preventing cursor placement in Slate's auto-inserted empty text nodes. Only inline tags like `<span>` should be used inside inline elements


</details>

<details>
<summary><strong>45. Serialization round-trips: custom attributes survive only if encoded</strong></summary>

**Problem**

2-column/3-column layout blocks lost **background color, dividers, and column ratios** when converting between richtext and markdown formats

**Cause**

Plate's Column nodes store custom attributes like `layout`, `columnBg`, `columnDivider`, but the HTML serializer had no rules to preserve this metadata. Standard HTML has no column layout concept, so simple `<div>` conversion **dropped all custom attributes**

**Solution**

Encode metadata as HTML comments during serialization, parse and restore during deserialization:

```html
<!-- columns 50,50 layout=side bg=var(--bg-tertiary) divider=solid -->
<div data-column-group data-layout="side" data-column-bg="...">
  <div data-column data-width="50%">...</div>
  <div data-column data-width="50%">...</div>
</div>
```

Dual encoding with `data-*` attributes and HTML comments ensures recovery even if comments are stripped

**Insight**

Editor-specific attributes not in standard HTML must be **explicitly encoded** during serialization for round-trip preservation. Dual storage via `data-*` attributes + HTML comments provides robustness


</details>

<details>
<summary><strong>46. Gesture disambiguation: when drag and resize share one element</strong></summary>

**Problem**

Clicking an inline image's resize handle triggered image deletion (DnD drop) instead of resize

**Cause**

The inline image's `onPointerDown` handler initiates DnD drag, and clicks on resize handles were intercepted by this handler, processed as drag→drop

**Solution**

Added `closest("[data-cursor^='resize']")` check at the top of `onPointerDown` to disable DnD on resize handle clicks. Separated hitboxes and visual handles into independent sibling elements for independent positioning

**Insight**: When different gestures (drag, resize) overlap on one element, decide which gesture it is at the point where the pointer lands, before anything else runs.


</details>

<details>
<summary><strong>47. z-index and hit testing: an overlay intercepting the pointer</strong></summary>

**Problem**

Mouse cursor didn't change to resize shape at the bottom resize hitbox area — the hitbox was not being detected

**Cause**

The caption overlay (`zIndex: 3`) rendered above the bottom resize hitbox (`zIndex: 2`), intercepting pointer events

**Solution**

Raised hitbox `zIndex` to 4-5 to position above the caption overlay. Extended hitboxes to cover the full image edge for intuitive Figma-style resize UX

**Insight**: The z-index of stacked overlays directly determines pointer hit order. Visual stacking and event delivery have to be designed together.


</details>

<details>
<summary><strong>48. Scroll container bounds: placement decisions for floating elements</strong></summary>

**Problem**

When displaying image Tooltip (size info) in the editor, if the image scrolls above the editor area, the Tooltip renders outside the editor or gets clipped

**Cause**

Tooltip's `auto` placement logic only checked viewport top (`rect.top < 60`), ignoring the editor's scroll container boundary

**Solution**

In the `measure()` function, traverse up from the trigger to find the nearest overflow parent (`overflow-y: auto|scroll|hidden`). If the distance between scroll container top and trigger top is less than 40px, switch to `bottom` placement

**Insight**: Placement decisions for floating elements must consider the nearest scroll container's bounds, not just the viewport.


</details>

<details>
<summary><strong>49. Leaf blocks vs wrappers: finding the current block needs an upward walk</strong></summary>

**Problem**

Placing cursor inside blockquote, code block, or table didn't activate the corresponding toolbar button

**Cause**

`useBlockInfo` hook uses `editor.api.block()` to get the nearest block, but child blocks inside wrapper blocks (`p`, `code_line`, etc.) are returned first, setting `blockType` to `"p"` or `"code_line"`

**Solution**

When `blockType` is `"p"` or `"code_line"`, use `editor.api.above()` to search for parent wrapper blocks. Iterate through `["blockquote", "code_block", "table"]` and update `blockType` when found

**Insight**: In a tree-structured editor, the "current block" is a leaf. A wrapper's active state has to be found separately by walking upward.


</details>

<details>
<summary><strong>50. Referential integrity: delete orphan nodes in reverse order</strong></summary>

**Problem**

Deleting a footnote reference (`footnote_ref`) leaves the footnote content (`footnote_content`) at the bottom, and vice versa. Orphan nodes are serialized and saved to the database

**Cause**

Footnote references and content are linked by `footnoteId`, but Plate's normalizeNode doesn't recognize this relationship, so deleting one side leaves the other intact

**Solution**

Separate `useEffect` with 300ms debounce scans all footnotes on editor change. Orphan nodes with unmatched `footnoteId` are deleted in reverse order to prevent path shift issues. Direct deletion inside `normalizeNode` caused `Cannot find a descendant at path` errors, hence the effect-based approach

**Insight**: Referential integrity between nodes is not something the editor maintains for you. Orphan deletion must run in reverse order so paths do not shift.


</details>

<details>
<summary><strong>51. Two intents in one click: separating navigate from edit</strong></summary>

**Problem**

Clicking a link in the editor immediately opens a new tab, making it impossible to edit the link URL or text

**Cause**

`LinkElement`'s `onClick` directly called `window.open()`, preventing cursor placement inside the link

**Solution**

Single click → `e.preventDefault()` only, placing cursor inside the link and auto-showing the link edit toolbar. Double click → opens in new tab. To prevent flickering on link-to-link navigation, `currentLinkKey` (based on link path) distinguishes links, and a custom outside-click handler ignores editor content clicks instead of `useOutsideClick`

**Insight**: A link inside an editor carries two intents in one click: navigate and edit. Splitting them across click and double-click keeps both alive.


</details>

<details>
<summary><strong>52. What the default defended: the cost of overriding selection affinity</strong></summary>

**Problem**: When pressing ArrowLeft to move from the second to the first character inside an inline code (`<code>` mark), the cursor jumped to the previous text node

**Cause**: `CodePlugin.configure({ rules: { selection: { affinity: "directional" } } })` overrode Plate's default `"hard"`. `"hard"` affinity keeps the cursor inside mark boundaries, while `"directional"` delegates to browser default behavior, causing the cursor to jump outside the `<code>` element boundary

**Solution**: Removed the affinity override, using Plate's default (`"hard"`)

```ts
// Before
CodePlugin.configure({ rules: { selection: { affinity: "directional" } } }),

// After
CodePlugin,
```

**Insight**: Before overriding a library default, find out what that default was defending against.


</details>

<details>
<summary><strong>53. Out of flow vs inside a paragraph: float images against inline voids</strong></summary>

**Problem**: Wanted a float image that wraps with the body text while (1) dragging/selecting the neighboring text block leaves the image alone, (2) no empty line shows above/below the image, and (3) clicks/arrows never drop the caret onto an invisible blank — but the three goals conflicted.

**Cause**: CSS `float` pulls the image out of flow, but in Plate (Slate) the image is an inline void (`isInline: true, isVoid: true`) — it must live inside a paragraph with mandatory empty text (ZWSP) on both sides.

1. In the **same paragraph**, block drag moves image + text as one unit
2. Split into its **own paragraph** and the in-flow content is just a ZWSP line → renders as an empty line
3. Collapse that line (`line-height:0`) and the block becomes 0-height, breaking caret/handle; cover it with the next block and the now-invisible spot still catches clicks/arrows → caret flickers there

**Solution**: Fix across three layers — data, layout, input

1. **(Data) Independent block** — on every change, split mixed paragraphs with `splitNodes` so the image gets its own paragraph → drag/selection independent from text
2. **(Layout) Hide the empty line** — instead of collapsing the image block to 0-height, **pull the next block up by one line** (`margin-bottom: -1lh`). The image block stays intact so caret/handle render fine; give the float wrapper a `z-index` so the move handle isn't covered
3. **(Input) Block entry into the blank** — intercept click (mousedown) and arrows (keydown) in the **capture phase**; when the caret would land on the blank, select the image or jump to the adjacent block instead. Handled before Slate's default move → no flicker

**Insight**:

① A CSS float (out of flow) and an inline void (forced in-paragraph text) fundamentally conflict — no single-spot fix works
② You don't *remove* the empty line — you **cover it with the next block** and **stop the caret from reaching it**
③ Letting Slate move the caret first and correcting afterward yields a 1-frame flicker → you must **pre-empt in the capture phase**
④ The inline void's mandatory ZWSP can't be deleted (normalize restores it), so making it **invisible + untouchable** is the pragmatic workaround


</details>

<details>
<summary><strong>54. Inner scroll defeats sticky: replacing it with fixed plus a spacer</strong></summary>

**Problem**: Tried to pin the editor's top bar (BackLink, save, revisions, etc.) at the top with `position: sticky`, but it never pinned — it scrolled away with the body content.

**Cause**: The editor body is an **inner scroll region** wrapped in `height: 60vh` + `data-lenis-prevent`, so the page (document) itself barely scrolls.

- `position: sticky` pins only **when the scroll container actually scrolls**, but wheeling inside the body leaves the page scroll position unchanged, so sticky never has a condition to fire
- Also, `scroll` events don't bubble, so a plain listener can't catch the nested body region's scroll

**Solution**: Drop sticky and control it directly with `position: fixed`

1. **(Pin) `position: fixed; top: var(--header-height)`** — always fixed right below the global Navigation. Collapse/expand via `transform: translateY()`
2. **(Reserve flow) `ResizeObserver` spacer** — fixed removes the bar from flow, so the body shifts up and gets covered; measure the top bar height with a `ResizeObserver` and reserve the space with a same-height `.topBarSpacer`
3. **(Detect scroll) capture-phase listener** — `window.addEventListener("scroll", onScroll, true)` listens in the capture phase; when the target is the document it's page scroll, when it's an `HTMLElement` it's nested body scroll. Both accumulate direction (delta) and toggle collapse/expand once a threshold (6px) is hit — slow scrolls still work as long as they sum in one direction

**Insight**:

① `position: sticky` works only when there's an ancestor that **actually scrolls** — in an inner-scroll pattern (`60vh` + `lenis-prevent`) the page never moves, so sticky is meaningless
② `scroll` events **don't bubble** → to catch nested scroll regions with one listener you must listen in the **capture phase** (`useCapture=true`)
③ `fixed` removes the element from flow, so to avoid covering content you must **explicitly reserve** its height with a spacer (kept in sync via `ResizeObserver`)


</details>

<details>
<summary><strong>55. Isolating IME from the editor model: commit-on-blur inputs</strong></summary>

**Problem**: Typing Korean into an in-editor form input (poll/tab blocks, etc.) corrupts or drops the composing character.

**Cause**: When Slate re-renders mid-IME-composition, the composition state is broken.

**Solution**: Isolate poll/tab inputs as a void element + the shared `EditorTextInput`

1. `EditorTextInput` uses `contentEditable=false` + commit-on-blur — it operates outside Slate's editing model, so it isn't affected by re-renders during composition
2. `onMouseDown` calls `nativeEvent.stopImmediatePropagation()` to block Slate's selection handling
3. Same pattern as the image caption

**Insight**: Form inputs inside the editor must be separated from the editor's editing model for IME composition to stay safe — reusing the pattern already proven on captions for poll/tab.


</details>

<details>
<summary><strong>56. Blocking native drag: it cannot coexist with pointer drags</strong></summary>

**Problem**: When dragging an editor block by its handle, the browser's HTML5 native drag intercepts and the custom pointer drag doesn't run.

**Cause**: With the handle picked up as draggable, the browser starts a native drag session, during which pointer event dispatch is suppressed and the custom drag logic receives no coordinates

**Solution**: Disable native drag and replace it with a custom drag layer

1. Disable `useDraggable`'s preview + set `draggable={false}` on the handle to block native drag
2. A custom `BlockDragLayer` draws a DOM-cloned ghost that follows the cursor and auto-scrolls at the editor edges
3. The cursor shape is set via the `data-cursor` attribute (CursorTrail system), not CSS `cursor`

**Insight**: To use pointer-based custom drag you must explicitly turn off HTML5 native drag — if both coexist, native swallows the pointer events.


</details>

<details>
<summary><strong>57. IME composition vs re-renders: deferring state commits</strong></summary>

**Problem**: During IME composition (Korean, etc.), interacting with the slash menu/toolbar entered the first character twice.

**Cause**: A parent (editor) re-render during composition breaks the composition, so the first character gets re-entered.

**Solution**: During composition, suppress parent state changes like `onOpenChange` (without freezing `open` itself — keeps search working).

**Insight**: A parent re-render during IME composition resets the composition — defer state commits during composition events.


</details>

<details>
<summary><strong>58. Normalizing value types: numeric node values vs string options</strong></summary>

**Problem**: The toolbar line-height Select could not resolve values that are not in the presets (such as 1.25 on headings), showing a blank field, and the console warned about duplicate option keys.

**Cause**: The value's type diverged in two layers. `setLineHeight` stores line-height on the node as a number (`1.6`) while the toolbar preset options compare as strings (`"1.6"`), so the same value entered the options twice and produced duplicate keys. The detection logic also returned an empty string when the computed value was not close to any preset, so values like a heading's 1.25 were never displayed.

**Solution**: Normalized the node value with `String(...)` so it compares and renders with the same type as the string presets, and exposed non-preset values as-is at the top of the Select options.

**Insight**: Values stored on Slate nodes as numbers must be normalized with `String` before comparing against string-based options. Preset matching has to handle both branches, "close to a preset" and "actual value", or blanks appear.


</details>

<details>
<summary><strong>59. History snapshots: undoing exactly one conversion</strong></summary>


**Problem**: After deleting a bullet created by markdown autoformat, continuing to press Backspace resurrected the bullet or jumped the cursor to another line instead of deleting characters.

**Cause**: The logic treating Backspace right after an autoformat as "undo the conversion" called undo without checking history. If any other edit had happened since the conversion, undo reverted that edit instead. A detection bug that misjudged a mid-paragraph space as a conversion compounded it.

**Solution**: Record the history position before inserting the trigger, and before reverting, verify the history is still exactly as it was right after the conversion. If so, inverse-apply only the operations since that point to restore the markdown marker; otherwise Backspace behaves normally. Backspace at the start of a block also restores the markdown marker (`- `, `## `, `> `) even when it is not right after an autoformat.

**Insight**: `editor.undo()` reverts the whole last batch. To revert "just that conversion", snapshot the history position and inverse-apply only the operations recorded since.


</details>
