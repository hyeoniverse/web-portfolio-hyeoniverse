<div align="center">

English | **[한국어](./README.md)**

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/images/logo/wordmark-light.svg" />
  <img src="public/images/logo/wordmark-dark.svg" alt="HYEONIVERSE" width="360" />
</picture>

<br />
<br />

**One repository for a personal site that shows work, publishes writing and runs itself.**

It holds both the public site and the admin (CMS) used to write and edit everything on it.

<br />

[![License](https://img.shields.io/badge/license-PolyForm%20NC%201.0-d40063?style=flat-square)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Three.js](https://img.shields.io/badge/Three.js-R3F-000?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

**[✦ Visit the site](https://www.hyeoniverse.com)** &nbsp;·&nbsp; **[All features](./docs/en/features.md)** &nbsp;·&nbsp; **[Security](./docs/en/security.md)** &nbsp;·&nbsp; **[Troubleshooting](./docs/en/troubleshooting.md)**

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/home-dark.png" />
  <img src="docs/images/home-light.png" alt="Home" width="100%" />
</picture>

<sub>The home page shows in dark or light to match your GitHub theme.</sub>

</div>

<br />

<p align="center">
  <a href="#-highlights">Highlights</a> ·
  <a href="#-preview">Preview</a> ·
  <a href="#-admin--cms">Admin · CMS</a> ·
  <a href="#-tech-stack">Tech stack</a> ·
  <a href="#-quick-start">Quick start</a> ·
  <a href="#-documentation">Documentation</a>
</p>

---

## ✦ Highlights

<table>
  <tr>
    <td width="33%" valign="top">
      <img src="public/images/screenshots/pc/works-cylinder-light.png" alt="Works, Cylinder layout" width="100%" />
      <br /><strong>Six work layouts</strong>
      <br /><sub>Flow · Grid · Cylinder · Fullscreen · Cinematic · Split, switched in the admin or with <code>?layout=</code>.</sub>
    </td>
    <td width="33%" valign="top">
      <img src="docs/images/post-read-aloud-light.png" alt="Read aloud" width="100%" />
      <br /><strong>Read aloud</strong>
      <br /><sub>Browser speech reads from the title to the body block by block and highlights where it is.</sub>
    </td>
    <td width="33%" valign="top">
      <img src="docs/images/highlight-editor.png" alt="Editor and color tools" width="100%" />
      <br /><strong>Plate.js editor</strong>
      <br /><sub>Diagram · code playground · math blocks, a floating color toolbar, autosave and revisions.</sub>
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="public/images/screenshots/cms/01-gallery-playing-light.gif" alt="Narrated gallery with captions" width="100%" />
      <br /><strong>Narrated gallery</strong>
      <br /><sub>Per-slide TTS or recorded narration with captions; PPTX speaker notes become the script.</sub>
    </td>
    <td width="33%" valign="top">
      <img src="public/images/screenshots/cms/08-translate-editor-light.gif" alt="Auto-translation" width="100%" />
      <br /><strong>AI translation · summary</strong>
      <br /><sub>One KO/EN switch fills everything from the title to gallery scripts; failing providers fall back in order.</sub>
    </td>
    <td width="33%" valign="top">
      <img src="public/images/screenshots/cms/12-theme-presets-light.png" alt="Theme presets" width="100%" />
      <br /><strong>Theme · brand</strong>
      <br /><sub>Five colors retheme the whole site with a live WCAG contrast check; logos are tuned against an unsaved preview.</sub>
    </td>
  </tr>
</table>

| Area | Highlights |
|:---|:---|
| **Interaction** | Infinite scroll loop, mouse parallax, StaggerText, Three.js 3D (home torus · coffee cup, profile character), direction-aware scroll cascade |
| **Works** | Six layouts, detail pages, slide gallery (narration · captions) |
| **Posts** | SSR + ISR, series, banner slider, six list layouts, read aloud, guest comments (markdown + emoji reactions) or giscus |
| **Admin** | Dashboard · traffic analytics · notifications · service log, Plate.js editor, `.md` sync, AI translation and summaries, narrated galleries (TTS · recording · PPTX speaker notes), theme presets with WCAG contrast report, revision history, member invites and roles |
| **Security** | Four-tier RLS roles, CSRF origin check (fail-closed in production), 5-attempt login lockout plus email approval for new devices |
| **Design system** | Three token tiers (Raw → Semantic → Component) plus role tokens, all colours in OKLCH |

---

## ✦ Preview

### Home

| Dark | Light |
|:---:|:---:|
| <img src="docs/images/home-dark.png" alt="Home, dark" width="100%" /> | <img src="docs/images/home-light.png" alt="Home, light" width="100%" /> |

Further down, the home page walks through works and posts as you scroll.

<img src="public/images/screenshots/pc/home-works-dark.png" alt="Home works section" width="100%" />

### Works

Six layouts can be swapped with the `?layout=` query or from the admin: Flow (default) · Grid · Cylinder · Fullscreen · Cinematic · Split.

| Flow | Grid | Cylinder |
|:---:|:---:|:---:|
| <img src="public/images/screenshots/pc/works-light.png" alt="Works, Flow" width="100%" /> | <img src="public/images/screenshots/pc/works-grid-dark.png" alt="Works, Grid" width="100%" /> | <img src="public/images/screenshots/pc/works-cylinder-light.png" alt="Works, Cylinder" width="100%" /> |

<details>
<summary><strong>Other layouts and the detail page</strong></summary>

<br />

| Fullscreen | Cinematic | Split |
|:---:|:---:|:---:|
| <img src="public/images/screenshots/pc/works-fullscreen-dark.png" alt="Works, Fullscreen" width="100%" /> | <img src="public/images/screenshots/pc/works-cinematic-dark.png" alt="Works, Cinematic" width="100%" /> | <img src="public/images/screenshots/pc/works-split-dark.png" alt="Works, Split" width="100%" /> |

<img src="public/images/screenshots/pc/work-detail-light.png" alt="Work detail" width="100%" />

</details>

### Posts

| List | Detail |
|:---:|:---:|
| <img src="docs/images/posts-light.png" alt="Post list" width="100%" /> | <img src="docs/images/post-detail-light.png" alt="Post detail" width="100%" /> |

<sub>The post list and detail were captured with sample posts used for layout checks.</sub>

### Read aloud

The **Listen** button on post and work pages reads the page with browser speech (Web Speech API). No server TTS is called, so it costs nothing.

- It reads the title → summary → details such as date and author → body blocks, highlights the block being read and scrolls to it when it is off screen.
- A floating bar at the bottom offers previous · pause · next · speed (1 · 1.25 · 1.5 · 0.75×, remembered) · stop. Clicking a paragraph starts reading from there.
- Blocks that make no sense as sound are only announced: a code block as "code block, language, N lines", math as "math", video and embeds by kind.
- Small tables are read row by row with their headers; large tables only announce their size and expand row by row when clicked. Images read their alt text and caption.
- Anything hidden on screen, such as the inside of a closed toggle, is skipped. Each block picks a Korean or English voice on its own.

<img src="docs/images/post-read-aloud-light.png" alt="Read aloud: reading the title, with the control bar at the bottom" width="100%" />

<sub>▶ Reading the title. The block being read is highlighted, and the bar at the bottom shows "reading 1/9" with previous · pause · next · speed · stop.</sub>

### Profile · About

| Profile (Three.js) | About |
|:---:|:---:|
| <img src="public/images/screenshots/pc/profile-dark.png" alt="Profile" width="100%" /> | <img src="docs/images/about-dark.png" alt="About: constellation map" width="100%" /> |

The About page starts from a constellation map. Clicking a star flies into that chapter, and scrolling moves through the chapters in order, from 01 at a glance to 10 FAQ. Its content is built from `content/about/*.md` at build time.

<img src="docs/images/about-chapter-dark.png" alt="About chapter 02: features" width="100%" />

### Editor · design system

The editor is built on Plate.js. The top toolbar is grouped by scope, and selecting text brings up a floating bar for text and background colours.

| Editor | Colour tools |
|:---:|:---:|
| <img src="public/images/screenshots/pc/editor-light.png" alt="Editor" width="100%" /> | <img src="public/images/screenshots/pc/editor-color-light.png" alt="Editor colour tools" width="100%" /> |

Tokens and components can be checked live at `/design-system`.

| Design system | Mobile |
|:---:|:---:|
| <img src="docs/images/design-system-light.png" alt="Design system" width="100%" /> | <img src="docs/images/home-mobile-dark.png" alt="Mobile home" width="45%" /> |

---

## ✦ Admin · CMS

> Admin captures come from `npx tsx scripts/screenshots-cms.ts` (needs a logged-in session, see [scripts/SCREENSHOTS.md](./scripts/SCREENSHOTS.md)). Continuous actions (playback · preview · recording · PPTX conversion · translation) are embedded as short `.gif` clips. Open **Details** under each part for how it works.

### Dashboard

| Quick actions · stats | Daily visitors · per-day breakdown |
|:---:|:---:|
| <img src="public/images/screenshots/cms/17-dashboard-light.png" alt="Admin dashboard: quick actions and stats" width="100%" /> | <img src="public/images/screenshots/cms/18-dashboard-daily-views-light.png" alt="Daily visitors, calendar heatmap and the selected day's panel" width="100%" /> |

<details>
<summary><strong>Details</strong></summary>

<br />

`/admin` opens on a one-page view of the site. At the top sit **quick actions** (new post · new project · settings · reports · notifications, with pending-report and unread counts as badges) and a **service log** strip (calls and failures in the last 24 hours, providers currently switched off). The **stats** panel leads with the visitor count (change vs. the previous 7 days plus a sparkline), with visits, page views, average time on page and the counting start date on one line below, then published and draft projects and posts, and comments. The donut beside it is the category split by views.

**Daily visitors** draws any range you pick (up to 90 days) as a curve. Click a day in the calendar heatmap below and a panel opens with that day's rank, how it compares to the period average, the same weekday and the day before, and the posts read most that day. Further down come **recent activity** (posts · projects · comments), **reports**, **popular** (views · likes · comments per post, engagement, top tags), a **traffic** summary (sources · devices · 30-day visits · new vs. returning · views per visit) and whether each service key is configured.

</details>

### Traffic

| Summary · trend · sources · devices | IP analysis · UTM link builder |
|:---:|:---:|
| <img src="public/images/screenshots/cms/19-traffic-light.png" alt="Traffic: range, summary, daily trend, sources, devices" width="100%" /> | <img src="public/images/screenshots/cms/20-traffic-ip-utm-light.png" alt="Traffic: IP analysis and UTM link builder" width="100%" /> |

<details>
<summary><strong>Details</strong></summary>

<br />

There is one view log, `page_views`. Every page view (including in-site navigation) adds a row, and a repeat view of the same page by the same IP within 30 minutes counts once. A visit is a session that ends after 30 idle minutes, and its first view carries the user agent (device · browser), referrer, country and `utm_*` values. On leaving, the time the page was visible is added as time on page. The site operator (owner · admin) and any address marked **my IP** are not recorded, and crawlers (bots) are flagged and left out of the counts. When today's visits exceed three times the 7-day average, a **traffic spike** notification is created once a day. A scheduled job clears IPs older than 90 days.

On `/admin/traffic` the range (7 · 14 · 30 · 90 days) changes the whole page: visit summary (visits · new · returning · views per visit, bots excluded), daily trend, sources, devices, countries, landing pages, top content, a weekday × hour heatmap, UTM campaigns, views and average time per page, and **visit flow** (bounce rate · entry → next page · exit pages · recent visit paths). **IP analysis** lists masked IPs with days visited, first and latest visit, country and device; marking one as my IP stops recording it and drops what it already contributed. **UTM link builder** composes `utm_source/medium/campaign` from source presets (resume · LinkedIn · X · Kakao · email), so links shared through messengers or PDFs, where no referrer survives, still show up as their own channel.

<img src="public/images/screenshots/cms/29-traffic-flow-light.png" alt="Traffic: views by page and visit flow" width="100%" />

</details>

### Managing posts and works

| Posts: filters · status chips · bulk actions | Works: ordering · GitHub import · trash |
|:---:|:---:|
| <img src="public/images/screenshots/cms/21-posts-list-light.png" alt="Admin posts list" width="100%" /> | <img src="public/images/screenshots/cms/22-works-list-light.png" alt="Admin works list" width="100%" /> |

<details>
<summary><strong>Details</strong></summary>

<br />

The `/admin/posts` and `/admin/works` lists keep search scope (title+body · title · body), sort, category · series · year filters and page size in a glass bar that stays put while you scroll. Clicking a status chip flips **published ↔ unpublished** in place; dragging across the checkbox column selects several rows for **bulk delete** or **bulk category change**. Published rows get a shortcut to the public page, unpublished rows a **preview** rendered exactly like the published page. Posts support **scheduled publishing** (`pg_cron` publishes on time and sends a notification and an email), pinning and a **series** tab (order · export as a set). Works are reordered by drag, by clicking the row number or from the row menu (first · last · position), and a **GitHub repository's README can be imported as a work**.

The **trash** is a soft delete. Ordinary items are purged after 30 days, popular ones (top views · likes) after 90, and every row shows the days left with an **extend (+30 days)** button. Restoring is one click; permanent deletion asks you to retype the title. `.md` files go both ways: **upload** (with frontmatter; new categories are confirmed first) and **export** (all · selected · single · series).

</details>

### Notifications · reports · comments · service log

| Notifications: four tabs, action-needed group | Service log: per-provider successes and failures |
|:---:|:---:|
| <img src="public/images/screenshots/cms/23-notifications-light.png" alt="Notifications page" width="100%" /> | <img src="public/images/screenshots/cms/24-service-log-light.png" alt="Service log" width="100%" /> |

<details>
<summary><strong>Details</strong></summary>

<br />

**Notifications** (`/admin/notifications`) have four tabs (all · comments · system · reports) and cover new comments, replies, likes, comment reports, access requests, new-device logins, traffic spikes and system events (login lockout · sign-out everywhere · AI provider failure · mail failure · cron error · settings changed). Items that need action (access requests · new devices) are grouped separately, and the item you arrived from blinks slowly until your next interaction. The **reports** tab filters pending · resolved · dismissed, jumps to the original comment or deletes it in place. **Comments** (`/admin/comments`) gathers post and work comments in one table, filters active · deleted, bulk-deletes and restores deleted comments.

The **service log** (`/admin/service-log`) lists successes and failures of AI (translation · summary · TTS · covers), image search, Resend mail, the GitHub API, scheduled jobs and contact-form attachments, newest first. The top shows per-provider counts and the last failure cause (no key · quota · billing · server error and so on), the bottom the individual rows, filterable by category · provider · result. The status panel in Settings › Services and the dashboard link in with the filter preset (`?provider=gemini` · `?result=fail`).

<img src="public/images/screenshots/cms/25-comments-light.png" alt="Comment management: posts and works together" width="100%" />

</details>

### Settings

| Library: multi-select · file preview | Appearance: brand preview · logo type |
|:---:|:---:|
| <img src="docs/images/settings-library-light.png" alt="Settings Library tab: two uploaded files selected" width="100%" /> | <img src="docs/images/settings-brand-dark.png" alt="Settings › Appearance: brand" width="100%" /> |

<details>
<summary><strong>Details</strong></summary>

<br />

`/admin/settings` has six tabs: **General** (personal info · contact · SEO metadata · background music), **Content** (home hero · intro · featured works · marquee · footer · social links · banner, pagination, tags · categories, works intro video, plus a PROFILE sub-tab), **Library** (calendars · polls · custom emojis · cover image history · uploaded files), **Appearance** (design-system preview · theme colours · brand · date-picker style · typography and font upload), **Services** (per-feature provider order · email · comment system and giscus · security · upload formats and size limits · provider status panel · environment variables) and **Account** (auth · email change · password policy, registered devices and **sign out everywhere**, members and roles (owner · admin · author)).

You save a whole tab or one section at a time, with revert and code defaults. Values that cannot be empty (site title · name · the five theme colours · member names, repository details when giscus is selected) are enforced in the UI, the API and the database. When code defaults change, a **conflict list** shows the new value per section so you can take it or keep yours.

In the **Library**, uploaded files · cover image history · comment images · emojis · calendars can be selected several at a time by clicking or dragging across cells, then deleted together. Uploaded files that are still in use are shown as unselectable, and files of any kind, including audio, documents and fonts, can be previewed in place. **Brand**, under Appearance, opens with a preview strip drawn from the unsaved settings: the nav and browser tab (short logo) and the loading screen (full logo). Below it you pick the logo type (image or text) and tune the short logo, full logo and effects part by part.

<img src="public/images/screenshots/cms/27-settings-account-light.png" alt="Settings Account tab" width="100%" />

</details>

### Login and security

<img src="public/images/screenshots/cms/28-login-light.png" alt="Admin login: email · password and GitHub sign-in" width="60%" />

The owner signs in with email and password; invited members **sign in with GitHub**. OAuth only authenticates. The server checks for the owner email, an existing role or an invitation before letting anyone in. Five failed attempts lock the form for 15 minutes with the remaining tries and a countdown shown. An unknown device is signed out automatically and gets an approval link by email (valid 24 hours), and signing out in one tab signs out every open tab.

### Narrated gallery

<img src="public/images/screenshots/cms/01-gallery-playing-light.gif" alt="Captions following the narration" width="100%" />

<sub>▶ Playing: captions follow the narration and the progress bar fills · 🔊 with sound: [watch the mp4](public/images/screenshots/cms/01-gallery-playing-light.mp4) (27 s, with the TTS audio the gallery actually plays)</sub>

Each slide of a work's gallery can carry **narration and captions**. Playback prefers a prepared audio file (TTS or a recording), falls back to reading the script with browser speech, and otherwise waits four seconds before advancing. Captions are cut from the script by character ratio to follow the audio, and the progress bar below fills one segment per slide. If the browser blocks sound, the gallery first asks "with voice / without voice".

| Script · voice · generate | Preview: lyric highlight |
|:---:|:---:|
| <img src="public/images/screenshots/cms/02-narration-editor-light.png" alt="Gallery narration editor" width="100%" /> | <img src="public/images/screenshots/cms/03-narration-preview-light.png" alt="Preview with highlighted script" width="100%" /> |

<details>
<summary><strong>Details · narration editor · lexicon · recording · PPTX</strong></summary>

<br />

In the admin work editor, the **gallery narration editor** is a bench (slide on the left, script on the right) with a thumbnail strip below. Clicking a thumbnail puts that slide on the bench; slides with audio show a speaker badge and slides with only a script show a text badge. The toolbar offers slide navigation, audio history, record, upload a recording, remove audio, edit scripts, translate scripts and the lexicon; on the right you pick a voice (provider · gender · tone) and press **Generate**. Long scripts are chunked at about 600 characters and merged. If the chosen provider fails, the server moves down the fallback order from Settings (Fish Audio → Google Cloud TTS → Edge) with a voice of the same gender. During preview the script fills in **like lyrics**, character by character, and clicking a word seeks to it.

<img src="public/images/screenshots/cms/03-narration-preview-light.gif" alt="Preview: the script filling in as it plays" width="100%" />

The **pronunciation lexicon** pairs script text with what should be spoken, e.g. `?all=true → "all true condition"`. It applies only when generating audio, longest match first; captions keep the original text. Korean and English scripts have separate dictionaries, and an inline `[text|reading]` in the script wins over the lexicon. Several entries can be pasted at once as `text = reading` lines.

The **recording editor** records from the microphone, then lets you click the waveform to place the cursor or drag a range, and split, cut, copy, paste, delete, keep-only, or trim silence to shape clips (with undo/redo). Clips can be reordered by dragging and pasted into another slide. Finishing uploads a WAV as that slide's audio (up to six minutes).

| Lexicon | Recording editor: range selected, clips split |
|:---:|:---:|
| <img src="public/images/screenshots/cms/04-lexicon-light.png" alt="Pronunciation lexicon" width="100%" /> | <img src="public/images/screenshots/cms/05-recording-editor-light.png" alt="Recording waveform editor" width="100%" /> |

<img src="public/images/screenshots/cms/05-recording-split-light.gif" alt="Record → select a range → split" width="100%" />

**Drop a PPTX onto the gallery** and each slide is rendered in the browser to a JPEG (max 1600px) and uploaded; each slide's **speaker notes become its script**. The gallery header shows "file — rendering n/N" while it runs, and afterwards every thumbnail carries a script badge. PDFs go through the same path.

| Converting: "rendering n/N" | Done: a slide whose notes became the script |
|:---:|:---:|
| <img src="public/images/screenshots/cms/06-pptx-progress-light.png" alt="PPTX conversion progress" width="100%" /> | <img src="public/images/screenshots/cms/07-pptx-thumbnails-light.png" alt="Gallery thumbnails after conversion" width="100%" /> |

<img src="public/images/screenshots/cms/06-pptx-import-light.gif" alt="Dropping a PPTX and watching slides render in" width="100%" />

</details>

### Auto-translation and AI summary

<img src="public/images/screenshots/cms/08-translate-editor-light.gif" alt="Translating banner, then English fields filling in" width="100%" />

<sub>▶ Switch to EN and press Retranslate › All: the "Translating…" banner appears, then English fields fill in</sub>

Flip the editor's KO/EN switch to **EN** and, when the source has content and every English field is empty, title, subtitle, description, body and gallery scripts are filled in one pass. If some English fields are already filled, the **Retranslate** button next to the switch lets you pick a scope. Translations land in the form only and persist when you save.

| Settings › Services: AI & external services | Public site: translation banner |
|:---:|:---:|
| <img src="docs/images/settings-services-light.png" alt="Settings Services tab: per-feature provider status and fallback order" width="100%" /> | <img src="public/images/screenshots/cms/10-translate-banner-light.png" alt="Translation banner: a work without an English body, viewed in EN" width="100%" /> |

<details>
<summary><strong>Details</strong></summary>

<br />

Providers live in one section, **Settings › Services › AI & external services**. Each feature (AI cover · AI summary · translation · TTS) has an on/off switch, automatic fallback on failure and a fallback order, and every provider row shows its state, this month's usage, a re-enable button and shortcuts to the call log and the provider console. Text provider rows let you pick the model to call; leaving it empty uses the provider's latest alias. A provider that keeps failing for the same reason is paused and shows an "off" badge with the cause (no permission · over quota and so on). The same table sits above the service log page. Which admin notifications are also **emailed** is chosen in the same tab under Notification emails. By default only what needs a person right away (new comments, reports, new-device logins, access requests) is emailed, and bursty operational notifications go out at most once an hour.

On the public site, a **translation banner** appears when the viewed language has no body, and one button fetches an AI translation in place (posts and works alike). The **AI summary** box above the detail shows the Korean/English summary generated at publish time in the viewed language and can be collapsed.

</details>

### Theme

| Presets | Contrast report |
|:---:|:---:|
| <img src="public/images/screenshots/cms/12-theme-presets-light.png" alt="Theme presets" width="100%" /> | <img src="public/images/screenshots/cms/12-theme-contrast-light.png" alt="Contrast report" width="100%" /> |

<details>
<summary><strong>Details · colour suggestions · presets compared</strong></summary>

<br />

**Settings › Appearance › Theme colors** sets five colors: the accent plus light/dark background and text. The 18 presets (Default · Ruby · Meadow · Coral · Azure · Sand · Harvest · Honey · Forest · Rosewood · Dusk · Arctic · Baltic · Sorbet · Twilight · Tropica · Petal · Slate) keep their accents at least ΔE 20 apart, and the current five colors can be saved as your own preset with **+**. Picking colors updates the **WCAG contrast report** for body text, muted text, accent links, accent graphics and button text in both modes, plus the link↔body color difference. When the accent is used as text, the site shifts only its lightness to reach 4.5:1, shown in the table as "auto-corrected".

**Color suggestions** come from the color wheel (analogous · complementary · split · triadic · monochrome) or from an image, whose six dominant colors become candidates. The image is read locally and never uploaded.

| Color wheel | From an image |
|:---:|:---:|
| <img src="public/images/screenshots/cms/13-theme-wheel-light.png" alt="Color wheel suggestions" width="100%" /> | <img src="public/images/screenshots/cms/13-theme-from-image-light.png" alt="Colors extracted from an image" width="100%" /> |

The same home page under three presets (Arctic · Rosewood · Meadow, in light and dark). Only the five colors (background, text, accent) change; the neutral scale in between is derived from them by the site.

<img src="public/images/screenshots/cms/14-home-presets-light.png" alt="Home: Arctic · Rosewood · Meadow (light)" width="100%" />

<img src="public/images/screenshots/cms/14-home-presets-dark.png" alt="Home: Arctic · Rosewood · Meadow (dark)" width="100%" />

</details>

### Linking posts and works · SEO check

| Relation picker: post editor | SEO check |
|:---:|:---:|
| <img src="public/images/screenshots/cms/15-relation-picker-light.png" alt="Relation picker" width="100%" /> | <img src="public/images/screenshots/cms/16-seo-checklist-light.png" alt="SEO checklist panel" width="100%" /> |

Works link related posts and series; posts link related projects, all through a searchable picker. Chosen chips are drag-sortable and show up in the public detail header. The **SEO check** pill at the editor's bottom right counts six items (title · slug · excerpt of 30+ chars · cover · category · tags) as "5/6", and clicking an item scrolls to that field and flashes it.

---

## ✦ Tech stack

| Area | Used |
|:---|:---|
| Framework | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 6 |
| Styling | CSS Modules + three-tier CSS variable tokens, enforced by stylelint rules |
| Animation | Framer Motion · GSAP · Lenis |
| 3D | Three.js · React Three Fiber · Drei |
| Backend | Supabase (PostgreSQL · Auth · Storage · RLS) |
| Editor | Plate.js (Slate) + Markdown · React Flow · Sandpack · CodeMirror 6 · KaTeX |
| Comments | Built-in (marked + isomorphic-dompurify) or giscus, switchable in the admin |
| Speech | Fish Audio · Google Cloud TTS · Edge TTS (narrated gallery), Web Speech API (read aloud · script fallback) |
| Integrations | Unsplash · Pexels (covers), DeepL · Google · Gemini · OpenAI · Claude · Groq (translation · summaries), Resend (mail), NanoBanana · Hugging Face (AI images) |
| Testing | Vitest + Testing Library · Playwright smoke tests |

---

## ✦ Quick start

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and keys
npm run dev                  # http://localhost:3000
```

Posts, works and the admin need a Supabase project. The table SQL, storage buckets, creating the admin account and optional keys (cover images, translation and so on) are laid out step by step in **[docs/en/supabase-setup.md](./docs/en/supabase-setup.md)**.

```bash
npm run build          # production build
npm test               # unit tests (Vitest)
npm run test:smoke     # smoke e2e (needs a build)
npm run audit:full     # typecheck + eslint + stylelint + knip
npm run sync-all       # sync content/*.md with the database (the About page is built from md at build time, not read from the database)
```

---

## ✦ Documentation

| Document | Contents |
|:---|:---|
| [Features](./docs/en/features.md) | Every feature by screen (interaction, works, posts, admin, performance, security) |
| [Supabase setup](./docs/en/supabase-setup.md) | Environment variables, tables, storage, admin account, cover images |
| [Deployment](./docs/en/deploy.md) | Vercel, domains, mail, post-deploy checks |
| [Testing](./docs/en/testing.md) | Vitest, smoke e2e, preparing the admin session |
| [Design system](./docs/design-system.md) | Three token tiers, per-axis rules with enforcement status, `@layer` (token values in the [generated table](./docs/tokens.md)); decisions in [design-system-decisions.md](./docs/design-system-decisions.md) (Korean) |
| [Troubleshooting](./docs/en/troubleshooting.md) | What broke, why, and how it was fixed |
| [Components](./docs/en/components.md) · [DB design](./docs/en/db-design.md) · [Security](./docs/en/security.md) · [User flow](./docs/en/user-flow.md) | Area deep dives |
| [Editor guide](./docs/en/editor-guide.md) | Using the editor |
| [Refactoring guide](./docs/refactoring-guide.md) · [Performance baseline](./docs/perf-baseline.md) · [Commit convention](./docs/commit-convention.md) | Structural cleanup notes, bundle baseline, commit rules (Korean) |

<details>
<summary><strong>Project structure</strong></summary>

<br />

```
src/
├─ app/           # App Router: (home) · works · posts · about · profile · privacy · auth · design-system · admin · api
├─ components/    # per-screen components + ui/ shared components
├─ styles/        # tokens/ (raw) · globals/ (semantic · component) · vendor/ · layers.css
├─ providers/     # theme · language · scroll · site config
├─ config/ constants/ data/ types/
├─ lib/ hooks/ stores/ utils/
├─ locales/       # Korean · English
└─ proxy.ts       # CSRF Origin check · blog host routing
content/          # .md sources: posts · works are synced with the database, about is built into page data at build time
docs/             # documentation (docs/images: images used only by the docs)
e2e/ scripts/     # smoke tests · sync and screenshot scripts
supabase/         # migration SQL
```

</details>

Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Types and examples are in **[docs/commit-convention.md](./docs/commit-convention.md)** (Korean).

---

<div align="center">

**[PolyForm Noncommercial License 1.0.0](./LICENSE)**

Free to use, modify and share, but **not for commercial use**.

<br />

<sub>✦ Made by <a href="https://www.hyeoniverse.com">HYEONIVERSE</a></sub>

</div>
