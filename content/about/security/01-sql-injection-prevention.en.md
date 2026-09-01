---
icon: db
scope: All DB queries
---

# SQL Injection Prevention

All database queries use Supabase **parameterized queries** (prepared statements). User input is never directly interpolated into query strings, blocking SQL injection attacks at the source.
