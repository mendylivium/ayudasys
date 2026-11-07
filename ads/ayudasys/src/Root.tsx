import { Composition } from 'remotion'
import { Film, FILM_TOTAL } from './film/Film'
import { CharSheet } from './film/CharSheet'

export const RemotionRoot = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="CharSheet" component={CharSheet} durationInFrames={1} fps={30} width={1900} height={1440} />
  </>
)
