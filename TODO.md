# TODO

## Backlog

Each item below has concrete scope + acceptance criteria so an unattended session
(cloud routine) can act on it without guessing. Skip anything not this specific.

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

## Done 2026-07-22
- Review Sessions filtering: added a text filter box above the Review
  Sessions list (StatsDialog.tsx) that matches task name, raw date, or the
  formatted date label (e.g. "Jul"), case-insensitive substring, client-side.
  SessionRecord had no task association at all, so this also added an
  optional `taskTitle` field to SessionRecord/useTimer (captured via a ref
  so it reflects whichever task was active when a session actually
  finishes, not a stale closure) — sessions logged before this change have
  no taskTitle and are unaffected, still filterable by date.
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
