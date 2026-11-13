// Store screenshots in the Blinders style: one wide scene, cut into store slots.
// node compose.cjs <config.json> <outDir>
// Config: { bg: [c1, c2], accent, ink, sub, motif: 'staff'|'none', panels: [{ title, body, shot }] }
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const { Buffer } = require('node:buffer')

const [cfgPath, OUT] = process.argv.slice(2)
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
const base = path.dirname(cfgPath)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

// Each store gets its own slot size and layout.
const TARGETS = {
  ios: { W: 1320, H: 2868, phoneW: 0.8, phoneTop: 0.215, title: 104, body: 46, island: true },
  'ios-6.3': { W: 1206, H: 2622, phoneW: 0.8, phoneTop: 0.215, title: 95, body: 42, island: true },
  play: { W: 1080, H: 1920, phoneW: 0.64, phoneTop: 0.245, title: 80, body: 36, island: false },
}

function background(t, n) {
  const { W, H } = t
  const TOTAL = W * n
  const [c1, c2] = cfg.bg
  const glows = cfg.panels
    .map((_, i) => `<circle cx="${i * W + W * (i % 2 ? 0.2 : 0.85)}" cy="${H * (i % 2 ? 0.75 : 0.35)}" r="${W * 0.9}" fill="url(#glow)"/>`)
    .join('')
  // Five lines that run through every slot, so the slots read as one scene.
  let motif = ''
  if (cfg.motif === 'staff') {
    const gap = H * 0.012
    const lines = []
    for (let k = 0; k < 5; k++) {
      const pts = []
      for (let x = 0; x <= TOTAL; x += W / 8) {
        const y = H * 0.6 + Math.sin((x / TOTAL) * Math.PI * 2 * n * 0.5) * H * 0.12 + k * gap
        pts.push(`${x.toFixed(0)},${y.toFixed(1)}`)
      }
      lines.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="#ffffff" stroke-opacity="0.10" stroke-width="${Math.max(2, W / 500)}"/>`)
    }
    motif = lines.join('')
  }
  // Ruled lines, as on the page of a copy book.
  if (cfg.motif === 'rule') {
    const gap = H * 0.03
    const lines = []
    for (let y = H * 0.5; y < H; y += gap) lines.push(`<line x1="0" x2="${TOTAL}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#ffffff" stroke-opacity="0.06" stroke-width="${Math.max(2, W / 600)}"/>`)
    motif = lines.join('')
  }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL}" height="${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
      </linearGradient>
      <radialGradient id="glow">
        <stop offset="0" stop-color="${cfg.accent}" stop-opacity="0.22"/>
        <stop offset="1" stop-color="${cfg.accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${TOTAL}" height="${H}" fill="url(#bg)"/>${glows}${motif}
  </svg>`)
}

function text(t, n) {
  const { W, H } = t
  const blocks = cfg.panels
    .map((p, i) => {
      const cx = i * W + W / 2
      const lines = p.title.split('\n')
      // A long line gets a smaller size, so each title keeps a margin at the sides.
      const longest = Math.max(...lines.map((l) => l.length))
      const size = Math.min(t.title, Math.floor((W * 0.84) / (longest * 0.66)))
      const lh = size * 1.12
      const y0 = H * 0.06 + size
      const tl = lines.map((l, k) => `<tspan x="${cx}" dy="${k ? lh : 0}">${esc(l)}</tspan>`).join('')
      const by = y0 + (lines.length - 1) * lh + t.body * 1.9
      const bl = p.body.split('\n').map((l, k) => `<tspan x="${cx}" dy="${k ? t.body * 1.35 : 0}">${esc(l)}</tspan>`).join('')
      return `<text x="${cx}" y="${y0}" text-anchor="middle" font-family="Source Serif 4" font-size="${size}" font-weight="700" fill="${cfg.ink}">${tl}</text>
        <text x="${cx}" y="${by}" text-anchor="middle" font-family="Inter" font-size="${t.body}" fill="${cfg.sub}">${bl}</text>`
    })
    .join('')
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W * n}" height="${H}">${blocks}</svg>`)
}

/** The screen in a plain phone frame, with a status bar strip in the colour of the app header. */
async function phone(file, t) {
  const w = Math.round(t.W * t.phoneW)
  const bezel = Math.round(w * 0.028)
  const sw = w - bezel * 2
  const raw = sharp(file)
  const meta = await raw.metadata()
  const sh = Math.round((meta.height / meta.width) * sw)
  const status = Math.round(sw * 0.12)
  const top = await sharp(file).extract({ left: 2, top: 2, width: 1, height: 1 }).raw().toBuffer()
  const [r, g, b] = top
  const shot = await sharp(file).resize({ width: sw }).toBuffer()
  const screenH = status + sh
  const h = screenH + bezel * 2
  const rOuter = Math.round(w * 0.13)
  const rInner = rOuter - bezel
  const cam = t.island
    ? `<rect x="${w / 2 - sw * 0.15}" y="${bezel + status * 0.28}" width="${sw * 0.3}" height="${status * 0.42}" rx="${status * 0.21}" fill="#000"/>`
    : `<circle cx="${w / 2}" cy="${bezel + status * 0.5}" r="${status * 0.16}" fill="#000"/>`
  const time = `<text x="${bezel + sw * 0.13}" y="${bezel + status * 0.62}" text-anchor="middle" font-family="Inter" font-weight="600" font-size="${status * 0.3}" fill="${r + g + b > 380 ? '#000' : '#fff'}">9:41</text>`
  const screen = await sharp({ create: { width: sw, height: screenH, channels: 4, background: { r, g, b, alpha: 1 } } })
    .composite([{ input: shot, top: status, left: 0 }])
    .png()
    .toBuffer()
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${screenH}"><rect width="${sw}" height="${screenH}" rx="${rInner}" fill="#fff"/></svg>`)
  const rounded = await sharp(screen).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  const frame = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" rx="${rOuter}" fill="#111"/>
    <rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="${rOuter - 1}" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="3"/>
  </svg>`)
  const over = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${cam}${time}</svg>`)
  return sharp(frame).composite([{ input: rounded, top: bezel, left: bezel }, { input: over }]).png().toBuffer()
}

async function shadow(img) {
  const m = await sharp(img).metadata()
  const pad = Math.round(m.width * 0.08)
  const blurred = await sharp(img)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .modulate({ brightness: 0 })
    .blur(pad / 2.5)
    .linear(0.45, 0)
    .png()
    .toBuffer()
  return { img: await sharp(blurred).composite([{ input: img, top: pad - Math.round(pad * 0.3), left: pad }]).png().toBuffer(), pad }
}

;(async () => {
  for (const [name, t] of Object.entries(TARGETS)) {
    const n = cfg.panels.length
    const layers = [{ input: text(t, n), top: 0, left: 0 }]
    for (const [i, p] of cfg.panels.entries()) {
      const { img, pad } = await shadow(await phone(path.resolve(base, p.shot), t))
      const m = await sharp(img).metadata()
      const top = Math.round(t.H * t.phoneTop) - pad
      // Let the phone run off the bottom edge, as many store listings do.
      const visible = Math.min(m.height, t.H - top)
      const cut = await sharp(img).extract({ left: 0, top: 0, width: m.width, height: visible }).toBuffer()
      layers.push({ input: cut, top, left: Math.round(i * t.W + (t.W - m.width) / 2) })
    }
    const wide = await sharp(background(t, n)).composite(layers).png().toBuffer()
    const dir = path.join(OUT, name)
    fs.mkdirSync(dir, { recursive: true })
    await sharp(wide).toFile(path.join(dir, 'panorama.png'))
    for (let i = 0; i < n; i++) {
      await sharp(wide).extract({ left: i * t.W, top: 0, width: t.W, height: t.H }).flatten({ background: cfg.bg[1] }).png().toFile(path.join(dir, `screenshot-${i + 1}.png`))
    }
    console.log(name, `${n} × ${t.W}×${t.H}`)
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
