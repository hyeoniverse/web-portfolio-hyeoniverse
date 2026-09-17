# Supabase Setup Guide

Supabase project setup is required for Posts features.

### 1. Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Bootstrap owner email — this account gets owner permission automatically, no invite needed (GitHub OAuth login / member management)
OWNER_EMAIL=you@example.com

# Production domain — the baseline for the middleware's CSRF Origin check
# If unset in production, every admin mutation is 403 (fail-closed). Dev passes even when empty
SITE_URL=https://your-domain.com

# Cover Image Picker — Unsplash (optional)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Cover Image Picker — Pexels (optional, alternative to Unsplash)
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

> `GITHUB_TOKEN` prefers the secret saved in the admin Services tab, falling back to the environment variable (`getSecret("GITHUB_TOKEN")`).

> `OWNER_EMAIL` designates the bootstrap owner (full permissions automatically, without an invite row). **Set it before the first login** — on the owner's first sign-in the `owner` role is persisted into `app_metadata` once (claim-and-close), so ownership survives even if this value later changes or is removed. GitHub OAuth itself (Client ID/Secret) is configured not in `.env.local` but in the Supabase dashboard under **Authentication → Providers → GitHub** (see step 4). Member invite emails use Resend (with a verified domain).

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

**Tables created (23):**

| Table | Purpose |
|--------|------|
| `site_settings` | Site settings + profile data + secrets/API keys (JSONB) |
| `series` | Blog series (`sort_order` for admin ordering, `auto_cover_url` for Unsplash cache, 80-char title CHECK) |
| `posts` | Blog posts (post_number sequence + `scheduled_at` scheduled publishing + `purge_after` trash TTL + `version` optimistic locking + `icon` / `cover_position` / `cover_zoom` / `author_ids`) |
| `comments` | Post comments (threaded replies, dual auth: commenter_hash + password) |
| `comment_reactions` | Comment emoji reactions (fixed set of 8, post/work split via `comment_type`, duplicate prevention via `reactor_hash`) |
| `comment_reports` | Comment reports (reason + resolve/dismiss state) |
| `likes` | Likes (unified for posts/works/comments, distinguished by target_type, IP duplicate prevention) |
| `works` | Portfolio works (slug, `title`/`title_en` (bilingual title), `categories_ko/en text[]` + GIN, `nature_ko/en`, `contributions_ko/en jsonb`, `tech_notes jsonb`, team_members jsonb, `icon`, `scheduled_at`, `purge_after`) |
| `site_visits` | Visitor statistics (1 per IP+date) |
| `post_views` | Per-post time-series view records (daily trend chart on the dashboard) |
| `work_comments` | Works comments (threaded replies, dual auth) |
| `admin_notifications` | Admin notification logs |
| `revisions` | Editor revision history (shared for posts/works, JSONB snapshot) |
| `post_work_relations` | Posts ↔ works bidirectional many-to-many (Notion Relation style) |
| `series_work_relations` | Series ↔ works many-to-many (related series on a project, same pattern as post_work_relations) |
| `poll_votes` | In-content poll block tally (poll_id + option_id — editor-assigned text ids, IP-based duplicate prevention) |
| `calendars` | Shared calendars for the editor's calendar block (`data jsonb`, soft delete + 30-day `purge_after` TTL) |
| `custom_emojis` | Custom uploaded icons for the EmojiPicker (admin-only RLS) |
| `cover_image_history` | Unified Cover Image Picker history (per admin user, ai/unsplash/preset tagged, RLS) |
| `admin_login_attempts` | Admin login failure counter (5 failures → 15-minute lockout) |
| `admin_known_devices` | Approved admin device UA fingerprints (SHA-256; unknown devices need email approval, 24h TTL) |
| `applied_migrations` | Tracks applied schema migrations (fires a notification on first application) |
| `author_invites` | Email author invites (email PK, author_id references the profile id in site_settings.profile, permission_level 1=author/2=editor, invited_by, created_at, consumed_at, service_role-only RLS). On OAuth login the role is granted into app_metadata and the invite is consumed |

> Uses `IF NOT EXISTS` so existing tables are skipped. Missing columns (commenter_hash, updated_at, etc.) in existing deployed DBs are safely added via `ALTER TABLE ADD COLUMN IF NOT EXISTS` in the migration section at the bottom of the file.

> **setup.sql ↔ migrations drift**: `custom_emojis` exists only in `setup.sql`, with no matching migration file. Conversely, the `posts` title length CHECKs (`posts_title_len` / `posts_title_en_len`, 120 chars) exist only in `2026_07_13_posts_title_len.sql` and are absent from `setup.sql`. A fresh setup needs only `setup.sql`, but if you mix the two paths, check these two items.

**Manual-run migrations (optional):** The two files below are data-rewriting scripts and are not applied automatically. Run them by hand in the SQL Editor only when needed.

| File | What it does |
|------|---------|
| `2026_07_13_category_reset.sql` | Removes the category overrides from `site_settings` and remaps `posts.category` / `series.category` onto the new taxonomy. **It updates every row with no WHERE clause, and any value missing from the mapping is swept into `ELSE '기타'`** — always review the step [0] distribution output before running |
| `2026_07_13_tag_descriptions_reset.sql` | Removes the `tagDescriptions` override from `site_settings` so the default dictionary in `site.config.ts` shows through (leaves `posts.tags` / `tag_notes` untouched) |

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
> **Upload API**: `POST /api/upload` (server-proxied upload, per-MIME size limits + a 200MB absolute cap), `POST /api/upload/signed-url` (issues a signed URL for direct Storage upload — only the filename and type transit, sidestepping the request body size cap)
>
> **Admin API**: `POST /api/admin/auth`, `GET/PATCH /api/admin/settings`, `GET/PATCH /api/admin/profile`, `GET/PATCH /api/admin/account`, `GET/PUT /api/admin/secrets`, `POST /api/admin/upload`, `POST /api/admin/translate`, `GET /api/admin/giscus-repo?repo=owner/name` (looks up repoId + Discussion categories via GitHub GraphQL, requires `GITHUB_TOKEN`)
>
> **Auth & Members API**: `GET /auth/callback` (OAuth callback + authorization gate — persists the owner role on the owner's first login · deletes un-invited accounts, except when `OWNER_EMAIL` is unset where it shows a config error without deleting), `GET /api/admin/me` (current user's email/role/level/isOwner — settings tab gating), `GET|PATCH|DELETE /api/admin/authors/members` (owner-only — list members + pending invites / change permission or link author profile / delete account), `GET /api/admin/authors/context` (requireAuth, non-owner accessible — returns ownerEmail + member author-ids/emails), `POST /api/admin/authors/invite` (owner-only — insert author_invites + Resend email)
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

**Owner account (`OWNER_EMAIL`)**: Set the email you just created as the `OWNER_EMAIL` env var and that account becomes the bootstrap owner (full permissions automatically, without an invite row). **Set it before the first login** — signing in while it's unset can't resolve an owner and is blocked (the account is *not* deleted in that case, only a config error is shown, so you can set the env var and sign in again). On the owner's first login the `owner` role is persisted into `app_metadata` once (claim-and-close), so ownership survives even if `OWNER_EMAIL` later changes or is removed. All other members are added by email invite (see step 5).

**GitHub OAuth login setup** — members sign in with GitHub OAuth:

1. **Create a GitHub OAuth App** — GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Set the Authorization callback URL to `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
2. In Supabase Dashboard → **Authentication → Providers → GitHub**, enable it and paste the OAuth App's Client ID + Secret
3. Add your site's `/auth/callback` to Supabase **Authentication → URL Configuration → Redirect URLs**

### 5. Admin Login Method

There is no login button on the site. Only the admin accesses it by entering the URL directly.

**GitHub OAuth login** (standard path for members):

1. On `/admin/login`, click **Sign in with GitHub** → `supabase.auth.signInWithOAuth` → GitHub auth → redirect to `/auth/callback`
2. The `/auth/callback` authorization gate checks the email is `OWNER_EMAIL`, already has a role, or has an `author_invites` row — on pass, the role is granted into app_metadata (on the owner's first login the `owner` role is persisted once) and the invite is consumed. If un-invited, the account is deleted and it redirects back to login with an error — except when `OWNER_EMAIL` is unset, where the account is kept and only a config error is shown
3. Success -> Redirect to `/admin/settings`

**Password login** (owner fallback):

1. Go to `/admin/login`
2. Enter the email/password created in Supabase
3. Login success -> Redirect to `/admin/settings`

**Adding members (email invite)**: From Settings → the **Account tab**, the owner invites a member by email, which inserts an `author_invites` row and sends a Resend notice email. When the invitee signs in via GitHub OAuth with that same email, they automatically gain author/editor permission. The owner manages the member list, roles, and permissions from the Account tab (non-owners see only the Account tab).

**Features available after login:**

- `/admin/posts` — Post list (publish/private status, hover preview, row numbers, thumbnails). The series panel above it reorders, deletes, and exports series; creating and editing series happens in Settings → Content → Posts
- `/admin/posts/new` — New post creation (Markdown <-> Rich Text toggle, auto translation, re-translate, auto save + DB revision history + diff comparison + Revert)
- `/admin/posts/[id]/edit` — Edit existing post (PlateEditor loading skeleton)
- `/admin/works` — Works list (table view, publish/private toggle, sort order, thumbnails, .md upload)
- `/admin/works/new` — Create new work (single content editor + template, Korean/English bilingual, tech stack, gallery)
- `/admin/works/[id]/edit` — Edit existing work
- `/admin/settings` — Site settings (General, Content, Appearance, Services, Account — 5 tabs). General tab for brand/SEO (incl. a `defaultLanguage` ko/en Select that decides which language is required in admin authoring forms [title/subtitle/nature/categories] plus the editor's initial language tab — independent of the visitor-facing language)/footer copyright/BGM file upload/audio source (track name/artist/URL) management. Content tab split into Home/Profile/About/Posts/Works sub-navigation. Services tab for email service, AI cover, reCAPTCHA settings and API key editing. Account tab for admin email/password changes + member management (owner-only — member list, roles [owner/editor/author], email invites, permission changes; non-owners see only the Account tab)

### 6. Cover Image Picker Usage

In the Cover Image / Main Image area of the post, series, and work editors, you can choose between **Upload** (direct upload) and **Choose cover** (picker).

Clicking **Choose cover** shows 5 tabs plus a local-file area (it automatically becomes a bottom sheet on mobile):

| Tab | Description | Required Environment Variable |
|----|------|----------------|
| **Presets** | 16 gradients/patterns — clicking one generates a 1200x630 image via the Canvas API and uploads it to Supabase. Local media under `public/cover/images/` · `public/cover/videos/` also appears in the same panel (shared `/api/admin/cover`) | None |
| **Unsplash** | Search Unsplash photos by keyword -> click to trigger download tracking + Supabase upload | `UNSPLASH_ACCESS_KEY` |
| **Pexels** | Search Pexels photos by keyword -> click to download + Supabase upload. A complement to Unsplash (fail-safe if their API policy changes) | `PEXELS_API_KEY` |
| **AI Generate** | Prompt + style selection -> AI image generation -> Supabase upload | Provider-specific API key (see below) |
| **History** | Permanently keeps previously chosen covers (`cover_image_history` table, RLS) — preset / Unsplash / Pexels / AI unified. Inline keyword & palette copy, download, and re-select | None |

> **Note**: The Unsplash, Pexels, and AI Generate tabs each require their own API key. The Presets and History tabs work without any environment variables.

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
2. Copy the key from the **Your API Key** page (issued immediately, no application needed)
3. Enter `PEXELS_API_KEY=...` in `.env.local`

> Free — 200 requests/hour, 20,000/month. Useful as a fallback when Unsplash changes policy or rate-limits you.

#### GitHub Token Setup (only for giscus)

Used solely to auto-load a repository's Discussion categories in the admin settings when comments run on giscus.

1. Go to [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Create a token — **no scopes need to be checked**, since it only reads Discussion categories on public repos
3. Enter `GITHUB_TOKEN=...` in `.env.local`, or save it in the admin **Services** tab (the DB secret takes priority over the environment variable)

> The giscus widget itself works without a token — the token only powers the category auto-lookup convenience in the admin settings screen.

**Authentication flow:**

```
/admin/login (Sign in with GitHub)
  -> supabase.auth.signInWithOAuth({ provider: "github" })
    -> GitHub auth -> GET /auth/callback
      -> exchangeCodeForSession (authenticates only)
      -> authorization gate: email is OWNER_EMAIL || has a role || author_invites row?
        -> pass -> grant role into app_metadata + consume invite (consumed_at)
                   (on the owner's first login, persist the owner role into app_metadata once)
        -> fail & OWNER_EMAIL set   -> signOut() + service-role deleteUser() -> /admin/login with an error
        -> fail & OWNER_EMAIL unset -> no delete, "OWNER_EMAIL not set" config error (set env, sign in again to become owner)
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


</details>

<details>
<summary><strong>Components</strong></summary>

<p align="center">
  <img src="public/images/screenshots/pc/design-system-dark.png" width="100%" alt="Design System — Components Preview" />
  <br />
  <sub>View all tokens and components on the <code>/design-system</code> page</sub>
</p>
