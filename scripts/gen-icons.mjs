import sharp from 'sharp'
import { readFileSync } from 'node:fs'
const svg = readFileSync('apps/web/public/icon.svg')
for (const s of [192, 512]) await sharp(svg).resize(s, s).png().toFile(`apps/web/public/icon-${s}.png`)
