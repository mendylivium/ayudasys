// Original music and sound effects, made by code (no samples, no licenses needed).
//   node scripts/make-music.mjs   → public/audio/bgm.mp3 (laid out by scripts/music-plan.json) and
//                                   public/audio/<sound>.mp3 sound effects
// Music: 120 BPM in C major (C – G – Am – F): 1 bar = 2 s = 60 frames at 30 fps, so start scenes on
// multiples of 60 frames and the cuts land on bar lines.
import { writeFileSync, readFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio')
mkdirSync(OUT, { recursive: true })
const SR = 44100
const BEAT = 0.5 // seconds (120 BPM)
const BAR = 2

// ---------- basics ----------
let seed = 12345
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1 // deterministic noise
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)
const TAU = Math.PI * 2

class Track {
  constructor(seconds, stereo = true) {
    this.n = Math.ceil(seconds * SR)
    this.L = new Float32Array(this.n)
    this.R = stereo ? new Float32Array(this.n) : this.L
  }
  // Adds fn(t, i) (t = seconds since start) from `at` for `dur` seconds, panned (-1..1).
  add(at, dur, fn, gain = 1, pan = 0) {
    const s = Math.max(0, Math.floor(at * SR))
    const e = Math.min(this.n, Math.floor((at + dur) * SR))
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2
    for (let i = s; i < e; i++) {
      const v = fn((i - s) / SR, i)
      this.L[i] += v * gl
      if (this.R !== this.L) this.R[i] += v * gr
    }
  }
}

// Chamberlin state-variable filter (cutoff may change per sample).
function svf() {
  let low = 0, band = 0
  return (x, fc, q = 0.7) => {
    const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6)) / SR)
    low += f * band
    const high = x - low - q * band
    band += f * high
    return { low, band, high }
  }
}

const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) * d))
const adsr = (t, len, a, d, s, r) => {
  if (t < a) return t / a
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d)
  if (t < len) return s
  return Math.max(0, s * (1 - (t - len) / r))
}

// ---------- instruments ----------
const kick = (t) => Math.sin(TAU * (45 * t + (110 / 18) * (1 - Math.exp(-18 * t)))) * Math.exp(-t * 7) * 1.0
function clap() {
  const f = svf()
  return (t) => {
    const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * 90) : 0), 0)
    return f(rand(), 1500, 0.5).band * (bursts * 0.6 + Math.exp(-t * 18) * 0.7)
  }
}
function hat(decay = 60) {
  const f = svf()
  return (t) => f(rand(), 9000, 0.3).high * Math.exp(-t * decay)
}
const pluck = (m) => {
  const fr = mtof(m)
  return (t) => (Math.sin(TAU * fr * t) + 0.45 * Math.sin(TAU * 2 * fr * t) + 0.2 * Math.sin(TAU * 4 * fr * t)) * env(t, 0.004, 7)
}
const marimba = (m) => {
  const fr = mtof(m)
  return (t) => (Math.sin(TAU * fr * t) + 0.25 * Math.sin(TAU * 3.99 * fr * t) * Math.exp(-t * 20)) * env(t, 0.002, 9)
}
const saw = (fr, t, harm = 8) => {
  let v = 0
  for (let h = 1; h <= harm; h++) v += Math.sin(TAU * h * fr * t) / h
  return v
}
const bassNote = (m, len) => (t) => saw(mtof(m), t, 6) * adsr(t, len, 0.005, 0.08, 0.7, 0.04) * 0.5
const padNote = (m, len) => {
  const fr = mtof(m)
  return (t) => (saw(fr * 0.997, t, 5) + saw(fr * 1.003, t, 5)) * adsr(t, len, 0.25, 0.3, 0.8, 0.35) * 0.2
}
const leadNote = (m, len) => {
  const fr = mtof(m)
  return (t) => {
    const vib = t > 0.15 ? 1 + 0.004 * Math.sin(TAU * 5.5 * t) : 1
    let v = 0
    for (const h of [1, 3, 5, 7]) v += Math.sin(TAU * h * fr * vib * t) / h
    v = v * 0.6 + Math.sin(TAU * fr * 2 * vib * t) * 0.15 // a little brightness
    return v * adsr(t, len, 0.01, 0.12, 0.55, 0.08)
  }
}
const bell = (fr, decay = 3) => (t) =>
  (Math.sin(TAU * fr * t) + 0.5 * Math.sin(TAU * fr * 2.76 * t) * Math.exp(-t * 4) + 0.25 * Math.sin(TAU * fr * 5.4 * t) * Math.exp(-t * 8)) *
  env(t, 0.002, decay)
function crash(len = 1.6) {
  const f = svf()
  return (t) => f(rand(), 7000, 0.4).high * Math.exp(-t * (3 / len)) * 0.8
}
function noiseSweep(len, from, to, q = 0.4) {
  const f = svf()
  return (t) => f(rand(), from * (to / from) ** (t / len), q).band
}
const boom = (t) => Math.sin(TAU * (32 * t + (80 / 6) * (1 - Math.exp(-6 * t)))) * Math.exp(-t * 2.2)

// ---------- arrangement ----------
const CHORDS = [
  { root: 48, tones: [60, 64, 67] }, // C
  { root: 43, tones: [59, 62, 67] }, // G
  { root: 45, tones: [60, 64, 69] }, // Am
  { root: 41, tones: [60, 65, 69] }, // F
]
const chordAt = (bar) => CHORDS[bar % 4]
// 4-bar hook (beat offset, midi, length in beats)
const HOOK = [
  [0, 76, 1], [1, 79, 0.5], [1.5, 81, 0.5], [2, 79, 1], [3, 76, 0.5], [3.5, 74, 0.5],
  [4, 74, 1], [5, 71, 0.5], [5.5, 74, 0.5], [6, 79, 1.5], [7.5, 77, 0.5],
  [8, 76, 1], [9, 81, 0.5], [9.5, 79, 0.5], [10, 76, 1], [11, 72, 0.5], [11.5, 74, 0.5],
  [12, 77, 0.5], [12.5, 76, 0.5], [13, 74, 0.5], [13.5, 72, 0.5], [14, 74, 0.5], [14.5, 76, 0.5], [15, 72, 1],
]

// The plan: scripts/music-plan.json (edit it to match your scenes; seconds, bars are 2 s):
//   len       total length
//   sections  [[start, "intro" | "main" | "break" | "end"], ...]  intro = marimba and light kick,
//             main = full groove, break = pads and plucks (a breakdown), end = the final chord rings
//   lead      [[from, to], ...] when the hook melody plays; up: [[from, to]] an octave higher
//   leadFrom  the bar time the hook starts from (so it starts on its first phrase)
//   hits      riser + crash into these times (drops)
//   final     the final hit (big chord, rings ~4 s; put it 4 s before len)
const planFile = join(dirname(fileURLToPath(import.meta.url)), 'music-plan.json')
const P = JSON.parse(readFileSync(planFile, 'utf8'))
const inRanges = (ranges) => (t) => ranges.some(([a, b]) => t >= a && t < b)
const PLAN = {
  len: P.len,
  section: (t) => [...P.sections].reverse().find(([at]) => t >= at)[1],
  lead: inRanges(P.lead),
  up: inRanges(P.up ?? []),
  hits: P.hits ?? [],
  final: P.final,
  leadFrom: P.leadFrom ?? P.lead[0]?.[0] ?? 0,
}

function music(plan = PLAN) {
  const T = new Track(plan.len)
  const kicks = []
  const section = plan.section

  for (let bar = 0; bar < (plan.final - 0) / BAR; bar++) {
    const t0 = bar * BAR
    const s = section(t0)
    const ch = chordAt(bar)
    // marimba arpeggio in eighths (all sections but the end)
    if (s !== 'end') {
      const arp = [ch.tones[0], ch.tones[1], ch.tones[2], ch.tones[1] + 12, ch.tones[2], ch.tones[1], ch.tones[0] + 12, ch.tones[2]]
      arp.forEach((m, k) => T.add(t0 + k * 0.25, 0.6, marimba(m + 12), s === "main" ? 0.1 : 0.3, k % 2 ? 0.35 : -0.35))
    }
    // shaker 16ths
    if (s !== 'end')
      for (let k = 0; k < 16; k++) T.add(t0 + k * 0.125, 0.06, hat(110), (k % 4 === 2 ? 0.07 : 0.035) * (s === 'break' ? 0.6 : 1), 0.4)
    if (s === 'main' || (s === 'intro' && bar >= 2)) {
      for (let b = 0; b < 4; b++) {
        const kt = t0 + b * BEAT
        if (s === 'intro' && b % 2) continue
        T.add(kt, 0.5, kick, s === 'intro' ? 0.45 : 0.85)
        kicks.push(kt)
      }
    }
    if (s === 'main') {
      for (const b of [1, 3]) T.add(t0 + b * BEAT, 0.3, clap(), 0.5, 0.1)
      for (let b = 0; b < 4; b++) T.add(t0 + b * BEAT + 0.25, 0.12, hat(45), 0.16, -0.2)
      // bass: octave-bouncing eighths
      for (let k = 0; k < 8; k++) T.add(t0 + k * 0.25, 0.26, bassNote(ch.root + (k % 2 ? 12 : 0), 0.2), 0.42)
      // pad chord
      ch.tones.forEach((m, k) => T.add(t0, BAR + 0.4, padNote(m, BAR), 0.5, [-0.5, 0, 0.5][k]))
      // lead hook (from 8 s); 24–40 s plays an octave up, 40–48 s rests, back for 54–60 s
      const loopBar = (bar - plan.leadFrom / BAR) % 4 // the hook starts on its first bar
      const playLead = plan.lead(t0)
      if (playLead) {
        const up = plan.up(t0) ? 12 : 0
        for (const [b, m, len] of HOOK) {
          if (b >= loopBar * 4 && b < loopBar * 4 + 4) T.add(t0 + (b - loopBar * 4) * BEAT, len * BEAT + 0.2, leadNote(m + up, len * BEAT * 0.9), 0.16, 0.05)
        }
      }
    }
    if (s === 'break') {
      ch.tones.forEach((m, k) => T.add(t0, BAR + 0.4, padNote(m, BAR), 0.6, [-0.5, 0, 0.5][k]))
      T.add(t0, BAR, bassNote(ch.root, BAR * 0.9), 0.3)
      if (bar % 2 === 0) for (const [b, m, len] of HOOK.slice(0, 6)) T.add(t0 + b * BEAT, len * BEAT + 0.2, pluck(m), 0.12, 0.2)
    }
  }

  // risers + snare rolls into 8 s and 50 s
  for (const hit of plan.hits) {
    T.add(hit - 2, 2, (t) => noiseSweep(2, 300, 8000)(t) * (t / 2) ** 2, 0.5)
    for (let k = 0; k < 16; k++) T.add(hit - 1 + k / 16, 0.1, clap(), 0.1 + (k / 16) * 0.35)
    T.add(hit, 2, crash(1.8), 0.5)
    T.add(hit, 1.5, boom, 0.6)
  }
  // final hit: big C chord, crash, boom, sparkle arpeggio, ringing out
  const F = plan.final
  T.add(F, 4, boom, 0.7)
  T.add(F, 4, crash(3), 0.55)
  for (const [k, m] of [48, 60, 64, 67, 72].entries()) T.add(F, 4, padNote(m, 2.2), 0.55, [-0.4, -0.2, 0, 0.2, 0.4][k])
  T.add(F, 3, bassNote(36, 1.5), 0.5)
  ;[72, 76, 79, 84, 88, 91, 96].forEach((m, k) => T.add(F + 0.25 + k * 0.125, 2.5, bell(mtof(m), 2.5), 0.08, k % 2 ? 0.5 : -0.5))
  T.add(F, 0.6, kick, 0.9)

  // sidechain: duck pad/bass feel by ducking everything slightly after each kick, then glue + limit
  kicks.sort((a, b) => a - b)
  let next = 0
  let last = -1
  for (let i = 0; i < T.n; i++) {
    const t = i / SR
    while (next < kicks.length && kicks[next] <= t) last = kicks[next++]
    const duck = last >= 0 && t - last < 0.4 ? 1 - 0.25 * Math.exp(-(t - last) * 10) : 1
    const fade = t > plan.len - 0.7 ? Math.max(0, (plan.len - t) / 0.7) : 1
    T.L[i] = Math.tanh(T.L[i] * duck * 1.1) * fade
    T.R[i] = Math.tanh(T.R[i] * duck * 1.1) * fade
  }
  return T
}

// ---------- sound effects ----------
const sfx = {
  whoosh: () => {
    const T = new Track(0.7, false)
    const f = svf()
    T.add(0, 0.7, (t) => f(rand(), 400 * (t < 0.35 ? (3200 / 400) ** (t / 0.35) : (3200 / 400) ** ((0.7 - t) / 0.35)), 0.5).band * Math.sin(Math.PI * (t / 0.7)) ** 2, 0.9)
    return T
  },
  pop: () => {
    const T = new Track(0.15, false)
    T.add(0, 0.15, (t) => Math.sin(TAU * (420 * t + (900 / 30) * (1 - Math.exp(-30 * t)))) * env(t, 0.002, 30), 0.8)
    return T
  },
  tap: () => {
    const T = new Track(0.08, false)
    const f = svf()
    T.add(0, 0.08, (t) => (f(rand(), 3000, 0.6).band * 0.6 + Math.sin(TAU * 1800 * t)) * Math.exp(-t * 70), 0.6)
    return T
  },
  tick: () => {
    const T = new Track(0.04, false)
    T.add(0, 0.04, (t) => Math.sin(TAU * 3200 * t) * Math.exp(-t * 140), 0.35)
    return T
  },
  beep: () => {
    const T = new Track(0.18, false)
    T.add(0, 0.16, (t) => (Math.sin(TAU * 1900 * t) + Math.sin(TAU * 5700 * t) / 3) * (t < 0.14 ? 1 : (0.16 - t) / 0.02), 0.45)
    return T
  },
  chaching: () => {
    const T = new Track(1.6, false)
    const f = svf()
    T.add(0, 0.12, (t) => f(rand(), 2500, 0.5).high * Math.exp(-t * 35), 0.8) // drawer "ka"
    T.add(0.05, 0.12, (t) => Math.sin(TAU * 140 * t) * Math.exp(-t * 40), 0.6) // thunk
    for (const [at, fr] of [[0.12, 2093], [0.12, 2637], [0.2, 3136], [0.2, 4186]]) T.add(at, 1.4, bell(fr, 2.6), 0.22)
    return T
  },
  chime: () => {
    const T = new Track(1.4, false)
    ;[72, 76, 79, 84].forEach((m, k) => T.add(k * 0.08, 1.2, bell(mtof(m), 3.2), 0.25))
    return T
  },
  printer: () => {
    const T = new Track(1.1, false)
    const f = svf()
    T.add(0, 1.0, (t) => {
      const pulse = 0.5 + 0.5 * Math.sign(Math.sin(TAU * 38 * t))
      return (f(rand(), 1800, 0.6).band * pulse * 0.7 + Math.sin(TAU * 120 * t) * 0.15) * Math.min(1, t * 20, (1 - t) * 20)
    }, 0.8)
    return T
  },
  stamp: () => {
    const T = new Track(0.4, false)
    const f = svf()
    T.add(0, 0.4, (t) => Math.sin(TAU * (60 * t + (120 / 25) * (1 - Math.exp(-25 * t)))) * Math.exp(-t * 12) + f(rand(), 900, 0.5).band * Math.exp(-t * 30) * 0.6, 0.9)
    return T
  },
  page: () => {
    const T = new Track(0.45, false)
    const f = svf()
    T.add(0, 0.45, (t) => f(rand(), 2500 + 1500 * Math.sin(TAU * 9 * t), 0.7).band * Math.sin(Math.PI * (t / 0.45)) * (0.6 + 0.4 * Math.sin(TAU * 23 * t)), 0.8)
    return T
  },
  womp: () => {
    // "womp womp" for the problem scene
    const T = new Track(1.4, false)
    const note = (m0, m1, len) => (t) => {
      const fr = mtof(m0 + (m1 - m0) * Math.min(1, t / len)) * (1 + 0.012 * Math.sin(TAU * 6 * t))
      return saw(fr, t, 6) * adsr(t, len, 0.03, 0.1, 0.8, 0.12)
    }
    T.add(0, 0.42, note(62, 61, 0.3), 0.3)
    T.add(0.45, 0.95, note(61, 58, 0.8), 0.3)
    return T
  },
  // Camera shutter: a click, a short noise burst, and the second click.
  shutter: () => {
    const T = new Track(0.25, false)
    const f = svf()
    T.add(0, 0.05, (t) => f(rand(), 4000, 0.5).band * Math.exp(-t * 90) + Math.sin(TAU * 1200 * t) * Math.exp(-t * 120) * 0.5, 0.9)
    T.add(0.09, 0.08, (t) => f(rand(), 2500, 0.5).band * Math.exp(-t * 70), 0.7)
    return T
  },
  // The camera looking: a soft rising electronic sweep.
  scan: () => {
    const T = new Track(1.2, false)
    T.add(0, 1.2, (t) => (Math.sin(TAU * (600 * t + 900 * t * t)) * 0.5 + Math.sin(TAU * (1200 * t + 1800 * t * t)) * 0.2) * Math.sin(Math.PI * (t / 1.2)) ** 2, 0.35)
    return T
  },
  // An item found: a bright two-note blip.
  detect: () => {
    const T = new Track(0.35, false)
    T.add(0, 0.12, (t) => Math.sin(TAU * 1568 * t) * env(t, 0.002, 25), 0.5)
    T.add(0.07, 0.25, (t) => Math.sin(TAU * 2093 * t) * env(t, 0.002, 14), 0.5)
    return T
  },
  // A row ticked.
  check: () => {
    const T = new Track(0.2, false)
    T.add(0, 0.2, (t) => Math.sin(TAU * (900 * t + 600 * t * t)) * env(t, 0.002, 22), 0.6)
    return T
  },
  // Remove background: a magic shimmer going up.
  sparkle: () => {
    const T = new Track(1.4, false)
    ;[84, 88, 91, 96, 100, 103].forEach((m, k) => T.add(k * 0.07, 1, bell(mtof(m), 5), 0.16))
    T.add(0, 0.8, (t) => noiseSweep(0.8, 2000, 10000)(t) * Math.sin(Math.PI * (t / 0.8)), 0.12)
    return T
  },
  impact: () => {
    const T = new Track(2, false)
    T.add(0, 2, boom, 0.8)
    T.add(0, 2, crash(1.5), 0.45)
    return T
  },
}

// ---------- output ----------
function writeWav(path, T) {
  const ch = T.R === T.L ? 1 : 2
  let peak = 0
  for (let i = 0; i < T.n; i++) peak = Math.max(peak, Math.abs(T.L[i]), Math.abs(T.R[i]))
  const norm = peak > 0 ? 0.65 / peak : 1 // about -1 dBFS
  const buf = Buffer.alloc(44 + T.n * ch * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + T.n * ch * 2, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(ch, 22)
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * ch * 2, 28); buf.writeUInt16LE(ch * 2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(T.n * ch * 2, 40)
  let o = 44
  for (let i = 0; i < T.n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, T.L[i] * norm)) * 32767), o); o += 2
    if (ch === 2) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, T.R[i] * norm)) * 32767), o); o += 2 }
  }
  writeFileSync(path, buf)
}

function toMp3(wav) {
  const mp3 = wav.replace(/\.wav$/, '.mp3')
  // The system's ffmpeg, else the one that comes with Remotion.
  const remotion = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe')
  for (const ffmpeg of ['ffmpeg', remotion]) {
    try {
      execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '192k', mp3])
      unlinkSync(wav)
      return mp3
    } catch {}
  }
  return wav // no ffmpeg: keep the .wav (and point src/components/Sfx.tsx and src/Ad.tsx at it)
}

const made = []
seed = 12345
writeWav(join(OUT, 'bgm.wav'), music(PLAN))
made.push(toMp3(join(OUT, 'bgm.wav')))
for (const [name, make] of Object.entries(sfx)) {
  seed = 777
  const p = join(OUT, `${name}.wav`)
  writeWav(p, make())
  made.push(toMp3(p))
}
console.log('wrote', made.filter(Boolean).length, 'files to', OUT, existsSync(join(OUT, 'bgm.mp3')) ? '(mp3)' : '(wav)')
