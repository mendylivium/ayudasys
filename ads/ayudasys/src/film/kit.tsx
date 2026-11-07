import React from 'react'
import { AbsoluteFill, Easing, Html5Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Phone, Screen } from '../components/ui'
import { Actor, CamState, project, Vec } from './Street3D'
import { Pose2 } from './people'

// Building blocks for scenes: camera moves, people walking, subtitles, title cards, sound effects,
// a phone with real app screens, fades. All frame numbers are the scene's own (inside its Sequence).

export const SANS = 'Poppins, sans-serif'
const ease = Easing.inOut(Easing.cubic)

// A number eased through keyframes [frame, value].
export const num = (f: number, keys: [number, number][]) =>
  interpolate(f, keys.map((k) => k[0]), keys.map((k) => k[1]), { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })

// A camera move: keyframes of [frame, position, target], eased, with a little handheld drift
// (`shake` 0 = locked off, 1 = default).
export function camMove(f: number, keys: [number, Vec, Vec][], fov: number, shake = 1): CamState {
  const v = (i: number, which: 1 | 2) => num(f, keys.map((k) => [k[0], k[which][i]]))
  const d = shake * 0.012
  return {
    pos: [v(0, 1) + Math.sin(f / 37) * d, v(1, 1) + Math.sin(f / 29 + 1) * d, v(2, 1)],
    look: [v(0, 2) + Math.sin(f / 41 + 2) * d, v(1, 2) + Math.sin(f / 33) * d, v(2, 2)],
    fov,
  }
}

// A person moving along keyframes [frame, position] (linear, so walking speed is steady: about
// 0.04 m per frame looks natural). While moving they walk in side view, facing the way they go;
// otherwise they hold the scheduled pose ([frame, pose], last one wins), and idle blinks now and then.
// `id` is also the sprite (a key of PEOPLE in people.ts).
export function who(id: string, f: number, path: [number, Vec][], poses: [number, Pose2][] = [], hideAfter = 1e9): Actor {
  const at = (t: number): Vec => [0, 1, 2].map((i) => interpolate(t, path.map((k) => k[0]), path.map((k) => k[1][i]), { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })) as Vec
  const pos = at(f)
  const next = at(f + 1)
  const dx = next[0] - pos[0], dz = next[2] - pos[2]
  let pose: Pose2 = 'idle'
  for (const [t, p] of poses) if (f >= t) pose = p
  let flip = false
  if (Math.abs(dx) + Math.abs(dz) > 0.001) {
    pose = (['walk0', 'walk1', 'walk2', 'walk3'] as Pose2[])[Math.floor(f / 4) % 4]
    flip = dx < 0
  } else if (pose === 'idle' && f % 90 > 84) pose = 'blink'
  return { id, who: id, pose, pos, flip, hide: f >= hideAfter }
}

// Where someone's head is on screen (for icons over heads). Kids are shorter.
export const HEAD: Record<string, number> = { kid: 1.24 } // set this for every `kid: true` person
export const headAt = (c: CamState, a: Actor, up = 0.12) => project(c, [a.pos[0], a.pos[1] + (HEAD[a.who] ?? 1.6) + up - (a.pose.startsWith('sit') ? 0.2 : 0), a.pos[2]])

// A sound effect at a frame. Files: public/audio/<name>.mp3 (scripts/make-music.mjs makes whoosh, pop,
// tap, tick, beep, chaching, chime, shutter, scan, detect, check, sparkle, impact…; scripts/make-sfx.mjs
// makes 8-bit ones in public/audio/8bit: talk, coin, idea, cash, step, jump, select, done…).
export const Sfx: React.FC<{ at: number; name: string; volume?: number }> = ({ at, name, volume = 0.45 }) => (
  <Sequence from={at} durationInFrames={70} layout="none" name={`sfx:${name}`}>
    <Html5Audio src={staticFile(`audio/${name}.mp3`)} volume={volume} />
  </Sequence>
)
// Footsteps from `from` to `to`, one every `every` frames.
export const steps = (from: number, to: number, every = 9, volume = 0.12) =>
  Array.from({ length: Math.max(0, Math.floor((to - from) / every)) }, (_, i) => <Sfx key={`s${from}-${i}`} at={from + i * every} name="8bit/step" volume={volume} />)

// Film subtitles at the bottom: the speaker's name in their color, then the line.
export const SPEAKER_COLORS: Record<string, string> = {}
export const Line: React.FC<{ at: number; until: number; who: string; text: string }> = ({ at, until, who, text }) => {
  const f = useCurrentFrame()
  if (f < at || f > until) return null
  const o = interpolate(f, [at, at + 5, until - 5, until], [0, 1, 1, 0])
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 100, padding: '14px 36px', background: '#10201ce8', margin: '0 80px', borderRadius: 12, textAlign: 'center', opacity: o, fontFamily: SANS, fontWeight: 700, fontSize: 38, color: '#fff', textShadow: '0 3px 0 #000, 0 0 12px rgba(0,0,0,0.8), 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' }}>
      <span style={{ color: SPEAKER_COLORS[who] ?? '#ffd54a' }}>{who}: </span>
      {text}
    </div>
  )
}

// A big caption over the scene (a title, or a time card like "DAPIT-HAPON").
export const Card: React.FC<{ at: number; until: number; text: string; size?: number; top?: number }> = ({ at, until, text, size = 92, top = 120 }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  if (f < at || f > until) return null
  const p = spring({ frame: f - at, fps, config: { damping: 16, stiffness: 120 } })
  const o = interpolate(f, [until - 8, until], [1, 0], { extrapolateLeft: 'clamp' })
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, textAlign: 'center', fontFamily: SANS, fontWeight: 800, fontSize: size, letterSpacing: 2, color: '#fff', opacity: Math.min(o, p), transform: `translateY(${(1 - p) * 20}px)`, textShadow: '0 6px 24px rgba(0,0,0,0.55), 0 2px 0 rgba(0,0,0,0.4)' }}>
      {text}
    </div>
  )
}

// A phone with app screenshots (public/shots/<src>.png, 1080×1920), sliding in from the right.
// Screens can change over time, zoom (cams) and show taps; see Screen in components/ui.tsx.
export const PhoneIn: React.FC<{ at: number; until: number; screens: Screen[]; scale?: number; x?: number; y?: number }> = ({ at, until, screens, scale = 0.78, x = 1260, y = 85 }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  if (f < at || f > until + 12) return null
  const p = spring({ frame: f - at, fps, config: { damping: 16, stiffness: 110 } })
  const out = interpolate(f, [until, until + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translateX(${(1 - p) * 900 + out * 900}px) scale(${scale}) rotate(${(1 - p) * 6}deg)`, transformOrigin: '0 0' }}>
      <Phone screens={screens} style={{ boxShadow: '0 40px 90px rgba(0,0,0,0.55), inset 0 0 0 3px #44403c' }} />
    </div>
  )
}

// Darkens the left of the frame (for text beside the phone).
export const Dim: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const f = useCurrentFrame()
  const o = interpolate(f, [from, from + 12, to - 12, to], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return o > 0 ? <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(10,8,20,0.95), rgba(10,8,20,0.5) 60%, rgba(10,8,20,0.2))', opacity: o * 0.9 }} /> : null
}

// From black at the start of a scene, or to black at its end (`out`).
export const Fade: React.FC<{ from?: number; to?: number; out?: boolean; color?: string }> = ({ from = 0, to = 14, out, color = '#000' }) => {
  const f = useCurrentFrame()
  const o = interpolate(f, [from, to], out ? [0, 1] : [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return o > 0 ? <AbsoluteFill style={{ background: color, opacity: o }} /> : null
}
