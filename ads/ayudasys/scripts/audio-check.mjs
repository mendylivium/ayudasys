// Is the music audible on phone and laptop speakers? Prints how its energy splits by frequency, its
// peak, and its loudness every few seconds.  node scripts/audio-check.mjs [file, default public/audio/bgm.mp3]
// Rough targets: below 250 Hz at most ~65% (phones barely play it), 250–2000 Hz 30% or more (where
// melody and chords live), peak below −1 dBFS, and no long quiet stretches you didn't plan.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const file = process.argv[2] ?? 'public/audio/bgm.mp3'
const ffmpeg = ['ffmpeg', path.resolve('node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'), path.resolve('node_modules/@remotion/compositor-darwin-arm64/ffmpeg')].find((f) => f === 'ffmpeg' ? (() => { try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true } catch { return false } })() : existsSync(f))
if (!ffmpeg) throw Error('no ffmpeg (install it, or npm install so Remotion brings its own)')
const SR = 22050
const wav = execFileSync(ffmpeg, ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_s16le', '-f', 'wav', '-'], { maxBuffer: 1 << 30 })
let offset = 12
while (offset + 8 < wav.length && wav.toString('ascii', offset, offset + 4) !== 'data') {
  const size = wav.readUInt32LE(offset + 4)
  offset += 8 + size + (size % 2)
}
if (offset + 8 >= wav.length) throw Error('Missing WAV data chunk')
const pcm = wav.subarray(offset + 8)
const n = pcm.length / 2
let lp1 = 0, lp2 = 0, peak = 0
const e = [0, 0, 0], seg = []
const a1 = 1 - Math.exp((-2 * Math.PI * 250) / SR), a2 = 1 - Math.exp((-2 * Math.PI * 2000) / SR)
const STEP = 4
for (let i = 0; i < n; i++) {
  const v = pcm.readInt16LE(i * 2) / 32768
  peak = Math.max(peak, Math.abs(v))
  lp1 += (v - lp1) * a1
  lp2 += (v - lp2) * a2
  e[0] += lp1 * lp1, e[1] += (lp2 - lp1) ** 2, e[2] += (v - lp2) ** 2
  const s = Math.floor(i / SR / STEP)
  seg[s] = (seg[s] ?? 0) + v * v
}
const t = e[0] + e[1] + e[2]
const pct = (x) => `${((100 * x) / t).toFixed(0)}%`
console.log(`${file}: ${(n / SR).toFixed(1)} s, peak ${(20 * Math.log10(peak)).toFixed(1)} dBFS`)
console.log(`below 250 Hz ${pct(e[0])} · 250–2000 Hz ${pct(e[1])} · above 2000 Hz ${pct(e[2])}`)
console.log(`loudness every ${STEP} s (dB): ` + seg.map((x, i) => `${i * STEP}:${(10 * Math.log10(x / (SR * STEP))).toFixed(0)}`).join(' '))
