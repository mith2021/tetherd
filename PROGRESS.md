# PROGRESS

Log of the unattended correctness/repo-health routine. Newest run first.

## 2026-07-30 03:03 UTC

No `CLAUDE.md` present in this checkout (same as every prior run). `git log`
and last run's queue were read first: it said to re-check whether #28/#29
were merged (not re-diagnose), and flagged `npm audit`'s major-bump item and
`verify-rice.mjs`'s `undefined/`-dir cosmetic issue as standing items.

### Carried over from last run's queue
- **#28** and **#29** were both still open, unchanged. Did not re-diagnose
  either — test-merged each onto current master in a scratch branch (deleted
  after): both merge with zero conflicts (only unrelated `PROGRESS.md`
  history from #32/#33 in between; #28's `useTimer.ts` auto-merged cleanly).
  Re-ran each branch's own stop condition on the merged result: `tsc
  --noEmit` clean on both; #28's `verify-same-session-two-tabs.mjs` plus the
  full existing verify suite (9 other scripts) pass on #28's merged branch;
  #29's `npm audit` on the merged branch shows exactly the same 8 high
  findings (major `vite-plugin-pwa` bump) after its `@hono/node-server`
  patch, and its own full verify-suite re-run (9 scripts) also passes. Both
  still apply cleanly — re-flagged below, not re-opened or modified.

### Category A — tracking/session correctness

Re-audited `useTimer.ts`, `useLocalStorage.ts`, and every `setStats`/
`pomo-stats` call site in `App.tsx`. Two things specifically investigated
this run, both concluded not to be bugs:

1. **Hypothesis: presence-confirm modal bypassable via the session-type
   pills.** While `awaitingConfirm` is true (focus session hit 0, waiting on
   "Still there?"), `secondsLeft` is 0, so if `switchType()`'s
   `recordElapsedFocus()` could fire during that window it would credit a
   *full* session without ever confirming presence — a correctness bug in
   the opposite direction from #32 (over-crediting instead of dropping).
   Tested directly against the real dev server: seeded a 3s focus duration
   with `confirmPresenceOnComplete` on, let it finish, then scripted a click
   on the "Short Break" pill while the modal was up. The click timed out —
   Base UI's modal `Dialog` (`disablePointerDismissal`) makes the rest of
   the page `inert` while open, so the pill genuinely isn't clickable behind
   the modal. `pomo-stats` stayed empty. Not reproducible — no fix needed.
2. **`reset()` doesn't call `recordElapsedFocus()`.** Unlike `skip()`/
   `switchType()`, hitting Reset (button or `R` key) mid-focus-session
   discards elapsed time without recording it. Judged this as *not* a
   silent-drop bug: Reset's whole purpose is "restart this session from
   scratch," an explicit, deliberate discard the user chose (same category
   as `discardSession()` after a presence-check timeout, already documented
   in TODO.md as "Clarified, not a bug"), not an easily-mistaken UI path
   like the pill-click #32 fixed. Flagging under "Discovered, not fixed"
   below rather than auto-changing Reset's semantics, since redefining what
   Reset means is a product decision outside this routine's scope.

No other Category A issues found. Pause/resume/reload, finished-while-
backgrounded/closed, webcam presence auto-pause/resume, tab-away auto-pause,
and cross-tab races (via #28, still open) all remain correctly handled.

### Category B — repo health

1. **`npm audit`**: 8 high findings (major `vite-plugin-pwa` bump, unchanged,
   still requires the human-scoped major bump) + 2 moderate
   (`@hono/node-server` / `@modelcontextprotocol/sdk`, dev-only via
   `shadcn`, patched by still-open PR #29). Unchanged from last run.
2. **Every script in `.scripts/*.mjs` run against a fresh `npm run dev`**:
   all 9 pre-existing `verify-*.mjs` scripts pass, plus `gen-favicons.mjs`
   (output byte-identical to committed files), `screenshot.mjs`, `verify.mjs`
   (given an outDir arg), `record-demo.mjs`, and `video-to-gif.mjs` (fed a
   real `.webm` from `record-demo.mjs`'s output, produced a valid `.gif`).
   **Found and fixed**: `verify-rice.mjs` writes into a literal `undefined/`
   directory when run without its documented output-dir arg — carried over
   as low-severity/cosmetic across the last two runs' "Discovered, not
   fixed" sections. Fixed by defaulting to `.` (cwd), matching
   `screenshot.mjs`'s existing `process.argv[N] || default` convention.
   - **Verify**: no new verify script needed — the fix's subject *is* a
     verify script; re-running it without an arg now writes into the cwd
     (no `undefined/` dir created) and still reports `PASS: task list
     hidden`. `tsc --noEmit` clean, full existing verify suite re-run clean
     after.
   - **PR**: [#34](https://github.com/mith2021/tetherd/pull/34) —
     **auto-merged** (exactly 1 file, `.scripts/verify-rice.mjs`; Category B
     script fix; `tsc` clean; fix manually re-verified working; no CI
     configured to wait on).
3. **README.md skim against current code**: no drift. Feature list, keyboard
   shortcuts (Space/R/S), tab-away pause + presence confirmation, tech stack,
   deploy workflow all still accurate.
4. **TODO.md skim against current code**: no drift. "Menu control audit"
   backlog item still valid (`TimerMenu.tsx` still has 7 `Slider` usages).
   "Custom presets" still valid. "Declined" items (theme export/import, rice
   gallery, dedicated screenshot mode) confirmed still not built (grepped,
   no matches). Nothing to reconcile.

### Auto-merged this run
- [#34](https://github.com/mith2021/tetherd/pull/34) — `verify-rice.mjs`
  `undefined/`-dir fix. 1 file, Category B script fix, `tsc` clean, fix
  manually re-verified working, full existing verify suite re-run clean
  after.

### Awaiting your review
- [#28](https://github.com/mith2021/tetherd/pull/28) — same-session two-tab
  double-count fix (`navigator.locks`). Carried over, unchanged; re-confirmed
  this run it still merges cleanly and its verify script plus the full suite
  still pass on the merged result. Still flagged rather than auto-merged —
  new browser API + new resync code path, a design decision.
- [#29](https://github.com/mith2021/tetherd/pull/29) — `npm audit fix`
  lockfile patch. Carried over, unchanged; re-confirmed this run it still
  merges cleanly and still leaves the same 8 major-bump-only findings after.
  Dependency change; always left open regardless of safety, per merge policy.

### Remaining queue for next run
- Re-check whether #28 and #29 were merged; if either is still open, don't
  re-diagnose — just confirm it still applies cleanly and re-flag (same
  process used this and last run).
- `npm audit`'s 8 remaining findings (major bump to `vite-plugin-pwa`)
  remain a standing human-scoping item — re-flag if still open rather than
  re-investigating from scratch.
- No other Category A or B items outstanding from this run's audit.

### Discovered, not fixed
- **`reset()` discards elapsed focus time without recording it** (new this
  run, see Category A #2 above): judged as intentional "restart from
  scratch" semantics rather than a silent-drop bug, since it's an explicit,
  deliberate user action (unlike the #32 pill-click case). Flagging for a
  human call on whether Reset should ever credit partial time — not
  auto-changing product behavior unattended.
- **`sessionStartRef` resets on every resume, not just the original start**
  (carried over unaddressed, still low severity, unchanged): in
  `useTimer.ts`'s `start()`, `sessionStartRef.current = new Date()` runs on
  every call including resuming from a pause. Doesn't affect `durationSec`
  (always correct), so it's an analytics/heatmap accuracy nit, not a
  silently-dropped/double-counted violation. Still needs a design decision
  about what "session start" should mean across a multi-pause session.

### Status of every verify-*.mjs in the repo (this run, on master after #34)
All pass: `verify-autostart-chain.mjs`, `verify-layouts.mjs`,
`verify-multitab-race.mjs`, `verify-music.mjs`, `verify-pause.mjs`,
`verify-rice.mjs`, `verify-session-recording.mjs`,
`verify-strictmode-double-complete.mjs`, `verify-switchtype-drops-elapsed.mjs`.
(`verify-same-session-two-tabs.mjs` exists only on open PR #28's branch, not
yet on master — also passing there, see "carried over" above.)

## 2026-07-29 03:04 UTC

No `CLAUDE.md` present in this checkout (same as every prior run — gitignored,
lives only on the machine that authored it). Proceeded from `README.md` +
`TODO.md` + reading the actual code. `git log` and this file's previous entry
were read first; last run's queue said to re-check #28 and #29 (both still
open at run start) rather than re-diagnose, and to keep re-flagging the
standing `npm audit` major-bump item.

### Carried over from last run's queue
- **#28** (same-session two-tab double-count fix, `navigator.locks`) and
  **#29** (`npm audit fix` lockfile patch) were both still open, unchanged,
  based on the pre-#30/#31 master. Did not re-diagnose either — test-merged
  each onto current master in a scratch branch: both merge with zero
  conflicts (only unrelated `PROGRESS.md`/`README.md` history from #30/#31
  in between). Re-ran each branch's own stop condition against the merged
  result: `tsc --noEmit` clean on both; #28's
  `verify-same-session-two-tabs.mjs` plus the *full* existing verify suite
  (7 other scripts) all pass on #28's merged branch; #29's `npm audit`
  output on the merged branch still shows only the same 8 high findings
  (major `vite-plugin-pwa` bump) after its `@hono/node-server` patch is
  applied, matching what the PR claims. Both still apply cleanly — re-flagged
  below, not re-opened or modified.

### Category A — tracking/session correctness

**Queue found this run:**
1. **Elapsed focus time silently dropped when switching session type
   mid-run.** The Focus/Short Break/Long Break pill row (`theme
   .showSessionPills`, visible by default) calls `timer.switchType()` with no
   guard against doing so while a focus session is actively running.
   `skip()` already computes and records whatever focus time elapsed before
   advancing; `switchType()` did not — it just reset state and persisted a
   fresh session with **no stats write at all**. Clicking a different
   session pill mid-focus-session (an ordinary, easily-discoverable UI
   interaction — not an edge case) silently discarded however much focus
   time had already elapsed. Reproduced against the real dev server before
   touching any code: started a focus session, let ~3s of real elapsed time
   pass, clicked "Short Break", `pomo-stats` ended up with **0** sessions
   instead of 1 partial-duration one.
   - **Root cause**: isolated to `useTimer.ts`'s `switchType()`. Not grouped
     with anything else — this was the only Category A item found this run,
     and no shared mechanism with #28/#29 above (those are cross-tab races;
     this is a same-tab UI path with no elapsed-time accounting at all).
   - **Fix**: extracted the elapsed-time-crediting logic already used by
     `skip()` into a shared `recordElapsedFocus()` helper, called from both
     `skip()` and `switchType()`, so both ways of abandoning a running focus
     session early give the same partial-credit guarantee.
   - **Verify**: `.scripts/verify-switchtype-drops-elapsed.mjs` (new) —
     starts a focus session, waits ~3s of real elapsed time, clicks the
     "Short Break" pill, asserts `pomo-stats` ends up with exactly 1
     partial-duration session. Failed on master before the fix (0 sessions);
     passes after.
   - **PR**: [#32](https://github.com/mith2021/tetherd/pull/32) —
     **auto-merged** (exactly 1 source file, `src/hooks/useTimer.ts`, plus
     its own new `.scripts/verify-switchtype-drops-elapsed.mjs`; Category A
     correctness fix; `tsc` clean; verify script passing; full existing
     verify suite re-run clean after; no CI configured on this repo to wait
     on).

No other Category A issues found this run. Re-audited `useLocalStorage.ts`
(unaffected, still correct) and every other `setStats`/`pomo-stats` call
site in `App.tsx` and `useTimer.ts` — natural completion, skip, pause/
resume/reload, finished-while-backgrounded/closed, webcam presence
auto-pause/resume, tab-away auto-pause — all already correctly hardened by
prior work and unaffected by this run's fix.

### Category B — repo health

1. **`npm audit`**: 8 high-severity findings remain on master as of this
   run's start (`brace-expansion` via `vite-plugin-pwa`'s `workbox-build`
   chain), all still requiring `npm audit fix --force` (major bump to
   `vite-plugin-pwa`) — unchanged from last run, left alone, matching the
   standing human-scoping item. PR #29 (open, patches the separate moderate
   `@hono/node-server` finding) still applies cleanly and still leaves
   exactly these same 8 findings after — see "carried over" note above.
2. **Every script in `.scripts/*.mjs` run against a fresh `npm run dev`**:
   all ran clean — `verify-autostart-chain.mjs`, `verify-layouts.mjs`,
   `verify-multitab-race.mjs`, `verify-music.mjs`, `verify-pause.mjs`,
   `verify-rice.mjs`, `verify-session-recording.mjs`,
   `verify-strictmode-double-complete.mjs`,
   `verify-switchtype-drops-elapsed.mjs` (new), `verify.mjs` (given an
   output-dir arg, its documented usage), `screenshot.mjs` (given a URL then
   an output path, its documented usage — args are positional, not "output
   dir first"), `record-demo.mjs`, `gen-favicons.mjs` (output byte-identical
   to what's committed, confirmed via `git status` showing no diff), and
   `video-to-gif.mjs` (fed a real `.webm` from this run's `record-demo.mjs`
   output, produced a valid `.gif` via ffmpeg with no errors). No selector
   drift or launch-path issues found anywhere in the suite.
3. **README.md skim against current code**: no drift found. Feature list
   (backgrounds, glass UI, drag/resize on timer+tasks only, 5 timer fonts,
   ambient mixer, YouTube/Spotify embeds, PiP, keyboard shortcuts, tab-away
   pause/presence confirmation), tech stack versions (React 19.2, Tailwind
   4.3, Base UI 1.6, Vite 8.1 — spot-checked against `package.json`), deploy
   workflow (`.github/workflows/deploy.yml` exists) and `vite.config.ts`'s
   `base: '/tetherd/'` all still accurate.
4. **TODO.md skim against current code**: no drift found. "Menu control
   audit" backlog item still valid — `TimerMenu.tsx` still has 7 `Slider`
   usages. "Custom presets" still valid — no save-custom-preset code exists
   (grepped for it). "Declined" items (theme export/import, rice gallery,
   dedicated screenshot mode) confirmed still not built (grepped, no
   matches beyond an unrelated `export function` hit). Nothing to
   reconcile.

### Auto-merged this run
- [#32](https://github.com/mith2021/tetherd/pull/32) — elapsed focus time
  dropped on mid-run session-type switch. 1 source file, Category A, `tsc`
  clean, new verify script passing, full existing verify suite re-run clean
  after.

### Awaiting your review
- [#28](https://github.com/mith2021/tetherd/pull/28) — same-session
  two-tab double-count fix (`navigator.locks`). Carried over, unchanged;
  re-confirmed this run that it still merges cleanly onto current master and
  its own verify script plus the full suite still pass on the merged
  result. Still flagged rather than auto-merged — new browser API + new
  resync code path, a design decision rather than a mechanical fix.
- [#29](https://github.com/mith2021/tetherd/pull/29) — `npm audit fix`
  lockfile patch. Carried over, unchanged; re-confirmed this run that it
  still merges cleanly and still leaves the same 8 major-bump-only findings
  after. Dependency change; always left open regardless of safety, per merge
  policy.

### Remaining queue for next run
- Re-check whether #28 and #29 were merged; if either is still open, don't
  re-diagnose — just confirm it still applies cleanly and re-flag (same
  process used this run).
- `npm audit`'s 8 remaining findings (major bump to `vite-plugin-pwa`)
  remain a standing human-scoping item — re-flag if still open next run
  rather than re-investigating from scratch.
- No other Category A or B items outstanding from this run's audit.

### Discovered, not fixed
- **`sessionStartRef` resets on every resume, not just the original start**
  (carried over unaddressed, still low severity, unchanged from last run's
  writeup): in `useTimer.ts`'s `start()`, `sessionStartRef.current = new
  Date()` runs on every call including resuming from a pause. Does not
  affect `durationSec` (always correct), so it's an analytics/heatmap
  accuracy nit, not a "silently dropped/double-counted" violation. Still
  flagging rather than auto-fixing — needs a design decision about what
  "session start" should mean across a multi-pause session.
- **`.scripts/verify-rice.mjs` writes screenshots into a literal `undefined/`
  directory if run without its documented output-dir arg** (carried over,
  still unaddressed, still low severity/cosmetic — same as last run's
  writeup). Worth a small follow-up but out of scope for this pass.

### Verify script status (final, against master HEAD after #32 merged)
- `.scripts/verify-autostart-chain.mjs` — **PASS**
- `.scripts/verify-strictmode-double-complete.mjs` — **PASS**
- `.scripts/verify-session-recording.mjs` — **PASS**
- `.scripts/verify-multitab-race.mjs` — **PASS**
- `.scripts/verify-pause.mjs` — **PASS**
- `.scripts/verify-rice.mjs` — **PASS**
- `.scripts/verify-layouts.mjs` — **PASS**
- `.scripts/verify-music.mjs` — **PASS**
- `.scripts/verify.mjs` — **PASS** (given an output-dir arg, its documented
  usage)
- `.scripts/verify-switchtype-drops-elapsed.mjs` — **PASS** (new)
- `.scripts/screenshot.mjs`, `.scripts/record-demo.mjs` (non-assert utility
  scripts) — both run to completion without erroring
- `.scripts/gen-favicons.mjs` — ran clean, byte-identical output to what's
  committed
- `.scripts/video-to-gif.mjs` — ran clean end-to-end (real `.webm` in, valid
  `.gif` out via ffmpeg, no errors)
- `.scripts/verify-same-session-two-tabs.mjs` — **PASS on its own branch**
  (PR #28, not yet on master — this script doesn't exist on master until
  that PR merges)

## 2026-07-28 03:38 UTC

No `CLAUDE.md` present in this checkout (same as every prior run — gitignored,
lives only on the machine that authored it). Proceeded from `README.md` +
`TODO.md` + reading the actual code. `git log` and this file's previous entry
were read first; last run's queue was empty (only the standing `npm audit`
major-bump item was carried forward as a known non-actionable item).

### Category A — tracking/session correctness

**Queue found this run:** both items below were found fresh this run while
re-auditing `useTimer.ts`'s rAF/completion path end-to-end (not carried over
from a prior run's queue) — neither had been exercised by the existing verify
suite, which never ran a session through more than one completion in a single
mount, and never opened two tabs onto the *same* live session.

1. **Auto-started sessions freeze after the first one, silently dropping every
   session after it.** With `autoStartBreaks`/`autoStartFocus` on, a completed
   session auto-starts the next one inside a single synchronous `tick()` call.
   React 19 batches the `setRunning(false)` then `setRunning(true)` that
   happens in that call, so `running`'s *net* value looks unchanged to the
   effect that reschedules the animation-frame loop — it never re-fires, and
   the countdown silently freezes forever after the first auto-advance.
   Reproduced by seeding short focus/break durations with both auto-start
   settings on, starting once, and watching the document title (used as a
   countdown proxy) get stuck on the break's initial value forever instead of
   counting down.
   - **A second bug was hiding behind the freeze**: unfreezing the loop
     (first fix attempt) immediately exposed that `tick()` is memoized once
     (`useCallback` with an empty dep array), so its call to `handleComplete()`
     was permanently bound to the very first render's closure, whose
     `sessionType` never advances past its initial value. Once ticking
     resumed, every completion — including breaks — was evaluated as
     `sessionType === 'focus'`, logging each break as a second, spurious
     focus session (confirmed by an instrumented debug run showing 2x the
     expected session count, matching one phantom entry per break).
   - **Root cause**: both bugs live in the same `tick()`/`start()` mechanism,
     found and fixed together on one branch as a single item (not two
     separately-queued items — the second bug was undetectable until the
     first was fixed, so there was never a point where they could have been
     queued/fixed independently).
   - **Fix**: `start()` now directly (re)schedules the animation-frame loop
     instead of relying solely on the `running`-keyed effect; `tick()` calls
     completion through `handleCompleteRef` (a ref kept pointed at the latest
     render's `handleComplete`), the same pattern already used elsewhere in
     this file for `activeTaskTitleRef`.
   - **Verify**: `.scripts/verify-autostart-chain.mjs` (new) — drives a real
     2s-focus/1s-break auto-start chain against the dev server, asserts the
     countdown keeps cycling through Focus/Break (no freeze) and exactly one
     stats entry is recorded per real focus completion. Failed on master
     before the fix (frozen after ~3s, 1 session recorded in a 10s window
     instead of 3); passes after.
   - **PR**: [#27](https://github.com/mith2021/tetherd/pull/27) —
     **auto-merged** (exactly 1 source file, `src/hooks/useTimer.ts`, plus its
     own new `.scripts/verify-autostart-chain.mjs`; Category A correctness
     fix; `tsc` clean; verify script passing; no CI configured on this repo to
     wait on).

2. **Same session double-recorded when the app is open in two tabs at once.**
   If a second tab is opened while a focus session is already running (or a
   session finishes while two tabs both had it loaded), each tab runs its own
   independent countdown racing toward the SAME persisted `endTime` in
   `pomo-timer-state-v1`, with no coordination between them. Both tabs can
   detect completion around the same moment and each logs its own stats
   entry for what is really the same one session. Different mechanism from
   the multi-tab race fixed in #25 (that one was two *different* sessions
   racing on the `pomo-stats` write); this one is two tabs racing to claim
   completion of the *same* session. Reproduced with two real Playwright
   pages sharing one browser context/origin, both loading the same live
   `endTime` — confirmed 2 sessions survived instead of 1.
   - **Root cause**: isolated to `useTimer.ts` — no coordination existed
     between tabs racing the same `endTime`. Single item, not grouped with
     item 1 above (different mechanism — that one was about the loop
     stopping; this one is about two tabs both successfully completing the
     same session with no lock between them). Built on top of item 1's
     `handleCompleteRef`/`scheduleTick` (this fix's branch was created after
     #27 merged, from the updated master, so the diff here is isolated to
     just this fix).
   - **Fix**: `navigator.locks` (Web Locks API) gives real cross-tab mutual
     exclusion — a plain localStorage read-then-write isn't atomic across
     tabs, since two tabs can both read "unclaimed" before either writes a
     claim. Only the tab that wins the lock may record the completion; it
     immediately clears the shared `endTime` so any other tab still racing
     toward it loses the claim. A tab that loses resyncs its local state from
     whatever the winner persisted instead of staying stuck on the stale,
     already-completed session. Falls back to proceeding uncoordinated if
     `navigator.locks` isn't available (no regression vs. before this fix in
     that case).
   - **Verify**: `.scripts/verify-same-session-two-tabs.mjs` (new) — seeds one
     shared live session's `endTime` into two real tabs sharing
     localStorage/origin, asserts `pomo-stats` ends up with exactly 1 session.
     Failed on master before the fix (2 sessions); passes after.
   - **PR**: [#28](https://github.com/mith2021/tetherd/pull/28) — **left open**
     by this routine. Meets the mechanical auto-merge bar (1 source file plus
     its own verify script, Category A, `tsc` clean, verify passing), but
     introduces a new browser API (`navigator.locks`) and a new resync code
     path for the losing tab — a more significant design decision than a
     mechanical fix, so flagged for your review rather than auto-merged on
     that judgment call.

No other Category A issues found this run. Re-audited `useLocalStorage.ts`
(the cross-tab-safe functional-update path from #25 is still correct and
unaffected by anything above) and every other `setStats`/`pomo-stats` call
site in `App.tsx` and `useTimer.ts` (skip, pause/resume/reload,
finished-while-backgrounded/closed, webcam presence auto-pause/resume) — all
already correctly hardened by prior work and unaffected by this run's two
fixes.

### Category B — repo health

1. **`npm audit`**: `@hono/node-server` (moderate, GHSA-frvp-7c67-39w9, path
   traversal via encoded backslash on Windows), transitive via
   `shadcn -> @modelcontextprotocol/sdk` (dev-only CLI, not shipped). Fixed
   via plain `npm audit fix` (patch 1.19.15 -> 2.0.12), lockfile-only, no
   `package.json` change. 8 remaining findings (high, `brace-expansion` via
   `vite-plugin-pwa`'s `workbox-build` chain) all require
   `npm audit fix --force` (major bump to `vite-plugin-pwa`) — left alone,
   flagged for a human call, matching the standing item from every prior run.
   - Stop condition: `tsc --noEmit` clean + full existing verify suite
     re-run clean against the dev server with the updated lockfile (dependency-
     only change, no meaningful browser behavior to write a new verify script
     for, per the routine's own exception).
   - **PR**: [#29](https://github.com/mith2021/tetherd/pull/29) — **left
     open** (dependency change; excluded from auto-merge regardless of how
     safe the patch is, per merge policy).
2. **Every script in `.scripts/*.mjs` run against a fresh `npm run dev`**: all
   ran clean — `verify-autostart-chain.mjs` (new), `verify-layouts.mjs`,
   `verify-multitab-race.mjs`, `verify-music.mjs`, `verify-pause.mjs`,
   `verify-rice.mjs`, `verify-session-recording.mjs`,
   `verify-strictmode-double-complete.mjs`, `verify.mjs` (needs an output-dir
   arg — documented usage, not a bug), `screenshot.mjs`, `record-demo.mjs`,
   `gen-favicons.mjs` (output byte-identical to what's committed). Also ran
   `video-to-gif.mjs` **end-to-end for the first time in this routine's
   history** (prior runs only confirmed its no-input usage-message path) —
   fed it a real `.webm` from `record-demo.mjs`'s output, produced a valid
   `.gif` via ffmpeg with no errors. No selector drift or launch-path issues
   found anywhere in the suite.
3. **README.md skim against current code**: found and fixed one small factual
   drift — the feature list claimed drag/resize applies to "timer, tasks,
   stats", but `App.tsx` only registers `timer` and `tasks` with
   `useWidgetLayout`; Stats is a dialog, not a `DraggableWidget` (this exact
   distinction was already noted in TODO.md's 2026-07-24 "Done" section, just
   never corrected in the README itself). Everything else spot-checked
   (5 timer fonts, keyboard shortcuts, tab-away pause, deploy workflow/`vite
   base` match) still accurate.
   - Stop condition: reading the diff — doc-only change, nothing to
     type-check or verify with a browser script.
   - **PR**: [#30](https://github.com/mith2021/tetherd/pull/30) —
     **auto-merged** (1 file, doc-only Category B fix, no dependency change).
4. **TODO.md skim against current code**: no drift found. "Menu control
   audit" (TimerMenu.tsx still uses `Slider` for most settings) and "Custom
   presets" (no save-custom-preset code exists) are still genuinely
   unimplemented. "Declined" items (theme export/import, rice gallery,
   dedicated screenshot mode) confirmed still not built. Nothing to
   reconcile.

### Auto-merged this run
- [#27](https://github.com/mith2021/tetherd/pull/27) — auto-start chain
  freeze + break-double-logged-as-focus fix. 1 source file, Category A,
  `tsc` clean, new verify script passing (plus full existing verify suite
  re-run clean after).
- [#30](https://github.com/mith2021/tetherd/pull/30) — README widget-list
  factual fix. 1 file, doc-only Category B fix.

### Awaiting your review
- [#28](https://github.com/mith2021/tetherd/pull/28) — same-session
  two-tab double-count fix. Meets the mechanical auto-merge bar but
  introduces a new browser API (`navigator.locks`) and a new resync path —
  flagged as a judgment call rather than auto-merged.
- [#29](https://github.com/mith2021/tetherd/pull/29) — `npm audit fix`
  lockfile patch. Dependency change; always left open regardless of safety,
  per merge policy.

### Remaining queue for next run
- Re-check whether #28 and #29 were merged; if either is still open, don't
  re-diagnose — just confirm it still applies cleanly and re-flag.
- `npm audit`'s 8 remaining findings (major bump to `vite-plugin-pwa`) remain
  a standing human-scoping item — re-flag if still open next run rather than
  re-investigating from scratch.
- No other Category A or B items outstanding from this run's audit.

### Discovered, not fixed
- **`sessionStartRef` resets on every resume, not just the original start**
  (carried over from the 2026-07-26 run, still unaddressed, still low
  severity): in `useTimer.ts`'s `start()`, `sessionStartRef.current = new
  Date()` runs on every call including resuming from a pause. A session
  paused and resumed across an hour boundary (or midnight) records
  `startHour`/`date` from the last resume, not the session's true original
  start. Does **not** affect `durationSec` (always correct), so it's an
  analytics/heatmap accuracy nit, not a "silently dropped/double-counted"
  violation. Still flagging rather than auto-fixing — needs a design decision
  about what "session start" should mean across a multi-pause session.
- **`.scripts/verify-rice.mjs` writes screenshots into a literal `undefined/`
  directory if run without its documented output-dir arg** (`path:
  process.argv[2] + '/rice-1-appearance.png'`, `process.argv[2]` is
  `undefined` when omitted). Same pre-existing pattern already documented as
  "not a bug, documented usage" for `verify.mjs` in prior runs' PROGRESS
  entries — but unlike `verify.mjs`, this one doesn't fail loudly when
  misused, it silently creates junk output in the repo root. Low severity
  (cosmetic script robustness, not a correctness issue), cleaned up the
  stray directory each time it appeared this run rather than committing it.
  Worth a small follow-up (default to a tmp/scratch dir, or fail with a usage
  message like `video-to-gif.mjs` does) but out of scope for this pass.

### Verify script status (final, against master HEAD after #27/#30 merged)
- `.scripts/verify-autostart-chain.mjs` — **PASS** (new)
- `.scripts/verify-strictmode-double-complete.mjs` — **PASS**
- `.scripts/verify-session-recording.mjs` — **PASS**
- `.scripts/verify-multitab-race.mjs` — **PASS**
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
- `.scripts/video-to-gif.mjs` — exercised end-to-end this run for the first
  time (real `.webm` in, valid `.gif` out via ffmpeg, no errors)
- `.scripts/verify-same-session-two-tabs.mjs` — **PASS on its own branch**
  (PR #28, not yet on master — this script doesn't exist on master until that
  PR merges)

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
