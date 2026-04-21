# Trouble Shooting

> Major issues encountered during development and their solutions.

<details>
<summary><strong>1. Lenis Scroll Velocity Effect Not Working</strong></summary>

<p align="center">
  <img src="public/docs/screenshots/pc/works-dark.png" width="100%" alt="Works — Scroll Velocity" />
</p>

#### Problem

Scroll speed-based parallax effect was not being applied to images in the Works section

#### Failed Attempts

1. **Direct wheel event detection**: Unstable and conflicted with Lenis
2. **RAF polling to calculate scroll delta**: Inaccurate velocity measurement
3. **Direct type assertion on Lenis velocity property**: Values not updated when accessed outside scroll events

#### Cause

- When calculating scroll position directly via RAF polling, the inter-frame delta is inconsistent, resulting in inaccurate velocity measurement
- Lenis internally calculates velocity and provides it as an instance property, but accurate values are only accessible within the scroll event handler

#### Solution

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

#### TL;DR

Lenis internally calculates velocity and provides it as an instance property, making it more accurate than manually calculating delta

---


</details>

<details>
<summary><strong>2. Framer Motion transform and CSS transform Conflict</strong></summary>

#### Problem

Using CSS `transform: translate(-50%, -50%)` for image centering caused Framer Motion's `y` property to stop working

#### Cause

- Framer Motion's `style={{ y }}` property generates an inline `transform: translateY()`
- When a CSS `transform` property is already set, Framer Motion's transform gets overwritten or conflicts

#### Solution

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

#### TL;DR

Framer Motion's style prop generates inline transform, so it must be used separately from CSS transform

---


</details>

<details>
<summary><strong>3. TypeScript useRef Type Error</strong></summary>

#### Problem

"Expected 1 arguments, but got 0" type error with `useRef<ReturnType<typeof setTimeout>>()`

#### Cause

- `useRef` requires an initial value as a mandatory parameter
- `ReturnType<typeof setTimeout>` does not include `null`, and `clearTimeout` does not accept `null`

#### Solution

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

#### TL;DR

`clearTimeout` accepts `undefined` but not `null`. Timer refs should be initialized with `undefined`

---


</details>

<details>
<summary><strong>4. GSAP ScrollTrigger Horizontal Infinite Scroll Implementation</strong></summary>

<p align="center">
  <img src="public/docs/screenshots/pc/works-dark.png" width="49%" alt="Works — Dark" />
  <img src="public/docs/screenshots/pc/works-light.png" width="49%" alt="Works — Light" />
</p>

#### Problem

Horizontal scroll on the Works page would scroll in reverse direction when reaching the end, not appearing as infinite scroll

#### Failed Attempts

1. **Scroll position teleport**: Moving to start via `window.scrollTo` on reaching end -> visible jump
2. **Separate Bridge section**: Adding Bridge as separate section -> disrupted flow by transitioning from horizontal to vertical scroll
3. **Lenis infinite + teleport**: Conflict when controlling both Lenis and ScrollTrigger simultaneously

#### Cause

- GSAP ScrollTrigger has a finite scroll range defined by the `end` property
- Directly changing scroll position creates a visible jump for users
- Horizontal scroll converts vertical scrolling to horizontal movement, so adding separate sections creates vertical scroll segments

#### Solution

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

#### TL;DR

A long scroll range + visual position loop approach provides a more natural infinite scroll experience than scroll position teleportation

---


</details>

<details>
<summary><strong>5. Lighthouse Performance Optimization — reCAPTCHA Lazy Loading</strong></summary>

<p align="center">
  <img src="public/docs/screenshots/pc/home-light.png" width="100%" alt="Home — Lighthouse" />
</p>

#### Problem

Lighthouse mobile Performance score of 48. LCP 17.1s, TTI 18.2s indicating severe performance degradation

#### Cause Analysis

Analysis of Lighthouse reports (Desktop/Mobile) revealed key bottlenecks:

1. **reCAPTCHA v3 immediate loading**: `GoogleReCaptchaProvider` wrapping the entire app downloads ~784KB JS on initial load. Main thread blocked for 280ms
2. **Missing preconnect**: Requests to Google domains start without prior connection -> 400ms delay
3. **Insufficient color contrast**: `#6b7280` on `#f8f6f0` (4.47:1, threshold 4.5:1), `#ff4f9d` on `#f8f6f0` (2.83:1)
4. **Accessibility**: Heading order skipped (h1 -> h3), aria-label and visible text mismatch

#### Solution

**1. reCAPTCHA Lazy Loading** — Biggest impact

Changed to load reCAPTCHA script only after user interaction (scroll/click/touch/keydown) or 4-second timeout:

```tsx
// ❌ Before - immediate load on app mount (784KB)
<GoogleReCaptchaProvider reCaptchaKey={siteKey}>
  {children}
</GoogleReCaptchaProvider>

// ✅ After - lazy load after user interaction
const [shouldLoad, setShouldLoad] = useState(false);

useEffect(() => {
  const load = () => setShouldLoad(true);
  const timer = setTimeout(load, 4000);
  const events = ["scroll", "click", "touchstart", "keydown"] as const;
  const handler = () => { load(); cleanup(); };
  // ...register event listeners (once: true, passive: true)
}, []);

if (!shouldLoad) return <>{children}</>;
return <GoogleReCaptchaProvider ...>{children}</GoogleReCaptchaProvider>;
```

**2. Preconnect Hints Added**

```html
<link rel="preconnect" href="https://www.google.com" />
<link rel="preconnect" href="https://www.gstatic.com" crossorigin="anonymous" />
```

**3. Color Contrast Fixes**

| Token                          | Before                               | After                         | Contrast Change       |
| ----------------------------- | ------------------------------------- | ------------------------------- | --------------- |
| `--color-neutral-600`         | `#6b7280`                             | `#656c79`                       | 4.47:1 -> ~4.9:1 |
| `--text-accent-secondary-alt` | `var(--color-accent-light)` (#ff4f9d) | `var(--color-accent)` (#d40063) | 2.83:1 -> ~4.8:1 |

**4. Accessibility Fixes**

- ServicesSection: `<h3>` -> `<h2>` to normalize heading order
- Language toggle: Include visible text ("KO"/"EN") in `aria-label`

#### TL;DR

- Excluding third-party scripts (reCAPTCHA, Analytics, etc.) from initial load and loading them after user interaction has a major impact on LCP/TTI
- Lighthouse results on dev server (Turbopack) are measured much lower than production due to unminified JS, devtools, etc.
- When using `mix-blend-mode: difference`, Lighthouse calculates contrast using pre-blend colors, which may differ from actual visual results

---


</details>

<details>
<summary><strong>6. reCAPTCHA Badge z-index Issue</strong></summary>

#### Problem

reCAPTCHA v3 badge was hidden behind the overlay when the Contact Drawer opened

#### Cause

- Contact Drawer backdrop is fixed positioned with `z-index: var(--z-overlay)` (40)
- The `.grecaptcha-badge` element injected by Google had a lower z-index than the backdrop

#### Solution

Dynamically set `z-index: 9999` on the badge when the drawer opens, remove when closed:

```tsx
badge.style.zIndex = isOpen ? "9999" : "";
```

#### TL;DR

DOM elements injected by third parties can have z-index conflicts with custom overlays/modals. z-index must be managed dynamically

---


</details>

<details>
<summary><strong>7. Advanced Lighthouse Performance Optimization — Unused Font Removal and Resource Reduction</strong></summary>

| PC | Tablet | Mobile |
|:---:|:---:|:---:|
| <img src="public/docs/screenshots/pc/home-light.png" width="100%" alt="Home PC" /> | <img src="public/docs/screenshots/tablet/home-light.png" width="100%" alt="Home Tablet" /> | <img src="public/docs/screenshots/mobile/home-light.png" width="100%" alt="Home Mobile" /> |
<sub>Optimization target: Home page — achieved Performance score of 98 across all 3 devices</sub>

#### Problem

After the first optimization pass, Lighthouse mobile Performance score was 60. LCP 7.3s, TTI 13.7s, page size 1,489KB, 63 network requests

#### Cause Analysis

Bottlenecks identified by measuring production build directly with Lighthouse CLI:

1. **4 unused fonts loaded**: IBM Plex Mono (5 weights), Bebas Neue, Cormorant Garamond (5 weights), Abril Fatface downloaded 12 font files despite not being referenced in CSS
2. **reCAPTCHA 4-second timer**: Lazy loading had a `setTimeout(4000)` fallback that still loaded ~740KB during Lighthouse tests
3. **scroll event trigger**: reCAPTCHA also responded to scroll events, loading prematurely
4. **font-display not set**: All fonts blocking rendering
5. **Unused preconnect**: Since reCAPTCHA was removed from initial load, Google domain preconnects triggered "unused" warnings
6. **Excessive Inter weights**: 7 weights (300-900), but 800 and 900 were unused

#### Solution

**1. Remove Unused Fonts** — Biggest impact

```tsx
// ❌ Before - 9 font families (19 font files)
import {
  IBM_Plex_Mono,
  Inter,
  Playfair_Display,
  JetBrains_Mono,
  Bebas_Neue,
  Space_Grotesk,
  Cormorant_Garamond,
  Abril_Fatface,
  Instrument_Serif,
} from "next/font/google";

// ✅ After - 5 font families (5 font files)
import {
  Inter,
  Playfair_Display,
  JetBrains_Mono,
  Space_Grotesk,
  Instrument_Serif,
} from "next/font/google";
```

Verification: Searched across all CSS for `var(--font-ibm-plex)`, `var(--font-bebas)`, `var(--font-cormorant)`, `var(--font-abril)` -> 0 results. Referenced in `useFontMorph.ts` but that component was not imported on any page

**2. Add font-display: swap**

```tsx
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"], // Removed 800, 900
  display: "swap", // Unblock font rendering
});
```

**3. Improved reCAPTCHA Loading Strategy**

```tsx
// ❌ Before - timer + scroll included
const timer = setTimeout(load, 4000); // Triggered during Lighthouse tests
const events = ["scroll", "click", "touchstart", "keydown"];

// ✅ After - intentional interactions only
const events = ["click", "touchstart", "keydown"]; // Removed timer/scroll
```

**4. Remove Unused Preconnect**

```html
<!-- ❌ Before - unused warning since reCAPTCHA removed from initial load -->
<link rel="preconnect" href="https://www.google.com" />
<link rel="preconnect" href="https://www.gstatic.com" crossorigin="anonymous" />

<!-- ✅ After - removed -->
```

#### Results (Lighthouse CLI, median of 3 measurements)

| Metric      | Before   | After       | Change          |
| ----------- | -------- | ----------- | ------------- |
| Performance | 60       | **98**      | **+38 points**     |
| FCP         | 2,573ms  | 1,979ms     | -594ms        |
| LCP         | 7,294ms  | **1,979ms** | **-5,315ms**  |
| TBT         | 430ms    | **0ms**     | -430ms        |
| CLS         | 0.012    | 0           | -0.012        |
| TTI         | 13,731ms | **1,979ms** | **-11,752ms** |
| Requests    | 63       | 28          | -35           |
| Page Size   | 1,489KB  | **449KB**   | **-70%**      |
| Font Files  | 19       | 5           | -14           |

#### TL;DR

- Fonts registered with `next/font/google` download font files even if unreferenced in CSS. Periodically verify actual usage
- Timer fallbacks in third-party lazy loading can be unintentionally triggered by performance measurement tools. Using only intentional interactions (click/touch/keydown) is safer
- `font-display: swap` is not the default in next/font and must be explicitly set

---


</details>

<details>
<summary><strong>8. Works Horizontal Gallery Bidirectional Infinite Scroll Wrapping</strong></summary>

#### Problem

In the Works page horizontal scroll gallery, projects were repeated 10 sets, but scrolling to the end showed a blank screen — not truly infinite scroll

#### Failed Attempts

1. **Increase set count**: More repeated sets led to excessive DOM nodes and performance degradation
2. **Teleport from end to start**: Visible scroll position jump

#### Cause

- With a finite number of repeated sets (10), ends exist in both directions
- In GSAP's requestAnimationFrame loop, scrollX keeps accumulating beyond the content range

#### Solution

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

#### TL;DR

Rather than increasing content duplication sets, wrapping the scroll position itself achieves truly infinite scroll without DOM overhead

---


</details>

<details>
<summary><strong>9. Layout Shift on Language Switch</strong></summary>

#### Problem

When switching between Korean and English in the Works intro section, the text area height changed causing slight layout movement

#### Cause

- Different text lengths between Korean and English cause different line break positions
- In a flex container with `justify-content: center`, child height changes redistribute space

#### Solution

Set `min-height` in `em` units (number of lines x line-height) to ensure consistent space for both languages

```css
/* Reserve min-height based on maximum line count */
.introDesc {
  min-height: 4.95em;
} /* 3 lines x 1.65 line-height */
.introDetail {
  min-height: 6.6em;
} /* 4 lines x 1.65 line-height */
.introQuote {
  min-height: 3.3em;
} /* 2 lines x 1.65 line-height */

/* Not needed on mobile since it uses vertical scroll */
@media (max-width: 768px) {
  .introDesc,
  .introDetail,
  .introQuote {
    min-height: auto;
  }
}
```

#### TL;DR

When supporting multiple languages, reserving space with `min-height` based on maximum line count prevents layout shift on language switch. Using `em` units automatically adapts to font-size changes

---


</details>

<details>
<summary><strong>10. Loading Screen Reappears on Language Switch</strong></summary>

<p align="center">
  <img src="public/docs/screenshots/pc/home-dark.png" width="100%" alt="Home — Loading Screen" />
</p>

#### Problem

The loading screen reappeared when switching language for the first time on a page. Second switch onwards worked normally

#### Cause

- `RecaptchaProvider` changes `shouldLoad` from `false` to `true` on the first click event
- The render tree changes from `<Fragment>{children}</Fragment>` to `<GoogleReCaptchaProvider>{children}</GoogleReCaptchaProvider>`
- React unmounts and remounts the entire subtree when the component type changes at the same position
- `useLoadingScreen()`'s `useState(true)` initial value causes the loading screen to reappear

#### Solution

Track initial loading completion with a module-level flag to skip the loading screen on remount

```tsx
// Module level: persists across component remounts
let hasCompletedInitialLoad = false;

export function useLoadingScreen() {
  // If session already completed loading on remount, start with false
  const [isLoading, setIsLoading] = useState(() => !hasCompletedInitialLoad);
  const hasCompletedRef = useRef(hasCompletedInitialLoad);

  const completeLoading = () => {
    hasCompletedRef.current = true;
    hasCompletedInitialLoad = true; // Sync module flag
    setIsLoading(false);
  };
}
```

#### TL;DR

Conditionally rendering a third-party Provider (`Fragment` <-> `Provider`) causes React to remount the subtree. State relying on `useState` initial values must be supplemented with module-level variables to be remount-safe

---


</details>

<details>
<summary><strong>11. GSAP ScrollTrigger Layout Breaks on Breakpoint Change</strong></summary>

| PC | Tablet | Mobile |
|:---:|:---:|:---:|
| <img src="public/docs/screenshots/pc/works-dark.png" width="100%" /> | <img src="public/docs/screenshots/tablet/works-dark.png" width="100%" /> | <img src="public/docs/screenshots/mobile/works-dark.png" width="100%" /> |

#### Problem

When resizing viewport between desktop, tablet, and mobile, GSAP ScrollTrigger pin, RAF counter-translation, and other animations remained fixed to the previous viewport dimensions, breaking the layout

#### Cause

- GSAP ScrollTrigger's `start`, `end`, and `pin` settings are calculated based on viewport size at creation time
- RAF-based counter-translation also operates based on the initial `extraWidth` value
- Existing instances do not auto-update when viewport size changes

#### Attempted Approaches

1. **Track breakpoint in individual components**: Resize listener + effect re-execution in each panel -> code duplication, some panels missed
2. **ScrollTrigger.refresh()**: Works in some cases, but cannot handle fundamental DOM structure changes like horizontal-to-vertical layout transitions

#### Solution

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

#### Side Effects and Solutions

- Video elements removed from DOM cause `play()` Promise to reject with AbortError -> Added `.catch(() => {})`
- All component `useState` initial values reset -> Supplemented with module-level flags (e.g., `hasCompletedInitialLoad`)

#### TL;DR

For animations that depend on viewport size at creation time (like GSAP ScrollTrigger), a full remount via React's `key` prop is more stable than partial updates with `ScrollTrigger.refresh()`. Placing Providers outside the remount scope enables page-level reinitialization without global state loss

---


</details>

<details>
<summary><strong>12. Project-wide Performance Optimization</strong></summary>

| PC | Tablet | Mobile |
|:---:|:---:|:---:|
| <img src="public/docs/screenshots/pc/home-dark.png" width="100%" /> | <img src="public/docs/screenshots/tablet/home-dark.png" width="100%" /> | <img src="public/docs/screenshots/mobile/home-dark.png" width="100%" /> |

#### Problem

Project performance audit revealed multiple optimization points: main thread animations, 60fps React re-renders, GPU memory leaks, unused resources, CSS conflicts

#### Cause Analysis

1. **Hero ellipse/marquee**: Framer Motion/GSAP infinite loop animations running as main thread RAF
2. **useMagneticRepel**: `setMagneticOffsets()` on every `mousemove` -> 60fps React state updates -> entire WorksSection re-renders
3. **Three.js**: `DoubleSide` rendering both faces, geometry not disposed on `isMobile` change (GPU memory leak)
4. **Unused resources**: paper.png (17MB), grain.png (5.2MB) unreferenced, 2 unused npm packages
5. **CSS conflicts**: `scroll-behavior: smooth` causing double smoothing with Lenis, `cursor: none` applying to touch devices
6. **useSoundManager**: Creating AudioContext + fetching typing.mp3 immediately on mount

#### Solution

```
1. Hero ellipse/marquee: Switched to CSS animation -> runs on compositor thread
2. useMagneticRepel: useState -> useRef + RAF loop + direct el.style.transform application
3. Three.js: DoubleSide -> FrontSide, geometry.dispose() in useEffect cleanup
4. Deleted unused images (-22.2MB), npm uninstall react-scroll-parallax react-google-recaptcha-v3
5. Removed scroll-behavior, restricted cursor:none to @media (pointer: fine)
6. Deferred AudioContext/typing.mp3 to first interaction
7. next.config: poweredByHeader: false, image formats: AVIF+WebP
8. Removed permanent will-change: transform (released GPU layers)
```

#### TL;DR

- For simple infinite loop animations (rotate, translateX), CSS animation is always more efficient than JS-based approaches — runs on the compositor thread without blocking the main thread
- Updating React state on high-frequency events (mousemove) triggers full component tree reconciliation per frame. ref + direct DOM manipulation is the appropriate pattern
- Geometry/material created with Three.js `useMemo` is subject to React's GC, but GPU buffers are not automatically released. Explicit `dispose()` is required


</details>

<details>
<summary><strong>13. Uncompressed Image Upload — Size Limit Failures + Network Waste</strong></summary>

#### Problem

Images were uploaded as-is without compression — smartphone photos (5–15MB) failed the 10MB limit, and files under the limit still wasted bandwidth with unnecessarily large originals

#### Cause

No client-side compression logic in the upload function — server-side size rejection was the only defense

#### Solution

Step-by-step compression pipeline runs in the browser before upload:

```
1. SVG/GIF → skip (vector/animation can't be Canvas-converted)
2. Under limit → skip
3. WebP conversion (canvas.toBlob, quality 0.85)
4. Resolution reduction (max 2560px on longest side)
5. Quality step-down (−0.05 per step, minimum 0.7)
```

The `compressImage()` utility is loaded via dynamic import to avoid affecting bundle size

#### TL;DR

Image compression is more effective on the client than the server — reduces size before transmission, saving both bandwidth and storage. WebP has lower compression ratios than AVIF but is 3–10× faster to encode in browsers with wider support, making it ideal for client-side processing

---


</details>

<details>
<summary><strong>14. Code Highlighting & Wrap Button Vanishing on Richtext Posts</strong></summary>

#### Problem

Code blocks in richtext posts written with the Plate editor lost syntax highlighting and the wrap/scroll toggle button. Markdown posts worked correctly

#### Cause

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

#### Solution

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

#### TL;DR

DOM manipulation on `dangerouslySetInnerHTML` content is erased on any state-triggered re-render. HTML must be **finalized before render (useMemo/server-side)**

---


</details>

<details>
<summary><strong>15. About Backend Panel — dbMobileList Visible on Desktop</strong></summary>

#### Problem

The mobile-only DB list (`dbMobileList`) in the About page's Backend panel was rendering on desktop viewports, breaking the layout

#### Cause

The `dbMobileList` element was missing a `display: none` media query for desktop breakpoints. It occupied DOM space and displayed on desktop even though it was intended for mobile only

#### Solution

CSS-only fix — added `display: none` at the desktop breakpoint so the element only renders on mobile

#### TL;DR

Responsive-only elements **must have `display: none` at the opposite breakpoint**. CSS media queries alone are often sufficient without JS branching

---


</details>

<details>
<summary><strong>16. About HeroPanel Pre-rendering Behind Loading Screen</strong></summary>

#### Problem

When entering the About page, HeroPanel content (text, animations) was already rendering and playing behind the loading screen, so the first impression after loading completed was not as intended

#### Cause

HeroPanel's entrance animations started immediately on component mount. The loading screen only covered the panel via `z-index`, while animations underneath had already played to completion

#### Solution

Added a `heroReady` class that is only applied after loading completes. HeroPanel's entrance animations and content visibility depend on this class, keeping the panel **visually inactive** until loading finishes

#### TL;DR

Content behind a loading screen **cannot be hidden by z-index alone**. Animation start timing must be tied to loading completion to guarantee the intended first impression

---


</details>

<details>
<summary><strong>17. Auto-save Initial Value Bug — Revision Created Without Any Edits</strong></summary>

#### Problem

Opening the editor without making any changes still showed 'Autosaved' after 30 seconds, and the next visit triggered a 'Load autosaved version?' prompt

#### Cause

The `lastAutoSaveJson` ref in `useEditorAutoSave` was initialized with an empty string (`""`). When the 30-second debounce fires, `JSON.stringify` of the current form is compared against `""` — always different, so **a revision was created even with zero changes**

```
lastAutoSaveJson.current = ""       // initial value
JSON.stringify(form)     = "{...}"  // current form
"" !== "{...}"           → detected as changed → revision saved ✗
```

#### Solution

Changed the initial value to `JSON.stringify(formRef.current)` so the first comparison matches the actual initial form state and skips saving

#### TL;DR

When a comparison ref is initialized with a value of a different type/shape than the actual data, **the first comparison always evaluates as 'changed'**. Initial values must reflect the real initial state

---

</details>

<details>
<summary><strong>18. Plate Editor Inline Image — Cannot Place Cursor or Type Text Next to Image</strong></summary>

#### Problem

Images in the Plate (Slate) editor were configured as inline void (`isInline: true, isVoid: true`), but it was **impossible to click to place the cursor or use arrow keys to navigate** beside the image, making text insertion impossible

#### Cause

Slate's normalization correctly inserts empty text nodes (zero-width spaces) around inline voids, but the ImageElement internally nested `<div>` elements (BlockDropZone + wrapper) inside an inline `<span>` (PlateElement). **`<div>` is a block element that breaks inline flow**, causing the browser to block cursor access to adjacent text nodes

```
❌ <span display="inline">          ← PlateElement (inline)
     <div>                          ← BlockDropZone (block!)
       <div contentEditable={false}> ← wrapper (block!)
         <div>                       ← hover container (block!)
           <img />
```

#### Solution

Created a separate rendering branch for `imgLayout === "inline"` that **converts all wrappers to `<span>`** and removes BlockDropZone. Also added absolute-positioned 6px-wide `InlineCursorTarget` components on each side of the image that **use `editor.api.before()`/`after()` to precisely place the cursor on click**

```
✅ <span display="inline">          ← PlateElement (inline)
     <span display="inline-block">  ← single wrapper (inline!)
       <InlineCursorTarget left />  ← click → cursor before
       <img />
       <InlineCursorTarget right /> ← click → cursor after
```

#### TL;DR

Placing `<div>` inside an inline void element **destroys the browser's inline flow**, preventing cursor placement in Slate's auto-inserted empty text nodes. Only inline tags like `<span>` should be used inside inline elements

---

</details>

<details>
<summary><strong>19. Global Theme Transition Overriding Component Animations</strong></summary>

#### Problem

A global CSS rule `html[data-theme-ready] * { transition: background-color, color ... }` was applied for smooth dark/light theme switching, but **component transitions using `max-height`, `opacity`, `transform` were all silently ignored** — editor toolbar collapse, toggle open, etc.

#### Cause

`transition` is a **shorthand property**, so `transition: background-color 0.3s` completely **overwrites** a component's `transition: max-height 0.3s, opacity 0.2s`. The global selector `html[attr] *` has specificity `(0,1,1)`, which beats CSS Module single-class selectors `(0,1,0)` every time

```css
/* Global (0,1,1) — wins */
html[data-theme-ready] * { transition: background-color 0.3s, color 0.3s; }

/* Component (0,1,0) — loses, max-height transition vanishes */
.toolbar { transition: max-height 0.3s ease; }
```

#### Solution

Changed the global transition to use a `data-theme-transitioning` attribute that is **only active during a 350ms window when the theme actually switches**. During normal operation, the global transition is inactive, so component transitions work as expected

```css
/* ✅ Only active during theme switch moment */
html[data-theme-transitioning] * {
  transition: background-color var(--duration-base) ease, ...;
}
```

#### TL;DR

CSS `transition` is a shorthand — specifying just a few properties globally **removes all other property transitions** from components. Use an attribute toggle (`data-theme-transitioning`) to activate only when needed instead of leaving it always-on

---

</details>

<details>
<summary><strong>20. Markdown Footnote Number Tangling — Heading Renderer vs marked-footnote Execution Order</strong></summary>

#### Problem

When using headings (`# Title`) and footnotes (`[^1]`) together in the markdown renderer, **footnote numbers got tangled or footnotes inside headings were not converted at all**

#### Cause

The custom heading renderer executed **before** the `marked-footnote` extension, consuming the raw `[^1]` text before it could be converted to a footnote. This left heading footnote references as plain text, and shifted the numbering for all remaining footnotes

```
# Title [^1]     ← heading renderer processes first → [^1] not converted
Body [^2]         ← should be [^1] but number shifted
```

#### Solution

Removed the heading renderer and replaced it with a `postprocess` hook. This ensures marked-footnote **processes all footnotes first**, then the postprocess hook adds `id` attributes to headings afterward. Additionally applied `keepLabels: true` to preserve user-specified footnote numbers (`[^2]` → 2) instead of auto-renumbering

#### TL;DR

When marked extensions and custom renderers target the same syntax, **execution order determines the result**. Using a postprocess hook instead of a renderer guarantees all extensions process first before any post-processing

---

</details>

<details>
<summary><strong>21. Editor Auto-save — Evolution from localStorage to DB Revisions</strong></summary>

#### Problem

The initial auto-save used `localStorage` directly, but multiple issues compounded:
1. **No cross-tab/device sharing** — localStorage is browser-local only
2. **Unnecessary saves on refresh** — "Auto-saved" appeared even without any changes
3. **Re-prompting after dismissing identical content** — same revision content kept triggering restore prompts

#### Cause

1. Inherent limitation of localStorage (browser-local storage)
2. `lastAutoSaveJson` ref initialized to `""` (empty string), so `JSON.stringify(form)` always differed
3. Dismissed revision snapshots weren't tracked, so identical content recreated in DB triggered re-prompts

#### Solution

**Improved in 3 stages:**
1. Completely removed localStorage, made **DB `revisions` table the sole storage** — enables cross-tab/device sharing
2. Set `lastAutoSaveJson` initial value to `JSON.stringify(formRef.current)` so **unchanged state skips saving**
3. Track dismissed revision snapshots in a `Set`, so **identical content doesn't re-prompt**

Additionally, page leave saves use `navigator.sendBeacon` (browser close) and `fetch({ keepalive: true })` (SPA routing) to **guarantee the final state is never lost**

#### TL;DR

Auto-save isn't just "save periodically" — the key challenge is **knowing when NOT to save**. Proper initial value comparison, duplicate detection, and dismissed tracking are all necessary to prevent unnecessary revision accumulation and UX confusion

---

</details>

<details>
<summary><strong>22. Column Block Styles Lost on Round-Trip — Metadata Dropped During richtext↔markdown Conversion</strong></summary>

#### Problem

2-column/3-column layout blocks lost **background color, dividers, and column ratios** when converting between richtext and markdown formats

#### Cause

Plate's Column nodes store custom attributes like `layout`, `columnBg`, `columnDivider`, but the HTML serializer had no rules to preserve this metadata. Standard HTML has no column layout concept, so simple `<div>` conversion **dropped all custom attributes**

#### Solution

Encode metadata as HTML comments during serialization, parse and restore during deserialization:

```html
<!-- columns 50,50 layout=side bg=var(--bg-tertiary) divider=solid -->
<div data-column-group data-layout="side" data-column-bg="...">
  <div data-column data-width="50%">...</div>
  <div data-column data-width="50%">...</div>
</div>
```

Dual encoding with `data-*` attributes and HTML comments ensures recovery even if comments are stripped

#### TL;DR

Editor-specific attributes not in standard HTML must be **explicitly encoded** during serialization for round-trip preservation. Dual storage via `data-*` attributes + HTML comments provides robustness

---

</details>

<details>
<summary><strong>23. YouTube/Vimeo Embed URL — Watch URL Fails to Load in iframe</strong></summary>

#### Problem

When users insert a YouTube video with a `youtube.com/watch?v=xxx` URL, it's stored as-is in `<iframe src="...">`. **Watch URLs cannot load in iframes**, showing a blank screen both in the editor preview and on the published post detail page

#### Cause

Inside the editor, `parseEmbed()` converts watch URLs to embed URLs so **the editor displays correctly**, but `plateSerializer` serializes the node's original `url` property (the watch URL) directly into `<iframe src="...">`. The **editor and serialized URLs diverge** in the database

```
Editor display: youtube.com/embed/xxx  (parseEmbed conversion) → plays OK
DB storage:     youtube.com/watch?v=xxx (raw original)          → iframe load fails
```

#### Solution

Created a `fixEmbedUrls()` utility that **bulk-converts iframe src watch/shorts URLs to embed URLs** just before HTML rendering. Applied to both the post detail page and preview page

```ts
// youtube.com/watch?v=xxx → youtube.com/embed/xxx
// youtu.be/xxx → youtube.com/embed/xxx
// vimeo.com/123 → player.vimeo.com/video/123
html.replace(/<iframe([^>]*)\ssrc="([^"]*)"([^>]*)>/gi, ...)
```

#### TL;DR

A URL mismatch between editor runtime conversion and serialization creates "works in editor but broken on the actual page" bugs. Adding a URL normalization post-processing step before rendering resolves this

---

</details>

<details>
<summary><strong>24. Custom Cursor Resize Mode — Cursor Rotates with Mouse Direction</strong></summary>

#### Problem

After applying custom cursors (↔, ↕, ⤡) to image/column resize handles, the cursor arrows rotated and distorted based on mouse movement direction

#### Cause

The CursorTrail animation loop calculated `angleRef` (rotation) and `scaleRef` (scale) based on mouse velocity. When entering resize mode, previous values persisted. Additionally, detecting resize via classList caused 1-2 frame delays due to React render timing

#### Solution

Added `cursorTypeRef` (synchronous ref) updated simultaneously with `setCursorType`. On resize mode entry, immediately reset `angleRef`/`scaleRef` to 0. The animation loop uses `cursorTypeRef.current` to detect resize mode and completely disables rotation/scale

---

</details>

<details>
<summary><strong>25. Image Resize Handle Click Deletes Image Instead</strong></summary>

#### Problem

Clicking an inline image's resize handle triggered image deletion (DnD drop) instead of resize

#### Cause

The inline image's `onPointerDown` handler initiates DnD drag, and clicks on resize handles were intercepted by this handler, processed as drag→drop

#### Solution

Added `closest("[data-cursor^='resize']")` check at the top of `onPointerDown` to disable DnD on resize handle clicks. Separated hitboxes and visual handles into independent sibling elements for independent positioning

---

</details>

<details>
<summary><strong>26. Image Caption Overlay Blocks Resize Hitbox Detection</strong></summary>

#### Problem

Mouse cursor didn't change to resize shape at the bottom resize hitbox area — the hitbox was not being detected

#### Cause

The caption overlay (`zIndex: 3`) rendered above the bottom resize hitbox (`zIndex: 2`), intercepting pointer events

#### Solution

Raised hitbox `zIndex` to 4-5 to position above the caption overlay. Extended hitboxes to cover the full image edge for intuitive Figma-style resize UX

---

</details>

<details>
<summary><strong>27. Tooltip Auto Placement — Ignores Scroll Container Boundary</strong></summary>

#### Problem

When displaying image Tooltip (size info) in the editor, if the image scrolls above the editor area, the Tooltip renders outside the editor or gets clipped

#### Cause

Tooltip's `auto` placement logic only checked viewport top (`rect.top < 60`), ignoring the editor's scroll container boundary

#### Solution

In the `measure()` function, traverse up from the trigger to find the nearest overflow parent (`overflow-y: auto|scroll|hidden`). If the distance between scroll container top and trigger top is less than 40px, switch to `bottom` placement

---

</details>

<details>
<summary><strong>28. Editor Toolbar Active State — Wrapper Block Detection Failure</strong></summary>

#### Problem

Placing cursor inside blockquote, code block, or table didn't activate the corresponding toolbar button

#### Cause

`useBlockInfo` hook uses `editor.api.block()` to get the nearest block, but child blocks inside wrapper blocks (`p`, `code_line`, etc.) are returned first, setting `blockType` to `"p"` or `"code_line"`

#### Solution

When `blockType` is `"p"` or `"code_line"`, use `editor.api.above()` to search for parent wrapper blocks. Iterate through `["blockquote", "code_block", "table"]` and update `blockType` when found

---

</details>

<details>
<summary><strong>29. Footnote Ref/Content Integrity — Orphan Nodes Remain After Partial Deletion</strong></summary>

#### Problem

Deleting a footnote reference (`footnote_ref`) leaves the footnote content (`footnote_content`) at the bottom, and vice versa. Orphan nodes are serialized and saved to the database

#### Cause

Footnote references and content are linked by `footnoteId`, but Plate's normalizeNode doesn't recognize this relationship, so deleting one side leaves the other intact

#### Solution

Separate `useEffect` with 300ms debounce scans all footnotes on editor change. Orphan nodes with unmatched `footnoteId` are deleted in reverse order to prevent path shift issues. Direct deletion inside `normalizeNode` caused `Cannot find a descendant at path` errors, hence the effect-based approach

---

</details>

<details>
<summary><strong>30. Link Click Immediately Navigates — Cannot Edit Links in Editor</strong></summary>

#### Problem

Clicking a link in the editor immediately opens a new tab, making it impossible to edit the link URL or text

#### Cause

`LinkElement`'s `onClick` directly called `window.open()`, preventing cursor placement inside the link

#### Solution

Single click → `e.preventDefault()` only, placing cursor inside the link and auto-showing the link edit toolbar. Double click → opens in new tab. To prevent flickering on link-to-link navigation, `currentLinkKey` (based on link path) distinguishes links, and a custom outside-click handler ignores editor content clicks instead of `useOutsideClick`

---

</details>

<details>
<summary><strong>31. Undefined CSS Token — Referenced in 11 Files but Never Declared</strong></summary>

#### Problem

The `--box-3xs-xs` token was used as `padding: var(--box-3xs-xs)` across 11 CSS files, but was never defined in `_spacing.css`, causing all those paddings to silently fail

#### Cause

During a CSS token audit, `padding: var(--spacing-3xs) var(--spacing-xs)` (2px 8px) was batch-replaced with the box shorthand `var(--box-3xs-xs)`, but the token definition was never added to the Compound block in `_spacing.css`. CSS `var()` silently invalidates declarations when undefined — **undetectable by build or typecheck**

#### Solution

Added `--box-3xs-xs: var(--spacing-3xs) var(--spacing-xs)` definition to `_spacing.css`. Future token replacements should follow a two-step verification: **grep for usage → confirm definition exists**

---

</details>

<details>
<summary><strong>32. LoadingScreen Not Included in SSR — Content Flash Before Loading</strong></summary>

#### Problem

Page content briefly appears before the loading screen (black backdrop) shows up

#### Cause

`LoadingScreen` was loaded inside `ClientOverlays` using `dynamic(() => import(...), { ssr: false })`, excluding it from the server HTML. The browser displayed page content immediately, and `LoadingScreen` only mounted after JS bundle load + React hydration

#### Solution

Changed `LoadingScreen` to a regular `import` so it's included in server HTML. Since `useLoadingScreen()` initializes with `isLoading: true`, the black backdrop renders at `opacity: 1` in the SSR output. Other overlays (Modal, CursorTrail, etc.) remain `ssr: false` as they don't need server rendering

---

</details>

---

<details>
<summary><strong>37. Plate Inline Code Arrow Key Cursor Jump</strong></summary>

**Problem**: When pressing ArrowLeft to move from the second to the first character inside an inline code (`<code>` mark), the cursor jumped to the previous text node

**Cause**: `CodePlugin.configure({ rules: { selection: { affinity: "directional" } } })` overrode Plate's default `"hard"`. `"hard"` affinity keeps the cursor inside mark boundaries, while `"directional"` delegates to browser default behavior, causing the cursor to jump outside the `<code>` element boundary

**Solution**: Removed the affinity override, using Plate's default (`"hard"`)

```ts
// Before
CodePlugin.configure({ rules: { selection: { affinity: "directional" } } }),

// After
CodePlugin,
```

</details>
