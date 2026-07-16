# Pomodoro Timer

Aesthetic, customizable Pomodoro focus timer. Goal: daily-driver quality, eventually publishable. Inspired by studyfoc.us/pomodoro feature-wise, but the core identity is **ricing culture (r/unixporn) applied to a Pomodoro** — deep visual customization, personal setups worth screenshotting and sharing. Customization is the product, not a feature.

## Stack

- Vite + React 19 + TypeScript, Tailwind CSS v4 (via `@tailwindcss/vite` plugin, NOT postcss)
- **shadcn/ui built on @base-ui/react — NOT Radix.** No `asChild`; triggers take a `render={<El />}` prop. Slider `value`/`onValueChange` use plain numbers, not arrays. Cast: `(v) => ({ ...s, field: v as number })`.
- Fonts: Geist Variable (UI). Timer digits are user-selectable — see `src/fonts.ts` (`TIMER_FONTS`): Space Grotesk (default), JetBrains Mono, Orbitron, Unbounded, Doto. All via `@fontsource-variable/*`, imported in `index.css`. `fontFamilyFor(id)` resolves id → CSS family string.
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
- `src/lib/mediaStore.ts` — IndexedDB for uploaded background images/gifs/**video** (too big for localStorage). Metadata in localStorage, blobs in IDB, object URLs via `useBackgroundMedia`. `BackgroundOption.kind` includes `'video'`; App.tsx renders a looping muted `<video>` behind everything when active, `BackgroundPicker` previews it inline (autoplay/loop/muted) in the picker grid.
- `src/components/AmbientMixer.tsx` / `SpotifyEmbed.tsx` — YouTube/Spotify embeds. **Players render OUTSIDE PopoverContent** (docked fixed bottom-left) — popovers unmount content on close, which kills audio. Hide via opacity, never display:none/unmount.

## Z-index map

overlay bg 0 → main content 10 → fixed widgets 10 → docked players 30 → dragging widget 50 → header 60 → popovers/dialogs 50 (portaled). Header MUST stay above main — both at z-10 once made header buttons unclickable.

## Design system

- Glassmorphism: `.glass` (panels) and `.glass-pill` (buttons/chips) utilities in `src/index.css`. Use these, not ad-hoc bg-black/40. Both read `--glass-blur`/`--glass-alpha` CSS vars set inline on the app root from `theme.glassIntensity` (0–100 slider, 50 = original hardcoded look) — don't hardcode blur/alpha values in new glass surfaces, use the vars so the slider keeps working.
- Dark theme only. Accent color user-configurable (default orange #f97316), drives progress ring + Start button.
- Contrast matters: user has custom photo/gif/video backgrounds — floating UI always needs glass backing, never bare text.
- Minimalist: stats live in a popover under the header chip, not a floating widget. Resist adding always-visible chrome.
- **Ricing philosophy**: this app's identity is customization-as-the-point (r/unixporn energy), not incidental theming. When adding a visual feature, default to making it user-adjustable rather than fixed — but confirm scope with the user first (they've explicitly said no to gallery/export/screenshot-mode features so far; keep additions personal-use-focused unless told otherwise).
- Individual UI chrome is independently hideable: `theme.showTasks` / `showSessionPills` / `showStatsChip` / `showMediaButtons` toggle visibility (Settings → Appearance → "Show elements"). Media buttons hide via CSS only (never unmount `AmbientMixer`/`SpotifyEmbed` components) so playing audio survives hiding the buttons.

## Feature state

Done: timer w/ session cycling, tasks w/ pomodoro counts, custom bg upload (image/gif/video) + drag-reposition + overlay darkness, accent colors, glass intensity slider, 5-font timer digit picker, per-element show/hide toggles, drag/resize widgets + named layout presets, stats heatmap popover, keyboard shortcuts (Space/R/S), tab-away auto-pause, presence "Still there?" confirm (off by default), PiP mini timer, YouTube playlist player, Spotify embed, WebAudio button/alert sounds, favicon/manifest (tomato logo, `src/assets/logo.png`, sizes in `public/`).

Known limits: Spotify embeds = 30s previews unless browser is logged into Premium (their rule, documented in UI). PiP is Chromium-only (button auto-hides elsewhere).

Backlog: PWA/offline (manifest exists, no service worker yet), webcam presence detection (deliberately deferred), stats detail view expansion. User has explicitly declined for now: theme export/import, preset "rice" gallery, dedicated screenshot mode — these are the natural next asks once the app nears public release, don't build unprompted.

## Gotchas

- localStorage schema changes: always merge with defaults (`{...DEFAULT, ...stored}`) — old clients miss new fields.
- `tsconfig.app.json` uses `paths` without `baseUrl` (baseUrl deprecated in TS7).
- Vite serves; `public/image.svg`-style misnamed binaries break builds — logo uploads arrived as PNG-with-.svg-extension once already.
- `sharp` (devDep) regenerates favicon sizes from `src/assets/logo.png` if the logo changes.
