import { existsSync } from 'node:fs'

// Some sandboxed/CI containers pre-install a specific Chromium build outside
// Playwright's normal cache and expect scripts to point at it rather than
// downloading their own (see /opt/pw-browsers in this repo's cloud dev
// environment). Only used when present — a plain local `playwright install`
// setup is untouched.
const CONTAINER_CHROMIUM = '/opt/pw-browsers/chromium'

export function chromiumLaunchOptions(opts = {}) {
  if (!existsSync(CONTAINER_CHROMIUM)) return opts
  return { ...opts, executablePath: CONTAINER_CHROMIUM }
}
