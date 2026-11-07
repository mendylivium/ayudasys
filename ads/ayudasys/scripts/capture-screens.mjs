// Captures real screens of a web app (yours, running locally) as 1080×1920 phone screenshots for
// PhoneIn / Phone, into public/shots/<name>.png.
//   npm i -D playwright && npx playwright install chromium
//   node scripts/capture-screens.mjs scripts/shots.json
//
// shots.json:
// {
//   "base": "http://localhost:5173",
//   "camera": "scripts/camera.jpg",        optional: a JPEG the app's camera will "see" (getUserMedia),
//                                          so camera features (scanning, recognition) really run
//   "shots": [
//     { "name": "home", "path": "/" },
//     { "name": "after-tap", "path": "/sale", "click": ["text=Scan", "[data-testid=go]"], "waitFor": ".result", "delay": 800 }
//   ]
// }
// Each shot opens `path`, clicks each selector in `click` in order, waits for `waitFor` (if any) and
// `delay` ms, then shoots. Use made-up data in the app (no real customers), and seed it first.
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const config = JSON.parse(readFileSync(process.argv[2] ?? 'scripts/shots.json', 'utf8'))
const out = path.resolve('public/shots')
mkdirSync(out, { recursive: true })
const args = []
if (config.camera) {
  // Chromium's fake camera plays an MJPEG file: the same JPEG repeated is a still scene.
  const jpeg = readFileSync(config.camera)
  const mjpeg = path.join(tmpdir(), `camera-${process.pid}.mjpeg`)
  writeFileSync(mjpeg, Buffer.concat(Array(30).fill(jpeg)))
  args.push('--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${mjpeg}`)
}
const browser = await chromium.launch({ args })
// 432×768 CSS px at 2.5× = 1080×1920, a typical phone.
const context = await browser.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true })
if (config.camera) await context.grantPermissions(['camera'], { origin: new URL(config.base).origin })
const page = await context.newPage()
page.setDefaultTimeout(30000)
for (const shot of config.shots) {
  await page.goto(new URL(shot.path ?? '/', config.base).href)
  for (const sel of shot.click ?? []) await page.locator(sel).first().click()
  if (shot.waitFor) await page.locator(shot.waitFor).first().waitFor()
  await page.waitForTimeout(shot.delay ?? 600)
  const file = path.join(out, `${shot.name}.png`)
  await page.screenshot({ path: file })
  console.log(file)
}
await browser.close()
