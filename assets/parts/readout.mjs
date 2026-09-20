/**
 * A small instrument bar. Four figures, each one counted rather than
 * claimed, each linked to its source from the README beneath it.
 *
 * THREE OF THE FOUR COME OUT OF THE SNAPSHOT, NOT OUT OF THIS FILE.
 *
 * They used to be typed in. That is the arrangement where the strip
 * still says 362 a year after the year stopped being 362, and where
 * the strip and the calendar underneath it can quietly disagree about
 * the same quantity. Both now read `data/activity.json`, so
 * refreshing the snapshot moves every figure on the page at once, or
 * none of them.
 */

import { P, DISPLAY, MONO } from "../lib/palette.mjs";

/**
 * The one figure with no API behind it: the number of case studies
 * written up on the portfolio. Counted by hand because it is a
 * property of the site rather than of GitHub — src/data/scenes has
 * six.
 */
const SYSTEMS = 6;

export function readout(data) {
  const cells = [
    { label: "COMMITS · 12 MONTHS", value: String(data.commits) },
    { label: "PULL REQUESTS", value: String(data.pullRequests) },
    { label: "REPOSITORIES CONTRIBUTED", value: String(data.repositories) },
    { label: "SYSTEMS DOCUMENTED", value: String(SYSTEMS), accent: true },
  ];

  const w = 1200;
  const h = 86;
  const cw = w / cells.length;

  const groups = cells
    .map((c, i) => {
      const x = i * cw;
      return `<g class="cell" style="animation-delay:${(i * 0.12).toFixed(2)}s">
      ${i ? `<line x1="${x}" y1="18" x2="${x}" y2="${h - 18}" stroke="${P.hair}" stroke-width="1"/>` : ""}
      <text x="${x + 26}" y="38" fill="${P.inkLo}" font-family="${DISPLAY}" font-size="9.5"
            font-weight="600" letter-spacing="2.2">${c.label}</text>
      <text x="${x + 26}" y="68" fill="${c.accent ? P.mark : P.inkHi}" font-family="${MONO}"
            font-size="23" font-weight="500">${c.value}</text>
    </g>`;
    })
    .join("");

  const alt = cells.map((c) => `${c.value} ${c.label}`).join(", ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${alt}">
  <title>${cells.map((c) => `${c.value} ${c.label}`).join(" · ")}</title>
  <style>
    /* Base state is the finished one; see lib/palette.mjs. */
    @keyframes rise { from { opacity:0; transform: translateY(8px); } }
    .cell { opacity: 1; animation: rise .55s cubic-bezier(.16,1,.3,1) backwards; }
    @media (prefers-reduced-motion: reduce) { .cell { animation: none; } }
  </style>
  <rect width="${w}" height="${h}" fill="${P.ground}"/>
  <rect x="0" y="0" width="${w}" height="1.5" fill="${P.mark}"/>
  ${groups}
</svg>
`;
}
