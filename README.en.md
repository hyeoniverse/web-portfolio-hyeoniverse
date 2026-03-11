<div align="center">

English | **[한국어](./README.md)**

# Arc — Where Growth Takes Shape

A personal portfolio website built with Next.js 15, React 19, and TypeScript, featuring interactive animations powered by GSAP, Framer Motion, and Lenis.

[![License](https://img.shields.io/badge/license-PolyForm%20NC%201.0-d40063?style=flat-square)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)

<br />

<img src="public/docs/screenshots/pc/home-dark.png" alt="Home — Dark" width="100%" />

</div>

---

## Preview

### Dark / Light Theme

| Dark | Light |
|:---:|:---:|
| <img src="public/docs/screenshots/pc/home-dark.png" alt="Home Dark" width="100%" /> | <img src="public/docs/screenshots/pc/home-light.png" alt="Home Light" width="100%" /> |
| <img src="public/docs/screenshots/pc/works-dark.png" alt="Works Dark" width="100%" /> | <img src="public/docs/screenshots/pc/works-light.png" alt="Works Light" width="100%" /> |
| <img src="public/docs/screenshots/pc/posts-dark.png" alt="Posts Dark" width="100%" /> | <img src="public/docs/screenshots/pc/posts-light.png" alt="Posts Light" width="100%" /> |

<details>
<summary><strong>More — Profile / About / Work Detail / Design System</strong></summary>

| Dark | Light |
|:---:|:---:|
| <img src="public/docs/screenshots/pc/profile-dark.png" alt="Profile Dark" width="100%" /> | <img src="public/docs/screenshots/pc/profile-light.png" alt="Profile Light" width="100%" /> |
| <img src="public/docs/screenshots/pc/about-dark.png" alt="About Dark" width="100%" /> | <img src="public/docs/screenshots/pc/about-light.png" alt="About Light" width="100%" /> |
| <img src="public/docs/screenshots/pc/work-detail-dark.png" alt="Work Detail Dark" width="100%" /> | <img src="public/docs/screenshots/pc/work-detail-light.png" alt="Work Detail Light" width="100%" /> |
| <img src="public/docs/screenshots/pc/design-system-dark.png" alt="Design System Dark" width="100%" /> | <img src="public/docs/screenshots/pc/design-system-light.png" alt="Design System Light" width="100%" /> |

</details>

### Responsive — PC / Tablet / Mobile

| PC (1440px) | Tablet (768px) | Mobile (390px) |
|:---:|:---:|:---:|
| <img src="public/docs/screenshots/pc/home-dark.png" alt="Home PC" width="100%" /> | <img src="public/docs/screenshots/tablet/home-dark.png" alt="Home Tablet" width="100%" /> | <img src="public/docs/screenshots/mobile/home-dark.png" alt="Home Mobile" width="100%" /> |
| <img src="public/docs/screenshots/pc/works-dark.png" alt="Works PC" width="100%" /> | <img src="public/docs/screenshots/tablet/works-dark.png" alt="Works Tablet" width="100%" /> | <img src="public/docs/screenshots/mobile/works-dark.png" alt="Works Mobile" width="100%" /> |
| <img src="public/docs/screenshots/pc/posts-dark.png" alt="Posts PC" width="100%" /> | <img src="public/docs/screenshots/tablet/posts-dark.png" alt="Posts Tablet" width="100%" /> | <img src="public/docs/screenshots/mobile/posts-dark.png" alt="Posts Mobile" width="100%" /> |

---

## Tech Stack

| Category | Technology |
|:---|:---|
| Framework | ![Next.js](https://img.shields.io/badge/Next.js_15-000?style=flat-square&logo=nextdotjs&logoColor=white) (App Router, Turbopack) |
| Language | ![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white) |
| UI | ![React](https://img.shields.io/badge/React_19-61dafb?style=flat-square&logo=react&logoColor=black) |
| Styling | ![CSS Modules](https://img.shields.io/badge/CSS_Modules-1572b6?style=flat-square&logo=css3&logoColor=white) + CSS Variables |
| Animation | ![Framer Motion](https://img.shields.io/badge/Framer_Motion-e846ff?style=flat-square&logo=framer&logoColor=white) ![GSAP](https://img.shields.io/badge/GSAP-88ce02?style=flat-square&logo=greensock&logoColor=black) ![Lenis](https://img.shields.io/badge/Lenis-000?style=flat-square) |
| 3D | ![Three.js](https://img.shields.io/badge/Three.js-000?style=flat-square&logo=threedotjs&logoColor=white) ![R3F](https://img.shields.io/badge/React_Three_Fiber-000?style=flat-square&logo=threedotjs) ![Drei](https://img.shields.io/badge/Drei-000?style=flat-square) |
| Typography | Instrument Serif, Space Grotesk, JetBrains Mono (30+ category presets + direct Google Fonts input in admin settings) |
| Backend | ![Supabase](https://img.shields.io/badge/Supabase-3ecf8e?style=flat-square&logo=supabase&logoColor=white) (PostgreSQL, Auth, Storage) |
| Editor | ![Tiptap](https://img.shields.io/badge/Tiptap-1a1a2e?style=flat-square) (WYSIWYG) + Markdown |
| AI Image | NanoBanana / Hugging Face (selectable in settings) |

## Key Features

- **Infinite Scroll Loop**: Infinite cycling scroll combining Lenis smooth scroll with a Bridge Section
- **Mouse Parallax**: Mouse-reactive parallax based on Framer Motion useSpring/useTransform
- **Scroll-Triggered Animations**: Scroll-based entrance animations using GSAP ScrollTrigger
- **Scroll Velocity Parallax**: Image parallax driven by scroll speed via Lenis velocity
- **Mix-Blend Navigation**: Auto-inverting navigation using mix-blend-mode: difference. Supports image logos — short/full logo configurable via image URL, with separate dark mode logo URL. Logo color and glitch effect controlled from Admin
- **StaggerText**: A component that animates characters sequentially on hover

<p align="center">
  <img src="public/docs/screenshots/pc/home-dark.png" width="49%" alt="Home — Dark" />
  <img src="public/docs/screenshots/pc/home-light.png" width="49%" alt="Home — Light" />
  <br />
  <sub>Home — Infinite Scroll Loop · Mouse Parallax · Mix-Blend Navigation · StaggerText</sub>
</p>

- **Works Horizontal Gallery**: GSAP-based horizontal scroll gallery with bidirectional infinite scroll wrapping, in-flow intro placement, and language-switch layout stabilization
- **3D Scroll Torus**: A 3D metallic torus built with Three.js (React Three Fiber) that rotates and moves along a Lissajous curve path in sync with scroll. Tracks cumulative Lenis scroll, theme-specific materials, and mobile optimization (simplified geometry, reduced scale). Supports touch/click repulsion interaction on mobile (manual window event tracking due to Canvas pointer-events blocking)
- **Breakpoint Guard**: Automatically remounts page content when the viewport crosses breakpoints (768px, 1024px) to reinitialize layout-dependent animations like GSAP/ScrollTrigger. Flicker-free resize transitions with an R3F-compatible transition overlay
<p align="center">
  <img src="public/docs/screenshots/pc/works-dark.png" width="49%" alt="Works — Dark" />
  <img src="public/docs/screenshots/pc/works-light.png" width="49%" alt="Works — Light" />
  <br />
  <sub>Works — Horizontal Gallery · 3D Scroll Torus · Breakpoint Guard</sub>
</p>

- **About Horizontal Scroll**: GSAP-based horizontal scroll on the About page via a `useHorizontalScroll` hook integrated with the Webflow page (desktop); automatically stacks vertically on mobile
- **Bundle Optimization**: Replaced react-icons with inline SVGs, split Three.js demo via dynamic import — reducing About page First Load JS from 326kB to 272kB. Further code-split 6 heavy panels (Architecture, UserFlow, Backend, ERD, CodeHighlights, Troubleshooting) via `next/dynamic` and switched data imports from barrel to direct files, yielding an additional 62% JS reduction on the page. Removed unused npm packages and deleted unused large images (22MB)
- **Performance Optimization**: Converted Hero/marquee animations from Framer Motion/GSAP to CSS animation (compositor thread), changed useMagneticRepel to ref-based direct DOM manipulation (removes 60fps re-renders), Three.js FrontSide rendering + geometry dispose, deferred AudioContext initialization
- **Posts (Blog)**: Supabase-backed post creation/management system. List page uses Server Components for SSR initial data with ISR (`revalidate = 60`) for CDN caching. Detail page statically generated at build time via `generateStaticParams` (`revalidate = 300`). After admin login, articles can be written with a Markdown/Rich Text (Tiptap) switchable editor. Images can be aligned (left/center/right) and resized (25%/50%/75%/100%) after insertion. Supports guest threaded replies with dual authentication (commenter_hash + bcrypt password) for editing/deleting. The same comment system is available on Work detail pages. Search, tag filter, cover image, and view count tracking. Per-page post count selector (10/20/50). PostCard supports pinned badge (image overlay) and langHint (shown on the right in English mode when only Korean is available). Detail page translation banner redesigned (left border line + icon + i18n key)
- **Series**: Groups posts into series and publishes them in order. A series is a subcategory — each series belongs to one category. On the post list, a "Posts" / "Series" view toggle lets you browse the series card grid separately; selecting a category shows only the series in that category. Clicking a series card filters to show only its posts. On the post detail page, a series navigation (prev/next post + collapsible full list) is shown. Admin supports series CRUD + category management
<p align="center">
  <img src="public/docs/screenshots/pc/posts-dark.png" width="49%" alt="Posts — Dark" />
  <img src="public/docs/screenshots/pc/posts-light.png" width="49%" alt="Posts — Light" />
  <br />
  <sub>Posts — Blog · Series · Banner Slider · Filter Bar</sub>
</p>

<p align="center">
  <img src="public/docs/screenshots/pc/about-dark.png" width="49%" alt="About — Dark" />
  <img src="public/docs/screenshots/pc/about-light.png" width="49%" alt="About — Light" />
  <br />
  <sub>About — Horizontal scroll tech documentation (15 panels)</sub>
</p>

- **IP-Based Likes**: Likes supported on Posts, Works, and comments (post/work). A single `likes` table distinguishes entity types via `target_type` ('post'|'work'|'post_comment'|'work_comment'), with IP-based `UNIQUE` constraint preventing duplicates and handling toggles. Posts sync to a `posts.like_count` cache column for list query performance
- **Cover Image Picker**: Choose cover images for posts, series, and works in 3 ways — 16 preset gradients (rendered via Canvas API), Unsplash keyword search, and AI image generation (NanoBanana / Hugging Face, selectable). All images are stored in Supabase Storage
- **Works Admin CRUD**: Portfolio work management backed by Supabase DB. Create/edit/delete works, toggle publish status, and reorder from Admin. Single content editor (Markdown/Rich Text switchable) + template insertion for writing project descriptions. 8 template sections: Overview, Background, Key Features, Architecture, Challenges, Solutions, Results, Lessons Learned. Supports bilingual (EN/KO), tech stack, gallery images, and team members (name, role in EN/KO, URL). Detail page auto-parses `##` headings from content to generate TOC. Falls back to static data (`data/projects.ts`) when DB is not connected
<p align="center">
  <img src="public/docs/screenshots/pc/work-detail-dark.png" width="49%" alt="Work Detail — Dark" />
  <img src="public/docs/screenshots/pc/work-detail-light.png" width="49%" alt="Work Detail — Light" />
  <br />
  <sub>Work Detail — Project detail · Auto-generated TOC · Gallery · Comments</sub>
</p>

- **Profile Admin**: Admin editing of profile data (career, skills, philosophy, approach, certifications, awards). Managed under Settings > Content > Profile subtab. Stored as JSONB in the `site_settings` table. Falls back to static data when DB is not connected. Period input uses the structured `DatePeriod` type (`{ start, end?, ongoing?, format }`) and a `PeriodPicker` component — supports display format selection (year/year.month/year.month.day), period/ongoing toggle, and spinner/calendar popover picker. Legacy format data (`year: string`, `period: LocalizedText`) is auto-migrated on load
- **BGM & Audio Source Management**: Upload (audio file, 10MB limit) and replace BGM files from Admin Settings > General. Footer displays audio credits (track name, artist, YouTube link). Default values set in `site.config.ts` with DB override support. BGM is not played if the URL is empty
- **Visitor Statistics**: IP+date-based daily and cumulative visitor counter. Displayed in real-time in the Footer
- **Admin Dashboard**: Admin system backed by Supabase Auth. Post/work CRUD, publish/unpublish toggle, image upload (Supabase Storage). Layout-level authentication protects `/admin` routes; unauthorized access shows an access denied page. Login page with i18n support, remember email, and shared Input/Checkbox components. Admin badge + admin email displayed in navigation. Delete confirmation modal requiring title input, publish status toggle checkbox. Post list supports sorting (newest/oldest/popular) + category/series filter + reset. Work list supports sorting (newest/oldest/name) + category/year filter + reset. Common filter bar layout consolidated into AdminListShell
- **Site Content Management**: Admin Settings manages 5 tabs (General, Content, Appearance, Services, Account). General tab manages brand (logo text/image URL/dark mode logo/logo color/glitch effect on/off), SEO, footer copyright, BGM upload, and audio credits (track name/artist/URL). Input fields include hints (placeholder + description text) to explain each setting. Content tab uses side navigation with Home/Profile/About/Posts/Works subtabs. Hero copy, About intro, Services, Marquee, Works intro, and Profile content are all editable in EN/KO. Services tab stores/manages API keys (environment variables) in DB and allows selecting a translation provider (DeepL/Google/Gemini). Account tab supports admin email/password change (password confirmation modal). Settings save broadcasts to other tabs via BroadcastChannel for auto-refresh. Uses `site.config.ts` as defaults with DB override support
- **Auto Translation**: When switching languages in the editor, if the target language is empty, auto-translation is triggered. Choose from DeepL API Free (default), Google Cloud Translation, or Gemini 2.0 Flash in Settings. Re-translate button for full/individual field re-translation. Language toggle is blocked during translation to prevent duplicate requests
- **Bilingual Category Management**: Posts and Works categories managed as `{ ko, en }` bilingual pairs. Add/delete/drag-reorder in Admin Settings > Content tab. A modal for bulk reassignment of posts (by series or individually) when deleting a category. Stores `ko` value in DB with automatic compatibility for legacy `string[]` format (normalization). Public pages display using `CategoryLabel` component and `translateCategory()` utility matching the current language. Bilingual labels also supported in editors (PostEditor, WorkEditor, SeriesEditor)
- **Series Edit Page**: Clicking a series card in the Posts admin page navigates to a dedicated edit page (`/admin/posts/series/[id]/edit`). Edit title/description/cover image/category/publish status in the AdminEditorShell layout. Cover image selectable via CoverImagePicker (preset/Unsplash/AI). Supports displaying, reordering, and unlinking posts within a series. New series creation also handled via a dedicated page (`/admin/posts/series/new`). Settings series list is paginated at 5 per page
- **Editor Revision History**: On autosave in Posts/Works editors, the entire form is permanently stored as a JSONB snapshot in the `revisions` DB table. Revision history persists across tab closings and different devices. List queries exclude snapshots for lightweight loading; detail view lazy fetches. Shows diff with the current form (LCS-based line comparison), with a Revert button to restore to initial state. Individual revision deletion supported (list and detail views). Detail view also diffs meta items like category, tags, and series. Skips saving if identical to the previous snapshot (deduplication). Auto-cleans when exceeding 50 revisions per entity
- **CTA Resume Download**: A resume download button is shown in the Home page CTA area. Upload a PDF (5MB limit, Supabase Storage) and edit button text in EN/KO from Admin Settings. Button is hidden if `resumeUrl` is empty
- **Social Links Management**: Social icons (GitHub, LinkedIn, Blog, X, Instagram, YouTube, Behance, Dribbble, Custom) shown in the CTA area. Reorder, add, and delete (max 6) from Admin Settings. Automatically compatible with both `socialLinks` array and legacy `social` object formats
- **Carousel (default / cylinder)**: Shared Carousel component. Supports default mode (CSS opacity transition, all slides rendered simultaneously) and cylinder mode (3D perspective, all slides rendered simultaneously + offset-based placement). autoPlay, pauseOnHover, arrows, dots, loop
- **Posts Banner Slider**: Displays pinned posts as banners. 4 layouts (fullwidth/split/cards/ticker) + 4 overlay styles (editorial/minimal/cinematic/magazine) + 2 transition modes (default/cylinder). Split/Ticker use reel-based infinite loop animation (cloned slides + translateX/Y jump). Banner slides display multilingual langHint (shown in English mode when only Korean is available). Selectable in Admin Settings
- **Posts Filter Bar**: Category collapse/expand (+N more), hover indicator animation (layoutId), sticky state detection (IntersectionObserver), filter bar hide/show + auto-collapse based on scroll direction, content area blur effect when categories/tags expand (same technique as ContactDrawer)
- **Tooltip & Translation Tooltip**: General-purpose Tooltip UI component (`<Tooltip>`) and translation tooltip component (`<T>`). Rendering text with `<T k="key" />` shows the opposite-language translation as a tooltip on long hover (600ms). If both translation and description tooltips are present, they are combined in one bubble with a line break. `noTooltip` prop disables the internal tooltip when used alongside an external Tooltip. Uses createPortal + position: fixed to avoid stacking context issues; mobile touch toggle (tap to show → auto-hide after 2s). Applied to navigation links (page description tooltip), language/theme/sound buttons (feature description tooltip), CTA buttons (combined translation + description tooltip), and Works bubbles (long hover navigation description tooltip)
- **Posts i18n & Sort Capsule**: Moved all hardcoded text on the Posts page to locale files (`postsPage` section). Changed sort UI from a Select dropdown to a capsule-style segment control (Framer Motion layoutId animation)
- **Footer Sliding Indicator**: The same sliding indicator as Navigation applied to Footer links. On hover, ►◀ arrows move to the hovered link along with the indicator. `useLayoutEffect` + `ResizeObserver` + `document.fonts.ready` improve indicator position accuracy. Admin entry link shown in Footer when authenticated (public footer: nav links, minimal footer: inline on view count line). Design System entry added to Admin footer (opens in new tab)
<p align="center">
  <img src="public/docs/screenshots/pc/profile-dark.png" width="49%" alt="Profile — Dark" />
  <img src="public/docs/screenshots/pc/profile-light.png" width="49%" alt="Profile — Light" />
  <br />
  <sub>Profile — Career · Skills · Philosophy · Certifications · Awards</sub>
</p>

- **Design System Preview**: View tokens/components/banner layouts at the `/design-system` route. Accessible from Admin Settings Appearance tab, About page Design System panel, and CreditsFooter (panel). Includes Tooltip/T component section, Select component section, PeriodPicker section, Gradient Tokens section, and a 3-phase scroll animation system (Phase 1: hidden → Phase 2: sequential entrance → Phase 3: whileInView scroll-based enter/exit). Supports directional stagger: staggerItemX (enter left→right / exit right→left), staggerItem (top→bottom)

<p align="center">
  <img src="public/docs/screenshots/pc/design-system-dark.png" width="49%" alt="Design System — Dark" />
  <img src="public/docs/screenshots/pc/design-system-light.png" width="49%" alt="Design System — Light" />
  <br />
  <sub>Design System — Token preview · Component showcase · Banner layouts</sub>
</p>

<details>
<summary><strong>Security</strong></summary>

Multi-layer security validation is applied to all public API endpoints.

| Security Layer | Implementation | Scope |
|------------|-----------|----------|
| **SQL Injection Prevention** | Supabase parameterized queries (prepared statements) | All DB queries |
| **XSS Prevention** | React JSX auto-escaping + server-side HTML tag stripping (`<[^>]*>` removal) + control character removal | All user input |
| **Input Validation** | UUID format validation, length limits, email format validation, enum type validation, category whitelist validation | All public APIs |
| **Authentication** | Dual comment authentication (commenter_hash + bcrypt password), admin comment server-side Supabase Auth re-verification | Comment edit/delete, admin |
| **RLS** | Supabase Row Level Security policies | All tables |
| **Route Protection** | Layout-level Supabase Auth session check + access denied page | `/admin/*` |
| **Duplicate Prevention** | IP-based UNIQUE constraint | Likes, visitor statistics |
| **Password Security** | bcrypt (salt round 10), 72-byte limit, minimum 2 characters | Comment passwords |
| **Category Validation** | Server-side whitelist validation — only categories registered in site settings are allowed | Posts, Works, Series |
| **Secret Management** | API keys stored in DB, `SUPABASE_SERVICE_ROLE_KEY` server-side only, only `NEXT_PUBLIC_` prefixed keys exposed to client | Environment variables, API keys |

**Server-Side Input Sanitization (`commentValidation.ts`):**

| Function | Validation |
|------|----------|
| `isValidUUID()` | UUID v4 regex format validation |
| `sanitizeContent()` | HTML tag stripping + control character removal + 2000-character length limit |
| `validatePassword()` | Minimum 2 characters, bcrypt 72-byte upper limit |
| `validateEmail()` | RFC format validation, 254-character limit, lowercase normalization |
| `validateNickname()` | HTML tag stripping + control character removal + 50-character limit |

**Validated API Endpoints:**

| Endpoint | Validation |
|-----------|----------|
| `POST/PATCH /api/comments` | UUID, content (2000 chars, HTML strip), nickname (50 chars), password (72B), email (254 chars) |
| `POST/PATCH /api/work-comments` | UUID, content (2000 chars, HTML strip), nickname (50 chars), password (72B), email (254 chars) |
| `DELETE /api/comments/[id]` | UUID format validation |
| `DELETE /api/work-comments/[id]` | UUID format validation |
| `POST /api/comment-likes` | UUID, comment_type enum validation |
| `GET/POST /api/posts/[id]/like` | UUID format validation |
| `GET/POST /api/works/[id]/like` | UUID format validation |
| `POST/PATCH /api/posts` | Category whitelist validation |
| `POST/PATCH /api/works` | Category pair (ko/en) whitelist validation |
| `POST/PATCH /api/series` | Category whitelist validation |
| `POST /api/contact` | Name (100 chars), email format/length, message (5000 chars) |
| `POST /api/translate` | Text (2000 chars), targetLang enum |


</details>

<details>
<summary><strong>DB Design Decisions</strong></summary>


### Unified Likes Table: `likes`

All likes (posts, works, post comments, work comments) are distinguished by `target_type` in a single `likes` table.

**Alternatives considered:**

| Approach | Pros | Cons |
|------|------|------|
| **Single table** (current) | Single Source of Truth, one UNIQUE constraint covers all deduplication, adding a new entity only requires adding a CHECK value | `target_type` has 4 values |
| **Fully separate** (post_likes, work_likes, ...) | Simple queries | Too many tables, duplicated schema |
| **2 tables** (likes + comment_likes) | Separates content/comment concerns | Distributed sync logic, increased table count |

**Rationale:** A single `UNIQUE(target_type, target_id, ip)` blocks duplicates for all entities at the DB level. Comment likes are queried with real-time `COUNT(*)`, and only Posts sync to the `posts.like_count` cache column for list performance. With proper indexes, there is no performance difference up to thousands of records, so correctness and simplicity are prioritized.

### Denormalized Count Caching: `posts.like_count`

The `likes` table is the **source of truth** for likes, and `posts.like_count` is a **cache column** for list query performance.

| Entity | Count Method | Rationale |
|--------|------------|------|
| **Posts** | `posts.like_count` cache column sync | Display instantly in list view without JOIN |
| **Works / Comments** | Real-time `COUNT(*)` query | Count not needed in list view, only queried on detail pages |

**Rationale:** Portfolio sites have a read >> write ratio. Only Posts display like counts in the list view, so a cache column is needed there; real-time queries are sufficient for the rest.

### Editor Revision History: `revisions`

A polymorphic table that permanently stores the entire form as a JSONB snapshot on autosave in the Posts/Works editors.

**Alternatives considered:**

| Approach | Pros | Cons |
|------|------|------|
| **Separate DB table** (current) | Persists across devices/tabs/sessions, auto-cleanup per entity, diff comparison available | DB write on every autosave |
| **sessionStorage** (previous) | Instant access, no DB load | Lost when tab is closed, not shareable across devices |

**Rationale:** Since this is used by a single portfolio admin, DB writes at autosave frequency (5-second debounce) are negligible. Cross-device/tab/session revision sharing and detailed diff-based comparison are more important. `entity_type` CHECK column distinguishes posts/works in a single table; snapshots are excluded from list queries for lightweight loading. JSON.stringify hash comparison prevents duplicate snapshot saves; meta items like category, tags, and series are also shown in diffs in detail view.

### Anonymous Comment Dual Authentication

Edit/delete permissions in the comment system (no login required) are verified via **2 paths**:

| Auth Path | Storage | Persistence | Use Case |
|-----------|----------|--------|------|
| `commenter_hash` | Browser localStorage UUID → SHA-256 | Permanent in the same browser | Auto-authentication (no password input required) |
| `password_hash` | bcrypt (salt round 10) | Permanent as long as user remembers | Authentication from a different device/browser |

**Why both are needed:** With only `commenter_hash`, editing is impossible after changing browsers. With only `password`, input is required every time. Using both provides auto-auth in the same browser and a password fallback in other environments, securing both UX and security.

### Comment System Features

| Feature | Description |
|------|------|
| **Nickname Shuffle** | Random emoji+name combination, changeable via shuffle button |
| **Reply Email Notification** | If an email is entered (optional) when posting a comment, a reply notification is sent (`notify_email` column) |
| **Admin Comment** | Post comments with an Admin badge without a password when logged in; server-side Supabase Auth re-verification |


</details>

<details>
<summary><strong>User Flow</strong></summary>


### Visitor Flow

```
Home → Works gallery (horizontal scroll) → Work detail (like)
     → Posts list (search/tag filter) → Post detail (like/comment)
     → Profile → About (tech documentation)
```

- **Works**: Browse projects in the horizontal scroll gallery and leave IP-based likes on detail pages
- **Posts**: Filter blog posts by tag/search. Selecting a category shows that category's series as book-shaped cards; clicking a series filters to show only its posts. On detail pages, leave likes and guest comments (dual auth: browser UUID + password); series navigation (prev/next post) is shown for posts in a series
- **About**: Navigate 15 panels horizontally (project overview, user flow, architecture, features, design concept, development process, tech stack, backend, ERD, code highlights, troubleshooting, security). The UserFlow panel visualizes 9 flows (Visitor, Posts, Works, Profile, Contact, Comment, Admin/Settings, Admin/Settings/Appearance, Admin/Posts·Works) with tabs + SVG diagrams; the ERD panel displays DB table relationships interactively; the Security panel visualizes 8 security layers (SQL Injection, XSS, Input Validation, Dual Auth, RLS, Route Protection, Duplicate Prevention, Secret Management)

### Admin Flow

```
Direct access to /admin → Supabase Auth login → Settings redirect
→ Write post (Markdown/Rich Text switch) → Select cover image (preset/Unsplash/AI) → Select series (optional) → Publish
→ Works management (/admin/works) — create, edit, delete, publish/unpublish toggle, reorder
→ Site settings (/admin/settings) — General (brand/logo customization, SEO, footer, BGM), Content (Home/Profile/About/Posts/Works subtabs), Appearance (theme, typography, date picker style), Services (API key management, reveal original after password confirmation), Account (email change pending management, password policy, security notification emails)
→ Settings conflict detection — when code defaults change, visualizes diff per hunk in a modal comparing against DB-saved values; checked items are auto-applied on save (deepEqual comparison regardless of JSON key order)
```

- Access via direct URL only — no login button
- Layout-level Supabase Auth session validation — redirects to `/admin/denied` access denied page if unauthenticated


</details>

## Getting Started

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the result.

---

<details>
<summary><strong>Supabase Setup Guide</strong></summary>

Supabase project setup is required to use the Posts feature.

### 1. Set Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Cover Image Picker — Unsplash (optional)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Cover Image Picker — AI Generate (set only the key for your chosen provider)
# The key used depends on the aiCover.provider value in site.config.ts
HUGGINGFACE_API_KEY=hf_...          # provider: "huggingface"
NANOBANANA_API_KEY=your_key         # provider: "nanobanana"

# Translation — set only the key for your chosen provider
# The key used depends on the translation.provider value in site.config.ts (default: deepl)
DEEPL_API_KEY=your_deepl_key                   # provider: "deepl" (default)
GOOGLE_TRANSLATE_API_KEY=your_google_key        # provider: "google"
GEMINI_API_KEY=your_gemini_key                  # provider: "gemini"
```

**How to find your values:**

1. [Supabase Dashboard](https://supabase.com/dashboard) → Select your project
2. **Settings** → **API** tab
3. `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
4. `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

> **Warning**: The `service_role` key bypasses RLS and must never be exposed to the client. `SUPABASE_SERVICE_ROLE_KEY` is used server-side only, without the `NEXT_PUBLIC_` prefix.

### 2. Create Database Tables

The [`supabase/setup.sql`](supabase/setup.sql) file contains all table creation statements + RLS policies.

Copy the file contents into the Supabase Dashboard → **SQL Editor** and run it all at once.

**Tables created (10):**

| Table | Purpose |
|--------|------|
| `site_settings` | Site settings + profile data + secrets/API keys (JSONB) |
| `series` | Blog series |
| `posts` | Blog posts (unique number via post_number sequence column) |
| `comments` | Post comments (threaded replies, dual auth: commenter_hash + password) |
| `likes` | Likes (unified for posts/works/comments, distinguished by target_type, IP deduplication) |
| `works` | Portfolio works (includes team_members jsonb) |
| `site_visits` | Visitor statistics (1 visit per IP+date) |
| `work_comments` | Works comments (threaded replies, dual auth) |
| `admin_notifications` | Admin notification log |
| `revisions` | Editor revision history (shared for posts/works, JSONB snapshot) |

> Uses `IF NOT EXISTS` so existing tables are skipped. Missing columns in existing deployment DBs (commenter_hash, updated_at, etc.) are safely added via `ALTER TABLE ADD COLUMN IF NOT EXISTS` in the migration section at the bottom of the file.

> **Works without Supabase**: If environment variables are not set, the app automatically falls back to static data from Works (`data/projects.ts`), Profile (`data/profile.ts`), and Settings (`config/site.config.ts`).

**Key API Endpoints:**

> **Posts API**: `GET/POST /api/posts`, `GET/PATCH/DELETE /api/posts/[id]`, `POST /api/posts/[id]/view`, `GET/POST /api/posts/[id]/like`
>
> **Series API**: `GET/POST /api/series`, `GET/PATCH/DELETE /api/series/[id]`
>
> **Works API**: `GET/POST /api/works`, `GET/PATCH/DELETE /api/works/[id]`, `GET/POST /api/works/[id]/like`
>
> **Comments API**: `GET /api/comments?post_id=`, `POST /api/comments`, `PATCH /api/comments` (edit), `DELETE /api/comments/[id]`
>
> **Work Comments API**: `GET /api/work-comments?work_id=`, `POST /api/work-comments`, `PATCH /api/work-comments` (edit), `DELETE /api/work-comments/[id]`
>
> **Comment Likes API**: `GET /api/comment-likes?comment_type=&comment_ids=` (bulk like status query), `POST /api/comment-likes` (toggle comment like)
>
> **Admin API**: `POST /api/admin/auth`, `GET/PATCH /api/admin/settings`, `GET/PATCH /api/admin/profile`, `GET/PATCH /api/admin/account`, `GET/PUT /api/admin/secrets`, `POST /api/admin/upload`, `POST /api/admin/translate`
>
> **Revisions API**: `GET /api/revisions?entity_type=&entity_id=` (list, snapshot excluded), `POST /api/revisions` (save + auto-cleanup when exceeding 50), `GET /api/revisions/[id]` (single item including snapshot), `DELETE /api/revisions/[id]`
>
> **Categories API**: `GET /api/categories` (Posts bilingual category list), `GET /api/works-categories` (Works bilingual category list)
>
> **Utility API**: `POST /api/translate` (public, Gemini single text), `POST /api/posts/reassign-category` (bulk category reassignment), `GET /api/fonts/search?q=` (Google Fonts autocomplete search)

### 3. Create Storage Bucket

For image, resume, and BGM uploads:

1. Supabase Dashboard → **Storage**
2. Click **New bucket**
3. Bucket name: `uploads`
4. Check **Public bucket** (to allow public URL access to files)
5. **Create bucket**

> The upload API organizes files by folder: `logos/`, `resume/`, `bgm/`, `covers/`, `images/`, etc.

**Storage Policy Setup:**

```sql
-- Only authenticated users can upload
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

-- Anyone can view (public bucket)
CREATE POLICY "Anyone can view uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');
```

### 4. Create Admin Account

Supabase Dashboard → **Authentication** → **Users** → **Add user**:

- Enter Email and Password
- Check **Auto Confirm User** (skip email verification)

### 5. How to Log In as Admin

There is no login button on the site. The admin accesses it by directly entering the URL.

**Login:**

1. Go to `/admin/login`
2. Enter the email/password created in Supabase
3. Successful login → redirects to `/admin/settings`

**Features available after login:**

- `/admin/posts` — Post list (publish/unpublish status, hover preview, row numbers, thumbnails)
- `/admin/posts/new` — Write new post (Markdown ↔ Rich Text switch, auto-translate, re-translate, autosave + DB revision history + diff comparison + Revert)
- `/admin/posts/[id]/edit` — Edit existing post
- `/admin/posts/series/new` — Create new series
- `/admin/posts/series/[id]/edit` — Edit series
- `/admin/works` — Work list (table view, publish/unpublish toggle, sort order, thumbnails)
- `/admin/works/new` — Create new work (single content editor + templates, bilingual EN/KO, tech stack, gallery)
- `/admin/works/[id]/edit` — Edit existing work
- `/admin/settings` — Site settings (General, Content, Appearance, Services, Account — 5 tabs). General tab manages brand/SEO/footer copyright/BGM upload/audio credits (track name/artist/URL). Content tab has Home/Profile/About/Posts/Works sub-navigation. Services tab for email service, AI cover, reCAPTCHA settings and API key editing. Account tab for admin email/password change

### 6. Using the Cover Image Picker

In the post, series, or work editor, choose between **Upload** (direct upload) and **Choose cover** (picker) in the Cover Image / Main Image area.

Clicking **Choose cover** shows 3 tabs:

| Tab | Description | Required Environment Variable |
|----|------|----------------|
| **Presets** | Click any of 16 gradients/patterns — generates a 1200×630 image via Canvas API and uploads to Supabase | None |
| **Unsplash** | Search Unsplash photos by keyword → click to track download + upload to Supabase | `UNSPLASH_ACCESS_KEY` |
| **AI Generate** | Enter prompt + select style → generate image with AI → upload to Supabase | Provider-specific API key (see below) |

> **Note**: The Unsplash and AI Generate tabs each require an API key. The Presets tab works without any environment variables.

---

#### AI Generate — Provider Configuration

Select the service to use in `aiCover.provider` in `src/config/site.config.ts`:

```ts
aiCover: {
  provider: "huggingface",  // "nanobanana" | "huggingface"
},
```

| Provider | Model | Environment Variable | Cost | How to Get |
|----------|------|----------|------|-----------|
| **huggingface** | FLUX.1-schnell | `HUGGINGFACE_API_KEY` | Free (rate limited) | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → New token → Check `Inference Providers` permission |
| **nanobanana** | Gemini 2.5 Flash | `NANOBANANA_API_KEY` | ~$0.02/image (free credits on signup) | [nanobananaapi.ai/api-key](https://nanobananaapi.ai/api-key) → Sign up → Copy API Key |

**Configuration example (.env.local):**

```env
# Using Hugging Face (recommended — free)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Or using NanoBanana
# NANOBANANA_API_KEY=nb_xxxxxxxxxxxxxxxx

```

> After changing the provider, just set the corresponding key in `.env.local`. Keys for unused providers can be left empty.

---

#### Getting a Hugging Face API Key (Recommended)

1. Sign up at [huggingface.co](https://huggingface.co/join)
2. Go to [Settings → Access Tokens](https://huggingface.co/settings/tokens)
3. Click **Create new token**
4. Token type: Select **Fine-grained**
5. Token name: Any name (e.g., `portfolio-cover`)
6. Permissions:
   - **Inference Providers** → Check **Make calls to Inference Providers** (required)
   - All other permissions can be unchecked
7. **Create token** → Copy the `hf_...` format token
8. Add `HUGGINGFACE_API_KEY=hf_...` to `.env.local`

> Free accounts can make hundreds of calls per hour. More than sufficient for cover image generation.

#### Getting a NanoBanana API Key

1. Sign up at [nanobananaapi.ai](https://nanobananaapi.ai)
2. Go to the [API Key management page](https://nanobananaapi.ai/api-key)
3. Copy the API Key (no separate permission settings — one key for full API access)
4. Add `NANOBANANA_API_KEY=...` to `.env.local`

> Free credits on signup. ~$0.02/image thereafter. Asynchronous (request → polling), so response may take several to tens of seconds.

---

#### Getting an Unsplash API Key

1. Sign up at [Unsplash Developers](https://unsplash.com/developers)
2. **Your apps** → Click **New Application**
3. Accept guidelines and enter app name/description → **Create application**
4. Copy the **Access Key** from the created app page (not the Secret Key)
5. Add `UNSPLASH_ACCESS_KEY=...` to `.env.local`

> Demo apps are limited to 50 requests/hour. Production approval allows 5,000/hour.

**Authentication Flow:**

```
/admin/login (form submit)
  → POST /api/admin/auth
    → supabase.auth.signInWithPassword()
    → Set session cookie
  → Redirect to /admin/settings

On accessing /admin/*
  → Dashboard layout checks session
  → No session → /admin/denied (access denied page)
  → Session exists → normal access

On accessing /admin/login
  → Auth layout checks session
  → Already logged in → redirect to /admin/settings
```

> **Key point**: Regular visitors can only read posts + comment on `/posts`. Only the admin (the owner) accesses `/admin/login` by typing the URL directly. The login UI is not exposed as this is a portfolio site.


</details>

<details>
<summary><strong>Testing</strong></summary>


**Stack**: Vitest + React Testing Library + jsdom

```bash
# Run all tests
npm test

# Watch mode (re-runs automatically on file changes)
npm run test:watch
```

**Test coverage**:

| File                       | Tests | Description                                                                |
| -------------------------- | --------- | ------------------------------------------------------------------- |
| `cn.test.ts`               | 6         | Class name composition utility (`cn`)                                           |
| `date.test.ts`             | 6         | Date format utilities (`formatDate`, `getYear`)                            |
| `random.test.ts`           | 8         | Random element generation (`generateRandomElements`, `generateRandomDroplets`) |
| `mobileCheck.test.ts`      | 6         | Mobile layout detection (`checkMobileLayout`)                          |
| `renderHighlight.test.tsx` | 4         | Highlight markup transformation (`renderHighlight`)                          |

Config file: `vitest.config.ts`, test location: `src/__tests__/`

---


</details>

<details>
<summary><strong>Components</strong></summary>

<p align="center">
  <img src="public/docs/screenshots/pc/design-system-dark.png" width="100%" alt="Design System — Components Preview" />
  <br />
  <sub>All tokens and components are available at the <code>/design-system</code> page</sub>
</p>

### StaggerText

A component that splits text into individual characters and applies a sequential stroke animation on hover.

**Path**: `src/components/effects/StaggerText`

**Features**:

- On hover, characters transition to stroke (outline) sequentially from the first
- On hover-out, color fills back in reverse order from the last character (stroke maintained)
- Supports custom stroke color and width
- Delay time per character is adjustable

**Usage**:

```tsx
import StaggerText from "@/components/effects/StaggerText";

// Basic usage
<StaggerText>Hello World</StaggerText>

// Custom options
<StaggerText
  className={styles.title}
  strokeColor="var(--text-primary)"  // stroke color
  strokeWidth={2}                     // stroke width (default: 1px)
  delayPerChar={0.05}                 // delay per character (default: 0.04s)
  hoverEffect={false}                 // disable hover effect
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
| `delayPerChar` | `number`  | `0.04`         | Delay per character (seconds)        |
| `hoverEffect`  | `boolean` | `true`         | Whether to enable hover effect       |

---

### BreakpointGuard

A component that automatically unmounts/remounts page content when the viewport crosses breakpoint boundaries (768px, 1024px), reinitializing GSAP ScrollTrigger, RAF-based animations, etc.

**Path**: `src/components/common/BreakpointGuard.tsx`

**Features**:

- Detects viewport width changes and classifies into `desktop` (>1024px) / `tablet` (768-1024px) / `mobile` (<768px)
- Remounts children via the `key` prop when the breakpoint changes
- Providers (Theme, Language, Lenis) are placed above to maintain state

**Applied at**: `src/app/layout.tsx`

```tsx
// root layout.tsx
<ThemeProvider>
  <LanguageProvider>
    <LenisProvider>
      <Navigation /> {/* preserved */}
      <main>
        <BreakpointGuard>
          {" "}
          {/* remounts on breakpoint change */}
          {children}
        </BreakpointGuard>
      </main>
    </LenisProvider>
  </LanguageProvider>
</ThemeProvider>
```

**Breakpoints**:

| Breakpoint | Range          | Description                     |
| ---------- | -------------- | ------------------------ |
| `desktop`  | > 1024px       | Horizontal scroll layout     |
| `tablet`   | 768px - 1024px | Vertical scroll, tablet spacing |
| `mobile`   | < 768px        | Vertical scroll, mobile spacing |

---

### Modal (Bottom Sheet)

A modal component that behaves as a bottom sheet on mobile. On desktop, it renders as a centered dialog.

| PC (Desktop Dialog) | Tablet | Mobile (Bottom Sheet) |
|:---:|:---:|:---:|
| <img src="public/docs/screenshots/pc/work-detail-dark.png" width="100%" alt="PC" /> | <img src="public/docs/screenshots/tablet/work-detail-dark.png" width="100%" alt="Tablet" /> | <img src="public/docs/screenshots/mobile/work-detail-dark.png" width="100%" alt="Mobile" /> |

**Path**: `src/components/ui/Modal.tsx`

**Mobile behavior**:

- Enters from the bottom via slide-up (max height 85vh)
- **Drag handle down**: CSS `translate`-based dismiss (closes when threshold exceeds 100px)
- **Drag handle up**: Height-based fullscreen expansion
- Close button hidden — close by dragging the handle or tapping the overlay

**Technical decisions**:

- CSS `translate` property used for drag dismiss (independent from framer-motion's `transform`)
- framer-motion handles only enter/exit animations; drag is controlled via the `--sheet-y` CSS variable
- Rendered globally once in `ClientOverlays` (portal to body)

---


</details>

## Trouble Shooting

> Below are the key issues encountered during development and how they were resolved. The actual pages discussed in each item look like this:

| Works (Horizontal Scroll Gallery) | Home (Animation/Performance) | Posts (Blog) |
|:---:|:---:|:---:|
| <img src="public/docs/screenshots/pc/works-dark.png" width="100%" alt="Works" /> | <img src="public/docs/screenshots/pc/home-dark.png" width="100%" alt="Home" /> | <img src="public/docs/screenshots/pc/posts-dark.png" width="100%" alt="Posts" /> |

<details>
<summary><strong>1. Lenis Scroll Velocity Effect Not Working</strong></summary>

#### Problem

The scroll-speed-based parallax effect on images in the Works section was not being applied.

#### Approaches Tried (Failed)

1. **Direct wheel event detection**: Unstable and conflicts with Lenis
2. **RAF polling to calculate scroll delta**: Inaccurate velocity measurement
3. **Direct type assertion of Lenis velocity property**: Value does not update when accessed outside the scroll event handler

#### Cause

- Calculating scroll position directly via RAF polling results in uneven frame-to-frame deltas, causing inaccurate velocity measurements
- Lenis calculates velocity internally and exposes it as an instance property, but accurate values are only accessible inside scroll event handlers

#### Solution

Used Lenis's native `on('scroll')` event to access the velocity property directly from the instance

```tsx
// ❌ Wrong approach - RAF polling
useEffect(() => {
  const updateOffset = () => {
    const currentScroll = lenis.scroll;
    const delta = currentScroll - prevScrollRef.current; // inaccurate velocity
    prevScrollRef.current = currentScroll;
    rafIdRef.current = requestAnimationFrame(updateOffset);
  };
  rafIdRef.current = requestAnimationFrame(updateOffset);
}, []);

// ✅ Correct approach - Lenis scroll event
useEffect(() => {
  const handleScroll = () => {
    const velocity = (lenis as any).velocity; // accurate velocity
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

Lenis calculates velocity internally and exposes it as an instance property, so it is more accurate than calculating delta manually.

---


</details>

<details>
<summary><strong>2. Framer Motion transform and CSS transform Conflict</strong></summary>

#### Problem

Using CSS `transform: translate(-50%, -50%)` for image centering caused Framer Motion's `y` property to stop working.

#### Cause

- Framer Motion's `style={{ y }}` property generates an inline `transform: translateY()`
- When the CSS `transform` property is already set, Framer Motion's transform is overridden or conflicts

#### Solution

Switched to margin-based centering to avoid using CSS transform

```css
/* ❌ Wrong approach - using CSS transform */
.workImageInner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); /* conflicts with Framer Motion */
}

/* ✅ Correct approach - margin-based centering */
.workImageInner {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130%;
  height: 130%;
  margin-left: -65%; /* half of width */
  margin-top: -65%; /* half of height */
}
```

#### TL;DR

Framer Motion's style property generates inline transforms, so it must be used separately from CSS transforms.

---


</details>

<details>
<summary><strong>3. TypeScript useRef Type Error</strong></summary>

#### Problem

"Expected 1 arguments, but got 0" type error in `useRef<ReturnType<typeof setTimeout>>()`

#### Cause

- `useRef` requires an initial value as a mandatory parameter
- `ReturnType<typeof setTimeout>` does not include `null`, and `clearTimeout` does not accept `null`

#### Solution

Explicitly provide `undefined` as the initial value and include it in the type

```tsx
// ❌ Wrong approach
const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(); // error: initial value required
const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // clearTimeout type error

// ✅ Correct approach
const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
  undefined,
);
```

#### TL;DR

`clearTimeout` accepts `undefined` but not `null`. Timer refs should be initialized with `undefined`.

---


</details>

<details>
<summary><strong>4. GSAP ScrollTrigger Horizontal Infinite Scroll Implementation</strong></summary>

#### Problem

The horizontal scroll on the Works page reversed direction at the end, making it look like it wasn't truly infinite.

#### Approaches Tried (Failed)

1. **Scroll position teleport**: Moving to the start with `window.scrollTo` when reaching the end → the jump was visible
2. **Separate Bridge section**: Adding a separate Bridge section → broke the flow by switching from horizontal to vertical scroll
3. **Lenis infinite + teleport**: Controlling Lenis and ScrollTrigger simultaneously caused conflicts

#### Cause

- GSAP ScrollTrigger has a finite scroll range defined by the `end` property
- Changing the scroll position directly shows a visible jump to the user
- Horizontal scroll works by converting vertical scroll to horizontal movement, so adding a separate section creates a vertical scroll gap

#### Solution

Set a very long scroll distance and loop only the container position using modulo arithmetic

```tsx
// Clone content 3 times
const allProjects = [...projects, ...projects, ...projects];

// Set scroll distance to 10x (effectively infinite)
const scrollDistance = oneSetWidth * 10;

gsap.to(container, {
  scrollTrigger: {
    end: () => `+=${scrollDistance}`,
    onUpdate: (self) => {
      // Loop position with modulo - scroll keeps going but visually loops
      const totalProgress = self.progress * scrollDistance;
      const loopedX = totalProgress % oneSetWidth;
      gsap.set(container, { x: -loopedX });
    },
  },
});
```

#### TL;DR

A long scroll range + visual position loop provides a more natural infinite scroll experience than teleporting the scroll position.

---


</details>

<details>
<summary><strong>5. Lighthouse Performance Optimization — Deferred reCAPTCHA Loading</strong></summary>

#### Problem

Lighthouse mobile Performance score of 48. LCP 17.1s, TTI 18.2s — severe performance degradation.

#### Root Cause Analysis

Analyzing the Lighthouse report (Desktop/Mobile) revealed the main bottlenecks:

1. **reCAPTCHA v3 loading immediately**: `GoogleReCaptchaProvider` wraps the entire app and downloads ~784KB of JS on initial load. Blocks main thread for 280ms
2. **No Preconnect hints**: Requests to Google domains start without pre-connection → 400ms delay
3. **Insufficient color contrast**: `#6b7280` on `#f8f6f0` (4.47:1, below the 4.5:1 threshold), `#ff4f9d` on `#f8f6f0` (2.83:1)
4. **Accessibility**: Skipped heading order (h1 → h3), mismatch between aria-label and visible text

#### Solution

**1. Deferred reCAPTCHA loading** — largest impact

Changed to load the reCAPTCHA script only after user interaction (scroll/click/touch/keydown) or after 4 seconds:

```tsx
// ❌ Before - loads immediately on app mount (784KB)
<GoogleReCaptchaProvider reCaptchaKey={siteKey}>
  {children}
</GoogleReCaptchaProvider>

// ✅ After - deferred load after user interaction
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

**2. Add Preconnect hints**

```html
<link rel="preconnect" href="https://www.google.com" />
<link rel="preconnect" href="https://www.gstatic.com" crossorigin="anonymous" />
```

**3. Fix color contrast**

| Token                          | Before                               | After                         | Contrast Change       |
| ----------------------------- | ------------------------------------- | ------------------------------- | --------------- |
| `--color-neutral-600`         | `#6b7280`                             | `#656c79`                       | 4.47:1 → ~4.9:1 |
| `--text-accent-secondary-alt` | `var(--color-accent-light)` (#ff4f9d) | `var(--color-accent)` (#d40063) | 2.83:1 → ~4.8:1 |

**4. Fix accessibility**

- ServicesSection: Normalize heading order by changing `<h3>` → `<h2>`
- Language toggle: Include visible text ("KO"/"EN") in `aria-label`

#### TL;DR

- Excluding third-party scripts (reCAPTCHA, Analytics, etc.) from the initial load and deferring until after user interaction has a significant impact on LCP/TTI
- Lighthouse results on the dev server (Turbopack) are much lower than production due to unminified JS, devtools overhead, etc.
- When using `mix-blend-mode: difference`, Lighthouse calculates contrast from the pre-blend color, which may differ from the actual visual result

---


</details>

<details>
<summary><strong>6. reCAPTCHA Badge z-index Issue</strong></summary>

#### Problem

When the Contact Drawer was open, the reCAPTCHA v3 badge was hidden behind the overlay and not visible.

#### Cause

- The Contact Drawer backdrop is positioned fixed with `z-index: var(--z-overlay)` (40)
- The `.grecaptcha-badge` element injected by Google had a lower z-index than the backdrop, causing it to be hidden

#### Solution

Dynamically set `z-index: 9999` on the badge when the Drawer opens, and remove it when closed:

```tsx
badge.style.zIndex = isOpen ? "9999" : "";
```

#### TL;DR

DOM elements injected by third parties can have z-index conflicts with custom overlays/modals. Dynamic z-index management is required.

---


</details>

<details>
<summary><strong>7. Advanced Lighthouse Performance Optimization — Remove Unused Fonts and Lighten Resources</strong></summary>

| PC | Tablet | Mobile |
|:---:|:---:|:---:|
| <img src="public/docs/screenshots/pc/home-light.png" width="100%" alt="Home PC" /> | <img src="public/docs/screenshots/tablet/home-light.png" width="100%" alt="Home Tablet" /> | <img src="public/docs/screenshots/mobile/home-light.png" width="100%" alt="Home Mobile" /> |
<sub>Optimization target: Home page — Performance score of 98 achieved on all 3 device sizes</sub>

#### Problem

Lighthouse mobile Performance score of 60 after first-round optimization. LCP 7.3s, TTI 13.7s, page size 1,489KB, 63 network requests.

#### Root Cause Analysis

Identified bottlenecks by measuring the production build directly with Lighthouse CLI:

1. **4 unused fonts loading**: IBM Plex Mono (5 weights), Bebas Neue, Cormorant Garamond (5 weights), Abril Fatface — downloading 12 font files despite no CSS references
2. **reCAPTCHA 4-second timer**: The deferred loading had a `setTimeout(4000)` fallback, still loading ~740KB during Lighthouse tests
3. **scroll event trigger**: reCAPTCHA also reacted to scroll events, causing unnecessary early loading
4. **No font-display**: All fonts blocked rendering
5. **Unused Preconnect**: Since reCAPTCHA was excluded from initial load, the Google domain preconnect triggered an "unused" warning
6. **Excess Inter weights**: 2 of 7 weights (300-900) — 800, 900 — were unused

#### Solution

**1. Remove unused fonts** — largest impact

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

How to verify unused fonts: Search the entire CSS for `var(--font-ibm-plex)`, `var(--font-bebas)`, `var(--font-cormorant)`, `var(--font-abril)` → 0 results. Referenced in `useFontMorph.ts` but that component was not imported on any page.

**2. Add font-display: swap**

```tsx
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"], // removed 800, 900
  display: "swap", // unblock font rendering
});
```

**3. Improved reCAPTCHA loading strategy**

```tsx
// ❌ Before - timer + scroll included
const timer = setTimeout(load, 4000); // triggered during Lighthouse tests
const events = ["scroll", "click", "touchstart", "keydown"];

// ✅ After - intentional interactions only
const events = ["click", "touchstart", "keydown"]; // removed timer/scroll
```

**4. Remove unused Preconnect**

```html
<!-- ❌ Before - reCAPTCHA excluded from initial load, triggering "unused" warning -->
<link rel="preconnect" href="https://www.google.com" />
<link rel="preconnect" href="https://www.gstatic.com" crossorigin="anonymous" />

<!-- ✅ After - removed -->
```

#### Results (Lighthouse CLI, median of 3 measurements)

| Metric      | Before   | After       | Change          |
| ----------- | -------- | ----------- | ------------- |
| Performance | 60       | **98**      | **+38 pts**     |
| FCP         | 2,573ms  | 1,979ms     | -594ms        |
| LCP         | 7,294ms  | **1,979ms** | **-5,315ms**  |
| TBT         | 430ms    | **0ms**     | -430ms        |
| CLS         | 0.012    | 0           | -0.012        |
| TTI         | 13,731ms | **1,979ms** | **-11,752ms** |
| Requests    | 63       | 28          | -35           |
| Page size   | 1,489KB  | **449KB**   | **-70%**      |
| Font files  | 19       | 5           | -14           |

#### TL;DR

- Fonts registered via `next/font/google` download font files even if not referenced in CSS. Periodically verify actual usage
- Timer fallbacks in third-party deferred loading can be unintentionally triggered by performance measurement tools. Using only intentional interactions (click/touch/keydown) is safer
- `font-display: swap` is not the default in next/font and must be set explicitly

---


</details>

<details>
<summary><strong>8. Works Horizontal Gallery Bidirectional Infinite Scroll Wrapping</strong></summary>

#### Problem

In the Works page horizontal scroll gallery, even with 10 sets of repeated projects, scrolling all the way to the end revealed a blank screen — making it not truly infinite.

#### Approaches Tried (Failed)

1. **Increase set count**: Adding more repeated sets causes too many DOM nodes and performance degradation
2. **Teleport from end to start**: The scroll position jump was visible

#### Cause

- A finite number of repeated sets (10) means there is an end in both directions
- scrollX keeps accumulating in GSAP's requestAnimationFrame loop and overflows the content bounds

#### Solution

Calculated the width of one set (`oneSetWidth`) from the `offsetLeft` difference between intro elements, and used a `while` loop to wrap scrollX/targetScrollX

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

Wrapping the scroll position itself — rather than increasing the number of cloned content sets — achieves true infinite scroll without DOM overhead.

---


</details>

<details>
<summary><strong>9. Layout Shift on Language Switch</strong></summary>

#### Problem

In the Works intro section, switching between Korean and English caused the height of the text area to change, slightly shifting the layout.

#### Cause

- The difference in text length between Korean and English changes the line-break positions
- In a flex container with `justify-content: center`, space is redistributed when a child's height changes

#### Solution

Set `min-height` in `em` units (number of lines × line-height) to reserve consistent space for both languages

```css
/* Reserve min-height based on maximum number of lines */
.introDesc {
  min-height: 4.95em;
} /* 3 lines × 1.65 line-height */
.introDetail {
  min-height: 6.6em;
} /* 4 lines × 1.65 line-height */
.introQuote {
  min-height: 3.3em;
} /* 2 lines × 1.65 line-height */

/* Not needed on mobile since it's vertical scroll */
@media (max-width: 768px) {
  .introDesc,
  .introDetail,
  .introQuote {
    min-height: auto;
  }
}
```

#### TL;DR

For multilingual support, reserving space with `min-height` based on the maximum line count prevents layout shifts during language switching. Using `em` units automatically adapts to font-size changes.

---


</details>

<details>
<summary><strong>10. Loading Screen Reappearing on Language Switch</strong></summary>

#### Problem

The loading screen reappeared the first time the language was switched on a page. On the second switch onwards, it worked normally.

#### Cause

- `RecaptchaProvider` changes `shouldLoad` from `false` to `true` on the first click event
- The render tree changes from `<Fragment>{children}</Fragment>` to `<GoogleReCaptchaProvider>{children}</GoogleReCaptchaProvider>`
- React unmounts and remounts the entire subtree when a component type changes at the same position
- The `useState(true)` initial value in `useLoadingScreen()` causes the loading screen to reappear

#### Solution

Track whether the initial load has completed using a module-level flag to skip the loading screen on remount

```tsx
// Module level: persists across component remounts
let hasCompletedInitialLoad = false;

export function useLoadingScreen() {
  // If initial load has already completed in this session, start with false
  const [isLoading, setIsLoading] = useState(() => !hasCompletedInitialLoad);
  const hasCompletedRef = useRef(hasCompletedInitialLoad);

  const completeLoading = () => {
    hasCompletedRef.current = true;
    hasCompletedInitialLoad = true; // sync module flag
    setIsLoading(false);
  };
}
```

#### TL;DR

Conditionally rendering a third-party Provider (`Fragment` ↔ `Provider`) causes React to remount the subtree. State that depends on `useState` initial values must be supplemented with module-level variables to be safe against remounts.

---


</details>

<details>
<summary><strong>11. GSAP ScrollTrigger Layout Breaking on Breakpoint Change</strong></summary>

#### Problem

When resizing the viewport between desktop/tablet/mobile, GSAP ScrollTrigger pin, RAF counter-translation, and other animations remain fixed to the previous viewport dimensions, breaking the layout.

#### Cause

- GSAP ScrollTrigger's `start`, `end`, and `pin` settings are calculated from the viewport size at creation time
- RAF-based counter-translation also operates based on the initial `extraWidth` value
- Existing instances are not automatically updated when the viewport size changes

#### Approaches Tried

1. **Tracking breakpoints in individual components**: Each panel adds a resize listener + effect re-run → code duplication, some panels missed
2. **ScrollTrigger.refresh()**: Works in some cases but cannot handle fundamental DOM structure changes like horizontal-to-vertical layout transitions

#### Solution

Added a `BreakpointGuard` component to the root layout to remount all page content when the breakpoint changes

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

  return <div key={bp}>{children}</div>; // key change → children remount
}

// src/app/layout.tsx
<main>
  <BreakpointGuard>{children}</BreakpointGuard>
</main>;
```

Placing it above Providers (Theme, Language, Lenis) would reset their state, so it is placed inside `<main>` — inside the Providers — to preserve Provider state while only remounting page content.

#### Side Effects and Solutions

- Video elements removed from the DOM caused `play()` Promise to reject with AbortError → added `.catch(() => {})`
- All component `useState` initial values are reset → supplemented with module-level flags (e.g., `hasCompletedInitialLoad`)

#### TL;DR

For animations like GSAP ScrollTrigger that depend on the viewport at creation time, a full remount using React's `key` prop is more reliable than partial refresh via `ScrollTrigger.refresh()`. Placing Providers outside the remount boundary enables page-level reinitialization without losing global state.

---


</details>

<details>
<summary><strong>12. Full Project Performance Optimization</strong></summary>

#### Problem

A project-wide performance audit revealed numerous optimization opportunities: main thread animations, 60fps React re-renders, GPU memory leaks, unused resources, and CSS conflicts.

#### Root Cause Analysis

1. **Hero ellipse and marquee**: Framer Motion/GSAP infinite animations running on the main thread RAF
2. **useMagneticRepel**: `mousemove` → `setMagneticOffsets()` → 60fps React state update → full WorksSection re-render
3. **Three.js**: `DoubleSide` rendering both sides, geometry not disposed on `isMobile` change (GPU memory leak)
4. **Unused resources**: paper.png (17MB), grain.png (5.2MB) unreferenced, 2 unused npm packages
5. **CSS conflicts**: `scroll-behavior: smooth` double-smoothing with Lenis, `cursor: none` applied to touch devices too
6. **useSoundManager**: AudioContext created on mount + typing.mp3 fetched immediately

#### Solution

```
1. Hero ellipse/marquee: Convert to CSS animation → runs on compositor thread
2. useMagneticRepel: useState → useRef + RAF loop + direct el.style.transform application
3. Three.js: DoubleSide → FrontSide, geometry.dispose() in useEffect cleanup
4. Delete unused images (-22.2MB), npm uninstall react-scroll-parallax react-google-recaptcha-v3
5. Remove scroll-behavior, limit cursor:none to @media (pointer: fine)
6. Defer AudioContext/typing.mp3 to first interaction
7. next.config: poweredByHeader: false, image formats: AVIF+WebP
8. Remove permanent will-change: transform (release GPU layer)
```

#### TL;DR

- Simple infinite repeat animations (rotate, translateX) are always more efficient as CSS animations than JS-based alternatives — they run on the compositor thread without blocking the main thread
- Updating React state in high-frequency events (mousemove) causes the entire component tree to reconcile per frame. Refs + direct DOM manipulation is the appropriate pattern
- `geometry`/`material` created with `useMemo` in Three.js is subject to React GC, but GPU buffers are not automatically released. Explicit `dispose()` is required


</details>

---

## Deployment

You can easily deploy via the [Vercel Platform](https://vercel.com).

See the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for details.

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) rules.

### Commit Message Format

```
<type>(<scope>): <subject>
```

### Main Types

| Type       | Description                                  |
| ---------- | ------------------------------------- |
| `feat`     | Add a new feature                      |
| `fix`      | Bug fix                             |
| `design`   | Layout/style adjustments (no functional changes) |
| `docs`     | Documentation changes                             |
| `style`    | Code formatting                           |
| `refactor` | Refactoring                              |
| `perf`     | Performance improvements                             |
| `test`     | Add/modify tests                      |
| `chore`    | Build, configuration changes                       |

### Examples

```bash
feat: add infinite scroll feature
fix(animation): fix scroll animation flickering
design(about): adjust dotNav spacing + unify indicator height
docs: add README installation instructions
refactor(hooks): extract custom hooks
```

See [COMMIT_CONVENTION.md](./COMMIT_CONVENTION.md) for details.

---

<div align="center">

## License

[PolyForm Noncommercial License 1.0.0](./LICENSE)

Free to use, modify, and distribute, but **commercial use is not permitted**.

</div>
