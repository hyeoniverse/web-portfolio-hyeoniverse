# Features

[← README](../../README.en.md)

The features visitors and admins use on screen, listed by page. How they are built and why is covered in [Security](./security.md) · [DB design decisions](./db-design.md) · [Components](./components.md) · [Design system](../design-system.md) (Korean).

## Common

- **Dark · light theme**: Switched with the button in the navigation. Theme colors and presets are set in admin Settings › Appearance.
- **Korean · English**: The language button in the navigation switches the UI text. Posts and works keep separate ko · en fields. For any other language, a translation cached in `content_translations` is shown.
- **Smooth scrolling · page transitions**: Lenis scrolling, plus a transition that moves the card image into the hero position when opening a detail page.
- **Cursor**: A cursor follows the mouse and changes shape and label over links, images, and drag areas.
- **BGM**: Background music is toggled in the navigation. The audio file is uploaded in admin Settings › General.
- **Contact**: Messages are sent from the "Get in Touch" drawer. The server (`/api/contact`) sends them through the chosen provider (Web3Forms · Formspree · EmailJS), and attachments go to a private bucket and are attached as download links.
- **Reduced motion**: With the device's "reduce motion" setting on, self-moving videos, marquees, auto-advance, and rotation stop.

## Home

- Made of hero, intro, services, marquee, works, and CTA sections.
- Two Three.js (R3F) 3D objects: a torus that turns with scrolling, and a coffee cup in the CTA section that follows the mouse.

<p align="center">
  <img src="../../public/images/screenshots/pc/home-dark.png" width="49%" alt="Home — Dark" />
  <img src="../../public/images/screenshots/pc/home-light.png" width="49%" alt="Home — Light" />
</p>

## Works (`/works`)

- **Six layouts**: Flow (default, horizontal scroll) · Fullscreen · Cinematic · Grid · Split · Cylinder (Three.js cylinder). Chosen in admin Settings › Content › Works, or previewed directly with `?layout=`.
- At 1024px and below, the horizontal scroll becomes a vertical stack.
- **Detail (`/works/[slug]`)**: meta, info grid (year, category, role, tech notes, related posts and series), AI summary, body, slide gallery, team member cards, likes, comments. Old addresses (`/works/<id>`, `/works/01`) redirect to the slug address.
- Each gallery slide can carry a script and audio, and the detail page can read the text aloud (TTS).

<p align="center">
  <img src="../../public/images/screenshots/pc/works-dark.png" width="49%" alt="Works — Dark" />
  <img src="../../public/images/screenshots/pc/works-light.png" width="49%" alt="Works — Light" />
</p>

<p align="center">
  <img src="../../public/images/screenshots/pc/work-detail-dark.png" width="49%" alt="Work Detail — Dark" />
  <img src="../../public/images/screenshots/pc/work-detail-light.png" width="49%" alt="Work Detail — Light" />
</p>

## Posts (`/posts`)

- **Sub pages**: All · Series (`/posts/series`) · Tags (`/posts/tags`) · History (`/posts/history`, a chronological timeline) · TIL (`/posts/til`) · Categories (`/posts/categories`).
- **List layout**: one of magazine · grid · list · compact · blog · journal · masonry · featured, chosen in admin settings and applied site-wide.
- **Banner**: Pinned posts appear in a banner at the top. Its shape and transition are chosen in admin settings.
- **Finding posts**: search (title / body scope, search history), two-level categories, multi-select tags, sorting (latest · popular · title, with popular split into overall · views · comments · likes), random shuffle.
- **Sidebar**: 3D tag cloud, popular posts, random posts, recent comments.
- **Series**: Posts are grouped into series and read in order. Hovering a series card expands a preview of its posts, and the detail page links to the previous and next post.
- **Detail (`/posts/[slug]`)**: table of contents, AI summary, read aloud, share, likes, related works, comments.
- **Read aloud**: browser speech (Web Speech API) reads the title → summary → details → body blocks in order and highlights the block being read. A floating bar offers previous · pause · next · speed (1 · 1.25 · 1.5 · 0.75×) · stop, and clicking a paragraph starts from there. Code blocks, math and video are only announced by kind, and tables are read row by row with their headers. Work detail pages have it too.
- The blog subdomain (`blog.hyeoniverse.com`) opens the same posts at shorter addresses.

<p align="center">
  <img src="../../public/images/screenshots/pc/posts-dark.png" width="49%" alt="Posts — Dark" />
  <img src="../../public/images/screenshots/pc/posts-light.png" width="49%" alt="Posts — Light" />
</p>

## Comments · reactions

- **Comments without sign-in**: replies, nickname shuffle, automatic auth in the same browser and password auth on other devices for editing and deleting. Leaving an email subscribes to reply notifications.
- **Markdown writing**: write and preview tabs with a formatting toolbar. Images are external URLs only, with no upload.
- **Emoji reactions**: a fixed set of 8 (👍 👎 😄 🎉 😕 ❤️ 🚀 👀).
- **Reports**: Each comment can be reported with a reason, and reports pile up in the admin reports screen.
- **giscus switch**: Switching the comment provider to giscus in admin Settings › Services shows the GitHub Discussions widget in the same place.
- **Likes**: once per IP on posts, works, and comments.

## Profile (`/profile`)

- An intro section with a 3D character and the GitHub integration (repository list, contribution graph). The contribution graph needs `GITHUB_TOKEN`.

<p align="center">
  <img src="../../public/images/screenshots/pc/profile-dark.png" width="49%" alt="Profile — Dark" />
  <img src="../../public/images/screenshots/pc/profile-light.png" width="49%" alt="Profile — Light" />
</p>

## About (`/about`)

- Built as a constellation map in the middle that flies into each chapter (`PreziStage`). The chapters are, in order: at a glance, features, AI, architecture, design decisions, design, code, making of, trust, and FAQ.
- The first screen shows the visitor's local time and weather, plus the number of published posts, the latest post, and the number of works.
- The architecture chapter's ERD and API map are built before each build from `supabase/setup.sql` and the route files. Design decisions, security, and the making-of are built from the md files in `content/about/` ([md-content-guide.md](../md-content-guide.md), Korean). None of it is edited in the admin.
- The AI chapter has live demos to try translation, summary, cover, and speech. Daily usage is capped.

<p>
  <img src="../images/about-light.png" alt="About: constellation map (light)" width="49%" />
  <img src="../images/about-chapter-dark.png" alt="About: chapter 02 features" width="49%" />
</p>

## Admin

The sign-in screen is `/admin/login`. Members use GitHub OAuth, and the owner can also use a password. The full flow is in [Supabase setup](./supabase-setup.md#5-admin-login) and [Security](./security.md).

- **Dashboard (`/admin`)**: view and visit trends, device, referrer, and country breakdowns, visit heatmap. The traffic screen adds per-IP visits and a UTM link builder.
- **Notifications · reports · comment management**: system notifications such as new comments, sign-ins, and failed external calls; report handling (resolve, dismiss, delete); bulk management of post and work comments.
- **Service log (`/admin/service-log`, owner only)**: successes and failures of AI, mail, GitHub, and scheduled job calls.
- **Post · work lists**: instant publish toggle, bulk selection, reordering, trash (restore, extend the deadline), `.md` upload and export ([md-content-guide.md](../md-content-guide.md), Korean).
- **Editor**: Markdown ↔ Rich Text switch, slash menu, poll · tabs · calendar · diagram · code playground · mermaid blocks, auto translation, cover image picker (presets, repository images, Unsplash, Pexels, AI, history), auto-generated share card (title card) for posts without a cover, SEO check, preview. Syntax and shortcuts are in [editor-guide.md](./editor-guide.md).
- **Saving**: autosave with revision history, diff and revert, a conflict check when the same post is edited in two tabs, scheduled publishing.
- **Settings (`/admin/settings`)**: six tabs, General · Content · Library · Appearance · Services · Account. Only the owner opens the five tabs other than Account. What each tab holds is in the table in [Supabase setup](./supabase-setup.md#5-admin-login).
- **Members**: The owner invites authors and editors by email. Authors can edit only their own posts and the works that list them as team members.
- **Security**: 15-minute lock after 5 failures, mail approval for unknown devices, sign out of all devices.

## Design system (`/design-system`)

Tokens and shared components on one screen. The rules are in [design-system.md](../design-system.md) and the token values in [tokens.md](../tokens.md) (Korean).

<p align="center">
  <img src="../../public/images/screenshots/pc/design-system-dark.png" width="49%" alt="Design System — Dark" />
  <img src="../../public/images/screenshots/pc/design-system-light.png" width="49%" alt="Design System — Light" />
</p>
