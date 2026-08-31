---
id: authorization-moves-to-code-when-rls-is-bypassed
section: Authentication & Authorization
difficulty: 3
vizKey: all-param-leak
---

# Moving the authorization decision from code into database rules

> Where to authorize when one public API also serves the admin screen's drafts and trash

## Context

One API returns the list of posts. When a visitor opens the list screen, it returns published posts.

The admin screen needs the same list, except it also has to show unpublished drafts and everything sitting in the trash. Rather than build a second API, the same one was reused with query parameters: `?all=true` includes drafts, `?trash=true` includes the trash.

The problem was that the server never checked whether the caller was signed in when those parameters were present. Knowing the URL was enough to read the drafts.

## Considerations

There are two ways to reach the database.

The first forwards the caller's session. That keeps Row Level Security in play: each table carries rules about who may see which rows, and the database filters by caller on its own. Even if the code forgets a condition, the database still refuses.

The second uses the service-role key, which clears all of those rules.

At the time this table carried exactly one rule: **only published posts are visible.** Drafts fall outside it, so the conclusion was that an admin screen needing drafts had no choice but the key that clears the rule.

The moment you take that second path, confirming that the caller is an administrator moves from the database into the API code. That confirmation was missing.

But that conclusion rests on an assumption nobody checked: that a rule can only look at **the values in the row**. A rule can also look at who is asking. If "visible when the post is published, or when the caller is an administrator" can be written as a rule, the reason to bypass disappears.

## Decision

For a rule to see the caller, the request has to carry the role. This project stores the role in `app_metadata`, and that value is embedded in the access token issued at sign-in. The database can read that token with `auth.jwt()`, so a rule can know the role without a query of its own.

So the role is pulled out of the token by functions, and the rules call those functions.

```sql
CREATE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT app_role() = 'owner' OR app_level() >= 2;
$$;

CREATE FUNCTION can_edit_post(target_author_ids text[]) RETURNS boolean AS $$
  SELECT is_owner()
      OR app_level() >= 2
      OR (app_role() = 'author'
          AND app_author_id() IS NOT NULL
          AND app_author_id() = ANY (coalesce(target_author_ids, '{}')));
$$;
```

The posts table carries rules built on those functions. Read, update, and delete all resolve through the single `can_edit_post` predicate: owners and administrators reach everything, an author reaches only their own posts. The existing public rule stays in place, so published posts remain visible to everyone.

```sql
CREATE POLICY posts_admin_select ON posts
  FOR SELECT TO authenticated
  USING (can_edit_post(author_ids));
```

The API now forwards the caller's session. `?all=true` no longer switches clients; it only changes the filter. What comes back is decided by the rules, not by the code.

```ts
let supabase = await createClient();
if (showAll || showTrash) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  supabase = auth.supabase;
}
```

Some places still bypass. **Aggregates that span the whole site** are one: narrowing the popularity ranking to the caller's view would count only their own posts and change the result. **Site settings** are another: the settings live in a single-row document, and what an author may change is a slice inside that document, which a row-level rule cannot express. Those places keep the bypass, with the reason written next to it.

## Key Insight

The bypass was never a decision; it was the starting shape. The admin screens connected with the service-role key from the day they were built, and the question "why can't this path satisfy the rules?" only came up after data leaked. The assumption that a rule can only look at values in the row went unexamined the whole time.

**The default has to be blocked.** Leaving everything open and trusting the code never to drop the public-only condition collapses on a single mistake. With the decision in the rules, a forgotten condition still meets one more layer in the database.

Moving it has a cost. A rule reads the token attached to the request, so lowering someone's permission takes effect only once that account's token is refreshed, while the server's per-request `getUser()` check applied immediately.

That lag was not left alone. `getUser()` asks the Auth server for the current `app_metadata`, while the queries the same request sends to the database carry the token the browser is holding. So the auth helper compares the two on every request. It refreshes the session only when the three claims that drive the decision (`role`, `permission_level`, `author_id`) disagree, so there is no cost in the normal case. The token is decoded, but only for the comparison; the signature is not rechecked, because that verification has already happened.

The shape of the response changes too. A request the rules exclude comes back as an **empty result**, not a refusal. A target you may not touch and a target that does not exist both arrive as zero rows, so left alone it answers "not found" for posts that are plainly there.

So **the decision was split from the enforcement.** The decision is made by reading one column, `author_ids`, through the bypass key: no target gives 404, a target you may not touch gives 403 with a reason. What was read never reaches the response. The actual read or write goes through the caller's own session, so it still meets the rules. A decision the code gets wrong still runs into the policy, and the status code stays accurate. If both checks pass and the policy still filters the row, the token is stale, and that answers 403 asking for a fresh sign-in, not 404.
