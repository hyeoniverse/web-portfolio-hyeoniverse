---
id: revision-history-is-capped-per-entity
section: Data & Integrity
difficulty: 1
vizKey: revision-cap
---

# Data that only accumulates needs a ceiling

> On what basis should autosave snapshots be pruned instead of growing forever?

## Context

The editor also saves snapshots to the server as you write. Each snapshot is called a revision, and they exist for recovering from a closed browser or an accidentally deleted paragraph.

A new revision is stored on every save. Editing a long post over time produces hundreds for that post alone. With no limit, the number only goes up.

## Considerations

A retention policy has to be chosen.

You can cut by time, deleting revisions older than thirty days. Then an old post keeps none at all, and a post you return to after a long gap is exactly the case where something to roll back to is most useful.

You can cut by count, keeping the most recent few per post. Something to roll back to always exists regardless of the post's age. In exchange, a burst of saves pushes older states out faster.

You can also keep everything. Storage grows without bound, and reading the revision list slows down with it.

## Decision

Cutting by time leaves an old post with **nothing at all** — yet a post you return to after a long gap is exactly when something to roll back to matters. A policy that is empty when it is most needed was not worth taking. A count keeps **the recent ones regardless of age**.

Fifty per post, and the excess is trimmed right after a new revision is inserted.

```ts
const MAX_REVISIONS = 50;

// 엔티티당 MAX_REVISIONS 초과분 정리
const { data: overflow } = await admin
  .from("revisions")
  .select("id")
  .eq("entity_type", entity_type)
  .eq("entity_id", entity_id)
  .order("created_at", { ascending: false })
  .range(MAX_REVISIONS, MAX_REVISIONS + 1000);
```

Sorted newest first, everything from the fifty-first onward is selected and deleted. Trimming happens as part of the save rather than in a separate scheduled job, so the table never sits over the limit for long.

Posts and works share one revisions table. `entity_type` says which side a row belongs to, and the body goes in whole as a JSON snapshot. Adding a field to the edit form does not require changing the table.

## Key Insight

Data that accumulates on its own needs a ceiling. Without one, the problem surfaces later, once there is already too much of it.

Whether the ceiling is a count or a duration depends on when the data gets used. Revisions exist to undo something you just edited, so what matters is how many recent ones survive, not how long any of them have been kept.
