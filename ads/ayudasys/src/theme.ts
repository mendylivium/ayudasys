import { continueRender, delayRender, staticFile } from 'remotion'

// Colors for overlays (teal, orange, amber, warm stone neutrals). Change them to the brand's.
export const C = {
  teal: '#0f766e',
  tealDark: '#0b5a54',
  tealLight: '#ccfbf1',
  orange: '#ea580c',
  amber: '#ca8a04',
  amberLight: '#fef3c7',
  sky: '#0284c7',
  green: '#15803d',
  ink: '#1c1917',
  stone: '#f5f5f4',
  stone2: '#e7e5e4',
  white: '#ffffff',
}

export const sans = 'Poppins, sans-serif'
export const hand = 'Caveat, cursive'

// Fonts ship in public/fonts (Poppins and Caveat, SIL Open Font License), so rendering needs no internet.
// Poppins' latin-ext file carries the peso sign (₱).
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+20A0-20AB,U+20AD-20C0,U+2113'
const faces: [string, string, string, string][] = []
for (const w of ['500', '600', '700', '800']) {
  faces.push(['Poppins', w, `poppins-latin-${w}-normal.woff2`, LATIN])
  faces.push(['Poppins', w, `poppins-latin-ext-${w}-normal.woff2`, LATIN_EXT])
}
for (const w of ['600', '700']) faces.push(['Caveat', w, `caveat-latin-${w}-normal.woff2`, LATIN])

if (typeof document !== 'undefined') {
  const handle = delayRender('Loading fonts')
  Promise.all(
    faces.map(async ([family, weight, file, unicodeRange]) => {
      const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format('woff2')`, { weight, unicodeRange })
      document.fonts.add(await face.load())
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error('font load failed', e)
      continueRender(handle)
    })
}
