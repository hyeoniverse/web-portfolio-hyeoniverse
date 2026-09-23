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

---

## At a Glance

| Area | Highlights |
|:---|:---|
| **Interaction** | Infinite scroll loop, mouse parallax, StaggerText, a Three.js coffee cup, direction-aware scroll cascade |
| **Works** | Six layouts (Flow · Fullscreen · Cinematic · Grid · Split · Cylinder) and detail pages |
| **Posts** | SSR + ISR, series, banner slider, six list layouts, guest comments (markdown + emoji reactions) or giscus |
| **Admin** | Plate.js editor (diagram · code playground · math blocks, color tools, publish toggle), `.md` sync, AI translation and summaries, revision history, member invites and roles |
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

Posts, works and the admin need a Supabase project. Table SQL, storage buckets, creating the admin account and the optional keys for cover images and translation are laid out in order in **[docs/supabase-setup.en.md](./docs/supabase-setup.en.md)**.

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
| [Features](./docs/features.en.md) | Every feature by screen — interaction, works, posts, admin, performance, security |
| [Supabase setup](./docs/supabase-setup.en.md) | Environment variables, tables, storage, admin account, cover images |
| [Deployment](./docs/deploy.en.md) | Vercel, domains, mail, post-deploy checks |
| [Testing](./docs/testing.en.md) | Vitest suites, smoke e2e, preparing the admin session |
| [Design system](./docs/design-system.md) | Three token tiers, rules R1–R7, naming and specificity |
| [Troubleshooting](./docs/troubleshooting.en.md) | What broke, why, and how it was fixed |
| [Components](./docs/components.en.md) · [DB design](./docs/db-design.en.md) · [Security](./docs/security.en.md) · [User flow](./docs/user-flow.en.md) | Area deep dives |
| [Editor guide](./docs/editor-guide.en.md) | Editor usage and `.md` authoring rules |
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
