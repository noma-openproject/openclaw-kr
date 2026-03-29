#!/usr/bin/env node
// scripts/generate-placeholder-icon.js
// 512x512 placeholder PNG 아이콘 생성 (외부 의존성 없음)
// electron-builder가 assets/icon.png를 .icns/.ico로 자동 변환
//
// 사용법: node scripts/generate-placeholder-icon.js
// 출력: assets/icon.png

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 512;
const BG_R = 0x1a, BG_G = 0x1a, BG_B = 0x2e; // #1a1a2e (dark navy)
const FG_R = 0x4e, FG_G = 0xc9, FG_B = 0xb0; // #4ec9b0 (teal accent)

// "N" 글자 패턴 (16x20 bitmap, 1=foreground)
const N_PATTERN = [
  '1100000000000011',
  '1110000000000011',
  '1111000000000011',
  '1111100000000011',
  '1101110000000011',
  '1100111000000011',
  '1100011100000011',
  '1100001110000011',
  '1100000111000011',
  '1100000011100011',
  '1100000001110011',
  '1100000000111011',
  '1100000000011111',
  '1100000000001111',
  '1100000000000111',
  '1100000000000011',
];

/**
 * 512x512 RGBA 버퍼 생성 — 배경색 + 중앙 "N" 렌더링
 */
function createImageData() {
  const data = Buffer.alloc(SIZE * SIZE * 3);

  // 배경 채우기
  for (let i = 0; i < SIZE * SIZE; i++) {
    data[i * 3] = BG_R;
    data[i * 3 + 1] = BG_G;
    data[i * 3 + 2] = BG_B;
  }

  // "N" 렌더링 (중앙, 스케일링)
  const charW = N_PATTERN[0].length;
  const charH = N_PATTERN.length;
  const scale = Math.floor(SIZE * 0.5 / Math.max(charW, charH));
  const offsetX = Math.floor((SIZE - charW * scale) / 2);
  const offsetY = Math.floor((SIZE - charH * scale) / 2);

  for (let cy = 0; cy < charH; cy++) {
    for (let cx = 0; cx < charW; cx++) {
      if (N_PATTERN[cy][cx] === '1') {
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = offsetX + cx * scale + sx;
            const py = offsetY + cy * scale + sy;
            if (px < SIZE && py < SIZE) {
              const idx = (py * SIZE + px) * 3;
              data[idx] = FG_R;
              data[idx + 1] = FG_G;
              data[idx + 2] = FG_B;
            }
          }
        }
      }
    }
  }

  return data;
}

/**
 * 최소 PNG 파일 생성 (RGB, no alpha)
 * PNG spec: signature + IHDR + IDAT + IEND
 */
function createPNG(imageData) {
  const chunks = [];

  // PNG signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);  // width
  ihdr.writeUInt32BE(SIZE, 4);  // height
  ihdr.writeUInt8(8, 8);        // bit depth
  ihdr.writeUInt8(2, 9);        // color type: RGB
  ihdr.writeUInt8(0, 10);       // compression
  ihdr.writeUInt8(0, 11);       // filter
  ihdr.writeUInt8(0, 12);       // interlace
  chunks.push(makeChunk('IHDR', ihdr));

  // IDAT chunk — scanlines with filter byte (0 = None)
  const rawData = Buffer.alloc(SIZE * (SIZE * 3 + 1));
  for (let y = 0; y < SIZE; y++) {
    const rowOffset = y * (SIZE * 3 + 1);
    rawData[rowOffset] = 0; // filter: None
    imageData.copy(rawData, rowOffset + 1, y * SIZE * 3, (y + 1) * SIZE * 3);
  }
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  chunks.push(makeChunk('IDAT', compressed));

  // IEND chunk
  chunks.push(makeChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([length, typeBytes, data, crc]);
}

// CRC-32 (PNG spec)
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xFF];
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

// --- Main ---
const imageData = createImageData();
const png = createPNG(imageData);
const outPath = path.join(__dirname, '..', 'assets', 'icon.png');
fs.writeFileSync(outPath, png);
console.log(`✅ Placeholder icon generated: ${outPath} (${png.length} bytes, ${SIZE}x${SIZE})`);
