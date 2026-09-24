# Trouble Shooting: Markdown · Content Rendering

[← Index](../troubleshooting.en.md)

<details>
<summary><strong>60. Finish before render: dangerouslySetInnerHTML vs post-hoc DOM mutation</strong></summary>

**Problem**

Code blocks in richtext posts written with the Plate editor lost syntax highlighting and the wrap/scroll toggle button. Markdown posts worked correctly

**Cause**

Code highlighting (highlight.js) and button labels were applied by **directly manipulating the DOM in `useEffect`**. After page load, API calls (like count, adjacent posts, recommended posts) completed → state changes → React re-render → `dangerouslySetInnerHTML` overwrites DOM with original HTML → all hljs classes and button labels wiped. The `useEffect` dependencies hadn't changed, so it never re-ran

```
[Initial render]  dangerouslySetInnerHTML = original HTML (no highlighting)
       ↓
[useEffect]        highlight.js applied + button labels created ✓
       ↓
[API complete]     setLikeCount / setAdjacentPosts → state change
       ↓
[Re-render]        dangerouslySetInnerHTML = original HTML → DOM overwritten
       ↓
[Result]           Highlighting & button labels gone, useEffect won't re-run ✗
```

Markdown posts were unaffected because `MarkdownRenderer` generates pre-highlighted HTML on the server

**Solution**

Instead of DOM manipulation, apply **highlighting and button labels to the HTML string itself in `useMemo`**:

```tsx
const processedHtml = useMemo(() => {
  let html = addIdsToHtml(displayContent);
  // Find <pre><code> blocks via regex, apply hljs.highlight()
  html = html.replace(/<pre><code ...>/, (code) => hljs.highlight(code).value);
  // Fill empty <button data-wrap-btn> with label spans
  html = html.replace(/<button data-wrap-btn><\/button>/, labelHtml);
  return html;
}, [displayContent, t]);
```

`useEffect` only handles **click event delegation**

**Insight**

DOM manipulation on `dangerouslySetInnerHTML` content is erased on any state-triggered re-render. HTML must be **finalized before render (useMemo/server-side)**


</details>

<details>
<summary><strong>61. Parser extension ordering: postprocess over custom renderers</strong></summary>

**Problem**

When using headings (`# Title`) and footnotes (`[^1]`) together in the markdown renderer, **footnote numbers got tangled or footnotes inside headings were not converted at all**

**Cause**

The custom heading renderer executed **before** the `marked-footnote` extension, consuming the raw `[^1]` text before it could be converted to a footnote. This left heading footnote references as plain text, and shifted the numbering for all remaining footnotes

```
# Title [^1]     ← heading renderer processes first → [^1] not converted
Body [^2]         ← should be [^1] but number shifted
```

**Solution**

Removed the heading renderer and replaced it with a `postprocess` hook. This ensures marked-footnote **processes all footnotes first**, then the postprocess hook adds `id` attributes to headings afterward. Additionally applied `keepLabels: true` to preserve user-specified footnote numbers (`[^2]` → 2) instead of auto-renumbering

**Insight**

When marked extensions and custom renderers target the same syntax, **execution order determines the result**. Using a postprocess hook instead of a renderer guarantees all extensions process first before any post-processing


</details>

<details>
<summary><strong>62. Runtime conversion vs stored values: URLs that only play in the editor</strong></summary>

**Problem**

When users insert a YouTube video with a `youtube.com/watch?v=xxx` URL, it's stored as-is in `<iframe src="...">`. **Watch URLs cannot load in iframes**, showing a blank screen both in the editor preview and on the published post detail page

**Cause**

Inside the editor, `parseEmbed()` converts watch URLs to embed URLs so **the editor displays correctly**, but `plateSerializer` serializes the node's original `url` property (the watch URL) directly into `<iframe src="...">`. The **editor and serialized URLs diverge** in the database

```
Editor display: youtube.com/embed/xxx  (parseEmbed conversion) → plays OK
DB storage:     youtube.com/watch?v=xxx (raw original)          → iframe load fails
```

**Solution**

Created a `fixEmbedUrls()` utility that **bulk-converts iframe src watch/shorts URLs to embed URLs** just before HTML rendering. Applied to both the post detail page and preview page

```ts
// youtube.com/watch?v=xxx → youtube.com/embed/xxx
// youtu.be/xxx → youtube.com/embed/xxx
// vimeo.com/123 → player.vimeo.com/video/123
html.replace(/<iframe([^>]*)\ssrc="([^"]*)"([^>]*)>/gi, ...)
```

**Insight**

A URL mismatch between editor runtime conversion and serialization creates "works in editor but broken on the actual page" bugs. Adding a URL normalization post-processing step before rendering resolves this


</details>

<details>
<summary><strong>63. DOM outside React: native listeners plus MutationObserver</strong></summary>

**Problem**: We wanted a single fallback rule across **every image surface** — editor / posts / works / Plate panels — so that load failures swap to `/images/placeholder.svg`. React's `<img onError>` worked everywhere it was JSX. But in MarkdownRenderer (marked → HTML → `dangerouslySetInnerHTML`) and `useRichtextEnhance`-styled richtext regions, `onError` never fired and broken images stayed visible

**Cause**:

1. DOM injected via `dangerouslySetInnerHTML` is outside React's reconciler — synthetic event props like `onError` never bind
2. Even native `addEventListener("error")` has a sub-trap: an image whose fetch already completed (`complete && naturalWidth === 0`) won't re-fire `error` when a listener is attached late, leaving it stuck
3. When richtext content mutates (editor mode toggle, lazy load), a one-shot `querySelectorAll` misses the newly added images

**Solution**: Apply the `attachImageFallback(root)` pattern in both `useRichtextEnhance` and MarkdownRenderer

1. **Walk every `<img>` in the container** — gate with `data-fallback-bound` to prevent double binding, attach an `error` listener, **and immediately swap if the image is already failed (`complete && naturalWidth === 0`)**
2. **`MutationObserver(root, { childList: true, subtree: true })`** — so images added later get the same treatment
3. **`removeAttribute("srcset")` together with the swap** — otherwise the browser keeps retrying the broken candidates
4. **React-rendered surfaces use `onError` + state swap** — PostEditor cover / WorkEditor main·gallery / RelationPicker chip·option / Plate ImagePanel·ImageElement all share the pattern via a `displayUrl`

```ts
function attachImageFallback(root: HTMLElement): () => void {
  const handle = (img: HTMLImageElement) => {
    if (img.dataset.fallbackBound === "1") return;
    img.dataset.fallbackBound = "1";
    img.addEventListener("error", () => swapToPlaceholder(img));
    if (img.complete && img.naturalWidth === 0) swapToPlaceholder(img);
  };
  root.querySelectorAll("img").forEach((el) => handle(el as HTMLImageElement));
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        const el = node as Element;
        if (el.tagName === "IMG") handle(el as HTMLImageElement);
        el.querySelectorAll?.("img").forEach((img) => handle(img as HTMLImageElement));
      });
    }
  });
  mo.observe(root, { childList: true, subtree: true });
  return () => mo.disconnect();
}

function swapToPlaceholder(img: HTMLImageElement) {
  if (img.src.endsWith("/images/placeholder.svg")) return;
  img.src = "/images/placeholder.svg";
  img.removeAttribute("srcset");
}
```

**Insight**:

① **DOM from `dangerouslySetInnerHTML` is React's synthetic-event blind spot** — without delegation, `addEventListener` is the only path
② Images that already finished loading (or failing) won't re-fire `error` retroactively — pair the listener attach with a synchronous `complete && naturalWidth === 0` check
③ Leaving `srcset` after a `src` swap lets the browser keep retrying the broken candidates — `removeAttribute("srcset")` together with the swap
④ For dynamic regions like richtext, a one-shot `querySelectorAll` won't catch images added later — pair it with a `MutationObserver` for incremental coverage


</details>

<details>
<summary><strong>64. Single-sourcing: preview and detail render the same component</strong></summary>

**Problem**: The admin editor's preview kept subtly diverging from the actual published detail page — in layout, spacing, and code-block handling.

**Cause**: The preview was a **separate, simplified version** built apart from the detail page.

- Every time the detail markup/styles changed, the preview had to be matched separately; fix one side and it drifted — the same screen implemented twice
- richtext handling (code highlighting, embeds, heading ids) ran through different code paths too, so the output differed

**Solution**: Extract the detail page's article view into **shared presentation components** so detail and preview render the same component

1. `PostArticleView` / `WorkArticleView` export `Header` / `Body` / `Team` → `PostDetailClient`/`WorkDetailClient` (detail) and `posts/preview`/`works/preview` (preview) use the **same components**. Only chrome absent from preview (comments, back link) is added on the detail side
2. richtext HTML processing is shared in one place, `src/utils/processRichtextHtml.ts` — both paths run the identical order: heading id injection → embed URL fix → hljs highlighting → wrap-toggle label → img `data-cursor="zoom"` → identical down to the code blocks

**Insight**:

① A "preview" that differs from the real screen has no value as a preview — the moment you keep a simplified version separate, the **two screens silently drift**
② The fix isn't synchronization but a **single source**: if you need identical output, make both use the same component and the same processing function, so a one-side-only change becomes structurally impossible


</details>

<details>
<summary><strong>65. Allowlists vs value checks: DOMPurify's two separate axes</strong></summary>

**Problem**: `- [ ] todo` in comment markdown rendered as a plain bullet instead of a checkbox — even with `type` listed in `ALLOWED_ATTR`.

**Cause**: DOMPurify tests an attribute's **value** against `ALLOWED_URI_REGEXP` unless the attribute is known to be URI-safe. `type` isn't in the default URI-safe list (alt/class/title/value, …), so the value of `type="checkbox"` failed `/^(?:https?:|mailto:)/i` and was silently dropped — the hook then judged it "not a checkbox" and removed the `<input>`, leaving only the bullet. Table `align` was dead for the same reason, so markdown table alignment was being ignored wholesale.

**Solution**: Declare them as inert, non-URL attributes

1. Added `ADD_URI_SAFE_ATTR: ["type", "checked", "disabled", "align"]` — excluded from the URI check
2. Registering them in `ALLOWED_ATTR` alone does nothing — the two options are different axes (whether it's allowed vs. how its value is inspected)

**Insight**: The allowlist (`ALLOWED_ATTR`) and the value-inspection policy (`ADD_URI_SAFE_ATTR`) are separate axes — when something is "allowed but disappears anyway," suspect that the filter is misreading the attribute's **value** as a URL.


</details>

<details>
<summary><strong>66. Context the parser reads: markdown insertion is more than a string</strong></summary>

**Problem**: Pressing the comment toolbar's checkbox button on a blank line produced a bullet, not a checkbox. The `---` divider button produced a **heading** instead of a rule whenever the previous line had text on it.

**Cause**: Two GFM parsing rules

1. Checkbox: GFM only parses a task list when **text follows** the `- [ ] ` marker — a bare marker on a blank line yields a `<li>[ ]</li>` bullet
2. `---`: with text on the line above, it's read as a **setext h2** (underlined heading syntax), not an hr. Code fences and tables likewise only parse at the start of a line

**Solution**: Have the insert action build the context along with the text

1. Added a placeholder to prefix actions — on a blank line it fills in example text and leaves it selected
2. Block inserts first ensure a blank line above, then insert

**Insight**: A markdown insert button must not just drop a string in — it has to **create the context in which the parser will recognize that syntax**. Inserting the bare marker just makes the button look broken.


</details>
