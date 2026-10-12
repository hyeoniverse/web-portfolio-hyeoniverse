---
icon: gauge
scope: Translation, summaries, live demos, paid APIs
---

# Abuse & Cost Limits

Requests that cost provider money are capped up front. Translations that miss the cache and call a provider are limited to **5 per IP and 60 overall every 10 minutes**, and a visitor-created AI summary to **once a minute per IP**. The About live demos count daily uses by an HMAC of the IP, and the app stops Google Translate at 450k characters and Google TTS at 800k bytes a month, staying inside the free tiers.
