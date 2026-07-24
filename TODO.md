# TODO

## Auto-proposed and built (needs your review)

### 2026-07-24: Subject/project tagging on tasks
- **Why**: Quotes (previous run's top-priority item) is already built and shipped
  (see 2026-07-23 entry below). Next gap-list item, picked as best-scoped for a
  single unattended run.
- **Freshness check this run**: attempted a fresh fetch of `https://studyfoc.us`
  and `https://studyfoc.us/pomodoro` again — both rejected at the proxy layer
  with a 403 on the CONNECT tunnel itself (`curl -sS .../__agentproxy/status`
  confirms this is an org egress policy denial, not a retryable/bot-protection
  403, and the proxy README explicitly says not to retry or route around policy
  denials). Also tried the dev.to writeup used as corroboration last run — also
  403'd (bot protection this time, a different failure mode than the proxy
  denial above). Fell back to a fresh web search: results corroborate 15+
  ambient sounds, "tag sessions by subject, track projects", a to-do list, and
  streak tracking as current studyfoc.us features — no new items beyond the
  2026-07-22 gap list surfaced. Proceeding on the existing gap list as source of
  truth again this run; live verification remains blocked at the infra level
  across two runs now, worth a human checking whether studyfoc.us should be
  allow-listed for this session's egress policy if fresher verification matters
  going forward.
- **Scope**: confirmed no existing tag/project/subject field on `Task` before
  starting (grepped `types.ts`/`TaskList.tsx` — none). Adding:
  - `project?: string` on `Task` (optional, free-text, undefined = no tag —
    fully backward compatible with existing `pomo-tasks` data, no migration).
  - A small optional "Subject" input next to the existing task-title input in
    `TaskList.tsx`, used only at task-creation time.
  - Each task row shows its subject as a small pill/badge (deterministic muted
    color derived from a hash of the tag text, so same tag = same color across
    tasks without a color picker or new config surface) when a tag is set.
    Clicking the badge lets you edit or clear it inline; tasks with no tag get
    a small "+ tag" affordation on hover instead of a fixed empty slot.
  - `showTaskTags: boolean` on `ThemeSettings` (default `true`), added to
    AppMenu's existing "Show elements" toggle list, following the
    `showTasks`/`showQuotes` pattern since this adds visible UI.
- **Judgment calls to flag**: (1) tag color is a deterministic hash-to-hue, not
  a user-chosen color — studyfoc.us's actual tag-color behavior couldn't be
  observed since the site is unreachable this run; (2) tagging stays scoped to
  the task list only — it does NOT flow into `SessionRecord`/Review Sessions
  filtering (no `taskProject` field added there), since the gap-list item as
  written is about tagging tasks, not about session-log grouping by subject;
  that would be a reasonable follow-up but is out of scope for this pass.
- **Out of scope for this pass**: multiple tags per task, a dedicated
  tag-management view, filtering the task list by tag, per-tag stats/reporting.

### 2026-07-23: Motivational quotes during focus sessions
- **Why**: You explicitly flagged that an earlier studyfoc.us research pass missed
  this feature and asked for it to be prioritized first on the next gap-list run.
- **Blocker hit this run**: this session's egress policy rejected direct connections
  to `studyfoc.us` (`connect_rejected`, "policy denial" per the proxy status
  endpoint), and third-party pages describing it (Chrome Web Store listing,
  webcatalog.io, softwareontheweb.com, a dev.to writeup) all returned real 403s
  (bot protection), not proxy blocks — so I could not re-verify the gap list
  live against studyfoc.us this run. A generic web search corroborated ambient
  sounds / stopwatch / task tracking / leaderboard / streaks as existing
  studyfoc.us features but did not itself surface the quotes feature — that part
  rests on your explicit confirmation, not fresh verification. Proceeding on the
  2026-07-22 gap list as the source of truth for this run only; next run should
  retry the live fetch.
- **Scope**: confirmed `showQuotes`/quote content did not already exist anywhere
  in `src/` before starting (grepped for "quote"/"Quote" — no hits). Adding:
  - `src/quotes.ts` — a static list of short motivational/focus quotes (public-
    domain-adjacent, widely-circulated attributed quotes — not scraped from
    studyfoc.us, since it wasn't reachable this run).
  - `showQuotes: boolean` on `ThemeSettings` (default `true`), toggle added to
    AppMenu's existing "Show elements" switch list, same pattern as
    `showTasks`/`showSessionPills`/`showStatsChip`/`showMediaButtons`.
  - A quote line rendered in the Timer widget, visible only during `focus`
    sessions (not breaks) when `showQuotes` is on. A new random quote is picked
    each time a *new* focus session begins (transition into `sessionType ===
    'focus'`), and stays fixed for the duration of that session (including
    across pause/resume) rather than rotating mid-session — a judgment call;
    studyfoc.us's actual rotation behavior couldn't be observed this run since
    the site wasn't reachable, so this is my best guess at reasonable behavior,
    not a verified port.
  - **Judgment call to flag**: placement is directly below the timer ring, above
    the Start/Pause/Reset button row — this is a guess at reasonable layout, not
    a verified match to studyfoc.us's actual placement/styling.
- **Out of scope for this pass**: quote source/library customization, per-quote
  attribution styling beyond a plain em-dash, "favorite quote" or skip-to-next
  controls — none of these were in the gap list's description of the feature.

## Backlog

Each item below has concrete scope + acceptance criteria so an unattended session
(cloud routine) can act on it without guessing. Skip anything not this specific.

- **Backfill task attribution gap**: sessions logged before the Review
  Sessions filtering change (2026-07-22) have no `taskTitle` on
  SessionRecord, so sorting/filtering by task only works going forward.
  Needs human decision: leave as a known limit, or find a way to backfill
  (likely not possible — the data was never captured).
- **Menu control audit**: too many settings use sliders where they shouldn't.
  Audit TimerMenu.tsx (and other menus) against best practice: binary
  on/off → toggle switch; small fixed enum (3-5 options) → segmented
  control/radio; unbounded/large-range numeric → slider; precise numeric
  (exact count/minutes) → number input/stepper. Replace mismatched controls.
- **Custom presets**: extend the existing timer-preset system (25/5/15 etc,
  and `useWidgetLayout.ts`'s saved layouts) so the user can save their own
  custom preset, not just pick from the built-in set.

## Needs human scoping before automated work (do not touch unattended)

- **Manual real-device webcam test**: needs a physical camera — cannot run in
  a headless/cloud environment. Skip until done manually.
- **Account feature for cross-device sync**: real architecture shift (app is
  currently no-backend/localStorage-only per CLAUDE.md). Needs its own
  scoping session: what backend, auth provider, how much state syncs. Do not
  implement any part of this unattended.

## Done 2026-07-24
- Full customization export: turned out to already be resolved. `backupData.ts`
  already covers `pomo-widget-layout-v2`/`pomo-widget-sizes-v1`/
  `pomo-saved-layouts`/`pomo-widget-minimized-v1` (predates this backlog
  entry), and the one genuinely missing piece (`pomo-widget-tints-v1`) was
  added by #14 (2026-07-23). Verified by reading `backupData.ts`'s
  `BACKUP_KEYS` directly rather than re-implementing. Removed from backlog.

## Done 2026-07-22
- Review Sessions filtering: added a text filter box above the Review
  Sessions list (StatsDialog.tsx) that matches task name, raw date, or the
  formatted date label (e.g. "Jul"), case-insensitive substring, client-side.
  SessionRecord had no task association at all, so this also added an
  optional `taskTitle` field to SessionRecord/useTimer (captured via a ref
  so it reflects whichever task was active when a session actually
  finishes, not a stale closure) — sessions logged before this change have
  no taskTitle and are unaffected, still filterable by date.
- Per-widget background tint: "Widget tint" section in AppMenu.tsx lets you
  pick an optional color overlay for the Timer and Tasks widgets (the two
  DraggableWidgets that actually exist — the backlog note also mentioned a
  "stats" widget, but there's no such draggable widget in the app, only the
  Stats dialog, so the feature covers timer+tasks only). Stored in
  `pomo-widget-tints-v1` alongside the other per-widget-id maps in
  useWidgetLayout.ts. Applied via a `--widget-tint` CSS custom property that
  `.glass` layers under its existing frosted gradient (defaults to
  transparent, so `theme.glassIntensity`'s blur/alpha vars are untouched).
  Not added to the export/import backup, matching the existing precedent
  that not every localStorage key is backed up (e.g. `pomo-active-task`
  isn't either).
- Export/import data: "Export data" / "Import data" buttons in AppMenu.tsx
  (Backup section) download/restore `pomo-stats`, `pomo-tasks`,
  `pomo-settings`, `pomo-theme` as JSON (src/lib/backupData.ts), with
  shape validation so malformed imports never partially apply.
- Aria-labels backlog item was already fully addressed by an earlier
  commit (a0bed76) — audited all icon-only buttons in src/components/ and
  src/App.tsx, none were missing aria-label/title. Removed from backlog.
- Daily goal (session-count based): `dailyGoalSessions` field in
  TimerSettings (default 0/off), a "Daily goal" slider row in TimerMenu.tsx
  (0-16 sessions, "Off" at 0), and the header's "N focus sessions today"
  chip now shows "3/5 today" when a goal is set, highlighted in the accent
  color once met. No weekly goal (daily only, per the "and/or" in the
  original scope note — kept to the smaller of the two).

## Dropped (2026-07-21)
- README / demo video improvements — not a priority right now

## Not a code task
- Promote on Reddit (r/unixporn) — marketing/distribution, not dev work

## Clarified, not a bug (2026-07-21)
- "Confirm you're present" toggle (TimerMenu → presence check) already works as designed: un-dismissable end-of-session prompt, discards the session if you don't respond. Separately, webcam presence detection already auto-pauses live mid-session on face-lost and resumes on return, so distracted time already doesn't count toward logged focus duration — no change needed, just wasn't obvious from the UI.

## Done this session (2026-07-21)
- Fixed session-data loss: stats + timer state now persist synchronously instead of via useEffect (was the root cause of 2 lost sessions)
- Split single tabbed Settings dialog into 3 header menus: Timer, Background, App
- Timer presets (25/5/15, 50/10/20, 90/15/30)
- Quick +1/+5/+10 min buttons (live or idle)
- WebAudio ambient noise mixer (rain/fire/brown/white noise)

## Done 2026-07-19
- PWA service worker
- Webcam presence detection (auto-pause on leaving frame)
- Review Sessions tab
- Stats streak tile (current + longest)

## Declined (don't build unprompted)
- Theme export/import
- Preset "rice" gallery
- Dedicated screenshot mode

## Known limits (not bugs, just constraints)
- Spotify embeds = 30s previews unless browser is logged into Premium (their rule)
- PiP is Chromium-only (button auto-hides elsewhere)
