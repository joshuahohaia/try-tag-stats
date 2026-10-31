/**
 * Deterministic team jersey style from a team name. Same name, same jersey.
 * Port of the approved concept: md5 of the lowercased, trimmed name drives the colours, hoop count,
 * collar and trim.
 */

function md5Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const len = bytes.length;
  const padded = new Uint8Array((((len + 8) >> 6) + 1) << 6);
  padded.set(bytes);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, (len * 8) >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor((len * 8) / 2 ** 32), true);
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  for (let off = 0; off < padded.length; off += 64) {
    const M = new Uint32Array(16);
    for (let i = 0; i < 16; i++) M[i] = view.getUint32(off + i * 4, true);
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      const s = S[(i >> 4) * 4 + (i % 4)];
      B = (B + ((F << s) | (F >>> (32 - s)))) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }
  const out = new DataView(new ArrayBuffer(16));
  out.setUint32(0, a0, true);
  out.setUint32(4, b0, true);
  out.setUint32(8, c0, true);
  out.setUint32(12, d0, true);
  return [...new Uint8Array(out.buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hsl(h: number, s: number, l: number): string {
  const hue = ((h % 1) + 1) % 1;
  return `hsl(${(hue * 360).toFixed(1)}, ${(s * 100).toFixed(0)}%, ${(l * 100).toFixed(0)}%)`;
}

export interface JerseyStyle {
  primary: string;
  secondary: string;
  trim: string;
  initials: string;
  hoops: 2 | 3;
  vNeck: boolean;
}

export function jerseyStyle(name: string): JerseyStyle {
  const h = BigInt('0x' + md5Hex(name.trim().toLowerCase()));
  const hue = Number(h % 360n) / 360;
  const secondaryHue = hue + 0.07 + Number((h >> 6n) % 30n) / 360;
  const words = name.split(/\s+/).filter((w) => w && /[\p{L}\p{N}]/u.test(w[0]));
  const initials = (
    words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '?').slice(0, 2)
  ).toUpperCase();
  return {
    primary: hsl(hue, 0.6, 0.46),
    secondary: hsl(secondaryHue, 0.62, 0.3),
    trim: (h >> 21n) & 1n ? '#ffffff' : hsl(secondaryHue, 0.62, 0.3),
    initials,
    hoops: (2 + Number((h >> 12n) % 2n)) as 2 | 3,
    vNeck: Boolean((h >> 20n) & 1n),
  };
}

export { md5Hex };
