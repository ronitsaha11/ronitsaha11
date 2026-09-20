/**
 * The banner: PratiBimb's pipeline, drawn as the portfolio draws it.
 *
 * Almost nothing here is a literal. The station positions, the ring
 * of nodes around each one, the gate's position and — the important
 * one — the fraction of the packet's run at which it crosses that
 * gate are all derived from four constants. Hand-written they would
 * be two hundred magic numbers that quietly disagree with each other
 * the first time anything moves.
 */

import { P, DISPLAY, MONO, rng } from "../lib/palette.mjs";

/* ---------------- the pipeline ---------------- */

const W = 1200;
const H = 280;

/** Twelve stations, because PratiBimb's pipeline has twelve stages. */
const STATIONS = 12;
/** The egress gate sits after stage four, where the real one does. */
const GATE_AFTER = 4;

const X0 = 470;
const X1 = 1150;
const CY = 142;

const stationX = (i) => X0 + ((X1 - X0) * i) / (STATIONS - 1);
const GATE_X = (stationX(GATE_AFTER - 1) + stationX(GATE_AFTER)) / 2;

/**
 * Where the gate sits along the packet's run, 0..1.
 *
 * THIS IS THE ONE NUMBER THE BANNER IS ABOUT. The packet changes
 * colour when it crosses the boundary, and the first version switched
 * at 50% of the animation — the middle of the strip, not the gate.
 * The dot went on being orange past a teal membrane, which says the
 * opposite of what the system does. Derived from the geometry so it
 * cannot drift again.
 */
const GATE_T = (GATE_X - X0) / (X1 - X0);

const NODES = (() => {
  const rand = rng(0x9e3779b9);
  const out = [];
  for (let i = 0; i < STATIONS; i++) {
    const x = stationX(i);
    // A station is a ring, so the stages can be counted rather than
    // read as a scatter. Four was a handful of dots on a line.
    const ring = 6 + Math.floor(rand() * 4);
    for (let k = 0; k < ring; k++) {
      const a = (k / ring) * Math.PI * 2 + rand() * 0.4;
      const r = 24 + rand() * 20;
      out.push({
        x: x + Math.cos(a) * r * 0.42,
        y: CY + Math.sin(a) * r,
        s: 1.7 + rand() * 2.4,
        // A tenth of the field carries the accent, as in the scene.
        accent: rand() > 0.9,
        delay: (i * 0.07 + rand() * 0.1).toFixed(2),
      });
    }
  }
  return out;
})();

const EDGES = Array.from({ length: STATIONS - 1 }, (_, i) => ({
  x1: stationX(i),
  x2: stationX(i + 1),
  delay: (i * 0.09).toFixed(2),
}));

/* ---------------- the banner ---------------- */

export function banner() {
  const grid = [];
  for (let x = 0; x <= W; x += 72) {
    grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${P.grid}" stroke-width="1"/>`);
  }
  for (let y = 0; y <= H; y += 72) {
    grid.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${P.grid}" stroke-width="1"/>`);
  }

  const edgeEls = EDGES.map(
    (e) =>
      `<line class="edge" style="animation-delay:${e.delay}s" x1="${e.x1.toFixed(1)}" y1="${CY}" x2="${e.x2.toFixed(1)}" y2="${CY}" stroke="${P.edge}" stroke-width="1.6"/>`,
  ).join("");

  const nodeEls = NODES.map(
    (n) =>
      `<circle class="node" style="animation-delay:${n.delay}s" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.s.toFixed(1)}" fill="${n.accent ? P.mark : P.node}"/>`,
  ).join("");

  /**
   * Four packets, offset in time, each changing colour AT the gate.
   *
   * THE DELAY GOES ON EVERY LAYER, NOT JUST THE GROUP. The group
   * carries the position animation and the two children carry the
   * before/after colours; put the offset only on the group and all
   * four packets flip colour on the same wall clock regardless of
   * where they actually are, so one turns teal a third of the strip
   * BEFORE the boundary. Same delay, same timeline, three places.
   */
  const packets = [0, 1, 2, 3]
    .map((k) => {
      const d = `animation-delay:${(k * 1.95).toFixed(2)}s`;
      return `<g class="pk" style="${d}">
      <circle class="pk-a" style="${d}" r="8" cy="${CY}" fill="${P.mark}" opacity=".14"/>
      <circle class="pk-b" style="${d}" r="8" cy="${CY}" fill="${P.measured}" opacity=".14"/>
      <circle class="pk-a" style="${d}" r="4.6" cy="${CY}" fill="${P.mark}"/>
      <circle class="pk-b" style="${d}" r="4.6" cy="${CY}" fill="${P.measured}"/>
    </g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Ronit Saha, full-stack and systems engineer. Privacy-preserving perception, cross-language static analysis, geospatial platforms.">
  <title>Ronit Saha — full-stack &amp; systems engineer</title>
  <style>
    @keyframes draw   { from { stroke-dashoffset: 1; } }
    @keyframes pop    { from { opacity: 0; transform: scale(.4); } }
    @keyframes wipe   { from { width: 0; } }
    @keyframes run    { from { transform: translateX(${X0}px); } to { transform: translateX(${X1}px); } }
    @keyframes before { 0%,${(GATE_T * 100).toFixed(1)}% { opacity:1 } ${(GATE_T * 100 + 0.1).toFixed(1)}%,100% { opacity:0 } }
    @keyframes after  { 0%,${(GATE_T * 100).toFixed(1)}% { opacity:0 } ${(GATE_T * 100 + 0.1).toFixed(1)}%,100% { opacity:1 } }
    @keyframes gate   { 0%,100% { opacity:.55 } 50% { opacity:1 } }
    @keyframes blink  { 0%,45% { opacity:1 } 50%,95% { opacity:0 } 100% { opacity:1 } }
    @keyframes breathe{ 0%,100% { opacity:.8 } 50% { opacity:1 } }

    .edge { stroke-dasharray: 1; stroke-dashoffset: 0; pathLength: 1;
            animation: draw .6s ease-out backwards; }
    .node { opacity: 1; transform-box: fill-box; transform-origin: center;
            animation: pop .5s cubic-bezier(.16,1,.3,1) backwards; }
    .mask { width: ${W}px; animation: wipe .9s cubic-bezier(.4,0,.1,1) backwards; }
    .gate { animation: gate 3.2s ease-in-out infinite; }
    .pk   { animation: run 7.8s linear infinite; }
    .pk-a { animation: before 7.8s linear infinite; }
    .pk-b { animation: after 7.8s linear infinite; }
    .caret{ animation: blink 1.1s step-end infinite; }
    .live { animation: breathe 2.6s ease-in-out infinite; }

    /* Nothing moves for a reader who asked for stillness. Because
       every base state above is already the finished one, switching
       the animations off is the whole implementation. */
    @media (prefers-reduced-motion: reduce) {
      .edge, .node, .mask, .gate, .pk, .pk-a, .caret, .live { animation: none; }
      /* One exception: the two packet colours are stacked, so with no
         animation alternating them the post-gate one must be hidden
         or both draw at once. */
      .pk-b { opacity: 0; }
    }
  </style>

  <rect width="${W}" height="${H}" fill="${P.ground}"/>
  <g>${grid.join("")}</g>

  <!-- registration marks: the portfolio's plate fiducials -->
  <path d="M18 18 h14 M18 18 v14" stroke="${P.mark}" stroke-width="2" fill="none"/>
  <path d="M${W - 18} ${H - 18} h-14 M${W - 18} ${H - 18} v-14" stroke="${P.mark}" stroke-width="2" fill="none"/>

  <defs>
    <clipPath id="reveal"><rect class="mask" x="0" y="0" width="${W}" height="${H}"/></clipPath>
  </defs>

  <g clip-path="url(#reveal)">
    <g>${edgeEls}</g>

    <!-- THE EGRESS GATE. A packet crosses it and comes out the other
         side in the measured colour: a sensitive value leaving as a
         typed placeholder. It is the centre of the picture, so it is
         drawn like one. -->
    <g class="gate">
      <rect x="${(GATE_X - 11).toFixed(1)}" y="${CY - 62}" width="22" height="124" fill="${P.measured}" opacity=".10"/>
      <line x1="${GATE_X.toFixed(1)}" y1="${CY - 62}" x2="${GATE_X.toFixed(1)}" y2="${CY + 62}" stroke="${P.measured}" stroke-width="2"/>
      <path d="M${(GATE_X - 5).toFixed(1)} ${CY - 62} h10 M${(GATE_X - 5).toFixed(1)} ${CY + 62} h10"
            stroke="${P.measured}" stroke-width="2"/>
    </g>
    <text x="${GATE_X.toFixed(1)}" y="${CY + 84}" fill="${P.measured}" font-family="${DISPLAY}"
          font-size="10" font-weight="700" letter-spacing="2.6" text-anchor="middle">EGRESS GATE</text>

    <g>${nodeEls}</g>
    <g>${packets}</g>

    <!-- identity -->
    <text x="44" y="108" fill="${P.inkHi}" font-family="${DISPLAY}" font-size="58"
          font-weight="800" letter-spacing="-2.2">Ronit Saha</text>
    <text x="46" y="142" fill="${P.inkMd}" font-family="${DISPLAY}" font-size="19"
          font-weight="600" letter-spacing="-0.2">Full-stack &amp; systems engineer</text>

    <line x1="46" y1="168" x2="410" y2="168" stroke="${P.hair}" stroke-width="1"/>

    <text x="46" y="196" fill="${P.inkLo}" font-family="${MONO}" font-size="11.5" letter-spacing=".4">privacy-preserving perception</text>
    <text x="46" y="216" fill="${P.inkLo}" font-family="${MONO}" font-size="11.5" letter-spacing=".4">cross-language static analysis</text>
    <text x="46" y="236" fill="${P.inkLo}" font-family="${MONO}" font-size="11.5" letter-spacing=".4">geospatial platforms<tspan class="caret" fill="${P.mark}"> ▌</tspan></text>

    <g class="live">
      <circle cx="${W - 134}" cy="34" r="3.2" fill="${P.mark}"/>
      <text x="${W - 124}" y="38" fill="${P.inkLo}" font-family="${DISPLAY}" font-size="9.5"
            font-weight="600" letter-spacing="2.2">GROUND TRUTH</text>
    </g>
  </g>
</svg>
`;
}
