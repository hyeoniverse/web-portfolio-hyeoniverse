# DB Design Decisions

### Unified Likes Table: `likes`

All likes (posts, works, post comments, work comments) are managed in a single `likes` table, distinguished by `target_type`.

**Alternatives considered:**

| Approach | Pros | Cons |
|------|------|------|
| **Single table** (current) | Single Source of Truth, one UNIQUE constraint prevents all duplicates, only need to add a CHECK value for new entities | 4 `target_type` values |
| **Fully separated** (post_likes, work_likes, ...) | Simple queries | Too many tables, schema duplication |
| **2 tables** (likes + comment_likes) | Content/comment separation of concerns | Distributed sync logic, increased table count |

**Rationale:** A single `UNIQUE(target_type, target_id, ip)` constraint prevents duplicates for all entities at the DB level. Comment likes are queried via real-time `COUNT(*)`, and only Posts sync to a `posts.like_count` cache column for list performance. With indexes applied, there is no performance difference up to thousands of records, so consistency and simplicity take priority.

### Denormalized Count Caching: `posts.like_count`

The `likes` table is the **source of truth** for likes, and `posts.like_count` is a **cache column** for list query performance.

| Entity | Count Method | Rationale |
|--------|------------|------|
| **Posts** | `posts.like_count` cache column sync | Instant display in lists without JOIN |
| **Works / Comments** | Real-time `COUNT(*)` query | Count not needed in lists, only queried on detail pages |

**Rationale:** A portfolio site has a read >> write ratio. Only Posts display like counts in lists, so a cache column is needed; the rest are fine with real-time queries.

### Editor Revision History: `revisions`

A polymorphic table that permanently stores the entire form as a JSONB snapshot on each auto-save of the Posts/Works editor.

**Alternatives considered:**

| Approach | Pros | Cons |
|------|------|------|
| **Separate DB table** (current) | Persistent across devices, tabs, and sessions; automatic cleanup per entity; diff comparison possible | DB write on each auto-save |
| **sessionStorage** (previous) | Instant access, no DB load | Lost when tab closes, no cross-device sharing |

**Rationale:** Since only one admin uses this, DB write costs are negligible. Cross-device/tab/session revision sharing and diff-based detailed comparison are more important. A `entity_type` CHECK column distinguishes posts/works in a single table, and snapshots are excluded from list queries for lightweight loading. JSON.stringify hash comparison prevents duplicate snapshot storage, and the detail view displays diffs for metadata items like categories, tags, and series.

**Auto-save interval decision:** Initially implemented with a 5-second debounce, but comparing against Google Docs (OT/diff), Notion (immediate save but server receives patches), and WordPress (60 seconds) revealed that **5 seconds is too frequent for a full-snapshot approach** — revisions accumulated meaninglessly. A diff-based approach was considered but rejected: no benefit over the complexity for a single-user environment with a 50-revision cap (~2.5MB). Changed to **30-second debounce + forced save on page leave**. Leave-save is handled via two paths: browser close/refresh uses `navigator.sendBeacon` (async-safe), and Next.js SPA navigation uses `fetch({ keepalive: true })` in the component unmount cleanup.

### Anonymous Comment Dual Authentication

In a login-free comment system, edit/delete permissions are verified through **2 paths**.

| Auth Path | Storage | Persistence | Purpose |
|-----------|----------|--------|------|
| `commenter_hash` | Browser localStorage UUID -> SHA-256 | Permanent on same browser | Auto authentication (no password input needed) |
| `password_hash` | bcrypt (salt round 10) | As long as user remembers | Authentication from different device/browser |

**Why both are needed:** With only `commenter_hash`, editing is impossible when changing browsers. With only `password`, input is required every time. Using both provides auto authentication on the same browser and password fallback in other environments, securing both UX and security.

### Comment System Features

| Feature | Description |
|------|------|
| **Nickname Shuffle** | Random emoji+name combination, changeable via shuffle button |
| **Reply Email Notification** | Enter email (optional) when commenting to receive reply notifications (`notify_email` column) |
| **Admin Comments** | Post comments with Admin badge without password when logged in, server-side Supabase Auth re-verification |


