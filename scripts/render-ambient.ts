import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { defaults, slides } from '../tv/ambient-src/model.js'

const output = 'tv/ambient/media/ambient-loop.mp4'
const fingerprintFile = 'build/ambient-render.json'
const fps = 30
const frames = (defaults.seconds + defaults.fade) * fps
const hash = createHash('sha256').update(
  JSON.stringify({ version: 1, defaults, slides, fps })
)
for (const slide of slides)
  hash.update(await readFile('tv/ambient/media/' + slide.file))
const fingerprint = hash.digest('hex')
const previous = await readFile(fingerprintFile, 'utf8').catch(() => '')
if (
  previous === fingerprint &&
  (await stat(output).catch(() => undefined))?.size
) {
  console.log('Ambient film is up to date: ' + output)
} else {
  const filters = [...slides, slides[0]].map((slide, i) => {
    const p = `(on/${frames - 1})`
    const zoom = `1+${defaults.zoom}*${p}*${p}*(3-2*${p})`
    return `[${i}:v]scale=4096:2304:force_original_aspect_ratio=increase,crop=4096:2304:(iw-ow)*${slide.x}:(ih-oh)*${slide.y},zoompan=z='${zoom}':x='(iw-iw/zoom)*${slide.x}':y='(ih-ih/zoom)*${slide.y}':d=${i === 2 ? defaults.fade * fps : frames}:s=1920x1080:fps=${fps},setsar=1,format=yuv420p,settb=1/${fps}[v${i}]`
  })
  // The final A segment continues into the A segment at the beginning of the file.
  // Trimming the first fade's worth makes the end/start motion continuous.
  filters.push(
    `[v0][v1]xfade=transition=fade:duration=${defaults.fade}:offset=${defaults.seconds}[ab]`
  )
  filters.push(
    `[ab][v2]xfade=transition=fade:duration=${defaults.fade}:offset=${defaults.seconds * 2},trim=start=${defaults.fade}:end=${defaults.seconds * 2 + defaults.fade},setpts=PTS-STARTPTS[out]`
  )
  await mkdir('build', { recursive: true })
  const temp = 'tv/ambient/media/ambient-render.tmp.mp4'
  console.log(
    'Rendering a silent 1080p film with two focal-point moves and baked-in dissolves…'
  )
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'warning',
        '-y',
        ...[...slides, slides[0]].flatMap((slide) => [
          '-i',
          'tv/ambient/media/' + slide.file
        ]),
        '-filter_complex_threads',
        '1',
        '-filter_complex',
        filters.join(';'),
        '-map',
        '[out]',
        '-an',
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '19',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        temp
      ],
      { stdio: 'inherit' }
    )
    proc.once('error', reject)
    proc.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error('ffmpeg failed: ' + code))
    )
  })
  await rename(temp, output)
  await writeFile(fingerprintFile, fingerprint)
  console.log('Ready: ' + output)
}
