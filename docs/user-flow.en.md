# User Flow

### Visitor Flow

```
Home -> Works Gallery (horizontal scroll) -> Work Detail (likes)
     -> Posts List (search/tag filter) -> Post Detail (likes/comments)
     -> Profile -> About (technical documentation)
```

- **Works**: Browse projects in the horizontal scroll gallery, and leave IP-based likes on the detail page. The bottom of the detail page surfaces a related-projects horizontal carousel (hover preview) + related-series/posts chips. On touch devices (e.g. mobile), the Footer's ViewModeToggle switches to "view PC version"
- **Posts**: Enter the sub-indexes through the top subnav (All / Series / Tags / History) and filter posts by tags, search, or category (2-level tree, multi-select). Selecting a category displays that category's series as book-shaped cards, and clicking a series filters to its posts only. On the detail page, you can leave likes and guest comments (dual auth: browser UUID + password); comments support markdown write/preview plus emoji reactions (a fixed set of 8). If the admin switches the comment provider to giscus in settings, a GitHub Discussions widget renders in the same slot. Series posts show previous/next navigation
- **About**: Traverse 14 panels via horizontal scroll (project overview, user flow, architecture, features, design system, development process, tech stack, backend, ERD, code highlights, troubleshooting, security). The UserFlow panel visualizes 9 flows (Visitor, Posts, Works, Profile, Contact, Comment, Admin/Settings, Admin/Settings/Appearance, Admin/Posts/Works) with tabs + SVG diagrams. The ERD panel displays all 23 tables with full schema in a zoom/pan interactive diagram (click table to auto-zoom + highlight relations + show design notes). The Security panel visualizes 8 security layers (SQL Injection, XSS, Input Validation, Dual Auth, RLS, Route Protection, Duplicate Prevention, Secret Management)

### Admin Flow

```
Direct access to /admin -> GitHub OAuth login (`/auth/callback` authorization gate — blocks un-invited accounts) or password login (owner fallback) -> Settings redirect
-> Write post (Markdown/Rich Text toggle; the editor can add poll/tabs blocks + a CoverBanner cover banner) -> Select cover image (preset/Unsplash/AI) -> Select series (optional) -> Publish
-> Manage works (/admin/works) — create, edit, delete, publish/private toggle, sort order change
-> Site settings (/admin/settings) — General (brand/logo customization, SEO [default content language ko/en], footer, BGM), Content (Home/Profile/About/Posts/Works sub-tabs), Appearance (theme/typography/date picker styles), Services (API key management, reveal original after password verification), Account (email change pending management, password policy, security notification emails + member management)
-> Member management (Account tab, owner-only) — invite a member by email (author_invites + Resend) -> when the invitee signs in with GitHub under that same email, the role is granted -> change/remove owner/editor/author roles and permissions. Non-owners access only the Account tab (other settings tabs are owner-only both client- and server-side)
-> Settings conflict detection — when code defaults change, compare with DB-stored values and visualize via per-hunk diff modal, checked items are auto-applied on save (JSON key order independent via deepEqual comparison)
```

- No login button — accessed by directly entering the URL; members use GitHub OAuth, the owner is bootstrapped from `OWNER_EMAIL`
- Layout-level Supabase Auth session verification — redirects to `/admin/denied` (access denied page) when unauthenticated
- Role-based access — server helpers re-check `app_metadata` on every request; non-owners cannot write site settings
- Cross-tab logout — when `AdminAuthSync` receives a `SIGNED_OUT` broadcast, every open tab drops to the login screen


