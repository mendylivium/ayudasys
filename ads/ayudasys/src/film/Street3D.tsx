import React, { useEffect, useMemo, useState } from 'react'
import { ThreeCanvas } from '@remotion/three'
import { useThree } from '@react-three/fiber'
import { continueRender, delayRender, staticFile } from 'remotion'
import * as THREE from 'three'
import { personCanvas, Pose2, PW, PH } from './people'

// A street with a small shop in the middle, in 3D (smooth), lit by the time of day, with the
// pixel-art people as lit, shadow-casting billboards. 16:9. Everything shown is set in SET below.
// Store front (window) at z = 1.2, sidewalk to z = 3.6, then the road. The street runs along x.

// ---- CUSTOMIZE: the set ----
export const SET = {
  // The shop in the middle: a counter behind a wide front opening, shelves of goods inside.
  storeSign: 'BARANGAY MALINAW',
  signColor: '#0f766e',
  signText: '#ffffff',
  signTrim: '#fde047',
  wall: '#a8d8c0', // the shop's front wall
  counterBoards: [
    ['AYUDA', 'DESK', '#123c69'],
    ['TULONG', 'SA PAMILYA', '#0f766e'],
  ] as [string, string, string][], // [line 1, line 2, color] on the counter's front; [] for none
  windowGrill: false, // a diamond wire grill over the top of the front opening
  hangingStrips: false, // colorful strips of small packs hanging inside the opening
  // Product photos in public/products/<name>.png (portrait, ~200×260 looks right). They fill the
  // shelves and can stand on the counter (`items`). Empty = plain colored boxes.
  products: [] as string[],
  // The neighbours: left (glass front), right (half-open shutter, striped awning), then houses.
  leftShop: 'LAUNDRY',
  rightShop: 'BAKERY',
  walls: { left: '#d7e6f2', right: '#f2dfb8', farLeft: '#e9c9a0', farRight: '#c9d9b0' },
  upperFloors: ['#efe4cf', '#d9c7e6', '#f0d0b0', '#cfe0e8', '#e6d7a8'], // left to right
  overheadWires: true, // utility posts with sagging wires
}

export type Vec = [number, number, number]
export type CamState = { pos: Vec; look: Vec; fov: number }
export type Actor = { id: string; who: string; pose: Pose2; pos: Vec; flip?: boolean; hide?: boolean }
export type ItemState = { name: string; pos: Vec; hide?: boolean }
export type Fx = { beam?: { from: Vec; to: Vec; o: number }; scanX?: number | null }

export const W = 1920
export const H = 1080
export const ACTOR_H = 1.72 // a sprite's full height (112 px)

// ---- time of day: 0 morning, 1 noon, 2 golden hour (dapit-hapon), 3 dusk, 4 night ----
type Preset = { sun: Vec; sunColor: string; sunI: number; amb: string; ambI: number; skyTop: string; skyLow: string; fog: string; lamps: number; rays: number; grade: string }
const PRESETS: Preset[] = [
  { sun: [-14, 7, 12], sunColor: '#ffd7a0', sunI: 2.4, amb: '#c9d6ff', ambI: 0.75, skyTop: '#7fb6f0', skyLow: '#ffe1b8', fog: '#f3dcc0', lamps: 0, rays: 0.8, grade: '#ffcf9a' },
  { sun: [4, 18, 8], sunColor: '#fff4e2', sunI: 2.9, amb: '#ffffff', ambI: 0.85, skyTop: '#4f9de8', skyLow: '#cfe7fb', fog: '#d8e8f5', lamps: 0, rays: 0.2, grade: '#fff6e0' },
  { sun: [16, 5, 10], sunColor: '#ffa05a', sunI: 2.8, amb: '#ffc7a0', ambI: 0.55, skyTop: '#6f8fd0', skyLow: '#ffb070', fog: '#f0b88a', lamps: 0.15, rays: 1, grade: '#ff9f5a' },
  { sun: [16, 1.6, 8], sunColor: '#ff6f5a', sunI: 0.9, amb: '#8d74c0', ambI: 0.5, skyTop: '#2f3a86', skyLow: '#ff8a6a', fog: '#8f6a90', lamps: 0.75, rays: 0.35, grade: '#c76aa0' },
  { sun: [-8, 12, 10], sunColor: '#8aa6ff', sunI: 0.22, amb: '#3a4a8a', ambI: 0.14, skyTop: '#060a20', skyLow: '#1e2852', fog: '#141b3c', lamps: 1, rays: 0, grade: '#2c3f8a' },
]
const lerpC = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()
export function timeOfDay(t: number): Preset {
  const i = Math.max(0, Math.min(3, Math.floor(t)))
  const k = Math.max(0, Math.min(1, t - i))
  const a = PRESETS[i], b = PRESETS[i + 1]
  const n = (x: number, y: number) => x + (y - x) * k
  return {
    sun: [0, 1, 2].map((j) => n(a.sun[j], b.sun[j])) as Vec,
    sunColor: lerpC(a.sunColor, b.sunColor, k), sunI: n(a.sunI, b.sunI), amb: lerpC(a.amb, b.amb, k), ambI: n(a.ambI, b.ambI),
    skyTop: lerpC(a.skyTop, b.skyTop, k), skyLow: lerpC(a.skyLow, b.skyLow, k), fog: lerpC(a.fog, b.fog, k), lamps: n(a.lamps, b.lamps), rays: n(a.rays, b.rays), grade: lerpC(a.grade, b.grade, k),
  }
}

// Same camera for 2D overlays (bubbles, boxes) on 3D points.
const projector = new THREE.PerspectiveCamera(35, W / H, 0.05, 300)
export function project(cam: CamState, p: Vec) {
  projector.fov = cam.fov
  projector.position.set(...cam.pos)
  projector.lookAt(...cam.look)
  projector.updateProjectionMatrix()
  projector.updateMatrixWorld()
  const v = new THREE.Vector3(...p).project(projector)
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H }
}

// ---- textures drawn by code ----
let seed = 11
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
function tex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  draw(cv.getContext('2d')!)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repeat)
  }
  return t
}
const grain = (c: CanvasRenderingContext2D, w: number, h: number, base: string, a: number, n: number) => {
  c.fillStyle = base
  c.fillRect(0, 0, w, h)
  for (let i = 0; i < n; i++) {
    c.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${rnd() * a})`
    c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3)
  }
}
const label = (c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, font = 'bold') => {
  c.fillStyle = color
  c.font = `${font} ${size}px "DejaVu Sans", Arial, sans-serif`
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText(text, x, y)
}
// A shop front (ground floor), 512×256: wall, sign, door or shutter.
function facade(wall: string, sign: string, signBg: string, signFg: string, kind: 'shutter' | 'glass' | 'house') {
  return tex(512, 256, (c) => {
    grain(c, 512, 256, wall, 0.06, 2500)
    if (kind !== 'house') {
      c.fillStyle = signBg
      c.fillRect(30, 12, 452, 50)
      label(c, sign, 256, 38, 30, signFg)
    }
    if (kind === 'shutter') {
      c.fillStyle = '#8f969c'
      c.fillRect(70, 80, 372, 176)
      c.fillStyle = 'rgba(0,0,0,0.18)'
      for (let y = 84; y < 256; y += 8) c.fillRect(70, y, 372, 2)
      c.fillStyle = '#2b2f33'
      c.fillRect(70, 200, 372, 56) // half-open
    } else if (kind === 'glass') {
      c.fillStyle = '#5b6b78'
      c.fillRect(90, 78, 332, 178)
      c.fillStyle = '#9ec7dc'
      c.fillRect(98, 86, 154, 170), c.fillRect(260, 86, 154, 170)
      c.fillStyle = 'rgba(255,255,255,0.35)'
      c.fillRect(110, 96, 24, 150)
    } else {
      c.fillStyle = '#6b4a2b'
      c.fillRect(200, 90, 112, 166)
      c.fillStyle = '#4a5a66'
      c.fillRect(40, 110, 120, 80), c.fillRect(352, 110, 120, 80)
      c.fillStyle = '#a9cfe2'
      c.fillRect(46, 116, 52, 68), c.fillRect(104, 116, 52, 68), c.fillRect(358, 116, 52, 68), c.fillRect(416, 116, 52, 68)
    }
  })
}
// An upper floor, 512×256: windows (lit at night through `lit`).
function upper(wall: string, lit: boolean) {
  return tex(512, 256, (c) => {
    grain(c, 512, 256, wall, 0.06, 2500)
    for (const x of [50, 290]) {
      c.fillStyle = '#3e3a36'
      c.fillRect(x, 50, 172, 130)
      c.fillStyle = lit ? '#ffd48a' : '#8fb3c8'
      c.fillRect(x + 8, 58, 74, 114), c.fillRect(x + 90, 58, 74, 114)
      c.fillStyle = 'rgba(0,0,0,0.25)'
      for (let i = 0; i < 6; i++) c.fillRect(x + 8, 62 + i * 19, 156, 2) // jalousie slats
    }
    c.fillStyle = 'rgba(0,0,0,0.25)'
    c.fillRect(0, 236, 512, 20)
  })
}

function useSet() {
  return useMemo(() => {
    seed = 11
    const planks = tex(128, 128, (c) => {
      grain(c, 128, 128, '#c99a68', 0.06, 900)
      c.fillStyle = 'rgba(90,55,25,0.55)'
      for (let y = 0; y < 128; y += 16) c.fillRect(0, y, 128, 2)
    }, [3, 2])
    const tiles = tex(64, 64, (c) => {
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) (c.fillStyle = (x + y) % 2 ? '#d9d0bf' : '#b84a3a'), c.fillRect(x * 32, y * 32, 32, 32)
    }, [8, 6])
    const road = tex(256, 256, (c) => {
      grain(c, 256, 256, '#55595f', 0.14, 9000)
      c.fillStyle = 'rgba(240,230,200,0.7)'
      for (let x = 0; x < 256; x += 64) c.fillRect(x, 124, 34, 6)
    }, [10, 1])
    const walk = tex(64, 64, (c) => {
      grain(c, 64, 64, '#a8a196', 0.08, 300)
      c.fillStyle = 'rgba(0,0,0,0.2)'
      c.fillRect(0, 0, 64, 2), c.fillRect(0, 0, 2, 64)
    }, [40, 3])
    const storeWall = tex(128, 128, (c) => {
      grain(c, 128, 128, SET.wall, 0.07, 1500)
      c.fillStyle = 'rgba(0,0,0,0.14)'
      c.fillRect(0, 110, 128, 18)
    }, [3, 1])
    const sign = tex(1024, 128, (c) => {
      c.fillStyle = SET.signColor
      c.fillRect(0, 0, 1024, 128)
      c.fillStyle = SET.signTrim
      c.fillRect(0, 0, 1024, 8), c.fillRect(0, 120, 1024, 8)
      label(c, SET.storeSign, 512, 68, SET.storeSign.length > 22 ? 60 : 74, SET.signText)
    })
    const counterSigns = tex(512, 128, (c) => {
      grain(c, 512, 128, '#c77b3a', 0.06, 800)
      SET.counterBoards.forEach(([a, b, color], k) => {
        const x = 20 + k * 272
        c.fillStyle = color
        c.fillRect(x, 26, 200, 76)
        if (b) label(c, a, x + 100, 52, 30, '#ffffff'), label(c, b, x + 100, 82, 22, '#ffd54a')
        else label(c, a, x + 100, 64, 32, '#ffffff')
      })
    })
    const grill = tex(32, 32, (c) => {
      c.strokeStyle = '#3f5a4f'
      c.lineWidth = 2.4
      c.beginPath()
      c.moveTo(0, 16), c.lineTo(16, 0), c.lineTo(32, 16), c.lineTo(16, 32), c.closePath()
      c.stroke()
    }, [16, 2.5])
    const sachets = tex(16, 128, (c) => {
      const cols = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#fb8c00', '#8e24aa', '#ffffff']
      for (let i = 0; i < 8; i++) (c.fillStyle = cols[i % 7]), c.fillRect(1, i * 16 + 1, 14, 14)
    })
    const rail = tex(64, 32, (c) => {
      c.fillStyle = '#2f3437'
      c.fillRect(0, 0, 64, 4), c.fillRect(0, 28, 64, 4)
      for (let x = 2; x < 64; x += 8) c.fillRect(x, 0, 3, 32)
    }, [20, 1])
    const stripes = tex(64, 16, (c) => {
      for (let x = 0; x < 64; x += 16) (c.fillStyle = '#d93a3a'), c.fillRect(x, 0, 8, 16), (c.fillStyle = '#f5efe6'), c.fillRect(x + 8, 0, 8, 16)
    }, [8, 1])
    const glow = tex(64, 64, (c) => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32)
      g.addColorStop(0, 'rgba(255,230,170,1)'), g.addColorStop(0.3, 'rgba(255,200,120,0.5)'), g.addColorStop(1, 'rgba(255,180,90,0)')
      c.fillStyle = g
      c.fillRect(0, 0, 64, 64)
    })
    return {
      planks, tiles, road, walk, storeWall, sign, counterSigns, grill, sachets, rail, stripes, glow,
      water: facade(SET.walls.left, SET.leftShop, '#1565c0', '#ffffff', 'glass'),
      kainan: facade(SET.walls.right, SET.rightShop, '#5d4037', '#ffd54a', 'shutter'),
      houseL: facade(SET.walls.farLeft, '', '', '', 'house'),
      houseR: facade(SET.walls.farRight, '', '', '', 'house'),
      upDay: SET.upperFloors.map((w) => upper(w, false)),
      upNight: SET.upperFloors.map((w) => upper(w, true)),
    }
  }, [])
}

export const PRODUCT_FILES = SET.products
const slug = (n: string) => n.replace(/\W+/g, '-').toLowerCase()
function useProducts() {
  const [t, setT] = useState<Record<string, THREE.Texture> | null>(null)
  const [handle] = useState(() => delayRender('product textures'))
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    Promise.all(PRODUCT_FILES.map((f) => loader.loadAsync(staticFile(`products/${f}.png`)).then((x) => [f, x] as const))).then((all) => {
      for (const [, x] of all) x.colorSpace = THREE.SRGBColorSpace
      setT(Object.fromEntries(all))
      continueRender(handle)
    })
  }, [handle])
  return t
}

// Character textures and their shadow materials, made once per pose.
const actorCache = new Map<string, { mat: THREE.MeshLambertMaterial; depth: THREE.MeshDepthMaterial }>()
function actorMats(who: string, pose: Pose2) {
  const key = `${who}:${pose}`
  if (!actorCache.has(key)) {
    const map = new THREE.CanvasTexture(personCanvas(who, pose))
    map.magFilter = map.minFilter = THREE.NearestFilter
    map.colorSpace = THREE.SRGBColorSpace
    const mat = new THREE.MeshLambertMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color('#ffffff'), emissiveMap: map, emissiveIntensity: 0.28 })
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 })
    actorCache.set(key, { mat, depth })
  }
  return actorCache.get(key)!
}
const actorGeo = (() => {
  const g = new THREE.PlaneGeometry((ACTOR_H * PW) / PH, ACTOR_H)
  g.translate(0, ACTOR_H / 2, 0)
  return g
})()

const ActorMesh: React.FC<{ a: Actor; cam: CamState }> = ({ a, cam }) => {
  if (a.hide) return null
  const { mat, depth } = actorMats(a.who, a.pose)
  const ry = Math.atan2(cam.pos[0] - a.pos[0], cam.pos[2] - a.pos[2])
  return <mesh geometry={actorGeo} material={mat} customDepthMaterial={depth} position={a.pos} rotation={[0, ry, 0]} scale={[a.flip ? -1 : 1, 1, 1]} castShadow />
}

// ---- small pieces ----
type BoxP = { p: Vec; s: Vec; color?: string; map?: THREE.Texture; rot?: Vec; cast?: boolean; emissive?: string; ei?: number }
const Box: React.FC<BoxP> = ({ p, s, color = '#ffffff', map, rot, cast = true, emissive, ei = 1 }) => (
  <mesh position={p} rotation={rot} castShadow={cast} receiveShadow>
    <boxGeometry args={s} />
    <meshLambertMaterial color={color} map={map} emissive={emissive ?? '#000000'} emissiveIntensity={ei} />
  </mesh>
)
const Front: React.FC<{ p: Vec; s: [number, number]; map?: THREE.Texture; color?: string; transparent?: boolean; emissive?: string; ei?: number; alphaTest?: number }> = ({ p, s, map, color = '#ffffff', transparent, emissive, ei = 1, alphaTest }) => (
  <mesh position={p} receiveShadow>
    <planeGeometry args={s} />
    <meshLambertMaterial map={map} color={color} transparent={transparent} alphaTest={alphaTest} side={THREE.DoubleSide} emissive={emissive ?? '#000000'} emissiveMap={emissive ? map : null} emissiveIntensity={ei} />
  </mesh>
)
const Glow: React.FC<{ p: Vec; size: number; o: number; map: THREE.Texture; color?: string }> = ({ p, size, o, map, color = '#ffffff' }) =>
  o > 0.01 ? (
    <sprite position={p} scale={[size, size, 1]}>
      <spriteMaterial map={map} color={color} transparent opacity={o} blending={THREE.AdditiveBlending} depthWrite={false} />
    </sprite>
  ) : null

const Product: React.FC<{ map?: THREE.Texture; p: Vec; scale?: number }> = ({ map, p, scale = 1 }) => {
  const w = 0.2 * scale, h = 0.26 * scale, d = 0.07 * scale
  const side = useMemo(() => new THREE.MeshLambertMaterial({ color: '#ddd5c8' }), [])
  const face = useMemo(() => new THREE.MeshLambertMaterial({ map, transparent: true, alphaTest: 0.3 }), [map])
  return (
    <mesh position={[p[0], p[1] + h / 2, p[2]]} material={[side, side, side, side, face, face]} castShadow>
      <boxGeometry args={[w, h, d]} />
    </mesh>
  )
}

// A wire sagging between two points.
const Wire: React.FC<{ a: Vec; b: Vec; sag?: number }> = ({ a, b, sag = 0.6 }) => {
  const geo = useMemo(() => {
    const m = new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - sag, (a[2] + b[2]) / 2)
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a), m, new THREE.Vector3(...b))
    return new THREE.TubeGeometry(curve, 24, 0.015, 4, false)
  }, [a, b, sag])
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color="#1a1a1a" />
    </mesh>
  )
}

const Sky: React.FC<{ top: string; low: string; stars: number }> = ({ top, low, stars }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color() }, low: { value: new THREE.Color() } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 low; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.15, 0.0, 1.0); gl_FragColor = vec4(mix(low, top, pow(h, 0.8)), 1.0); }',
      }),
    [],
  )
  mat.uniforms.top.value.set(top)
  mat.uniforms.low.value.set(low)
  const starGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pts: number[] = []
    let s = 5
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 500; i++) {
      const th = r() * Math.PI * 2, ph = 0.1 + r() * 1.2
      pts.push(Math.cos(th) * Math.cos(ph) * 120, Math.sin(ph) * 120, Math.sin(th) * Math.cos(ph) * 120)
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  return (
    <>
      <mesh material={mat}>
        <sphereGeometry args={[150, 32, 16]} />
      </mesh>
      {stars > 0.01 && (
        <points geometry={starGeo}>
          <pointsMaterial color="#ffffff" size={1.6} sizeAttenuation={false} transparent opacity={stars} fog={false} />
        </points>
      )}
    </>
  )
}

const Rig: React.FC<{ cam: CamState }> = ({ cam }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  camera.fov = cam.fov
  camera.near = 0.05
  camera.far = 300
  camera.position.set(...cam.pos)
  camera.lookAt(...cam.look)
  camera.updateProjectionMatrix()
  return null
}

// Shelf goods in a fixed made-up arrangement.
const SHELF = (() => {
  const out: { kind: number; x: number; y: number; color: string; product: string; h: number }[] = []
  let s = 3
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const cols = ['#e53935', '#fdd835', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#f5f5f5', '#6d4c41']
  for (const y of [0.62, 1.22, 1.82]) {
    let x = -2.55
    while (x < 2.5) {
      const k = r()
      const kind = k < 0.35 ? 0 : k < 0.6 ? 1 : k < 0.8 ? 2 : 3
      const h = kind === 2 ? 0.32 : kind === 3 ? 0.14 : 0.26
      out.push({ kind, x, y, h, color: cols[Math.floor(r() * cols.length)], product: PRODUCT_FILES[Math.floor(r() * Math.max(1, PRODUCT_FILES.length))] })
      x += kind === 3 ? 0.16 : 0.24
    }
  }
  return out
})()

// ---- the world ----
export const Street3D: React.FC<{ cam: CamState; time: number; actors: Actor[]; items?: ItemState[]; cat?: { pos: Vec; frame: number } | null; fx?: Fx }> = ({ cam, time, actors, items = [], cat, fx = {} }) => {
  const T = useSet()
  const P = useProducts()
  const L = timeOfDay(time)
  const sunPos = new THREE.Vector3(...L.sun).normalize().multiplyScalar(40)
  const night = Math.max(0, Math.min(1, time - 2.6)) / 1.4
  const lamps = L.lamps
  const bulb = 0.5 + 0.5 * Math.max(lamps, 0.4)
  const ups = night > 0.5 ? T.upNight : T.upDay
  return (
    <ThreeCanvas width={W} height={H} dpr={1} shadows gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 - night * 0.15 }}>
      <Rig cam={cam} />
      <fog attach="fog" args={[L.fog, 18, 70]} />
      <Sky top={L.skyTop} low={L.skyLow} stars={night} />
      <ambientLight color={L.amb} intensity={L.ambI} />
      <hemisphereLight args={[L.skyTop, '#5a4a3a', 0.45 * (1 - night * 0.85)]} />
      <directionalLight
        position={sunPos}
        color={L.sunColor}
        intensity={L.sunI}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      {/* the store's bulb, and street lamps */}
      <pointLight position={[0, 2.6, -0.2]} color="#ffcf80" intensity={1.2 + lamps * 3} distance={8} decay={1} />
      <pointLight position={[0, 2.4, 2.0]} color="#ffcf80" intensity={lamps * 2.2} distance={6} decay={1} />
      {[-7, 7].map((x) => (
        <pointLight key={x} position={[x + 0.9, 5.6, 3.6]} color="#ffdca0" intensity={lamps * 5} distance={14} decay={1} />
      ))}

      {/* ground */}
      <mesh position={[0, -0.02, 9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 12]} />
        <meshLambertMaterial map={T.road} />
      </mesh>
      <Box p={[0, 0.06, 2.4]} s={[80, 0.12, 2.4]} map={T.walk} cast={false} />
      <mesh position={[0, 0.005, -0.9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 4.2]} />
        <meshLambertMaterial map={T.tiles} />
      </mesh>

      {/* the store inside */}
      <Front p={[0, 1.5, -3]} s={[6, 3]} map={T.planks} />
      <mesh position={[-3, 1.5, -0.9]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[4.2, 3]} />
        <meshLambertMaterial map={T.planks} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[3, 1.5, -0.9]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[4.2, 3]} />
        <meshLambertMaterial map={T.planks} side={THREE.DoubleSide} />
      </mesh>
      <Box p={[0, 3.05, -0.9]} s={[6, 0.1, 4.2]} color="#8a6a4a" />
      {[0.6, 1.2, 1.8].map((y) => (
        <Box key={y} p={[0, y, -2.78]} s={[5.4, 0.04, 0.42]} color="#8d6038" />
      ))}
      {[0.6, 1.2, 1.8].flatMap((y,row) => [-2,-1,0,1,2].map((x,i) => (
        <group key={`${row}-${i}`}>
          <Box p={[x,y+.22,-2.72]} s={[.75,.4,.35]} color={row===2?'#81998b':'#c7a273'} />
          <Box p={[x,y+.22,-2.535]} s={[.27,.13,.01]} color="#f2ead8" cast={false}/>
        </group>
      )))}
      <mesh position={[0, 2.66, -0.2]}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshBasicMaterial color="#fff3c4" />
      </mesh>
      <Glow p={[0, 2.66, -0.2]} size={1.2} o={0.35 + lamps * 0.5} map={T.glow} />
      <Box p={[2.2, 0.45, -1.3]} s={[1.0, 0.9, 0.65]} color="#f1f3f4" />
      <mesh position={[-0.7, 0.23, -0.35]} castShadow>
        <cylinderGeometry args={[0.18, 0.15, 0.46, 16]} />
        <meshLambertMaterial color="#2e7dd7" />
      </mesh>
      {/* counter, window, grill, sachets, sign */}
      <Box p={[0, 0.48, 0.85]} s={[4.2, 0.96, 0.6]} map={T.planks} color="#d9b38a" />
      <Box p={[0, 0.98, 0.85]} s={[4.3, 0.05, 0.66]} color="#9c6b3e" />
      <Box p={[-2.55, 1.55, 1.2]} s={[1.1, 3.1, 0.14]} map={T.storeWall} />
      <Box p={[2.55, 1.55, 1.2]} s={[1.1, 3.1, 0.14]} map={T.storeWall} />
      <Box p={[0, 0.5, 1.2]} s={[4, 1, 0.14]} map={T.storeWall} />
      {SET.counterBoards.length > 0 && <Front p={[0, 0.5, 1.28]} s={[3.9, 0.9]} map={T.counterSigns} />}
      <Box p={[0, 2.7, 1.2]} s={[4, 0.8, 0.14]} map={T.storeWall} />
      <Box p={[0, 1.02, 1.38]} s={[4.2, 0.05, 0.32]} color="#7a522f" />
      {SET.windowGrill && <Front p={[0, 2.03, 1.29]} s={[4, 0.54]} map={T.grill} transparent alphaTest={0.5} />}
      {SET.hangingStrips && [-1.85, -1.62, 1.62, 1.85].map((x) => (
        <Front key={x} p={[x, 1.98, 1.1]} s={[0.16, 0.62]} map={T.sachets} />
      ))}
      <Box p={[0, 2.72, 1.32]} s={[4.6, 0.55, 0.06]} map={T.sign} emissive="#ffffff" ei={0.08 + lamps * 0.35} />
      {/* awning */}
      <Box p={[0, 3.15, 1.95]} s={[6.6, 0.05, 1.5]} color="#9aa3a8" rot={[-0.16, 0, 0]} />

      {/* the row of buildings: ground floors (x from −19 to 19), upper floors and balconies */}
      <Box p={[-6.85, 1.6, 0.2]} s={[7.3, 3.2, 2]} color={SET.walls.left} />
      <Front p={[-6.85, 1.6, 1.22]} s={[7.3, 3.2]} map={T.water} />
      <Box p={[6.85, 1.6, 0.2]} s={[7.3, 3.2, 2]} color={SET.walls.right} />
      <Front p={[6.85, 1.6, 1.22]} s={[7.3, 3.2]} map={T.kainan} />
      <Box p={[6.85, 3.0, 1.9]} s={[7.3, 0.05, 1.4]} map={T.stripes} rot={[-0.22, 0, 0]} />
      <Box p={[-14.6, 1.6, 0.2]} s={[8, 3.2, 2]} color={SET.walls.farLeft} />
      <Front p={[-14.6, 1.6, 1.22]} s={[8, 3.2]} map={T.houseL} />
      <Box p={[14.6, 1.6, 0.2]} s={[8, 3.2, 2]} color={SET.walls.farRight} />
      <Front p={[14.6, 1.6, 1.22]} s={[8, 3.2]} map={T.houseR} />
      {[[-14.6, 8], [-6.85, 7.3], [0, 6], [6.85, 7.3], [14.6, 8]].map(([x, w], i) => (
        <group key={x}>
          <Box p={[x, 4.7, 0.2]} s={[w, 3, 2]} color="#ddd2c0" />
          <Front p={[x, 4.7, 1.22]} s={[w, 3]} map={ups[i]} emissive={night > 0.5 ? '#ffffff' : undefined} ei={0.25} />
          <Box p={[x, 3.2, 1.75]} s={[w, 0.12, 1.1]} color="#cfc6b6" />
          <Front p={[x, 3.62, 2.28]} s={[w, 0.8]} map={T.rail} transparent alphaTest={0.5} />
          <Box p={[x, 6.25, 0.4]} s={[w + 0.3, 0.12, 2.6]} color="#8d6e63" />
        </group>
      ))}
      {/* water gallons, chairs and table, plants, bin */}
      {[[-8.6, 0], [-8.2, 0], [-8.4, 0.42], [-7.8, 0]].map(([x, y], i) => (
        <mesh key={i} position={[x, 0.33 + y, 1.75]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.42, 16]} />
          <meshLambertMaterial color="#4aa3e8" transparent opacity={0.85} />
        </mesh>
      ))}
      <Box p={[3.7, 0.5, 2.0]} s={[0.7, 0.05, 0.7]} color="#f5f5f5" />
      <Box p={[3.7, 0.25, 2.0]} s={[0.08, 0.5, 0.08]} color="#f5f5f5" />
      {[3.1, 4.3].map((x) => (
        <group key={x} position={[x, 0, 2.0]}>
          <Box p={[0, 0.3, 0]} s={[0.42, 0.05, 0.42]} color="#f8f8f8" />
          <Box p={[0, 0.55, -0.19]} s={[0.42, 0.5, 0.04]} color="#f8f8f8" />
          {[-0.17, 0.17].map((dx) => [-0.17, 0.17].map((dz) => <Box key={`${dx}${dz}`} p={[dx, 0.15, dz]} s={[0.04, 0.3, 0.04]} color="#eeeeee" />))}
        </group>
      ))}
      {[[-2.9, 1.75], [2.9, 1.75], [-11, 1.75], [10.5, 1.75]].map(([x, z]) => (
        <group key={x} position={[x, 0.12, z]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.17, 0.4, 14]} />
            <meshLambertMaterial color="#b5653a" />
          </mesh>
          {[[0, 0.62, 0, 0.36], [-0.18, 0.5, 0.05, 0.25], [0.2, 0.55, -0.05, 0.27]].map(([dx, dy, dz, r], i) => (
            <mesh key={i} position={[dx, dy, dz]} castShadow>
              <sphereGeometry args={[r, 14, 10]} />
              <meshLambertMaterial color={['#3f8f3f', '#4d9e45', '#357a36'][i]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[-3.6, 0.5, 1.9]} castShadow>
        <cylinderGeometry args={[0.25, 0.22, 0.75, 16]} />
        <meshLambertMaterial color="#2f6fb0" />
      </mesh>
      {/* tree */}
      <group position={[11.6, 0, 3.0]}>
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.24, 3.2, 10]} />
          <meshLambertMaterial color="#6d4c41" />
        </mesh>
        {[[0, 3.6, 0, 1.3], [-0.9, 3.1, 0.2, 0.9], [0.9, 3.2, -0.1, 1.0], [0.2, 4.4, 0, 0.9]].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <sphereGeometry args={[r, 16, 12]} />
            <meshLambertMaterial color={['#4f8f3a', '#5ea045', '#477f35', '#63a84a'][i]} />
          </mesh>
        ))}
      </group>
      {/* posts, lamps and wires */}
      {[-7, 7].map((x) => (
        <group key={x}>
          <mesh position={[x, 4, 3.4]} castShadow>
            <cylinderGeometry args={[0.11, 0.15, 8, 10]} />
            <meshLambertMaterial color="#a7a7a7" />
          </mesh>
          <Box p={[x, 7.4, 3.4]} s={[1.8, 0.1, 0.1]} color="#707070" />
          <Box p={[x + 0.3, 6.6, 3.55]} s={[0.4, 0.55, 0.35]} color="#5f6a70" />
          <Box p={[x + 0.5, 5.75, 3.6]} s={[1.0, 0.06, 0.06]} color="#707070" />
          <mesh position={[x + 0.95, 5.65, 3.6]}>
            <sphereGeometry args={[0.12, 12, 8]} />
            <meshBasicMaterial color={lamps > 0.3 ? '#fff1c4' : '#cfcfcf'} />
          </mesh>
          <Glow p={[x + 0.95, 5.65, 3.6]} size={2.4} o={lamps * 0.9} map={T.glow} />
        </group>
      ))}
      {SET.overheadWires && [[-0.4, 7.4], [0.4, 7.4], [0, 7.0]].map(([dx, y], i) => (
        <group key={i}>
          <Wire a={[-24, y + 0.3, 3.4 + dx]} b={[-7 + dx, y, 3.4]} sag={0.7} />
          <Wire a={[-7 + dx, y, 3.4]} b={[7 + dx, y, 3.4]} sag={0.9 + i * 0.15} />
          <Wire a={[7 + dx, y, 3.4]} b={[24, y + 0.3, 3.4 + dx]} sag={0.7} />
        </group>
      ))}
      {SET.overheadWires && <Wire a={[-7, 6.9, 3.4]} b={[-2, 5.6, 1.25]} sag={0.3} />}
      {SET.overheadWires && <Wire a={[7, 6.9, 3.4]} b={[2.5, 5.6, 1.25]} sag={0.3} />}
      <Glow p={[0, 2.72, 1.45]} size={4.5} o={lamps * 0.25} map={T.glow} color={SET.signColor} />

      {/* counter items, the cat, effects */}
      {items.map((it) => !it.hide && (it.name === 'foodpack' ? <group key={it.name} position={it.pos}><Box p={[0,.18,0]} s={[.5,.36,.28]} color="#c7a273"/><Box p={[0,.18,.145]} s={[.22,.12,.01]} color="#f2ead8" cast={false}/></group> : <Product key={it.name} map={P?.[slug(it.name)]} p={it.pos} />))}
      {cat && (
        <group position={cat.pos}>
          <mesh position={[0, 0.09, 0]} scale={[1.6, 0.8 + (cat.frame % 2) * 0.05, 1]} castShadow>
            <sphereGeometry args={[0.12, 16, 12]} />
            <meshLambertMaterial color="#e09a3e" />
          </mesh>
          <mesh position={[0.17, 0.12, 0.02]} castShadow>
            <sphereGeometry args={[0.08, 14, 10]} />
            <meshLambertMaterial color="#e09a3e" />
          </mesh>
          {[0.13, 0.21].map((x) => (
            <mesh key={x} position={[x, 0.2, 0.02]} rotation={[0, 0, x < 0.17 ? 0.3 : -0.3]}>
              <coneGeometry args={[0.03, 0.06, 4]} />
              <meshLambertMaterial color="#c9822e" />
            </mesh>
          ))}
        </group>
      )}
      {fx.beam && fx.beam.o > 0 && <Beam {...fx.beam} />}
      {fx.scanX !== undefined && fx.scanX !== null && (
        <mesh position={[fx.scanX, 1.16, 1.0]}>
          <boxGeometry args={[0.03, 0.36, 0.3]} />
          <meshBasicMaterial color="#ffb02e" transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      )}

      {actors.map((a) => (
        <ActorMesh key={a.id} a={a} cam={cam} />
      ))}
    </ThreeCanvas>
  )
}

const Beam: React.FC<{ from: Vec; to: Vec; o: number }> = ({ from, to, o }) => {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to)
  const dir = b.clone().sub(a)
  const len = dir.length()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize())
  const mid = a.clone().add(b).multiplyScalar(0.5)
  return (
    <mesh position={mid} quaternion={q}>
      <coneGeometry args={[0.55, len, 24, 1, true]} />
      <meshBasicMaterial color="#7fe3d5" transparent opacity={0.22 * o} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}
