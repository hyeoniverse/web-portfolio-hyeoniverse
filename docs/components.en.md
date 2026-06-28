# Key Components

### StaggerText

A component that splits text into individual characters and applies sequential outline animation on hover.

**Path**: `src/components/effects/StaggerText`

<p align="center">
  <img src="public/images/screenshots/pc/home-dark.png" width="100%" alt="Home — StaggerText" />
</p>

**Features**:

- On hover, characters sequentially change to outline (stroke) starting from the first character
- On hover release, colors fill in reverse order starting from the last character (stroke maintained)
- Custom stroke color and width support
- Configurable per-character delay

**Usage**:

```tsx
import StaggerText from "@/components/effects/StaggerText";

// Basic usage
<StaggerText>Hello World</StaggerText>

// Custom options
<StaggerText
  className={styles.title}
  strokeColor="var(--text-primary)"  // Stroke color
  strokeWidth={2}                     // Stroke width (default: 1px)
  delayPerChar={0.05}                 // Per-character delay (default: 0.04s)
  hoverEffect={false}                 // Disable hover effect
>
  Custom Text
</StaggerText>
```

**Props**:

| Prop           | Type      | Default        | Description                          |
| -------------- | --------- | -------------- | ------------------------------------ |
| `children`     | `string`  | (required)     | Text to display                      |
| `className`    | `string`  | -              | Additional CSS class                 |
| `strokeColor`  | `string`  | `currentColor` | Stroke color (CSS variable or color value) |
| `strokeWidth`  | `number`  | `1`            | Stroke width (px)                    |
| `delayPerChar` | `number`  | `0.04`         | Per-character delay (seconds)        |
| `hoverEffect`  | `boolean` | `true`         | Enable hover effect                  |

---

### BreakpointGuard

A component that automatically unmounts/remounts page content when the viewport crosses breakpoint boundaries (768px, 1024px) to reinitialize GSAP ScrollTrigger, RAF-based animations, etc.

**Path**: `src/components/common/BreakpointGuard.tsx`

| PC | Tablet | Mobile |
|:---:|:---:|:---:|
| <img src="public/images/screenshots/pc/home-dark.png" width="100%" /> | <img src="public/images/screenshots/tablet/home-dark.png" width="100%" /> | <img src="public/images/screenshots/mobile/home-dark.png" width="100%" /> |

**Features**:

- Detects viewport width changes and classifies as `desktop` (>1024px) / `tablet` (768-1024px) / `mobile` (<768px)
- Remounts children via `key` prop on breakpoint change
- Providers (Theme, Language, Lenis) are placed above to maintain state

**Applied at**: `src/app/layout.tsx`

```tsx
// root layout.tsx
<ThemeProvider>
  <LanguageProvider>
    <LenisProvider>
      <Navigation /> {/* maintained */}
      <main>
        <BreakpointGuard>
          {" "}
          {/* remount on breakpoint change */}
          {children}
        </BreakpointGuard>
      </main>
    </LenisProvider>
  </LanguageProvider>
</ThemeProvider>
```

**Breakpoints**:

| Breakpoint | Range          | Description              |
| ---------- | -------------- | ------------------------ |
| `desktop`  | > 1024px       | Horizontal scroll layout |
| `tablet`   | 768px - 1024px | Vertical scroll, tablet spacing |
| `mobile`   | < 768px        | Vertical scroll, mobile spacing |

---

### Modal (Bottom Sheet)

A modal component that behaves as a bottom sheet pattern on mobile. Center dialog on desktop.

| PC (Desktop Dialog) | Tablet | Mobile (Bottom Sheet) |
|:---:|:---:|:---:|
| <img src="public/images/screenshots/pc/work-detail-dark.png" width="100%" alt="PC" /> | <img src="public/images/screenshots/tablet/work-detail-dark.png" width="100%" alt="Tablet" /> | <img src="public/images/screenshots/mobile/work-detail-dark.png" width="100%" alt="Mobile" /> |

**Path**: `src/components/ui/Modal.tsx`

**Mobile behavior**:

- Slides up from bottom (85vh height limit)
- **Handle drag down**: CSS `translate`-based dismiss (closes when threshold exceeds 100px)
- **Handle drag up**: Height-based fullscreen expansion
- Close button hidden — close via handle drag or overlay tap

**Technical decisions**:

- Uses CSS `translate` property for drag dismiss (independent from framer-motion's `transform`)
- framer-motion handles only enter/exit animations; drag is controlled via `--sheet-y` CSS variable
- Global single render in `ClientOverlays` (portal to body)

---

### PostArticleView

A set of **presentational components** that render a post's article. The public detail page (`posts/[slug]`) and the admin preview page **share the exact same components** — the preview matches the published view 1:1, and the duplicate/divergent preview implementation is gone (single source of truth).

**Path**: `src/components/posts/PostArticleView.tsx`

**Exports**:

- `PostArticleHeader` — DetailLayout `header` slot. metaRow (date · read time · views · edit / GitHub · Share · language toggle) · title · excerpt · tags · divider
- `PostArticleBody` — DetailLayout `children` slot body. Renders richtext / markdown plus interactions (code wrap toggle, image viewer, etc.)

**Features**:

- ko/en fallback is resolved by the caller and passed as `displayTitle / displayContent / displayExcerpt` — the component only receives display values
- richtext is pre-processed via `processRichtextHtml`; markdown uses `MarkdownRenderer`
- `isPreview` lets the caller exclude elements that need a saved DB record (likes/comments, etc.)
- `headerActionsLeft` injects preview-only actions (trash restore/purge, etc.) into the header
- `proseViewerRef` connects to the caller's `useProseImageViewer`

**Used by**: `src/app/posts/[slug]/PostDetailClient.tsx` (public detail) + `src/app/admin/(preview)/posts/preview/page.tsx` (preview)

---

### WorkArticleView

A set of **presentational components** that render a work (project) detail article. Like PostArticleView, the public detail (`works/[slug]`) and admin preview share the same components.

**Path**: `src/components/works/WorkArticleView.tsx`

**Exports**:

- `WorkArticleHeader` — DetailLayout `header` slot. meta (#number · team/solo badge · edit · language toggle) · title · description · actions (Visit/GitHub/Share) · info grid (Year/Category/Tech/Role) · AISummary
- `WorkArticleBody` — DetailLayout `children` slot. Body (richtext/markdown) · gallery + ImageViewer
- `WorkArticleTeam` — DetailLayout `afterContent` slot. Renders the team-member polaroid flip carousel at **full page width** (not the narrow content column)

**Features**:

- Takes a single `Project` shape — the preview reuses the same components by converting the editor form via `workFormToProject(form)` (`src/types/work.ts`)
- Holds richtext enhance / gallery & prose ImageViewer interactions internally
- `isPreview` excludes DB-dependent elements such as the edit link

**Used by**: `src/app/works/[slug]/WorkDetailClient.tsx` (public detail) + `src/app/admin/(preview)/works/preview/page.tsx` (preview)

---

### AdminNotFound

A reusable **centered "not found" state** shown when an admin edit/detail page can't find the item. Icon + message + back-to-list link.

**Path**: `src/components/admin/AdminNotFound/index.tsx`

**Props**:

| Prop        | Type     | Description           |
| ----------- | -------- | --------------------- |
| `title`     | `string` | Display message       |
| `backHref`  | `string` | Link back to the list |
| `backLabel` | `string` | Back button label     |

**Used by**: admin posts/works edit pages (`admin/(dashboard)/posts/[id]/edit`, `.../works/[id]/edit`)

---

### processRichtextHtml (util)

A **shared utility** for post-processing richtext HTML. All processing is centralized here so the detail page and preview **render the body identically**.

**Path**: `src/utils/processRichtextHtml.ts`

**Processing order**:

1. Inject heading ids (TOC anchors)
2. Convert iframe embed URLs
3. hljs syntax highlighting for code blocks (+ language class; mermaid left untouched)
4. Insert code wrap-toggle button labels
5. Inject `data-cursor="zoom"` hint on imgs (CursorTrail image viewer)

```ts
import { processRichtextHtml } from "@/utils/processRichtextHtml";

const html = processRichtextHtml(rawHtml, {
  codeScroll: t("common.codeScroll"),
  codeWrap: t("common.codeWrap"),
});
```

> Highlighting & button labels are applied at the **HTML string stage**, not via DOM mutation — so they don't disappear on re-render.

---

### EmojiPicker

A **shared picker** for emoji, icons, and custom images (overhauled). The value format is one of native emoji / `img:url` (custom upload) / `icon:id` (SVG icon).

**Path**: `src/components/ui/EmojiPicker/`

**Features**:

- **476 icons** extracted from lucide (`IconEntry.svg` inner-SVG field + `iconSvgInner` helper), new categories (weather / devices / food / health / tools / education / faces / maps / shapes, etc.)
- **Korean search** (`emojiKo.ts`) + emoji-mart metadata (English names/keywords, `emojiMeta.ts`) + emoji-name tooltip (shared Tooltip)
- Image **drag-and-drop upload**, inline styles → CSS module (`EmojiPicker.module.css`)

---

### RelatedChips

A **related-content chip list** of thumbnail + title + category. More toggle + a hover preview card.

**Path**: `src/components/ui/RelatedChips/`

**Features**:

- Bundles a `useHoverPreview` hook that surfaces a preview card on chip hover (`src/components/ui/RelatedChips/useHoverPreview.tsx`)
- Used to surface related series / related posts on detail pages

---

### ViewModeToggle

The Footer's **PC / mobile mode switch** toggle. Overrides the viewport meta.

**Path**: `src/components/layout/ViewModeToggle.tsx`

**Features**:

- The viewport override is only meaningful as "view PC version" on mobile, so it is **shown only on touch devices (`pointer:coarse`)**

---

### CoverBanner

The admin editor's **cover banner** component.

**Path**: `src/components/admin/CoverBanner/`

---

### FloatingBar

PlateEditor's **floating toolbar shown on block selection**. Closes on interaction with other blocks.

**Path**: `src/components/posts/plate/toolbars/FloatingBar.tsx`

---

### EditorTextInput

An **IME-safe shared primitive** for in-editor form inputs. `contentEditable=false` + commit-on-blur prevents Korean composition from breaking. (Shared by image caption · poll · tab inputs)

**Path**: `src/components/posts/plate/EditorTextInput.tsx`

---
