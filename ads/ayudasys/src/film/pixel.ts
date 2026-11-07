// Small pixel icons for over people's heads (bulb, sweat, heart, question, coin, wifiOff, clock, zzz).
// Each is a grid of letters: K outline, Y yellow, W white, G gray, B blue, R red, '.' empty.
const OUTLINE = '#1b1626'

// Small icons over heads (each 9×9 or so).
const ICONS: Record<string, string[]> = {
  bulb: ['...KKK...', '..KYYYK..', '.KYWYYYK.', '.KYYYYYK.', '.KYYYYYK.', '..KYYYK..', '...KGK...', '...KGK...', '....K....'],
  sweat: ['...K.', '..KBK', '.KBBK', 'KBWBK', 'KBBBK', '.KKK.'],
  heart: ['.KK.KK.', 'KRRKRRK', 'KRWRRRK', 'KRRRRRK', '.KRRRK.', '..KRK..', '...K...'],
  question: ['.KKKKK.', 'KWWWWWK', 'KWKKKWK', 'KKK.KWK', '..KWWWK', '..KWKKK', '..KKK..', '..KWK..', '..KKK..'],
  coin: ['..KKK..', '.KYYYK.', 'KYYWYYK', 'KYYWYYK', 'KYYWYYK', '.KYYYK.', '..KKK..'],
  wifiOff: ['...KKKKK...', '.KK.....KK.', 'K..KKKKK..K', '..K.....K..', '....KKK....', '...K...K...', '...........', '.....K.....', '....KKK....', '.....K.....', '...........'],
  clock: ['..KKKK..', '.KWWWWK.', 'KWWKWWWK', 'KWWKWWWK', 'KWWKKKWK', 'KWWWWWWK', '.KWWWWK.', '..KKKK..'],
  zzz: ['KKKK....', '..K.....', '.K..KKK.', 'KKKK..K.', '.....K..', '....KKK.'],
}
const ICON_COLORS: Record<string, string> = { K: OUTLINE, Y: '#ffd84a', W: '#ffffff', G: '#8a8a8a', B: '#6cc3ff', R: '#e23b4b' }
export function drawIcon(name: keyof typeof ICONS | string): string[][] {
  const g = ICONS[name].map((r) => [...r].map((ch) => ICON_COLORS[ch] ?? ''))
  if (name === 'wifiOff') for (let i = 0; i < g.length; i++) g[i][i] = '#e23b4b' // the red slash
  return g
}

// Grid → canvas (one pixel per cell). Browser only.
export function toCanvas(grid: string[][]) {
  const c = document.createElement('canvas')
  c.width = grid[0].length
  c.height = grid.length
  const ctx = c.getContext('2d')!
  grid.forEach((row, y) => row.forEach((col, x) => {
    if (col) {
      ctx.fillStyle = col
      ctx.fillRect(x, y, 1, 1)
    }
  }))
  return c
}

// Grid → data URL for <img> in the 2D overlays (cached).
const urls = new Map<string, string>()
export function gridUrl(key: string, grid: () => string[][]) {
  if (!urls.has(key)) urls.set(key, toCanvas(grid()).toDataURL())
  return urls.get(key)!
}
