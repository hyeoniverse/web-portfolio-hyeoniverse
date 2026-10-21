# Admin · CMS

How each admin screen (`/admin`) works. The summary is in the [README](../../README.en.md#-admin--cms).

> [!NOTE]
> Admin captures come from `npx tsx scripts/screenshots-cms.ts` (needs a logged-in session, see [scripts/SCREENSHOTS.md](../../scripts/SCREENSHOTS.md)). Continuous actions (playback · preview · recording · PPTX conversion · translation) are embedded as short `.gif` clips.

## Dashboard

| Quick actions · stats | Daily visitors · per-day breakdown |
|:---:|:---:|
| <img src="../../public/images/screenshots/cms/17-dashboard-light.png" alt="Admin dashboard: quick actions and stats" width="100%" /> | <img src="../../public/images/screenshots/cms/18-dashboard-daily-views-light.png" alt="Daily visitors, calendar heatmap and the selected day's panel" width="100%" /> |

`/admin` opens on a one-page view of the site. At the top sit **quick actions** (new post · new project · settings · reports · notifications, with pending-report and unread counts as badges) and a **service log** strip (calls and failures in the last 24 hours, providers currently switched off). The **stats** panel leads with the visitor count (change vs. the previous 7 days plus a sparkline), with visits, page views, average time on page and the counting start date on one line below, then published and draft projects and posts, and comments. The donut beside it is the category split by views.

**Daily visitors** draws any range you pick (up to 90 days) as a curve. Click a day in the calendar heatmap below and a panel opens with that day's rank, how it compares to the period average, the same weekday and the day before, and the posts read most that day. Further down come **recent activity** (posts · projects · comments), **reports**, **popular** (views · likes · comments per post, engagement, top tags), a **traffic** summary (sources · devices · 30-day visits · new vs. returning · views per visit) and whether each service key is configured.


## Traffic

| Summary · trend · sources · devices | IP analysis · UTM link builder |
|:---:|:---:|
| <img src="../../public/images/screenshots/cms/19-traffic-light.png" alt="Traffic: range, summary, daily trend, sources, devices" width="100%" /> | <img src="../../public/images/screenshots/cms/20-traffic-ip-utm-light.png" alt="Traffic: IP analysis and UTM link builder" width="100%" /> |

There is one view log, `page_views`. Every page view (including in-site navigation) adds a row, and a repeat view of the same page by the same IP within 30 minutes counts once. A visit is a session that ends after 30 idle minutes, and its first view carries the user agent (device · browser), referrer, country and `utm_*` values. On leaving, the time the page was visible is added as time on page. The site operator (owner · admin) and any address marked **my IP** are not recorded, and crawlers (bots) are flagged and left out of the counts. When today's visits exceed three times the 7-day average, a **traffic spike** notification is created once a day. A scheduled job clears IPs older than 90 days.

On `/admin/traffic` the range (7 · 14 · 30 · 90 days) changes the whole page: visit summary (visits · new · returning · views per visit, bots excluded), daily trend, sources, devices, countries, landing pages, top content, a weekday × hour heatmap, UTM campaigns, views and average time per page, and **visit flow** (bounce rate · entry → next page · exit pages · recent visit paths). **IP analysis** lists masked IPs with days visited, first and latest visit, country and device; marking one as my IP stops recording it and drops what it already contributed. **UTM link builder** composes `utm_source/medium/campaign` from source presets (resume · LinkedIn · X · Kakao · email), so links shared through messengers or PDFs, where no referrer survives, still show up as their own channel.

<img src="../../public/images/screenshots/cms/29-traffic-flow-light.png" alt="Traffic: views by page and visit flow" width="100%" />


## Managing posts and works

| Posts: filters · status chips · bulk actions | Works: ordering · GitHub import · trash |
|:---:|:---:|
| <img src="../../public/images/screenshots/cms/21-posts-list-light.png" alt="Admin posts list" width="100%" /> | <img src="../../public/images/screenshots/cms/22-works-list-light.png" alt="Admin works list" width="100%" /> |

The `/admin/posts` and `/admin/works` lists keep search scope (title+body · title · body), sort, category · series · year filters and page size in a glass bar that stays put while you scroll. Clicking a status chip flips **published ↔ unpublished** in place; dragging across the checkbox column selects several rows for **bulk delete** or **bulk category change**. Published rows get a shortcut to the public page, unpublished rows a **preview** rendered exactly like the published page. Posts support **scheduled publishing** (`pg_cron` publishes on time and sends a notification and an email), pinning and a **series** tab (order · export as a set). Works are reordered by drag, by clicking the row number or from the row menu (first · last · position), and a **GitHub repository's README can be imported as a work**.

The **trash** is a soft delete. Ordinary items are purged after 30 days, popular ones (top views · likes) after 90, and every row shows the days left with an **extend (+30 days)** button. Restoring is one click; permanent deletion asks you to retype the title. `.md` files go both ways: **upload** (with frontmatter; new categories are confirmed first) and **export** (all · selected · single · series).


## Notifications · reports · comments · service log

| Notifications: four tabs, action-needed group | Service log: per-provider successes and failures |
|:---:|:---:|
| <img src="../../public/images/screenshots/cms/23-notifications-light.png" alt="Notifications page" width="100%" /> | <img src="../../public/images/screenshots/cms/24-service-log-light.png" alt="Service log" width="100%" /> |

**Notifications** (`/admin/notifications`) have four tabs (all · comments · system · reports) and cover new comments, replies, likes, comment reports, access requests, new-device logins, traffic spikes and system events (login lockout · sign-out everywhere · AI provider failure · mail failure · cron error · settings changed). Items that need action (access requests) are grouped separately, and the item you arrived from blinks slowly until your next interaction. The **reports** tab filters pending · resolved · dismissed, jumps to the original comment or deletes it in place. **Comments** (`/admin/comments`) gathers post and work comments in one table, filters active · deleted, bulk-deletes and restores deleted comments.

The **service log** (`/admin/service-log`) lists successes and failures of AI (translation · summary · TTS · covers), image search, Resend mail, the GitHub API, scheduled jobs and contact-form attachments, newest first. The top shows per-provider counts and the last failure cause (no key · quota · billing · server error and so on), the bottom the individual rows, filterable by category · provider · result. The status panel in Settings › Services and the dashboard link in with the filter preset (`?provider=gemini` · `?result=fail`).

<img src="../../public/images/screenshots/cms/25-comments-light.png" alt="Comment management: posts and works together" width="100%" />


## Settings

| Library: multi-select · file preview | Appearance: brand preview · logo type |
|:---:|:---:|
| <img src="../images/settings-library-light.png" alt="Settings Library tab: two uploaded files selected" width="100%" /> | <img src="../images/settings-brand-dark.png" alt="Settings › Appearance: brand" width="100%" /> |

`/admin/settings` has six tabs: **General** (personal info · contact · SEO metadata · background music), **Content** (home hero · intro · featured works · marquee · footer · social links · banner, pagination, tags · categories, works intro video, plus a PROFILE sub-tab), **Library** (calendars · polls · custom emojis · cover image history · uploaded files), **Appearance** (design-system preview · theme colours · brand · date-picker style · typography and font upload), **Services** (per-feature provider order · email · comment system and giscus · security · upload formats and size limits · provider status panel · environment variables) and **Account** (auth · email change · password policy, security (add · remove authenticator apps, the owner-only **require two-factor authentication** switch), signed-in devices and **sign out everywhere**, members and roles (owner · admin · author)).

You save a whole tab or one section at a time, with revert and code defaults. Values that cannot be empty (site title · name · the five theme colours · member names, repository details when giscus is selected) are enforced in the UI, the API and the database. When code defaults change, a **conflict list** shows the new value per section so you can take it or keep yours.

In the **Library**, uploaded files · cover image history · comment images · emojis · calendars can be selected several at a time by clicking or dragging across cells, then deleted together. Uploaded files that are still in use are shown as unselectable, and files of any kind, including audio, documents and fonts, can be previewed in place. **Brand**, under Appearance, opens with a preview strip drawn from the unsaved settings: the nav and browser tab (short logo) and the loading screen (full logo). Below it you pick the logo type (image or text) and tune the short logo, full logo and effects part by part.

<img src="../../public/images/screenshots/cms/27-settings-account-light.png" alt="Settings Account tab" width="100%" />


## Login and security

<img src="../../public/images/screenshots/cms/28-login-light.png" alt="Admin login: email · password and GitHub sign-in" width="60%" />

The owner signs in with email and password; invited members **sign in with GitHub**. OAuth only authenticates. The server checks for the owner email, an existing role or an invitation before letting anyone in. Five failed attempts lock the form for 15 minutes with the remaining tries and a countdown shown. After a password or GitHub sign-in, admin pages open only after **two-factor authentication** (authenticator app). Without an authenticator, `/admin/mfa` enrolls one via QR code first; after that it only asks for the 6-digit code. An unknown device is not blocked, it only triggers a notice email and an admin notification, and signing out leaves this browser only (every open tab in it goes too).

## Narrated gallery

<img src="../../public/images/screenshots/cms/01-gallery-playing-light.gif" alt="Captions following the narration" width="100%" />

<sub>▶ Playing: captions follow the narration and the progress bar fills · 🔊 with sound: [watch the mp4](../../public/images/screenshots/cms/01-gallery-playing-light.mp4) (27 s, with the TTS audio the gallery actually plays)</sub>

Each slide of a work's gallery can carry **narration and captions**. Playback prefers a prepared audio file (TTS or a recording), falls back to reading the script with browser speech, and otherwise waits four seconds before advancing. Captions are cut from the script by character ratio to follow the audio, and the progress bar below fills one segment per slide. If the browser blocks sound, the gallery first asks "with voice / without voice".

| Script · voice · generate | Preview: lyric highlight |
|:---:|:---:|
| <img src="../../public/images/screenshots/cms/02-narration-editor-light.png" alt="Gallery narration editor" width="100%" /> | <img src="../../public/images/screenshots/cms/03-narration-preview-light.png" alt="Preview with highlighted script" width="100%" /> |

In the admin work editor, the **gallery narration editor** is a bench (slide on the left, script on the right) with a thumbnail strip below. Clicking a thumbnail puts that slide on the bench; slides with audio show a speaker badge and slides with only a script show a text badge. The toolbar offers slide navigation, audio history, record, upload a recording, remove audio, edit scripts, translate scripts and the lexicon; on the right you pick a voice (provider · gender · tone) and press **Generate**. Long scripts are chunked at about 600 characters and merged. If the chosen provider fails, the server moves down the fallback order from Settings (Fish Audio → Google Cloud TTS → Edge) with a voice of the same gender. During preview the script fills in **like lyrics**, character by character, and clicking a word seeks to it.

<img src="../../public/images/screenshots/cms/03-narration-preview-light.gif" alt="Preview: the script filling in as it plays" width="100%" />

The **pronunciation lexicon** pairs script text with what should be spoken, e.g. `?all=true → "all true condition"`. It applies only when generating audio, longest match first; captions keep the original text. Korean and English scripts have separate dictionaries, and an inline `[text|reading]` in the script wins over the lexicon. Several entries can be pasted at once as `text = reading` lines.

The **recording editor** records from the microphone, then lets you click the waveform to place the cursor or drag a range, and split, cut, copy, paste, delete, keep-only, or trim silence to shape clips (with undo/redo). Clips can be reordered by dragging and pasted into another slide. Finishing uploads a WAV as that slide's audio (up to six minutes).

| Lexicon | Recording editor: range selected, clips split |
|:---:|:---:|
| <img src="../../public/images/screenshots/cms/04-lexicon-light.png" alt="Pronunciation lexicon" width="100%" /> | <img src="../../public/images/screenshots/cms/05-recording-editor-light.png" alt="Recording waveform editor" width="100%" /> |

<img src="../../public/images/screenshots/cms/05-recording-split-light.gif" alt="Record → select a range → split" width="100%" />

**Drop a PPTX onto the gallery** and each slide is rendered in the browser to a JPEG (max 1600px) and uploaded; each slide's **speaker notes become its script**. The gallery header shows "file — rendering n/N" while it runs, and afterwards every thumbnail carries a script badge. PDFs go through the same path.

| Converting: "rendering n/N" | Done: a slide whose notes became the script |
|:---:|:---:|
| <img src="../../public/images/screenshots/cms/06-pptx-progress-light.png" alt="PPTX conversion progress" width="100%" /> | <img src="../../public/images/screenshots/cms/07-pptx-thumbnails-light.png" alt="Gallery thumbnails after conversion" width="100%" /> |

<img src="../../public/images/screenshots/cms/06-pptx-import-light.gif" alt="Dropping a PPTX and watching slides render in" width="100%" />


## Auto-translation and AI summary

<img src="../../public/images/screenshots/cms/08-translate-editor-light.gif" alt="Translating banner, then English fields filling in" width="100%" />

<sub>▶ Switch to EN and press Retranslate › All: the "Translating…" banner appears, then English fields fill in</sub>

Flip the editor's KO/EN switch to **EN** and, when the source has content and every English field is empty, title, subtitle, description, body and gallery scripts are filled in one pass. If some English fields are already filled, the **Retranslate** button next to the switch lets you pick a scope. Translations land in the form only and persist when you save.

| Settings › Services: AI & external services | Public site: translation banner |
|:---:|:---:|
| <img src="../images/settings-services-light.png" alt="Settings Services tab: per-feature provider status and fallback order" width="100%" /> | <img src="../../public/images/screenshots/cms/10-translate-banner-light.png" alt="Translation banner: a work without an English body, viewed in EN" width="100%" /> |

Providers live in one section, **Settings › Services › AI & external services**. Each feature (AI cover · AI summary · translation · TTS) has an on/off switch, automatic fallback on failure and a fallback order, and every provider row shows its state, this month's usage, a re-enable button and shortcuts to the call log and the provider console. Text provider rows let you pick the model to call; leaving it empty uses the provider's latest alias. A provider that keeps failing for the same reason is paused and shows an "off" badge with the cause (no permission · over quota and so on). The same table sits above the service log page. Which admin notifications are also **emailed** is chosen in the same tab under Notification emails. By default only what needs a person right away (new comments, reports, new-device logins, access requests) is emailed, and bursty operational notifications go out at most once an hour.

On the public site, a **translation banner** appears when the viewed language has no body, and one button fetches an AI translation in place (posts and works alike). The **AI summary** box above the detail shows the Korean/English summary generated at publish time in the viewed language and can be collapsed.


## Theme

| Presets | Contrast report |
|:---:|:---:|
| <img src="../../public/images/screenshots/cms/12-theme-presets-light.png" alt="Theme presets" width="100%" /> | <img src="../../public/images/screenshots/cms/12-theme-contrast-light.png" alt="Contrast report" width="100%" /> |

**Settings › Appearance › Theme colors** sets five colors: the accent plus light/dark background and text. The 18 presets (Default · Ruby · Meadow · Coral · Azure · Sand · Harvest · Honey · Forest · Rosewood · Dusk · Arctic · Baltic · Sorbet · Twilight · Tropica · Petal · Slate) keep their accents at least ΔE 20 apart, and the current five colors can be saved as your own preset with **+**. Picking colors updates the **WCAG contrast report** for body text, muted text, accent links, accent graphics and button text in both modes, plus the link↔body color difference. When the accent is used as text, the site shifts only its lightness to reach 4.5:1, shown in the table as "auto-corrected".

**Color suggestions** come from the color wheel (analogous · complementary · split · triadic · monochrome) or from an image, whose six dominant colors become candidates. The image is read locally and never uploaded.

| Color wheel | From an image |
|:---:|:---:|
| <img src="../../public/images/screenshots/cms/13-theme-wheel-light.png" alt="Color wheel suggestions" width="100%" /> | <img src="../../public/images/screenshots/cms/13-theme-from-image-light.png" alt="Colors extracted from an image" width="100%" /> |

The same home page under three presets (Arctic · Rosewood · Meadow, in light and dark). Only the five colors (background, text, accent) change; the neutral scale in between is derived from them by the site.

<img src="../../public/images/screenshots/cms/14-home-presets-light.png" alt="Home: Arctic · Rosewood · Meadow (light)" width="100%" />

<img src="../../public/images/screenshots/cms/14-home-presets-dark.png" alt="Home: Arctic · Rosewood · Meadow (dark)" width="100%" />


## Linking posts and works · SEO check

| Relation picker: post editor | SEO check |
|:---:|:---:|
| <img src="../../public/images/screenshots/cms/15-relation-picker-light.png" alt="Relation picker" width="100%" /> | <img src="../../public/images/screenshots/cms/16-seo-checklist-light.png" alt="SEO checklist panel" width="100%" /> |

Works link related posts and series; posts link related projects, all through a searchable picker. Chosen chips are drag-sortable and show up in the public detail header. The **SEO check** pill at the editor's bottom right counts six items (title · slug · excerpt of 30+ chars · cover · category · tags) as "5/6", and clicking an item scrolls to that field and flashes it. When a post has no cover, the share card (og:image) falls back to a card drawn from the title, category and tags (`/og/posts/<slug>`, `src/lib/og/postCard.tsx`), but the check does not count it as passed — it only shows a warning and a note.
