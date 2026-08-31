---
id: single-auth-path-for-anonymous-comments
section: Authentication & Authorization
difficulty: 3
vizKey: anon-comment-auth
---

# Keep a single authentication path

> How to verify the author of an anonymous comment with no session

## Context

Comments on this site can be written without signing in. Instead, a password is collected when the comment is written and asked for again when it is edited or deleted.

For a signed-in user the server reads the session and knows who it is. An anonymous comment has no session. When an edit or delete request arrives, the server has to decide whether the caller wrote that comment using some other evidence.

## Considerations

There were two candidates.

The first is the password. It is hashed with bcrypt and stored. Hashing turns the value into a form that cannot be reversed, so even if the stored value leaks, the password itself does not. An edit request runs the submitted password through the same process and compares.

The second is a browser identifier. On its first visit the browser generates a random UUID and keeps it in `localStorage`. Hashing that UUID together with the post id and storing the result on the comment lets requests from the same browser through without a password. That hash was never built for authentication: it exists to pick each anonymous comment's avatar emoji and nickname, so it was already stored.

The original implementation accepted both and let a request through if either matched. The form always sends a password, so anything done through the UI authenticates on the first one. A request built by hand can leave the password out and send only the hash.

## Decision

What the hash path buys is **one fewer password prompt in the same browser**. What it costs is that a 31-bit value shipped in the public response can edit somebody else's comment. The convenience is small and the damage is permanent, so there was no case for keeping it.

The hash path was removed, leaving the password alone.

```ts
// commenter_hash 기반 인증 경로는 제거됨 — simpleHash 가 31-bit 비암호 해시라
// commenter_id 를 brute force 로 위변조 가능했음. 익명 사용자는 비번이 유일한 인증.
if (!comment.password_hash) return jsonError("Password required", 403);
if (!password) return jsonError("Password required", 401);
const authorized = await bcrypt.compare(password, comment.password_hash);
if (!authorized) return jsonError("Not authorized", 403);
```

`simpleHash`, which produces that value, is a 31-bit function that multiplies and adds one character at a time. Only about 2.1 billion results are possible, so searching for a UUID that lands on the same one does not take long. bcrypt is built the opposite way: a single comparison is deliberately slow, which makes the same search impractical.

The hash is also returned in the public read response, since the avatar has to be drawn from it. The value an attacker needs to match is handed to them up front. The stored password hash, by contrast, never leaves the server.

## Key Insight

Joining two authentication methods with "either one passes" fixes the overall strength at the weaker one. However well the strong path is built, an attacker only ever has to face the weak one.

Opening an extra path for convenience is also a decision about how strong that path is. One path, built properly, beats two.
