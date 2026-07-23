<div align="center">

English | **[한국어](./README.md)**

# Arc — Where Growth Takes Shape

A personal portfolio website built with Next.js 16, React 19, and TypeScript, featuring interactive animations powered by GSAP, Framer Motion, and Lenis.

[![License](https://img.shields.io/badge/license-PolyForm%20NC%201.0-d40063?style=flat-square)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)

**[Live Demo →](https://your-domain.vercel.app)** _(URL will be updated after deployment)_

<br />

<img src="public/images/screenshots/pc/home-dark.png" alt="Home — Dark" width="100%" />

</div>

---

## Preview

### Dark / Light Theme

| Dark | Light |
|:---:|:---:|
| <img src="public/images/screenshots/pc/home-dark.png" alt="Home Dark" width="100%" /> | <img src="public/images/screenshots/pc/home-light.png" alt="Home Light" width="100%" /> |
| <img src="public/images/screenshots/pc/works-dark.png" alt="Works Dark" width="100%" /> | <img src="public/images/screenshots/pc/works-light.png" alt="Works Light" width="100%" /> |
| <img src="public/images/screenshots/pc/posts-dark.png" alt="Posts Dark" width="100%" /> | <img src="public/images/screenshots/pc/posts-light.png" alt="Posts Light" width="100%" /> |

<details>
<summary><strong>See more — Profile / About / Work Detail / Post Detail / Design System</strong></summary>

| Dark | Light |
|:---:|:---:|
| <img src="public/images/screenshots/pc/profile-dark.png" alt="Profile Dark" width="100%" /> | <img src="public/images/screenshots/pc/profile-light.png" alt="Profile Light" width="100%" /> |
| <img src="public/images/screenshots/pc/about-dark.png" alt="About Dark" width="100%" /> | <img src="public/images/screenshots/pc/about-light.png" alt="About Light" width="100%" /> |
| <img src="public/images/screenshots/pc/work-detail-dark.png" alt="Work Detail Dark" width="100%" /> | <img src="public/images/screenshots/pc/work-detail-light.png" alt="Work Detail Light" width="100%" /> |
| <img src="public/images/screenshots/pc/post-detail-dark.png" alt="Post Detail Dark" width="100%" /> | <img src="public/images/screenshots/pc/post-detail-light.png" alt="Post Detail Light" width="100%" /> |
| <img src="public/images/screenshots/pc/design-system-dark.png" alt="Design System Dark" width="100%" /> | <img src="public/images/screenshots/pc/design-system-light.png" alt="Design System Light" width="100%" /> |

</details>

### Works — 6 Layouts

Switchable via `?layout=` query (or Admin settings) — Flow (default) · Fullscreen · Cinematic · Grid · Split · Cylinder

| Flow | Fullscreen | Cinematic |
|:---:|:---:|:---:|
| <img src="public/images/screenshots/pc/works-dark.png" alt="Works Flow" width="100%" /> | <img src="public/images/screenshots/pc/works-fullscreen-dark.png" alt="Works Fullscreen" width="100%" /> | <img src="public/images/screenshots/pc/works-cinematic-dark.png" alt="Works Cinematic" width="100%" /> |

| Grid | Split | Cylinder |
|:---:|:---:|:---:|
| <img src="public/images/screenshots/pc/works-grid-dark.png" alt="Works Grid" width="100%" /> | <img src="public/images/screenshots/pc/works-split-dark.png" alt="Works Split" width="100%" /> | <img src="public/images/screenshots/pc/works-cylinder-dark.png" alt="Works Cylinder" width="100%" /> |

### Responsive — PC / Tablet / Mobile

| PC (1440px) | Tablet (768px) | Mobile (390px) |
|:---:|:---:|:---:|
| <img src="public/images/screenshots/pc/home-dark.png" alt="Home PC" width="100%" /> | <img src="public/images/screenshots/tablet/home-dark.png" alt="Home Tablet" width="100%" /> | <img src="public/images/screenshots/mobile/home-dark.png" alt="Home Mobile" width="100%" /> |
| <img src="public/images/screenshots/pc/works-dark.png" alt="Works PC" width="100%" /> | <img src="public/images/screenshots/tablet/works-dark.png" alt="Works Tablet" width="100%" /> | <img src="public/images/screenshots/mobile/works-dark.png" alt="Works Mobile" width="100%" /> |
| <img src="public/images/screenshots/pc/posts-dark.png" alt="Posts PC" width="100%" /> | <img src="public/images/screenshots/tablet/posts-dark.png" alt="Posts Tablet" width="100%" /> | <img src="public/images/screenshots/mobile/posts-dark.png" alt="Posts Mobile" width="100%" /> |

---

## At a Glance

| Area | Highlights |
|:---|:---|
| **Interaction** | Infinite scroll loop, mouse parallax, StaggerText, Three.js 3D coffee cup + latte art, directional scroll cascade |
| **Works** | 6 layouts (Flow · Fullscreen · Cinematic · Grid · Split · Cylinder) |
| **Blog** | SSR + ISR, series, banner slider, 6 list layouts, guest comments (markdown + emoji reactions) or switch to giscus |
| **Admin** | Plate.js editor (calendar · diagram · code playground blocks), `.md` sync + export, AI translation/summary, revision history, optimistic concurrency control, GitHub OAuth login + member management (email invites · owner/editor/author roles) |
| **Performance** | Lighthouse 98 — LCP 1.9s, 449KB (-70%), atomic counters + AbortController + bulk Promise.all |
| **Security** | RLS + service-role gate, PostgREST `.or()` injection escape, view IP·date dedup, CSRF Origin check (production fail-closed), middleware admin multi-layer gate, 5-fails lockout + new-device email approval + sign-out all devices, role-based access control (app_metadata) + OAuth callback authorization gate + cross-tab logout |
| **Design System** | 4-tier tokens (Raw → Semantic → Component → Context) + live preview, **all color tokens migrated to OKLCH** (precise culori conversion, perceptually uniform brightness across hues) |

---

## Tech Stack

| Category | Technology |
|:---|:---|
| Framework | ![Next.js](https://img.shields.io/badge/Next.js_16-000?style=flat-square&logo=nextdotjs&logoColor=white) (App Router, Turbopack) |
| Language | ![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white) |
| UI | ![React](https://img.shields.io/badge/React_19-61dafb?style=flat-square&logo=react&logoColor=black) |
| Styling | ![CSS Modules](https://img.shields.io/badge/CSS_Modules-1572b6?style=flat-square&logo=css3&logoColor=white) + CSS Variables |
| Animation | ![Framer Motion](https://img.shields.io/badge/Framer_Motion-e846ff?style=flat-square&logo=framer&logoColor=white) ![GSAP](https://img.shields.io/badge/GSAP-88ce02?style=flat-square&logo=greensock&logoColor=black) ![Lenis](https://img.shields.io/badge/Lenis-000?style=flat-square) |
| 3D | ![Three.js](https://img.shields.io/badge/Three.js-000?style=flat-square&logo=threedotjs&logoColor=white) ![R3F](https://img.shields.io/badge/React_Three_Fiber-000?style=flat-square&logo=threedotjs) ![Drei](https://img.shields.io/badge/Drei-000?style=flat-square) |
| Typography | Instrument Serif, Space Grotesk, JetBrains Mono (30+ presets per category + direct Google Fonts input in admin settings) |
| Backend | ![Supabase](https://img.shields.io/badge/Supabase-3ecf8e?style=flat-square&logo=supabase&logoColor=white) (PostgreSQL, Auth, Storage) |
| Editor | ![Plate.js](https://img.shields.io/badge/Plate.js-1a1a2e?style=flat-square) (Slate-based WYSIWYG) + Markdown |
| Editor Blocks | ![React Flow](https://img.shields.io/badge/@xyflow/react-ff0072?style=flat-square) (editor diagrams · About ERD) ![Sandpack](https://img.shields.io/badge/Sandpack-000?style=flat-square) (React/TS playground) ![CodeMirror](https://img.shields.io/badge/CodeMirror_6-D30707?style=flat-square) (About ERD SQL editor — autocomplete · search · diagnostics) ![KaTeX](https://img.shields.io/badge/KaTeX-329894?style=flat-square) (math) + Prettier (code formatting, lazy-loaded) |
| Comments | Built-in system (marked + isomorphic-dompurify) or ![giscus](https://img.shields.io/badge/giscus-000?style=flat-square) (GitHub Discussions) — switchable from Admin |
| AI Image | NanoBanana / Hugging Face (priority-based fallback chain) |

## Key Features

### Animation & Interaction

- **Infinite Scroll Loop**: Lenis smooth scroll + Bridge Section-based infinite circular scrolling — **default OFF**, opt-in. Previously every page called `setInfinite(false)` on mount and restored `(true)` on unmount, so the loop briefly turned on during navigation and produced unintended jumps. Inverted the pattern: only `HomeClient` calls `setInfinite(true)` on mount; every other route stays at the safe default of `false`
- **Mouse Parallax**: Mouse-responsive parallax based on Framer Motion useSpring/useTransform
- **Scroll-Triggered Animations**: Scroll-based entrance animations using GSAP ScrollTrigger
- **Scroll Velocity Parallax**: Image parallax linked to scroll speed via Lenis velocity (Works image scaled to 160% to prevent gaps when translating inside the circular mask)
- **Directional Scroll Cascade**: Services items cascade by scroll direction — item0 leads on up-scroll, item3 leads on down-scroll, velocity-based overlap with hard stop at top/bottom borders
- **Hero Oval Spread**: Top oval group spreads as you accumulate upward scroll distance, bottom oval group spreads based on downward scroll (independent per-direction spread)
- **StaggerText**: Sequential per-character outline animation on hover; the actual rendered text color is captured via JS at mouse-enter so the stroke dynamically matches color changes (theme, hover, etc.)
- **CTA 3D Coffee**: Three.js (R3F) ceramic coffee cup — LatheGeometry curved profile, mouse-tracked rotation, Canvas 2D parametric heart latte art (cream↔coffee wave + blur veins) + brown halo + contact shadow disc
- **Glass Hover Buttons**: CTA contact/resume buttons reveal the coffee canvas through a backdrop-filter blur on hover (resolved a Chrome compositing limitation by swapping the entrance transform to a layout-based `marginTop`)
- **3D Scroll Torus**: Three.js (R3F) 3D metallic torus — Lissajous curve path rotation, theme-specific materials, mobile touch repulsion interaction

<p align="center">
  <img src="public/images/screenshots/pc/home-dark.png" width="49%" alt="Home — Dark" />
  <img src="public/images/screenshots/pc/home-light.png" width="49%" alt="Home — Light" />
</p>

### Works Gallery

- **6 Layout Options**: Switchable via Admin settings or `?layout=` query parameter — Flow (default horizontal scroll) · Fullscreen (background crossfade) · Cinematic (parallax cinema) · Grid (bento grid) · Split (left meta + right scroll) · Cylinder (Three.js 3D cylinder)
- **Layout UX redesign**: Four layouts unified around video intros + stronger interaction. **Fullscreen** — video background + 4-corner live HUD (LOC/TIME/WORKS/STACK with clock + FPS) + scroll-driven title morph (CSS `animation-timeline: view()`) + DOM-duplication seamless infinite wrap. **Split** — video fills the screen as a fixed background, only the right panel gets `backdrop-filter: blur(40px)` for frosted glass; text goes white with accent color on emphasis (category label, number watermark, oversized quote mark). **Grid** — old design retired, reused About Key Features' `DynamicFrameLayout` as the bento base (100vw·100vh, gap 0). Intro cell + 1–6 project cells fill a 12×12 grid with adaptive positions and zero gaps. Title+subtitle always visible / hover reveals desc+tech, with `mix-blend-mode: difference` + `clamp()` font sizes + image hover blur + dimmed gradient. **Cylinder** — the 3D mesh itself is the click target (R3F `onClick`), `data-more` toggles on mesh hover so CursorTrail shows the "More" cursor, and the intro texture matches `--bg-primary` (via a `getComputedStyle` chain resolve)
- **DynamicFrameLayout — bento span support**: `defaultPos.w/h` translates into `gridColumn/Row: span N` so arbitrary cell sizes work on a 12-grid. About Key Features and Works Grid share the same component
- **Intro video, externally hosted**: `siteConfig.works.introVideoUrl` accepts an external CDN URL (shared by Fullscreen / Split / Grid). Empty falls back to local `/public/intro-bg.mp4` — but the local file is gitignored to dodge GitHub's 100MB push limit
- **Flow Layout**: GSAP-based horizontal scroll gallery — bidirectional infinite wrapping, mouse 3D tilt, image hover zoom, staggered metadata reveal
- **Cylinder Layout**: Three.js vertical cylinder rotation + HTML overlay, cosmic-themed intro + bouncing bunny character
- **Cylinder Responsive**: Camera auto-retreats based on viewport size, tilt disabled on tablet/mobile, scroll-driven title slide-in reveal (CSS variable `--reveal` + clip-path mask)
- **Cylinder Meta Separation**: mix-blend-mode: difference applied only to title/category; description, details (year/role/tech marquee), and CTA are separated into a sibling overlay for consistent white text
- **Floating Comments**: Recent work comments float in the intro slot with RAF-based physics, clicking navigates to the work with transition effect
- **Breakpoint Guard**: Cylinder layout responds to resize in real-time without reload; other layouts auto-remount on breakpoint transitions

<p align="center">
  <img src="public/images/screenshots/pc/works-dark.png" width="49%" alt="Works — Dark" />
  <img src="public/images/screenshots/pc/works-light.png" width="49%" alt="Works — Light" />
</p>

### Blog System

- **Posts (Blog)**: Supabase-based blog system — SSR + ISR caching, Markdown/Rich Text toggle editor, search/tag filters, view count tracking, GitHub link
- **Posts subnav (`PostsSubnav`)**: An All / Series / Tags / History capsule subnav unifies entry into the `/posts` sub-indexes
- **6 list layouts**: Switched via `siteConfig.posts.layout` (Admin settings) — magazine (default, bento masonry) · grid · list · compact · masonry · featured. This is a **site-wide setting, not per post**, and the size variants (wide/banner/square/portrait) plus JS row-span packing apply only to magazine. `/posts/history` is timeline-only
- **2-level category tree**: Moved from a flat list to a 2-level tree (Development > Frontend/Backend/DevOps, Learning > Algorithms/CS, Insights/Retrospective/Life/Etc). Only the leaf is stored and the parent is derived via `src/lib/categoryTree.ts` — zero DB migration. Supports **multi-select categories** (OR, `?category=a,b`) plus a `facets` sidebar
- **Multiple authors / members**: Authors (members) now live in Supabase `app_metadata` with roles (owner/editor/author), are added by email invite (the `author_invites` table), and are managed in the Settings → Account tab. Authentication is GitHub OAuth, and the owner is bootstrapped from `OWNER_EMAIL`. `posts.author_ids text[]` remains the per-post author linkage
- **Series**: Group posts into series for sequential publishing — `/series` page removed; series now live inside `/posts` as a timeline (numbered step + vertical connector) revealed after a category filter, with previous/next navigation on detail pages
- **Series Deck Cards**: Horizontal-scroll row — hovering a card waits 800ms then unfolds a deck of up to 4 preview layers in 0.4s staggered sequence (transform-based stack offset, JS-state timer instead of CSS `transition-delay` to avoid snap perception). The unfolded deck pushes the next card right and uses an `::after` pseudo to extend the hit area, eliminating flicker between layers. **If the unfolded deck overflows the horizontal scroll container, an rAF loop directly increments `scrollLeft` per frame** — the card's `margin-right` grows via CSS transition, so `scrollWidth` keeps growing too; a single `scrollBy({ behavior: "smooth" })` would clamp to the small initial `maxScrollLeft`. After auto-scroll ends, `card.matches(":hover")` is checked once more — if the cursor truly left, the deck closes (defending against false-positive `mouseleave` from the card sliding out from under a stationary cursor)
- **Series Auto Cover**: Series with neither a cover nor any post cover get a single Unsplash image fetched at SSR time and persisted permanently in `series.auto_cover_url` — zero external calls on subsequent loads
- **Posts Banner Slider**: Display pinned posts as banners — 4 layouts x 4 overlays x 2 transition modes, selectable from Admin. The left/right arrow buttons carry `data-cursor="prev"` / `"next"` — new `next` / `prev` variants in CursorTrail's `CursorType` surface a "Prev" / "Next" custom cursor label on hover
- **Posts Filter Bar**: Category collapse/expand (+N more), hover indicator (layoutId), sticky + scroll direction detection, content blur effect — sticky-anchor timing is synced to the component's actual `top` value via `getComputedStyle`, so the IntersectionObserver `rootMargin` matches to the pixel and never drifts past sidebar widgets like Popular Posts
- **Posts Bento Masonry**: 3/4/6-column CSS Grid + `grid-auto-rows: 1px` + JS-measured `grid-row: span N` per card (computed from `firstElementChild.scrollHeight`) for true masonry. Five variants — wide / banner (21:9) / square (1:1) / portrait (3:4) / standard — pack with `grid-auto-flow: dense`. Mobile flattens to a uniform 16:10. **PC (4·6col) gap-minimization template re-ordering** — banner (21:9, the shortest) goes early in the cycle so subsequent standards can dense-backfill, wide (2col 16:10) and portrait (1col 3:4) are placed in the same row since their heights match, and standard density is increased (5 per cycle) while square is reduced to 1 — flattening the average-height variance for stable packing
- **Sidebar widget hover (PopularPosts/RecentComments)**: List items shift right on hover with `translateX(var(--spacing-2xs))` — compound selector `(0,2,0)` defeats the global theme transition `(0,1,1)` (transform isn't covered by the global rule, so a single-class selector can't override it)
- **Posts Sort Capsule**: 3-way capsule (Latest · Popular · Title) each with a direction toggle (↑/↓), plus a separate Shuffle button for randomization. Direction arrow tweens via `transform: rotate`, hover indicator uses Framer Motion `layoutId`, `white-space: nowrap` keeps the arrow from line-wrapping. Random sort uses a mulberry32 seeded shuffle so pagination stays consistent across page hops
- **Popular sort sub-options**: When Popular is active, an adjacent SegmentedControl (Overall / Views / Comments / Likes) appears — API branches on `sort=views|likes|comments` (`comments` joins then sorts server-side in JS). The HOT badge, admin delete protection, and 90-day trash TTL all read from the same `src/lib/popularity.ts` (`scoreOf({view, like, comments})` + `getPopularPostIds(limit=5)`), so PostsClient · admin · trash purge stay synchronized
- **RandomPosts sidebar widget**: New sidebar widget — `/api/posts?sort=random&seed=` + a Shuffle button (180° rotate on hover) reshuffles instantly
- **TagCloud3D label + drag cursor**: Added a Tags icon to the label + `data-cursor="grab"` while rotating, integrating with CursorTrail
- **Posts Tooltip-everywhere**: Every filter / sort / tag / category trigger and SearchCapsule wears a `<T>` component + Tooltip combining translation + description (long-hover 600ms reveals the opposite-language label and a short hint, mobile via touch toggle)
- **SearchCapsule shared component**: Moved from `components/admin/SearchCapsule` to `components/ui/SearchCapsule`, with `searchType` made optional and padding slimmed (`var(--spacing-2xs) var(--spacing-sm)`) to match the tag/sort capsules. PostsClient and `/admin/comments` inline search inputs were swapped over
- **Seeded Color Generator (OKLCH)**: `src/utils/seededColor.ts` — FNV-1a hash + **12 hue anchors** (orange / amber / yellow / lime / green / teal / cyan / sky / blue / purple / magenta / pink — all excluding the brand accent hue 0–30°) × **5 tone presets** (vivid / pastel / muted / deep / soft) = **60 deterministic OKLCH combinations**. Same seed always returns the same color; adjacent cards cycle both anchor and tone for guaranteed visual separation. **Migrated from HSL to OKLCH** — equal lightness yields equal perceived brightness regardless of hue, so all hues sit at a consistent tone. Each anchor declares a `safeChroma` so vivid colors never break sRGB. Optional `tone` prop unifies the tone across a page (e.g. SeriesCard locks tone but lets hue stay random)
- **PostCard meta i18n**: Date uses `language === "ko" ? ko-KR : en-US` formatting, min read / views / likes use translation keys, Eye/Heart icons display with always-visible counts (zero included), `metaGroup` spans group meta items so wrapping happens in coherent units
- **PostCard hides separators on wrapped meta**: When a narrow card forces the meta row onto two lines, the wrapped group's leading `::before` separator (`·`) used to float awkwardly at the start of the new line. `useLayoutEffect` compares each metaGroup's `offsetTop` against the first group's and tags wrapped groups with `data-meta-wrapped` so CSS hides their `::before`. A `ResizeObserver` re-runs the check whenever card width changes
- **IP-based Likes**: Single `likes` table with `target_type` discrimination for Posts/Works/comments, IP-based UNIQUE constraint to prevent duplicates, rapid-click prevention (ref lock + busy disabled), formatCount (1k/1.2m) number abbreviation
- **Comment System**: Guest threaded replies — dual authentication (commenter_hash + bcrypt), nickname shuffle, email reply notifications, admin comments, admin tombstone double-delete for permanent removal, nickname-preserved tombstone
- **Comment provider switch (built-in / giscus)**: Flip `comments.provider` between `system` and `giscus` in the Admin Services tab. With giscus, entering just the repository (`owner/name`) lets `GET /api/admin/giscus-repo` **auto-resolve the repoId + Discussion categories** through the GitHub GraphQL API (`GITHUB_TOKEN`) — no separate trip to giscus.app. Supports mapping / reactions / strict / lazyLoading / input position / theme (preset name or custom CSS URL). `DetailLayout` switches to giscus only when `provider === "giscus" && repo is filled`, **falling back to the built-in comments if the repo is empty**. The widget is injected dynamically via `giscus.app/client.js` (iframe) and theme changes go over postMessage. Turning on giscus reactions automatically hides the site's own like button. Data lives in GitHub Discussions, so no DB is involved
- **Comment emoji reactions**: The old comment "like" is fully replaced by a giscus-style **fixed set of 8** reactions (👍👎😄🎉😕❤️🚀👀). Popover picker with optimistic updates and rollback on failure, sorted by reaction count. `GET /api/comment-reactions` batches the tally + the viewer's own reactions; `POST` toggles. Reactors are identified not by a raw IP but by the first 32 chars of `sha256(IP + ":" + UA)` (`reactor_hash`)
- **Comment markdown editor**: Write/preview tabs + a 14-button formatting toolbar in 4 groups (text / block / list / insert — bold·italic·strikethrough·inline code / heading·quote·code block / list·numbered list·checkbox / link·image·table·divider), with a markdown cheat-sheet help popover at the end of the toolbar. `marked` (gfm + breaks) → `isomorphic-dompurify` sanitize, forcing `nofollow noopener` on links and `loading=lazy` on images, allowing only http(s)/mailto schemes. **Images are external URLs only, with no upload** — a deliberate choice to avoid granting anonymous users Storage write access (the approach GitHub originally took). Integrates with ImageViewer; long comments clamp behind the shared `Collapsible` (520px) with a show-more toggle. Code blocks get **Prism highlighting** plus a language label, copy, and wrap-toggle bar (the language is inferred heuristically when unspecified). Prism isn't a preference but a necessity — highlight.js breaks once the bundler expands its Unicode property escapes (troubleshooting #75)
- **RecentComments preview**: `stripMarkdown.ts` strips markdown syntax so the sidebar shows a 2-line clamped plain-text preview
- **First Comment Celebration**: Confetti effect + card flip celebration message (sparkle stars + accent lines) on first comment, admin select-all / drag selection / tombstone bulk permanent deletion
- **Comment Reporting**: Per-comment report button + reason modal — reports accumulate into the "Reports" tab of `/admin/notifications` for inline resolve / dismiss / permanent delete
- **Posts Tags Suite**: ① **TagCloud3D** — 3D rotating word cloud in the Posts sidebar, Fibonacci-sphere distribution + an rAF loop that updates DOM transforms directly (zero React re-render per frame), hover pauses auto-rotation while drag rotates manually, click navigates to `/posts/tags/[tag]` (`setPointerCapture` was removed because it absorbed child `<Link>` clicks; drag-after-threshold clicks are blocked via document-level pointer listeners). ② `/posts/tags` index — all-tags grid + infinite scroll + search + admin-only quick link to tag settings. ③ `/posts/tags/[tag]` detail — server-side fetch, infinite scroll OFF (Lenis `setInfinite(false)`), top/bottom search bars (420px cap), shared `Pagination`, related-tags tooltip on the label. ④ Shared `Chip` component (`src/components/ui/Chip/Chip.tsx`) unifying the visual across all tags pages — DraggableTag / TagPill / TagNotesEditor chips were absorbed into it
- **Posts grid fluid columns**: The bento masonry switched from fixed 3/4/6 col to `auto-fit minmax(220px, 1fr)` — column count flexes with viewport while card width stays in the 220–300px sweet spot, keeping wide/banner (2-col span) cards at a stable absolute width too. Mobile branches to an explicit 2-col (`grid-template-columns: 1fr 1fr`) so the grid never shatters into too-narrow tiles
- **Posts skeleton vs dim hybrid loading**: Initial page load renders skeletons whose heights match each card variant (wide/banner/square/portrait/standard) — zero layout shift when real cards mount. Refetches with cards already on screen (page change, filter change, sort change) keep the existing cards in place and just dim them (`opacity: 0.5 + pointer-events: none`) to avoid the screen jumping. A top-of-list indeterminate progress bar handles the "we are loading" signal separately
- **Posts multi-tag selection**: `activeTag` (single string) → `activeTags` (`Set<string>`). Clicking a tag chip toggles add/remove, URL serializes to `?tags=a,b,c`. Filter bar gained an "All tags →" link to `/posts/tags`, unifying three entry points: sidebar tag cloud, in-place multi-select, and the full index page
- **Posts tag dropdown search model rewrite**: Dropped the previous "40-at-a-time `IntersectionObserver` pagination" in favor of a **shared `SearchCapsule` input + 70vh cap + bidirectional mask fade + wheel fallback guard**. Search matches **both the tag name and its description**, so a keyword like "Three.js" surfaces relevant tags even when it isn't in the name. Top/bottom `mask-image` linear-gradient fades produce a "there's more" affordance. When the dropdown's inner wheel hits an edge, it no longer falls back to scrolling the page — fixing the long-standing "scroll bleed" quirk. Removing infinite scroll also stops hover-prefetch and related affordances from getting stuck on tags that aren't on screen
- **Posts layout polish**: On mobile the search input goes 100% width, the `select` is capped at `max-width: 12ch` (long category/tag names no longer balloon the select horizontally), and the top row holds just `sort SegmentedControl + search` while the second row carries `filter + perPage` — visually identical tone to the new admin filter bar pattern
- **Posts sidebar — Tags moved to top + linkable label**: Reordered sidebar widgets so Tags (TagCloud3D) sits first. The widget label itself is now a `<Link>` to `/posts/tags` with a `ChevronRight` arrow — there's now an explicit way to reach the tag index alongside the cloud's drag/click interaction
- **`/posts/tags` redesign — tag cloud + index hybrid**: ① **Sort SegmentedControl** (Popular / Title) — Popular sorts by post count desc, Title runs Korean → English → `#`. ② **Alphabet index** — Korean consonants (with double-consonants folded into their base: ㄱ←ㄱㄲ, etc.) + A–Z + numeric/symbol `#`; clicking jumps to that group. ③ **Count-based font size** — linearly interpolates between 12px and 22px per tag (`fontSize = 12 + (count/maxCount) * 10`) for a true tag-cloud silhouette. ④ **Top-8 emphasis** — the eight most-used tags additionally get a light accent background so they're visible at a glance. ⑤ **Related-tag halo glow on hover** — hovering a pill makes its co-occurrence top 5 (tags that appear together in posts) accent-glow simultaneously, surfacing the "what does this tag travel with?" relationship instantly. ⑥ **Touch devices — bottom sheet** — for `pointer:coarse` inputs, all hover interactions are turned off and tapping a pill slides up a bottom sheet showing the description + related pills + an explicit "View posts for this tag" CTA (ESC / backdrop / X to close, `body { overflow: hidden }` locks scroll). ⑦ Tag-manage button → shared `Button`; header padding/margin compacted
- **`lib/posts.ts` `getAllTagsData` — co-occurrence pre-compute**: Walks every post's `tags[]` once and builds a **pair-frequency map**; for each tag, the top-5 most-frequently-co-occurring tags get returned in a `related[]` array. `/posts/tags` runs this at SSR time exactly once and ships it to the client — every hover thereafter is a cache lookup, not a recompute. Final shape per tag: `{ name, count, description, related: [{ name, count }] }`
- **`/posts/series` & `/posts/categories` index pages — unified to the `/posts/tags` pattern**: Same shape across all three indexes: sort SegmentedControl + search + featured top 3 + card grid + bottom sheet on touch. ① **`getAllSeriesData` / `getAllCategoriesData`** (`lib/posts.ts`) precompute post counts, category, and first-post cover in one SSR pass. ② Admin-only "manage" button surfaces at the top when logged in. ③ Search matches title/description (series) or category name (categories). ④ On touch devices, pill tap opens a bottom sheet with description + CTA
- **SeriesCard — deck navigation, tilt, and long-press arrows**: ① **Deck click → page transition to the actual post** — passes either `preview.cover_image` or the auto-seeded `layerBg` color into `navigateWithTransition(href, image, rect, color?)`, so even cover-less posts get a solid-color block morphing to the hero. Clicking the cover thumb / label still triggers the series filter. ② **Active series tilt** — the active thumb rotates by `-2.5deg` instead of using a heavy glow. ③ **Side arrows on the series row + long-press accel scroll** — RAF loop accelerates `scrollLeft` the longer you hold; hit area extended into the left/right mask regions vertically full-height; hover applies `data-cursor="prev"/"next"` custom cursors. ④ **Series-only search capsule** — closed by default, click expands as a morph (notify-capsule pattern), with title / content / both toggle. ⑤ **Active series meta panel** — when a series is selected, the header line shows its description + post count + an X-clear button. ⑥ **`getInitialPostsData` post_count fix** — SSR series objects were missing `post_count`, which made the deck silently disappear (`Math.min(undefined ?? 0, 4) = 0`). One `reduce` over the existing `previewPosts` query restores it without an extra DB hit
- **SegmentedControl — nested/inline sub variant unified**: Previously main sort buttons + popular sub menu were two separate inline JSX implementations. Now a single component handles both via `SegmentedControlItem<T, S>` with optional `subItems` and `subVariant: "nested" | "inline"`. ① **Nested** (default) — when the active main has subItems, the other main items collapse and the row becomes [back chevron + active main label (`Button variant="primary"`) + vertical divider + sub SegmentedControl]; the outer `motion.div + layout` spring-morphs between main↔nested. ② **Inline** — main + chevron + sub on the same row. Clicking the active main label calls `onBack` to toggle out. PostsClient's popular group adopts this and drops ~70 lines of inline JSX
- **HorizontalCarousel — extracted shared component**: Horizontal scrollers everywhere — overflow-x scroll + scroll-snap + scrollbar hidden + ResizeObserver tracks `scrollWidth > clientWidth` exposed as `data-scrollable`. ① **Edge masks** with linear-gradient fade, hidden when scroll position reaches that edge. ② **Arrow buttons** (`Button variant="difference"` for auto contrast over any background) — holding for 220 ms switches a `requestAnimationFrame` loop that accelerates the scroll (long-press scroll). ③ **Mouse drag scroll** via pointerdown/move/up + `setPointerCapture`; if drag > 4 px, clicks are captured and prevented (so cards don't navigate by accident). ④ **Wheel vertical → horizontal redirect** with pass-through at both ends (friendly to Windows wheel users). ⑤ **`data-cursor="grab"` is set dynamically during drag** so CursorTrail shows the "Drag" label. relatedSection and the series row both swap over to this
- **Button — `difference` variant**: `mix-blend-mode: difference` + `backdrop-filter: blur(8px)` on hover. Transparent, no border. Used for carousel arrows / image overlays where the background varies — readability is automatic. Bonus: the button branch now also spreads rest props (the link branch already did) so `data-*` / `aria-*` attributes pass through
- **Like button — water-wave fill animation**: lucide `<Heart>` replaced by inline SVG (`<defs><clipPath id={useId}>` over the Heart path + `<g clipPath>` containing 3 layered paths — back / mid / front). ① **Rise** — 6-step keyframes (0/20/40/60/80/100 %) where the path's surface y climbs while cubic bezier control points toggle peak/valley → ripples upward as the level rises. The final frame equals the `.likeBtnActive` resting `d`, so there's no jump. ② **Wave** — modern CSS `d` interpolation between two `path()` values to keep the surface oscillating after rise. The 3 layers use different durations and opacities (0.45 / 0.7 / 0.95) for depth. ③ **Drain** runs the reverse on unlike. ④ DetailLayout wraps `useLikeToggle`'s busy state with a **2 s minimum** so the animation plays through even when the API responds in 200 ms. ⑤ `useLikeToggle` itself drops the in-flight guard and uses `AbortController` for **Optimistic UI (last-write-wins)** — fast toggles allowed, button never goes disabled (SNS standard)
- **`posts.series_order` auto-normalize trigger**: Edge cases where `series_order` ended up non-sequential / duplicated / not starting at 0 (post deletion, moves between series outside the admin reorder UI) are now enforced at the DB layer. ① `normalize_series_order(p_series_id)` RPC sorts the series's posts by `series_order ASC, created_at ASC, id ASC` and re-numbers them 0-based (only updating rows that need to change). ② `AFTER INSERT OR UPDATE OF series_id, series_order OR DELETE ON posts` runs the normalize on both NEW and OLD series. ③ `pg_trigger_depth() > 1` skips re-entry, so the trigger's own `UPDATE` doesn't recurse. ④ The display now uses `idx + 1` rather than `series_order ?? idx` since the API already sorts ASC. The migration also one-shot normalizes existing data
- **API likes/views — stable tie-break + AbortController**: Tied `like_count` / `view_count` posts used to come back in DB-unspecified order, so the same card sometimes showed on both page 1 and 2 with a flicker. Adding `.order("created_at", { ascending: false })` as a secondary sort makes paging stable. PostsClient's `fetchPosts` also gets an `AbortController` so quickly switching sort metrics doesn't let a stale response overwrite a fresher one
- **Next.js Image aspect-ratio warning — global fix**: When CSS overrides only one dimension (width OR height) of a Next `<Image>`, the other dimension keeps the prop value and the aspect ratio breaks → console warnings across many pages. Added `height: auto` to `img, picture` in `src/styles/globals/_base.css` — width/height props become size hints and the other dimension auto-corrects. Solved at the root with no per-call-site changes
- **Page titles unified — root template + Hyeoniverse fallback + admin separate**: Root layout's `siteName` falls back to `"Hyeoniverse"` and exports template `${siteName} | %s`. Detail / series / tags pages drop `title.absolute` (root template now handles them). Admin (auth)/(preview)/(dashboard) all share `Admin | %s`. Removed `posts/layout.tsx`'s metadata because it broke the root template's child-segment inheritance — moved into `posts/page.tsx`. Home page's `title` field removed so the root default ("Hyeoniverse") doesn't double up
- **Card layout consistency — recommendedItem / AdjacentNav / relatedCard**: The "you might also like" + prev/next + related-series cards had subtly different heights / thumb ratios / body alignments. Unified to the same floor (height 100 or 124 px, 16:9 or 1:1 thumb), `align-items: center` body. recommendedItem's mobile grid layout (title + right-aligned category + excerpt) is now used on PC too (`min-height: 2lh` so 1-line and 2-line excerpts share the same starting position). relatedCard becomes a horizontal carousel (HorizontalCarousel) with inter-card borders + a minimal-library tone (mono meta + serif title + " / " separator)
- **postsLabel / seriesLabel → unified sectionHeader**: The post and series headers shared the same layout but used parallel CSS class names. Merged into `sectionHeader / sectionHeaderMain / sectionHeaderTitle / sectionHeaderText / sectionHeaderTitleLink / sectionHeaderChevron`. Both headers now have the same structure: `sectionHeaderMain` (icon + text + secondary controls) + `sortWrap` (sort SegmentedControl). On mobile, `sectionHeaderMain` takes 100 % width and `sortWrap` naturally wraps to the next line
- **Page-transition morph redesign — image / color / placeholder unified**: ① `navigateWithTransition(href, image, rect, color?)` takes an optional 4th color arg — if `image` is absent, the morph block fills with `color`; if neither, it falls back to `var(--bg-tertiary)`. ② **Backdrop fades from 1 → 0 during the morph phase**, so by the time morph reaches the hero size, the destination's `loading.tsx` skeleton becomes visible *underneath* the morph block — gives the "you're already on the next page" impression without a hard cut. ③ **`/posts/[slug]/loading.tsx` mirrors the real `PostDetailClient` 1:1**: `.hero` + `.headerSection > .articleHeader` + `.contentRow > .content`, with metaRow + title + excerpt + tags + headerDivider + AISummary placeholder + paragraphs + code/image placeholder. Zero layout jump when the real page replaces the skeleton. ④ **`/posts/loading.tsx` removed** — Next.js was briefly rendering the parent fallback (the 9-card grid) when the child segment's code hadn't been compiled / cached yet. `/posts/page.tsx` gains an inline `<Suspense fallback={null}>` to keep `useSearchParams()` happy at prerender. ⑤ **`isTransitioning` gating** — the 4 `motion.div`s in `PostDetailClient` (articleHeader / seriesBox / prose / commentSection) used to fade-in with a delay, leaving an empty area right after morph faded. They now use `initial={isTransitioning ? { opacity:1 } : { opacity:0, y:N }}` so the destination is filled the instant morph clears (direct URL entry still gets the fade). ⑥ **Timing**: EXPAND 380 / MORPH 260 / FADE 170 (~810ms total). ⑦ **Prefetch on hover** — `<div onClick>`-style callers (BannerSlide / TickerBanner / CardsBanner / SplitBanner) don't get Link's automatic prefetch, so each manually fires `router.prefetch` on hover/focus (de-duped via a `Set`). SplitBanner auto-prefetches the currently-visible slide because only one is shown at a time

<p align="center">
  <img src="public/images/screenshots/pc/posts-dark.png" width="49%" alt="Posts — Dark" />
  <img src="public/images/screenshots/pc/posts-light.png" width="49%" alt="Posts — Light" />
</p>

### Works Detail & Project Pages

- **Works Admin CRUD**: Supabase DB-based work management — single editor (MD/Rich Text) + 8-section template, auto-generated TOC, Korean/English bilingual (**title** is now ko/en bilingual too — previously single-language), gallery/team members. **Multi-category** (`categories_ko/en text[]` + GIN index, `?category=foo → categories @> ARRAY['foo']`), **nature** (creation motivation — toy / side / freelance / school / open-source), **slug-based routing** (`/works/[slug]`, JS · SQL `generateSlug` / `_sql_slugify` parity), **role-grouped contributions** (`contributions_ko/en jsonb` — `{ "Frontend": ["page impl"] }`), **per-tech notes** (`tech_notes jsonb` — `{ "React": "why / how" }`), and **GitHub / SNS auto-avatar derivation** for team members (`avatar_url > github.com/{user}.png > unavatar.io > favicon`)
- **Work Detail**: Project detail page — `/works/[slug]` routing, TOC from `##` heading parsing in content, gallery images, likes/comments, GitHub link button, static data fallback when DB is not connected

<p align="center">
  <img src="public/images/screenshots/pc/work-detail-dark.png" width="49%" alt="Work Detail — Dark" />
  <img src="public/images/screenshots/pc/work-detail-light.png" width="49%" alt="Work Detail — Light" />
</p>

### Navigation & UX

- **Mix-Blend Navigation**: Auto-inverting navigation with mix-blend-mode: difference — image logo (short/full/dark-only), glitch effect controlled from Admin. **Menu auto-centers between the left logo and the right actions cluster** (`flex: 1; justify-content: center`) so it never collides with the right side at any viewport width. The **active link's sliding indicator** uses a smooth transition for normal hover/navigation, but **switches to inline `transition: none` during window resize** so it snaps to the menu's position frame-by-frame (debounced for 120ms after resize ends, then transition is restored)
- **Tooltip & Translation Tooltip**: Generic Tooltip + translation `<T>` component — shows opposite language on long hover (600ms), createPortal-based, mobile touch toggle
- **Footer Sliding Indicator**: Same sliding indicator as Navigation — arrow movement on hover, ResizeObserver + fonts.ready accuracy
- **Banner (default / cylinder)**: Shared Banner (renamed from Carousel) — default (CSS opacity) / cylinder (3D perspective) modes, autoPlay/loop/dots/arrows
- **About Horizontal Scroll**: GSAP-based horizontal scroll via `useHorizontalScroll` hook (desktop), automatic vertical stack on mobile
- **About Mobile IDE Panel**: Mobile/tablet Troubleshooting panel rebuilt as a VSCode-style IDE — horizontally-scrollable tab bar + line-numbered editor + breadcrumb + status bar. Tab switching fires from any of (a) reach edge → release → scroll again, (b) sustained push without releasing, (c) horizontal swipe — and a 300ms grace window after first touching the edge absorbs fling residue so a single hard scroll never cascades. Dragging the tab bar past 5px flips the cursor to `grab` so the "Drag" label shows. Recommended items get a star + a single-line `recommendReason` (interviewee-voice, why this case matters)
- **About Pin-Scroll Throttle**: `useMobilePinScroll`'s onUpdate clamps progress jumps to ±1 step and throttles to 200ms — even a hard fling that jumps multi-progress only fires one tab transition per window, but external scroll still passes through the panel normally
- **Page Transition**: Shared image-to-hero morphing transition for all detail page navigation (PageTransitionProvider at root layout level, persists across pages)
- **PostCard hover prefetch**: `router.prefetch(href)` fires the moment a card is hovered (production only) — chunk + data are cached by click time, so the new page mounts instantly. Skipped in dev because prefetching a route that hasn't compiled yet triggers "Failed to fetch RSC payload" + hard-reload fallback
- **LoadingScreen session persistence**: The "initial load complete" flag is saved in `sessionStorage` — even when a dev-mode RSC payload fetch failure causes a hard reload, the LoadingScreen stays dismissed within the same session. The sessionStorage read happens inside `useEffect` (reading it at module level would diverge between server=false and client=true → hydration mismatch)
- **ImageViewer Directional Slide**: Previous/next slides in from opposite direction (mode wait), zone-based arrow reveal on hover
- **Select Dropdown Animation**: Portal-based dropdown uses rAF×2 delay after mount for CSS transition guarantee (compound selector to bypass global theme transition). **On outer scroll the dropdown closes instead of repositioning** — chasing the trigger feels distracting (inner option-list overflow scroll still works as expected). `Select.option` got `white-space: nowrap + overflow hidden + text-overflow ellipsis` — single-line + truncation. `SearchCapsule .selectWrap` and all its children are forced to `width: fit-content` so the trigger adapts to the option label length
- **LanguageToggle Dynamic Measurement**: EN button position measured via useLayoutEffect for accurate indicator alignment
- **Navigation polish**: Hamburger's 9 dots swapped from `<span>` to SVG `<circle>` (sub-pixel rendering at 2–3px was making them look elliptical; SVG guarantees identical circles at any size). Space Grotesk font config flipped from `display: optional + preload: false` to `display: swap + preload: true` — `optional` mode locks to the fallback (system sans-serif) if loading misses the 100ms window, which broke the mobile menu drawer since users click it well outside that window. Logout button wrapped in a Tooltip showing the admin email, drawer-open closes the notification dropdown, ActionBtn got a circle radius for consistency, and the mobile ActionBtn now stays at `md` size (was incorrectly shrinking to `sm`)
- **Tooltip dynamic max-width**: Measures the bubble's natural width (with max-width temporarily removed) and caps at 720px or vw-16 — long text spreads horizontally instead of stacking vertically. z-index lowered from inline `10001` to `var(--z-tooltip)` (700) so drawers / modals properly stack above tooltips
- **Pagination tweaks**: Button size `button-h-sm → button-h-md`, font `xs → sm`, gap `xs → sm` for parity with other controls
- **Checkbox hit-area cleanup**: Removed wrapper padding + margin (the hit-area trick) — visually identical (the two were self-cancelling) but no longer inflates ancestor row height

<p align="center">
  <img src="public/images/screenshots/pc/about-dark.png" width="49%" alt="About — Dark" />
  <img src="public/images/screenshots/pc/about-light.png" width="49%" alt="About — Light" />
</p>

### Admin & CMS

**Dashboard & CRUD**

- **Admin Dashboard**: `/admin` home — cumulative post views, likes, visitors, comments + daily view trend chart (Recharts), recent activity feed, scheduled-publish queue
- **CRUD & Bulk Management**: Posts/Works CRUD, drag bulk select + publish/delete, series management, trash (soft delete + restore)
- **Trash auto-purge + popular-post grace period**: posts/works grew a `purge_after` column + partial index (`deleted_at NOT NULL`) — soft-delete schedules a hard delete 30 days out, **90 days for popular posts** (score top 5). `/api/cron/purge-trash` runs daily at 03:00 (vercel.json) and hard-deletes rows where `purge_after < NOW()`. Trash UI shows an "Extend" button + days-left per row (`getTrashDaysLeft`); `/api/posts/[id]/extend-retention` and `/api/works/[id]/extend-retention` add 30 days. Deleting a popular post in admin triggers an extra ModalConfirm so it doesn't vanish accidentally
- **SegmentedControl (formerly SortGroup)**: Renamed `src/components/ui/SortGroup.tsx → SegmentedControl.tsx` (`git mv`) along with its type (`SortItem` → `SegmentedControlItem`), CSS module, and all 9 usage sites (PostsClient / TagPageClient / admin dashboard·posts·works·notifications·reports·settings) — the component had outgrown "sort" into tabs/filters/segmented controls. iOS-standard naming. `.btn` padding `box-sm → 2xs md`, font `2xs → xs` to match Select / SearchCapsule height
- **Admin posts/works filter consolidation**: Replaced sort `Select` with `SegmentedControl` across main/series/trash regions, merged newest/oldest into one date group with a direction toggle. Removed the bespoke `subFilterBar` / `subPageSize` / `subFilterSelect` / `subFilterSearch` classes — reuse main's `shell.filterBar` / `filterPageSize` / `filterItem` / `filterSearch`. `filterItem button` / `filterPageSize button` got padding `0 → 2xs` + `border-color: var(--border-default-color)` to match SearchCapsule height/color
- **Admin works/posts filter bar — 2-row layout**: Pulled "search + sort `SegmentedControl`" onto a top row by themselves, dropped "filter selects + perPage" to a second row. `perPage` is pinned to the far right via `margin-left: auto` — anchoring the most stable element of the row. The search input is 280px on desktop and 100% width on mobile (`.search input { width: 280px; @media mobile: 100% }`), and every `select` is capped at `max-width: 12ch` so long category/tag names can't blow up the row width
- **AdminTable action buttons — ghost style**: `moveBtn` (Move-dialog trigger) and `exportIconBtn` (per-row `.md` export) both used to carry a 1px solid border, making them feel louder than the row data. Removed the borders and unified them to **subtle (`text-tertiary`) + accent on hover**, restoring the visual hierarchy of "data first, actions second". Extracted a shared `.ghostIconBtn` mixin so both buttons stay in sync
- **AdminTable open-on-detail-page shortcut**: Each posts/works list row gets an `ExternalLink` icon button (`.viewBtn`) that opens the published public detail page (`/posts/[slug]` · `/works/[slug]`) in a new tab. Shown only on rows that are published and have a slug (hidden otherwise), uses `target="_blank" rel="noopener noreferrer"`, and `stopPropagation`s so it doesn't collide with row drag/select — one click from the admin list to the real published result
- **Admin works manual ordering — inline edit (`EditableRowNumber`)**: The previous toolkit (drag handle, Move dialog, position input) was missing the fastest path: **click the row number itself to type a new position**. Clicking the `colNum` `<span>` swaps it for an `<input type="number">`; Enter / blur saves, ESC cancels. The component is extracted to `src/components/admin/AdminTable/EditableRowNumber.tsx` so it can be reused beyond works. DnD and the Move dialog stay — the dialog stays for "jump a lot of rows at once", inline edit handles the everyday one-or-two-row moves. The server PATCH always renumbers the entire `sort_order` column to a dense `1..N`, so legacy `0`s / duplicates / gaps get cleaned up on every reorder
- **Shared `Popover` + `RowActionsMenu` — MoveDialog gone**: ① **`src/components/ui/Popover`** — anchor-based position + portal render + auto-close on outside click / ESC, with a `Menu` subset (`MenuItem` / `MenuDivider`) for dropdown standardization. On touch devices (`pointer:coarse`) the dropdown swaps for a bottom sheet automatically. ② **`src/components/admin/AdminTable/RowActionsMenu`** — kebab trigger (`MoreVertical`) with an inline-expand area containing "first / last / position input" + download / edit / delete consolidated. No more modal-pop-up-modal-pop-down flow for every move. ③ **`MoveDialog` deleted** — absorbed into RowActionsMenu. Row action areas in AdminTable / SubTable went from "several icon buttons" to a single kebab, cutting visual noise. admin/works · admin/posts (main + trash) all share the same component
- **Checkbox column — drag vs. multi-select disambiguation**: Rows are fully `draggable`, but a drag that starts on the checkbox column (`.colCheck`) signals "select multiple rows", not "reorder". `onDragStart` does `e.preventDefault()` if `e.target.closest('.colCheck')`, killing the reorder; subsequent pointer tracking falls into the multi-select drag handler. Drags starting elsewhere in the row reorder as before
- **CursorTrail — child-button-inside-draggable fix**: In admin tables where the whole row is `draggable`, hovering a small action button (preview / edit / delete) still showed `grab` (no "Click" label) — visually denying that the button was clickable. Added one rule to `runHitTest`: when both a button and a draggable ancestor match, **and the draggable contains the button**, the button wins (`hitDraggable.contains(hitButton) → click`). This matches the user mental model of "innermost context wins". Blank row space still shows `grab` as before
- **Pagination jump input**: New `showJump?: boolean` prop (default true, auto-hidden when totalPages ≤ 5) — "Go to [n]" capsule input, fires onChange (clamped) on Enter/blur, synced back when `page` changes externally. Number-input spinner removed in Firefox + WebKit
- **Scheduled Publish + Auto Trash Purge (pg_cron)**: `scheduled_at` / `purge_after` columns + **Supabase pg_cron direct execution** (removes the prior Vercel cron dependency). `publish_scheduled()` runs every minute, `purge_trash_scheduled()` daily at UTC 18:00 (KST 03:00). **pg_net** reads Vault secrets (`resend_api_key` / `admin_email` / `notify_from`) to call Resend's API → publishes/purges insert rows into `admin_notifications` and send a summary email. When Vault is empty, DB work succeeds and only the email step is skipped (fail-soft). DateTimePicker UI (date + time split, 12h/24h toggle)
- **Posts ↔ Works Bidirectional Linking**: Notion Relation–style — `post_work_relations` many-to-many table, additions on either side surface on detail pages automatically, `RelationPicker` with search · thumbnails · publish status
- **Project ↔ Series Linking**: `series_work_relations` many-to-many table links related series onto a project (work) — `GET /api/works/[id]/related-series` (public) · `GET/PUT /api/admin/works/[id]/related-series` (admin editing), surfaced on the works detail as related-series chips
- **Editor new blocks (PlateEditor)**: ① **Poll block** — void element, add options / drag-reorder, IME-safe input, IP-based tally via `GET/POST /api/polls/[pollId]` (poll_id/option_id live in the saved HTML data attributes). ② **Tabs block** — per-tab emoji + title + a `+` button to add tabs. ③ **FloatingBar** — a floating toolbar shown on block selection, closing on interaction with other blocks. ④ **BlockDragLayer** — a custom ghost (blurred, cursor-tracking) during block drag + auto-scroll at editor edges. ⑤ **EditorTextInput** — an IME-safe shared primitive for in-editor form inputs (contentEditable=false + commit-on-blur). ⑥ **Server-side code highlighting** — handled by `POST /api/highlight`, styled via `_hljs.css`. ⑦ **Mermaid diagram reader** — renders graphs in detail/preview + a "⋯" menu (view code / copy code)
- **New editor blocks, wave 2 (PlateEditor)**: ① **Calendar** — month/week/day/timeline views, event CRUD + recurrence + dependencies, ics/csv/json/md export. **Linked storage** — the block references only a `calendarId` while the real data lives in the `calendars` table, so multiple posts share one calendar (the opposite choice from the poll block's embedded storage). Admin-only management tab + trash (30-day TTL) + `?calendar=ID` deep links. ② **Diagram** — freeform nodes/edges (12 shapes) on `@xyflow/react`; mermaid is **export-only (one-way)** since coordinates are lost. The reader view is pure SVG. ③ **Code playground** — HTML/CSS/JS and static run in a self-hosted `iframe.srcdoc` runner, React/TS in `@codesandbox/sandpack-react`. Legacy `{html,css,js}` auto-migrates. ④ **Date mention** — typing `@` inserts a Notion-style date pill, with a mini calendar on hover in the reader. ⑤ **Post link** — typing `[[` opens post search + suggestions. ⑥ **mermaid** — the reader view now uses the same React island as the editor
- **Optimistic concurrency control for posts**: `posts.version` — the load-time version is sent as `baseVersion` and the server runs `UPDATE ... WHERE id AND version = baseVersion`. Zero rows returns `409 { error: "version_conflict", currentVersion }` → `SaveConflictDialog` offers **cancel / load latest / overwrite**. As a complement, `usePostPresence` detects other sessions over a Supabase Realtime presence channel (`post-edit:{postId}`) and shows a non-blocking warning banner before saving (no DB table)
- **Direct Storage upload**: `POST /api/upload/signed-url` + `src/lib/directUpload.ts` — only the filename and type go to the server, which returns a signed URL so the browser uploads straight to Storage, sidestepping Vercel's request body size cap. The existing server-proxied `/api/upload` remains in parallel, with a 200MB absolute cap
- **Favicon overhaul**: Font-size presets + direct input, independent text/background shadows (8 directions + sm/md/lg/custom), color overrides, and a **WCAG contrast-ratio checker** (`src/utils/contrast.ts`). `resolveFavicon()` in `src/lib/favicon.tsx` is shared by the route (SVG) and the admin preview (React), guaranteeing identical logic
- **Social links editor split out**: `SocialLinksEditor` + `types/social.ts`, with 12 new icons in `socialIcons.ts`
- **EmojiPicker overhaul**: 476 icons (extracted from lucide, `IconEntry.svg` inner-SVG field + `iconSvgInner` helper) + new categories (weather / devices / food / health / tools / education / faces / maps / shapes, etc.), Korean search (`emojiKo.ts`) + emoji-mart metadata (English names/keywords, `emojiMeta.ts`) + emoji-name tooltip (shared Tooltip), image drag-and-drop upload, inline styles → CSS module (`EmojiPicker.module.css`). Value format: native emoji / `img:url` (custom upload) / `icon:id` (SVG icon). **Custom uploads sync from `localStorage` to the `custom_emojis` table** (`GET/POST /api/custom-emojis`, `DELETE /api/custom-emojis/[id]`) — localStorage stays as an offline cache and first-paint source, and local entries missing server-side are back-filled via POST and merged with dedup by `src` (replacing wholesale with the server list would leave failed back-fills undeletable)
- **SEO Checklist**: Editor footer widget — 6-item check (title/slug/excerpt 30+/cover/category/tags), score progress bar, click an item to scroll to the field + label accent highlight (persists until next interaction)
- **`.md` Sync**: `content/posts/` · `content/works/` folder → DB unidirectional sync (Jekyll-style, `pnpm sync-all`)
- **`.md` Export**: Bulk/individual/series frontmatter-included `.md` download
- **PlateEditor per-element floating toolbar overhaul**: Redesigned around a Notion-style inline editing experience. ① **Image floating bar** — layout (Inline / Block / Float) · alignment (block left/center/right, float left/right) · caption · replace · delete (confirm popover) · ⋯ (aspect lock / size / filter) condensed into a single compact bar. W/H use the shared `NumberInput` (capsule, commit on blur/Enter + stepper), filter uses the shared `Select`. Caption supports line breaks + 200-char limit (toast on overflow); resize/move handle positions and flicker cleaned up; float images (inline voids) are selected via a capture-phase click handler. ② **Notion-style `+` button + block-tools popover** — clicking `+` left of the move handle reuses an empty block in place, or inserts a new empty block below (⌥/Alt+click = above) then opens the slash menu (auto-removed on cancel). Clicking the move handle opens a popover: turn into / duplicate / copy block link / text color / delete. ③ **Grouped slash menu** — Basic / Lists / Media / Advanced groups + lucide icons + more items (image · video · 2/3-column · toggle) + Lenis-compatible scroll. ④ **Per-level auto list markers** (`•→◦→▪`, `1.→a.→i.`) + zero indent at first level, sentence-style placeholder on empty blocks, block background instead of text highlight on multi-block drag (float image area split via `::before`/`::after`). The floating format bar only appears on selection (drag)
- **Plate.js Editor**: Markdown ↔ Rich Text bidirectional conversion (including file/audio attachments), custom footnotes, 5 templates, editor switch skeleton, custom input font size/line height
- **Editor Preview — renders identically to the published detail page**: Preview now reuses the same public view components as the detail page, so what you see in preview is exactly what gets published. `/admin/posts/preview` · `/admin/works/preview` render the same `DetailLayout` + `PostArticleView` (`PostArticleHeader` / `PostArticleBody`) the real detail page uses — no separate preview-only markup, so "looked fine in preview, looked different once published" mismatches are gone. KO/EN toggle · TOC · hero all match detail 1:1
- **works display number (#01) — `sort_order` as the single source**: Dropped the dedicated `works.number text` column; the displayed number is derived at mapper time (`workToProject`) via `formatProjectNumber(sort_order)`. Eliminates the possibility of number/sort_order drift. Includes DB migration (`ALTER TABLE works DROP COLUMN IF EXISTS number`) + setup.sql sync + API ALLOWED_FIELDS cleanup + admin list rendering
- **WorkEditor revamp**: ① **Year → PeriodPicker** — full start/end/ongoing range expression instead of a plain year, JSON-serialized to stay back-compatible with the old `year` string. ② **Role multi-select + per-role contributions** — combobox capsule with chip (10 presets + direct entry, IME composition Enter guard); beneath each selected role, the shared `TagNotesEditor` (`contributions_ko/en jsonb` — role → KO/EN pair[]) expands with per-item drag-reorder, checkbox bulk delete, and an edit/cancel 3-state toggle. ③ **Tech stack + per-tech notes** — Select combobox with 100+ tech presets (`src/data/techIcons.tsx`, SimpleIcons + FontAwesome) and Korean-alias search ("리액트" → React); each tech expands into the shared `TagNotesEditor` (`tech_notes jsonb` — tech → KO/EN pair[]) in multiLine mode for multiple description items. ④ **Multi-category** — `categories_ko/en text[]` so one work can span multiple forms ("webapp + library"), KO/EN inline capsules. ⑤ **Nature** — separate axis for creation motivation, single select (toy / side / freelance / school / open-source). ⑥ **Team member add-card** — avatar (auto-derived from GitHub / SNS) + name / email / URL inline edit (double-click → input, `field-sizing: content` for auto-fit width); KO/EN names use the shared `BilingualInputPair`, role select + per-role contributions (same `TagNotesEditor` applies to members too). ⑦ **Slug input + auto-fill** — generateSlug auto-populates from title + manual override, matches SQL `_sql_slugify` for migration back-compat. **The title input is bilingual** — it toggles ko/en with the editor language toggle, like subtitle. ⑧ **Sort-order drag list** — same list as the other works, drag via grip handle, paginated (5 per page) with a position input + jump-to-top/bottom buttons; while dragging, hovering the list edge (60px) calls `apply()` to actually reorder the source so it stays mounted instead of being unmounted by a page change. ⑨ **Capsule button group** — add-input + add-button rendered as a single capsule via outer border + inner `border: none` (no `overflow: hidden` to keep Select dropdown portals visible)
- **PostEditor per-tag notes (`tag_notes`)**: New field that lets each post tag carry a KO/EN description — `posts.tag_notes jsonb` (`{ tag: { ko, en } }`). Shares UI with works `tech_notes` via the common `TagNotesEditor` (item drag-reorder · KO/EN bilingual notes · edit/cancel/delete 3-state capsule). A grip handle next to each tag chip reorders display order; descriptions expand inline with IME-safe Enter-to-close
- **Shared `BilingualInputPair` + `TagNotesEditor`**: ① `src/components/admin/BilingualInputPair` — bilingual input pair with KO/EN badges baked into the left inside of the input, X clear when filled, IME-composition-safe `onEnter`, `data-cursor="text"`. ② `src/components/admin/TagNotesEditor` — per-item KO/EN notes + drag-reorder. multiLine mode (works tech / contributions, posts tag_notes) adds a standalone "+ Add" capsule; entering edit mode swaps all pairs to inputs with per-pair checkboxes for bulk delete, pairs themselves drag-reorder, and empty pairs auto-purge (normalizeEntry). Shared across 4 places in PostEditor / WorkEditor (works per-role / per-tech / per-member contribs · posts per-tag notes)
- **RelationPicker upgrades**: Chip left-side grip handle for **pointer-based drag-reorder** (avoiding HTML5 D&D quirks like source-unmount cancel / child-click absorption / state-driven `draggable` toggle). `framer-motion`'s `layout` prop applies a FLIP spring on reorder. Insertion indicators (`::before/::after`) appear on the chip's leading/trailing edge based on drag direction. Closed input shows a guidance placeholder ("+ Add" / "No more items"); arrow is `ChevronRight` and rotates 90° when open. Thumbnail load failures fall back to a same-size ImageIcon placeholder
- **PostEditor cover picker animation**: ① Toggle button text "Choose ↔ Close" cross-fades via `AnimatePresence mode="wait"`. ② With the picker open, the sibling excerpt textarea stretches to match the picker's height (`align-items: stretch` + `flex-direction: column`). ③ On close, a `closingCoverPicker` state holds the picker for ~450ms while its collapse animation runs before unmount (immediate unmount would skip the animation). The series order list now leads with a grip handle and uses framer `layout` + drop-position indicator for spring-based reorder
- **CursorTrail with HTML5 drag**: Browsers suspend `pointermove` at the system level during native HTML5 drag → CursorTrail froze and cursor type ping-ponged between hovered elements. `dragover` is forwarded into `handleMouseMove` to restore the coordinate stream, `dragstart` locks `cursorType="grab"`, and `runHitTest` early-returns while dragging so the "I'm holding something" cursor identity holds end-to-end
- **CursorTrail press feedback**: Explicit `.grab.clicking` rule — while pressing on a drag-capable surface the inner shrinks to 0.85x (`width` directly + `transform`/`animation` reset). The default `.clicking { transform: scale(0.8) }` alone was visually too subtle on top of `.grab`'s larger size
- **Image fallback system**: A single fallback rule across all image surfaces (editor cover, Plate inline, MarkdownRenderer, RelationPicker chip/option, ImagePanel thumbnail, WorkEditor main/gallery) — load failures swap to `/images/placeholder.svg`. React-rendered surfaces use `onError` + state; `dangerouslySetInnerHTML` regions (MarkdownRenderer / useRichtextEnhance) use `attachImageFallback(root)` — `addEventListener("error")` + immediate `complete && naturalWidth===0` check + MutationObserver to track dynamically added images, with `removeAttribute("srcset")` on swap to prevent srcset retries
- **Auto-save / Revision split (v2)**: ① **Continuous draft (`localStorage`, `useEditorDraft`)** — saves on every form change, silently auto-restores on re-entry (no modal, Notion/Linear style). ② **DB revision (`useEditorAutoSave`, save point)** — only created at a 30s debounce **AND** ≥ 10-char delta; page-leave forces one final save regardless of threshold (`sendBeacon` + `keepalive fetch`). Solves both per-keystroke row explosion and the interruptive restore modal. A `savingRef` mutex plus leave handlers updating the baseline BEFORE POSTing eliminates the duplicate-row race
- **Revision panel UX**: ① **Sticky header** (back + timestamp / restore + delete, glass bg + blur). ② **Detail meta** — title / subtitle / description as a label|value grid (form-style). ③ **Meta groups** support `fields` (single pairs) / `items` (sub-header + rows) / `secondary` (rendered below content) / `bulletValues` / `separateRows`. ④ **Image URLs** render as a 96×96 thumb + open in a new tab; **plain URLs** are clickable; **multi-line** values render as `<ul>` with 2-space indent → nested sub-bullets. ⑤ **KO/EN toggle** syncs with the editor lang but can be toggled independently inside the panel (`getCurrentSnapshot(lang)`, `onLoadRevisionDetail(index, lang)`). LCS diff comparison, cross-device sharing, and auto-cleanup at 50+ remain unchanged
- **AI Translation/Summary**: DeepL/Google/Gemini/Claude fallback chain, auto-summary on publish
- **Bulk Category Reassignment**: `BulkCategoryModal` — change categories for selected posts in one shot, preserves series mapping
- **Comment Management**: `/admin/comments` unified panel — Posts/Works comments together, bulk tombstone/permanent delete, report filter
- **Notifications + Reports consolidation (`/admin/notifications`)**: 4 tabs (All / Comments / System / Reports) — the "Reports" tab embeds the `ReportsList` component (extracted from the old `/admin/reports`) so resolve / dismiss / permanent delete happen inline. Title-row icons (LayoutDashboard / Bell / Settings), `SearchCapsule` for client-side title/message filtering (hidden on the Reports tab), and a refresh button that spins a `RefreshCw` icon while loading. `navigationData.ts` replaces the `admin-reports` menu item with `admin-notifications`
- **9 new system notification types**: Extended `admin_notifications` beyond comments/likes/reports to cover ops/security/infra. New types — `device_login` (new device login, pending state) · `device_approved` (approval token used) · `login_lockout` (5-failure lockout) · `signout_all` (global signout) · `ai_failure` (all AI summary/translation providers failed) · `email_failure` (Resend send failure, guarded against infinite loop via `opts.type === "email_failure"` skip) · `cron_error` (pg_cron exception) · `config_changed` (siteConfig save — diff prev via JSON.stringify per top-level key, only changed keys notify) · `migration_applied` (schema migration first-time apply). pg_cron silent failures are caught by `safe_publish_scheduled` / `safe_purge_trash_scheduled` PL/pgSQL wrappers whose EXCEPTION block inserts the notification; migrations are tracked via an `applied_migrations` table + `log_migration_applied(name, description)` helper that uses `GET DIAGNOSTICS was_new = ROW_COUNT` to detect first-time application before notifying
- **Settings conflict-list redesign**: Flattened to a single open-sided list (border-top + per-row border-bottom, no left/right border, no capsule rows)
- **Admin login lockout**: 5 failed attempts → 15-minute lockout via server-side check against the `admin_login_attempts` table. The login UI surfaces remaining attempts and a lockout countdown. `/api/admin/auth` and `/api/admin/auth/approve-device` are added to middleware public-paths so pre-auth calls aren't blocked
- **GitHub OAuth login + member management**: Owner/editor/author members sign in with GitHub OAuth (`supabase.auth.signInWithOAuth` → `/auth/callback` → `exchangeCodeForSession`) — password login (`signInWithPassword`) remains as an owner fallback. `/auth/callback` carries an **authorization gate**: OAuth only *authenticates*, then the server checks the email is `OWNER_EMAIL`, already has a role, or has an `author_invites` row — otherwise it `signOut()`s + service-role `deleteUser()`s the account and redirects to login with an error (un-invited GitHub users cannot get in). Roles (owner / editor permission_level 2 / author 1) are stored in `auth.users.app_metadata` (service_role-writable only — not the self-editable `user_metadata`), and the owner is bootstrapped from `OWNER_EMAIL`. Server helpers `requireOwner()` / `requireRole()` / `requireAuth()` (`src/lib/api/requireRole.ts`) re-read app_metadata on every request — client-sent values are never trusted. In Settings → the **Account tab**, the owner manages a member list (avatar · RoleBadge · ProviderChips [GitHub/email] · last sign-in) + CRUD (add/edit/delete · email invite · permission change). **Non-owners see only the Account tab**, and the site-config tabs are owner-only, enforced both client-side and server-side (`/api/admin/settings` PATCH rejects a non-owner writing anything but their own author entry)
- **Email invite (Resend)**: The owner invites an email → inserts an `author_invites` row + sends a notice email via Resend (needs a verified domain). On OAuth login with that email, the role is granted into app_metadata and the invite is marked consumed (`consumed_at`)
- **Cross-tab logout**: `AdminAuthSync` (mounted in the admin dashboard layout) subscribes to Supabase `onAuthStateChange` — on `SIGNED_OUT` it redirects to `/admin/login`. Because Supabase broadcasts auth changes across tabs, logging out in one tab logs out every open tab automatically (previously required a manual refresh)
- **Sign-out all devices**: New button in Settings → Account → Security — calls Supabase `signOut({ scope: "global" })` to invalidate every session on every device
- **New-device authentication**: A SHA-256 UA fingerprint is compared against the `admin_known_devices` table — unknown devices trigger an automatic `signOut` plus an approval email (24h TTL token). Clicking the link approves the device, then the user re-enters password on the login page. The approval HTML response page mirrors the site's `error.tsx` pattern (circle border icon + Instrument Serif heading + capsule button + decorative ovals) and auto-detects ko/en from the Accept-Language header
- **Email template helper**: `src/lib/mail/template.ts` — shared layout for the new-device and security-alert emails (Space Grotesk + Instrument Serif via Google Fonts, capsule CTA button, prefers-color-scheme dark/light)
- **Settings 5 Tabs**: General/Content/Appearance/Services/Account — brand, SEO (incl. a default content language ko/en setting), bilingual editing
- **Cover Image Picker overhaul**: 5-tab structure (Presets / Unsplash / Pexels / AI / History) + client-side WebP compression. **Presets = Adobe Color–style gradient editor** — base color + 8 schemes (analogous / monochromatic / triad / complementary / split-complementary / square / compound / shades) + linear/radial toggle + angle/size/speed sliders + drag-to-reposition stop bar (2–4 stops, capsule bar with handles below). Stops can be seeded by **uploading an image** (canvas palette extraction) or **pasting a clipboard palette** (matches both `#rrggbb` and `#rgb`, with a modal prompt fallback). A **fully randomize button** (pattern, size, speed, colors, count, positions) plus an auto-seed on first open — when there's already a cover image, the editor extracts its palette and seeds stops so users start from the current image's colors (seeding is disabled the moment they click a preset or edit manually). The **History tab** unifies AI/Unsplash/Preset sources, persisted server-side in Supabase (`cover_image_history` with RLS) — pick / remove / copy keyword / copy palette / download buttons cluster top-left, the active check sits top-right
- **CoverImageField shared component**: `src/components/admin/CoverImageField` — label + inline actions (Upload / Choose / Remove) + thumbnail + extracted-palette swatch row. Includes broken-image placeholder fallback and click-to-open-picker. PostEditor / WorkEditor / SeriesEditor share the exact same UI
- **Custom ColorPicker**: `src/components/ui/ColorPicker` — built from scratch to fix native `<input type="color">` cross-OS inconsistency. SV pad + hue slider + Hex/RGB inputs, render-prop trigger (parent controls the swatch shape), `createPortal` popover (escapes `overflow:hidden` parents). Handles the **wrapper-span 0×0 collapse case** (when the trigger child is `position:absolute`, e.g. stop handles) by falling back to `firstElementChild.getBoundingClientRect()` so the popover anchors to the visible child. Replaced 13 native color inputs across PlateEditor, Settings, RichTextEditor, MainToolbar, TableToolbar, etc.
- **SortOrderDragList shared component**: `src/components/admin/SortOrderDragList` — paginated (5/page) + grip-handle pointer drag + edge-hover triggers same-frame reorder + position input + jump-to-top/bottom. Used by both WorkEditor sort-order and PostEditor series-order
- **Global Toast**: `src/stores/toastStore.ts` + `src/components/ui/Toast` — zustand-backed singleton with `success / error / info` variants, auto-dismiss (default 2.4s), bottom-center stack, used for non-blocking feedback like "Copied!" on palette swatch / palette-row copy
- **Category direct-input persistence**: PostEditor / WorkEditor category select tracks a separate `categoryCustomMode` flag — selecting "Custom" clears the value but the input stays visible until the user picks another option, fixing the regression where the select reverted to the first category whenever the value was cleared
- **Media Upload Management**: Allowed file types whitelist (per-MIME size limits), blocked extensions blacklist, infrastructure keys read-only display — addable MIMEs displayed as group-based chips (image/video/audio/document/archive) for one-click allowlist, same-group types (e.g., JPEG/PNG/WebP) share a size limit
- **HEIC / TIFF Auto-Conversion**: On upload, HEIC/HEIF/TIFF are server-converted to WebP (quality 85) via sharp, making browser-unsupported formats viewable everywhere
- **Document Viewer**: File attachments with inline preview — PDF (iframe) · Office (MS Viewer) · text (fetch+pre), original filename preserved on download
- **Icon Consistency**: All inline SVGs unified to `lucide-react` (~200 replacements); brand marks (GitHub) extracted as custom components in `src/components/icons/` — tree-shakable + consistent strokeWidth/size API
- **About Studio — a visual editor that edits the live `/about` page inline**: under admin Settings > Content > About, the real About page is rendered in place — click text to edit it, add/remove items via buttons that appear on hover. Each panel saves separately, with undo and reset-to-default. Editable panels: ① **Hero panel** — `[Line 1] [Line 2 (accent)] [Subtitle] [Watermark]` each gets a ⚙ button opening a dropdown (desktop) / bottom sheet (mobile) with **per-line** color / font-size / font-weight / font-family controls. Background uses CoverImagePicker for image / video unified selection, with opacity slider on videos and accent overlay (color + strength). All edits are injected as inline-style CSS variables (`--_hero-line1-color`, etc.); the panel CSS reads them via `var(--_hero-subtitle-color, fallback)`. ② **Features panel** — `backdrop-filter: blur` on cards during hover for text legibility; admin can swap each card image via CoverImagePicker (incl. Pexels). ③ **Architecture panel** — `architectureItems` (path · description ko/en · indent level) edited via a compact-row admin editor with add / remove / reorder up/down. Config wins; falls back to the static `projectStructure` when empty. ④ **Tech Stack panel** — chip-based editor: 100+ presets (`src/data/techIcons.tsx`, SimpleIcons + FontAwesome) + per-chip icon (search / upload / URL), **category combobox autocomplete** (suggests existing items + `koSearch` chosung / Korean-alias search), and **drag & drop chips between category groups** with framer-motion `layout`/`layoutId` FLIP animation (empty groups are kept; whole chip gets `data-cursor="grab"`). ⑤ **ERD panel** — paste SQL or drop a `.sql` file and `parseSqlErd` reads the schema into an ERD. Not just `CREATE TABLE`: `ALTER` (columns, constraints, renames) · `DROP` · `CREATE VIEW` · `CREATE TABLE AS SELECT` · `CREATE TYPE … AS ENUM` · `CREATE INDEX` · `COMMENT ON`, and **DDL inside `DO $$ … $$` blocks**, all applied in document order. What it reads stays on the column — `NOT NULL` · `UNIQUE` · index · default · description · ENUM values; views get a `VIEW` badge. Two modes, **merge / replace** (merge is the default and never drops ERD-only columns), and before applying it shows exactly what is added, updated, or removed — **by name, with before/after values** — and asks. The input is a CodeMirror editor (`SqlEditor`) with SQL highlighting, table/column autocomplete, `⌘F` search, Tab indent, and **squiggles wherever the parser couldn't read** (bad syntax / missing ALTER target / a `REFERENCES` whose relation gets dropped). The list view shows each table as a miniature of its diagram node. The public page renders via `ErdExplorer`, toggling a conceptual (Chen-notation `ChenFlow`) and a relational (`ErdFlow`) view — click a table to frame it with everything it connects to, click again to fill the view with just that one. ⑥ **User Flow · Architecture diagrams** — node/edge visual tree editors (`FlowDiagramEditor` / `ArchDiagramEditor`), falling back to code defaults when empty. ⑦ **Code Highlights panel** — assign each demo slot a runnable sandbox (`DemoFilesEditor`, Sandpack) or uploaded media. ⑧ **Panel order · visibility · title** — drag to reorder (hero pinned first, credits pinned last), toggle visibility, override titles. ERD config is validated on save both in the app (`validateAboutErd`) and in the DB (`about_erd_valid` CHECK).
- **ColorPicker mobile bottom sheet + copy / paste / shake-on-invalid**: On mobile (`width ≤ 768px`) the dropdown popover auto-switches to the Modal sheet pattern (top radius / handle bar / max-height 85vh). Backdrop uses `backdrop-filter: blur(10px)` with `pointer-events: none` so trigger clicks pass through — the outside-click effect handles tap-to-close. The site uses Lenis smooth scroll, so we also call `useLenis().stop()` on sheet open; otherwise the page underneath still scrolls. Toolbar gets Copy / Paste buttons — Copy writes the current format (HEX / RGB / HSL / HSV / OKLCH) to the clipboard; Paste auto-detects via `parseAnyColorToOklch` covering all 5 formats plus bare `r, g, b`. Invalid HEX commit / paste failure triggers a 0.4s left-right shake + an `error` toast. Picker input wrapper widths are aligned — uniform `padding: var(--spacing-sm)`, min-width sized to the longest OKLCH C value (`0.2249`, 6 chars).

<p align="center">
  <img src="public/images/screenshots/pc/profile-dark.png" width="49%" alt="Profile — Dark" />
  <img src="public/images/screenshots/pc/profile-light.png" width="49%" alt="Profile — Light" />
</p>

### Performance

- **Bundle Optimization**: Replaced react-icons with inline SVGs, Three.js dynamic import, About 6-panel code splitting (62% JS reduction), removed unused packages/images (22MB)
- **Performance Optimization**: Hero/marquee CSS animation transition (compositor thread), useMagneticRepel direct DOM manipulation via refs (60fps), Three.js FrontSide + dispose, AudioContext lazy initialization
- **Detail page server-side slimming**: Removed the `getSiteConfig` + `getSecret` calls from posts/[slug] · works/[id] `page.tsx` — the values are already in root layout's `SiteConfigProvider`, so the client reads them via `useSiteConfig()`. Cold-cache latency drops by ~2 DB queries per detail page request
- **Middleware graceful degradation**: Wraps `supabase.auth.getUser()` (called on every `/admin/*` and `/api/admin/*` request) in try/catch — if the fetch fails (network drop / paused Supabase project / DNS) it no longer throws and dies as 500. Only the cookie refresh is skipped; the real auth gate in the admin layout still runs

| Metric | Before | After |
|:---|:---:|:---:|
| Lighthouse Performance | 60 | **98** |
| LCP | 7,294ms | **1,979ms** |
| Page Size | 1,489KB | **449KB** (-70%) |
| Network Requests | 63 | **28** |

### Design System

- **Design System Preview**: View tokens/components/banner layouts at `/design-system` route — Tooltip, Select (portal-based dropdown + combobox + **right-anchored bubble variant**), **NumberInput** (capsule numeric input — commit on blur/Enter + stepper + label/suffix), shared **Chip** (capsule/bare · grip handle · leftIcon · count · drag), Pagination (smart ellipsis), DatePicker / PeriodPicker, CloseButton (X ↔ minus morph), ModalTemplates (Confirm/Alert/Prompt — 28px action buttons), Banner (renamed from Carousel), BilingualInputPair (KO/EN badges in-input), TagNotesEditor (item drag-reorder + multiLine KO/EN notes), EmojiPicker (overhauled — 476 lucide icons + Korean search + drag upload), RelatedChips (thumbnail+title+category chips + hover preview card via `useHoverPreview`), ViewModeToggle (Footer PC/mobile mode switch, touch devices only), CoverBanner (admin editor cover banner), FloatingBar (editor block-selection floating toolbar), BlockDragLayer (custom ghost during block drag), EditorTextInput (IME-safe in-editor form input), MenuDots (shared menu icon — 9-dot grid that morphs to X when open, used by the Navigation menu button and settings tab-bar toggle), Gradient Tokens, 3-phase scroll animation
- **Korean chosung search (`src/lib/koSearch.ts`)**: `getChosung()` + `matchesSearch()` — substring + Korean initial-consonant ("ㄹㅇㅌ" → 리액트) + Korean-alias matching. Used for short name filters (tags / categories / Tech Stack); long body search uses `@/lib/searchQuery` separately.
- **OKLCH color migration**: All raw color tokens and scattered module-CSS hex/rgba values converted to `oklch(L% C H)` via [culori](https://culori.js.org). Uses **`oklch(L C H / α)` alpha syntax**, perceptually uniform lightness regardless of hue. No `var()` fallbacks — component CSS must never use raw hex (use `var(--color-*)`). New colors should preserve culori's precision (5 dp for L/C, 2 dp for H)

<p align="center">
  <img src="public/images/screenshots/pc/design-system-dark.png" width="49%" alt="Design System — Dark" />
  <img src="public/images/screenshots/pc/design-system-light.png" width="49%" alt="Design System — Light" />
</p>

> **Detailed docs**: [Security](./docs/security.en.md) · [DB Design Decisions](./docs/db-design.en.md) · [User Flow](./docs/user-flow.en.md)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
```

View the result at [http://localhost:3000](http://localhost:3000).

> **Works without Supabase**: Falls back to static data without env vars. For Posts/comments/likes, see **[Supabase Setup Guide](./docs/supabase-setup.en.md)**.

---

<details>
<summary><strong>Supabase Setup Guide (quick reference)</strong></summary>

Supabase project setup is required to use the Posts feature.

### 1. Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Production origin — middleware uses this for CSRF Origin verification.
# Missing in production → admin mutations are all rejected with 403 (fail-closed).
# Dev can leave it unset.
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Cover Image Picker — Unsplash (optional)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Cover Image Picker — Pexels (optional, Unsplash fallback)
PEXELS_API_KEY=your_pexels_api_key

# Cover Image Picker — AI Generate (set only the key matching your provider)
# Uses the key corresponding to aiCover.provider value in site.config.ts
HUGGINGFACE_API_KEY=hf_...          # provider: "huggingface"
NANOBANANA_API_KEY=your_key         # provider: "nanobanana"

# Translation — set only the key matching your chosen provider
# Uses the key corresponding to translation.provider value in site.config.ts (default: deepl)
DEEPL_API_KEY=your_deepl_key                   # provider: "deepl" (default)
GOOGLE_TRANSLATE_API_KEY=your_google_key        # provider: "google"
GEMINI_API_KEY=your_gemini_key                  # provider: "gemini"
ANTHROPIC_API_KEY=your_anthropic_key            # provider: "claude" (translation + AI summary)

# giscus comments (optional) — used only to load a repository's Discussion categories
# from the admin settings. A GitHub PAT for reading public repos (no scopes needed)
GITHUB_TOKEN=ghp_...
```

> `GITHUB_TOKEN` prefers the secret saved in the admin Services tab, falling back to the environment variable (`getSecret("GITHUB_TOKEN")`). The giscus widget itself works without a token.

**How to find the values:**

1. [Supabase Dashboard](https://supabase.com/dashboard) -> Select your project
2. **Settings** -> **API** tab
3. `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
4. `anon` `public` key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. `service_role` `secret` key -> `SUPABASE_SERVICE_ROLE_KEY`

> **Warning**: The `service_role` key bypasses RLS and must never be exposed to the client. `SUPABASE_SERVICE_ROLE_KEY` is used server-side only without the `NEXT_PUBLIC_` prefix.

### 2. Database Table Creation

The [`supabase/setup.sql`](supabase/setup.sql) file contains all table creation + RLS policies.

Copy the file contents and run them at once in Supabase Dashboard -> **SQL Editor**.

**Tables created (23) + RPC functions:**

| Table | Purpose |
|--------|------|
| `site_settings` | Site settings + profile data + secrets/API keys (JSONB) |
| `series` | Blog series (`sort_order` for admin ordering, `auto_cover_url` for Unsplash cache, 80-char title CHECK) |
| `posts` | Blog posts (post_number sequence + `scheduled_at` for scheduled publishing + `purge_after` trash TTL + `version` optimistic locking + `icon` / `cover_position` / `cover_zoom` / `author_ids`) |
| `comments` | Post comments (threaded replies, dual auth: commenter_hash + password) |
| `comment_reactions` | Comment emoji reactions (fixed set of 8, post/work split via `comment_type`, duplicate prevention via `reactor_hash`) |
| `comment_reports` | Comment reports (reason + resolve/dismiss state) |
| `likes` | Likes (unified for posts/works/comments, distinguished by target_type, IP duplicate prevention) |
| `works` | Portfolio works (slug, `title`/`title_en` (bilingual title), `categories_ko/en text[]` + GIN, `nature_ko/en`, `contributions_ko/en jsonb`, `tech_notes jsonb`, team_members jsonb, `icon`, `scheduled_at`, `purge_after`) |
| `site_visits` | Visitor statistics (1 per IP+date) |
| `post_views` | Per-post time-series view records (daily trend chart on dashboard) |
| `work_comments` | Works comments (threaded replies, dual auth) |
| `admin_notifications` | Admin notification logs |
| `revisions` | Editor revision history (shared for posts/works, JSONB snapshot) |
| `post_work_relations` | Posts ↔ works many-to-many bidirectional (Notion Relation–style) |
| `series_work_relations` | Series ↔ works many-to-many (related series on a project, same pattern as post_work_relations) |
| `poll_votes` | In-content poll block tally (poll_id + option_id — editor-assigned text ids, IP-based duplicate prevention) |
| `calendars` | Shared calendars for the editor's calendar block (`data jsonb`, soft delete + 30-day `purge_after` TTL) |
| `custom_emojis` | Custom uploaded icons for the EmojiPicker (admin-only RLS) |
| `cover_image_history` | Cover Image Picker unified history (per admin user, AI/Unsplash/Preset, RLS) |
| `admin_login_attempts` | Admin login failure counter (5 fails → 15-minute lockout) |
| `admin_known_devices` | Approved admin device UA fingerprints (SHA-256; unknown devices require email approval, 24h TTL) |
| `applied_migrations` | Tracks applied schema migrations (fires a notification on first application) |
| `author_invites` | Email author invites (email PK, author_id references the profile id in site_settings.profile, permission_level 1=author/2=editor, invited_by, created_at, consumed_at, service_role-only RLS) |

**RPC functions**: `sum_post_views()` (cumulative view total), `daily_post_views(start, end)` (daily time series), `publish_scheduled()` (publishes posts/works whose scheduled time has arrived + admin notifications + email — **pg_cron every minute**), `purge_trash_scheduled()` (hard-deletes trash past `purge_after` + notifications — **pg_cron daily at KST 03:00**), `about_erd_valid(config jsonb)` (validates the shape of the ERD config edited via About Studio — rejects empty/duplicate table & column names and types, and type-checks the optional fields `required`/`unique`/`indexed`/`defaultValue`/`comment`/`enumValues`/`kind`, IMMUTABLE)

**CHECK constraint**: `site_settings_about_erd_valid` — applies `about_erd_valid(config)` to `site_settings.config` so malformed ERD config can't be persisted at the DB level (a last line of defense even if the app's `validateAboutErd` check is bypassed). See [DB Design Decisions](./docs/db-design.en.md#about-studio-erd-config-validation-about_erd_valid) for the rationale.

**pg_cron automation — Vault secrets (optional)**: Email alerts from `publish_scheduled()` and `purge_trash_scheduled()` activate when you register these three secrets in Supabase **Vault > Secrets**. Without them, the DB work still runs — only the email step is skipped:
- `resend_api_key` : Resend API key ([resend.com/api-keys](https://resend.com/api-keys))
- `admin_email` : recipient (admin) email
- `notify_from` : sender email (a Resend-verified domain)

You also need to enable `pg_cron` and `pg_net` in `Database > Extensions` (setup.sql's `CREATE EXTENSION` attempts both, but some environments need the dashboard toggle).

> Uses `IF NOT EXISTS` so existing tables are skipped. Missing columns (commenter_hash, updated_at, etc.) in existing deployed DBs are safely added via `ALTER TABLE ADD COLUMN IF NOT EXISTS` in the migration section at the bottom of the file.

> **Works without Supabase**: If environment variables are not set, the site automatically falls back to static data from Works (`data/projects.ts`), Profile (`data/profile.ts`), and Settings (`config/site.config.ts`).

**Key API endpoints:**

> **Posts API**: `GET/POST /api/posts`, `GET/PATCH/DELETE /api/posts/[id]`, `POST /api/posts/[id]/view`, `GET/POST /api/posts/[id]/like`, `GET /api/posts/export` (single/all/series .md export)
>
> **Series API**: `GET/POST /api/series`, `GET/PATCH/DELETE /api/series/[id]`
>
> **Works API**: `GET/POST /api/works`, `GET/PATCH/DELETE /api/works/[id]`, `GET/POST /api/works/[id]/like`, `GET /api/works/export` (single/all .md export)
>
> **Comments API**: `GET /api/comments?post_id=`, `POST /api/comments`, `PATCH /api/comments` (edit), `DELETE /api/comments/[id]`
>
> **Work Comments API**: `GET /api/work-comments?work_id=`, `POST /api/work-comments`, `PATCH /api/work-comments` (edit), `DELETE /api/work-comments/[id]`
>
> **Comment Reactions API**: `GET /api/comment-reactions?comment_type=&comment_ids=` (batch tally + my reactions), `POST /api/comment-reactions` (toggle an emoji reaction)
>
> **Calendars API**: `GET/POST /api/calendars` (list — `?trash=true` for trash / create), `GET/PUT/DELETE /api/calendars/[calendarId]`, `POST /api/calendars/[calendarId]/restore`, `DELETE /api/calendars/[calendarId]/purge` — all admin-only
>
> **Custom Emojis API**: `GET/POST /api/custom-emojis`, `DELETE /api/custom-emojis/[id]` — EmojiPicker custom icons, admin-only
>
> **Upload API**: `POST /api/upload` (server-proxied, per-MIME size limits + a 200MB absolute cap), `POST /api/upload/signed-url` (issues a signed URL for direct Storage upload — only the filename and type transit, sidestepping the request body size cap)
>
> **Admin API**: `POST /api/admin/auth`, `GET/PATCH /api/admin/settings`, `GET/PATCH /api/admin/profile`, `GET/PATCH /api/admin/account`, `GET/PUT /api/admin/secrets`, `POST /api/admin/upload`, `POST /api/admin/translate`, `GET /api/admin/giscus-repo?repo=owner/name` (looks up repoId + Discussion categories via GitHub GraphQL, requires `GITHUB_TOKEN`)
>
> **Auth & Members API**: `GET /auth/callback` (OAuth callback + authorization gate — deletes un-invited accounts), `GET /api/admin/me` (current user's email/role/level/isOwner — settings tab gating), `GET|PATCH|DELETE /api/admin/authors/members` (owner-only — list members + pending invites / change permission or link author profile / delete account), `GET /api/admin/authors/context` (requireAuth, non-owner accessible — returns ownerEmail + member author-ids/emails so non-owners can render the member list without the owner-only 403 endpoint), `POST /api/admin/authors/invite` (owner-only — insert author_invites + Resend email)
>
> **Revisions API**: `GET /api/revisions?entity_type=&entity_id=` (list, excluding snapshots), `POST /api/revisions` (save + cleanup beyond 50), `GET /api/revisions/[id]` (single with snapshot), `DELETE /api/revisions/[id]`
>
> **Categories API**: `GET /api/categories` (Posts bilingual category list), `GET /api/works-categories` (Works bilingual category list)
>
> **Polls API**: `GET/POST /api/polls/[pollId]` (in-content poll block tally query / vote)
>
> **Related Series API**: `GET /api/works/[id]/related-series` (public related series), `GET/PUT /api/admin/works/[id]/related-series` (admin related-series editing)
>
> **Utility API**: `POST /api/translate` (public, Gemini single text), `POST /api/posts/reassign-category` (batch category reassignment), `GET /api/fonts/search?q=` (Google Fonts autocomplete search), `POST /api/highlight` (server-side code highlighting)

### 3. Storage Bucket Creation

For image, resume, and BGM uploads:

1. Supabase Dashboard -> **Storage**
2. Click **New bucket**
3. Bucket name: `uploads`
4. Check **Public bucket** (to allow public URL access to files)
5. **Create bucket**

> The upload API organizes files by folder: `logos/`, `resume/`, `bgm/`, `covers/`, `images/`, etc.

**Storage policy setup:**

```sql
-- Only authenticated users can upload
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

-- Anyone can read (public bucket)
CREATE POLICY "Anyone can view uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');
```

### 4. Admin Account Creation

Supabase Dashboard -> **Authentication** -> **Users** -> **Add user**:

- Enter Email and Password
- Check **Auto Confirm User** (skip email verification)

**Owner account (`OWNER_EMAIL`)**: Set the email you just created as the `OWNER_EMAIL` env var and that account becomes the bootstrap owner (full permissions automatically, without an invite row). All other members are added by email invite (see step 5).

**GitHub OAuth login setup** — members sign in with GitHub OAuth:

1. **Create a GitHub OAuth App** — GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Set the Authorization callback URL to `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
2. In Supabase Dashboard → **Authentication → Providers → GitHub**, enable it and paste the OAuth App's Client ID + Secret
3. Add your site's `/auth/callback` to Supabase **Authentication → URL Configuration → Redirect URLs**

> Invite notice emails use Resend (with a verified domain) — sharing the same Resend key as the Services tab / pg_cron email setup.

### 5. Admin Login Method

There is no login button on the site. Only the admin accesses it by entering the URL directly.

**Login:**

1. Go to `/admin/login`
2. Enter the email/password created in Supabase
3. Login success -> Redirect to `/admin/settings`

> Login form: the error/info message moved into its own row below the submit button (previously wedged next to "remember email"), with a reserved `min-height` so layout doesn't shift when the message appears/disappears. Email + password inputs are grouped under `.inputGroup` with a tighter gap (form gap `xl → md`). The 5-fails-then-15-min-lockout warning surfaces in the same row

**GitHub OAuth login** (standard path for members):

1. On `/admin/login`, click **Sign in with GitHub** → `supabase.auth.signInWithOAuth` → GitHub auth → redirect to `/auth/callback`
2. The `/auth/callback` authorization gate checks the email is `OWNER_EMAIL`, already has a role, or has an `author_invites` row — on pass, the role is granted into app_metadata and the invite is consumed. If un-invited, the account is deleted and it redirects back to login with an error
3. Success → redirect to `/admin/settings`

**Adding members (email invite)**: From Settings → the **Account tab**, the owner invites a member by email, which inserts an `author_invites` row and sends a Resend notice email. When the invitee signs in via GitHub OAuth with that same email, they automatically gain author/editor permission. The owner manages the member list, roles, and permissions from the Account tab (non-owners see only the Account tab).

**Features available after login:**

- `/admin/posts` — Post list (publish/private status, hover preview, row numbers, thumbnails)
- `/admin/posts/new` — New post creation (Markdown <-> Rich Text toggle, auto translation, re-translate, auto save + DB revision history + diff comparison + Revert)
- `/admin/posts/[id]/edit` — Edit existing post (PlateEditor loading skeleton)
- `/admin/posts/series/new` — Create new series
- `/admin/posts/series/[id]/edit` — Edit series
- `/admin/works` — Works list (table view, publish/private toggle, sort order, thumbnails, .md upload)
- `/admin/works/new` — Create new work (single content editor + template, Korean/English bilingual, tech stack, gallery)
- `/admin/works/[id]/edit` — Edit existing work
- `/admin/settings` — Site settings (General, Content, Appearance, Services, Account — 5 tabs). General tab for brand/SEO (incl. a `defaultLanguage` ko/en Select that decides which language is required in admin authoring forms [title/subtitle/nature/categories] plus the editor's initial language tab — independent of the visitor-facing language)/footer copyright/BGM file upload/audio source (track name/artist/URL) management. Content tab split into Home/Profile/About/Posts/Works sub-navigation. Services tab for email service, AI cover, reCAPTCHA settings and API key editing. Account tab for admin email/password changes + member management (owner-only — member list, roles [owner/editor/author], email invites, permission changes; non-owners see only the Account tab)

### 6. Cover Image Picker Usage

In the Cover Image / Main Image area of the post, series, and work editors, you can choose between **Upload** (direct upload) and **Choose cover** (picker).

Clicking **Choose cover** shows 5 tabs (auto-switches to a bottom sheet on mobile):

| Tab | Description | Required Environment Variable |
|----|------|----------------|
| **Presets** | Click from 16 gradient/pattern options to generate a 1200x630 image via Canvas API and upload to Supabase. Local media under `public/cover/images/` and `public/cover/videos/` also surfaces in the same panel via the shared `/api/admin/cover` endpoint | None |
| **Unsplash** | Search Unsplash photos by keyword -> click to trigger download tracking + Supabase upload | `UNSPLASH_ACCESS_KEY` |
| **Pexels** | Search Pexels photos by keyword -> click to download + Supabase upload. Complements Unsplash (fail-safe if Unsplash policy changes) | `PEXELS_API_KEY` |
| **AI Generate** | Prompt + style selection -> AI image generation -> Supabase upload | Provider-specific API key (see below) |
| **History** | Permanent record of past picks (`cover_image_history` table, RLS) — unified across preset / Unsplash / Pexels / AI. Inline keyword/palette copy · download · re-pick | None |

> **Note**: Unsplash, Pexels, and AI Generate tabs each require their own API key. Presets and History work without any environment variables.

---

#### AI Generate — Provider Setup

Select the service to use in `src/config/site.config.ts` under `aiCover.provider`:

```ts
aiCover: {
  provider: "huggingface",  // "nanobanana" | "huggingface"
},
```

| Provider | Model | Environment Variable | Price | How to Get |
|----------|------|----------|------|-----------|
| **huggingface** | FLUX.1-schnell | `HUGGINGFACE_API_KEY` | Free (with rate limits) | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) -> New token -> Check `Inference Providers` permission |
| **nanobanana** | Gemini 2.5 Flash | `NANOBANANA_API_KEY` | ~$0.02/image (free credits on signup) | [nanobananaapi.ai/api-key](https://nanobananaapi.ai/api-key) -> Sign up -> Copy API Key |

**Setup example (.env.local):**

```env
# When using Hugging Face (recommended — free)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Or when using NanoBanana
# NANOBANANA_API_KEY=nb_xxxxxxxxxxxxxxxx

```

> After changing the provider, just set the corresponding key in `.env.local`. Keys for unused providers can be left empty.

---

#### Hugging Face API Key Setup (Recommended)

1. Sign up at [huggingface.co](https://huggingface.co/join)
2. Go to [Settings -> Access Tokens](https://huggingface.co/settings/tokens)
3. Click **Create new token**
4. Token type: Select **Fine-grained**
5. Token name: Any name (e.g., `portfolio-cover`)
6. Permissions setup:
   - **Inference Providers** -> Check **Make calls to Inference Providers** (required)
   - All other permissions can be left unchecked
7. **Create token** -> Copy the `hf_...` format token
8. Enter `HUGGINGFACE_API_KEY=hf_...` in `.env.local`

> Free tier allows hundreds of calls per hour. More than sufficient for cover image generation.

#### NanoBanana API Key Setup

1. Sign up at [nanobananaapi.ai](https://nanobananaapi.ai)
2. Go to the [API Key management page](https://nanobananaapi.ai/api-key)
3. Copy the API Key (no separate permission setup — one key for all API access)
4. Enter `NANOBANANA_API_KEY=...` in `.env.local`

> Free credits provided on signup. ~$0.02/image afterwards. Uses an async approach (generation request -> polling), so responses may take several seconds.

---

#### Unsplash API Key Setup

1. Sign up at [Unsplash Developers](https://unsplash.com/developers)
2. Click **Your apps** -> **New Application**
3. Check guideline agreements, enter app name/description -> **Create application**
4. Copy the **Access Key** from the created app page (not the Secret Key)
5. Enter `UNSPLASH_ACCESS_KEY=...` in `.env.local`

> Demo app limit: 50 requests/hour. Production approval: 5,000 requests/hour.

#### Pexels API Key Setup

1. Sign up at [Pexels API](https://www.pexels.com/api/)
2. Copy the key from the **Your API Key** page (issued instantly, no app review)
3. Enter `PEXELS_API_KEY=...` in `.env.local`

> Free tier: 200 requests/hour, 20,000 requests/month. Useful as a fallback when Unsplash policy changes or rate limits hit.

**Authentication flow:**

```
/admin/login (Sign in with GitHub)
  -> supabase.auth.signInWithOAuth({ provider: "github" })
    -> GitHub auth -> GET /auth/callback
      -> exchangeCodeForSession (authenticates only)
      -> authorization gate: email is OWNER_EMAIL || has a role || author_invites row?
        -> pass -> grant role into app_metadata + consume invite (consumed_at)
        -> fail -> signOut() + service-role deleteUser() -> /admin/login with an error
  -> Redirect to /admin/settings

/admin/login (form submit — owner fallback)
  -> POST /api/admin/auth
    -> supabase.auth.signInWithPassword()
    -> Set session cookie
  -> Redirect to /admin/settings

Accessing /admin/*
  -> Dashboard layout checks session
  -> No session -> /admin/denied (access denied page)
  -> Session exists -> Normal access (server helpers re-check the app_metadata role)
  -> AdminAuthSync subscribes to onAuthStateChange -> SIGNED_OUT in another tab -> /admin/login (cross-tab logout)

Accessing /admin/login
  -> Auth layout checks session
  -> Already logged in -> Redirect to /admin/settings
```

> **Key point**: Regular visitors can only read posts and leave comments at `/posts`. Only the admin (yourself) accesses `/admin/login` by entering the URL directly. Since this is a portfolio site, the login UI is not exposed.


</details>

<details>
<summary><strong>Testing</strong></summary>


**Stack**: Vitest + React Testing Library + jsdom

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on file changes)
npm run test:watch
```

**Test targets**:

**Utils & rendering** (`src/__tests__/`)

| File | Tests | Description |
| --- | --- | --- |
| `cn.test.ts` | 6 | Class name merge utility (`cn`) |
| `mobileCheck.test.ts` | 6 | Mobile layout detection (`checkMobileLayout`) |
| `renderHighlight.test.tsx` | 4 | Highlight markup transformation (`renderHighlight`) |
| `koSearch.test.ts` | 10 | Korean initial/jamo search matching |
| `codeBlockBar.test.tsx` | 3 | Code block top bar (language label, copy, wrap toggle) |
| `cssTokens.test.ts` | 1 | **Guard for undefined CSS tokens** — without a `var()` fallback the whole declaration is invalid, and CSS fails silently. 13 tokens across 57 sites were actually dead |

**Editor (Plate)** (`src/components/posts/plate/__tests__/`)

| File | Tests | Description |
| --- | --- | --- |
| `browserSafeGrammar.test.ts` | 15 | Browser safety of hljs grammars — whether registered regexes survive hljs's flag-less re-parse (troubleshooting #75). Node uses the original source, so the tests **synthesize the bundled shape** |
| `fitColumnsForInsert.test.ts` | 10 | Column width distribution — block cap, minimum width, remainder allocation |
| `columnHasContent.test.ts` | 9 | Content check before deleting a column — images and dividers count even with no text |
| `codePaste.test.ts` | 7 | Pasting code **outside** a code block — the markdown parser must not shred it on indentation |
| `codeBlockClear.test.ts` | 5 | Caret stays inside the block after "clear content" (if it escapes, pastes leak out) |
| `codeBlockStructure.test.ts` | 4 | `code_block` children are always `code_line` (a raw text child creates a state nothing can repair) |
| `tableRowHeight.test.ts` | 4 | Table row height HTML round-trip |

Config: `vitest.config.ts` (jsdom, `@platejs/*` inlined so the full EditorKit loads)

---

**Visual regression (Playwright)**

Verifies pixel-for-pixel that a refactor did not change the rendered page. 24 baseline screenshots live in `e2e/visual.spec.ts-snapshots/` and are compared on every run.

```bash
npm run build              # production output required (a dev server makes the baseline unstable)
npm run test:visual        # compare
npm run test:visual:update # refresh the baseline (only for intentional design changes)
```

| Item | Value |
| --- | --- |
| Scope | 12 public routes × desktop (1440×900) / mobile (Pixel 7) = **24 shots** |
| Checks | Screenshot diff + page runtime errors |
| Stability | 24/24 across 3 consecutive runs (zero flakes) |

Two traps worth knowing: the full-screen `LoadingScreen` must be awaited or a "black screen + logo" frame gets baked into the baseline, and masking a WebGL canvas paints a rectangle *over* it — turning the whole page into a solid block (use `visibility: hidden` instead). Full notes and coverage gaps (`/works` and `/posts` are viewport-only, `/admin/*` is excluded pending auth setup) are in **[docs/perf-baseline.md](./docs/perf-baseline.md#시각-회귀-baseline)**.

> **Refactoring docs**: [Refactoring guide](./docs/refactoring-guide.md) · [Performance baseline](./docs/perf-baseline.md) · [Dead code inventory](./docs/dead-code-inventory.md)

---


</details>

> **Component details**: [StaggerText · BreakpointGuard · Modal](./docs/components.en.md)

## Trouble Shooting

> 86 issues encountered during development, with the top 51 surfaced on the About page (filtered by difficulty + generalizability via a `HIDDEN_PROBLEMS` Set — data is preserved and can be unhidden anytime). 6 sections (Architecture / Performance / Layout / Plate Editor / Animation·Interaction / Component) + difficulty (1–3) + recommended (★) badges. Highlights below — full list at **[docs/troubleshooting.en.md](./docs/troubleshooting.en.md)** or the About page.

| # | Issue | Key takeaway |
|:---:|:---|:---|
| 4 | GSAP ScrollTrigger horizontal infinite scroll | Project set wrapping + instant scroll repositioning for seamless bidirectional infinite loop |
| 5 | Lighthouse reCAPTCHA lazy loading | Deferring script load to form interaction reduced LCP 7.2s → 1.9s |
| 12 | Full performance optimization (Lighthouse 60→98) | react-icons→SVG, Three.js dynamic import, About panel code splitting — 1,489KB→449KB |
| 19 | Global theme transition overriding component animations | Compound selector (0,2,0) specificity reversal — restored max-height, transform transitions |
| 32 | LoadingScreen not in SSR → content flash | dynamic({ ssr: false }) → regular import to include loading backdrop in server HTML |
| 33 | CTA button `backdrop-filter` not working in Chrome | Swapped `.home` entrance from `y: transform` to `marginTop: layout` — an ancestor with `transform` promoted a compositing layer that blocked backdrop sampling. Also removed `-webkit-backdrop-filter` prefix since it caused Chrome to mis-parse the declaration |
| 34 | Portal dropdown CSS transition not firing | Mount renders with open class already applied (initial=final) — `animateOpen` state + rAF×2 delay ensures mount→close→open sequence, compound selector (0,2,0) bypasses global theme transition |
| 35 | mix-blend-mode: difference forcing child colors | Parent difference blends entire content — isolated title/category in difference div, moved description/details to sibling overlay element, synced position via JS rAF |
| 36 | About page first panel start position error | Dynamic import panel skeleton width mismatch (ErdPanel: 350vw→100vw) + removed GSAP transform/animate reset in strict mode cleanup + initializedRef guard |
| 37 | Plate inline code cursor jump | CodePlugin affinity override ("directional") defeated default ("hard") mark boundary handling — removed override to fix |
| 38 | Admin table row borders cut off mid-scroll on mobile | Each of `.row`/`.tableHeader`/`.bulkBar` is an independent grid container, so track expansion is computed per-row — headers missing `col.className` left their 1fr title track unexpanded while rows grew to 280px min-width, creating a width mismatch. Applied `col.className` to header + added `.tableInner` wrapper (`display: flex; width: max-content; min-width: 100%`) to stretch all children to the widest row's width, restoring border continuity |
| 39 | Page transition stuck at hold + skeleton exposed after morph | DetailLayout's hero motion called `endTransition` from `onAnimationStart`, but with `initial===animate` (opacity:1) framer-motion treats it as a no-op and never fires the callback → hold phase persists forever. Morph also finished before the new page mounted, exposing the Suspense fallback. Fix: replaced `onAnimationStart` trigger with a `useEffect`-based call, kept the backdrop fullscreen during hold (hides the skeleton), added `SAFETY_MS=5000` backstop + `endRequestedRef` short-circuit for fast cached mounts |
| 40 | CSS Grid masonry — `grid-template-rows` alone leaves gaps when card heights vary | A bento mixing wide / banner / square / portrait variants forces row tracks to the tallest card, leaving empty cells. Fix: `grid-auto-rows: 1px` shreds tracks to a fine unit, JS measures each card's `firstElementChild.scrollHeight` and assigns `grid-row: span N` (N=ceil(h/rowUnit)). `grid-auto-flow: dense` backfills small cards into gaps. ResizeObserver + image `onLoad` recalculates |
| 41 | Sticky filterBar IntersectionObserver — 1px drift against sidebar widgets | A static `rootMargin` desyncs from the component's dynamic sticky `top` (`top: var(--nav-height)`), causing the filter bar to anchor a frame off from sidebar widgets like Popular Posts. Fix: read `getComputedStyle(filterBar).top` and feed it back as `rootMargin: -${stickyTop+1}px 0px 0px 0px`, re-registering the observer on `resize` so PC ↔ mobile nav-height changes stay aligned |
| 42 | Series Deck — hover unfold "disappears then reappears" | Using CSS `transition-delay` for stagger means hover-out cancels every layer's delay simultaneously, collapsing them in unison. Combined with an overshoot ease (0.34, 1.45) the deck looked pre-spread. Fix: `setTimeout(setOpen, 800)` JS-state trigger + `cubic-bezier(0.4, 0, 0.2, 1)` standard ease + explicit per-layer `calc(1s + (var(--deck-i) - 1) * 0.4s)` stagger so each layer fully unfolds before the next begins |
| 43 | Deck spread — `setPointerCapture` blocks child clicks + flicker on hit-area gap | When the parent captures the pointer, clicks on unfolded deck layers get absorbed by the parent and never reach SeriesCard. Pushing the next card via `margin-right` only moves visuals — the actual hit area stays the same, so the cursor passing between layers ends hover and triggers flicker. Fix: drop `setPointerCapture` entirely and listen on document-level `pointermove`/`pointerup` with a click-suppression flag; add an `::after { width: <unfolded width> }` pseudo to extend the hit area to the last layer |
| 44 | HTML5 drag suppresses `pointermove` — custom cursor freezes and its type keeps flickering mid-drag | Browsers suspend `pointermove` at the system level during HTML5 drag and surface `dragover` instead — CursorTrail froze, and hit-test made the cursor type ping-pong between every element passed under it. Fix: forward `dragover` into `handleMouseMove` to restore the coordinate stream + lock `cursorType="grab"` on `dragstart` + early-return in `runHitTest` while dragging |
| 45 | Working around HTML5 D&D quirks — chip reorder switched to pointer events | `draggable={dragId === id}` toggling didn't sync with React batching (drags wouldn't start), front-to-back reorder asymmetrically failed, and source unmount on a paginated list cancelled the drag. Fix: handle `pointerdown` → document `pointermove`/`pointerup` with `elementFromPoint` hit-test; on list edges call `apply()` to reorder the source itself into the adjacent page (so it stays mounted); skip `setPointerCapture` so child clicks survive |
| 46 | Navigation menu overlaps right actions on narrow viewports + indicator drifts behind menu while resizing | Absolute viewport-center pinning ignores left/right cluster widths → collision. After moving to flex, the indicator's `transition: left ... var(--duration-moderate)` lagged the menu by ~300ms during resize. Fix: `.navCenter { flex: 1; justify-content: center }` to center between logo and actions; on `resize` + `ResizeObserver(navCenter+nav)`, set `transition: "none"` inline so the indicator snaps frame-by-frame, then restore the transition after a 120ms debounce |
| 47 | Image fallback — React `onError` doesn't bind to `<img>` rendered via `dangerouslySetInnerHTML` | Synthetic events don't reach DOM injected via `dangerouslySetInnerHTML`; already-failed images don't re-fire `error`; dynamic content additions are missed by a one-shot `querySelectorAll`. Fix: `attachImageFallback(root)` — for every `<img>` in the container, `data-fallback-bound` gate + `addEventListener("error")` + immediate `complete && naturalWidth===0` check + MutationObserver to track newly added images, with `removeAttribute("srcset")` on swap to prevent srcset retries |
| 48 | Cover palette inside `.row { grid-template-columns: 1fr 1fr }` clipped past the viewport | `1fr` is shorthand for `minmax(auto, 1fr)` — if a child won't shrink, `min-width: auto` pins to intrinsic content size and the track balloons, breaking the 50:50 ratio. Fix: spell the tracks out as `minmax(0, 1fr) minmax(0, 1fr)` + `min-width: 0`. Mobile breakpoint also uses `minmax(0, 1fr)`, and `.palette` got `flex-wrap: wrap` + `max-width: 100%` so swatches wrap rather than overflow |
| 49 | ColorPicker popover anchors to the wrong spot — wrapper `<span>` collapses to 0×0 | When a render-prop trigger child uses `position: absolute` (stop handles on the gradient bar), the child leaves normal flow and the wrapper itself becomes 0×0 — every stop's popover resolves to the same coords. Fix: `updatePos` prefers **`firstElementChild.getBoundingClientRect()`** over the wrapper's rect, falling back to the wrapper only if the child rect is also zero — anchors correctly for both regular swatches and absolutely-positioned handles |
| 50 ★ | Anonymous comment edit/delete — client required password, server allowed bypass | The form blocks submission without a password, so users perceive password as the only auth. But the server's auth path was `password OR commenter_hash` — `curl`ing PATCH/DELETE with an empty password fell through to the hash path. `commenter_hash` was a 31-bit non-crypto hash AND included in public GET responses → ~30 min single-core brute-force to find a colliding `commenter_id` and impersonate. Fix: collapsed server-side auth to a single password path + `validatePassword` now rejects empty values. **Client-side enforcement is not server-side enforcement** + **OR-ing auth paths collapses your security floor to the weakest path** |
| 51 | Public `?all=true` returned all drafts via service-role bypass | `/api/posts` and `/api/works` shared the same route between admin and public traffic; on `?all=true` / `?trash=true` they swapped to `createAdminClient()` (RLS-bypass) without any auth gate. `curl …/api/posts?all=true` returned every draft. Fix: gated those flags behind `requireAuth()` + made single-row GET (`/api/posts/[id]`, `/api/works/[id]`) admin-only (public uses slug-based reads) + added a fail-closed admin gate in middleware as an extra layer. **Once you reach for the service-role client, RLS no longer protects you — auth is now route-code's job** |
| 52 ★ | Supabase auth subscription cleanup — returning from `.then()` is not a useEffect cleanup | Footer/Nav had `loadSupabaseClient().then(supabase => { ...; return () => sub.unsubscribe(); })` — looks like cleanup, isn't. React only sees a function the effect callback **directly** returns; the `.then()` return flows into the promise chain. Result: subscription lives forever, every remount stacks another listener. Fix: lift `subscription` to the effect's outer scope and assign inside `.then()`; add a `cancelled` flag so promises that resolve after unmount unsubscribe immediately. Same pattern existed in 4 files → extracted into `useIsAuthenticated({ subscribe? })` |
| 53 | TagCloud3D — `setPointerCapture` absorbs inner `<Link>` clicks so tag navigation never fires | Capturing the pointer on the rotating container redirects every subsequent pointer event to the parent, so child `<Link>` `click`s never reach the anchor. Drag-vs-click discrimination is still required, so the capture pattern can't simply be removed. Fix: drop `setPointerCapture` + track `pointermove`/`pointerup` on `document`; if the drag passed a 5px threshold, swallow the next `click` once via a capture-phase listener (`{ once: true, capture: true }`). Normal taps fall straight through |
| 54 | Space Grotesk `display: optional` permanently sticks to the fallback in the menu drawer that opens late | `optional` locks to the fallback (system sans) if the font misses a ~100ms post-render window — so the same session keeps showing fallback for any UI that mounts later. The mobile menu drawer is clicked open well outside that window, so it visibly differed from the rest of the page. Fix: switch to `display: swap + preload: true` — accept a brief FOIT in exchange for guaranteed swap on late-mounting UI |
| 55 | Tooltip's inline `z-index: 10001` floats above drawer/modal overlays | Hard-coding the z-index inline diverges from the token system (`--z-tooltip` 700, `--z-drawer` 800, etc.) — so opening a drawer didn't cover the tooltip, breaking the visual hierarchy. Fix: remove the inline value and let CSS resolve to `var(--z-tooltip)`; drawer/modal tokens stack above it, restoring correct layering |
| 56 ★ | "Popular post" was defined in 3 places, so PostsClient HOT badge · admin delete-protection · 90-day trash TTL referenced different posts | `lib/posts.ts`'s `popularIds`, the admin delete guard, and trash retention each carried their own scoring formula (`view + like*N + comment*M`). Changing a weight in one place silently broke the others — protection landed on different rows than the badge. Fix: extracted `src/lib/popularity.ts` with `scoreOf({view, like, comments})` + `getPopularPostIds(supabase, limit=5)`, exposed it via `/api/posts/popular-ids` (admin fetches on mount), and all three server-side paths now call the same function. **One fact, one place that computes it** — when the same concept is computed in N files, you actually have N different definitions that happen to agree today |
| 57 | "SortGroup" name boxed in a component that had already grown into tabs/filters/segmented controls | What started as a sort capsule was used in 9 places — admin tabs, filter rows, segmented controls. A narrowing name produces awkward code at every new site ("a tab pretending to be a sort") and tempts you to build a parallel component. Fix: `git mv SortGroup.tsx → SegmentedControl.tsx` + rename type (`SortItem` → `SegmentedControlItem`) + CSS module + migrate all 9 sites in one pass, adopting the iOS-standard name. **Component names should describe what it _is_, not where you _first_ used it — as adoption grows the original name keeps shrinking the abstraction** |
| 58 ★ | Admin works `sort_order` — partial shift can't clean up pre-existing `0`s and duplicates | The previous PATCH only shifted rows `>= N` by +1 to make room, so migration leftovers (`0`), concurrent-edit duplicates, and old gaps lived forever. Symptom: a row just "moved to top" surfaced second after refresh. Fix: every reorder mutation now **computes a final id array reflecting the new position and reassigns `sort_order` to `1, 2, …, N` across the whole table** in one transaction. For small-N domains (≤ hundreds), partial shift has the same code volume but no answer to "what about rows that were already broken?" — folding the **dense `1..N` invariant into every mutation's responsibility** removes the need for a separate cleanup script and converges the table from any starting state |
| 59 | No hover on touch — desktop-only interactions (hover glow / tooltip) vanish on mobile | `/posts/tags`'s related-tag halo + tooltip never fire on touch — `@media (hover: none)` only suppresses the trigger, leaving the information with nowhere to appear. **"No hover" and "small viewport" are independent dimensions** (iPad: large + touch, mirrored phone with mouse: small + mouse), so branching on viewport alone misfires. Fix: added `isTouch` (`pointer:coarse`) to `useIsMobile` and let components branch behavior explicitly — desktop keeps `mouseenter/leave` hover, touch slides up a bottom sheet on tap (description + related pills + "View posts for this tag" CTA, ESC / backdrop / X to close, body scroll lock). Separates discovery from commit with an explicit gesture instead of stuffing both into one tap |
| 60 | Cursor stays on `grab` over buttons inside a draggable row — innermost-intent rule was missing | Admin rows are fully `draggable` with small action buttons (preview / edit / delete) inside. `CursorTrail.runHitTest` matched `closest('[draggable]')` first and locked the cursor to `grab` over buttons too — the "Click" affordance never appeared. Fix: one new branch — when both a button and a draggable ancestor match, **and the draggable contains the button, the button wins** (`hitDraggable.contains(hitButton) → click`). Matches the user model "the closest interaction context wins" and generalizes to other nested cases (link-in-draggable, button-in-link). Blank row space still shows `grab` |
| 61 ★ | After absorbing page boilerplate into the shared layout, one area (the footer link) lost all styling — no error | Absorbed LikeButton / AdjacentNav / CommentSection / footer link / related content into `DetailLayout` as config props → footer rendered with zero CSS. JSX read `className={styles.footerNav}` but the rendered HTML had no `class` attribute. Cause: the `.footerNav` class lived only in the page modules, so `DetailLayout`'s `styles.footerNav` was `undefined`; React **silently drops `className={undefined}`** — no error, no warning, just no style. Fix: move the CSS into the layout module alongside the rendering. **CSS Module dot access returns undefined for absent classes + React silently drops undefined className** — together they form a silent failure especially common in extract-into-shared-component refactors |
| 62 | TSX parser misreads `typeof obj!.field[number]` — the `!` non-null assertion gets parsed as a JSX close tag | Writing `typeof project.teamMembers![number]` errors with "JSX element X has no closing tag". The parser loses the `<` / `!` lookahead between generic-type and JSX disambiguation; `.ts` accepts the same code, `.tsx` fails. Fix: lift into a local const (`const members = project.teamMembers ?? []; type X = typeof members[number]`) so the type expression has no `<`. **When the error reads "JSX element X has no closing tag" but the code contains no JSX**, the cause is almost always the parser mis-categorizing a non-JSX expression as JSX |
| 63 ★ | Per-character highlight inside a textarea — no overlay technique aligned, ended up replacing textarea with contenteditable | Native `<textarea>` can't style portions of its text. Mirror `<div>` overlay (transparent textarea text + visible mirror with `<mark>` over portion) hit four sync issues: (a) sub-pixel line-height drift (b) scrollbar gutter mismatch (c) macOS rubber-band overscroll (`scrollTop` doesn't change, `onScroll` doesn't fire) (d) IME composition mismatches. (c) is OS-level — `overscroll-behavior: none` is partial. Fix: replaced textarea with `<div contenteditable="plaintext-only">`. Per-character styling becomes native — no mirror needed. Caret offsets preserved via Range API, sync skipped during IME, plaintext-only blocks paste / Enter quirks. **"Visual artifacts drawn by the browser itself can't be synced from JS — replacing the element is cheaper than syncing around it"** |
| 64 ★ | System `ns-resize` cursor overrides the custom CursorTrail over a textarea's native resize handle — `cursor: none !important` doesn't catch it | The resize handle is part of browser chrome and the OS sets its cursor directly. `::-webkit-resizer { cursor: none }` is partial and inconsistent. Fix: drop a transparent overlay `<div>` over the native handle with `data-cursor="resizeV"` and a custom pointerdown/pointermove drag handler — the native cursor/resize logic never engages (the overlay catches the pointer first). The native grip visual stays (`resize: vertical` remains). **"Native visual + custom pointer"** pattern — borrow the native look, take over the interaction. Applies equally to scrollbars / select dropdowns / file inputs |
| 65 | CSS `var()` chains don't resolve through JS `getPropertyValue` — Canvas/Three.js texture background drifted from the design token | `getComputedStyle(document.documentElement).getPropertyValue("--bg-primary")` returns the raw string `"var(--color-neutral-50)"` when one token references another; feeding that to Canvas `fillStyle` yields black. Fix: create a temp `<div>`, set `style.color = "var(--bg-primary)"`, then read `getComputedStyle(tmp).color` — the browser follows the chain end-to-end and hands back an actual rgb value. Used when CylinderLayout's intro texture has to track the page's `--bg-primary` |
| 66 | CursorTrail "More" cursor wouldn't appear over R3F mesh regions — `data-more` only matches HTML | CursorTrail hit-tests for `[data-more]`, but R3F `<mesh>` lives inside the Canvas as a 3D primitive — no DOM. Fix: toggle `data-more` on the parent wrapper DOM element via the mesh's `onPointerEnter/Leave`. The HTML overlay above the canvas gets `pointer-events: none` to stop intercepting clicks, so the mesh `onClick` fires directly. From CursorTrail's side it's a plain DOM attribute toggle |
| 67 | Lenis `setInfinite(true)` alone caused a flicker at wrap points — solved by DOM duplication + manual scroll wrap | Lenis's native infinite mode resets scroll at the wrap point, but the viewport briefly empties for a frame. Fix: duplicate the sections into N=2 sets in the DOM (`Array(sets).fill(projects).flat()`) and, in a Lenis `onScroll`, when `scroll > intro + 1.5 * oneSet`, call `lenis.scrollTo(scroll - oneSet, { immediate: true })` to invisibly jump back to the middle of set 1. The user sees the same content, so the jump is imperceptible |
| 68 | works display number (#01) drifted from sort order — fixed by collapsing into a single source | DB had a dedicated `works.number text` column, so admin reorder updated only `sort_order` while `number` stayed put. The user-visible "#01" could disagree with actual order — a structural fault, not a sync bug. Fix: drop the column and derive in the mapper via `formatProjectNumber(sort_order)`. **If a displayed value can be derived from another column, don't store it** — eliminating the chance of drift beats writing sync logic |
| 69 | pg_cron job failures were silent — wrapper function catches EXCEPTION and inserts an admin notification | `cron.schedule('publish-scheduled', '* * * * *', $$ SELECT publish_scheduled() $$)` — if the inner function throws, cron just fails and waits for the next tick. The admin has no way to know publishes are broken. Fix: a `safe_publish_scheduled` PL/pgSQL wrapper that `PERFORM publish_scheduled()` inside an `EXCEPTION WHEN OTHERS THEN INSERT INTO admin_notifications (…)` block, capturing SQLSTATE / SQLERRM into metadata. `cron.schedule` is updated to call the wrapper |
| 70 | GitHub's 100MB file size limit — the 137MB intro video was rejected; solved via external hosting + a siteConfig URL | `git push` returned `error: GH001: Large files detected`. Git LFS has a 1GB/month free quota too. Fix: host the video on an external CDN and store the URL in `siteConfig.works.introVideoUrl`. Empty falls back to `/public/intro-bg.mp4` (gitignored, local-dev only). **Branching on user data (siteConfig) lets you swap assets without code changes** — friendlier than env vars because the admin UI can edit it directly |
| 71 ★ | ColorPicker mobile bottom sheet — page scrolls underneath while sheet is open; `body { overflow: hidden }` alone isn't enough | Mobile sheet open lock didn't catch the page underneath. Cause: the site runs on Lenis smooth scroll which animates `transform` in its own RAF loop — native body overflow lock doesn't touch Lenis's virtual scroll. Fix: call `useLenis().stop()` in the sheet open effect, restore with `start()` on cleanup. **A virtual-scroll library like Lenis is a separate channel from native overflow — you have to lock both for a modal to feel truly locked** (same pattern applied to CoverImagePicker and ColorPicker). |
| 72 | `<input type="number">` spinner clipped OKLCH 6-digit decimals like `0.2249`, and per-row widths drifted in the picker | Channel inputs (RGB / HSL / HSV / OKLCH) ended up different widths per row — visual noise. Fixing on the longest value (OKLCH C, `0.2249`, 6 chars) with `width: 88px` made shorter values (`100`) look empty. Fix: ① `clearable={false}` reclaims the 24px eraser slot, ② uniform `padding: var(--spacing-xs)` left/right, ③ `width: calc(7ch + var(--spacing-xs) * 2 + 2px)` — based on HEX `#ffffff` (7 chars) + 2px border. Shorter values left-align inside that fixed cell. Channel inputs, the format select, and the invalid-input shake animation (`@keyframes pickerShake`) all share the same width grid. |
| 73 ★ | Hero background opacity worked for video but not images — CSS `background-image: url()` can't be opacity-faded independently | After switching Hero background from video to an image, the opacity slider stopped doing anything. Cause: video used a `<video>` element where `opacity` works directly; the image path painted `background-image: url(...)` on the panel surface — `opacity` there fades the whole panel, not just the image. Fix: render the image with an `<img>` element matching the video pattern — `position: absolute; inset: 0; object-fit: cover` + `opacity: var(--_hero-bg-opacity)`. The panel CSS background now only carries color / gradient; the image is a sibling. Label `Video opacity` → `Background opacity`. **Where a CSS property's abstraction leaks (background-image vs `<img>`), the control surface has to split too**. |
| 74 | Navigation mobile — once navCenter goes `display: none`, navActions snaps to where the fixed logo sits, overlapping it | `.nav { justify-content: space-between }` is fine with 3 children, but on mobile only `.navActions` remains, so a single flex child aligns to flex-start — landing exactly where the fixed `.logoNavBar { left: var(--page-px) }` is. Fix: `@media (max-width: 768px) .nav { justify-content: flex-end }` — right-align on mobile only. The logo is `position: fixed` and outside the flex flow, but with navActions explicitly on the right the natural reading is "logo [space] buttons". **In containers that hold fixed-positioned siblings, the single-child branch of `space-between` needs its own justification rule**. |
| 75 ★ | highlight.js dies **only in the browser** — build, tsc and tests all pass | hljs `xml.js` defines tag names as `/[\p{L}_]/u`. Even with a modern browserslist, Next compiles node_modules against a conservative target and expands that into codepoint ranges — including **astral ranges (`\u{10000}-…`)**, a braced form unparseable without the `u` flag. hljs's `countMatchGroups` then re-parses the regex via `new RegExp(re.toString() + "|")` — **without flags** → SyntaxError. **It never reproduces under node** (which uses the original `\p{L}` + u flag); the expanded form exists only in the browser bundle, so verifying the DOM, the CSS, even the served chunks turns up nothing — only the console stack trace pins it. Plate catches the failure and silently falls back to plaintext, so the UI just shows "no colors". Fix: the reader and comments moved to **Prism**; the editor couldn't (Plate's code-block plugin takes a lowlight instance as its API), so the **grammar itself is patched** (strip astral escapes, drop the `u` flag — Plate ships the same workaround for python). Gotcha: `regex.concat()` returns **a string**, not a RegExp, so transforming only RegExp values fixes nothing. **A green `npm run build` must not be mistaken for a safety signal** — when the test environment (node) differs from the runtime (the browser bundle), bugs in that gap are invisible to tests by construction |
| 76 ★ | Comment markdown checkboxes rendered as plain bullets — DOMPurify stripped the `type` attribute, which isn't even a URL | DOMPurify tests an attribute's **value** against `ALLOWED_URI_REGEXP` unless the attribute is known URI-safe. `type` isn't in the default list, so `type="checkbox"`'s value failed `/^(?:https?:\|mailto:)/i` and was silently dropped → the hook judged it "not a checkbox" and removed the `<input>`, leaving only a bullet. Table `align` was dead for the same reason, so markdown table alignment was ignored wholesale. Listing them in `ALLOWED_ATTR` does nothing. Fix: `ADD_URI_SAFE_ATTR: ["type","checked","disabled","align"]`. **The allowlist and the value-inspection policy are separate axes** — when something is "allowed but disappears," suspect the filter is reading its value as a URL |
| 77 | Task list `:has()` — traps on both the under- and over-matching side | marked emits tight lists as `<li><input>` and loose lists (blank line between items) as `<li><p><input>`. `:has(> li > input)` alone misses the loose form and leaves bullets; collapsing to the descendant `:has(input)` removes **the parent list's bullets too** when a checkbox sublist sits inside an ordinary bullet list. Fix: spell out only the two direct paths — `:has(> li > input[type="checkbox"], > li > p > input[type="checkbox"])`. **With `:has()`, the combinator choice is the match scope** — enumerate every DOM shape the renderer actually produces and nail them down as direct paths |
| 78 | The global input reset stopped native checkboxes from being drawn at all | `input { border: none; background: none }` in `_base.css` wipes the UA defaults, so the checkbox has no surface to render on — `appearance: auto` alone doesn't help. Fix: `background: revert; border: revert` restores the UA styling (they're shorthands, so stylelint's `declaration-strict-value` doesn't apply). **`appearance: auto` only says "draw this natively" — it does not resurrect a background/border already erased by a reset** |
| 79 | Toolbar markdown insertion — the intended element doesn't appear on blank lines or with block syntax | GFM only parses a task list when **text follows** the `- [ ] ` marker, so pressing the checkbox button on a blank line yields a `<li>[ ]</li>` bullet. And `---` with text on the line above is a **setext h2**, not an hr. Fix: prefix actions carry a placeholder (on a blank line, fill example text and select it) + block inserts ensure a blank line above first. **An insert button must create the context in which the parser recognizes that syntax, not just drop a string** |
| 80 | Per-text `mix-blend-mode: difference` inside a Popover is incompatible with backdrop-filter | `backdrop-filter` / `isolation: isolate` establish a Backdrop Root that cuts what backdrop-filter can see, and a backdrop-filter's output is never offered to descendants/siblings as a blendable backdrop → per-text difference inside a popover is **impossible in principle**. Workaround: `filter: invert(1)` on content + `mix-blend-mode: difference` on the panel restores the color via `\|backdrop − (1−color)\|`. Ultimately glass (translucent + blur) became the default and difference remains a variant. **The two look like they read the same backdrop, but neither can be the other's input** |

## Deployment

### Vercel (Recommended)

1. Import the GitHub repo on [Vercel](https://vercel.com)
2. Add the same key-value pairs from `.env.local` to **Environment Variables**
3. Click **Deploy** — build settings are auto-detected

```
Required:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  NEXT_PUBLIC_SITE_URL         # Production domain (e.g. https://your-domain.com)
                               # Middleware uses this for CSRF Origin verification.
                               # Missing in production → admin mutations are all 403 (fail-closed).
                               # Dev can leave it unset.

Optional:
  UNSPLASH_ACCESS_KEY          # Cover Image — Unsplash
  PEXELS_API_KEY               # Cover Image — Pexels (Unsplash fallback)
  HUGGINGFACE_API_KEY          # Cover Image — AI (HuggingFace)
  NANOBANANA_API_KEY           # Cover Image — AI (NanoBanana)
  DEEPL_API_KEY                # Translation — DeepL
  GOOGLE_TRANSLATE_API_KEY     # Translation — Google
  GEMINI_API_KEY               # Translation + AI Summary — Gemini
  OPENAI_API_KEY               # AI Summary — OpenAI
  ANTHROPIC_API_KEY            # Translation + AI Summary — Claude
  GITHUB_TOKEN                 # giscus — public-repo read PAT for auto-loading Discussion categories
                               # (the admin Services tab secret takes priority; the giscus widget itself needs no token)
```

> Auto-deploys on every push to `main`. Preview deployments are created for each PR.

### Other Platforms

Any platform that supports Next.js can be used. See the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for details.

## Design System

CSS token 4-layer architecture, class naming conventions, specificity guidelines, and all styling rules are documented in **[docs/design-system.md](./docs/design-system.md)**.

### Overview

| Layer | Location | Prefix | Role |
|-------|----------|--------|------|
| Raw Tokens | `src/styles/tokens/` | `--color-*`, `--spacing-*`, etc. | Primitive values |
| Semantic Tokens | `src/styles/globals/_semantic.css` (Layer 2) | `--text-*`, `--bg-*`, `--border-*` | Meaning-based mapping (component-agnostic) |
| Component Tokens | `src/styles/globals/_semantic.css` (Layer 3) | `--button-h-*`, `--control-h-*`, `--button-p-*` | Component typing (a rail for consistency) |
| Context Tokens | Inside CSS Module | `--_*` | Component-scoped local variables |

**Class naming**: CSS Modules + camelCase (no BEM)
**Key rules**: Context tokens must reference global tokens / No var() fallbacks / No direct hex values
**Design system preview**: `/design-system` route

---

## Commit Convention

Follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Details: **[docs/commit-convention.md](./docs/commit-convention.md)**

---

<div align="center">

## License

[PolyForm Noncommercial License 1.0.0](./LICENSE)

Free to use, modify, and distribute, but **commercial use is prohibited**.

</div>
