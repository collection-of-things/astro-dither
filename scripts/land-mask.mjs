import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

// Rebuild the globe's land mask: an equirectangular (2:1) greyscale PNG,
// white land on black sea, north at the top, longitude -180 at the left.
// The globe shader in packages/astro-dither/src/lib/effects.ts samples it
// with exactly that layout.
//
// Usage: node scripts/land-mask.mjs <ne_50m_land.geojson>
// Source data: Natural Earth 1:50m land, public domain.
// https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson
const WIDTH = 2048;
const HEIGHT = 1024;
const SS = 3; // supersampling per axis, for soft coastlines

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/land-mask.mjs <ne_50m_land.geojson>');
  process.exit(1);
}
const out = fileURLToPath(new URL('../packages/astro-dither/src/assets/land.png', import.meta.url));

const geo = JSON.parse(await readFile(input, 'utf8'));
const W = WIDTH * SS;
const H = HEIGHT * SS;
const mask = new Uint8Array(W * H);

// Fill one polygon (outer ring plus holes) with the even-odd rule, one scanline per row.
function fillPolygon(rings) {
  const pts = rings.map((ring) => ring.map(([lon, lat]) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H]));
  let minY = H;
  let maxY = 0;
  for (const ring of pts) for (const [, y] of ring) (minY = Math.min(minY, y)), (maxY = Math.max(maxY, y));
  for (let row = Math.max(0, Math.floor(minY)); row <= Math.min(H - 1, Math.ceil(maxY)); row++) {
    const sy = row + 0.5;
    const xs = [];
    for (const ring of pts) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [x1, y1] = ring[i];
        const [x2, y2] = ring[j];
        if (y1 <= sy !== y2 <= sy) xs.push(x1 + ((sy - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.round(xs[k]));
      const to = Math.min(W, Math.round(xs[k + 1]));
      mask.fill(1, row * W + from, row * W + to);
    }
  }
}

for (const feature of geo.features) {
  const g = feature.geometry;
  if (g.type === 'Polygon') fillPolygon(g.coordinates);
  else if (g.type === 'MultiPolygon') for (const poly of g.coordinates) fillPolygon(poly);
}

// Box-filter the supersampled mask down to one grey byte per pixel.
const grey = new Uint8Array(WIDTH * HEIGHT);
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    let sum = 0;
    for (let dy = 0; dy < SS; dy++) for (let dx = 0; dx < SS; dx++) sum += mask[(y * SS + dy) * W + x * SS + dx];
    grey[y * WIDTH + x] = Math.round((sum / (SS * SS)) * 255);
  }
}

await writeFile(out, encodePng(grey, WIDTH, HEIGHT));
console.log(`wrote ${out} (${WIDTH}x${HEIGHT})`);

// Minimal 8-bit greyscale PNG encoder.
function encodePng(pixels, width, height) {
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0;
    raw.set(pixels.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
