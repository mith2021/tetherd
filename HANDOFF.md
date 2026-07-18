# Session Handoff

> Updated whenever user says "handoff." Read this first in a new chat to pick up where the last one left off.

## Last updated: 2026-07-18

## Where things stand

- Git initialized this session (repo had no version control before). Single working folder — no worktrees currently in use (an earlier worktree experiment was removed; two parallel chats had been editing the same folder directly the whole time anyway).
- Latest commit: `811a78e` — layout-shift bugfix, widget minimize/restore, lazy-loaded heavy panels (Spotify/YouTube/Settings/Stats), main bundle 435KB → 210KB.

## Recently shipped

- **Video background uploads**: `BackgroundOption.kind` now includes `'video'`. Upload accepts `video/*`, 100MB cap (vs 25MB image). Renders as looping muted `<video>` in both the picker grid and the main app background. See `src/components/BackgroundPicker.tsx`, `src/hooks/useBackgroundMedia.ts`, `src/App.tsx`.
- **Glass intensity slider, 5-font timer picker, per-element show/hide toggles**: landed by a parallel chat session, documented in `CLAUDE.md`.
- **Bug fix**: "Working on: X" task label used to appear/disappear and shift the whole timer panel + trigger a clipping scrollbar. Now reserves fixed height always (`invisible` class instead of conditional unmount).
- **Widget minimize**: hover any draggable widget (timer, tasks) → minus button top-right → collapses to small glass pill, click to restore. State in `useWidgetLayout` (`pomo-widget-minimized-v1` localStorage key), not `theme`.
- **Perf**: profiled idle/active/drag states — core app was clean, no leaks, no extra re-renders. Real cost was eager-loading Spotify/YouTube/Settings/Stats components on initial load. Lazy-split via `React.lazy` + `Suspense` in `App.tsx`.

## Open / in-progress

- **App icon**: discussed prompts for a Gemini-generated icon. Decided: no literal tomato, no fixed orange (accent color is user-configurable, shouldn't be baked into brand identity), dark glassmorphic style matching the app's own aesthetic. Landed on 3 separate single-image prompts (progress ring / abstract flame-drop / hourglass fragment) rather than one grid-producing multi-concept prompt. Also wrote a plain-English app description for feeding to other models to generate better prompts. **Not yet generated or chosen — still open.**
- **Competitive research done, not yet acted on**: studyfoc.us/pomodoro audit complete (see below). Nothing implemented from it yet.

## Competitive research: studyfoc.us/pomodoro (completed, unacted)

Their visual customization is essentially nonexistent — confirms the ricing/customization angle is a wide-open lane, not a catch-up item.

**Worth building later** (not started):
1. Curated built-in ambient sound mixer (rain/fire/café/typing, mixable) — currently only have YouTube/Spotify embeds, no native curated tracks
2. Motivational quote/text overlay during focus sessions
3. Quick +1/+5/+10 min timer nudge buttons
4. Task tagging/categorization for richer stats

**Explicitly skip**: leaderboards/gamification, Notion embed — contradicts the personal-aesthetic product identity.

## User's stated preferences (this session)

- Wants git + branch/worktree isolation when running multiple parallel Claude chats — but note: two chats ended up editing the same folder directly regardless of worktree setup, so if that pattern continues, worktrees need to actually be used (open each chat *in* the worktree folder, not the main one).
- Caveman mode active — terse responses, code/commits written normal.
- Screenshot + click-test via Playwright required before reporting any visual/interaction change done (per `CLAUDE.md` workflow).

## Next steps (pick up here)

1. Generate/pick the app icon from the 3 prompt concepts, regenerate favicon sizes via `sharp` per `CLAUDE.md` gotcha (`src/assets/logo.png` is the source).
2. Decide whether to act on any studyfoc.us-derived backlog items — scope with user first per `CLAUDE.md` ("scope big features with AskUserQuestion before building").
3. No uncommitted changes as of last update — check `git status` on resume in case work continued after this file was last written.
