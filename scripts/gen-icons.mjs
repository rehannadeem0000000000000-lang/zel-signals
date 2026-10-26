// Generates the Zel Signals launcher icons without any native image dependency.
// Writes real PNG files (RGBA, 8 bit) for the PWA manifest and the Android APK.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

function createCanvas(size) {
  return { size, data: Buffer.alloc(size * size * 4) };
}

function blend(canvas, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) return;
  const i = (y * canvas.size + x) * 4;
  const src = a / 255;
  const dstA = canvas.data[i + 3] / 255;
  const outA = src + dstA * (1 - src);
  if (outA <= 0) return;
  canvas.data[i] = Math.round((r * src + canvas.data[i] * dstA * (1 - src)) / outA);
  canvas.data[i + 1] = Math.round((g * src + canvas.data[i + 1] * dstA * (1 - src)) / outA);
  canvas.data[i + 2] = Math.round((b * src + canvas.data[i + 2] * dstA * (1 - src)) / outA);
  canvas.data[i + 3] = Math.round(outA * 255);
}

function fillPolygon(canvas, points, [r, g, b]) {
  const size = canvas.size;
  const ys = points.map((p) => p[1]);
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(...ys)));
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if (y1 === y2) continue;
      if (y + 0.5 >= Math.min(y1, y2) && y + 0.5 < Math.max(y1, y2)) {
        xs.push(x1 + ((y + 0.5 - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const from = Math.max(0, Math.round(xs[i]));
      const to = Math.min(size - 1, Math.round(xs[i + 1]));
      for (let x = from; x <= to; x++) blend(canvas, x, y, r, g, b, 255);
    }
  }
}

function drawBackground(canvas) {
  const size = canvas.size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x / size) * 0.35 + (y / size) * 0.65;
      const r = Math.round(9 + t * 10);
      const g = Math.round(16 + t * 96);
      const b = Math.round(32 + t * 120);
      blend(canvas, x, y, r, g, b, 255);
    }
  }
}

function drawZ(canvas, scale) {
  const size = canvas.size;
  const s = (v) => (v - 0.5) * size * scale + size / 2;
  const top = [
    [s(0.22), s(0.26)],
    [s(0.78), s(0.26)],
    [s(0.78), s(0.38)],
    [s(0.22), s(0.38)],
  ];
  const bottom = [
    [s(0.22), s(0.62)],
    [s(0.78), s(0.62)],
    [s(0.78), s(0.74)],
    [s(0.22), s(0.74)],
  ];
  const diagonal = [
    [s(0.66), s(0.38)],
    [s(0.80), s(0.38)],
    [s(0.34), s(0.62)],
    [s(0.20), s(0.62)],
  ];
  fillPolygon(canvas, top, [255, 255, 255]);
  fillPolygon(canvas, diagonal, [103, 232, 249]);
  fillPolygon(canvas, bottom, [255, 255, 255]);
}

function buildIcon(size, { glyphScale = 0.82, shape = "square" } = {}) {
  const canvas = createCanvas(size);
  drawBackground(canvas);
  drawZ(canvas, glyphScale);
  if (shape === "circle") {
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 0.5;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (Math.sqrt(dx * dx + dy * dy) > radius) {
          const i = (y * size + x) * 4;
          canvas.data[i + 3] = 0;
        }
      }
    }
  }
  return encodePng(size, size, canvas.data);
}

function buildForeground(size) {
  const canvas = createCanvas(size);
  drawZ(canvas, 0.5);
  return encodePng(size, size, canvas.data);
}

function write(relativePath, buffer) {
  const target = resolve(process.cwd(), relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, buffer);
  console.log(`wrote ${relativePath} (${buffer.length} bytes)`);
}

write("public/icons/icon-192.png", buildIcon(192));
write("public/icons/icon-512.png", buildIcon(512));
write("public/icons/icon-maskable-512.png", buildIcon(512, { glyphScale: 0.62 }));
write("public/icons/apple-touch-icon.png", buildIcon(180));
write("public/favicon.ico", buildIcon(64));

// ---- Android launcher icons ----
const androidRes = "android/app/src/main/res";
if (existsSync(androidRes)) {
  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, size] of Object.entries(densities)) {
    write(`${androidRes}/mipmap-${density}/ic_launcher.png`, buildIcon(size));
    write(`${androidRes}/mipmap-${density}/ic_launcher_round.png`, buildIcon(size, { shape: "circle" }));
    write(`${androidRes}/mipmap-${density}/ic_launcher_foreground.png`, buildForeground(Math.round((size * 108) / 48)));
  }
  console.log("android launcher icons written");
}
