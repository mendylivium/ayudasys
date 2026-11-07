import React from 'react'
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, sans } from '../theme'

// A spring from 0 to 1 starting at `delay` frames (relative to the current Sequence).
export function useIn(delay = 0, damping = 14, stiffness = 140) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - delay, fps, config: { damping, stiffness, mass: 0.9 } })
}

// Fades a whole scene in/out at its edges so cuts feel smooth.
export const SceneFade: React.FC<{ dur: number; children: React.ReactNode; inF?: number; outF?: number }> = ({ dur, children, inF = 6, outF = 8 }) => {
  const f = useCurrentFrame()
  const o = Math.min(inF > 0 ? interpolate(f, [0, inF], [0, 1], { extrapolateRight: 'clamp' }) : 1, interpolate(f, [dur - outF, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
}

// Soft brand background with slowly drifting blobs (1080×1920).
export const Background: React.FC<{ tone?: 'light' | 'teal' | 'paper' | 'dark' }> = ({ tone = 'light' }) => {
  const f = useCurrentFrame()
  const base =
    tone === 'teal' ? `linear-gradient(160deg, ${C.teal}, ${C.tealDark})` : tone === 'dark' ? 'linear-gradient(160deg, #1c1917, #0b3b37)' : tone === 'paper' ? '#fbf7ec' : `linear-gradient(170deg, #ffffff, ${C.stone})`
  const dark = tone === 'teal' || tone === 'dark'
  const blob = (x: number, y: number, size: number, color: string, speed: number, phase: number) => (
    <div style={{ position: 'absolute', left: x + Math.sin(f / speed + phase) * 40, top: y + Math.cos(f / (speed * 1.3) + phase) * 30, width: size, height: size, borderRadius: '50%', background: color, filter: 'blur(90px)', opacity: dark ? 0.35 : 0.55 }} />
  )
  return (
    <AbsoluteFill style={{ background: base, overflow: 'hidden' }}>
      {tone !== 'paper' && (
        <>
          {blob(-250, -150, 700, dark ? '#14b8a6' : C.tealLight, 70, 0)}
          {blob(500, 1300, 800, dark ? '#2dd4bf' : C.amberLight, 90, 2)}
          {blob(600, 300, 500, dark ? '#0ea5e9' : '#e0f2fe', 80, 4)}
        </>
      )}
    </AbsoluteFill>
  )
}

// Words pop in one after another.
export const Headline: React.FC<{
  text: string
  at?: number
  stagger?: number
  size?: number
  color?: string
  highlight?: Record<string, string> // word (letters/digits only) → color
  align?: 'left' | 'center'
  weight?: number
  style?: React.CSSProperties
}> = ({ text, at = 0, stagger = 4, size = 88, color = C.ink, highlight = {}, align = 'center', weight = 800, style }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <div style={{ fontFamily: sans, fontSize: size, fontWeight: weight, lineHeight: 1.1, color, textAlign: align, letterSpacing: -1, ...style }}>
      {text.split(' ').map((w, i) => {
        const p = spring({ frame: frame - at - i * stagger, fps, config: { damping: 12, stiffness: 160 } })
        const key = w.replace(/[^\p{L}\p{N}₱½¼-]/gu, '')
        return (
          <span key={i} style={{ display: 'inline-block', whiteSpace: 'nowrap', marginRight: size * 0.25, opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * size * 0.6}px) scale(${0.85 + 0.15 * p})`, color: highlight[key] ?? color }}>
            {w}
          </span>
        )
      })}
    </div>
  )
}

export const Sub: React.FC<{ children: React.ReactNode; at?: number; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, at = 0, size = 40, color = '#57534e', style }) => {
  const p = useIn(at, 16, 120)
  return <div style={{ fontFamily: sans, fontWeight: 600, fontSize: size, color, opacity: p, transform: `translateY(${(1 - p) * 20}px)`, lineHeight: 1.35, textAlign: 'center', ...style }}>{children}</div>
}

// A rounded pill with an icon that pops in.
export const Chip: React.FC<{ at: number; icon?: React.ReactNode; children: React.ReactNode; color?: string; bg?: string; size?: number; style?: React.CSSProperties }> = ({ at, icon, children, color = C.teal, bg = '#ffffff', size = 36, style }) => {
  const p = useIn(at, 11, 180)
  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 14, padding: `${size * 0.42}px ${size * 0.8}px`, borderRadius: 999, background: bg, color,
        fontFamily: sans, fontWeight: 700, fontSize: size, boxShadow: '0 12px 34px rgba(28,25,23,0.16)', border: `2px solid ${color}22`,
        opacity: Math.min(1, p * 1.4), transform: `scale(${0.6 + 0.4 * p}) translateY(${(1 - p) * 20}px)`, whiteSpace: 'nowrap', ...style,
      }}
    >
      {icon}
      {children}
    </div>
  )
}

// Step number and title above the phone ("1 Kunan ng litrato").
export const Step: React.FC<{ at: number; n: number; title: string; color?: string }> = ({ at, n, title, color = C.ink }) => {
  const p = useIn(at, 12, 160)
  return (
    <div style={{ display: 'flex', gap: 26, alignItems: 'center', justifyContent: 'center', opacity: Math.min(1, p * 1.3), transform: `scale(${0.8 + 0.2 * p})` }}>
      <div style={{ width: 96, height: 96, borderRadius: 30, background: C.amber, color: '#fff', fontFamily: sans, fontWeight: 800, fontSize: 60, display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 12px 30px rgba(202,138,4,0.35)' }}>{n}</div>
      <div style={{ fontFamily: sans, fontWeight: 800, fontSize: 70, color, letterSpacing: -1, lineHeight: 1.05 }}>{title}</div>
    </div>
  )
}

// ---- The phone with app screens (1080×1920 screenshots) and a moving "camera" ----

export const SCREEN_W = 640
export const SCREEN_H = (SCREEN_W * 1920) / 1080
const PAD = 16

export type Cam = { f: number; x: number; y: number; z: number } // focus point (0–1 of the screen) and zoom at frame f
export type Tap = { f: number; x: number; y: number } // in screenshot pixels (1080×1920)
export type Screen = { src: string; from?: number; to?: number; cams?: Cam[]; taps?: Tap[]; wipe?: boolean }

const ease = Easing.bezier(0.45, 0, 0.2, 1)
export function camAt(cams: Cam[], f: number) {
  if (f <= cams[0].f) return cams[0]
  for (let i = 1; i < cams.length; i++) {
    const a = cams[i - 1], b = cams[i]
    if (f <= b.f) {
      const t = ease((f - a.f) / (b.f - a.f))
      return { f, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }
    }
  }
  return cams[cams.length - 1]
}
// Where the screen's image sits for a camera position (left, top, scale vs. 1080 px).
export function placeAt(c: { x: number; y: number; z: number }) {
  const iw = SCREEN_W * c.z, ih = SCREEN_H * c.z
  return { left: Math.min(0, Math.max(SCREEN_W - iw, SCREEN_W / 2 - c.x * iw)), top: Math.min(0, Math.max(SCREEN_H - ih, SCREEN_H / 2 - c.y * ih)), k: iw / 1080, iw, ih }
}

// One screenshot, shown from `from` to `to` with a short cross-fade (or a wipe from the left).
const ScreenShot: React.FC<Screen> = ({ src, from = 0, to = 1e9, cams = [{ f: 0, x: 0.5, y: 0.5, z: 1 }], taps = [], wipe }) => {
  const f = useCurrentFrame()
  if (f < from - 1 || f > to + 6) return null
  const fadeIn = wipe ? 1 : interpolate(f, [from, from + 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const o = Math.min(fadeIn, interpolate(f, [to, to + 6], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
  const reveal = wipe ? interpolate(f, [from, from + 22], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }) : 100
  const p = placeAt(camAt(cams, f))
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o, overflow: 'hidden', clipPath: `inset(0 ${100 - reveal}% 0 0)` }}>
      <div style={{ position: 'absolute', left: p.left, top: p.top, width: p.iw, height: p.ih }}>
        <Img src={staticFile(`shots/${src}.png`)} style={{ width: '100%', height: '100%', display: 'block' }} />
        {taps.map((t, i) => (
          <TapDot key={i} at={t.f} x={t.x * p.k} y={t.y * p.k} />
        ))}
      </div>
      {wipe && reveal > 0 && reveal < 100 && (
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${reveal}%`, width: 10, marginLeft: -5, background: 'linear-gradient(#fde68a, #fff, #fde68a)', boxShadow: '0 0 30px 12px rgba(253,230,138,0.9)' }} />
      )}
    </div>
  )
}

// A phone (portrait) showing app screens; `children` draw over the screen (same coordinates).
export const Phone: React.FC<{ screens: Screen[]; children?: React.ReactNode; style?: React.CSSProperties; flashAt?: number; radius?: number }> = ({ screens, children, style, flashAt, radius = 56 }) => {
  const f = useCurrentFrame()
  const flash = flashAt === undefined ? 0 : interpolate(f - flashAt, [0, 2, 10], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ position: 'absolute', width: SCREEN_W + PAD * 2, padding: PAD, borderRadius: 72, background: '#1c1917', boxShadow: '0 50px 100px rgba(0,0,0,0.35), inset 0 0 0 3px #44403c', ...style }}>
      <div style={{ position: 'relative', width: SCREEN_W, height: SCREEN_H, borderRadius: radius, overflow: 'hidden', background: '#fff' }}>
        {screens.map((s, i) => (
          <ScreenShot key={i} {...s} />
        ))}
        {children}
        {flash > 0 && <AbsoluteFill style={{ background: '#fff', opacity: flash }} />}
      </div>
    </div>
  )
}
// The usual spot: centered, below the headline.
export const PHONE_LEFT = (1080 - SCREEN_W - PAD * 2) / 2
export const PHONE_TOP = 660

// A finger tap: dot that presses, then a ripple ring.
export const TapDot: React.FC<{ at: number; x: number; y: number }> = ({ at, x, y }) => {
  const f = useCurrentFrame()
  const d = f - at
  if (d < -8 || d > 22) return null
  const appear = interpolate(d, [-8, 0], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const press = d < 0 ? 1 : interpolate(d, [0, 3, 8], [1, 0.8, 1], { extrapolateRight: 'clamp' })
  const fade = interpolate(d, [10, 22], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const ring = interpolate(d, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <>
      <div style={{ position: 'absolute', left: x - 32, top: y - 32, width: 64, height: 64, borderRadius: '50%', background: 'rgba(15,118,110,0.35)', border: '5px solid rgba(255,255,255,0.95)', boxShadow: '0 6px 20px rgba(0,0,0,0.3)', opacity: appear * fade, transform: `scale(${press})` }} />
      {d >= 0 && <div style={{ position: 'absolute', left: x - 32, top: y - 32, width: 64, height: 64, borderRadius: '50%', border: `6px solid ${C.amber}`, opacity: (1 - ring) * 0.9, transform: `scale(${1 + ring * 1.8})` }} />}
    </>
  )
}

// Number that counts up between frames [from, to].
export const Counter: React.FC<{ value: number; from: number; to: number; prefix?: string; suffix?: string; decimals?: number; style?: React.CSSProperties }> = ({ value, from, to, prefix = '', suffix = '', decimals = 0, style }) => {
  const f = useCurrentFrame()
  const v = interpolate(f, [from, to], [0, value], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  return <span style={style}>{prefix + v.toLocaleString('en-PH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix}</span>
}

// A made-up product (public/products), 400×520 at scale 1.
export const Product: React.FC<{ name: string; w: number; style?: React.CSSProperties }> = ({ name, w, style }) => (
  <Img src={staticFile(`products/${name.replace(/\W+/g, '-').toLowerCase()}.png`)} style={{ width: w, height: (w * 520) / 400, display: 'block', filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.25))', ...style }} />
)
