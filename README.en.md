<div align="center">

English | **[한국어](./README.md)**

# Arc — Where Growth Takes Shape

A personal portfolio website built with Next.js 15, React 19, and TypeScript, featuring interactive animations powered by GSAP, Framer Motion, and Lenis.

[![License](https://img.shields.io/badge/license-PolyForm%20NC%201.0-d40063?style=flat-square)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)

**[Live Demo →](https://your-domain.vercel.app)** _(URL will be updated after deployment)_

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
<summary><strong>See more — Profile / About / Work Detail / Design System</strong></summary>

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

## At a Glance

| Area | Highlights |
|:---|:---|
| **Interaction** | Infinite scroll loop, mouse parallax, StaggerText, Three.js 3D coffee cup + latte art, directional scroll cascade |
| **Works** | 6 layouts (Flow · Fullscreen · Cinematic · Grid · Split · Cylinder) |
| **Blog** | SSR + ISR, series, banner slider, guest comments (dual auth) |
| **Admin** | Plate.js editor, `.md` sync + export, AI translation/summary, revision history |
| **Performance** | Lighthouse 98 — LCP 1.9s, 449KB (-70%) |
| **Security** | SQL Injection, XSS, RLS, dual auth, category whitelist |
| **Design System** | 3-layer tokens (Raw → Semantic → Context) + live preview |

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
| Typography | Instrument Serif, Space Grotesk, JetBrains Mono (30+ presets per category + direct Google Fonts input in admin settings) |
| Backend | ![Supabase](https://img.shields.io/badge/Supabase-3ecf8e?style=flat-square&logo=supabase&logoColor=white) (PostgreSQL, Auth, Storage) |
| Editor | ![Plate.js](https://img.shields.io/badge/Plate.js-1a1a2e?style=flat-square) (Slate-based WYSIWYG) + Markdown |
| AI Image | NanoBanana / Hugging Face (priority-based fallback chain) |

## Key Features

### Animation & Interaction

- **Infinite Scroll Loop**: Lenis smooth scroll + Bridge Section-based infinite circular scrolling
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
  <img src="public/docs/screenshots/pc/home-dark.png" width="49%" alt="Home — Dark" />
  <img src="public/docs/screenshots/pc/home-light.png" width="49%" alt="Home — Light" />
</p>

### Works Gallery

- **6 Layout Options**: Switchable via Admin settings or `?layout=` query parameter — Flow (default horizontal scroll) · Fullscreen (background crossfade) · Cinematic (parallax cinema) · Grid (bento grid) · Split (left meta + right scroll) · Cylinder (Three.js 3D cylinder)
- **Flow Layout**: GSAP-based horizontal scroll gallery — bidirectional infinite wrapping, mouse 3D tilt, image hover zoom, staggered metadata reveal
- **Cylinder Layout**: Three.js vertical cylinder rotation + HTML overlay, cosmic-themed intro + bouncing bunny character
- **Cylinder Responsive**: Camera auto-retreats based on viewport size, tilt disabled on tablet/mobile, scroll-driven title slide-in reveal (CSS variable `--reveal` + clip-path mask)
- **Cylinder Meta Separation**: mix-blend-mode: difference applied only to title/category; description, details (year/role/tech marquee), and CTA are separated into a sibling overlay for consistent white text
- **Floating Comments**: Recent work comments float in the intro slot with RAF-based physics, clicking navigates to the work with transition effect
- **Breakpoint Guard**: Cylinder layout responds to resize in real-time without reload; other layouts auto-remount on breakpoint transitions

<p align="center">
  <img src="public/docs/screenshots/pc/works-dark.png" width="49%" alt="Works — Dark" />
  <img src="public/docs/screenshots/pc/works-light.png" width="49%" alt="Works — Light" />
</p>

### Blog System

- **Posts (Blog)**: Supabase-based blog system — SSR + ISR caching, Markdown/Rich Text toggle editor, search/tag filters, view count tracking, GitHub link
- **Series**: Group posts into series for sequential publishing — subcategory element, series/post view toggle, previous/next navigation on detail pages
- **Posts Banner Slider**: Display pinned posts as banners — 4 layouts x 4 overlays x 2 transition modes, selectable from Admin
- **Posts Filter Bar**: Category collapse/expand (+N more), hover indicator (layoutId), sticky + scroll direction detection, content blur effect
- **Posts Bento Grid**: 3-column bento layout — wide(2col)+tall(2row)+standard per 10-item cycle, position alternates per cycle for visual variety, responsive 2-column tablet / 1-column mobile
- **Posts i18n & Sort Capsule**: All text moved to locale files, sort UI changed to capsule-style segment control (Framer Motion layoutId) + hover indicator movement
- **IP-based Likes**: Single `likes` table with `target_type` discrimination for Posts/Works/comments, IP-based UNIQUE constraint to prevent duplicates, rapid-click prevention (ref lock + busy disabled), formatCount (1k/1.2m) number abbreviation
- **Comment System**: Guest threaded replies — dual authentication (commenter_hash + bcrypt), nickname shuffle, email reply notifications, admin comments, admin tombstone double-delete for permanent removal, nickname-preserved tombstone
- **First Comment Celebration**: Confetti effect + card flip celebration message (sparkle stars + accent lines) on first comment, admin select-all / drag selection / tombstone bulk permanent deletion

<p align="center">
  <img src="public/docs/screenshots/pc/posts-dark.png" width="49%" alt="Posts — Dark" />
  <img src="public/docs/screenshots/pc/posts-light.png" width="49%" alt="Posts — Light" />
</p>

### Works Detail & Project Pages

- **Works Admin CRUD**: Supabase DB-based work management — single editor (MD/Rich Text) + 8-section template, auto-generated TOC, Korean/English bilingual, gallery/team members
- **Work Detail**: Project detail page — TOC from `##` heading parsing in content, gallery images, likes/comments, GitHub link button, static data fallback when DB is not connected

<p align="center">
  <img src="public/docs/screenshots/pc/work-detail-dark.png" width="49%" alt="Work Detail — Dark" />
  <img src="public/docs/screenshots/pc/work-detail-light.png" width="49%" alt="Work Detail — Light" />
</p>

### Navigation & UX

- **Mix-Blend Navigation**: Auto-inverting navigation with mix-blend-mode: difference — image logo (short/full/dark-only), glitch effect controlled from Admin
- **Tooltip & Translation Tooltip**: Generic Tooltip + translation `<T>` component — shows opposite language on long hover (600ms), createPortal-based, mobile touch toggle
- **Footer Sliding Indicator**: Same sliding indicator as Navigation — arrow movement on hover, ResizeObserver + fonts.ready accuracy
- **Carousel (default / cylinder)**: Shared Carousel — default (CSS opacity) / cylinder (3D perspective) modes, autoPlay/loop/dots/arrows
- **About Horizontal Scroll**: GSAP-based horizontal scroll via `useHorizontalScroll` hook (desktop), automatic vertical stack on mobile
- **Page Transition**: Shared image-to-hero morphing transition for all detail page navigation (PageTransitionProvider at root layout level, persists across pages)
- **ImageViewer Directional Slide**: Previous/next slides in from opposite direction (mode wait), zone-based arrow reveal on hover
- **Select Dropdown Animation**: Portal-based dropdown uses rAF×2 delay after mount for CSS transition guarantee (compound selector to bypass global theme transition)
- **LanguageToggle Dynamic Measurement**: EN button position measured via useLayoutEffect for accurate indicator alignment

<p align="center">
  <img src="public/docs/screenshots/pc/about-dark.png" width="49%" alt="About — Dark" />
  <img src="public/docs/screenshots/pc/about-light.png" width="49%" alt="About — Light" />
</p>

### Admin & CMS

**Dashboard & CRUD**

- **CRUD & Bulk Management**: Posts/Works CRUD, drag bulk select + publish/delete, series management, trash (soft delete + restore)
- **`.md` Sync**: `content/posts/` · `content/works/` folder → DB unidirectional sync (Jekyll-style, `pnpm sync-all`)
- **`.md` Export**: Bulk/individual/series frontmatter-included `.md` download
- **Plate.js Editor**: Markdown ↔ Rich Text bidirectional conversion (including file/audio attachments), custom footnotes, 5 templates, editor switch skeleton, custom input font size/line height
- **Revision History**: JSONB snapshot auto-save, LCS diff comparison, cross-device sharing, auto-cleanup at 50+
- **AI Translation/Summary**: DeepL/Google/Gemini/Claude fallback chain, auto-summary on publish
- **Settings 5 Tabs**: General/Content/Appearance/Services/Account — brand, SEO, bilingual editing
- **Cover Image Picker**: 16 presets + Unsplash search + AI generation, client-side WebP compression
- **Media Upload Management**: Allowed file types whitelist (per-MIME size limits), blocked extensions blacklist, infrastructure keys read-only display — addable MIMEs displayed as group-based chips (image/video/audio/document/archive) for one-click allowlist, same-group types (e.g., JPEG/PNG/WebP) share a size limit
- **HEIC / TIFF Auto-Conversion**: On upload, HEIC/HEIF/TIFF are server-converted to WebP (quality 85) via sharp, making browser-unsupported formats viewable everywhere
- **Document Viewer**: File attachments with inline preview — PDF (iframe) · Office (MS Viewer) · text (fetch+pre), original filename preserved on download

<p align="center">
  <img src="public/docs/screenshots/pc/profile-dark.png" width="49%" alt="Profile — Dark" />
  <img src="public/docs/screenshots/pc/profile-light.png" width="49%" alt="Profile — Light" />
</p>

### Performance

- **Bundle Optimization**: Replaced react-icons with inline SVGs, Three.js dynamic import, About 6-panel code splitting (62% JS reduction), removed unused packages/images (22MB)
- **Performance Optimization**: Hero/marquee CSS animation transition (compositor thread), useMagneticRepel direct DOM manipulation via refs (60fps), Three.js FrontSide + dispose, AudioContext lazy initialization

| Metric | Before | After |
|:---|:---:|:---:|
| Lighthouse Performance | 60 | **98** |
| LCP | 7,294ms | **1,979ms** |
| Page Size | 1,489KB | **449KB** (-70%) |
| Network Requests | 63 | **28** |

### Design System

- **Design System Preview**: View tokens/components/banner layouts at `/design-system` route — Tooltip, Select (portal-based dropdown), Pagination (smart ellipsis), PeriodPicker, ButtonGroup (capsule-merged buttons), Gradient Tokens, 3-phase scroll animation

<p align="center">
  <img src="public/docs/screenshots/pc/design-system-dark.png" width="49%" alt="Design System — Dark" />
  <img src="public/docs/screenshots/pc/design-system-light.png" width="49%" alt="Design System — Light" />
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

# Cover Image Picker — Unsplash (optional)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

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
```

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

**Tables created (10):**

| Table | Purpose |
|--------|------|
| `site_settings` | Site settings + profile data + secrets/API keys (JSONB) |
| `series` | Blog series |
| `posts` | Blog posts (post_number sequence column for unique numbering) |
| `comments` | Post comments (threaded replies, dual auth: commenter_hash + password) |
| `likes` | Likes (unified for posts/works/comments, distinguished by target_type, IP duplicate prevention) |
| `works` | Portfolio works (includes team_members jsonb) |
| `site_visits` | Visitor statistics (1 per IP+date) |
| `work_comments` | Works comments (threaded replies, dual auth) |
| `admin_notifications` | Admin notification logs |
| `revisions` | Editor revision history (shared for posts/works, JSONB snapshot) |

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
> **Comment Likes API**: `GET /api/comment-likes?comment_type=&comment_ids=` (batch like status query), `POST /api/comment-likes` (toggle comment like)
>
> **Admin API**: `POST /api/admin/auth`, `GET/PATCH /api/admin/settings`, `GET/PATCH /api/admin/profile`, `GET/PATCH /api/admin/account`, `GET/PUT /api/admin/secrets`, `POST /api/admin/upload`, `POST /api/admin/translate`
>
> **Revisions API**: `GET /api/revisions?entity_type=&entity_id=` (list, excluding snapshots), `POST /api/revisions` (save + cleanup beyond 50), `GET /api/revisions/[id]` (single with snapshot), `DELETE /api/revisions/[id]`
>
> **Categories API**: `GET /api/categories` (Posts bilingual category list), `GET /api/works-categories` (Works bilingual category list)
>
> **Utility API**: `POST /api/translate` (public, Gemini single text), `POST /api/posts/reassign-category` (batch category reassignment), `GET /api/fonts/search?q=` (Google Fonts autocomplete search)

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

### 5. Admin Login Method

There is no login button on the site. Only the admin accesses it by entering the URL directly.

**Login:**

1. Go to `/admin/login`
2. Enter the email/password created in Supabase
3. Login success -> Redirect to `/admin/settings`

**Features available after login:**

- `/admin/posts` — Post list (publish/private status, hover preview, row numbers, thumbnails)
- `/admin/posts/new` — New post creation (Markdown <-> Rich Text toggle, auto translation, re-translate, auto save + DB revision history + diff comparison + Revert)
- `/admin/posts/[id]/edit` — Edit existing post (PlateEditor loading skeleton)
- `/admin/posts/series/new` — Create new series
- `/admin/posts/series/[id]/edit` — Edit series
- `/admin/works` — Works list (table view, publish/private toggle, sort order, thumbnails, .md upload)
- `/admin/works/new` — Create new work (single content editor + template, Korean/English bilingual, tech stack, gallery)
- `/admin/works/[id]/edit` — Edit existing work
- `/admin/settings` — Site settings (General, Content, Appearance, Services, Account — 5 tabs). General tab for brand/SEO/footer copyright/BGM file upload/audio source (track name/artist/URL) management. Content tab split into Home/Profile/About/Posts/Works sub-navigation. Services tab for email service, AI cover, reCAPTCHA settings and API key editing. Account tab for admin email/password changes

### 6. Cover Image Picker Usage

In the Cover Image / Main Image area of the post, series, and work editors, you can choose between **Upload** (direct upload) and **Choose cover** (picker).

Clicking **Choose cover** shows 3 tabs:

| Tab | Description | Required Environment Variable |
|----|------|----------------|
| **Presets** | Click from 16 gradient/pattern options to generate a 1200x630 image via Canvas API and upload to Supabase | None |
| **Unsplash** | Search Unsplash photos by keyword -> click to trigger download tracking + Supabase upload | `UNSPLASH_ACCESS_KEY` |
| **AI Generate** | Prompt + style selection -> AI image generation -> Supabase upload | Provider-specific API key (see below) |

> **Note**: The Unsplash and AI Generate tabs each require their own API key. The Presets tab works without any environment variables.

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

**Authentication flow:**

```
/admin/login (form submit)
  -> POST /api/admin/auth
    -> supabase.auth.signInWithPassword()
    -> Set session cookie
  -> Redirect to /admin/settings

Accessing /admin/*
  -> Dashboard layout checks session
  -> No session -> /admin/denied (access denied page)
  -> Session exists -> Normal access

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

| File                       | Tests | Description                                                                |
| -------------------------- | --------- | ------------------------------------------------------------------- |
| `cn.test.ts`               | 6         | Class name composition utility (`cn`)                                           |
| `date.test.ts`             | 6         | Date format utilities (`formatDate`, `getYear`)                            |
| `random.test.ts`           | 8         | Random element generation (`generateRandomElements`, `generateRandomDroplets`) |
| `mobileCheck.test.ts`      | 6         | Mobile layout detection (`checkMobileLayout`)                          |
| `renderHighlight.test.tsx` | 4         | Highlight markup conversion (`renderHighlight`)                          |

Config file: `vitest.config.ts`, Test location: `src/__tests__/`

---


</details>

> **Component details**: [StaggerText · BreakpointGuard · Modal](./docs/components.en.md)

## Trouble Shooting

> 38 issues encountered during development. Top 6 below — full list at **[docs/troubleshooting.en.md](./docs/troubleshooting.en.md)**.
> Also available interactively on the About page.

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

Optional:
  UNSPLASH_ACCESS_KEY          # Cover Image — Unsplash
  HUGGINGFACE_API_KEY          # Cover Image — AI (HuggingFace)
  NANOBANANA_API_KEY           # Cover Image — AI (NanoBanana)
  DEEPL_API_KEY                # Translation — DeepL
  GOOGLE_TRANSLATE_API_KEY     # Translation — Google
  GEMINI_API_KEY               # Translation + AI Summary — Gemini
  OPENAI_API_KEY               # AI Summary — OpenAI
  ANTHROPIC_API_KEY            # Translation + AI Summary — Claude
```

> Auto-deploys on every push to `main`. Preview deployments are created for each PR.

### Other Platforms

Any platform that supports Next.js can be used. See the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for details.

## Design System

CSS token 3-layer architecture, class naming conventions, specificity guidelines, and all styling rules are documented in **[docs/design-system.md](./docs/design-system.md)**.

### Overview

| Layer | Location | Prefix | Role |
|-------|----------|--------|------|
| Raw Tokens | `src/styles/tokens/` | `--color-*`, `--spacing-*`, etc. | Primitive values |
| Semantic Tokens | `src/styles/globals/_semantic.css` | `--text-*`, `--bg-*`, `--border-*` | Meaning-based mapping |
| Context Tokens | Inside CSS Module | `--_*` | Component-scoped |

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
