---
id: role-stored-in-app-metadata
section: Authentication & Authorization
difficulty: 2
vizKey: perm-store
---

# Designing the trust boundary for permission data

> Where to store roles and permissions in user metadata

## Context

With a single admin account there was no need for a permission model. Opening the site up to multiple authors changed that: each account needed a defined reach.

Permissions were split into three tiers.

1. An owner, who also manages site settings and authors
2. An author who can edit every post
3. An author who can edit only their own posts

The server then has to establish at least two things on every admin request.

1. What role does the calling account hold
2. Does that role allow the requested operation

Which raises a decision. **Where should the role the server must trust be stored, and how should it be read?**

This project uses `Supabase Auth` for sign-in. Supabase Auth gives every user two metadata areas, `user_metadata` and `app_metadata`. Both travel with the user record and both can hold whatever a service needs. So the metadata Supabase already provides is the first candidate, and a dedicated database table is the other.

## Considerations

### 1. user_metadata

Start with `user_metadata`. It already travels with the user record and needs no table of its own. It could hold something like this.

```json
{ "role": "author", "permission_level": 1 }
```

But Supabase Auth exposes `updateUser()` so that a signed-in user can edit their own record.

```ts
await supabase.auth.updateUser({
  data: { displayName: "New name" },
});
```

The catch is that this request **goes straight from the client to Supabase Auth without passing through the site's API**. An authenticated session is enough; the site does not have to offer an edit screen for the user to change their own record.

[[viz]]

A user can call `updateUser()` from the browser console.

```ts
await supabase.auth.updateUser({
  data: { role: "owner" },
});
```

If the server decided permissions from `user_metadata.role`, an author could rewrite their role as `owner` and take owner access. The server cannot treat that value as evidence. Supabase's own documentation says not to use `user_metadata` for security-sensitive information or authorization logic.

**Permission data has to be something the user cannot change about themselves.** Unlike a display name or a notification preference, which the user is free to set, a permission is a value the server must trust in order to authorize.

### 2. app_metadata

`app_metadata` also travels with the user record, but it is written differently. An ordinary client request cannot modify it; changing it requires admin credentials on the server.

[[viz]]

The `service-role` key clears every access restriction in the database, so it is never exposed to the client and lives only on the server. That structure **confines permission changes to the server**. Values a user must not set for themselves — `role`, `permission_level` — therefore belong in `app_metadata`.

Supabase's documentation says the same: `raw_app_meta_data` cannot be updated by the user and is suitable for authorization data, while `raw_user_meta_data` can be updated by an authenticated user and is not.

### 3. A dedicated permissions table

The role could also live outside Supabase Auth, in the application's own database.

```sql
user_permissions
  user_id
  role
  permission_level
  author_id
```

Storage and updates both stay on the server, so this option also prevents a user from rewriting their own permission. With the security properties comparable, the next question is what each costs at read time.

Handling an admin request starts by confirming the caller is authenticated, which in this project is `supabase.auth.getUser()`. The user record it returns already contains `app_metadata`.

[[viz]]

Storing the role in `app_metadata` therefore **adds no query** — the role arrives inside the record the auth check already fetched. With a dedicated table, `getUser()` alone cannot tell you the role, so every permission check costs one more query against that table.

### When permissions change

Roles have one more property: **they are not fixed.** An owner can change an existing member's permission later, demoting an editor to an author who may only touch their own posts. So the server also has to avoid deciding on a stale permission.

Rather than trusting the user record held in the browser's session, the server calls `supabase.auth.getUser()`. That call sends a network request to the Auth server, validates the access token, and re-reads the current user record. The server's decision therefore rests on **what the Auth server confirms**, not on the client's copy.

The admin screen, on the other hand, has to redraw its menus for the new permission. The account making the change (the owner) and the account affected are different users, so the answer cannot carry it. Instead the server broadcasts on the target account's Realtime channel and the receiving client refreshes its session. That is purely **about keeping the screen current**. Whether a request is allowed is always decided by the server.

## Decision

The permission data this project has to manage is not complex — `role`, `permission_level`, `author_id`. Carrying that much inside the user record poses no structural problem, so storing it in `app_metadata` fits this design better than adding a query for every permission check.

```json
{
  "role": "author",
  "permission_level": 1,
  "author_id": "..."
}
```

The server reads `app_metadata` off the user record returned by `getUser()` and resolves the role from it.

```ts
export function getUserRole(user: User | null | undefined): UserRole {
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const isOwner = meta.role === "owner"
    || (!!ownerEmail && user.email?.toLowerCase() === ownerEmail);
  if (isOwner) return { role: "owner", level: Infinity, authorId, isOwner: true };
  ...
}
```

Request handling then reduces to this.

[[viz]]

The final step, the per-post check, is handled by `canEditPost`. An owner and an editor pass straight through; an author passes only when their id appears in the post's `author_ids`.

## Key Insight

**A value the server must trust should only be changed and verified inside a boundary the server can trust.**

Permission data cannot be handled like ordinary user settings. A display name or a notification preference can be changed by the user without affecting any authorization decision. `role` and `permission_level` are what the server decides requests on.

The two kinds of data therefore cannot share a mechanism. The user must not be able to change their own permission, and changing a permission has to stay under the server's control. And because a permission can change later, the server has to read the value as of the request rather than an older copy.

What matters about permission data is not simply **where it is stored**. It is designing **who can change it, and through which path the server comes to trust it**.
