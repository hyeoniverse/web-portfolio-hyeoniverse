---
id: optimistic-concurrency-with-a-version-counter
section: Data & Integrity
difficulty: 3
vizKey: optimistic-lock
---

# Detect conflicts instead of preventing them

> Preventing a later save from silently overwriting an earlier one on the same post

## Context

The editor autosaves while you write. The same post can also be open in two places at once, most often a laptop left open while the post is reopened on a phone.

If both screens edit and both save, the later save overwrites the earlier one. Neither side learns this happened. Both screens simply show that the post was saved.

## Considerations

You can either prevent the collision or detect it.

Preventing means locking. Opening a post locks it so no other screen can open it. That is airtight, but it needs a rule for releasing the lock. Closing the browser leaves the lock behind, and the post becomes uneditable for a while.

Detecting means a version number. Each post carries a counter that increases by one on every save. The editor receives that number when it opens the post and sends it back when it saves. The server writes only if the number still matches what is stored. A mismatch means somebody saved in between.

This way nothing is locked, so a screen left open never blocks another. In exchange, a conflict has to be surfaced to the user with a choice about what to do.

## Decision

Locking is airtight but **pays a standing cost to prevent a rare event**. Simultaneous edits are uncommon, yet lock release has to be managed at all times and a closed browser leaves one behind. A version counter does nothing until the moment values diverge.

A version counter. Version equality goes into the save condition, and a mismatch returns 409.

```ts
// baseVersion 이 있으면 조건부 갱신(버전 일치할 때만) + version 증가.
const { data, error } = await admin
  .from("posts")
  .update({ ...body, version: baseVersion + 1, updated_at: new Date().toISOString() })
  .eq("id", id)
  .eq("version", baseVersion)
```

The last line is what does the work. Only a row whose stored version still equals the one the editor took when it opened the post gets updated. If another screen saved in between, the number has already moved on, nothing matches, and zero rows are updated. The check and the write happen in one statement, so no other request can slip between them.

Zero updated rows has two possible causes: the post was deleted, or the version diverged. So the current version is read once more to tell them apart, and a conflict returns 409 along with the current version number.

## Key Insight

Simultaneous edits are rare. Locking all the time to prevent a rare event means paying the cost of managing locks all the time.

Detecting a conflict when it happens beats preventing it in advance. Detection needs one number and one line in the save condition. The goal was never to eliminate conflicts, only to make sure nothing is overwritten in silence.
