---
layer: Authentication
icon: lock
scope: Comment edit/delete, Admin
---

# Single-path Authentication

Editing or deleting an anonymous comment authenticates through **one path only**: a **bcrypt** (salt round 10) password. The path that also accepted a browser UUID-based `commenter_hash` was removed, because that value is a 31-bit non-cryptographic hash and is returned in the public response so avatars can be drawn. Admins authenticate with a **Supabase Auth** session.
