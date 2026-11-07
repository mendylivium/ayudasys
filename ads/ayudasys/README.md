# AyudaSys — May tala. May tiwala.

54-second Tagalog scenario ad, 1920 × 1080, 16:9, 30 fps. HD-2D barangay scenes, original synthesized music and sound effects, burned-in dialogue subtitles, and real AyudaSys screens. Dialogue is subtitled; there is no spoken voiceover.

## Deliverables

- `out/ayudasys-may-tala-may-tiwala-1080p.mp4`: finished H.264/AAC video.
- `out/ayudasys-tagalog.srt`: optional subtitle file.
- `out/poster.jpeg`: end-card poster.
- `STORYBOARD.md`: scenario, dialogue and camera plan.
- `src/film/Film.tsx`: editable film and timing.
- `public/shots/`: actual application screens with fictional demo data.

## Edit / render

```powershell
cd D:/golang/ayuda/ads/ayudasys
npm ci
npm run studio
npm run typecheck
npm run audio
npm run stills -- 80 300 650 900 1010 1280 1490
npm run render
```

Rendering uses the installed Windows Chrome and its ANGLE graphics backend. For another machine, remove `--browser-executable` or set it to that machine's Chrome path. Use `--gl=swangle` for software rendering if GPU rendering is unavailable. The audio scripts include the Windows Remotion ffmpeg fallback; system ffmpeg is preferred when installed.

## Story and evidence

Mila asks Ana how her family can receive assistance. Ana explains registration and staff eligibility review. A real QR stub is issued; staff look up the enrollment, verify claimant identity, and separately confirm release. The dashboard shows the resulting record. The fictional barangay closes the story together.

Screens were captured from the local application on port 3010 using a separate `storage/ad-demo.db` database. The film uses actual stub-code lookup, not a recorded physical-camera scan. No real resident data appears. Program eligibility is reviewed by staff; scanning alone does not release assistance. Duplicate-release prevention is scoped to one enrollment per household and program.

`scripts/capture-ayuda.mjs` reproduces the UI workflow against a **fresh**, migrated and seeded demo database on port 3010, using local development credentials from the main project's README. Never point this script at a production database. It creates one fictional program, one household, one enrollment and one release. Captured screens are included, so recapture is not needed to render.

The closing CTA is “Kilalanin ang AyudaSys”; no public website, price, availability claim, or contact information has been invented. Add your actual contact destination if you want a direct-response CTA before publishing.

## Source

Built using the user-requested [Pixel-Film-Skill](https://github.com/mendylivium/Pixel-Film-Skill), with a customized barangay set, cast, story, music plan and Windows tooling. Fonts and starter building blocks came with its template. The application source is untouched by this ad project.
