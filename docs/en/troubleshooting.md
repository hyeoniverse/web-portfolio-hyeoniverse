# Trouble Shooting

> A record of 88 problems hit during development, with causes and fixes. Every entry follows Problem → Cause → Solution → Insight, and titles lead with the technical concept involved. The ten that left principles worth carrying beyond this project form the Top 10.

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
12. Baseline initialization: a mismatched initial value always reads as changed
13. Autosave design: knowing when not to save
14. SSR inclusion: an overlay covering first paint must ship in the server HTML
15. Shared build output: dev and build sharing .next breaks live chunks
16. Soft delete and recoverability: restore requires non-destructive deletion
17. Optimistic restore and clock comparison: untrusted timestamps cause rollbacks
18. Schema types and sentinels: a not-yet-existing entity cannot be a uuid
19. Server cookies vs client navigation: full reload after auth state changes
20. Measuring external-service reliability: status codes, not console errors
21. Two representations in one column: interpretation must be shared by every consumer

## [Performance](troubleshooting/performance.md)

22. Deferring third-party scripts: taking reCAPTCHA off the initial load
23. Resource inventory: removing unused fonts and tuning the loading strategy
24. Main thread vs compositor: animation, re-renders and GPU memory
25. Client-side image compression: shrinking before upload

## [Layout · CSS](troubleshooting/layout-css.md)

26. Reserving space across locales: em-based min-height against layout shift
27. Breakpoint-only elements: hide them at the opposite breakpoint
28. Silent var() failure: an undefined token voids the declaration
29. Compositing layers and backdrop sampling: an ancestor transform kills the effect
30. Transition start values: final state on the mount frame means no transition
31. Blend compositing units: child exceptions require DOM separation
32. Independent grid containers: one row's min-width does not propagate
33. JS-assisted masonry: pixel tracks with measured spans
34. Detecting sticky anchoring: rootMargin must match the real top
35. Serialized inline styles: stored values beat your stylesheets
36. Specificity against global rules: compound selectors to save transitions
37. The scope of viewport meta: desktop browsers ignore width
38. :has() combinators define scope: enumerate the renderer's DOM shapes
39. Resets and revert: appearance alone will not revive native widgets
40. Atomic inline boxes: a chip cannot fragment across lines
41. Stacking contexts and backdrops: an isolated sibling cannot be blurred
42. space-between with a single child: the branch that overlaps fixed elements
43. Global defaults vs scoped variables: splitting strong color with a fallback

## [Plate Editor](troubleshooting/plate-editor.md)

44. Preserving inline flow: a div inside an inline void blocks the caret
45. Serialization round-trips: custom attributes survive only if encoded
46. Gesture disambiguation: when drag and resize share one element
47. z-index and hit testing: an overlay intercepting the pointer
48. Scroll container bounds: placement decisions for floating elements
49. Leaf blocks vs wrappers: finding the current block needs an upward walk
50. Referential integrity: delete orphan nodes in reverse order
51. Two intents in one click: separating navigate from edit
52. What the default defended: the cost of overriding selection affinity
53. Out of flow vs inside a paragraph: float images against inline voids
54. Inner scroll defeats sticky: replacing it with fixed plus a spacer
55. Isolating IME from the editor model: commit-on-blur inputs
56. Blocking native drag: it cannot coexist with pointer drags
57. IME composition vs re-renders: deferring state commits
58. Normalizing value types: numeric node values vs string options
59. History snapshots: undoing exactly one conversion

## [Markdown · Content Rendering](troubleshooting/content-rendering.md)

60. Finish before render: dangerouslySetInnerHTML vs post-hoc DOM mutation
61. Parser extension ordering: postprocess over custom renderers
62. Runtime conversion vs stored values: URLs that only play in the editor
63. DOM outside React: native listeners plus MutationObserver
64. Single-sourcing: preview and detail render the same component
65. Allowlists vs value checks: DOMPurify's two separate axes
66. Context the parser reads: markdown insertion is more than a string

## [Animation · Interaction](troubleshooting/animation-interaction.md)

67. The library's source of truth: read Lenis velocity inside its event
68. Inline transform conflicts: Framer Motion and CSS fight over one property
69. Infinite scroll math: modulo loops instead of teleports
70. Wrapping scroll position: cycle the position, not the clones
71. Viewport-dependent initialization: recompute via key remount
72. Occlusion vs start signals: animations running under the loader
73. State plus synchronous refs: resetting residue on mode switches
74. Placeholder sizing: the skeleton decides the first layout pass
75. Silent animation callbacks: equal values never fire
76. Enter/leave asymmetry: the limits of transition-delay
77. Pointer capture and hit areas: margin is not a hit area
78. Events pause during drag: bridging coordinates with dragover
79. The limits of HTML5 D&D: micro-reorders belong to pointer events
80. Deferred capture: keep clicks alive below a movement threshold
81. Axis-based wheel routing: a blanket prevent kills vertical scroll too
82. Events outside the library's contract: pair preventDefault with opt-out markers
83. What links give you for free: on canvas you rebuild all of it

## [Components · Misc](troubleshooting/components-misc.md)

84. Reading type definitions: clearTimeout accepts undefined, not null
85. Third-party DOM and z-index: manage stacking dynamically
86. Continuous input vs transitions: snap during the resize stream
87. Static data key collisions: duplicate keys signal duplicate data
88. Detecting glyph presence: width measurement and frozen paths
