---
id: delete-is-a-reversible-state-change
section: Data & Integrity
difficulty: 1
vizKey: reversible-delete
---

# Deletion defaults to recoverable

> Should deletion remove the row, or become a reversible state change?

## Context

The admin screens have buttons that delete posts and works. Calendar blocks embedded in a post can be deleted too.

The site has one operator. Nothing reviews a deletion before it happens, and no one else can restore something removed by mistake. The moment of deleting is the last judgement anyone makes.

## Considerations

There are two ways to do it.

One is to actually remove the row. Everything downstream gets simpler: list queries carry no extra condition and storage does not grow. The only way back is restoring an entire database backup.

The other is to keep the row and record only the time it was deleted, commonly called a soft delete. The row is hidden from lists but the data survives, so it can be restored. In exchange, every read has to remember to select only the rows that are not deleted, and deleted rows keep accumulating.

## Decision

Removing the row keeps the code simpler, but a mistake then has **no remedy short of restoring a backup** — and with a single operator there is nobody else to do that restoring. The cost of the `deleted_at` approach is one extra condition on reads, and **code pays that once**.

Deleting writes a timestamp into `deleted_at`. The trash screen collects those rows and restores from there. The delete also records a retention deadline in `purge_after`; once that time passes, a scheduled job removes the row for real, once a day.

```ts
// 복구 — 기록해 둔 시각을 지우면 목록에 다시 나타난다
.update({ deleted_at: null }).eq("id", id)

// 영구 삭제 — 전용 라우트에서만 호출된다
export async function purgeForever(table: TableName, id: string) { ... }
```

Permanent deletion lives behind a different API. It has its own address, `/api/posts/[id]/purge`, and is unreachable without going through the trash screen. The accumulation problem is handled by the retention deadline rather than by remembering to clean up.

## Key Insight

An irreversible action does not belong on the same button as a reversible one. The cost of a mistake is not the same for both.

The default has to be the recoverable one. Permanent removal happens either because a retention deadline passed or because the user asked for it a second time, explicitly.
