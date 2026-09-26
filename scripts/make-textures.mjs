// Renders the 3D board textures to assets/3d/*.png with headless Chromium.
// Usage: node scripts/make-textures.mjs   (needs Playwright installed)
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', '3d');
const RED = '#E30613';
const FONT = `'Heebo', 'Assistant', 'Rubik', 'Noto Sans Hebrew', 'Arial Hebrew', sans-serif`;

// Peace-hand icon for the finish disc (drawn as SVG so no emoji font is needed).
const peace = (color, size) => `
<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M38 58 L30 16 a6 6 0 0 1 12 -2 L50 48"/>
  <path d="M50 48 L58 12 a6 6 0 0 1 12 2 L62 52"/>
  <path d="M36 56 c-6 -4 -14 0 -12 8 c2 8 8 16 14 20 c8 6 22 6 30 -2 c6 -6 6 -16 4 -26 c-1 -6 -8 -8 -12 -4"/>
  <path d="M44 62 c4 -4 12 -4 14 2"/>
</svg>`;

// 8×8 atlas of disc faces, 128 px per cell.
// cell 0 = finish (✌), cells 1..8 = the board's repeating 1–8 numbers,
// cells 9..16 = steal squares 1..8 (red with a white ring, like the printed board),
// cell 63 = the glowing start square (a big "1").
function atlasHtml() {
  const cells = [];
  for (let i = 0; i < 64; i++) {
    let inner;
    if (i === 0) inner = `<div class="disc finish">${peace(RED, 88)}</div>`;
    else if (i === 63) inner = `<div class="disc start">1</div>`;
    else if (i <= 8) inner = `<div class="disc">${i}</div>`;
    else if (i <= 16) inner = `<div class="disc steal">${i - 8}</div>`;
    else inner = '';
    cells.push(`<div class="cell">${inner}</div>`);
  }
  return `<html><head><meta charset="utf-8"><style>
    body{margin:0;background:transparent}
    #atlas{display:grid;grid-template-columns:repeat(8,128px);width:1024px;height:1024px}
    .cell{width:128px;height:128px;display:flex;align-items:center;justify-content:center}
    .disc{width:118px;height:118px;border-radius:50%;background:#fff;color:${RED};
      font:900 76px ${FONT};-webkit-text-stroke:4px ${RED};display:flex;align-items:center;justify-content:center;
      box-shadow:inset 0 -6px 0 rgba(0,0,0,.08)}
    .finish{background:#fff;border:8px solid ${RED};box-sizing:border-box;box-shadow:inset 0 0 0 5px #fff, inset 0 0 0 9px ${RED}}
    .steal{background:${RED};color:#fff;-webkit-text-stroke:4px #fff;box-shadow:inset 0 0 0 6px ${RED}, inset 0 0 0 12px #fff}
    .start{font-size:84px;background:radial-gradient(circle,#fff 62%,#FFD9A0 100%)}
  </style></head><body><div id="atlas">${cells.join('')}</div></body></html>`;
}

const logoHtml = `<html><head><meta charset="utf-8"><style>
  body{margin:0;background:transparent}
  #logo{width:1024px;height:360px;display:flex;align-items:center;justify-content:center;
    font:900 250px ${FONT};color:#fff;transform:skewX(-8deg);
    text-shadow:0 8px 0 rgba(120,0,0,.45);direction:rtl}
</style></head><body><div id="logo">אליאס</div></body></html>`;

const cardHtml = `<html><head><meta charset="utf-8"><style>
  body{margin:0;background:transparent}
  #card{width:512px;height:720px;border-radius:36px;position:relative;overflow:hidden;
    background:radial-gradient(circle at 40% 35%,#ff3b3b 0%,${RED} 55%,#b0000e 100%)}
  .bubble{position:absolute;left:70px;top:150px;width:372px;height:372px;border-radius:50%;
    border:16px solid #fff;box-sizing:border-box;display:flex;align-items:center;justify-content:center;
    font:900 118px ${FONT};color:#fff;direction:rtl}
  .tail{position:absolute;left:326px;top:468px;width:0;height:0;border-left:34px solid transparent;
    border-right:34px solid transparent;border-top:62px solid #fff;transform:rotate(-35deg)}
  .bars{position:absolute;right:36px;bottom:36px;display:flex;gap:6px}
  .bars span{width:22px;height:46px;border-radius:5px}
</style></head><body><div id="card">
  <div class="bubble">אליאס</div><div class="tail"></div>
  <div class="bars"><span style="background:#FFC107"></span><span style="background:#1E63D6"></span>
  <span style="background:#1FA84F"></span><span style="background:#8E24AA"></span><span style="background:#FF7A00"></span></div>
</div></body></html>`;

// Warm wooden floor planks (tiles seamlessly), for the living room around the table.
function floorHtml() {
  const rows = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let r = 0; r < 8; r++) {
    const planks = [];
    let x = -rnd() * 300;
    while (x < 1024) {
      const w = 260 + rnd() * 240;
      const l = 52 + rnd() * 10;
      planks.push(`<div style="position:absolute;left:${x}px;width:${w}px;top:0;bottom:0;background:linear-gradient(90deg,hsl(28,48%,${l}%),hsl(28,46%,${l - 4}%) 60%,hsl(28,48%,${l - 1}%));border-right:3px solid rgba(70,40,20,.35)"></div>`);
      x += w;
    }
    rows.push(`<div style="position:absolute;left:0;right:0;top:${r * 128}px;height:125px;overflow:hidden;border-bottom:3px solid rgba(70,40,20,.35)">${planks.join('')}</div>`);
  }
  return `<html><body style="margin:0"><div id="floor" style="position:relative;width:1024px;height:1024px;overflow:hidden;background:#b98150">${rows.join('')}</div></body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [html, sel, file] of [
  [atlasHtml(), '#atlas', 'discs.png'],
  [logoHtml, '#logo', 'logo.png'],
  [cardHtml, '#card', 'card.png'],
  [floorHtml(), '#floor', 'floor.png'],
]) {
  await page.setContent(html);
  await page.waitForTimeout(200);
  await page.locator(sel).screenshot({ path: path.join(out, file), omitBackground: true });
  console.log('wrote', file);
}
await browser.close();
