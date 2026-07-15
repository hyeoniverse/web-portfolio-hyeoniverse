# Security

Multi-layered security validation is applied to all public API endpoints.

| Security Layer | Implementation | Scope |
|------------|-----------|----------|
| **SQL Injection Prevention** | Supabase parameterized queries (prepared statements) | All DB queries |
| **XSS Prevention** | React JSX auto-escaping + server-side HTML tag stripping (`<[^>]*>` removal) + control character removal | All user input |
| **Comment Markdown Sanitize** | `marked` → `isomorphic-dompurify` tag/attribute allowlist + URL scheme restriction (below) | Comment bodies |
| **Input Validation** | UUID format validation, length limits, email format validation, enum type validation, category whitelist validation | All public APIs |
| **Authentication** | Comment dual authentication (commenter_hash + bcrypt password), admin comment server-side Supabase Auth re-verification | Comment edit/delete, admin |
| **RLS** | Supabase Row Level Security policies | All tables |
| **Route Protection** | Layout-level Supabase Auth session check + access denied page | `/admin/*` |
| **Duplicate Prevention** | IP-based UNIQUE constraints (votes use `poll_votes(poll_id, option_id, ip)` UNIQUE); comment reactions use `reactor_hash` (below) | Likes, visitor statistics, votes, comment reactions |
| **service_role Writes** | `/api/polls` votes + related-series writes are handled by the service_role admin client | Votes, related-series editing |
| **Password Security** | bcrypt (salt round 10), 72-byte limit, minimum 2 characters | Comment passwords |
| **Category Validation** | Server-side whitelist validation — only categories registered in site settings are allowed | Posts, Works, Series |
| **Secret Management** | API keys stored in DB, `SUPABASE_SERVICE_ROLE_KEY` server-side only, only `NEXT_PUBLIC_` prefix exposed to client | Environment variables, API keys |

**Server-side input sanitization (`commentValidation.ts`):**

| Function | Validation |
|------|----------|
| `isValidUUID()` | UUID v4 regex format validation |
| `sanitizeContent()` | HTML tag stripping + control character removal + 2000 character length limit |
| `validatePassword()` | Minimum 2 characters, bcrypt 72-byte upper limit |
| `validateEmail()` | RFC format validation, 254 character limit, lowercase normalization |
| `validateNickname()` | HTML tag stripping + control character removal + 50 character limit |

**Validated API endpoints:**

| Endpoint | Validation |
|-----------|----------|
| `POST/PATCH /api/comments` | UUID, content (2000 chars, HTML strip), nickname (50 chars), password (72B), email (254 chars) |
| `POST/PATCH /api/work-comments` | UUID, content (2000 chars, HTML strip), nickname (50 chars), password (72B), email (254 chars) |
| `DELETE /api/comments/[id]` | UUID format validation |
| `DELETE /api/work-comments/[id]` | UUID format validation |
| `GET/POST /api/comment-reactions` | UUID, comment_type enum (`post`/`work`), emoji allowlist (`isReactionEmoji`) |
| `GET/POST /api/posts/[id]/like` | UUID format validation |
| `GET/POST /api/works/[id]/like` | UUID format validation |
| `POST/PATCH /api/posts` | Category whitelist validation |
| `POST/PATCH /api/works` | Category pair (ko/en) whitelist validation |
| `POST/PATCH /api/series` | Category whitelist validation |
| `POST /api/contact` | Name (100 chars), email format/length, message (5000 chars) |
| `POST /api/translate` | Text (2000 chars), targetLang enum |
| `POST /api/posts/reassign-category` | `requireAuth()` — auth required, since it bulk-updates `posts.category` through the admin client |

**Comment markdown sanitize (`CommentMarkdown.tsx`):**

Comments allow markdown, so they use an **allowlist sanitize** rather than tag stripping. Content is parsed by an isolated `new Marked({ gfm: true, breaks: true })` instance (not the global one) and then cleaned with `isomorphic-dompurify`.

| Item | Value |
|------|-----|
| `ALLOWED_TAGS` | `p` `br` `strong` `em` `b` `i` `del` `s` `code` `pre` `blockquote` `ul` `ol` `li` `a` `hr` `img` `input` `h1`–`h6` `table` `thead` `tbody` `tr` `th` `td` `span` |
| `ALLOWED_ATTR` | `href` `title` `src` `alt` `type` `checked` `disabled` `class` `align` |
| `ALLOWED_URI_REGEXP` | `/^(?:https?:\|mailto:)/i` — blocks `data:` and friends |
| `ADD_URI_SAFE_ATTR` | `type` `checked` `disabled` `align` |

An `afterSanitizeAttributes` hook additionally forces:

- `<a>` → `target="_blank"` + `rel="noopener noreferrer nofollow"`
- `<img>` → `loading="lazy"`
- `<input>` → **removed** unless `type="checkbox"`; checkboxes get `disabled` forced (read-only task lists)

> **Why `ADD_URI_SAFE_ATTR` is needed:** DOMPurify tests an attribute's **value** against `ALLOWED_URI_REGEXP` unless the attribute is known to be URI-safe. `type` is not in the default URI-safe list, so the value of `type="checkbox"` failed the URL regex and was silently dropped — the hook then judged the element "not a checkbox" and removed the `<input>`, leaving task lists rendering as plain bullets. Table `align` was dead for the same reason. Adding them to `ALLOWED_ATTR` does not help — they must be declared as inert, non-URL attributes via `ADD_URI_SAFE_ATTR` to be excluded from the URI check.

**Comment images — external URLs only:**

Comment images have **no upload path and accept only externally hosted URLs** (the toolbar's image button merely inserts `![alt](url)` text; `CommentEditor` has no file input, drop, or paste handler). The http(s) regex in the sanitize step is the final gate on the scheme.

| Approach | Pros | Cons |
|------|------|------|
| **External URLs only** (current) | Anonymous users are never granted Storage write access — quota abuse, malicious files, and upload rate limiting simply don't exist as problems | Images break when the origin host dies; the viewer's IP is exposed to the external host |
| **Allow uploads** | Images persist, no IP exposure | Anonymous writes = abuse surface. Needs quota, validation, and cleanup policies |
| **camo-style image proxy** | Blocks IP exposure and persists images | The proxy itself is an SSRF surface plus bandwidth cost — overkill for a one-person portfolio |

**Rationale:** Opening Storage writes to login-free comments is the biggest risk here, so **uploads were left out entirely** (the same approach GitHub originally took). The accepted tradeoff is that a reader's IP is exposed to external image hosts — GitHub hides this behind its camo proxy, but a proxy creates a new SSRF surface and bandwidth cost, and this site's comment image volume does not justify that price.

**Comment reaction identifier (`reactor_hash`):**

`comment_reactions` never stores a raw IP — only the first 32 chars of `sha256(IP + ":" + UA)`. The IP is resolved as the first segment of `x-forwarded-for`, then `x-real-ip`, then the literal `"unknown"`. Since reactions are login-free, the goal is **everyday duplicate prevention** rather than perfect identification, and the stored value is not itself personally identifying.


