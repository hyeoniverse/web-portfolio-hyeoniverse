---
id: behavior-and-appearance-are-separate-concerns
section: Interface & Components
difficulty: 2
---

# Separate behavior from appearance in pressable things

> What to do with the buttons that do not fit the shared button component

## Context

The site has a shared button component. Pick a variant, a size and a tone and the appearance is settled; the click sound, the disabled handling and the press reaction come along with it.

Very few buttons actually used it. The other 456 were plain browser button elements with their own styles attached.

Looking at them one by one, the reason was almost always the appearance. A hit area laid over the sidebar is absolutely positioned, so its size and place must be set from outside. The page number beside a code block has to inherit the parent's font size. A tab in the filter row must match that row's height, and a sub-category chip draws an underline that grows when selected.

None of that fits an appearance the shared component decides. So they could not use it.

## Considerations

The first option is to widen the shared component: an option to accept an external height, a variant that inherits the font, another way of showing selection. That would let the current holdouts in.

But the component grows heavy. As options multiply it gets harder to tell which combinations are valid, and options that exist for exceptions obscure the ordinary usage. Exceptions keep appearing, so this direction has no end.

The second option is to leave it alone. Only things that look like buttons use the shared component; everything else stays bespoke. The component stays light.

Except that what those 456 places were missing was not appearance. There was no click sound; 63 of them never set the button element's type, so inside a form every click submitted it; disabled handling differed from place to place. **They were things whose appearance may differ but whose behavior must not.**

## Decision

The responsibility was split in two. A base that carries only behavior, with the existing button component layered on top to add appearance.

The base takes no visual props at all. It sets the button element's type, plays the click and hover sounds, handles the disabled state, and gives the slight shrink on press. Spacing, color, font and radius are left to the caller's own styles.

```
Pressable   type="button" · click/hover sound · disabled · tap scale
   └ Button  variant / size / tone / shape on top
```

Things that look like buttons use the existing component; things whose appearance must follow their own context use the base. All 456 moved across, and no plain browser button element remains.

Two exceptions became options. Controls that repeat while held turn the click sound off, and absolutely positioned elements turn the shrink off, because a size change would shift their position.

The base does not reset the browser's default button styles. The global stylesheet already does that for every button element, and repeating it here overrides what each component set, by class specificity. That is exactly what happened in the first version: an inherited line height won over a component's own value and made one button taller.

## Key Insight

Even within one kind of element, **what must be shared and what must not can be different axes.**

Here behavior came first and appearance second. Widening the component to unify appearance breaks it; leaving things alone lets behavior drift per site. Identifying which axis to share yields the consistency that matters without growing the component.

Several UI libraries use the same structure — one behavior-only base carrying several appearances, so buttons, icon buttons, tabs and menu items all share it.
