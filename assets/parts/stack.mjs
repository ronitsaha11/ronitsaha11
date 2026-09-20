/**
 * The stack grid — the same idea as the skillicons.dev row the old
 * README had, except the marks are in this repository.
 *
 * WHY NOT skillicons.dev
 *
 * It is one shared free deployment serving every profile that asks.
 * When it is rate-limited or down, the section becomes a row of
 * broken-image glyphs, which is worse than having no section. These
 * are cached by `fetch.mjs` into `icons/` and composed at build time,
 * so the only thing that can break them is this repository.
 *
 * THE CONTRAST PROBLEM, WHICH IS NOT COSMETIC
 *
 * Six of the thirty marks are officially black or near-black: Rust,
 * Next.js, Express, Vercel, three.js, OpenJDK. Drawn as supplied on a
 * #12161A tile they are invisible — Rust's #000000 sits at a contrast
 * ratio of 1.16:1, which is not a logo, it is a dark patch. C++ is a
 * seventh case that eyeballing would have missed: #00599C is a real
 * colour, it just happens to measure 2.5:1 here.
 *
 * Brand guidelines cover this by allowing a light rendering on dark
 * ground, so anything under 3:1 is lifted — a mark with a hue keeps
 * the hue and gains lightness, an achromatic mark is drawn in the
 * page's own ink. The threshold is applied by measurement, which is
 * the point: the list of seven is an output, not a decision.
 *
 * Artwork: Simple Icons (CC0). The marks are trademarks of their
 * owners and appear here only to identify the technology.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { P, DISPLAY, MONO, n, esc, REDUCED } from "../lib/palette.mjs";
import { STACK } from "../lib/stackData.mjs";

const here = join(dirname(fileURLToPath(import.meta.url)), "..");

const W = 1200;
const H = 420;

const COL_X = [44, 624];
const ROW_Y = [88, 198, 308];
const TILE = 52;
const STEP = 64;
const ICON = 26;

/* ---------------- contrast ---------------- */

const srgb = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => srgb(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

function toHsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function toHex(h, s, l) {
  const f = (k) => {
    const a = s * Math.min(l, 1 - l);
    const x = (k + h * 12) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(x - 3, 9 - x, 1))));
  };
  return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const MIN_RATIO = 3;

function legible(hex) {
  if (contrast(hex, P.plate) >= MIN_RATIO) return { hex, lifted: false };

  const [h, s] = toHsl(hex);
  // No hue to preserve: use the page ink rather than inventing a grey
  // that belongs to no one.
  if (s < 0.08) return { hex: P.inkHi, lifted: true };

  let l = toHsl(hex)[2];
  let out = hex;
  while (l < 0.86 && contrast(out, P.plate) < MIN_RATIO) {
    l = Math.min(0.86, l + 0.02);
    out = toHex(h, s, l);
  }
  return { hex: out, lifted: true };
}

/* ---------------- the cached marks ---------------- */

function mark(slug) {
  const src = readFileSync(join(here, "icons", `${slug}.svg`), "utf8");
  const hex = src.match(/fill="(#[0-9a-fA-F]{6})"/)?.[1];
  const paths = [...src.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  if (!hex || !paths.length) throw new Error(`icons/${slug}.svg: no fill or no path`);
  return { hex, paths };
}

/* ---------------- the grid ---------------- */

export function stack() {
  const tiles = [];
  const lifted = [];
  let i = 0;

  STACK.forEach((group, gi) => {
    const gx = COL_X[gi % 2];
    const gy = ROW_Y[Math.floor(gi / 2)];

    tiles.push(
      `<text x="${gx}" y="${gy}" fill="${P.inkMd}" font-family="${DISPLAY}" font-size="8.5" font-weight="700" letter-spacing="1.8">${esc(group.label)}</text>`,
    );

    group.items.forEach(([slug, label], k) => {
      const m = mark(slug);
      const { hex, lifted: wasLifted } = legible(m.hex);
      if (wasLifted) lifted.push(slug);

      const x = gx + k * STEP;
      const y = gy + 16;
      // 24-unit artwork, centred in the tile at ICON px.
      const t = ICON / 24;
      const ox = x + (TILE - ICON) / 2;
      const oy = y + (TILE - ICON) / 2;

      tiles.push(`<g class="tile" style="animation-delay:${n(0.05 + i * 0.03, 2)}s">
      <rect class="pad" style="animation-delay:${n(i * 0.11, 2)}s" x="${x}" y="${y}" width="${TILE}" height="${TILE}" rx="12" fill="${P.plate}" stroke="${P.inkHi}" stroke-opacity=".10"/>
      <g transform="translate(${n(ox)} ${n(oy)}) scale(${n(t, 4)})" fill="${hex}">${m.paths
        .map((d) => `<path d="${d}"/>`)
        .join("")}</g>
      <text x="${n(x + TILE / 2)}" y="${n(y + TILE + 13)}" fill="${P.inkLo}" font-family="${MONO}" font-size="8.5" text-anchor="middle">${esc(label)}</text>
    </g>`);
      i++;
    });
  });

  const alt = STACK.map((g) => `${g.label}: ${g.items.map(([, l]) => l).join(", ")}`).join(". ");

  return {
    lifted,
    count: i,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(alt)}">
  <title>Stack — ${i} technologies, each one in a linked repository</title>
  <style>
    @keyframes settle { from { opacity: 0; transform: translateY(9px); } }
    @keyframes edge   { 0%,100% { stroke-opacity: .10 } 50% { stroke-opacity: .26 } }

    /* Base state is the finished one; the delay only staggers it. */
    .tile { opacity: 1; transform-box: fill-box; transform-origin: center;
            animation: settle .5s cubic-bezier(.16,1,.3,1) backwards; }
    /* A slow wave across the grid rather than thirty things blinking:
       the delay is the tile's index, so the highlight travels. */
    .pad  { animation: edge 6s ease-in-out infinite; }
${REDUCED(".tile, .pad")}
  </style>

  <rect width="${W}" height="${H}" fill="${P.ground}"/>
  <rect width="${W}" height="1.5" fill="${P.mark}"/>

  <text x="44" y="32" fill="${P.inkMd}" font-family="${DISPLAY}" font-size="10" font-weight="700" letter-spacing="2.4">STACK</text>
  <text x="1156" y="32" fill="${P.inkLo}" font-family="${MONO}" font-size="10" text-anchor="end">every mark below is in one of the seven repositories</text>
  <line x1="44" y1="46" x2="1156" y2="46" stroke="${P.hair}" stroke-width="1"/>

  ${tiles.join("\n  ")}
</svg>
`,
  };
}
