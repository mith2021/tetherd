# TODO

## Backlog

Each item below has concrete scope + acceptance criteria so an unattended session
(cloud routine) can act on it without guessing. Skip anything not this specific.

- **Aria-labels**: settings gear button and any other icon-only `<button>` in
  src/components/ and src/App.tsx missing `aria-label` or `title`. Grep for
  `<button` without a nearby `aria-label=` prop, add one describing the action
  (e.g. "Open timer settings"). Small, mechanical, safe for unattended work.

- **Export/import data**: add a button in AppMenu.tsx, "Export data" — downloads a
  JSON file (e.g. `pomodoro-backup-<date>.json`) containing the current
  `pomo-stats`, `pomo-tasks`, `pomo-settings`, `pomo-theme` localStorage values.
  Add a matching "Import data" file-picker button that reads a previously
  exported JSON and restores those keys (validate shape before writing, reject
  malformed files with a clear error, never partially apply). No backend, no
  new dependencies — plain `Blob`/`URL.createObjectURL` for download,
  `FileReader` for import.

- **Review Sessions filtering**: Review Sessions tab (StatsDialog.tsx) is
  currently a flat list. Add a simple text filter/search box above the list
  that filters by task name or date substring, client-side, no new deps.

- **Goal-setting feature (session-count based)**: add a daily and/or weekly
  target for completed focus sessions (not raw minutes). Settings field in
  TimerMenu.tsx or a new small settings row: "Daily goal: N sessions" (default
  off/0 = disabled). Add a small progress indicator — reuse the existing
  "N focus sessions today" chip in App.tsx, extend it to show "3/5 today" when
  a goal is set, using `stats.sessions` filtered to today (see
  `calculateStreaks`/`sessionsInRange` in statsCompute.ts for the date-filter
  pattern already used elsewhere). No new dependencies, no separate "Focus
  Score" metric (that was intentionally removed 2026-07-19 — don't reintroduce
  it, this is goal-vs-actual count only).

- **Per-widget background tint**: each DraggableWidget (timer, tasks, stats)
  gets an optional color override applied on top of the existing `.glass`
  effect — a subtle tint, not a full re-theme. Add a per-widget color field to
  the relevant localStorage-backed state (likely alongside `useWidgetLayout.ts`
  or a new small per-widget settings map), a color picker control (reuse the
  accent-color swatch pattern from AppMenu.tsx), and apply it as a tinted
  overlay on the widget's `.glass` background (e.g. a low-opacity colored
  layer, not replacing the blur/alpha vars already driven by
  `theme.glassIntensity` — those stay global). Default: no tint (current
  behavior unchanged). Keep it per-element-toggle-friendly, matching the
  existing `showTasks`/`showSessionPills` pattern in spirit.

## Needs human scoping before automated work (do not touch unattended)

- **Manual real-device webcam test**: needs a physical camera — cannot run in
  a headless/cloud environment. Skip until done manually.
- **Account feature for cross-device sync**: real architecture shift (app is
  currently no-backend/localStorage-only per CLAUDE.md). Needs its own
  scoping session: what backend, auth provider, how much state syncs. Do not
  implement any part of this unattended.

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
