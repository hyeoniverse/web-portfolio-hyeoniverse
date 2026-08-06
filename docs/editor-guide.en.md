# Editor · Markdown Syntax Guide

There are two editors in this project, and the supported syntax differs slightly.

- **Post editor** — Plate (Slate-based) WYSIWYG. Typing markdown converts it to formatting inline (autoformat), and it supports slash (`/`), mention (`@` · `[[`), and emoji (`:`) triggers plus rich blocks (poll, calendar, diagram, …). Formatting can also be applied via the toolbar or keyboard shortcuts.
- **Comment editor** — lightweight markdown. The markdown string is rendered with `marked` (Write / Preview tabs). Since it is untrusted input, the rendered output is sanitized against a DOMPurify allowlist (scripts and arbitrary HTML are stripped).

> Live help: the post editor has a **help (?)** button at the top-right (shortcuts · syntax), and the comment toolbar has a **"Markdown supported"** button with the same reference.

---

## Inline formatting

| Syntax | Result | Post editor | Comment |
|---|---|:---:|:---:|
| `**bold**` | **bold** | autoformat · `Cmd+B` | ✓ |
| `*italic*` | *italic* | autoformat · `Cmd+I` | ✓ |
| `***bold italic***` | ***bold italic*** | — | ✓ |
| `~~strike~~` | ~~strike~~ | autoformat · `Cmd+Shift+S` | ✓ (accent line only) |
| `==highlight==` | highlight | autoformat | `<mark>highlight</mark>` |
| `` `code` `` + Space | `code` | autoformat · `Cmd+E` | ✓ |
| underline | underline | `Cmd+U` | `<ins>underline</ins>` |
| superscript | X² | toolbar | `<sup>2</sup>` |
| subscript | X₂ | toolbar | `<sub>2</sub>` |
| keyboard | `Ctrl` | — | `<kbd>Ctrl</kbd>` |
| `[text](url)` | link | autoformat | ✓ |
| `![alt](url)` | image | autoformat | ✓ (external URL only) |
| `:tada:` | 🎉 | autoformat | ✓ |

**Special inline-code behavior** (post · comment · reader)
- **Syntax highlight** — inline code that is confidently detected as code is highlighted automatically. Short (≈under 12 chars), color values, and non-code stay plain.
- **Color swatch** — if the content is a `#hex` · `rgb()` · `hsl()` color, a color dot (swatch) is prepended (GitHub style).
- **Style** — Notion-style background: no border, a subtle background + accent text, capsule caps only at the two ends. Long code wraps naturally across lines.
- **Input (post editor)** — after typing a `` ` `` pair, press **Space** to convert (not immediate). Pressing **Backspace** right after inline code releases the code (removes the backticks) instead of deleting the content.

---

## Blocks

| Syntax | Result | Post editor | Comment |
|---|---|:---:|:---:|
| `#` – `######` + Space | Heading 1–6 | autoformat · `Cmd+Opt+1/2/3` | ✓ |
| `>` + Space | Blockquote | autoformat · `Cmd+Shift+B` | ✓ |
| `-` / `1.` + Space | Bullet / ordered list | autoformat · `Cmd+Shift+8/7` | ✓ |
| `[]` + Space | Checkbox (task) | autoformat | `- [ ] todo` |
| ```` ``` ```` + Enter | Code block | autoformat | ```` ```js ```` |
| `---` | Divider | autoformat | ✓ |
| `\| a \| b \|` | Table | toolbar (table block) | ✓ |
| `> [!NOTE]` | Alert callout | autoformat | ✓ |
| `[^1]` | Footnote | autoformat | ✓ |

**Alert / Callout** — `> [!TYPE]` followed by the body. `TYPE` is one of `NOTE` · `TIP` · `IMPORTANT` · `WARNING` · `CAUTION`, each with its own icon and color. In the post editor, typing `[!NOTE]` and pressing `]` wraps it into a callout block.

```
> [!WARNING]
> This action cannot be undone.
```

**Footnote** — `[^1]` in the body, `[^1]: footnote text` at the end of the document. In the post editor, typing `[^label]` auto-creates the footnote reference plus a footnote-content block at the end.

**Code block** — specify a language for syntax highlighting (Prism). In the reader/preview a language label plus copy and wrap toggle buttons appear above the block, and scrolling vertically over a code block passes through to the page (axis-based wheel routing).

---

## Post-editor-only triggers · rich blocks

| Trigger | Action |
|---|---|
| `/` | Slash menu — insert any block |
| `@` | Date mention — today · tomorrow · pick a date |
| `:` | Emoji picker (`:keyword` for inline search) |
| `[[` | Post link — search another post and insert an internal link pill |

**Rich blocks** (slash menu / toolbar): poll, calendar, diagram · mermaid, tabs, toggle, math (KaTeX), code playground (Sandpack), image, column, custom emoji.

**Color** — pick text/background color with the toolbar color picker (recent colors remembered). In comments, choosing a color inserts it as a `` `#hex` `` inline code, rendered with a color swatch.

**Post link (comment)** — the post-link button in the comment toolbar searches other posts and inserts a `[title](/posts/slug)` relative link (opens in a new tab).

---

## Key shortcuts (post editor)

| Action | Shortcut |
|---|---|
| Bold · italic · underline · strike · code | `Cmd+B` · `I` · `U` · `Shift+S` · `E` |
| Heading 1 / 2 / 3 | `Cmd+Opt+1 / 2 / 3` |
| Blockquote | `Cmd+Shift+B` |
| Bullet / ordered list | `Cmd+Shift+8 / 7` |
| Undo / redo | `Cmd+Z` / `Cmd+Shift+Z` |
| Move between blocks (cursor) | `Opt+↑ / ↓` |
| Move block | `Cmd+Opt+Shift+arrows` |
| Select blocks | `Shift+↑ / ↓` · `Shift+Click` |

On Windows/Linux, `Cmd → Ctrl` and `Opt → Alt`.

---

## Autosave & Draft Restore

- Autosaves on a 3-second debounce after you stop editing (localStorage draft + server revision).
- Restore is based on the same device's localStorage. Server (cross-device) auto-restore is currently disabled — this prevents a stale revision from an earlier save reverting the content to an old version on load. `posts.content` is the source of truth.
- A new post left without publishing (navigating away · closing the tab · refreshing) is saved as a draft (unpublished) as long as it has content, and reopening it in the same tab continues editing that draft (no duplicate drafts). It doesn't fire after you finish publishing/saving, so a published post never reverts to a draft.
- The history (revision) popup can restore (Undo2 icon) or delete a past snapshot.

---

## Co-author Selection

- Opening a new post automatically assigns the signed-in user as the author (`author_ids`).
- Adding another member from the author chips makes them a co-author. Even when the authors registered in settings are empty, the signed-in user always appears as a chip.
- The **"Manage authors"** link goes to the settings (members) screen.

---

## Comment render pipeline

Comments are rendered through `marked` (gfm + breaks + alert + footnote + emoji extensions) → DOMPurify sanitization. HTML outside the allowed tag/attribute allowlist (scripts, event handlers, arbitrary tags) is removed. Images only pass through external `http(s)` URLs; root-relative paths like internal post links (`/posts/...`) are allowed, while protocol-relative URLs (`//...`) are blocked.
