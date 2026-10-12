---
icon: key
scope: Env vars, API keys
---

# Secrets Management

External service API keys live in the `secrets` row of `site_settings`, readable only by the server (`service_role`) and the owner under RLS, with server environment variables as the fallback. `SUPABASE_SERVICE_ROLE_KEY` stays on the server, and only `NEXT_PUBLIC_`-prefixed keys reach the browser. Error messages written to the service call log are stored with keys masked.
