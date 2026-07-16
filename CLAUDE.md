# Pomodoro Timer

Aesthetic, customizable Pomodoro focus timer. Goal: daily-driver quality, eventually publishable. Inspired by studyfoc.us/pomodoro feature-wise, but the core identity is **ricing culture (r/unixporn) applied to a Pomodoro** — deep visual customization, personal setups worth screenshotting and sharing. Customization is the product, not a feature.

## Stack

- Vite + React 19 + TypeScript, Tailwind CSS v4 (via `@tailwindcss/vite` plugin, NOT postcss)
- **shadcn/ui built on @base-ui/react — NOT Radix.** No `asChild`; triggers take a `render={<El />}` prop. Slider `value`/`onValueChange` use plain numbers, not arrays. Cast: `(v) => ({ ...s, field: v as number })`.
- Fonts: Geist Variable (UI), Space Grotesk Variable (timer digits, via `--font-timer`)
- Playwright installed as devDependency for self-verification (see Workflow)

## Commands

- `npm run dev` — dev server on http://localhost:5173 (run in background)
- `npx tsc --noEmit -p tsconfig.app.json` — typecheck (run after every change)
- `node .scripts/screenshot.mjs [url] [outPath]` — headless screenshot + console errors
- `node .scripts/verify-pause.mjs <png>` / `verify-layouts.mjs <png>` / `verify-music.mjs <png>` — regression tests

## Workflow (important)

After any visual/interaction change: typecheck, then **screenshot and click-test with Playwright before reporting done**. Scripts live in `.scripts/`. Read the screenshot with the Read tool and actually look at it. Past bugs (z-index unclickable header, pause resetting timer, popover killing audio) were all only caught this way or by the user.

User batches feedback as voice-transcribed bug lists. Scope big features with AskUserQuestion before building.

## Architecture

- `src/App.tsx` — single top-level component; all state lives here via `useLocalStorage` hooks, passed down as props. No state library, no router.
- `src/hooks/useTimer.ts` — timer engine. Drift-proof: `endTimeRef` epoch-ms + rAF ticks, not setInterval decrements. Focus-complete can gate behind presence confirmation (`awaitingConfirm` → confirm/discard).
- `src/hooks/useLocalStorage.ts` — all persistence. **Settings/theme objects are re-spread every render in App (`{...DEFAULT, ...raw}`) so their identity changes each render — never put them in effect deps; key effects to primitive fields.** (This caused the pause-resets-timer bug.)
- `src/hooks/useWidgetLayout.ts` — widget positions/sizes. `null` = responsive flow layout; set = detached `position:fixed`. Named layout presets in `pomo-saved-layouts`.
- `src/components/DraggableWidget.tsx` — drag + resize wrapper. Window-level pointer listeners (element-level breaks when flow→fixed swap happens mid-drag). Callbacks ref-stabilized so the listener effect mounts once. Interactive elements excluded from drag via `closest('button, input, ...')`.
- `src/hooks/usePictureInPicture.ts` — Document PiP API (Chrome/Edge only), copies stylesheets into PiP window, content portaled via `createPortal`.
- `src/lib/mediaStore.ts` — IndexedDB for uploaded background images/gifs (too big for localStorage). Metadata in localStorage, blobs in IDB, object URLs via `useBackgroundMedia`.
- `src/components/AmbientMixer.tsx` / `SpotifyEmbed.tsx` — YouTube/Spotify embeds. **Players render OUTSIDE PopoverContent** (docked fixed bottom-left) — popovers unmount content on close, which kills audio. Hide via opacity, never display:none/unmount.

## Z-index map

overlay bg 0 → main content 10 → fixed widgets 10 → docked players 30 → dragging widget 50 → header 60 → popovers/dialogs 50 (portaled). Header MUST stay above main — both at z-10 once made header buttons unclickable.

## Design system

- Glassmorphism: `.glass` (panels) and `.glass-pill` (buttons/chips) utilities in `src/index.css`. Use these, not ad-hoc bg-black/40.
- Dark theme only. Accent color user-configurable (default orange #f97316), drives progress ring + Start button.
- Contrast matters: user has custom photo/gif backgrounds — floating UI always needs glass backing, never bare text.
- Minimalist: stats live in a popover under the header chip, not a floating widget. Resist adding always-visible chrome.

## Feature state

Done: timer w/ session cycling, tasks w/ pomodoro counts, custom bg upload + drag-reposition + overlay darkness, accent colors, drag/resize widgets + named layout presets, stats heatmap popover, keyboard shortcuts (Space/R/S), tab-away auto-pause, presence "Still there?" confirm (off by default), PiP mini timer, YouTube playlist player, Spotify embed, WebAudio button/alert sounds, favicon/manifest (tomato logo, `src/assets/logo.png`, sizes in `public/`).

Known limits: Spotify embeds = 30s previews unless browser is logged into Premium (their rule, documented in UI). PiP is Chromium-only (button auto-hides elsewhere).

Backlog: PWA/offline (manifest exists, no service worker yet), webcam presence detection (deliberately deferred), stats detail view expansion.

## Gotchas

- localStorage schema changes: always merge with defaults (`{...DEFAULT, ...stored}`) — old clients miss new fields.
- `tsconfig.app.json` uses `paths` without `baseUrl` (baseUrl deprecated in TS7).
- Vite serves; `public/image.svg`-style misnamed binaries break builds — logo uploads arrived as PNG-with-.svg-extension once already.
- `sharp` (devDep) regenerates favicon sizes from `src/assets/logo.png` if the logo changes.
