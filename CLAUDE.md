# Pomodoro Timer

Ricing-culture (r/unixporn) Pomodoro timer. Customization is the product.

## Stack
- Vite + React 19 + TS, Tailwind v4 (`@tailwindcss/vite`, not postcss)
- shadcn/ui on @base-ui/react, NOT Radix. No `asChild`; use `render={<El />}`. Slider values are plain numbers not arrays.
- Timer font picker: `src/fonts.ts` `TIMER_FONTS`, `fontFamilyFor(id)`.
- Playwright devDep for self-verify.

## Commands
- `npm run dev` (bg) — http://localhost:5173
- `npx tsc --noEmit -p tsconfig.app.json` — typecheck after every change
- `node .scripts/screenshot.mjs [url] [outPath]`
- `node .scripts/verify-pause.mjs|verify-layouts.mjs|verify-music.mjs <png>`

## Workflow
After visual/interaction change: typecheck → screenshot + click-test via Playwright before done. Read screenshot with Read tool, actually look. Past bugs (z-index header, pause reset, popover killing audio) only caught this way.
Big features: scope via AskUserQuestion first.

## Architecture
- `App.tsx` — top-level, all state via `useLocalStorage`, props down. No store/router.
- `useTimer.ts` — endTimeRef epoch-ms + rAF, not setInterval. `awaitingConfirm` gates focus-complete on presence check.
- `useLocalStorage.ts` — settings/theme re-spread every render (`{...DEFAULT,...raw}`) → new identity each render. Never in effect deps; key effects to primitive fields (caused pause-resets-timer bug).
- `useWidgetLayout.ts` — `null`=flow layout, set=`position:fixed`. Presets in `pomo-saved-layouts`.
- `DraggableWidget.tsx` — window-level pointer listeners (element-level breaks on flow→fixed swap mid-drag). Callbacks ref-stabilized. Drag excludes `closest('button, input, ...')`.
- `usePictureInPicture.ts` — Document PiP (Chromium only), stylesheets copied in, content via createPortal.
- `mediaStore.ts` — IndexedDB for bg image/gif/video blobs, metadata in localStorage, object URLs via `useBackgroundMedia`.
- `AmbientMixer.tsx`/`SpotifyEmbed.tsx` — players render OUTSIDE PopoverContent (popover unmount kills audio). Hide via opacity only.

## Z-index
bg 0 → content/widgets 10 → docked players 30 → dragging widget 50 → header 60 → popovers 50 (portaled).

## Design system
- `.glass`/`.glass-pill` utilities (index.css), driven by `--glass-blur`/`--glass-alpha` from `theme.glassIntensity` slider — never hardcode blur/alpha.
- Dark theme only. Accent color configurable, default #f97316.
- Floating UI always needs glass backing (custom photo/video bgs).
- Stats in popover under header chip, not a widget. Resist always-visible chrome.
- Ricing philosophy: default new visual features to user-adjustable; confirm scope first. User declined so far: theme export/import, rice gallery, screenshot mode.
- Per-element toggles: `theme.showTasks/showSessionPills/showStatsChip/showMediaButtons`. Media buttons hide via CSS only, never unmount.

## Feature state
Done: timer+sessions, tasks w/ pomodoro counts, bg upload (img/gif/video)+reposition+overlay darkness, accent colors, glass slider, 5 timer fonts, element toggles, drag/resize widgets+presets, stats heatmap, shortcuts (Space/R/S), tab-away pause, presence confirm (off default), PiP, YouTube/Spotify embeds, WebAudio sounds, favicon/manifest.

Known limits: Spotify = 30s preview unless Premium login. PiP Chromium-only.

Backlog: PWA service worker, webcam presence (deferred), stats detail view. Declined: theme export/import, rice gallery, screenshot mode.

## Gotchas
- localStorage schema changes: merge with defaults always.
- tsconfig.app.json: `paths` w/o `baseUrl` (deprecated TS7).
- Watch for misnamed binary uploads (PNG as .svg broke build once).
- `sharp` devDep regenerates favicons from `src/assets/logo.png`.
