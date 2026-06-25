# Trouble Shooting

> Major issues encountered during development and their solutions.

<details>
<summary><strong>1. Lenis Scroll Velocity Effect Not Working</strong></summary>

<p align="center">
  <img src="public/images/screenshots/pc/works-dark.png" width="100%" alt="Works — Scroll Velocity" />
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
  <img src="public/images/screenshots/pc/works-dark.png" width="49%" alt="Works — Dark" />
  <img src="public/images/screenshots/pc/works-light.png" width="49%" alt="Works — Light" />
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
  <img src="public/images/screenshots/pc/home-light.png" width="100%" alt="Home — Lighthouse" />
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
| <img src="public/images/screenshots/pc/home-light.png" width="100%" alt="Home PC" /> | <img src="public/images/screenshots/tablet/home-light.png" width="100%" alt="Home Tablet" /> | <img src="public/images/screenshots/mobile/home-light.png" width="100%" alt="Home Mobile" /> |
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
  <img src="public/images/screenshots/pc/home-dark.png" width="100%" alt="Home — Loading Screen" />
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
| <img src="public/images/screenshots/pc/works-dark.png" width="100%" /> | <img src="public/images/screenshots/tablet/works-dark.png" width="100%" /> | <img src="public/images/screenshots/mobile/works-dark.png" width="100%" /> |

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
| <img src="public/images/screenshots/pc/home-dark.png" width="100%" /> | <img src="public/images/screenshots/tablet/home-dark.png" width="100%" /> | <img src="public/images/screenshots/mobile/home-dark.png" width="100%" /> |

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

---

<details>
<summary><strong>38. Admin Table Row Borders Cut Off Mid-Scroll on Mobile</strong></summary>

**Problem**: On mobile, horizontally scrolling admin/posts and admin/works tables caused row border-bottoms to stop mid-scroll instead of extending across the full scrollable width

**Cause**: `.colTitle { min-width: 280px }` was applied to guarantee a readable title column, but `.row` / `.tableHeader` / `.bulkBar` are each **independent CSS Grid containers**, so track expansion is computed per-row. Data rows had `col.className` applied, expanding the title track to 280px — but the header's title `<span>` had no className, leaving the 1fr track at its natural size. This created a **width mismatch: rows grew to 868px while header/bulkBar stayed at 720px**. On scroll, row borders drew out to 868px but header/bulkBar borders cut off at 720px

**Solution**: Two simultaneous fixes

1. **Apply `col.className` to header `<span>`** — so `.colTitle` applies to the header's title cell too, expanding the header title track to 280px
2. **Add `.tableInner` wrapper** inside the scroll container (`.table`, `.tableScroll`):

```css
.tableInner {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  width: max-content;
}
```

In a flex column, items auto-stretch on the cross-axis (horizontal), and `width: max-content` sizes the wrapper to the widest child's max-content (868px). **All rows/header/bulkBar align to the same 868px width**, so border-bottom extends continuously across the full scrollable area

**Key insight**: When each row is an independent grid container, **track expansion is computed per-row** — a `min-width` on one row's cell doesn't propagate to siblings. For continuous borders during horizontal scroll, every row must share the same total width. The `width: max-content + min-width: 100%` wrapper pattern enforces this by sizing to the widest child. Additionally, **className mismatches between row and header** (where `col.className` is applied to rows but omitted in headers) are a common source of width divergence

</details>

---

<details>
<summary><strong>39. Page transition stuck at hold + skeleton exposed after morph</strong></summary>

**Problem**: Navigating from a PostCard to a post detail, **the overlay morphed down to hero size and then never dismissed — it stayed in the hold phase forever**. Worse, immediately after the morph the `loading.tsx` skeleton was visible beneath the now-smaller overlay, producing the awkward sequence "image shrinks → skeleton lingers for a long time"

**Cause**: Two issues compounded

1. The original design auto-progressed `expand → morph (hero) → hold` and triggered dismissal via an `onAnimationStart` callback on the DetailLayout's hero `motion.div`. But with `initial={{ opacity: isTransitioning ? 1 : 0 }}` + `animate={{ opacity: 1 }}`, when `isTransitioning` was true both equaled `1` — framer-motion treats this as a no-op and **never fires onAnimationStart**, so the phase stayed at "hold" forever
2. The morph ran on a fixed timer (~1s after click), shrinking the overlay **before the new page was ready**. With the Suspense fallback (`loading.tsx`) underneath, the skeleton was exposed the moment the morph completed

**Solution**: Restructured the transition state machine

1. **Replaced the dismissal trigger** — removed the `onAnimationStart` dependency, added a `useEffect` in DetailLayout that calls `endTransition()` on mount
2. **Backdrop now stays fullscreen** — during the hold phase the backdrop covers the entire viewport, hiding the skeleton even after the overlay has morphed (previously the backdrop only filled the hero area)
3. **`SAFETY_MS = 5000` backstop** — PageTransitionProvider force-dismisses if `endTransition` isn't called for any reason
4. **`endRequestedRef` short-circuit** — for fast cached mounts, `endTransition` calls during expand/morph let the current phase finish and then jump straight to done, skipping hold

**Key insight**: ① **Animation lifecycle callbacks (`onAnimationStart`, `onAnimationComplete`) should not be the sole trigger for critical state transitions** — they can fail silently when initial equals animate (no-op cases), and behavior varies by library version and render timing. Always pair them with a useEffect-based fallback or a setTimeout safety net. ② When designing "morph-into-hero" transitions in a Suspense-aware environment, **always remember the visual contract: shrinking the overlay reveals what's beneath**. The only fixes are (a) **keep the backdrop covering the full viewport even after morph**, or (b) **defer morph until the new page mounts**

</details>

<details>
<summary><strong>40. Posts Bento — `grid-template-rows` alone leaves gaps when card heights vary</strong></summary>

**Problem**: The `/posts` bento mixes five variants — wide / banner (21:9) / square (1:1) / portrait (3:4) / standard. With plain CSS Grid, row tracks stretch to the tallest card in that row, leaving **empty cells** beside smaller cards. `grid-auto-flow: dense` alone can't backfill the leftover vertical space when card aspect ratios differ widely

**Cause**: `grid-template-rows: auto` (or any fixed ratio) sizes a row to the tallest child, so a square next to a portrait leaves dead space below the square equal to the height delta

**Solution**: Implement true masonry as a JS + CSS Grid hybrid

1. CSS — `grid-auto-rows: 1px` shreds row tracks to the pixel, plus `grid-auto-flow: dense` and `gap: var(--bento-gap)` only
2. JS — a `useEffect` measures every card's `firstElementChild.scrollHeight` → computes `span = ceil((h + gap) / (rowUnit + gap))` → assigns `style.gridRow = span ${span}`
3. Recalculate on `ResizeObserver(grid)` and image `onLoad` so font/image loads can't leave stale spans
4. On mobile (`<= 640px`), all variants flatten to a uniform 16:10 ratio and JS measurement is disabled

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 1px;
  grid-auto-flow: dense;
  gap: var(--bento-gap);
}
```

```ts
const recomputeRowSpans = () => {
  const grid = gridRef.current;
  if (!grid) return;
  const rowUnit = parseFloat(getComputedStyle(grid).gridAutoRows) || 1;
  const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
  itemRefs.current.forEach((el) => {
    const h = (el.firstElementChild as HTMLElement | null)?.scrollHeight ?? el.scrollHeight;
    const span = Math.max(1, Math.ceil((h + gap) / (rowUnit + gap)));
    el.style.gridRow = `span ${span}`;
  });
};
```

**Key insight**: CSS-only masonry is still experimental (`grid-template-rows: masonry` isn't shipped in Chrome). The de facto standard for gap-free packing is **shred row tracks to a fine pixel unit, then have JS assign spans from measured heights**. `firstElementChild.scrollHeight` is the most accurate source (immune to wrapper padding), and you must recompute on both image `onLoad` and `ResizeObserver` to correct heights captured before fonts/images settled

</details>

<details>
<summary><strong>41. Sticky filterBar IntersectionObserver — 1px drift against sidebar widgets</strong></summary>

**Problem**: `/posts` filterBar uses `position: sticky; top: var(--nav-height)`, but the sentinel's `rootMargin` was hard-coded (`-44px 0px 0px 0px`). When PC ↔ mobile nav heights differ or the filterBar grows from one row to two, the anchor moment falls out of sync — the bar visually overlaps Popular Posts by ~1px or leaves a hairline gap

**Cause**: `top` is dynamic (driven by a CSS variable), but `IntersectionObserver`'s `rootMargin` is set once at construction. When the filterBar height changed from 44px to 80px (added search row), the sentinel kept gating on the old offset

**Solution**: Sync `rootMargin` with the component's actual sticky `top`

1. Read `getComputedStyle(filterBar).top`, then set `rootMargin: -${stickyTop + 1}px 0px 0px 0px` (the +1px is a cross-frame safety margin)
2. On every `resize`, disconnect and rebuild the observer so nav-height changes are picked up
3. Updated the sibling sidebar's `top` to use the same arithmetic (`calc(var(--nav-height) + 80px + ...)`) so both elements share one anchor line

```ts
useEffect(() => {
  const setup = () => {
    const top = parseFloat(getComputedStyle(filterBarRef.current!).top) || 0;
    const observer = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting),
      { rootMargin: `-${top + 1}px 0px 0px 0px`, threshold: 0 });
    observer.observe(sentinelRef.current!);
    return () => observer.disconnect();
  };
  let cleanup = setup();
  const onResize = () => { cleanup(); cleanup = setup(); };
  window.addEventListener("resize", onResize);
  return () => { cleanup(); window.removeEventListener("resize", onResize); };
}, []);
```

**Key insight**: For a sticky element, the `IntersectionObserver` that detects "now stuck" must use a `rootMargin` that **matches the actual sticky top to the pixel**. When that top is dynamic (CSS variable / media query), the observer must rebuild alongside it — otherwise you get a viewport that looks correct but a 1px drift after `resize`

</details>

<details>
<summary><strong>42. Series Deck — hover unfold "disappears then reappears"</strong></summary>

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

**Key insight**: ① **CSS `transition-delay` staggers both enter AND leave.** Symmetric stagger is fine, but asymmetric "all leave at once + sequential enter" is hard to achieve in pure CSS — pair JS state with explicit timers when enter/leave timing must differ. ② "Hold then unfold" microinteractions read better when triggered by `setTimeout + state flip` than `transition-delay`, since cancellation is clean and the intent is explicit. ③ Overshoot easing makes microinteractions look "already started" — when the **stop → animate** moment must read clearly, standard ease is more appropriate

</details>

<details>
<summary><strong>43. Series Deck spread — `setPointerCapture` blocks child clicks + hit-area gaps cause flicker</strong></summary>

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

**Key insight**: ① `setPointerCapture` **is convenient for drag tracking but absorbs all child clicks**. If your component needs child-level clicks, prefer document-level pointer listeners + a distance-based click-suppression flag. ② **Margin moves visual position only — it doesn't extend the hit area.** To enlarge a hover region, use `padding-right` (with `box-sizing: content-box`) or an `::after` pseudo. content-box has too many layout side effects; pseudo is cleaner. ③ Multi-step hover interactions (deck unfold) are exquisitely sensitive — even a microsecond of hover loss between two layers causes flicker, so **define the hover region one step wider than the visual boundary**

</details>

<details>
<summary><strong>44. HTML5 drag suppresses `pointermove` — custom cursor freezes and its type keeps flickering mid-drag</strong></summary>

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

**Key insight**: While native HTML5 drag is active, pointer events are **suspended at the system level**. `dragover` can keep coordinates flowing, but unless you separately track drag-start and drag-end, your hit-test has no idea the user is mid-drag. For any cursor-state component that flips modes per hover, **freeze the mode on drag-start and release on drag-end via a ref-based lock** — otherwise the cursor's identity collapses into whatever the mouse passes over

</details>

<details>
<summary><strong>45. Working around HTML5 D&D quirks — replacing chip-reorder drag with pointer events</strong></summary>

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

**Key insight**: Native HTML5 D&D is optimized for "drag an image/file to another OS app" — **for in-page micro-reorder of chips or list items, the sum of its quirks is bigger than its convenience.** State-driven `draggable` toggling, source-unmount cancellation, child-click absorption (with `setPointerCapture`), front-to-back asymmetry — all fall out of the spec. **For micro-reorder UIs, write pointer-event drag from the start** — it ends up shorter and behaves consistently

</details>

<details>
<summary><strong>46. Navigation menu overlaps the right actions on narrow viewports + indicator drifts behind the menu while resizing</strong></summary>

**Problem**: On PC, the nav menu was pinned to viewport center with `position: absolute; left: 50%; transform: translateX(-50%)`. As `navActions` (lang / sound / theme / email / Bell / Logout) grew, there was a viewport range where the menu overlapped the right cluster. Switching to flex ("center between logo and actions") fixed the collision but introduced a new bug: the sliding indicator that highlights the active link lagged the menu by ~300ms during continuous resize because of its CSS transition, leaving a visible drift the whole time the user dragged the window edge

**Cause**:

1. Viewport-center pinning ignores left/right cluster widths — when one side grows or `--page-px` shrinks, collision is inevitable
2. After moving to flex, the lag came from `.navIndicator { transition: left var(--duration-moderate) ease, width ... }` being always-on. Every resize event pushes new left/width values, but the indicator eases from the previous value toward the new one — to the user, "the menu jumps to its new position, but the indicator drags ~300ms behind"

**Solution**:

1. **Layout** — `.navCenter` → `position: relative; flex: 1; justify-content: center`. Logo and actions occupy their natural widths, and the menu sits in the middle of the remaining space, with no overlap risk
2. **Make the indicator transition instant during resize** — listen on both `window resize` and `ResizeObserver(navCenter + nav)`. On every fire, `setIndicatorInstant(true)` + `updateIndicator()`, then a 120ms debounce sets it back to false. While instant, the indicator is rendered with `style={{ ...indicatorStyle, transition: "none" }}` so it snaps frame-by-frame to the new position; once resize ends, the normal hover/navigation transition is restored

```tsx
const [indicatorInstant, setIndicatorInstant] = useState(false);
useEffect(() => {
  let endTimer: ReturnType<typeof setTimeout> | null = null;
  const tick = () => {
    setIndicatorInstant(true);
    updateIndicator();
    if (endTimer) clearTimeout(endTimer);
    endTimer = setTimeout(() => setIndicatorInstant(false), 120);
  };
  const ro = new ResizeObserver(tick);
  ro.observe(navCenterRef.current!);
  if (navEl) ro.observe(navEl);
  window.addEventListener("resize", tick);
  // ...
}, [updateIndicator]);

// JSX
<span style={indicatorInstant ? { ...indicatorStyle, transition: "none" } : indicatorStyle} />
```

**Key insight**:

① **Absolute viewport-center has no idea what's to the left or right** — for asymmetric/dynamic clusters, `flex: 1; justify-content: center` expresses "between" precisely
② **CSS transitions fit single user intents, not continuous input streams** — during resize / scroll, disable the transition so the element snaps every frame, then re-enable it after the stream ends. An inline `transition: "none"` toggled by a debounced state is the lightest pattern that preserves "smooth" semantics for hover-driven changes

</details>

<details>
<summary><strong>47. Image fallback — React `onError` doesn't bind to `<img>` rendered via `dangerouslySetInnerHTML`</strong></summary>

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

**Key insight**:

① **DOM from `dangerouslySetInnerHTML` is React's synthetic-event blind spot** — without delegation, `addEventListener` is the only path
② Images that already finished loading (or failing) won't re-fire `error` retroactively — pair the listener attach with a synchronous `complete && naturalWidth === 0` check
③ Leaving `srcset` after a `src` swap lets the browser keep retrying the broken candidates — `removeAttribute("srcset")` together with the swap
④ For dynamic regions like richtext, a one-shot `querySelectorAll` won't catch images added later — pair it with a `MutationObserver` for incremental coverage

</details>

<details>
<summary><strong>48. Float images — independent block split + hidden empty line + blocking caret/click on the blank</strong></summary>

**Problem**: Wanted a float image that wraps with the body text while (1) dragging/selecting the neighboring text block leaves the image alone, (2) no empty line shows above/below the image, and (3) clicks/arrows never drop the caret onto an invisible blank — but the three goals conflicted.

**Cause**: CSS `float` pulls the image out of flow, but in Plate (Slate) the image is an inline void (`isInline: true, isVoid: true`) — it must live inside a paragraph with mandatory empty text (ZWSP) on both sides.

1. In the **same paragraph**, block drag moves image + text as one unit
2. Split into its **own paragraph** and the in-flow content is just a ZWSP line → renders as an empty line
3. Collapse that line (`line-height:0`) and the block becomes 0-height, breaking caret/handle; cover it with the next block and the now-invisible spot still catches clicks/arrows → caret flickers there

**Solution**: Fix across three layers — data, layout, input

1. **(Data) Independent block** — on every change, split mixed paragraphs with `splitNodes` so the image gets its own paragraph → drag/selection independent from text
2. **(Layout) Hide the empty line** — instead of collapsing the image block to 0-height, **pull the next block up by one line** (`margin-bottom: -1lh`). The image block stays intact so caret/handle render fine; give the float wrapper a `z-index` so the move handle isn't covered
3. **(Input) Block entry into the blank** — intercept click (mousedown) and arrows (keydown) in the **capture phase**; when the caret would land on the blank, select the image or jump to the adjacent block instead. Handled before Slate's default move → no flicker

**Key insight**:

① A CSS float (out of flow) and an inline void (forced in-paragraph text) fundamentally conflict — no single-spot fix works
② You don't *remove* the empty line — you **cover it with the next block** and **stop the caret from reaching it**
③ Letting Slate move the caret first and correcting afterward yields a 1-frame flicker → you must **pre-empt in the capture phase**
④ The inline void's mandatory ZWSP can't be deleted (normalize restores it), so making it **invisible + untouchable** is the pragmatic workaround

</details>

<details>
<summary><strong>49. Editor top bar won't pin with `position: sticky` — switched to `position: fixed`</strong></summary>

**Problem**: Tried to pin the editor's top bar (BackLink, save, revisions, etc.) at the top with `position: sticky`, but it never pinned — it scrolled away with the body content.

**Cause**: The editor body is an **inner scroll region** wrapped in `height: 60vh` + `data-lenis-prevent`, so the page (document) itself barely scrolls.

- `position: sticky` pins only **when the scroll container actually scrolls**, but wheeling inside the body leaves the page scroll position unchanged, so sticky never has a condition to fire
- Also, `scroll` events don't bubble, so a plain listener can't catch the nested body region's scroll

**Solution**: Drop sticky and control it directly with `position: fixed`

1. **(Pin) `position: fixed; top: var(--header-height)`** — always fixed right below the global Navigation. Collapse/expand via `transform: translateY()`
2. **(Reserve flow) `ResizeObserver` spacer** — fixed removes the bar from flow, so the body shifts up and gets covered; measure the top bar height with a `ResizeObserver` and reserve the space with a same-height `.topBarSpacer`
3. **(Detect scroll) capture-phase listener** — `window.addEventListener("scroll", onScroll, true)` listens in the capture phase; when the target is the document it's page scroll, when it's an `HTMLElement` it's nested body scroll. Both accumulate direction (delta) and toggle collapse/expand once a threshold (6px) is hit — slow scrolls still work as long as they sum in one direction

**Key insight**:

① `position: sticky` works only when there's an ancestor that **actually scrolls** — in an inner-scroll pattern (`60vh` + `lenis-prevent`) the page never moves, so sticky is meaningless
② `scroll` events **don't bubble** → to catch nested scroll regions with one listener you must listen in the **capture phase** (`useCapture=true`)
③ `fixed` removes the element from flow, so to avoid covering content you must **explicitly reserve** its height with a spacer (kept in sync via `ResizeObserver`)

</details>

<details>
<summary><strong>50. Card clicks inside HorizontalCarousel don't register — `setPointerCapture` steals the child click</strong></summary>

**Problem**: Clicking a team polaroid (flip) card inside the horizontal carousel didn't toggle it. The card had a working `onClick`, yet the event never reached it.

**Cause**: For mouse drag-scroll, the carousel called **`el.setPointerCapture()` immediately on `onPointerDown`**.

- Once the pointer is captured, all subsequent pointer events get redirected to the carousel, so the child card's `click` (a pointerdown→up pair) never reaches the card
- In other words, "capture to drag" also swallowed the "tap/click"

**Solution**: Defer the capture **from pointerdown to the moment a real drag begins**

1. `onPointerDown` only records the start coords (`active: true`) — no capture
2. `onPointerMove` calls `setPointerCapture()` + sets `data-cursor="grab"` only **once the move exceeds 4px** → judged a real drag
3. Release under 4px and no capture happens, so `click` propagates to the child normally. `onClickCapture` swallows the click only when the `moved` flag is set, blocking the unintended click at the end of a drag

**Key insight**:

① Calling `setPointerCapture` straight on pointerdown **removes any chance to distinguish click from drag** — the capture takes the child's events wholesale
② "Don't capture until the move exceeds a threshold (4px)" is the standard pattern for letting click and drag coexist (same cause/fix as TagCloud3D and Series Deck)

</details>

<details>
<summary><strong>51. Editor preview drifts from the published detail layout — extracted shared Article view components</strong></summary>

**Problem**: The admin editor's preview kept subtly diverging from the actual published detail page — in layout, spacing, and code-block handling.

**Cause**: The preview was a **separate, simplified version** built apart from the detail page.

- Every time the detail markup/styles changed, the preview had to be matched separately; fix one side and it drifted — the same screen implemented twice
- richtext handling (code highlighting, embeds, heading ids) ran through different code paths too, so the output differed

**Solution**: Extract the detail page's article view into **shared presentation components** so detail and preview render the same component

1. `PostArticleView` / `WorkArticleView` export `Header` / `Body` / `Team` → `PostDetailClient`/`WorkDetailClient` (detail) and `posts/preview`/`works/preview` (preview) use the **same components**. Only chrome absent from preview (comments, back link) is added on the detail side
2. richtext HTML processing is shared in one place, `src/utils/processRichtextHtml.ts` — both paths run the identical order: heading id injection → embed URL fix → hljs highlighting → wrap-toggle label → img `data-cursor="zoom"` → identical down to the code blocks

**Key insight**:

① A "preview" that differs from the real screen has no value as a preview — the moment you keep a simplified version separate, the **two screens silently drift**
② The fix isn't synchronization but a **single source**: if you need identical output, make both use the same component and the same processing function, so a one-side-only change becomes structurally impossible

</details>

<details>
<summary><strong>52. Float images stick to the text on the detail page (zero gap)</strong></summary>

**Problem**: A float image wrapped beside the body text rendered **flush against the adjacent text with no gap** on the detail page.

**Cause**: plateSerializer saved the float figure with **inline-style `margin:0`**, like `style="float:left;margin:0"`.

- With zero horizontal margin, the text clung to the image
- And **inline styles win on specificity**, so a generic CSS rule like `.prose figure` couldn't override it

**Solution**: Fix the serialized value itself, and also force it via CSS `!important`

1. `plateSerializer.ts` — change the float figure's serialized margin to `0 24px 24px 0` (left) / `0 0 24px 24px` (right). Side/bottom spacing is applied at the serialization step
2. `PostDetail.module.css` / `WorkDetail.module.css` — force side/bottom spacing (`--spacing-lg`) with `margin: ... !important` on `.prose figure[style*="float:left"]` / `.sectionProse figure[style*="float:right"]`. This applies the gap consistently **even to old content saved with `margin:0`** (covering it regardless of the serialized value)

**Key insight**:

① When serialization bakes in an inline style, that value **outranks external CSS** and is hard to override later — putting the right value in at the serialization step is the first line of defense
② To also cover already-broken legacy data, add a second line of defense: an attribute selector (`[style*="float"]`) + `!important` to **neutralize the inline value**

</details>
