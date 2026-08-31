---
id: duplicate-prevention-belongs-in-the-database
section: Data & Integrity
difficulty: 2
vizKey: unique-constraint
---

# Duplicate prevention belongs in the database

> Check for duplicate likes and votes in API code, or block them with a database constraint?

## Context

Posts have a like button, and a post body can embed a poll block. Both work without signing in, so the same person pressing repeatedly has to be blocked.

With no sign-in, the only thing distinguishing one person from another is the IP address. The rule becomes: one press per IP per target.

## Considerations

It comes down to where the check lives.

It can live in the API code: on each request, look up whether that IP already has a record, and insert if it does not. Reading and writing are two separate steps.

When two requests arrive at nearly the same moment, both see no record at the lookup step. Both then proceed to insert, and a duplicate appears. A fast double-press or a network retry is enough to trigger it.

It can also live in the database as a constraint. Declaring that a combination cannot repeat makes the database itself reject the second insert. The gap between lookup and insert disappears.

## Decision

Checking in API code blocks **most** of them — and *most* is the problem. The gap between lookup and insert only opens when requests overlap, and you don't get to choose when that happens. A constraint removes the gap itself, and it costs **one index**.

The constraint goes into the database.

```sql
-- 동일 대상에 같은 IP 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_unique
  ON likes (target_type, target_id, ip);
```

If that combination of three values already exists, the insert itself fails. However the two requests interleave, exactly one row survives. The poll block got the same treatment on `(poll_id, option_id, ip)`.

`target_type` is part of the key because likes attach to both posts and works. Even if an id happens to coincide across the two tables, they stay distinct targets.

## Key Insight

"Check first, then write" breaks the moment two requests overlap, because another request can land between the check and the write.

Expressing the same rule as a constraint removes that gap. A rule the data must satisfy is better written once where the data lives than repeated in every piece of code that touches it.
