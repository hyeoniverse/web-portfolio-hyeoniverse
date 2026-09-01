---
icon: key
scope: Env vars, API keys
---

# Secrets Management

API keys are stored **encrypted** in DB `site_settings`. `SUPABASE_SERVICE_ROLE_KEY` is accessible only server-side. Only `NEXT_PUBLIC_` prefixed keys are exposed to the client.
