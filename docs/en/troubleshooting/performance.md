# Trouble Shooting: Performance

[← Index](../troubleshooting.md)

<details>
<summary><strong>18. Trimming the first load: removing third-party scripts and unused fonts</strong></summary>

**Symptom**: Lighthouse mobile Performance was 48. LCP was 17.1 s and TTI 18.2 s. After a first round of fixes the score stayed at 60 (LCP 7.3 s, TTI 13.7 s).

**Cause**: The first load carried resources it did not use.

1. reCAPTCHA v3's `GoogleReCaptchaProvider` wrapped the whole app, so the initial load fetched about 784 KB of JS.
2. The first round deferred reCAPTCHA until user interaction, but a 4-second timer fallback and a scroll trigger remained. Those conditions fired during the Lighthouse run, so the script was still downloaded.
3. Four font families that no CSS referenced (IBM Plex Mono, Bebas Neue, Cormorant Garamond, Abril Fatface) were registered with `next/font/google`. The default for `next/font`'s `preload` is `true`, so fonts loaded in the layout are downloaded even when no CSS uses them. Inter was also registered with the unused 800 and 900 weights.
4. After reCAPTCHA left the first load, its Google preconnects remained and triggered an "unused preconnect" warning.

**Fix**: The four unused font families were removed and Inter went from seven weights to five. The reCAPTCHA timer and scroll trigger were removed so that only deliberate interactions (click, touchstart, keydown) load it. The unused preconnects were deleted. This round took Performance from 60 to 98 and LCP from 7.3 s to 2.0 s, and cut page weight by 70%.

reCAPTCHA is now loaded only when the contact drawer opens. `RecaptchaProvider`'s `load()` inserts the script into the head, and when the drawer closes, `unload()` removes the script, its iframes and the badge.

**Conclusion**: A third-party script should load when its feature is actually used. A timer fallback also fires inside measurement tools, so it is not a good condition for lazy loading. Fonts registered with `next/font` are downloaded regardless of CSS references, so whether they are still used should be checked periodically.


</details>

<details>
<summary><strong>19. Main thread vs compositor: infinite animations and mousemove re-renders</strong></summary>

**Symptom**: On the home page, infinite animations and a mouse-reactive effect kept the main thread busy.

**Cause**: There were two sources.

1. The Hero ellipse rotation ran on Framer Motion, and the marquee track ran on GSAP with `repeat: -1`. Both compute values in JS on every frame, so they run on the main thread.
2. `useMagneticRepel` updated React state with `setMagneticOffsets()` on every `mousemove`. While the mouse moved, the whole `WorksSection` re-rendered up to 60 times a second.

**Fix**: The Hero ellipse and the marquee became CSS animations. A CSS animation that changes only `transform` runs on the compositor thread. `useMagneticRepel` now keeps target and current values in refs and writes `el.style.transform` directly in a requestAnimationFrame loop.

**Conclusion**: Simple infinite animations such as rotate and translate are more efficient as CSS animations than in JS. Updating React state on a high-frequency event like mousemove reconciles the component tree each time, so refs and direct DOM writes are the right pattern.


</details>

<details>
<summary><strong>20. Client-side image compression: shrinking before upload</strong></summary>

**Symptom**: Selected images were uploaded as originals. Smartphone photos (5–15 MB) failed against the 10 MB limit, and files under the limit were still sent larger than needed.

**Cause**: The upload function had no client-side compression step. The server rejecting oversized files was the only safeguard.

**Fix**: Images are compressed in the browser in stages before upload (`src/lib/compressImage.ts`).

1. SVG and GIF are skipped. Vectors and animations cannot be converted through Canvas.
2. Files already under the limit are skipped.
3. The image is converted to WebP (quality 0.85) with `canvas.toBlob`.
4. If it is still too large, the long edge is reduced to at most 2560 px.
5. If it is still too large, quality drops by 0.05 per attempt, down to 0.7.

The editor loads the compression module with a dynamic import, so the initial bundle size is unaffected.

**Conclusion**: Compressing images on the client before upload reduces both bandwidth and storage. The server's size check stays as the last safeguard.


</details>
