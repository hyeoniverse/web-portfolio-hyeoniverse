---
icon: fingerprint
scope: Likes, poll votes, views and visits
---

# Duplication Prevention · Minimal IP Retention

**UNIQUE indexes** block duplicate likes `(target, IP)` and poll votes `(poll, option, IP)` in the database. Views and visits go into one view log (`page_views`); a repeat view of the same page by the same IP **within 30 minutes** returns the earlier row, and an advisory lock serializes concurrent requests. Raw IPs never leave the server and are shown masked, IPs in the view log are cleared after 90 days, and operator-marked IPs are not recorded.
