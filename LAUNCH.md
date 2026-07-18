# Launch Plan — Deploy + Get Traction

Goal: free-forever host, GitHub stars/recognition. No money spent. No monetization ask.

## 1. Deploy (GitHub Pages)

- Free forever, no domain, no card. URL: `username.github.io/pomodoro-timer`
- Steps:
  1. `vite.config.ts` — set `base: '/pomodoro-timer/'` (match repo name)
  2. Add GitHub Actions workflow (official Vite Pages guide) or `gh-pages` npm package
  3. Push — Pages builds + serves from Actions/`gh-pages` branch
  4. Verify live URL loads, video bg + IndexedDB storage work over https (not just localhost)

## 2. README rewrite (before any posting)

- Top: short GIF/video clip of app in use (rice-style bg, drag widgets, timer running) — decides interest in seconds
- One-line pitch: customizable Pomodoro timer, video/gif backgrounds, drag/resize widgets, no signup, free
- Live demo link front and center
- Feature list, screenshot of a nice setup
- No fluff paragraphs — visual sells it, not prose

## 3. Own the AI-build angle upfront

- Do NOT hide Claude Code use — state it plainly in post/README if asked
- No link to Patreon/Pro-tier/waitlist/email capture anywhere — kills "farming" read
- Be ready to explain technical choices in comments (drift-proof timer via epoch+rAF, IndexedDB for video blobs, glass UI CSS vars) — proves not slop

## 4. Where to post (ranked, low-hostility first)

1. **r/SideProject** — AI-assisted builds normalized here
2. **Show HN** (news.ycombinator.com) — title format: "Show HN: [specific feature], not [generic 'a pomodoro timer']"
3. **r/InternetIsBeautiful** — free polished web tools, big reach
4. **r/productivity** — pomodoro-primed audience
5. **Product Hunt** — free listing, built-in discovery
6. Skip r/unixporn — gatekept to desktop rice screenshots, not web apps, wrong fit despite aesthetic inspiration

## 5. Post copy rules

- Title: specific feature, not generic descriptor
- Body: what it does, live link, GitHub link, nothing else
- No hype words, no "revolutionary/game-changing"
- Answer every early comment fast — first real engagement sets the tone

## 6. Post-launch

- Watch comments/issues first 48h, respond fast
- Fix anything reported live on the demo (rebuild deploys automatically via Actions)
- Cross-post to Product Hunt few days after Reddit/HN once initial bugs shaken out
