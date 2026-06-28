# Security

Multi-layered security validation is applied to all public API endpoints.

| Security Layer | Implementation | Scope |
|------------|-----------|----------|
| **SQL Injection Prevention** | Supabase parameterized queries (prepared statements) | All DB queries |
| **XSS Prevention** | React JSX auto-escaping + server-side HTML tag stripping (`<[^>]*>` removal) + control character removal | All user input |
| **Input Validation** | UUID format validation, length limits, email format validation, enum type validation, category whitelist validation | All public APIs |
| **Authentication** | Comment dual authentication (commenter_hash + bcrypt password), admin comment server-side Supabase Auth re-verification | Comment edit/delete, admin |
| **RLS** | Supabase Row Level Security policies | All tables |
| **Route Protection** | Layout-level Supabase Auth session check + access denied page | `/admin/*` |
| **Duplicate Prevention** | IP-based UNIQUE constraints (votes use `poll_votes(poll_id, option_id, ip)` UNIQUE) | Likes, visitor statistics, votes |
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
| `POST /api/comment-likes` | UUID, comment_type enum validation |
| `GET/POST /api/posts/[id]/like` | UUID format validation |
| `GET/POST /api/works/[id]/like` | UUID format validation |
| `POST/PATCH /api/posts` | Category whitelist validation |
| `POST/PATCH /api/works` | Category pair (ko/en) whitelist validation |
| `POST/PATCH /api/series` | Category whitelist validation |
| `POST /api/contact` | Name (100 chars), email format/length, message (5000 chars) |
| `POST /api/translate` | Text (2000 chars), targetLang enum |


