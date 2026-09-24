# Deployment

[← README](../../README.en.md)

## Deployment

Written for Vercel, in the order the steps actually bite.

### 1. Create the Vercel project

1. Import the GitHub repo on [Vercel](https://vercel.com).
2. Leave the build settings alone. Next.js and npm are detected automatically, and `prebuild` (font scan, content asset copy, about fallback) runs ahead of `npm run build`.
3. Add the environment variables below, then deploy.

Production deploys come from pushes to the repo's default branch (`master`); pull requests get Preview deployments.

### 2. Environment variables

Paste the contents of `.env.local` straight into the Key field and Vercel splits it into one row per key. macOS hides dotfiles in the file picker, so press `⌘⇧.` there if you want to import the file itself.

```
Required:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  OWNER_EMAIL                  # Site owner account. The baseline for multi-author permissions
  SITE_URL                     # The address the site actually serves (e.g. https://www.your-domain.com)
                               # Basis for the proxy's CSRF Origin check and for the mail sender domain.
                               # Missing in production → every /api/* mutation is 403 (fail-closed)

Optional:
  RESEND_API_KEY               # Admin alerts, new-device approval, comment replies, author invites
  UNSPLASH_ACCESS_KEY          # Cover Image — Unsplash
  PEXELS_API_KEY               # Cover Image — Pexels (Unsplash fallback)
  HUGGINGFACE_API_KEY          # Cover Image — AI (HuggingFace)
  NANOBANANA_API_KEY           # Cover Image — AI (NanoBanana)
  DEEPL_API_KEY                # Translation — DeepL
  GOOGLE_TRANSLATE_API_KEY     # Translation — Google
  GEMINI_API_KEY               # Translation + AI Summary — Gemini
  OPENAI_API_KEY               # AI Summary — OpenAI
  ANTHROPIC_API_KEY            # Translation + AI Summary — Claude
  GITHUB_TOKEN                 # Profile/home GitHub integration (repos, org repos; the contribution
                               # graph is GraphQL and needs auth) + giscus repo lookup. Public-repo read
                               # PAT; the admin Services tab secret takes priority. Orgs may reject
                               # fine-grained tokens with a lifetime over 366 days — issue under 1 year
```

**Four rules for `SITE_URL`.**

- Use **the address the site actually serves**. If `www` is the primary host, that is `https://www.example.com`. A mismatch makes every create, update and delete request under `/api/*` return 403. Reading pages still works, so nothing looks broken.
- A trailing `/` is fine; the code strips it back to the origin.
- **Do not prefix it with `NEXT_PUBLIC_`.** That prefix ships the value to the browser, and Vercel refuses to store such a variable as a secret, which disables the Save button. This value is read on the server only.
- **Redeploy** after changing it.

### 3. Custom domain (Cloudflare)

A domain bought at Cloudflare cannot move its nameservers, so connect it with DNS records.

1. On Vercel, go to **Settings → Domains** and add both `example.com` and `www.example.com`. Attach one to Production and redirect the other to it (308).
2. In Cloudflare, go to **DNS → Records** and enter exactly what the Vercel screen shows. The value is per project.

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| CNAME | `@` | the `xxxx.vercel-dns-0nn.com` value Vercel shows | **DNS only (grey cloud)** |
| CNAME | `www` | same value | **DNS only (grey cloud)** |

- **Turn the proxy off.** It defaults to orange (Proxied), which blocks certificate issuance or sends the site into a redirect loop.
- **Add both `@` and `www`.** One redirects to the other, so a missing record on the destination side takes the whole site down.
- Cloudflare allows a CNAME at the root. A record's Type cannot be edited, so delete the old A record and create the CNAME fresh.
- The legacy values (A `76.76.21.21`, CNAME `cname.vercel-dns.com`) still work, but Vercel keeps showing **DNS Change Recommended** until you switch to the new ones.
- `SITE_URL` must match the **destination** host, not the one that redirects away.

If the site still fails after fixing DNS, a stale lookup is cached. A "no such host" answer is remembered for up to 30 minutes: clear it with `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`, or check from a phone on mobile data.

### 4. Register the domain with external services

- **Supabase** → Authentication → URL Configuration
  - Site URL: `https://www.example.com`
  - Redirect URLs: `https://www.example.com/auth/callback` (GitHub sign-in returns here)
- **reCAPTCHA**: add the domain to the allowed list in the admin console.
- Contact-form services (Formspree and friends): add it there too if you restricted domains.

### 5. Mail (Resend)

Before domain verification the sender is Resend's temporary address (`onboarding@resend.dev`), which only delivers **to the Resend account owner**. Comment-reply notifications and author invites never arrive, and even your own mail lands in spam easily.

1. Resend → **Domains → Add Domain** (pick a nearby region).
2. Add the DNS records it shows to Cloudflare as-is: DKIM (TXT `resend._domainkey`), SPF (TXT `send`), bounce handling (MX `send`). TXT and MX records have no proxy setting.
3. Hit **Verify**. Once it reads Verified you are done — the sender address is derived in code from the `SITE_URL` host (with `www` stripped), so there is nothing else to configure.

Scheduled publishing and trash purge notices are the exception: **Supabase sends those itself**, and all three Vault secrets must be present.

| Vault secret | Value | Notes |
|---|---|---|
| `resend_api_key` | `re_...` | Missing → only the email is skipped, DB work still runs |
| `admin_email` | Recipient address | |
| `notify_from` | Sender address | Must be **a domain verified in Resend**. A Gmail address gets rejected |

You can also change it from the SQL Editor:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'notify_from'),
  'Site <noreply@example.com>'
);
```

### 6. Visitor metrics

`@vercel/analytics` (visits) and `@vercel/speed-insights` (field performance) are already installed. Just press Enable on the **Analytics** and **Speed Insights** tabs of the Vercel dashboard. Both scripts are injected at runtime, so they never appear in the HTML source, and an ad blocker will hide your own visits.

On Hobby, Web Analytics is free up to 50,000 events per month and Speed Insights up to 10,000 events over 30 days. Going over pauses collection instead of charging you.

### 7. First sign-in

An unrecognized device has to clear an email approval first. The sign-in succeeds, the session is revoked immediately, and an approval link is mailed out.

- If the mail is nowhere to be seen, **check the spam folder** — before domain verification that is where it lands.
- If it never shows up, flip `approved` to `true` on the matching row in Supabase **Table Editor → `admin_known_devices`**.

### Post-deploy checks

- [ ] The site loads on both `@` and `www`
- [ ] A post saves after signing in to admin (403 → check `SITE_URL`)
- [ ] The contact form and comments submit (same CSRF check)
- [ ] The new-device approval mail reaches the inbox
- [ ] Data shows up on the Analytics and Speed Insights tabs

### Common dead ends

| Symptom | Cause | Fix |
|---------|-------|-----|
| Pages render, but saving, comments and the contact form all fail | `SITE_URL` missing or not the served address | Set the real address, then redeploy |
| The environment variable Save button does nothing | `NEXT_PUBLIC_` prefix cannot be stored as a secret | Drop the prefix, or store it as Config |
| Site unreachable after connecting the domain | Only one of `@` / `www` has a record | Add both |
| Still unreachable after fixing it | The "no such host" answer is cached (up to 30 min) | Flush DNS, or check from another network |
| Vercel shows DNS Change Recommended | Legacy record values | Swap in the values Vercel shows |
| Cannot sign in | Device waiting for approval | Check the approval mail, spam folder included |
| Only the scheduled-publish mail is missing | Vault `notify_from` is an unverified domain | Point it at the verified domain |

### Other Platforms

Any platform that supports Next.js works. See the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for details.
