<div align="center">

English | **[한국어](./README.md)**

# HYEONIVERSE

A personal portfolio built with Next.js 16, React 19 and TypeScript.
One repository holds both the public site that shows the work and the admin studio where that work is written and edited.

[![License](https://img.shields.io/badge/license-PolyForm%20NC%201.0-d40063?style=flat-square)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)

**[www.hyeoniverse.com →](https://www.hyeoniverse.com)**

<br />

<img src="public/images/screenshots/pc/home-dark.png" alt="Home — dark" width="100%" />

</div>

---

## Preview

### Home — dark / light

| Dark | Light |
|:---:|:---:|
| <img src="public/images/screenshots/pc/home-dark.png" alt="Home dark" width="100%" /> | <img src="public/images/screenshots/pc/home-light.png" alt="Home light" width="100%" /> |

Scrolling past the hero walks through the works and then the posts.

<img src="public/images/screenshots/pc/home-works-dark.png" alt="Home works section" width="100%" />

### Works

Six layouts, switchable with the `?layout=` query or from the admin settings — Flow (default) · Grid · Cylinder · Fullscreen · Cinematic · Split.

| Flow | Grid | Cylinder |
|:---:|:---:|:---:|
| <img src="public/images/screenshots/pc/works-light.png" alt="Works Flow" width="100%" /> | <img src="public/images/screenshots/pc/works-grid-dark.png" alt="Works Grid" width="100%" /> | <img src="public/images/screenshots/pc/works-cylinder-light.png" alt="Works Cylinder" width="100%" /> |

<details>
<summary><strong>Remaining layouts and the detail page</strong></summary>

<br />

| Fullscreen | Cinematic | Split |
|:---:|:---:|:---:|
| <img src="public/images/screenshots/pc/works-fullscreen-dark.png" alt="Works Fullscreen" width="100%" /> | <img src="public/images/screenshots/pc/works-cinematic-dark.png" alt="Works Cinematic" width="100%" /> | <img src="public/images/screenshots/pc/works-split-dark.png" alt="Works Split" width="100%" /> |

<img src="public/images/screenshots/pc/work-detail-light.png" alt="Work detail" width="100%" />

</details>

### Posts

| List | Detail |
|:---:|:---:|
| <img src="public/images/screenshots/pc/posts-light.png" alt="Post list" width="100%" /> | <img src="public/images/screenshots/pc/post-detail-light.png" alt="Post detail" width="100%" /> |

### Profile · About

| Profile (Three.js) | About |
|:---:|:---:|
| <img src="public/images/screenshots/pc/profile-dark.png" alt="Profile" width="100%" /> | <img src="public/images/screenshots/pc/about-light.png" alt="About" width="100%" /> |

### Editor · Design system

The editor is built on Plate.js. The top toolbar is grouped by what each tool acts on, and the bar that floats over a selection applies text and background colors on the spot.

| Editor | Color tools |
|:---:|:---:|
| <img src="public/images/screenshots/pc/editor-light.png" alt="Editor" width="100%" /> | <img src="public/images/screenshots/pc/editor-color-light.png" alt="Editor color tools" width="100%" /> |

Tokens and components are inspected live at `/design-system`.

| Design system | Mobile |
|:---:|:---:|
| <img src="public/images/screenshots/pc/design-system-light.png" alt="Design system" width="100%" /> | <img src="public/images/screenshots/mobile/home-dark.png" alt="Mobile home" width="49%" /> |

### Admin · CMS

> These images come from `npx tsx scripts/screenshots-cms.ts` (needs a logged-in session — see [scripts/SCREENSHOTS.md](./scripts/SCREENSHOTS.md)); the numbers are that script's scene numbers. Continuous actions (playback · preview · recording · PPTX conversion · translation) are embedded as short `.gif` clips of the key moment (the original `.webm` files sit in the same folder).

#### Dashboard

`/admin` opens on a one-page view of the site. At the top sit **quick actions** (new post · new project · settings · reports · notifications, with pending-report and unread counts as badges) and a **service log** strip (calls and failures in the last 24 hours, providers currently switched off). The **stats** panel counts total views (change vs. the previous 7 days plus a sparkline), published and draft projects and posts, and comments; the donut beside it is the category split by views.

**Daily views** draws any range you pick (up to 90 days) as a curve; click a day in the calendar heatmap below and a panel opens with that day's rank, how it compares to the period average, the same weekday and the day before, and the posts read most that day. Further down come **recent activity** (posts · projects · comments), **reports**, **popular** (views · likes · comments per post, engagement, top tags), a **traffic** summary (sources · devices · 30-day visits · new vs. returning · views per visit) and whether each service key is configured.

| Quick actions · stats | Daily views — click a day for its breakdown |
|:---:|:---:|
| <img src="public/images/screenshots/cms/17-dashboard-light.png" alt="Admin dashboard — quick actions and stats" width="100%" /> | <img src="public/images/screenshots/cms/18-dashboard-daily-views-light.png" alt="Daily views, calendar heatmap and the selected day's panel" width="100%" /> |

#### Traffic

A visit is recorded once per IP per day, together with the user agent (device · browser), referrer, landing path, country and `utm_*` values. The signed-in admin, crawlers (bots) and any address marked **my IP** are not counted, and when today's visits exceed three times the 7-day average a **traffic spike** notification is created once a day. A scheduled job anonymises the IPs of older rows.

On `/admin/traffic` the range (7 · 14 · 30 · 90 days) changes the whole page: visit summary (visits · new · returning · views per visit, bots excluded), daily trend, sources, devices, countries, landing pages, top content, a weekday × hour heatmap and UTM campaigns. **IP analysis** lists masked IPs with days visited, first and latest visit, country and device; marking one as my IP stops recording it and drops what it already contributed. **UTM link builder** composes `utm_source/medium/campaign` from source presets (resume · LinkedIn · X · Kakao · email), so links shared through messengers or PDFs, where no referrer survives, still show up as their own channel.

| Summary · trend · sources · devices | IP analysis · UTM link builder |
|:---:|:---:|
| <img src="public/images/screenshots/cms/19-traffic-light.png" alt="Traffic — range, summary, daily trend, sources, devices" width="100%" /> | <img src="public/images/screenshots/cms/20-traffic-ip-utm-light.png" alt="Traffic — IP analysis and UTM link builder" width="100%" /> |

#### Managing posts and works

The `/admin/posts` and `/admin/works` lists keep search scope (title+body · title · body), sort, category · series · year filters and page size in a glass bar that stays put while you scroll. Clicking a status chip flips **published ↔ unpublished** in place; dragging across the checkbox column selects several rows for **bulk delete** or **bulk category change**. Published rows get a shortcut to the public page, unpublished rows a **preview** rendered exactly like the published page. Posts support **scheduled publishing** (`pg_cron` publishes on time and sends a notification and an email), pinning and a **series** tab (order · export as a set); works are reordered by drag, by clicking the row number or from the row menu (first · last · position), and a **GitHub repository's README can be imported as a work**.

The **trash** is a soft delete. Ordinary items are purged after 30 days, popular ones (top views · likes) after 90, and every row shows the days left with an **extend (+30 days)** button. Restoring is one click; permanent deletion asks you to retype the title. `.md` files go both ways — **upload** (with frontmatter; new categories are confirmed first) and **export** (all · selected · single · series).

| Posts — filters · status chips · bulk actions | Works — ordering · GitHub import · trash |
|:---:|:---:|
| <img src="public/images/screenshots/cms/21-posts-list-light.png" alt="Admin posts list" width="100%" /> | <img src="public/images/screenshots/cms/22-works-list-light.png" alt="Admin works list" width="100%" /> |

#### Notifications · reports · comments · service log

**Notifications** (`/admin/notifications`) have four tabs — all · comments · system · reports — and cover new comments, replies, likes, comment reports, access requests, new-device logins, traffic spikes and system events (login lockout · sign-out everywhere · AI provider failure · mail failure · cron error · settings changed). Items that need action (access requests · new devices) are grouped separately, and the item you arrived from blinks slowly until your next interaction. The **reports** tab filters pending · resolved · dismissed, jumps to the original comment or deletes it in place. **Comments** (`/admin/comments`) gathers post and work comments in one table, filters active · deleted, bulk-deletes and restores deleted comments.

The **service log** (`/admin/service-log`) lists successes and failures of AI (translation · summary · TTS · covers), image search, Resend mail, the GitHub API, scheduled jobs and contact-form attachments, newest first. The top shows per-provider counts and the last failure cause (no key · quota · billing · server error …), the bottom the individual rows, filterable by category · provider · result. The status panel in Settings › Services and the dashboard link in with the filter preset (`?provider=gemini` · `?result=fail`).

| Notifications — four tabs, action-needed group | Service log — per-provider successes and failures |
|:---:|:---:|
| <img src="public/images/screenshots/cms/23-notifications-light.png" alt="Notifications page" width="100%" /> | <img src="public/images/screenshots/cms/24-service-log-light.png" alt="Service log" width="100%" /> |

<img src="public/images/screenshots/cms/25-comments-light.png" alt="Comment management — posts and works together" width="100%" />

#### Settings

`/admin/settings` has six tabs — **General** (personal info · brand and logo · SEO · background music), **Content** (home hero · intro · featured works · marquee · footer · social links · banner, pagination, tags · categories, works intro video, plus PROFILE and ABOUT sub-tabs — ABOUT is the About Studio, edited on the real page), **Library** (calendars · polls · custom emojis · cover image history · uploaded files), **Appearance** (design-system preview · theme colours · date-picker style · typography and font upload), **Services** (per-feature provider order · email · comment system and giscus · security · upload formats and size limits · provider status panel · environment variables) and **Account** (auth · email change · password policy, registered devices and **sign out everywhere**, members and roles — owner · admin · author).

You save a whole tab or one section at a time, with revert and code defaults. Values that cannot be empty (site title · name · the five theme colours · member names, repository details when giscus is selected) are enforced in the UI, the API and the database, and when code defaults change a **conflict list** shows the new value per section so you can take it or keep yours.

| Library — calendars · polls · emojis · covers · files | Account — security / sessions, devices, members |
|:---:|:---:|
| <img src="public/images/screenshots/cms/26-settings-library-light.png" alt="Settings — Library tab" width="100%" /> | <img src="public/images/screenshots/cms/27-settings-account-light.png" alt="Settings — Account tab" width="100%" /> |

#### Login and security

The owner signs in with email and password; invited members **sign in with GitHub** (OAuth only authenticates — the server checks for the owner email, an existing role or an invitation before letting anyone in). Five failed attempts lock the form for 15 minutes with the remaining tries and a countdown shown. An unknown device is signed out automatically and gets an approval link by email (valid 24 hours), and signing out in one tab signs out every open tab.

<img src="public/images/screenshots/cms/28-login-light.png" alt="Admin login — email · password and GitHub sign-in" width="60%" />

#### Narrated gallery

Each slide of a work's gallery can carry **narration and captions**. Playback prefers a prepared audio file (TTS or a recording), falls back to reading the script with browser speech, and otherwise waits four seconds before advancing. Captions are cut from the script by character ratio to follow the audio, and the progress bar below fills one segment per slide. If the browser blocks sound, the gallery first asks "with voice / without voice".

<img src="public/images/screenshots/cms/01-gallery-captions-light.png" alt="Work detail — gallery playing with captions" width="100%" />

<img src="public/images/screenshots/cms/01-gallery-playing-light.gif" alt="captions following the narration" width="100%" />

<sub>▶ Playing — captions follow the narration and the progress bar fills · 🔊 with sound: [watch the mp4](public/images/screenshots/cms/01-gallery-playing-light.mp4) (27 s, with the TTS audio the gallery actually plays)</sub>

In the admin work editor, the **gallery narration editor** is a bench (slide on the left, script on the right) with a thumbnail strip below. Clicking a thumbnail puts that slide on the bench; slides with audio show a speaker badge and slides with only a script show a text badge. The toolbar offers slide navigation, audio history, record, upload a recording, remove audio, edit scripts (the current scripts are prefilled under numbered headings, so you edit them or paste a whole script), translate scripts and the lexicon; on the right you pick a voice (provider · gender · tone) and press **Generate**. Long scripts are chunked at about 600 characters and merged; if the chosen provider fails, the server moves down the fallback order from Settings (Fish Audio → Google Cloud TTS → Edge) with a voice of the same gender. During preview the script fills in **like lyrics**, character by character, and clicking a word seeks to it.

| Script · voice · generate | Preview — lyric highlight |
|:---:|:---:|
| <img src="public/images/screenshots/cms/02-narration-editor-light.png" alt="Gallery narration editor" width="100%" /> | <img src="public/images/screenshots/cms/03-narration-preview-light.png" alt="Preview with highlighted script" width="100%" /> |

<img src="public/images/screenshots/cms/03-narration-preview-light.gif" alt="preview — the script filling in as it plays" width="100%" />

<sub>▶ Preview — the script fills in like lyrics as it plays</sub>

The **pronunciation lexicon** pairs script text with what should be spoken, e.g. `?all=true → "all true condition"`. It applies only when generating audio, longest match first; captions keep the original text. Korean and English scripts have separate dictionaries, and an inline `[text|reading]` in the script wins over the lexicon. Several entries can be pasted at once as `text = reading` lines.

The **recording editor** records from the microphone, then lets you click the waveform to place the cursor or drag a range, and split, cut, copy, paste, delete, keep-only, or trim silence to shape clips (with undo/redo). Clips can be reordered by dragging and pasted into another slide. Finishing uploads a WAV as that slide's audio (up to six minutes).

| Lexicon | Recording editor — range selected, clips split |
|:---:|:---:|
| <img src="public/images/screenshots/cms/04-lexicon-light.png" alt="Pronunciation lexicon" width="100%" /> | <img src="public/images/screenshots/cms/05-recording-editor-light.png" alt="Recording waveform editor" width="100%" /> |

<img src="public/images/screenshots/cms/05-recording-split-light.gif" alt="record → select a range → split" width="100%" />

<sub>▶ Record → select a range on the waveform → split</sub>

**Drop a PPTX onto the gallery** and each slide is rendered in the browser to a JPEG (max 1600px) and uploaded; each slide's **speaker notes become its script**. The gallery header shows "file — rendering n/N" while it runs, and afterwards every thumbnail carries a script badge. PDFs go through the same path.

| Converting — "rendering n/N" | Done — a slide whose notes became the script |
|:---:|:---:|
| <img src="public/images/screenshots/cms/06-pptx-progress-light.png" alt="PPTX conversion progress" width="100%" /> | <img src="public/images/screenshots/cms/07-pptx-thumbnails-light.png" alt="Gallery thumbnails after conversion" width="100%" /> |

<img src="public/images/screenshots/cms/06-pptx-import-light.gif" alt="dropping a PPTX and watching slides render in" width="100%" />

<sub>▶ Drop a PPTX and the slides render into thumbnails</sub>

#### Auto-translation and AI summary

Flip the editor's KO/EN switch to **EN** and, when the source has content and every English field is empty, title, subtitle, description, body and gallery scripts are filled in one pass. If some English fields are already filled, the **Retranslate** button next to the switch lets you pick a scope (all · subtitle · description · body · gallery scripts). Translations land in the form only and persist when you save. **Settings › Services** sets, per feature (translation · AI summary · TTS · AI cover), a primary provider and an ordered fallback list; a provider that keeps failing for the same reason is paused by the health panel (the "failing · off" badges below). The **model name** each provider calls is set in the same tab's AI models fields; leave them empty for the provider's latest alias, so a retired model never requires a code change.

| Editor — English fields filled via Retranslate › All | Settings › Services — providers and fallback order |
|:---:|:---:|
| <img src="public/images/screenshots/cms/08-translate-editor-light.png" alt="Editor auto-translation" width="100%" /> | <img src="public/images/screenshots/cms/09-settings-services-light.png" alt="Settings services tab" width="100%" /> |

<img src="public/images/screenshots/cms/08-translate-editor-light.gif" alt="Translating banner, then English fields filling in" width="100%" />

<sub>▶ Switch to EN and Retranslate › All — the "Translating…" banner, then English fields fill in</sub>

On the public site, a **translation banner** appears when the viewed language has no body, and one button fetches an AI translation in place (posts and works alike). The **AI summary** box above the detail shows the Korean/English summary generated at publish time in the viewed language and can be collapsed.

<img src="public/images/screenshots/cms/10-translate-banner-light.png" alt="Translation banner — a work without an English body, viewed in EN" width="100%" />

#### Theme

**Settings › Appearance › Theme colors** sets five colors: the accent plus light/dark background and text. The 18 presets (Default · Ruby · Meadow · Coral · Azure · Sand · Harvest · Honey · Forest · Rosewood · Dusk · Arctic · Baltic · Sorbet · Twilight · Tropica · Petal · Slate) keep their accents at least ΔE 20 apart, and the current five colors can be saved as your own preset with **+**. Picking colors updates the **WCAG contrast report** for body text, muted text, accent links, accent graphics and button text in both modes, plus the link↔body color difference. When the accent is used as text, the site shifts only its lightness to reach 4.5:1, shown in the table as "auto-corrected".

| Presets | Contrast report |
|:---:|:---:|
| <img src="public/images/screenshots/cms/12-theme-presets-light.png" alt="Theme presets" width="100%" /> | <img src="public/images/screenshots/cms/12-theme-contrast-light.png" alt="Contrast report" width="100%" /> |

**Color suggestions** come from the color wheel (analogous · complementary · split · triadic · monochrome) or from an image, whose six dominant colors become candidates. The image is read locally and never uploaded.

| Color wheel | From an image |
|:---:|:---:|
| <img src="public/images/screenshots/cms/13-theme-wheel-light.png" alt="Color wheel suggestions" width="100%" /> | <img src="public/images/screenshots/cms/13-theme-from-image-light.png" alt="Colors extracted from an image" width="100%" /> |

The same home page under three presets — Arctic · Rosewood · Meadow, in light and dark. Only the five colors (background, text, accent) change; the neutral scale in between is derived from them by the site.

<img src="public/images/screenshots/cms/14-home-presets-light.png" alt="Home — Arctic · Rosewood · Meadow (light)" width="100%" />

<img src="public/images/screenshots/cms/14-home-presets-dark.png" alt="Home — Arctic · Rosewood · Meadow (dark)" width="100%" />

#### Linking posts and works · SEO check

Works link related posts and series; posts link related projects, all through a searchable picker that lists number, thumbnail and year and marks unpublished items as Draft. Chosen chips are drag-sortable and show up in the public detail header. The **SEO check** pill at the editor's bottom right counts six items (title · slug · excerpt of 30+ chars · cover · category · tags) as "5/6"; opening it separates what still needs work from what is done, and clicking an item scrolls to that field and flashes it.

| Relation picker — post editor | SEO check |
|:---:|:---:|
| <img src="public/images/screenshots/cms/15-relation-picker-light.png" alt="Relation picker" width="100%" /> | <img src="public/images/screenshots/cms/16-seo-checklist-light.png" alt="SEO checklist panel" width="100%" /> |

---

## At a Glance

| Area | Highlights |
|:---|:---|
| **Interaction** | Infinite scroll loop, mouse parallax, StaggerText, a Three.js coffee cup, direction-aware scroll cascade |
| **Works** | Six layouts (Flow · Fullscreen · Cinematic · Grid · Split · Cylinder) and detail pages |
| **Posts** | SSR + ISR, series, banner slider, six list layouts, guest comments (markdown + emoji reactions) or giscus |
| **Admin** | Dashboard (stats · daily views · popular · reports · service status) · traffic analytics (sources · devices · countries · landing pages · IP · UTM) · notifications · service log, Plate.js editor (diagram · code playground · math blocks, color tools, publish toggle), `.md` sync, AI translation and summaries, narrated galleries (TTS · recording · PPTX speaker notes), theme presets with WCAG contrast report, revision history, member invites and roles |
| **Performance** | Lighthouse 98 — LCP 1.9s, 449KB initial bundle |
| **Security** | RLS with four roles, CSRF origin checks (fail-closed in production), five-attempt lockout plus new-device email approval |
| **Design system** | Three-tier tokens (Raw → Semantic → Component) with role tokens, all colors in OKLCH |

---

## Tech Stack

| Category | Technology |
|:---|:---|
| Framework | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5 |
| Styling | CSS Modules + CSS variables in three tiers, enforced by stylelint |
| Animation | Framer Motion · GSAP · Lenis |
| 3D | Three.js · React Three Fiber · Drei |
| Backend | Supabase (PostgreSQL · Auth · Storage · RLS) |
| Editor | Plate.js (Slate) + Markdown · React Flow · Sandpack · CodeMirror 6 · KaTeX |
| Comments | Built-in (marked + isomorphic-dompurify) or giscus — switchable from the admin |
| Integrations | Unsplash · Pexels (cover images), DeepL · OpenAI and others (translation), Resend (mail), NanoBanana · Hugging Face (AI images) |
| Testing | Vitest + Testing Library · Playwright smoke suite |

---

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and keys
npm run dev                  # http://localhost:3000
```

Posts, works and the admin need a Supabase project. Table SQL, storage buckets, creating the admin account and the optional keys for cover images and translation are laid out in order in **[docs/supabase-setup.en.md](./docs/en/supabase-setup.md)**.

Commands used often:

```bash
npm run build          # production build
npm test               # unit tests (Vitest)
npm run test:smoke     # smoke e2e (needs a build)
npm run audit:full     # typecheck + eslint + stylelint + knip
npm run sync-all       # sync content/*.md with the database
```

---

## Documentation

| Document | Contents |
|:---|:---|
| [Features](./docs/en/features.md) | Every feature by screen — interaction, works, posts, admin, performance, security |
| [Supabase setup](./docs/en/supabase-setup.md) | Environment variables, tables, storage, admin account, cover images |
| [Deployment](./docs/en/deploy.md) | Vercel, domains, mail, post-deploy checks |
| [Testing](./docs/en/testing.md) | Vitest suites, smoke e2e, preparing the admin session |
| [Design system](./docs/design-system.md) | Three token tiers, per-axis rules with enforcement status, `@layer` and migration plan (token values in the [generated table](./docs/tokens.md)) |
| [Troubleshooting](./docs/en/troubleshooting.md) | What broke, why, and how it was fixed |
| [Components](./docs/en/components.md) · [DB design](./docs/en/db-design.md) · [Security](./docs/en/security.md) · [User flow](./docs/en/user-flow.md) | Area deep dives |
| [Editor guide](./docs/en/editor-guide.md) | Editor usage and `.md` authoring rules |
| [Refactoring guide](./docs/refactoring-guide.md) · [Performance baseline](./docs/perf-baseline.md) | Structural cleanup notes and the performance baseline |

---

## Project Structure

```
src/
├─ app/           # App Router — (home) · works · posts · about · profile · admin · api
├─ components/    # per-screen components plus shared ui/
├─ styles/        # tokens/ (raw) · globals/ (semantic · component)
├─ providers/     # theme · language · scroll
├─ lib/ hooks/ stores/ utils/
└─ locales/       # Korean · English
content/          # .md sources (posts · works · about), synced with the database
docs/             # documentation
e2e/ scripts/     # smoke tests · sync and screenshot scripts
supabase/         # migration SQL
```

---

## Commit Convention

Follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). The type list and examples live in **[docs/commit-convention.md](./docs/commit-convention.md)**.

---

<div align="center">

## License

[PolyForm Noncommercial License 1.0.0](./LICENSE)

Free to use, modify and distribute, but **not for commercial use**.

</div>
