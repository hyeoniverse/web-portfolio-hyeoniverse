# Supabase Setup Guide

Posts, works, comments, and the admin screens need a Supabase project.

### 1. Environment Variables

Copy [`.env.example`](../../.env.example) to `.env.local` and fill it in. The values needed for Supabase and sign-in are:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Bootstrap owner email. This account gets owner permission without an invite
OWNER_EMAIL=you@example.com

# Site address. The baseline for the proxy (src/proxy.ts) CSRF Origin check and the mail sender domain
# If it is empty in a deployed environment, every write request to /api/* is 403. Local runs skip the check
SITE_URL=https://your-domain.com

# Cover image search (optional)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
PEXELS_API_KEY=your_pexels_api_key

# AI cover generation (optional). Only the key of the provider you use is needed
HUGGINGFACE_API_KEY=hf_...
NANOBANANA_API_KEY=your_key

# Translation · AI summary (optional). Only the key of the provider you use is needed
DEEPL_API_KEY=your_deepl_key
GOOGLE_TRANSLATE_API_KEY=your_google_key
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key

# GitHub API token (optional). Profile/home GitHub integration and giscus Discussion category lookup
GITHUB_TOKEN=ghp_...
```

The remaining optional keys (contact form, reCAPTCHA, Resend, TTS, scheduled jobs, e2e account) and what each one does are listed in [deploy.md](./deploy.md#2-environment-variables).

Which provider runs first is not chosen by environment variables. It is chosen in admin **Settings › Services**. That screen stores the default provider and the order to fall back to on failure (fallback priority) in `site_settings`. The `aiCover` · `translation` · `aiSummary` · `tts` values in `src/config/site.config.ts` are defaults used only when nothing is stored.

API keys can also be stored on the same screen (Settings › Services › Environment variables). The server uses a key stored in the DB first and falls back to the environment variable (`src/lib/getSecret.ts`). Values that screen cannot edit, such as the Supabase keys, `SITE_URL`, `OWNER_EMAIL`, and `CRON_SECRET`, are set only in `.env.local` and the Vercel environment variables.

Set `OWNER_EMAIL` before the first sign-in. When the owner signs in for the first time, the `owner` role is stored once in `app_metadata` (claim-and-close). After that, ownership survives even if this value changes or becomes empty. The GitHub OAuth Client ID and Secret are not set in `.env.local`. They are set in the Supabase dashboard under **Authentication → Providers → GitHub** (see step 4).

**How to find the values:**

1. [Supabase Dashboard](https://supabase.com/dashboard) -> Select your project
2. **Settings** -> **API** tab
3. `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
4. `anon` `public` key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. `service_role` `secret` key -> `SUPABASE_SERVICE_ROLE_KEY`

> **Warning**: The `service_role` key bypasses RLS and must never be exposed to the client. `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix and is only used server-side.

### 2. Create Database Tables

[`supabase/setup.sql`](../../supabase/setup.sql) contains the tables, RLS policies, functions, scheduled jobs, and Storage bucket creation. Paste the file into Supabase Dashboard -> **SQL Editor** and run it once.

**Tables created (26):**

| Table | Purpose |
|--------|------|
| `site_settings` | Site settings, profile, secrets (API keys). Stored as JSONB in three rows whose `id` is `default` · `profile` · `secrets` |
| `series` | Blog series (`sort_order`, `auto_cover_url` Unsplash cache, 80-char title CHECK) |
| `posts` | Blog posts (`post_number` sequence, `scheduled_at` scheduled publishing, `purge_after` trash deadline, `version` optimistic lock, `author_ids`) |
| `comments` | Post comments (replies, dual auth: `commenter_hash` + password) |
| `work_comments` | Work comments (same structure as `comments`) |
| `comment_reactions` | Comment emoji reactions (fixed 8, `comment_type` splits post/work) |
| `comment_reports` | Comment reports (reason + handling status) |
| `likes` | Likes (posts, works, and comments split by `target_type`, IP dedup) |
| `works` | Works (slug, ko/en title, `categories_ko/en text[]`, `nature_ko/en`, `contributions_ko/en`, `tech_notes`, `team_members`, `gallery_notes`, `is_pinned` · `view_count` · `like_count`) |
| `page_views` | The site's view log. Visits, visitors, referrers, devices, countries, UTM, time on page, and post/work view counts all come from here |
| `traffic_excluded_ips` | IPs the operator marked as "my IP". Visits from them are not recorded and are excluded from totals |
| `admin_notifications` | Admin notification log |
| `revisions` | Editor revision history (shared by posts/works, JSONB snapshot) |
| `post_work_relations` | Posts ↔ works many-to-many |
| `series_work_relations` | Series ↔ works many-to-many |
| `poll_votes` | In-body poll block tallies (`poll_id` + `option_id`, IP dedup) |
| `calendars` | Shared calendars referenced by the editor's calendar block (30-day trash) |
| `custom_emojis` | Custom icons uploaded in the emoji picker |
| `cover_image_history` | Cover image selection history (per user, RLS) |
| `admin_login_attempts` | Admin sign-in failure count (5 failures -> 15-minute lock) |
| `admin_known_devices` | Record of device fingerprints admins signed in from (a new device triggers a notice email and admin notification, it is not blocked) |
| `security_settings` | One-row security settings (`mfa_required` — require two-factor authentication, default true). Read only through `mfa_required()` |
| `applied_migrations` | Applied migration log (notifies on first apply) |
| `author_invites` | Email author invites (`email` PK, `author_id`, `permission_level` 1=author / 2=editor, `consumed_at`) |
| `service_logs` | Success/failure log of AI, external services, mail, GitHub, and scheduled jobs (kept 90 days) |
| `content_translations` | Translation cache used when reading in languages other than ko · en (re-translated when the source hash changes) |
| `demo_usage` | Daily usage count of the About live demos (translation, summary, cover, speech) (kept 7 days) |

The older `site_visits` · `post_views` · `work_views` tables were merged into `page_views` and dropped by the 2026-10-17 migration (`2026_10_17_drop_legacy_views.sql`).

> Uses `IF NOT EXISTS`, so existing tables are skipped. Columns missing from an existing deployed DB (commenter_hash, updated_at, etc.) are safely added via `ALTER TABLE ADD COLUMN IF NOT EXISTS` in the migration section at the bottom of the file.

**setup.sql vs. migrations**: `custom_emojis` is created only by `setup.sql`. No migration file creates it. The post title length CHECKs (`posts_title_len` / `posts_title_en_len`, 120 chars) exist in both, but `setup.sql` adds them as `NOT VALID` and does not check existing rows, while `2026_07_13_posts_title_len.sql` checks existing rows immediately. For a fresh setup, running `setup.sql` once is enough.

**Two-factor migration (existing DBs):** `2026_10_22_rls_require_aal2.sql` narrows RLS role checks to aal2 (authenticator-verified) sessions and creates `security_settings` · `mfa_required()`. A fresh setup already has it in `setup.sql`. On an existing DB keep the order: deploy the code → every admin account enrolls an authenticator at `/admin/mfa` → run this file in the SQL Editor. Running it before enrolling leaves aal1 sessions without a role, so admin data disappears. Details in [security.md](./security.md#three-layers-enforcing-two-factor-authentication).

**Manual migrations (optional):** The two files below rewrite data, so they are not applied automatically. Run them yourself in the SQL Editor only when needed.

| File | What it does |
|------|---------|
| `2026_07_13_category_reset.sql` | Removes the category override from `site_settings` and remaps `posts.category` / `series.category` to the new taxonomy. **It updates every row with no WHERE clause, and any value missing from the mapping is absorbed into `ELSE '기타'`**, so always check the distribution output from step [0] before running it |
| `2026_07_13_tag_descriptions_reset.sql` | Removes the `tagDescriptions` override from `site_settings` so the default dictionary in `site.config.ts` shows through (does not touch `posts.tags` / `tag_notes`) |

> **Works without Supabase**: When environment variables are not set, it automatically falls back to static data from Works (`data/projects.ts`), Profile (`data/profile.ts`), and Settings (`config/site.config.ts`).

**The API route list** is not kept in the docs. [`src/data/generated/apiMap.ts`](../../src/data/generated/apiMap.ts), built before each build from the `route.ts` files under `src/app/api` and `src/app/auth`, records each route's methods, access level, tables, and external services. Run `npm run gen-api-map` to rebuild it. The About page's architecture chapter draws this file.

### 3. Storage Buckets

`setup.sql` creates two public buckets.

| Bucket | Public | Used by |
|------|------|---------|
| `uploads` | Public | General attachments from `/api/admin/upload` (logo, resume, BGM, etc.) |
| `posts` | Public | Post images and covers (`/api/upload`, AI generation, Unsplash download) |

Both buckets have only a public SELECT policy and no upload policy. Browser uploads go only through signed URLs issued by the server (`/api/upload/signed-url`), and server uploads use service_role. Opening INSERT to `authenticated` would let members skip the server's extension and size checks, so there is no such policy.

The contact form attachment bucket `contact-attachments` is created by the migration `2026_10_19_contact_attachments_bucket.sql`. It is private with a 25MB size limit and has no policies. The visitor's browser uploads through a signed URL issued by `/api/contact/upload`, and the mail body carries a 7-day download link made by the server.

### 4. Create Admin Account

Supabase Dashboard -> **Authentication** -> **Users** -> **Add user**:

- Enter Email and Password
- Check **Auto Confirm User** (skip email verification)

**Owner account (`OWNER_EMAIL`)**: Set the email created above as `OWNER_EMAIL` and that account becomes the bootstrap owner. Set it before the first sign-in. Signing in without it leaves the app unable to identify the owner, so entry is blocked. In that case the account is not deleted and only a setup notice is shown, so set the value and sign in again. Other members are added by email invite (see step 5).

**GitHub OAuth sign-in setup** — members sign in with GitHub OAuth:

1. **Create a GitHub OAuth App**: GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Set the Authorization callback URL to `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
2. In Supabase Dashboard → **Authentication → Providers → GitHub**, enable it and paste the OAuth App's Client ID + Secret
3. In Supabase **Authentication → URL Configuration → Redirect URLs**, add your site's `/auth/callback`

### 5. Admin Login

The sign-in screen is `/admin/login`. The **Login** link in the footer goes there (`/admin/login?next=/admin`).

**GitHub OAuth login** (standard path for members):

1. On `/admin/login`, **Sign in with GitHub** -> `supabase.auth.signInWithOAuth` -> GitHub auth -> back to `/auth/callback`.
2. `/auth/callback` checks whether the email is `OWNER_EMAIL`, already has a role, or has an invite in `author_invites`. If it passes, the invite is consumed and the role is put into `app_metadata`. On the owner's first sign-in, the `owner` role is stored once. If none of the three apply, the account is deleted and the user is sent back to the sign-in screen with an error. If `OWNER_EMAIL` is empty, the account is not deleted and only a setup error is shown.
3. On success it goes to the `next` address. Without `next` it goes to `/admin` (dashboard).

**Password login** (owner fallback):

1. Go to `/admin/login`
2. Enter the email/password created in Supabase
3. On success it goes to the `next` address, or `/admin/settings` without `next`. An unknown device only gets a notice mail; it is not blocked.

**Two-factor authentication** (required for every role): a session from a password or GitHub sign-in is aal1, so the proxy sends it to `/admin/mfa`. The first time, you enroll an authenticator app (TOTP) via QR code; after that you only enter the 6-digit code. Once verified the session is aal2 and you continue to the original address. Supabase TOTP MFA is free on every plan and enabled by default, so nothing needs configuring in the dashboard (the paid phone/SMS MFA is not used).

**Adding members (email invite)**: When the owner invites a member by email from Settings › **Account**, an `author_invites` row is created and a Resend notice mail is sent. When the invitee signs in with GitHub under the same email, they get author or editor permission. The owner manages the member list, roles, and permissions on the same tab.

**Screens available after sign-in:**

- `/admin`: Dashboard. Traffic, notifications, reports, comments, and the service log screens sit under it.
- `/admin/posts`: Post list. The series panel above it reorders, deletes, and exports series.
- `/admin/posts/new` · `/admin/posts/[id]/edit`: Post editor (Markdown ↔ Rich Text, auto translation, auto save + revision history + diff comparison)
- `/admin/works`: Works list (publish toggle, sort order, `.md` upload)
- `/admin/works/new` · `/admin/works/[id]/edit`: Work editor (ko/en, tech stack, gallery)
- `/admin/settings`: Site settings. It has six tabs.

| Tab | Contents |
|----|------|
| General | Personal info and contact, SEO metadata (including the default content language), BGM |
| Content | Home · Profile · Works · Posts sub-tabs |
| Library | Calendars, polls, custom emojis, cover history, files, comment images |
| Appearance | Theme, typography, date picker style, brand (logo, favicon) |
| Services | Email service, AI cover · summary · models, reCAPTCHA, translation, TTS, comment notification mail, comment provider, media limits, API keys |
| Account | Admin email and password, security, member management (owner only) |

Only the owner can open the five tabs other than Account. Members who are not the owner see only the Account tab (`canOpenSettingsTab` in `src/lib/adminAccess.ts`).

The default content language (`metadata.defaultLanguage`) decides which language is required in the admin authoring forms and which language tab the editor opens first. It is unrelated to the language visitors see.

### 6. Cover Image Picker Usage

In the cover image area of the post, series, and work editors, choose **Upload** (direct upload) or **Choose cover** (picker). **Choose cover** shows six tabs. On mobile it opens as a bottom sheet.

| Tab | Description | Required Environment Variable |
|----|------|----------------|
| **Presets** | 16 gradient presets and a gradient editor. On selection it renders an image with the Canvas API and uploads it to Supabase. Local videos in `public/cover/videos/` appear in the same tab (`/api/admin/cover`) | None |
| **Project** | Pick images committed under `public/images/screenshots/`, grouped by folder (`/api/admin/project-images`) | None |
| **Unsplash** | Search Unsplash photos by keyword -> on selection, record the download + upload to Supabase | `UNSPLASH_ACCESS_KEY` |
| **Pexels** | Search Pexels photos by keyword -> on selection, upload to Supabase | `PEXELS_API_KEY` |
| **AI Generate** | Prompt + style -> AI image generation -> upload to Supabase. Shown only when the AI cover is enabled in Settings › Services | Provider-specific API key (see below) |
| **History** | Covers picked so far (`cover_image_history`). Pick again, download, copy keywords and palette | None |

---

#### AI Generate — Provider Setup

The provider is chosen in the AI cover section of admin **Settings › Services**, together with the order to fall back to on failure. `aiCover.provider` in `site.config.ts` is the default used when nothing is stored.

| Provider | Model | Environment Variable | Price | How to Get |
|----------|------|----------|------|-----------|
| **huggingface** | Chosen in Settings › Services. The default `latest` is the most popular text-to-image model on the Hub that can run right now (Inference Providers auto routing) | `HUGGINGFACE_API_KEY` | Billed per provider (monthly free credits) | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) -> New token -> Check `Inference Providers` permission |
| **nanobanana** | Chosen in Settings › Services. `nanobanana-2` (default, latest) · `nanobanana-pro` · `nanobanana` | `NANOBANANA_API_KEY` | ~$0.02/image (free credits on signup) | [nanobananaapi.ai/api-key](https://nanobananaapi.ai/api-key) -> Sign up -> Copy API Key |

**Setup example (.env.local):**

```env
# When using Hugging Face (recommended — free)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Or when using NanoBanana
# NANOBANANA_API_KEY=nb_xxxxxxxxxxxxxxxx

```

Set only the key of the provider you use. Leave the keys of unused providers empty.

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

#### GitHub Token Setup

Used by the profile/home GitHub integration (repository lists, organization repositories, the contribution graph) and, when comments run on giscus, to auto-load a repository's Discussion categories in the admin settings.

1. Go to [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Create a token — **no scopes need to be checked**, since it only reads public data
3. Enter `GITHUB_TOKEN=...` in `.env.local`, or save it in the admin **Services** tab (the DB secret takes priority over the environment variable)

> Without a token, public repository lists are fetched anonymously, but the anonymous quota is 60 requests per hour per IP — once it runs out, organization repositories drop out intermittently. The `/profile` contribution graph is GraphQL-only and strictly requires a token.
>
> **If organization repositories go missing**: organizations may reject fine-grained (`github_pat_`) tokens whose lifetime exceeds 366 days. Reissue the token with a lifetime of one year or less, or use a classic (`ghp_`) token.

**Authentication flow:**

The block below lists the sign-in paths and the path into the admin screens, in order.

```
/admin/login (Sign in with GitHub)
  -> supabase.auth.signInWithOAuth({ provider: "github" })
    -> GitHub auth -> GET /auth/callback?next=…
      -> exchangeCodeForSession (authenticates only)
      -> authorization gate: email is OWNER_EMAIL || has a role || author_invites row?
        -> pass -> grant role into app_metadata + consume invite (consumed_at)
                   (on the owner's first login, store the owner role into app_metadata once)
        -> fail & OWNER_EMAIL set   -> signOut() + service-role deleteUser() -> /admin/login with an error
        -> fail & OWNER_EMAIL unset -> no delete, "OWNER_EMAIL not set" error
  -> go to next (default /admin)

/admin/login (form submit — owner fallback)
  -> POST /api/admin/auth
    -> per-IP limit (20 per 10 min) -> lockout check (admin_login_attempts, lowercased email) -> signInWithPassword()
    -> record device (new device -> notice mail + admin notification)
    -> set session cookie (aal1)
  -> go to next (default /admin/settings) with a full page load (window.location.assign)

Accessing /admin/*
  -> proxy: no signed-in user -> /admin/login, aal1 session -> /admin/mfa?next=…, page above the user's permission -> /admin/posts
  -> Dashboard layout: no user from getUser() -> /admin/denied
  -> server helpers re-check the app_metadata role
  -> AdminAuthSync subscribes to onAuthStateChange -> SIGNED_OUT in another tab -> /admin/login

Accessing /admin/login
  -> Auth layout checks the session
  -> already signed in -> /admin
```

See [testing.md](./testing.md) for how to run the tests, and [design-system.md](../design-system.md) and the `/design-system` page for tokens and components.
