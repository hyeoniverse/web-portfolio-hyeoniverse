---
icon: shield
scope: Comment and body HTML rendering
---

# XSS Prevention

React JSX **auto-escapes** text. HTML is injected only in the few places that use `dangerouslySetInnerHTML`, handled by who wrote it: comments, open to anyone, are converted from Markdown and then cleaned by **DOMPurify** (tags and attributes outside an allowlist are removed), and the server also strips HTML tags and control characters. Post and project bodies are written only by signed-in authors, so they are treated as trusted and the editor's HTML is rendered as is.
