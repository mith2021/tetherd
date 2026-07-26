# PROGRESS

Log of the unattended correctness/repo-health routine. Newest run first.

## 2026-07-26 03:03 UTC

No `CLAUDE.md` present in this checkout (same as last run — gitignored,
lives only on the machine that authored it). Proceeded from `README.md` +
`TODO.md` + reading the actual code. `git log` and this file's previous
entry were read first; no open PRs existed at run start (both #21/#22 from
last run were already merged).

### Category A — tracking/session correctness

**Queue found this run:** picked up the one item left in last run's
"Discovered, not fixed" section rather than re-auditing everything from
scratch — the multi-tab race on `pomo-stats` flagged (but deliberately not
fixed) last run.

1. **Cross-tab `pomo-stats` write race could silently drop a session.**
   `useLocalStorage`'s functional-update path applied the updater to
   React's in-memory `prev`, not to whatever's currently in `localStorage`.
   If tab A finishes a focus session and persists it, then tab B — holding
   a stale in-memory copy from its own mount, with no `storage`-event
   listener to refresh it — finishes its own session and calls
   `setStats(prev => ...)`, tab B's write silently overwrote tab A's,
   losing tab A's session entirely. Reproduced with two real Playwright
   pages sharing one browser context/origin (i.e. two real tabs) against
   the real dev server before touching any code — confirmed 1 session
   survived instead of 2.
   - **Root cause**: single-item, isolated to `useLocalStorage.ts`'s
     `setAndPersist`. Nothing else in the multi-tab-race family was found —
     this was the only item queued.
   - **Fix, first attempt**: read `localStorage` fresh as the update base
     instead of `prev`, inside the `setValue` updater. This closed the
     cross-tab race but the verify script then caught a **new regression it
     introduced**: React Strict Mode double-invokes a function passed to
     `setValue` for purity-checking. With the fresh-read-from-localStorage
     added *inside* that function, the second invocation saw the first
     invocation's own just-persisted write as its new base and re-applied
     the update — a single tab's own natural session completion started
     recording every session twice. Caught by running the existing
     `verify-session-recording.mjs`/`verify-strictmode-double-complete.mjs`
     scripts after the first-attempt fix, per the "run everything, not just
     the new script" rule — both still passed individually, but a
     debug instrumentation pass on the new script showed
     `pomo-stats` with 2 identical entries after a single completion.
   - **Fix, corrected**: moved the fresh `localStorage` read and the
     `persist()` call *out* of the `setValue` updater entirely — computed
     once per real call to `setAndPersist`, then `setValue(resolved)` with
     a plain value (not a function), so there's no updater function left
     for Strict Mode to double-invoke.
   - **Verify**: `.scripts/verify-multitab-race.mjs` (new) — two real
     browser tabs sharing localStorage; tab A completes a quick focus
     session, tab B (stale in-memory `pomo-stats` from its own mount) then
     completes its own; asserts 2 sessions survive, not 1. Failed on master
     before the fix (1 session), passed after both the fix and the
     regression correction.
   - **PR**: [#25](https://github.com/mith2021/tetherd/pull/25) —
     **auto-merged** (exactly 1 source file, `src/hooks/useLocalStorage.ts`,
     plus its own new `.scripts/verify-multitab-race.mjs`; Category A
     correctness fix; `tsc` clean; verify script passing).

No other Category A issues found this run. Re-audited `useTimer.ts`
end-to-end (natural completion, skip, pause/resume including the webcam
presence-detection auto-pause/resume path, reload while running/paused/
awaiting-confirm, finished-while-backgrounded/closed) and every
`setStats`/`pomo-stats` call site — all other paths already correctly
hardened by prior work and covered by existing verify scripts.

### Category B — repo health

1. **`npm audit`**: still 11 findings (3 moderate, 8 high), all requiring
   major/breaking bumps to `vite-plugin-pwa` or `shadcn` (dev-only CLI, not
   shipped) per `npm audit fix --dry-run` — no safe non-breaking patch
   available this run. Unchanged from last run; not re-flagging as new,
   just confirming still standing and still out of this routine's authority
   (major bumps need a human call).
2. **Every script in `.scripts/*.mjs` run against a fresh `npm run dev`**:
   all ran clean — `verify-layouts.mjs`, `verify-multitab-race.mjs` (new),
   `verify-music.mjs`, `verify-pause.mjs`, `verify-rice.mjs`,
   `verify-session-recording.mjs`, `verify-strictmode-double-complete.mjs`,
   `verify.mjs` (needs an output-dir arg — that's its documented usage, not
   a bug), `screenshot.mjs`, `record-demo.mjs`, `gen-favicons.mjs` (output
   byte-identical to what's committed), `video-to-gif.mjs` (correctly
   errors with a usage message given no input, not exercised further — no
   code path touched this run). No selector drift or launch-path issues
   found.
3. **README.md skim against current code**: no drift found. Feature list
   (backgrounds, glass UI, 5 timer fonts, ambient mixer, YouTube/Spotify
   embeds, PiP, keyboard shortcuts, tab-away pause/presence confirmation)
   all spot-checked against actual code and still accurate.
4. **TODO.md skim against current code**: no drift found. Backlog items
   ("Menu control audit" — `TimerMenu.tsx` still uses `Slider` for several
   settings; "Custom presets" — no save-custom-preset code exists) are
   still genuinely unimplemented. "Declined" items (theme export/import,
   rice gallery, dedicated screenshot mode) confirmed not built. Nothing to
   reconcile.

### Auto-merged this run
- [#25](https://github.com/mith2021/tetherd/pull/25) — cross-tab
  `pomo-stats` race fix. 1 source file, Category A, `tsc` clean, new verify
  script passing (plus full existing verify suite re-run clean after).

### Awaiting your review
- None. The only PR opened this run (#25) qualified for and received
  auto-merge.

### Remaining queue for next run
- None from this run's audit. Category A's queue (the multi-tab race
  carried over from last run) is now closed and verified against master
  directly, not just an open branch.
- `npm audit`'s 11 findings (major bumps to `vite-plugin-pwa` / `shadcn`)
  remain a standing human-scoping item — re-flag if still open next run
  rather than re-investigating from scratch.

### Discovered, not fixed
- **`sessionStartRef` resets on every resume, not just the original
  start.** In `useTimer.ts`'s `start()`, `sessionStartRef.current = new
  Date()` runs on every call, including resuming from a pause (manual,
  tab-away, or webcam-presence auto-pause/resume). A session paused and
  resumed across an hour boundary (or across midnight) records `startHour`/
  `date` from the last resume time, not the session's true original start.
  This does **not** affect the elapsed-time/duration recorded (`durationSec`
  is always `settings.focusMin * 60` for a natural completion, unaffected
  by this ref), so it's a minor analytics/heatmap accuracy nit, not a
  "silently dropped" violation of this routine's core mandate. Flagging for
  a scoped look, not auto-fixing — low severity, and a fix would need a
  design decision about what "session start" should mean across a
  multi-pause session (first start? most recent resume? something in
  between?).

### Verify script status (final, against master HEAD after #25 merged)
- `.scripts/verify-strictmode-double-complete.mjs` — **PASS**
- `.scripts/verify-session-recording.mjs` — **PASS**
- `.scripts/verify-multitab-race.mjs` — **PASS** (new)
- `.scripts/verify-pause.mjs` — **PASS**
- `.scripts/verify-rice.mjs` — **PASS**
- `.scripts/verify-layouts.mjs` — **PASS**
- `.scripts/verify-music.mjs` — **PASS**
- `.scripts/verify.mjs` — **PASS** (given an output-dir arg, its documented
  usage)
- `.scripts/screenshot.mjs`, `.scripts/record-demo.mjs` (non-assert utility
  scripts) — both run to completion without erroring
- `.scripts/gen-favicons.mjs` — ran clean, byte-identical output to what's
  committed
- `.scripts/video-to-gif.mjs` — not exercised (needs a real recorded
  `.webm` input, correctly errors with a usage message when given none; no
  code path touched this run)

## 2026-07-25 03:03 UTC

No `CLAUDE.md` was present in the checkout — it's intentionally gitignored
(commit `35df722`, "Remove internal docs... from public repo") and lives
only on the machine that made that commit, not in this cloned session. Not
treated as an error; proceeded from `README.md` + reading the actual code.

### Category A — tracking/session correctness

**Queue found this run:**
1. **Focus session finished while tab closed/backgrounded gets logged twice
   in dev.** `useTimer.ts`'s mount effect that catches
   `restoredFinishedElsewhere` (a session whose persisted `endTime` is
   already in the past) had no idempotency guard. React StrictMode
   (`main.tsx`) double-invokes mount effects in dev — setup → cleanup →
   setup again, same component instance — so `handleComplete()` fired
   twice and the session landed in `pomo-stats` twice. Reproduced with a
   real browser + real localStorage before touching any code.
   - **Root cause**: single-item, isolated to that one effect. Nothing else
     in `useTimer.ts`/`useLocalStorage.ts`/`App.tsx`'s `setStats` call
     sites shared it — every other `setStats` call happens inside an event
     handler (start/pause/skip/finishCompletion), not a mount effect, so
     none of them are exposed to the same double-invoke hazard.
   - **Fix**: added a `finishedElsewhereHandledRef` guard so the completion
     can only fire once regardless of how many times the effect re-runs.
   - **Verify**: `.scripts/verify-strictmode-double-complete.mjs` (new) —
     seeds a finished-in-the-past persisted timer state, reloads, asserts
     exactly 1 session in `pomo-stats`. Failed on master before the fix (2
     sessions), passes after.
   - Also added `.scripts/verify-session-recording.mjs` (new) — no bug
     found here, but there was no existing coverage at the
     `pomo-stats`-persistence level for two other scenarios the routine is
     specifically watching: (a) paused → reload → resume → natural
     completion, (b) skip-early partial-duration credit. Both pass; kept as
     permanent regression coverage per the "must never happen again,
     undetected" mandate.
   - **PR**: [#20](https://github.com/mith2021/tetherd/pull/20) — **auto-merged**
     (exactly 1 source file, `src/hooks/useTimer.ts`, plus its own 2 new
     `.scripts/verify-*.mjs` files; Category A correctness fix; `tsc` clean;
     verify script passing).

No other Category A issues found. Audited `useTimer.ts`, `useLocalStorage.ts`
(including the IndexedDB mirror fallback and write-then-read-back retry
logic), and every `setStats`/`pomo-stats` read/write site in `App.tsx` and
`backupData.ts`. All other completion paths (natural completion, skip,
pause/resume, reload) were already correctly hardened by prior work
(commit `5dc1cbb` and friends) and are now covered by the two verify
scripts above.

### Category B — repo health

1. **`npm audit`**: `fast-uri@3.0.0-3.1.3` (high, GHSA-v2hh-gcrm-f6hx),
   transitive via `shadcn -> @modelcontextprotocol/sdk -> ajv`. Fixed via
   plain `npm audit fix` (patch to 3.1.4, no `package.json` change). 11
   remaining findings all require major bumps of `vite-plugin-pwa` or
   `shadcn` (dev-only CLI, not shipped) — left alone, flagged for a human
   call.
   - Stop condition: `tsc --noEmit` clean + diff read (lockfile-only,
     no meaningful browser behavior to verify per the routine's own
     exception for dependency-only changes).
   - **PR**: [#22](https://github.com/mith2021/tetherd/pull/22) — left open
     by this routine (dependency change; merge policy excludes these from
     auto-merge regardless of how safe the patch is). **Merged by you** later
     the same run.

2. **Every `.scripts/*.mjs` run against a fresh `npm run dev`**: every
   Playwright-driven script (`screenshot.mjs`, `verify.mjs`,
   `verify-layouts.mjs`, `verify-music.mjs`, `verify-pause.mjs`,
   `verify-rice.mjs`, `record-demo.mjs`) failed immediately in this
   session's container — `chromium.launch()` with no `executablePath`
   can't find a matching browser build in this sandbox. Added
   `.scripts/lib/launch.mjs` (only activates the container's known
   Chromium path when present, so a normal local `playwright install`
   setup is untouched) and wired every script through it.
   - Also found and fixed real selector drift, independent of the launch
     issue: `verify-rice.mjs` and `record-demo.mjs` still targeted the old
     single tabbed Settings dialog ("Appearance" tab, one gear icon).
     Settings are now three separate header popovers (Timer / Background /
     App) per an earlier UI restructuring. `record-demo.mjs` additionally
     tried to open settings *after* starting the timer, but the header
     (and its settings popovers) hides itself while the timer runs, so the
     settings button was unreachable — reordered to configure everything
     before starting the recorded session.
   - Root cause is shared (both are "why can't this script drive the app
     right now") but the two failure modes are unrelated, so this was
     grouped into one PR rather than one bug — noted explicitly.
   - **PR**: [#21](https://github.com/mith2021/tetherd/pull/21) — left open
     by this routine (touches 7 files under `.scripts/`, well past the
     1-file auto-merge cap; no `src/` files touched). **Merged by you**
     later the same run.

3. **README.md / TODO.md skim against current code**: no factual drift
   found. Header menu structure, script names, build/dev commands, and
   `vite.config.ts`'s `base` all still match what's described. `TODO.md`'s
   open backlog items ("Menu control audit", "Custom presets") were
   spot-checked against the actual code and are still genuinely
   unimplemented — not stale, left as-is. No declined items were built
   unprompted.

### Auto-merged this run
- [#20](https://github.com/mith2021/tetherd/pull/20) — StrictMode
  double-session-record fix. 1 source file, Category A, `tsc` clean, new
  verify script passing.
- This `PROGRESS.md` file itself (single doc file, no app behavior to
  verify).

### Awaiting your review
- Both PRs left open by this routine (#21, #22) were **reviewed and merged
  by you within the same run** — nothing left awaiting review as of this
  entry. See "Update" below.

### Update (same run, after #21 and #22 merged)
Re-synced to master after both open PRs merged. Re-ran the full verify
suite and `tsc` against the merged result:
- `npx tsc --noEmit -p tsconfig.app.json` — clean
- Every `.scripts/verify-*.mjs` and `verify.mjs` — **all pass directly on
  master now** (no more "passes on the open branch" caveat)
- `npm audit` — 11 findings remain, all major-version-only (`vite-plugin-pwa`,
  `shadcn`), matching what was flagged when #22 was opened; nothing new

### Remaining queue for next run
- None from this run's audit. Category A and Category B are both clean —
  every found item shipped and verified against master directly, not just
  an open branch.
- `npm audit`'s 11 remaining findings (major bumps to `vite-plugin-pwa` /
  `shadcn`) are a standing human-scoping item, not something to
  auto-attempt — re-flag if they're still open next run rather than
  re-investigating from scratch.

### Discovered, not fixed
- **Multi-tab race on `pomo-stats`**: `useLocalStorage` never listens for
  cross-tab `storage` events. If two tabs of the app are open
  simultaneously and both have a session finish around the same time,
  their `setStats` writes can race (last write wins, based on whichever
  tab's in-memory `prev` was stale), which could silently drop a session's
  worth of stats. Did not reproduce or fix this run — it's a real gap in
  the "never silently dropped" guarantee, but multi-tab usage wasn't
  observed as an actual reported issue, and a real fix (a `storage` event
  listener + merge strategy) is a larger design decision than an
  unattended pass should make alone. Flagging for a scoped look, not
  auto-fixing.

### Verify script status (final, against master HEAD after #20/#21/#22 all merged)
- `.scripts/verify-strictmode-double-complete.mjs` — **PASS**
- `.scripts/verify-session-recording.mjs` — **PASS**
- `.scripts/verify-pause.mjs` — **PASS**
- `.scripts/verify-rice.mjs` — **PASS**
- `.scripts/verify-layouts.mjs` — **PASS**
- `.scripts/verify-music.mjs` — **PASS**
- `.scripts/verify.mjs` — **PASS**
- `.scripts/screenshot.mjs`, `.scripts/record-demo.mjs` (non-assert
  utility scripts) — both run to completion without erroring
- `.scripts/gen-favicons.mjs` — ran clean, byte-identical output to what's
  committed
- `.scripts/video-to-gif.mjs` — not exercised (needs a real recorded
  `.webm` input, correctly errors with a usage message when given none;
  no code path touched this run)
