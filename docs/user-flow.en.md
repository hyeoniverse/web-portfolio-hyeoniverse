# User Flow

### Visitor Flow

```
Home -> Works Gallery (horizontal scroll) -> Work Detail (likes)
     -> Posts List (search/tag filter) -> Post Detail (likes/comments)
     -> Profile -> About (technical documentation)
```

- **Works**: Browse projects in the horizontal scroll gallery, and leave IP-based likes on the detail page
- **Posts**: Filter blog posts by tags/search. Selecting a category displays that category's series as book-shaped cards, and clicking a series filters to its posts only. On the detail page, you can leave likes and guest comments (dual auth: browser UUID + password), and series posts show previous/next navigation
- **About**: Traverse 14 panels via horizontal scroll (project overview, user flow, architecture, features, design system, development process, tech stack, backend, ERD, code highlights, troubleshooting, security). The UserFlow panel visualizes 9 flows (Visitor, Posts, Works, Profile, Contact, Comment, Admin/Settings, Admin/Settings/Appearance, Admin/Posts/Works) with tabs + SVG diagrams. The ERD panel displays interactive DB table relationships. The Security panel visualizes 8 security layers (SQL Injection, XSS, Input Validation, Dual Auth, RLS, Route Protection, Duplicate Prevention, Secret Management)

### Admin Flow

```
Direct access to /admin -> Supabase Auth login -> Settings redirect
-> Write post (Markdown/Rich Text toggle) -> Select cover image (preset/Unsplash/AI) -> Select series (optional) -> Publish
-> Manage works (/admin/works) — create, edit, delete, publish/private toggle, sort order change
-> Site settings (/admin/settings) — General (brand/logo customization, SEO, footer, BGM), Content (Home/Profile/About/Posts/Works sub-tabs), Appearance (theme/typography/date picker styles), Services (API key management, reveal original after password verification), Account (email change pending management, password policy, security notification emails)
-> Settings conflict detection — when code defaults change, compare with DB-stored values and visualize via per-hunk diff modal, checked items are auto-applied on save (JSON key order independent via deepEqual comparison)
```

- No login button — accessed by directly entering the URL
- Layout-level Supabase Auth session verification — redirects to `/admin/denied` (access denied page) when unauthenticated


