---
layer: Duplication
icon: fingerprint
scope: Likes, visit stats
---

# Duplication Prevention

**IP-based UNIQUE constraints** prevent duplicate likes and visit counts. A single `UNIQUE(target_type, target_id, ip)` blocks all entity duplicates at the DB level.
