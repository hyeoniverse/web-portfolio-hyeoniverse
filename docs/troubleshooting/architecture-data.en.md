# Trouble Shooting: Architecture · Data

[← Index](../troubleshooting.en.md)

<details>
<summary><strong>11. React reconciliation: changing a component's type in place remounts the subtree</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/home-dark.png" width="100%" alt="Home — Loading Screen" />
</p>

**Problem**

The loading screen reappeared when switching language for the first time on a page. Second switch onwards worked normally

**Cause**

- `RecaptchaProvider` changes `shouldLoad` from `false` to `true` on the first click event
- The render tree changes from `<Fragment>{children}</Fragment>` to `<GoogleReCaptchaProvider>{children}</GoogleReCaptchaProvider>`
- React unmounts and remounts the entire subtree when the component type changes at the same position
- `useLoadingScreen()`'s `useState(true)` initial value causes the loading screen to reappear

**Solution**

Track initial loading completion with a module-level flag to skip the loading screen on remount

```tsx
// Module level: persists across component remounts
let hasCompletedInitialLoad = false;

export function useLoadingScreen() {
  // If session already completed loading on remount, start with false
  const [isLoading, setIsLoading] = useState(() => !hasCompletedInitialLoad);
  const hasCompletedRef = useRef(hasCompletedInitialLoad);

  const completeLoading = () => {
    hasCompletedRef.current = true;
    hasCompletedInitialLoad = true; // Sync module flag
    setIsLoading(false);
  };
}
```

**Insight**

Conditionally rendering a third-party Provider (`Fragment` <-> `Provider`) causes React to remount the subtree. State relying on `useState` initial values must be supplemented with module-level variables to be remount-safe


</details>

<details>
<summary><strong>12. Baseline initialization: a mismatched initial value always reads as changed</strong></summary>

**Problem**

Opening the editor without making any changes still showed 'Autosaved' after 30 seconds, and the next visit triggered a 'Load autosaved version?' prompt

**Cause**

The `lastAutoSaveJson` ref in `useEditorAutoSave` was initialized with an empty string (`""`). When the 30-second debounce fires, `JSON.stringify` of the current form is compared against `""` — always different, so **a revision was created even with zero changes**

```
lastAutoSaveJson.current = ""       // initial value
JSON.stringify(form)     = "{...}"  // current form
"" !== "{...}"           → detected as changed → revision saved ✗
```

**Solution**

Changed the initial value to `JSON.stringify(formRef.current)` so the first comparison matches the actual initial form state and skips saving

**Insight**

When a comparison ref is initialized with a value of a different type/shape than the actual data, **the first comparison always evaluates as 'changed'**. Initial values must reflect the real initial state


</details>

<details>
<summary><strong>13. Autosave design: knowing when not to save</strong></summary>

**Problem**

The initial auto-save used `localStorage` directly, but multiple issues compounded:
1. **No cross-tab/device sharing** — localStorage is browser-local only
2. **Unnecessary saves on refresh** — "Auto-saved" appeared even without any changes
3. **Re-prompting after dismissing identical content** — same revision content kept triggering restore prompts

**Cause**

1. Inherent limitation of localStorage (browser-local storage)
2. `lastAutoSaveJson` ref initialized to `""` (empty string), so `JSON.stringify(form)` always differed
3. Dismissed revision snapshots weren't tracked, so identical content recreated in DB triggered re-prompts

**Solution**

**Improved in 3 stages:**
1. Completely removed localStorage, made **DB `revisions` table the sole storage** — enables cross-tab/device sharing
2. Set `lastAutoSaveJson` initial value to `JSON.stringify(formRef.current)` so **unchanged state skips saving**
3. Track dismissed revision snapshots in a `Set`, so **identical content doesn't re-prompt**

Additionally, page leave saves use `navigator.sendBeacon` (browser close) and `fetch({ keepalive: true })` (SPA routing) to **minimize the chance of losing the final state** (sendBeacon and keepalive are best-effort, not a guarantee)

**Insight**

Auto-save isn't just "save periodically" — the key challenge is **knowing when NOT to save**. Proper initial value comparison, duplicate detection, and dismissed tracking are all necessary to prevent unnecessary revision accumulation and UX confusion


</details>

<details>
<summary><strong>14. SSR inclusion: an overlay covering first paint must ship in the server HTML</strong></summary>

**Problem**

Page content briefly appears before the loading screen (black backdrop) shows up

**Cause**

`LoadingScreen` was loaded inside `ClientOverlays` using `dynamic(() => import(...), { ssr: false })`, excluding it from the server HTML. The browser displayed page content immediately, and `LoadingScreen` only mounted after JS bundle load + React hydration

**Solution**

Changed `LoadingScreen` to a regular `import` so it's included in server HTML. Since `useLoadingScreen()` initializes with `isLoading: true`, the black backdrop renders at `opacity: 1` in the SSR output. Other overlays (Modal, CursorTrail, etc.) remain `ssr: false` as they don't need server rendering

**Insight**: An overlay that must cover the first paint has to ship in the server HTML. Anything behind `ssr: false` appears only after hydration.


</details>

<details>
<summary><strong>15. Shared build output: dev and build sharing .next breaks live chunks</strong></summary>

**Problem**: Running `npm run build` to sanity-check a build mid-development broke the open dev site with a `ChunkLoadError`.

**Cause**: `next dev` and `next build` share the same `.next` directory — the build overwrites the dev output, so the chunk hashes the browser was holding disappear.

**Solution**: Don't run a build while the dev server is up (or separate them with a distinct `distDir`).

**Insight**: When two processes write to the same output directory, "verifying the build" becomes "destroying the dev environment" — to check whether a build passes, either stop dev or split the output path.


</details>

<details>
<summary><strong>16. Soft delete and recoverability: restore requires non-destructive deletion</strong></summary>

**Problem**: Building a feature to bring back a deleted (tombstoned) comment, flipping `is_deleted` back restored an empty-content comment.

**Cause**: Comment delete overwrote `content`·`password_hash`·`commenter_hash` with empty strings on tombstone (for privacy). The original text to restore simply wasn't in the DB.

**Solution**: Preserve the content on delete, but hide it in the public API.

1. Tombstone sets only `is_deleted`/`deleted_by` and keeps `content`
2. The public GET masks `content`·`commenter_hash` to empty for `is_deleted` rows (the UI draws a placeholder anyway); the admin GET keeps the original for the restore preview
3. The restore endpoint matches only `is_deleted=true` rows — a hard-deleted ("permanently deleted") row is gone, so it naturally 404s

**Insight**: "Restore" depends entirely on "what did delete erase" — for something to be restorable, delete must not destroy the data, and exposure must instead be masked at the API-response layer so privacy and restorability coexist.


</details>

<details>
<summary><strong>17. Optimistic restore and clock comparison: untrusted timestamps cause rollbacks</strong></summary>

**Problem**: Moving a block by DnD or editing it in an existing post rolled the whole content back to an old version after auto-save.

**Cause**: On load, the server (cross-device) auto-restore restored a "non-dismissed revision older than the saved copy." Past saves of an existing post didn't bump `posts.updated_at`, so the staleness check never fired.

**Solution**: Disabled server auto-restore → use only localStorage (same-device) restore; `posts.content` is the truth. Re-enabling is possible after saving each post once (dismisses the old revision + bumps `updated_at`) or behind a `savedAt>updated_at` guard.

**Insight**: Optimistic restore is only safe when there's a trustworthy timestamp comparison asserting "the saved copy is newest."


</details>

<details>
<summary><strong>18. Schema types and sentinels: a not-yet-existing entity cannot be a uuid</strong></summary>

**Problem**: In a new post (not yet saved), every auto-save request returned 500.

**Cause**: `revisions.entity_id` was uuid, but a pre-save new post has no `posts.id`, so it sends a draft sentinel string (`"draft-new-post"`) as the `entity_id` → the uuid cast fails.

**Solution**: Changed `revisions.entity_id` to text (migration `2026_08_05`). `setup.sql` updated too.

**Insight**: A temporary reference to an entity that doesn't exist yet can't fit in a uuid — to allow a sentinel, use text.


</details>

<details>
<summary><strong>19. Server cookies vs client navigation: full reload after auth state changes</strong></summary>

**Problem**: After a successful email login, entering admin pages required a refresh, and the navigation's logged-in state (email, notifications, logout) never appeared.

**Cause**: Login happens in a server route, so only the session cookie is set via Set-Cookie in the response. The browser Supabase client never receives a SIGNED_IN event. Navigating with `router.push` from there, the server layout's `getUser()` does not see the new cookie, and the Navigation hook, mounted since the login page, checks the cookie only once on mount and never again.

**Solution**: Changed the post-login navigation to a full reload with `window.location.assign`, the same pattern as the GitHub OAuth server redirect. The full reload remounts Navigation with the cookie present, clearing both symptoms.

**Insight**: A cookie set by the server does not propagate through client-side navigation. Right after changing auth state, a full navigation is the safe move.


</details>

<details>
<summary><strong>20. Measuring external-service reliability: status codes, not console errors</strong></summary>

**Problem**: The iframe previewing attached Office documents frequently rendered blank, and Chrome showed a "gview download failed" notification.

**Cause**: `docs.google.com/gview?embedded=true` returned an empty 204 response to iframe requests (Sec-Fetch-Dest: iframe) about 5 times out of 12. The iframe goes blank, and Chrome treats that navigation as a failed file download. Not a bug in our code; it is the service's behavior.

**Solution**: Switched to the MS viewer (`view.officeapps.live.com/op/embed.aspx`), which returned 200 on 8 out of 8 under the same conditions. Old gview URLs frozen into saved HTML are rewritten at render time by `migrateOfficeViewerUrls`. The MS viewer's console errors (`appChrome is not defined`) are unrelated to the rendered output — an earlier switch to gview based on those very errors is how the 204s were met.

**Insight**: Judge an external viewer's reliability by its status code distribution, not its console errors. Measured with repeated curl calls carrying the `Sec-Fetch-Dest: iframe` header.


</details>

<details>
<summary><strong>21. Two representations in one column: interpretation must be shared by every consumer</strong></summary>

**Problem**: The year slot on work cards displayed raw JSON like `{"start":{"year":2024,...}}`.

**Cause**: The editor saves period input as a JSON string in the `year` column, and the list screens printed the value verbatim. The logic assembling a period into a readable string existed only in the editor preview.

**Solution**: Extracted `parseStoredPeriod` and `formatWorkYear` utilities: if the stored value is a JSON period it formats a language-appropriate period string, otherwise it returns the original text. Every component that renders the year shares these utilities.

**Insight**: When one column holds two representations (plain text and JSON), the interpretation logic belongs in one shared utility. Keeping it only in the editor lets public screens leak the raw form.


</details>
