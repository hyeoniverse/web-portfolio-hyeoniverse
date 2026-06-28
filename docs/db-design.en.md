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

### Poll Block Tally: `poll_votes`

A table that tallies responses to the content editor's poll block. The poll's **structure (question, options) has no separate table** — it lives inside the editor block's saved HTML/JSON.

| Column | Description |
|------|------|
| `id` | uuid PK |
| `poll_id` | Fixed text id the editor assigns on block creation (saved HTML `data-poll-id`) |
| `option_id` | Fixed option text id (`data-option-id`) |
| `ip` | Voter IP (DEFAULT `''`), for duplicate prevention |
| `created_at` | timestamptz |

**Alternatives considered:**

| Approach | Pros | Cons |
|------|------|------|
| **Single tally table** (current) | Poll structure stored alongside editor content, simple schema | poll_id/option_id are text, not FKs |
| **Normalized `polls` + `poll_options`** | Referential integrity | Needs separate-table sync on every content save, more tables |

**Rationale:** A poll block's question and options are part of the post content, so they are stored inside the post HTML, and `poll_votes` handles **pure tallying** only. Hence `poll_id` / `option_id` are editor-assigned text ids rather than FKs. `UNIQUE(poll_id, option_id, ip)` blocks duplicate votes from the same IP on the same option at the DB level, and a `poll_id` index optimizes tally queries. For single-select polls the API deletes and re-inserts the `(poll_id, ip)` rows to replace the choice; multi-select toggles per option (insert/delete). RLS is public SELECT + service_role ALL (tally/vote handled by the admin client).

### Series ↔ Project Linking: `series_work_relations`

A many-to-many table linking related series onto a project (work), following the same pattern as the existing `post_work_relations`.

| Column | Description |
|------|------|
| `series_id` | uuid FK → `series(id)` ON DELETE CASCADE |
| `work_id` | uuid FK → `works(id)` ON DELETE CASCADE |
| `created_at` | timestamptz |

The PRIMARY KEY is the composite `(series_id, work_id)`, with an index on each of `series_id` / `work_id`. RLS is public SELECT + service_role ALL.

**Rationale:** Since posts↔works bidirectional linking (`post_work_relations`) is an already-proven many-to-many pattern, series↔project linking reuses the same structure for consistency. ON DELETE CASCADE on both FKs auto-cleans relation rows when a series or work is deleted, and the composite PK blocks duplicate links of the same pair.


