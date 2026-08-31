---
layer: XSS
icon: shield
scope: All user input rendering
---

# XSS Prevention

React JSX **auto-escapes** all user input. No `dangerouslySetInnerHTML` is used. Server-side **HTML tag stripping** and **control character removal** provide additional defense.
