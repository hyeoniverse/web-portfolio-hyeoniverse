# Trouble Shooting

> A record of 64 problems hit during development, with causes and fixes. Every entry follows Symptom → Cause → Fix → Conclusion, and titles lead with the technical concept involved. The ten that left principles worth carrying beyond this project form the Top 10.

## [Top 10 · Deep Dives into Root Causes](troubleshooting/top10.md)

1. Bundler downleveling: a regex that passes every test but dies only in the browser
2. CSS invalidation scope: global recalc from `:has(:hover)` with a universal descendant
3. Resource priority and streaming reveal: the serial gates that delay LCP
4. State signals over timelines: lift the transition cover on route commit
5. Static prerender lacks context: hydration mismatch from a path-less 404
6. Shorthand resets and specificity: a global transition erasing component transitions
7. Backdrop Root: why backdrop-filter and mix-blend-mode cannot feed each other
8. Write races and server reassignment: parallel PATCHes shuffling sort order
9. Designing fallback conditions: an empty result is not an unavailable source
10. Package resolution: optional peers must still be resolvable

## [Architecture · Data](troubleshooting/architecture-data.md)

11. React reconciliation: changing a component's type in place remounts the subtree
12. Autosave design: when not to save and when it is safe to restore
13. SSR inclusion: an overlay covering first paint must ship in the server HTML
14. Soft delete and recoverability: restore requires non-destructive deletion
15. Server cookies vs client navigation: full reload after auth state changes
16. Measuring external-service reliability: status codes, not console errors
17. Two representations in one column: interpretation must be shared by every consumer

## [Performance](troubleshooting/performance.md)

18. Trimming the first load: removing third-party scripts and unused fonts
19. Main thread vs compositor: infinite animations and mousemove re-renders
20. Client-side image compression: shrinking before upload

## [Layout · CSS](troubleshooting/layout-css.md)

21. Reserving space across locales: em-based min-height against layout shift
22. Silent var() failure: an undefined token voids the declaration
23. When backdrop-filter does not show: isolation, transforms and prefixes
24. Transition start values: final state on the mount frame means no transition
25. Blend compositing units: child exceptions require DOM separation
26. Independent grid containers: one row's min-width does not propagate
27. JS-assisted masonry: pixel tracks with measured spans
28. Detecting sticky anchoring: rootMargin must match the real top
29. Serialized inline styles: stored values beat your stylesheets
30. The scope of viewport meta: desktop browsers ignore width
31. Atomic inline boxes: a chip cannot fragment across lines
32. Global defaults vs scoped variables: splitting strong color with a fallback

## [Plate Editor](troubleshooting/plate-editor.md)

33. Preserving inline flow: a div inside an inline void blocks the caret
34. Serialization round-trips: custom attributes survive only if encoded
35. Gesture disambiguation: when drag and resize share one element
36. Scroll container bounds: placement decisions for floating elements
37. Leaf blocks vs wrappers: finding the current block needs an upward walk
38. Referential integrity: delete orphan nodes in reverse order
39. Two intents in one click: separating navigate from edit
40. What the default defended: the cost of overriding selection affinity
41. Out of flow vs inside a paragraph: float images against inline voids
42. Scroll event propagation: listen for nested scrolling in the capture phase
43. Protecting IME composition: inputs outside the editor model and deferred parent re-renders
44. Blocking native drag: it cannot coexist with pointer drags
45. Normalizing value types: numeric node values vs string options
46. History snapshots: undoing exactly one conversion

## [Markdown · Content Rendering](troubleshooting/content-rendering.md)

47. Finish before render: dangerouslySetInnerHTML vs post-hoc DOM mutation
48. Parser extension ordering: postprocess over custom renderers
49. Runtime conversion vs stored values: URLs that only play in the editor
50. DOM outside React: native listeners plus MutationObserver
51. Single-sourcing: preview and detail render the same component
52. Comment checklists: parser context, DOMPurify value checks and :has() match scope

## [Animation · Interaction](troubleshooting/animation-interaction.md)

53. The library's source of truth: read Lenis velocity inside its event
54. Wrapping scroll position: cycle the position, not the clones
55. Viewport-dependent initialization: recompute via key remount
56. State plus synchronous refs: resetting residue on mode switches
57. Enter/leave asymmetry: the limits of transition-delay and the hover area
58. Pointer capture and clicks: capture only after a drag has started
59. Events pause during drag: bridging coordinates with dragover
60. Axis-based wheel routing: a blanket prevent kills vertical scroll too
61. Events outside the library's contract: pair preventDefault with opt-out markers
62. What links give you for free: on canvas you rebuild all of it

## [Components · Misc](troubleshooting/components-misc.md)

63. Continuous input vs transitions: snap during the resize stream
64. Detecting glyph presence: width measurement and frozen paths
