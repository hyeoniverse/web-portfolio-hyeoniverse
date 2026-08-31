---
id: notification-failure-must-not-fail-the-job
section: Infrastructure & Automation
difficulty: 2
vizKey: fail-soft-notify
---

# Decide which way each failure falls

> When sending a notification fails, should the underlying job roll back too?

## Context

When a scheduled job publishes posts or empties the trash, it emails the admin about what happened. Delivery goes through an external service called Resend, and the API key it needs is kept in Vault, a secret store inside the database.

Notification can fail in two ways. The key may not be registered yet, as on a fresh install. Or the key exists but the external service does not respond.

What matters is that both jobs run inside a single database transaction. A transaction is a unit that either commits everything done inside it or cancels all of it. The email send sits inside that same transaction.

## Considerations

A policy has to be chosen for a failed notification.

Letting the error propagate cancels the transaction. Posts do not get published and the trash is not emptied. The real work is undone because an email could not be sent.

Swallowing it lets the real work finish, but then nobody learns the notification never arrived.

The two failures are not the same kind of thing. Email is the means of reporting a result; publishing the post is the thing you actually set out to do. A failed means is no reason to undo the end.

## Decision

The two failures do not weigh the same. A missing email means the admin checks the screen later; a rolled-back publish means **a post readers were meant to see never went up**. There was no reason to let the lighter failure undo the heavier one, so only the notification is swallowed.

Both the function that reads the key and the function that sends the mail swallow their failures.

```sql
-- 유틸: Vault secret 안전 조회 (없으면 NULL)
CREATE OR REPLACE FUNCTION _get_vault_secret(secret_name text)
...
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;

-- 유틸: Resend 이메일 발송 (Vault 비어있으면 skip, 실패는 무시 — DB 본 작업은 성공해야)
BEGIN
  IF api_key IS NULL OR to_email IS NULL OR from_email IS NULL THEN
    RETURN;
  END IF;
```

With no key, the lookup returns NULL, and the sender sees that NULL and returns without doing anything. No error is raised, so the transaction proceeds and the post publishes as planned.

This applies to notifications only. A failure in the scheduled job itself must be recorded instead, which is what the `safe_` wrapper does when it catches an exception and writes it to `admin_notifications`.

## Key Insight

Which way a failure should fall depends on whether the action is an end or a means.

Notification is a means, so its failure leaves the real work alone. Failure of the real work is the opposite: it has to surface. Treating both the same way lands you with either a post that never publishes because of an email, or a job that fails while nobody finds out.
