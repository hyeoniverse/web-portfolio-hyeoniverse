---
id: two-sources-need-a-rule-for-which-one-wins
section: Infrastructure & Automation
difficulty: 2
---

# Decide up front which source wins

> When the same content can be edited both as a file and in the database, which one survives

## Context

The About page on this site is long and image-heavy. At first it could only be edited through the admin screen: open the page, find the item, click a field, type. That is awkward for long prose, and it leaves no record of what changed when.

Prose is better written in an editor and kept under version control. So it became possible to author the same content as markdown. Files live under `content/about/`, one folder per panel, and a single command applies them to the database. Posts and works already worked this way.

The moment that shipped, **the same content had two places it could be changed**: the file and the admin screen. When they disagree, something has to decide which one survives.

## Considerations

The first option is to let a person choose. Each panel carries a setting — "this panel comes from files" or "this panel is edited in the app." The rule is simple and predictable.

But it demands a judgement every time, and a wrong choice makes freshly written content invisible. Set a panel to files, then fix a typo in the app, and the fix is discarded. Set it to the app, and a long piece written in a file is ignored. A misconfigured source is hard to tell apart from badly written content.

The second option is to always prefer the file. The file is the single source and in-app editing is treated as temporary. That is the simplest rule, but it makes in-app editing effectively unusable: on a deployed server the repository files cannot be changed, so there is no way to make an urgent correction.

The third option is to keep whichever was touched more recently — compare the file's modification time against that panel's last in-app edit, and apply the file only when it is newer.

## Decision

The third. The deciding factor was that post and work sync already used the same rule, so it introduced no new concept.

```ts
/* Nobody picks the source. Both the app and markdown write to the same place; the sync keeps
 * **whichever was touched more recently** — a file is applied only when its mtime is newer
 * than that panel's last in-app edit. */
```

The read order was settled at the same time. If the database holds a value, use it; if it is empty, fall back to the values baked from markdown at build time; with neither, render empty. An empty panel is the accurate representation of "nothing has been written yet."

Not every panel moved to markdown. The ER diagram and the flow diagrams are node positions and connections; expressing them as markdown would be worse to work with than the visual editor that already exists. Those three stayed UI-only.

The sync command shows what will change before writing anything, and refuses to write if there is even one warning. That keeps a malformed file from being applied silently and leaving the page blank.

## Key Insight

The moment there are two sources, which one wins has to be settled by **a rule, not by a person's judgement**.

Asking someone to choose turns the choice itself into a new place to be wrong. Comparing timestamps demands no judgement. "The one you just edited survives" is the behaviour a reader expects without being told, which is exactly why it is hard to get wrong.
