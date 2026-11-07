// Higher-resolution pixel-art characters (64×112) for the 16:9 film. Drawn by code with shapes on a
// small canvas, then turned into clean pixel art: colors snapped to the character's palette, cel
// shading on the side away from the light, darker lines between parts, and a dark outline.

export type View = 'front' | 'side' | 'back'
export type Pose2 =
  | 'idle' | 'blink' | 'talk' | 'happy' | 'think' | 'phone' | 'pay' | 'wave' | 'worried' // front
  | 'walk0' | 'walk1' | 'walk2' | 'walk3' | 'sideIdle' | 'sideTalk' // side (facing right)
  | 'back' | 'backPhone' // back
  | 'sitPhone' | 'sitHappy' // front, sitting

export type Person = {
  skin: string
  hair: string
  hairStyle: 'bun' | 'short' | 'pony' | 'bald' | 'cap'
  top: string
  topDots?: string
  sleeveless?: boolean
  dress?: boolean
  bottom: string
  shoes: string
  cap?: string
  apron?: string
  glasses?: boolean
  mustache?: boolean
  belly?: boolean
  kid?: boolean
  iris?: string
}

// A sample cast; add your own people (any key) and use the key as `who` in scenes.
export const PEOPLE: Record<string, Person> = {
  owner: { skin: '#c98b62', hair: '#2b1a14', hairStyle: 'bun', top: '#f3ede3', bottom: '#183e4b', shoes: '#263b36' },
  kid: { skin: '#b8794c', hair: '#1e1410', hairStyle: 'cap', cap: '#d93030', top: '#f2c230', bottom: '#3555a5', shoes: '#f4f4f4', kid: true },
  uncle: { skin: '#a86a3e', hair: '#2b2b2b', hairStyle: 'bald', top: '#f3f1ea', sleeveless: true, bottom: '#6b4a2b', shoes: '#2f7d4f', mustache: true, belly: true },
  woman: { skin: '#d9a173', hair: '#4a2a1a', hairStyle: 'pony', top: '#2fa3a0', bottom: '#2c3e75', shoes: '#e2433b' },
  grandma: { skin: '#c48a62', hair: '#d8d4cf', hairStyle: 'bun', top: '#8e5bb5', topDots: '#dcc6f0', dress: true, bottom: '#8e5bb5', shoes: '#6b5444', glasses: true },
  man: { skin: '#9c6238', hair: '#15100c', hairStyle: 'short', top: '#3f9a4a', bottom: '#4d525e', shoes: '#2b2b2b' },
}

export const PW = 64
export const PH = 112
const OUT = '#2a1c1f'
const EYE_W = '#fbf7f2'
const MOUTH = '#7a2b33'
const TONGUE = '#d9606a'
const BLUSH = '#e8908a'
const PHONE = '#2a2f3a'
const SCREEN = '#7fe3d5'
const BILL = '#7cc576'
const GLASS = '#3a2c2a'
const DETAIL = new Set([OUT, EYE_W, MOUTH, TONGUE, BLUSH, SCREEN, GLASS, '#3a2418', '#4a2a1a'])

const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
export const mixHex = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b)
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t)
}

// ---- drawing ----
class Pen {
  used = new Set<string>()
  constructor(public c: CanvasRenderingContext2D) {}
  col(x: string) {
    this.used.add(x)
    return x
  }
  ell(x: number, y: number, rx: number, ry: number, color: string, rot = 0) {
    const c = this.c
    c.fillStyle = this.col(color)
    c.beginPath()
    c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
    c.fill()
  }
  rect(x: number, y: number, w: number, h: number, r: number, color: string) {
    const c = this.c
    c.fillStyle = this.col(color)
    c.beginPath()
    c.roundRect(x, y, w, h, r)
    c.fill()
  }
  limb(pts: [number, number][], w: number, color: string) {
    const c = this.c
    c.strokeStyle = this.col(color)
    c.lineWidth = w
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.beginPath()
    c.moveTo(...pts[0])
    for (const p of pts.slice(1)) c.lineTo(...p)
    c.stroke()
  }
  path(color: string, build: (c: CanvasRenderingContext2D) => void, stroke?: number) {
    const c = this.c
    c.beginPath()
    build(c)
    if (stroke) {
      c.strokeStyle = this.col(color)
      c.lineWidth = stroke
      c.lineCap = 'round'
      c.stroke()
    } else {
      c.fillStyle = this.col(color)
      c.fill()
    }
  }
}

type Body = { headY: number; torsoTop: number; torsoBot: number; legTop: number; legBot: number; dy: number }
function body(p: Person, sit: boolean): Body {
  const b = p.kid ? { headY: 30, torsoTop: 50, torsoBot: 70, legTop: 69, legBot: 84, dy: 22 } : { headY: 30, torsoTop: 50, torsoBot: 80, legTop: 79, legBot: 102, dy: 2 }
  if (sit) return { ...b, legBot: b.legTop + 10, dy: b.dy + (b.legBot - b.legTop) - 10 }
  return b
}

// Eyes, brows, nose, mouth (front view).
function face(pen: Pen, p: Person, pose: Pose2, cy: number) {
  const ey = cy + 5
  const iris = p.iris ?? '#3a2418'
  const browC = mixHex(p.hair === '#d8d4cf' ? '#8a8580' : p.hair, '#000000', 0.1)
  const happy = pose === 'happy' || pose === 'wave' || pose === 'sitHappy'
  const closed = pose === 'blink'
  for (const ex of [24, 40]) {
    if (happy) {
      pen.path(OUT, (c) => (c.moveTo(ex - 4, ey + 1), c.quadraticCurveTo(ex, ey - 4, ex + 4, ey + 1)), 1.6)
    } else if (closed) {
      pen.path(OUT, (c) => (c.moveTo(ex - 4, ey), c.lineTo(ex + 4, ey)), 1.6)
    } else {
      const look = pose === 'think' ? [-1, -1] : pose === 'phone' || pose === 'sitPhone' ? [0, 1.5] : [0, 0.5]
      pen.ell(ex, ey, 4, 3.6, EYE_W)
      pen.ell(ex + look[0], ey + look[1], 2.4, 2.8, iris)
      pen.ell(ex + look[0] - 0.8, ey + look[1] - 1, 0.9, 0.9, '#ffffff')
      // upper lid: a bit heavy, for the sleepy-cool look; lower when looking at the phone
      const lid = pose === 'phone' || pose === 'sitPhone' ? 1.6 : pose === 'worried' ? 0.4 : 1.0
      pen.path(OUT, (c) => (c.moveTo(ex - 4.6, ey - 3.6 + lid), c.quadraticCurveTo(ex, ey - 5.2 + lid, ex + 4.6, ey - 3.0 + lid)), 1.8)
    }
    // brows
    const by = ey - 7 - (pose === 'think' || pose === 'worried' ? 1.5 : 0)
    const tilt = pose === 'worried' ? (ex < 32 ? 1.5 : -1.5) : 0
    pen.path(browC, (c) => (c.moveTo(ex - 4, by + tilt), c.lineTo(ex + 4, by - tilt)), 1.7)
  }
  if (p.glasses) {
    for (const ex of [24, 40]) pen.path(GLASS, (c) => c.ellipse(ex, ey, 5.5, 5, 0, 0, Math.PI * 2), 1.2)
    pen.path(GLASS, (c) => (c.moveTo(29.5, ey - 1), c.lineTo(34.5, ey - 1)), 1.2)
  }
  pen.ell(19, ey + 6, 3, 1.6, BLUSH)
  pen.ell(45, ey + 6, 3, 1.6, BLUSH)
  pen.path(mixHex(p.skin, '#5a2f22', 0.35), (c) => (c.moveTo(32, ey + 3), c.lineTo(33, ey + 6), c.lineTo(31, ey + 6.5)), 1.1) // nose
  if (p.mustache) pen.path(p.hair, (c) => (c.moveTo(26, ey + 9), c.quadraticCurveTo(32, ey + 6.5, 38, ey + 9)), 2.6)
  const my = ey + 11
  if (happy) {
    pen.path(MOUTH, (c) => (c.moveTo(27, my - 1), c.quadraticCurveTo(32, my + 6, 37, my - 1), c.closePath()))
    pen.ell(32, my + 2, 2.4, 1.2, TONGUE)
  } else if (pose === 'talk' || pose === 'sideTalk') {
    pen.ell(32, my, 3, 2.6, MOUTH)
    pen.ell(32, my + 1.2, 1.8, 1, TONGUE)
  } else if (pose === 'think') {
    pen.ell(34, my, 1.6, 1.4, MOUTH)
  } else if (pose === 'worried') {
    pen.path(MOUTH, (c) => (c.moveTo(28, my + 1), c.quadraticCurveTo(32, my - 2, 36, my + 1)), 1.4)
  } else {
    pen.path(MOUTH, (c) => (c.moveTo(29, my), c.quadraticCurveTo(32, my + 1.6, 35, my)), 1.4)
  }
}

function hairBack(pen: Pen, p: Person, view: View, cy: number) {
  if (p.hairStyle === 'bun') pen.ell(view === 'side' ? 24 : 32, cy - 20, 8, 6.5, p.hair)
  if (p.hairStyle === 'pony') {
    if (view === 'side') pen.path(p.hair, (c) => (c.moveTo(18, cy - 8), c.quadraticCurveTo(4, cy + 6, 10, cy + 24), c.quadraticCurveTo(16, cy + 10, 22, cy + 2)))
    else pen.path(p.hair, (c) => (c.moveTo(42, cy - 10), c.quadraticCurveTo(58, cy, 52, cy + 26), c.quadraticCurveTo(48, cy + 12, 44, cy + 2)))
  }
}

function hairFront(pen: Pen, p: Person, view: View, cy: number) {
  const H = p.hair
  const shine = mixHex(H, '#ffffff', 0.22)
  if (view === 'back') {
    pen.ell(32, cy - 1, 18, 18.5, H)
    if (p.hairStyle === 'bald') {
      pen.ell(32, cy - 4, 15.5, 14, p.skin)
      pen.ell(32, cy + 8, 17, 8, H)
    }
    if (p.hairStyle === 'cap') pen.path(p.cap!, (c) => c.ellipse(32, cy - 6, 18.5, 13, 0, Math.PI, 0))
    pen.path(shine, (c) => (c.moveTo(22, cy - 12), c.quadraticCurveTo(28, cy - 16, 34, cy - 15)), 1.5)
    return
  }
  if (view === 'side') {
    if (p.hairStyle === 'bald') {
      pen.ell(19, cy + 6, 3.5, 5, H)
      pen.path(shine, (c) => (c.moveTo(28, cy - 13), c.quadraticCurveTo(34, cy - 16, 40, cy - 13)), 1.5)
    } else {
      pen.path(H, (c) => {
        c.moveTo(14, cy + 8)
        c.quadraticCurveTo(10, cy - 18, 32, cy - 19)
        c.quadraticCurveTo(48, cy - 18, 48, cy - 6)
        c.quadraticCurveTo(40, cy - 9, 34, cy - 5)
        c.quadraticCurveTo(28, cy + 2, 26, cy + 10)
        c.closePath()
      })
      pen.path(shine, (c) => (c.moveTo(20, cy - 10), c.quadraticCurveTo(28, cy - 16, 38, cy - 15)), 1.5)
    }
    if (p.hairStyle === 'cap') {
      pen.path(p.cap!, (c) => c.ellipse(30, cy - 7, 18.5, 13, 0, Math.PI, 0))
      pen.rect(30, cy - 9, 22, 4, 2, mixHex(p.cap!, '#000000', 0.15))
    }
    return
  }
  // front
  if (p.hairStyle === 'bald') {
    pen.ell(15.5, cy + 0, 2.2, 4.5, H)
    pen.ell(48.5, cy + 0, 2.2, 4.5, H)
    pen.path(shine, (c) => (c.moveTo(25, cy - 14), c.quadraticCurveTo(32, cy - 17, 39, cy - 14)), 1.6)
    return
  }
  const sides = p.hairStyle === 'pony' || p.hairStyle === 'bun' ? 12 : 4
  pen.path(H, (c) => {
    c.moveTo(13, cy + sides)
    c.quadraticCurveTo(10, cy - 20, 32, cy - 20)
    c.quadraticCurveTo(54, cy - 20, 51, cy + sides)
    c.lineTo(48, cy - 4)
    if (p.hairStyle === 'short') {
      for (let x = 46; x >= 18; x -= 7) c.lineTo(x - 3.5, cy - 9 + ((x / 7) % 2) * 3), c.lineTo(x - 7, cy - 5)
    } else {
      c.quadraticCurveTo(40, cy - 10, 33, cy - 9)
      c.quadraticCurveTo(26, cy - 11, 20, cy - 5)
      c.quadraticCurveTo(17, cy - 2, 16, cy + 2)
    }
    c.closePath()
  })
  pen.path(shine, (c) => (c.moveTo(19, cy - 11), c.quadraticCurveTo(26, cy - 17, 35, cy - 16)), 1.6)
  if (p.hairStyle === 'cap') {
    pen.path(p.cap!, (c) => c.ellipse(32, cy - 7, 19, 14, 0, Math.PI, 0))
    pen.ell(32, cy - 6, 21, 3.6, mixHex(p.cap!, '#000000', 0.15))
    pen.ell(32, cy - 17, 2.5, 2, mixHex(p.cap!, '#ffffff', 0.3))
  }
}

// Draws one character in one pose on a 64×112 canvas (before the pixel-art pass).
function drawPerson(pen: Pen, p: Person, pose: Pose2) {
  const view: View = pose.startsWith('walk') || pose.startsWith('side') ? 'side' : pose.startsWith('back') ? 'back' : 'front'
  const sit = pose.startsWith('sit')
  const b = body(p, sit)
  const c = pen.c
  c.save()
  const bob = pose === 'walk1' || pose === 'walk3' ? -1 : 0
  c.translate(0, b.dy + bob)
  const cy = b.headY
  const shirt = p.top
  const shirtDark = mixHex(shirt, '#2a1c3a', 0.25)
  const skinDark = mixHex(p.skin, '#2a1c3a', 0.25)
  const pants = p.bottom
  const hip = b.torsoBot - 2
  const legW = p.kid ? 7 : 8

  hairBack(pen, p, view, cy)

  if (view === 'side') {
    const k = pose === 'walk0' ? 0 : pose === 'walk1' ? 1 : pose === 'walk2' ? 2 : pose === 'walk3' ? 3 : -1
    const swing = k < 0 ? 0 : [1, 0, -1, 0][k]
    const legLen = b.legBot - b.legTop + 4
    const legEnd = (s: number): [number, number] => [32 + s * 9, hip + Math.sqrt(Math.max(0, legLen * legLen - 81 * s * s))]
    const back = legEnd(-swing), front = legEnd(swing)
    const legCol = p.dress ? p.skin : pants
    pen.limb([[31, hip], back], legW, mixHex(legCol, '#2a1c3a', 0.3))
    pen.ell(back[0] + 3, back[1] + 2, 6, 3.4, mixHex(p.shoes, '#2a1c3a', 0.3))
    pen.limb([[33, hip], front], legW, legCol)
    pen.ell(front[0] + 3, front[1] + 2, 6, 3.4, p.shoes)
    // back arm
    const shoulder: [number, number] = [32, b.torsoTop + 6]
    const arm = (s: number): [number, number] => [32 + s * 8, b.torsoTop + 24]
    pen.limb([shoulder, arm(swing)], 6, skinDark)
    // torso
    if (p.dress) pen.path(shirt, (cc) => (cc.moveTo(22, b.torsoTop + 2), cc.lineTo(42, b.torsoTop + 2), cc.lineTo(46, b.torsoBot + 12), cc.lineTo(18, b.torsoBot + 12), cc.closePath()))
    else {
      pen.rect(22, b.torsoBot - 6, 20, 10, 3, pants)
    }
    pen.rect(21, b.torsoTop, 22, b.torsoBot - b.torsoTop, 7, shirt)
    if (p.belly) pen.ell(40, b.torsoTop + 18, 8, 11, shirt)
    if (p.apron) pen.rect(36, b.torsoTop + 10, 8, 30, 3, p.apron)
    pen.rect(29, b.torsoTop - 4, 7, 6, 2, p.skin) // neck
    // front arm
    const hand = arm(-swing)
    pen.limb([shoulder, hand], 6, p.sleeveless ? p.skin : p.skin)
    if (!p.sleeveless) pen.limb([shoulder, [32 - swing * 3, b.torsoTop + 12]], 8, shirt)
    pen.ell(hand[0], hand[1] + 1, 3.4, 3.4, p.skin)
    // head
    pen.ell(31, cy, 17, 18, p.skin)
    pen.ell(46.5, cy + 6, 2.6, 2.8, p.skin) // nose
    pen.ell(22, cy + 4, 3.5, 4.5, skinDark) // ear
    hairFront(pen, p, view, cy)
    // face (profile)
    const ey = cy + 5
    pen.ell(41, ey, 3, 3.6, EYE_W)
    pen.ell(42.5, ey + 0.6, 2, 2.6, p.iris ?? '#3a2418')
    pen.path(OUT, (cc) => (cc.moveTo(37.5, ey - 3), cc.quadraticCurveTo(41, ey - 4.6, 44.5, ey - 2.4)), 1.7)
    pen.path(mixHex(p.hair, '#000000', 0.1), (cc) => (cc.moveTo(37, ey - 7), cc.lineTo(45, ey - 7.5)), 1.6)
    pen.ell(41, ey + 6, 2.6, 1.5, BLUSH)
    if (p.glasses) pen.path(GLASS, (cc) => cc.ellipse(42, ey, 5, 5, 0, 0, Math.PI * 2), 1.2)
    if (p.mustache) pen.path(p.hair, (cc) => (cc.moveTo(38, ey + 7.5), cc.lineTo(44, ey + 7)), 2.2)
    if (pose === 'sideTalk') pen.ell(41, ey + 9.5, 2.2, 2, MOUTH)
    else pen.path(MOUTH, (cc) => (cc.moveTo(38, ey + 9.5), cc.lineTo(43, ey + 9)), 1.4)
    c.restore()
    return
  }

  // ---- front / back ----
  const legCol = p.dress ? p.skin : pants
  if (sit) {
    pen.rect(19, b.legTop - 2, 26, 9, 4, p.dress ? shirt : pants)
    pen.limb([[24, b.legTop + 4], [24, b.legBot]], legW, legCol)
    pen.limb([[40, b.legTop + 4], [40, b.legBot]], legW, legCol)
    pen.ell(23, b.legBot + 3, 6, 3.4, p.shoes)
    pen.ell(41, b.legBot + 3, 6, 3.4, p.shoes)
  } else {
    pen.limb([[25, hip], [25, b.legBot]], legW, legCol)
    pen.limb([[39, hip], [39, b.legBot]], legW, legCol)
    pen.ell(24, b.legBot + 4, 6.4, 3.6, p.shoes)
    pen.ell(40, b.legBot + 4, 6.4, 3.6, p.shoes)
  }
  if (p.dress) pen.path(shirt, (cc) => (cc.moveTo(19, b.torsoTop + 2), cc.lineTo(45, b.torsoTop + 2), cc.lineTo(49, b.torsoBot + (sit ? 4 : 12)), cc.lineTo(15, b.torsoBot + (sit ? 4 : 12)), cc.closePath()))
  else pen.rect(19, b.torsoBot - 8, 26, 12, 3, pants)
  // torso
  pen.rect(17, b.torsoTop, 30, b.torsoBot - b.torsoTop, 9, shirt)
  if (p.belly) pen.ell(32, b.torsoTop + 19, 18, 12, shirt)
  if (p.topDots && view === 'front') for (const [x, y] of [[22, 8], [36, 12], [27, 20], [42, 24], [20, 30], [33, 36], [44, 40]]) if (b.torsoTop + y < b.torsoBot + 10) pen.ell(x, b.torsoTop + y, 1.6, 1.6, p.topDots)
  if (p.apron && view === 'front') pen.rect(22, b.torsoTop + 12, 20, b.torsoBot - b.torsoTop - 2, 4, p.apron)
  if (p.sleeveless) {
    pen.ell(18, b.torsoTop + 5, 4, 5, p.skin)
    pen.ell(46, b.torsoTop + 5, 4, 5, p.skin)
  }
  pen.rect(28, b.torsoTop - 5, 8, 7, 2, p.skin) // neck
  if (view === 'front' && !p.sleeveless) pen.path(mixHex(shirt, '#ffffff', 0.25), (cc) => (cc.moveTo(26, b.torsoTop + 1), cc.quadraticCurveTo(32, b.torsoTop + 6, 38, b.torsoTop + 1)), 1.6)

  // arms
  const sh = { l: [19, b.torsoTop + 5] as [number, number], r: [45, b.torsoTop + 5] as [number, number] }
  const down = (s: [number, number], dx: number): [number, number][] => [s, [s[0] + dx, b.torsoTop + 26]]
  const sleeve = (s: [number, number], to: [number, number]) => {
    if (p.sleeveless) return
    const m: [number, number] = [s[0] + (to[0] - s[0]) * 0.4, s[1] + (to[1] - s[1]) * 0.4]
    pen.limb([s, m], 9, shirt)
  }
  const arm = (pts: [number, number][], handR = 3.6) => {
    pen.limb(pts, 6, p.skin)
    sleeve(pts[0], pts[1])
    const h = pts[pts.length - 1]
    pen.ell(h[0], h[1], handR, handR, p.skin)
  }
  if (view === 'back') {
    arm(down(sh.l, -3))
    if (pose === 'backPhone') {
      arm([sh.r, [52, b.torsoTop - 4], [50, cy - 2]])
      pen.rect(45, cy - 16, 12, 18, 2, PHONE)
      pen.rect(46.5, cy - 14.5, 9, 14, 1, SCREEN)
    } else arm(down(sh.r, 3))
    pen.ell(32, cy, 17, 18, p.skin)
    pen.ell(14, cy + 3, 3.2, 4.5, p.skin)
    pen.ell(50, cy + 3, 3.2, 4.5, p.skin)
    hairFront(pen, p, view, cy)
    c.restore()
    return
  }
  const mid = b.torsoTop + 18
  if (pose === 'phone' || pose === 'sitPhone') {
    arm([sh.l, [22, mid + 2], [28, mid]])
    arm([sh.r, [42, mid + 2], [36, mid]])
    pen.rect(25, mid - 14, 14, 18, 2, PHONE)
    pen.ell(28.5, mid - 11, 1.4, 1.4, '#5b6270')
  } else if (pose === 'happy' || pose === 'wave' || pose === 'sitHappy') {
    arm(down(sh.l, -3))
    arm([sh.r, [53, b.torsoTop - 4], [55, cy + 2 - (pose === 'wave' ? 4 : 0)]], 4)
  } else if (pose === 'think') {
    arm(down(sh.l, -3))
    arm([sh.r, [46, mid], [38, cy + 17]])
  } else if (pose === 'pay') {
    arm(down(sh.l, -3))
    arm([sh.r, [53, mid - 6], [58, mid - 8]])
    pen.rect(55, mid - 16, 8, 12, 1, BILL)
  } else if (pose === 'talk') {
    arm(down(sh.l, -3))
    arm([sh.r, [50, mid - 2], [55, mid - 8]], 3.8)
  } else {
    arm(down(sh.l, -3))
    arm(down(sh.r, 3))
  }
  // head
  pen.ell(14, cy + 3, 3.2, 4.5, p.skin)
  pen.ell(50, cy + 3, 3.2, 4.5, p.skin)
  pen.ell(32, cy, 17, 18, p.skin)
  hairFront(pen, p, view, cy)
  face(pen, p, pose, cy)
  if (pose === 'think') pen.ell(38, cy + 17, 3.8, 3.8, p.skin) // the hand in front of the chin
  c.restore()
}

// ---- the pixel-art pass ----
function pixelArt(c: CanvasRenderingContext2D, palette: string[]) {
  const img = c.getImageData(0, 0, PW, PH)
  const d = img.data
  const pal = palette.map(hex)
  const idx = new Int16Array(PW * PH).fill(-1)
  for (let i = 0; i < PW * PH; i++) {
    if (d[i * 4 + 3] < 110) continue
    let best = 0, bd = 1e9
    for (let k = 0; k < pal.length; k++) {
      const dr = d[i * 4] - pal[k][0], dg = d[i * 4 + 1] - pal[k][1], db = d[i * 4 + 2] - pal[k][2]
      const dist = dr * dr + dg * dg + db * db
      if (dist < bd) (bd = dist), (best = k)
    }
    idx[i] = best
  }
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= PW || y >= PH ? -1 : idx[y * PW + x])
  const out = new Array<string>(PW * PH).fill('')
  for (let y = 0; y < PH; y++)
    for (let x = 0; x < PW; x++) {
      const k = at(x, y)
      if (k < 0) {
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) >= 0)) out[y * PW + x] = OUT
        continue
      }
      const col = palette[k]
      if (DETAIL.has(col)) {
        out[y * PW + x] = col
        continue
      }
      let v = col
      // light from the upper left: shade the right and lower rims of each part
      const r1 = at(x + 2, y), r2 = at(x + 1, y + 2)
      if ((r1 !== k && r1 >= -1) || (r2 !== k && r2 >= -1)) v = mixHex(col, '#3a2448', 0.3)
      // a darker line where one part meets another
      const n1 = at(x + 1, y), n2 = at(x, y + 1)
      if ((n1 >= 0 && n1 !== k && !DETAIL.has(palette[n1])) || (n2 >= 0 && n2 !== k && !DETAIL.has(palette[n2]))) v = mixHex(col, OUT, 0.55)
      // a soft highlight on the lit rim
      const l1 = at(x - 1, y), u1 = at(x, y - 1)
      if (v === col && (l1 !== k || u1 !== k) && l1 >= -1) v = mixHex(col, '#fff3e0', 0.15)
      out[y * PW + x] = v
    }
  const res = c.createImageData(PW, PH)
  for (let i = 0; i < PW * PH; i++) {
    if (!out[i]) continue
    const [r, g, b] = hex(out[i])
    res.data.set([r, g, b, 255], i * 4)
  }
  c.clearRect(0, 0, PW, PH)
  c.putImageData(res, 0, 0)
}

// The finished sprite as a canvas (cached).
const cache = new Map<string, HTMLCanvasElement>()
export function personCanvas(who: string, pose: Pose2) {
  const key = `${who}:${pose}`
  if (!cache.has(key)) {
    const cv = document.createElement('canvas')
    cv.width = PW
    cv.height = PH
    const ctx = cv.getContext('2d', { willReadFrequently: true })!
    const pen = new Pen(ctx)
    drawPerson(pen, PEOPLE[who], pose)
    pixelArt(ctx, [...pen.used])
    cache.set(key, cv)
  }
  return cache.get(key)!
}
