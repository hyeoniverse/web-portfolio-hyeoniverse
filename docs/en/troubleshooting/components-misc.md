# Trouble Shooting: Components · Misc

[← Index](../troubleshooting.md)

<details>
<summary><strong>63. Continuous input vs transitions: snap during the resize stream</strong></summary>

**Symptom**: In the PC layout, the navigation menu was pinned to the exact center of the viewport with `position: absolute; left: 50%; transform: translateX(-50%)`. When the right-hand button group (`navActions`: language, sound, theme, email, notifications, logout) grew longer, it overlapped the menu at some widths. Moving to a flex layout that centered the menu between the left and right areas fixed that, but the sliding indicator under the current link then lagged behind the menu while the window was being resized.

**Cause**:

1. Absolute centering in the viewport ignores the widths of the logo on the left and the button group on the right. When the two widths differ or the page padding shrinks, they overlap.
2. The indicator always had transitions on `left` and `width`. Each resize event set a new position, but the indicator moved slowly from the old value to the new one. The menu moved at once while the indicator trailed behind.

**Fix**:

1. `.navCenter` became `position: relative; flex: 1; justify-content: center`. The logo and the button group each take their own width, and the menu sits in the middle of the remaining space.
2. Changes are received from both the window `resize` event and a `ResizeObserver` (navCenter and nav). On a change, `indicatorInstant` becomes `true` and the indicator position updates, and 120ms after the last change it returns to `false`. While `indicatorInstant` is `true`, an inline `transition: "none"` makes the indicator jump straight to the new position.

```tsx
<span style={indicatorInstant ? { ...effStyle, transition: "none" } : effStyle} />
```

This is the indicator render in `Navigation.tsx`. When resizing ends, the transition used for hover and page navigation applies again.

**Conclusion**: When the left and right areas differ in width or change, `flex: 1; justify-content: center` expresses the intended "center" more accurately than absolute viewport centering. A CSS transition suits a single state change, not continuous input such as resize or scroll. Turn the transition off during continuous input and turn it back on when the input ends.


</details>

<details>
<summary><strong>64. Detecting glyph presence: width measurement and frozen paths</strong></summary>

**Symptom**: The logo symbol (✦) in the tab icon did not use the configured brand font and looked different on each device.

**Cause**: Two things combined. Browsers do not fetch web fonts when drawing tab icons, so the `font-family` name in the SVG falls back to a device font. The brand font (Instrument Serif) also has no U+2726 glyph (.notdef). The symbol in the site logo was actually being drawn by a system fallback font as well.

**Fix**: Only the symbols in use were extracted from a symbol font (Noto Sans Symbols 2) and embedded as a base64 module. The favicon route extracts the outline with opentype.js and draws it as a `<path>`. The page also loads the same font with `@font-face` and places it before generic names such as serif in the font stack. Placed after them, serif would apply first.

**Conclusion**: `document.fonts.check()` returns true even when a fallback font can draw the character, so it cannot detect whether a glyph exists. Which font drew the character was determined by rendering the same character with each font stack and comparing widths. Characters in places where web fonts do not apply, such as tab icons, must be drawn as paths to keep their shape.


</details>
