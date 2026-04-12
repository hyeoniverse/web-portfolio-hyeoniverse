# Key Components

### StaggerText

A component that splits text into individual characters and applies sequential outline animation on hover.

**Path**: `src/components/effects/StaggerText`

<p align="center">
  <img src="public/docs/screenshots/pc/home-dark.png" width="100%" alt="Home — StaggerText" />
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
| <img src="public/docs/screenshots/pc/home-dark.png" width="100%" /> | <img src="public/docs/screenshots/tablet/home-dark.png" width="100%" /> | <img src="public/docs/screenshots/mobile/home-dark.png" width="100%" /> |

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
| <img src="public/docs/screenshots/pc/work-detail-dark.png" width="100%" alt="PC" /> | <img src="public/docs/screenshots/tablet/work-detail-dark.png" width="100%" alt="Tablet" /> | <img src="public/docs/screenshots/mobile/work-detail-dark.png" width="100%" alt="Mobile" /> |

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
