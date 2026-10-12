---
step: 08
metric_label: Languages visitors can pick
---

# Design System, Translation & Operations Log

Moved the design system onto web platform features: CSS split into seven **cascade layers**, themes on `light-dark()` and View Transitions, modals and menus in the top layer via `<dialog>` and popover, layout rules flipped to small-screen-first, and `!important` removed. Decisions are recorded with reasons — **70** entries.

Visitors can switch the whole site into one of **33 languages** from the 🌐 button in the menu, and auto-translations are rebuilt when the source changes. Successes and failures of AI, mail and GitHub calls go to a service log, and visits and views were merged into one `page_views` log, so visitors, visit flow and time on page are counted on one basis.
