import React from 'react'
import { AbsoluteFill, continueRender, delayRender, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { drawIcon, gridUrl } from './pixel'

// 2D layers over the 3D film: speech bubbles, pixel icons, titles, boxes, transitions.
export const PIXEL = '"Press Start 2P", Poppins, monospace'
export const INK = '#1b1626'

if (typeof document !== 'undefined') {
  const handle = delayRender('pixel font')
  new FontFace('Press Start 2P', `url(${staticFile('fonts/press-start-2p-latin-400-normal.woff2')}) format('woff2')`)
    .load()
    .then((f) => {
      document.fonts.add(f)
      continueRender(handle)
    })
    .catch(() => continueRender(handle))
}

const pop = (frame: number, fps: number, at: number) => spring({ frame: frame - at, fps, config: { damping: 11, stiffness: 220 } })

// Speech bubble pointing down at (x, y); the text types itself.
export const Bubble: React.FC<{ at: number; until: number; text: string; x: number; y: number; size?: number; maxW?: number; color?: string }> = ({ at, until, text, x, y, size = 30, maxW = 720, color = '#ffffff' }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  if (f < at || f > until + 6) return null
  const p = pop(f, fps, at)
  const out = interpolate(f, [until, until + 6], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const shown = Math.min(text.length, Math.floor((f - at) * 1.6))
  const left = Math.max(30, Math.min(1080 - 30 - maxW, x - maxW / 2))
  return (
    <div style={{ position: 'absolute', left, width: maxW, bottom: 1920 - y + 34, display: 'flex', justifyContent: 'center', opacity: out, transform: `scale(${0.5 + 0.5 * p})`, transformOrigin: `${x - left}px 110%` }}>
      <div style={{ position: 'relative', background: color, border: `6px solid ${INK}`, padding: '22px 26px', fontFamily: PIXEL, fontSize: size, lineHeight: 1.55, color: INK, boxShadow: `8px 8px 0 rgba(0,0,0,0.35)`, textAlign: 'center' }}>
        <span>{text.slice(0, shown)}</span>
        <span style={{ visibility: 'hidden' }}>{text.slice(shown)}</span>
        <div style={{ position: 'absolute', left: Math.max(20, Math.min(maxW - 60, x - left - 20)) - 26, bottom: -30, width: 0, height: 0, borderLeft: '18px solid transparent', borderRight: '18px solid transparent', borderTop: `24px solid ${INK}` }} />
        <div style={{ position: 'absolute', left: Math.max(20, Math.min(maxW - 60, x - left - 20)) - 18, bottom: -18, width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: `14px solid ${color}` }} />
      </div>
    </div>
  )
}

// A pixel icon (bulb, sweat, coin…) that pops in and bobs, centered at (x, y).
export const Icon: React.FC<{ name: string; at: number; until?: number; x: number; y: number; scale?: number; rise?: number }> = ({ name, at, until = 1e9, x, y, scale = 10, rise = 0 }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  if (f < at || f > until) return null
  const p = pop(f, fps, at)
  const grid = drawIcon(name)
  const w = grid[0].length * scale, h = grid.length * scale
  const dy = rise ? -rise * Math.min(1, (f - at) / 24) : Math.sin((f - at) / 5) * 6
  const o = rise ? interpolate(f - at, [16, 26], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1
  return <Img src={gridUrl(`icon:${name}`, () => grid)} style={{ position: 'absolute', left: x - w / 2, top: y - h / 2 + dy, width: w, height: h, imageRendering: 'pixelated', transform: `scale(${p})`, opacity: o }} />
}

// Text in the pixel font with a hard shadow.
export const PixelText: React.FC<{ children: React.ReactNode; size?: number; color?: string; at?: number; style?: React.CSSProperties }> = ({ children, size = 48, color = '#ffffff', at = 0, style }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = pop(f, fps, at)
  if (f < at) return null
  return <div style={{ fontFamily: PIXEL, fontSize: size, color, lineHeight: 1.4, textAlign: 'center', textShadow: `${size / 8}px ${size / 8}px 0 ${INK}`, transform: `scale(${0.6 + 0.4 * p})`, opacity: Math.min(1, p * 1.5), ...style }}>{children}</div>
}

// A box around a found item, with its name and % match.
export const FoundBox: React.FC<{ at: number; until: number; x: number; y: number; w: number; h: number; label: string; score: number; above?: boolean }> = ({ at, until, x, y, w, h, label, score, above }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  if (f < at || f > until) return null
  const p = pop(f, fps, at)
  const n = Math.round(interpolate(f, [at, at + 14], [0, score], { extrapolateRight: 'clamp' }))
  return (
    <>
      <div style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, border: '6px solid #ffb02e', boxShadow: `0 0 0 4px ${INK}, inset 0 0 0 4px ${INK}`, transform: `scale(${1.3 - 0.3 * p})`, opacity: Math.min(1, p * 1.4) }} />
      <div style={{ position: 'absolute', left: x - 120, width: 240, ...(above ? { bottom: 1920 - (y - h / 2 - 12) } : { top: y + h / 2 + 12 }), textAlign: 'center', opacity: Math.min(1, p * 1.4) }}>
        <span style={{ display: 'inline-block', background: '#ffb02e', border: `4px solid ${INK}`, padding: '8px 10px', fontFamily: PIXEL, fontSize: 18, lineHeight: 1.4, color: INK }}>
          {label}
          <br />
          {n}%
        </span>
      </div>
    </>
  )
}

// Circle wipe: closes to black (or opens from black) around (x, y).
export const Iris: React.FC<{ from: number; to: number; open?: boolean; x?: number; y?: number }> = ({ from, to, open, x = 540, y = 960 }) => {
  const f = useCurrentFrame()
  if (open ? f > to : f < from) return null
  const t = interpolate(f, [from, to], open ? [0, 1] : [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const r = t * 2300
  return <AbsoluteFill style={{ background: `radial-gradient(circle at ${x}px ${y}px, transparent ${r}px, ${INK} ${r + 2}px)` }} />
}

// Darkens the scene behind the phone.
export const Dim: React.FC<{ from: number; to: number; amount?: number }> = ({ from, to, amount = 0.55 }) => {
  const f = useCurrentFrame()
  const o = interpolate(f, [from, from + 10, to - 10, to], [0, amount, amount, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return o > 0 ? <AbsoluteFill style={{ background: INK, opacity: o }} /> : null
}

// Letterbox caption at the bottom ("KINABUKASAN…").
export const Caption: React.FC<{ at: number; until: number; text: string }> = ({ at, until, text }) => {
  const f = useCurrentFrame()
  if (f < at || f > until) return null
  const o = interpolate(f, [at, at + 6, until - 6, until], [0, 1, 1, 0])
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 120, display: 'flex', justifyContent: 'center', opacity: o }}>
      <div style={{ background: INK, color: '#fde047', fontFamily: PIXEL, fontSize: 30, padding: '18px 26px', border: '4px solid #fde047' }}>{text}</div>
    </div>
  )
}
