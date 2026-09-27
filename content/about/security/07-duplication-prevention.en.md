---
icon: fingerprint
scope: Likes, views, visit stats
---

# Duplication Prevention · Minimal IP Retention

**UNIQUE indexes** block duplicates in the database: `(target, IP)` for likes, `(poll, option, IP)` for poll votes, `(target, IP, date)` for views, and `(IP, date)` for visits. Raw IPs never leave the server and are shown masked, and IPs in visit and view records are anonymized after 90 days.
