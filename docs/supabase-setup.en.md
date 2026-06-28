# Supabase Setup Guide

Supabase project setup is required for Posts features.

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
| `series` | Blog series (`sort_order` for admin ordering, `auto_cover_url` for Unsplash cache) |
| `posts` | Blog posts (post_number sequence column for unique numbering) |
| `comments` | Post comments (threaded replies, dual auth: commenter_hash + password) |
| `likes` | Likes (unified for posts/works/comments, distinguished by target_type, IP duplicate prevention) |
| `works` | Portfolio works (includes team_members jsonb) |
| `site_visits` | Visitor statistics (1 per IP+date) |
| `work_comments` | Works comments (threaded replies, dual auth) |
| `admin_notifications` | Admin notification logs |
| `revisions` | Editor revision history (shared for posts/works, JSONB snapshot) |
| `poll_votes` | In-content poll block tally (poll_id + option_id — editor-assigned text ids, IP-based duplicate prevention) |
| `series_work_relations` | Series ↔ works many-to-many (related series on a project, same pattern as post_work_relations) |

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

<details>
<summary><strong>Components</strong></summary>

<p align="center">
  <img src="public/images/screenshots/pc/design-system-dark.png" width="100%" alt="Design System — Components Preview" />
  <br />
  <sub>View all tokens and components on the <code>/design-system</code> page</sub>
</p>
