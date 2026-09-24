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
| `#` – `####` + Space | Heading 1–4 | autoformat · `Cmd+Opt+1/2/3` | ✓ (1–6) |
| `>` + Space | Blockquote | autoformat · `Cmd+Shift+B` | ✓ |
| `-` / `1.` + Space | Bullet / ordered list | autoformat · `Cmd+Shift+8/7` | ✓ |
| `[]` + Space | Checkbox (task) | autoformat | `- [ ] todo` |
| ```` ``` ```` + Enter | Code block | autoformat | ```` ```js ```` |
| `---` | Divider | autoformat | ✓ |
| `\| a \| b \|` | Table | toolbar (table block) | ✓ |
| `> [!NOTE]` | Alert callout | autoformat | ✓ |
| `[^1]` | Footnote | autoformat | ✓ |

**Autoformat revert** — pressing `Backspace` or `Esc` right after an autoformat undoes the conversion and restores the markdown marker (`## `, `- `, and so on) for literal input. Even outside that window, `Backspace` at the start of a block turns the block back into its markdown marker (`- ` for a bullet, `## ` for a heading). Delete the marker to get plain text, or press Space again to re-create the block.

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

**Color** — set text (A) / background (BG) color with the toolbar color picker. The floating toolbar that appears over a selection also carries A/BG split buttons: pressing the left side applies the last-used color immediately, and ▾ opens the menu. Recent colors are shared by every color tool (main toolbar, floating toolbar, presets).

**Color chip** — picking a color from the toolbar palette button inserts that value as a `` `#hex` `` inline code, with a color dot (swatch) prepended so it reads as a "chip". It renders as the same chip in the reader, published post, and comments — and **in the editor's editing view** too. Comments insert colors the same way.

**Post link (comment)** — the post-link button in the comment toolbar searches other posts and inserts a `[title](/posts/slug)` relative link (opens in a new tab).

---

## Main toolbar layout

Buttons are grouped **by scope of effect** and separated with vertical dividers.

| Group | Contents |
|---|---|
| History | Undo · redo · clear formatting |
| Character formatting | Bold · italic · underline · strike · inline code · kbd · super/subscript · highlight · color (A text · BG background · color chip) |
| Typography | Font · size · line height · letter spacing |
| Paragraph | Alignment · indent |
| Headings | H1 – H4 |
| Lists · blocks | Bullet · ordered · checklist · quote · code block |
| Insert | Media · structure · misc (emoji included) — three clusters |

**Direct-input Selects** — font size, line height, and letter spacing accept values outside the presets. **Double-click** the trigger to switch to input mode, type a value, and confirm with `Enter` (an empty Select starts in input mode). The font Select is a searchable dropdown, so you type the name in the top input as soon as it opens. A current value that doesn't match a preset (e.g. a heading's line height 1.25) is shown at the top of the list as-is.

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

## Publish Status Toggle

Clicking the status chip (published/scheduled/draft) in the editor top bar flips the publish state in place and saves immediately. Post and work editors behave the same. A draft with a schedule attached cannot be flipped by the chip; handle the schedule first.

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
