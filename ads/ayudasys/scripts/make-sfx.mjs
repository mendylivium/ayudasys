// 8-bit sound effects (original, made by code), and an optional chiptune track.
//   node scripts/make-sfx.mjs   → public/audio/8bit/<sound>.mp3 and public/audio/8bit/chiptune.mp3
//
// The chiptune is 120 BPM (1 bar = 2 s = 60 frames), 68 s: intro 0–6, a tense part 6–16 (A minor),
// a stop and build 16–20, the main theme 20–38, faster 38–50, a lullaby 50–60, end 60–68. Use it
// instead of bgm.mp3 for a game-like film (lay your scenes out to these times).
import { writeFileSync, mkdirSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '..', 'public', 'audio', '8bit')
mkdirSync(OUT, { recursive: true })
const SR = 44100
const BEAT = 0.5
const LEN = 68

let seed = 4242
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)

class Track {
  constructor(seconds) {
    this.n = Math.ceil(seconds * SR)
    this.L = new Float32Array(this.n)
    this.R = new Float32Array(this.n)
  }
  add(at, dur, fn, gain = 1, pan = 0) {
    const s = Math.max(0, Math.floor(at * SR))
    const e = Math.min(this.n, Math.floor((at + dur) * SR))
    const gl = gain * (1 - Math.max(0, pan)), gr = gain * (1 + Math.min(0, pan))
    for (let i = s; i < e; i++) {
      const v = fn((i - s) / SR)
      this.L[i] += v * gl
      this.R[i] += v * gr
    }
  }
}

// ---- 8-bit voices ----
const pulse = (fr, duty) => (t) => ((t * fr) % 1 < duty ? 1 : -1)
const tri = (fr) => (t) => {
  const p = (t * fr) % 1
  return Math.round((p < 0.5 ? 4 * p - 1 : 3 - 4 * p) * 8) / 8 // 16 steps, like the NES
}
const decay = (fn, d, a = 0.003) => (t) => fn(t) * (t < a ? t / a : Math.exp(-(t - a) * d))
const gate = (fn, len, r = 0.02) => (t) => fn(t) * (t < len ? 1 : Math.max(0, 1 - (t - len) / r))
function noise(rate = 1) {
  let v = 0, last = -1
  return (t) => {
    const k = Math.floor(t * 20000 * rate)
    if (k !== last) { v = rand(); last = k }
    return v
  }
}
const kick = (t) => Math.sin(2 * Math.PI * (60 * t + (180 / 30) * (1 - Math.exp(-30 * t)))) * Math.exp(-t * 14)
const snare = () => { const n = noise(0.8); return (t) => n(t) * Math.exp(-t * 22) }
const hat = () => { const n = noise(2); return (t) => n(t) * Math.exp(-t * 70) }

// ---- music ----
const MAJOR = [
  { root: 48, tones: [60, 64, 67] }, // C
  { root: 43, tones: [59, 62, 67] }, // G
  { root: 45, tones: [57, 60, 64] }, // Am
  { root: 41, tones: [57, 60, 65] }, // F
]
const TENSE = [
  { root: 45, tones: [57, 60, 64] }, // Am
  { root: 41, tones: [57, 60, 65] }, // F
  { root: 43, tones: [55, 59, 62] }, // G
  { root: 40, tones: [56, 59, 64] }, // E
]
// Main hook: 4 bars of (beat, midi, beats)
const HOOK = [
  [0, 76, 1], [1, 79, 0.5], [1.5, 81, 0.5], [2, 79, 1], [3, 76, 0.5], [3.5, 74, 0.5],
  [4, 74, 1], [5, 71, 0.5], [5.5, 74, 0.5], [6, 79, 1.5], [7.5, 77, 0.5],
  [8, 76, 1], [9, 81, 0.5], [9.5, 79, 0.5], [10, 76, 1], [11, 72, 0.5], [11.5, 74, 0.5],
  [12, 77, 0.5], [12.5, 76, 0.5], [13, 74, 0.5], [13.5, 72, 0.5], [14, 74, 0.5], [14.5, 76, 0.5], [15, 72, 1],
]
const TENSE_LEAD = [[0, 69, 0.5], [0.5, 72, 0.5], [1, 76, 0.5], [2, 74, 0.5], [2.5, 72, 0.5], [3, 71, 1]]

function music() {
  const T = new Track(LEN)
  const bars = LEN / 2
  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * 2
    if (t0 >= 66) break
    const sec = t0 < 6 ? 'intro' : t0 < 16 ? 'line' : t0 < 20 ? 'idea' : t0 < 38 ? 'main' : t0 < 50 ? 'rush' : t0 < 60 ? 'night' : 'end'
    const ch = (sec === 'line' ? TENSE : MAJOR)[bar % 4]
    // arpeggio (12.5% pulse), everywhere but the idea's stop
    if (sec !== 'idea' || t0 >= 18) {
      const step = sec === 'rush' ? 0.125 : 0.25
      const notes = [ch.tones[0], ch.tones[1], ch.tones[2], ch.tones[1] + 12]
      for (let k = 0; k < 2 / step; k++) {
        const m = notes[k % 4] + (sec === 'night' ? 0 : 12)
        T.add(t0 + k * step, step, decay(pulse(mtof(m), 0.125), sec === 'night' ? 6 : 10), sec === 'night' ? 0.07 : 0.05, k % 2 ? 0.3 : -0.3)
      }
    }
    // bass (triangle)
    if (sec !== 'intro' && sec !== 'night' && !(sec === 'idea' && t0 < 18)) {
      const step = sec === 'line' || sec === 'rush' ? 0.25 : 0.5
      for (let k = 0; k < 2 / step; k++) T.add(t0 + k * step, step, gate(tri(mtof(ch.root + (k % 2 && sec !== 'line' ? 12 : 0))), step * 0.8), 0.32)
    }
    if (sec === 'night') T.add(t0, 2, gate(tri(mtof(ch.root + 12)), 1.8, 0.2), 0.22)
    // drums
    if (sec === 'line' || sec === 'main' || sec === 'rush' || (sec === 'end' && t0 < 64)) {
      for (let b = 0; b < 4; b++) {
        T.add(t0 + b * BEAT, 0.3, kick, b % 2 === 0 || sec === 'rush' ? 0.55 : 0.0)
        if (b % 2 === 1) T.add(t0 + b * BEAT, 0.2, snare(), 0.22)
        const hats = sec === 'rush' ? 4 : 2
        for (let h = 0; h < hats; h++) T.add(t0 + b * BEAT + (h * BEAT) / hats, 0.05, hat(), h % 2 ? 0.05 : 0.08)
      }
    }
    // the idea: build with a snare roll into 20 s
    if (sec === 'idea' && t0 >= 18) for (let k = 0; k < 16; k++) T.add(t0 + k * 0.125, 0.1, snare(), 0.05 + 0.25 * (k / 16))
    // lead
    if (sec === 'line') {
      for (const [b, m, len] of TENSE_LEAD) T.add(t0 + b * BEAT, len * BEAT, gate(pulse(mtof(m + (bar % 2 ? -2 : 0)), 0.25), len * BEAT * 0.7), 0.09)
    }
    if (sec === 'main' || sec === 'rush' || sec === 'end' || sec === 'night') {
      const loopBar = bar % 4
      const up = sec === 'rush' ? 12 : sec === 'night' ? -12 : 0
      for (const [b, m, len] of HOOK)
        if (b >= loopBar * 4 && b < loopBar * 4 + 4) {
          const at = t0 + (b - loopBar * 4) * BEAT
          const voice = sec === 'night' ? tri(mtof(m + up)) : pulse(mtof(m + up), 0.5)
          T.add(at, len * BEAT, gate(voice, len * BEAT * 0.85), sec === 'night' ? 0.16 : 0.085, 0.05)
          if (sec === 'main' || sec === 'end') T.add(at + 0.12, len * BEAT, gate(pulse(mtof(m + up), 0.25), len * BEAT * 0.6), 0.03, -0.4) // echo
        }
    }
  }
  // end: final chord at 66 s ringing out
  for (const m of [60, 64, 67, 72]) T.add(66, 2, decay(pulse(mtof(m), 0.25), 1.6), 0.07)
  T.add(66, 2, decay(tri(mtof(36)), 1.2), 0.35)
  T.add(66, 0.4, kick, 0.6)
  // fade the very end
  for (let i = 0; i < T.n; i++) {
    const t = i / SR
    const f = t > 67.3 ? Math.max(0, (LEN - t) / 0.7) : 1
    T.L[i] = Math.tanh(T.L[i] * 1.2) * f
    T.R[i] = Math.tanh(T.R[i] * 1.2) * f
  }
  return T
}

// ---- sound effects ----
const seq = (T, notes, step, duty = 0.5, g = 0.5, d = 18) => notes.forEach((m, k) => T.add(k * step, step * 1.6, decay(pulse(mtof(m), duty), d), g))
const sfx = {
  talk: () => { const T = new Track(0.45); [79, 84, 81, 86, 83].forEach((m, k) => T.add(k * 0.08, 0.05, pulse(mtof(m), 0.25), 0.25)); return T },
  coin: () => { const T = new Track(0.6); T.add(0, 0.08, pulse(mtof(83), 0.5), 0.4); T.add(0.08, 0.5, decay(pulse(mtof(88), 0.5), 6), 0.4); return T },
  idea: () => { const T = new Track(0.8); seq(T, [72, 76, 79, 84, 88, 91, 96], 0.05, 0.5, 0.35, 8); return T },
  scan: () => {
    const T = new Track(1.0)
    T.add(0, 1.0, (t) => pulse(300 + 1400 * t, 0.5)(t) * (0.5 + 0.5 * Math.sign(Math.sin(2 * Math.PI * 24 * t))) * Math.sin(Math.PI * t), 0.2)
    return T
  },
  detect: () => { const T = new Track(0.3); T.add(0, 0.06, pulse(mtof(91), 0.5), 0.3); T.add(0.06, 0.2, decay(pulse(mtof(96), 0.5), 14), 0.3); return T },
  select: () => { const T = new Track(0.1); T.add(0, 0.08, decay(pulse(mtof(88), 0.25), 30), 0.4); return T },
  jump: () => { const T = new Track(0.25); T.add(0, 0.22, (t) => pulse(300 + 2400 * t, 0.5)(t) * (1 - t / 0.22), 0.3); return T },
  womp: () => {
    const T = new Track(1.2)
    T.add(0, 0.35, (t) => pulse(mtof(62 - t * 3), 0.5)(t), 0.25)
    T.add(0.4, 0.75, (t) => pulse(mtof(61 - t * 6), 0.5)(t) * (1 - t / 0.75), 0.25)
    return T
  },
  cash: () => {
    const T = new Track(1.0)
    const n = noise(1)
    T.add(0, 0.1, (t) => n(t) * Math.exp(-t * 40), 0.3)
    T.add(0.1, 0.08, pulse(mtof(83), 0.5), 0.35)
    T.add(0.18, 0.7, decay(pulse(mtof(88), 0.5), 5), 0.35)
    T.add(0.3, 0.6, decay(pulse(mtof(95), 0.5), 6), 0.2)
    return T
  },
  step: () => { const T = new Track(0.05); const n = noise(0.6); T.add(0, 0.05, (t) => n(t) * Math.exp(-t * 90), 0.4); return T },
  whoosh: () => {
    const T = new Track(0.5)
    const n = noise(1)
    let lp = 0
    T.add(0, 0.5, (t) => { lp += (n(t) - lp) * (0.05 + 0.6 * Math.sin(Math.PI * t / 0.5)); return lp * Math.sin(Math.PI * t / 0.5) }, 0.6)
    return T
  },
  done: () => { const T = new Track(1.0); seq(T, [72, 76, 79, 84], 0.09, 0.5, 0.35, 5); return T },
  tap: () => { const T = new Track(0.05); T.add(0, 0.04, decay(pulse(1500, 0.5), 80), 0.3); return T },
  pop: () => { const T = new Track(0.15); T.add(0, 0.12, (t) => pulse(200 + 1800 * t, 0.5)(t) * Math.exp(-t * 25), 0.35); return T },
}

// ---- output (WAV, then MP3 with the system's or Remotion's ffmpeg) ----
function write(name, T) {
  let peak = 0
  for (let i = 0; i < T.n; i++) peak = Math.max(peak, Math.abs(T.L[i]), Math.abs(T.R[i]))
  const norm = peak > 0 ? 0.89 / peak : 1
  const buf = Buffer.alloc(44 + T.n * 4)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + T.n * 4, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22)
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(T.n * 4, 40)
  for (let i = 0, o = 44; i < T.n; i++, o += 4) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, T.L[i] * norm)) * 32767), o)
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, T.R[i] * norm)) * 32767), o + 2)
  }
  const wav = join(OUT, `${name}.wav`)
  writeFileSync(wav, buf)
  for (const ffmpeg of ['ffmpeg', join(HERE, '..', 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe')]) {
    try {
      execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '192k', join(OUT, `${name}.mp3`)])
      unlinkSync(wav)
      return
    } catch {}
  }
  throw Error('no ffmpeg to make MP3')
}

write('chiptune', music())
for (const [name, make] of Object.entries(sfx)) {
  seed = 99
  write(name, make())
}
console.log('wrote', 1 + Object.keys(sfx).length, 'files to', OUT)
