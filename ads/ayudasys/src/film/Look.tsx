import React from 'react'
import { AbsoluteFill, random, useCurrentFrame } from 'remotion'
import { timeOfDay } from './Street3D'

// The film look over the 3D frame: sun rays from the sun's side, a color grade for the time of
// day, a vignette, light film grain and letterbox bars.
export const FilmLook: React.FC<{ time: number; rays?: number; sunX?: number; bars?: boolean }> = ({ time, rays, sunX, bars = true }) => {
  const f = useCurrentFrame()
  const L = timeOfDay(time)
  const strength = rays ?? L.rays
  const fromLeft = (sunX ?? L.sun[0]) < 0
  const beams = [
    { a: 0, w: 140, o: 1 },
    { a: 7, w: 70, o: 0.7 },
    { a: 13, w: 220, o: 0.55 },
    { a: 21, w: 90, o: 0.65 },
    { a: 29, w: 160, o: 0.45 },
  ]
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {strength > 0.02 && (
        <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: strength * 0.8, overflow: 'hidden' }}>
          {beams.map((b, i) => {
            const sway = Math.sin(f / 70 + i * 1.7) * 1.2
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: fromLeft ? -300 : undefined,
                  right: fromLeft ? undefined : -300,
                  top: -260,
                  width: b.w,
                  height: 2200,
                  transformOrigin: 'top center',
                  transform: `rotate(${(fromLeft ? -1 : 1) * (38 + b.a + sway)}deg)`,
                  background: `linear-gradient(${L.sunColor}, ${L.sunColor}55 45%, transparent 85%)`,
                  filter: 'blur(28px)',
                  opacity: b.o * (0.75 + 0.25 * Math.sin(f / 40 + i)),
                }}
              />
            )
          })}
          <div style={{ position: 'absolute', [fromLeft ? 'left' : 'right']: -260, top: -300, width: 900, height: 900, borderRadius: '50%', background: `radial-gradient(${L.sunColor}cc, ${L.sunColor}00 65%)` }} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: L.grade, mixBlendMode: 'soft-light', opacity: 0.38 }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(10,6,20,0.55) 100%)' }} />
      <AbsoluteFill style={{ opacity: 0.07, backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${Math.floor(random(f) * 1000)}'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>")`, mixBlendMode: 'overlay' }} />
      {bars && (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 70, background: '#000' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 70, background: '#000' }} />
        </>
      )}
    </AbsoluteFill>
  )
}
