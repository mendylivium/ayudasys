import { AbsoluteFill } from 'remotion'
import { PEOPLE, personCanvas, Pose2 } from './people'

const POSES: Pose2[] = ['idle', 'talk', 'happy', 'think', 'phone', 'pay', 'worried', 'walk0', 'walk1', 'walk2', 'sideTalk', 'back', 'backPhone', 'sitPhone']
export const CharSheet = () => (
  <AbsoluteFill style={{ background: '#cfe3dc', padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
    {Object.keys(PEOPLE).map((who) => (
      <div key={who} style={{ display: 'flex', gap: 6 }}>
        {POSES.map((p) => (
          <img key={p} src={personCanvas(who, p).toDataURL()} style={{ width: 64 * 2, height: 112 * 2, imageRendering: 'pixelated' }} />
        ))}
      </div>
    ))}
  </AbsoluteFill>
)
