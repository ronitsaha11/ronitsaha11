/**
 * A genuinely three-dimensional figure, in a file format with no
 * third dimension.
 *
 * WHAT IT IS
 *
 * The `orbit` formation from the portfolio's WebGL scene — one of the
 * six it uses. `radius = 2.6 + g * 1.7` and `tilt = 0.28 + g * 0.34`
 * are the expressions that run in the browser there, verbatim (see
 * src/components/lattice/formations.ts, case "orbit"), as is the
 * rotation about y. The per-ring phase is chosen here rather than
 * copied, for the reason given below. The points are real 3D
 * coordinates put through a real perspective divide; nothing is a
 * decorative ellipse drawn by eye.
 *
 * HOW IT ROTATES WITHOUT A 3D ENGINE
 *
 * CSS inside an SVG has no `preserve-3d`, so the rotation cannot be
 * handed to the renderer. It does not need to be:
 *
 *   Under a rotation about the y axis, EVERY point travels a
 *   horizontal circle. Two points on the same circle trace the same
 *   closed screen path — they are just at different places along it.
 *
 * So the path is computed once per distinct (radius, height) pair,
 * emitted as one `@keyframes`, and every node sharing that circle
 * gets the same animation with a NEGATIVE `animation-delay` equal to
 * its own starting angle. One rule, many nodes, all rigidly in step,
 * because they are all reading the same clock.
 *
 * WHICH ONLY PAYS IF THE RING IS ACTUALLY SYMMETRIC.
 *
 * Nodes at a and at pi - a sit on the same circle: the mirror flips x
 * and leaves both the height and the distance from the axis alone.
 * That is where the sharing comes from. The first version offset each
 * ring by an arbitrary `g * 0.15` radians, which put every node on a
 * grid that is NOT closed under that mirror — so all thirty-five
 * nodes got their own keyframes, the dedupe below returned exactly
 * what it was given, and the saving this whole design exists for was
 * zero while the comment claimed otherwise. The offset is now a
 * multiple of HALF the node spacing, the one family of rotations
 * that preserves the mirror. Thirty-five nodes, twenty-two circles.
 * The figure printed on the plate is `paths.size`, so if that ever
 * stops being true the picture says so itself.
 *
 * The faint rails are the same sampled points joined up, so a rail
 * and the node riding it cannot disagree — they are literally the
 * same array.
 *
 * WHY cx/cy/r AND NOT transform
 *
 * Because of the rule the rest of this directory follows: the image
 * has to be composed before any CSS runs. A transform-based node
 * lives at the origin and is moved into place by the animation, so
 * with CSS stripped the whole structure collapses into the top-left
 * corner. Animating the SVG geometry properties instead means the
 * resting pose can be written as ordinary `cx`/`cy`/`r` attributes —
 * which a CSS animation overrides when it runs, and which are simply
 * the picture when it does not. `prefers-reduced-motion` and
 * "renderer does not animate geometry properties" then collapse to
 * the same one-line answer: you get the still projection.
 */

import { P, DISPLAY, MONO, rng, n, REDUCED } from "../lib/palette.mjs";

const W = 1200;
const H = 420;
const TAU = Math.PI * 2;

/* ---- the scene, in world units ---- */

const RINGS = [1, 2, 3];
const PER = 14;
const CORE = 5;

/* ---- the camera ---- */

const F = 26; // distance to the eye, world units
const PXU = 19.2; // world unit -> px
const CX = 600;
const CY = 216;

const DUR = 22; // seconds for one revolution
const STOPS = 20; // samples per revolution

/** Exactly the expressions in the portfolio's formations.ts. */
function worldPoints() {
  const rand = rng(0x5bf03635);
  const pts = [];

  for (let k = 0; k < CORE; k++) {
    pts.push({
      x: (rand() * 2 - 1) * 1.45,
      y: (rand() * 2 - 1) * 1.45,
      z: (rand() * 2 - 1) * 1.45,
      base: 3.2,
      accent: k === 0,
    });
  }

  for (const g of RINGS) {
    const radius = 2.6 + g * 1.7;
    const tilt = 0.28 + g * 0.34;
    for (let k = 0; k < PER; k++) {
      // Half the node spacing, times the ring index: offsets the
      // rings against each other without breaking the mirror that
      // makes the keyframes shareable. See the note at the top.
      const a = (k / PER) * TAU + (g * TAU) / (2 * PER);
      const ex = Math.cos(a) * radius;
      const ey = Math.sin(a) * radius;
      pts.push({
        x: ex,
        y: ey * Math.sin(tilt),
        z: ey * Math.cos(tilt),
        base: 2.6,
        accent: rand() > 0.86,
        g,
      });
    }
  }
  return pts;
}

/** The body of one revolution — and the identity of that revolution. */
const css = (frames) =>
  frames
    .map((f) => `${n(f.at, 2)}%{cx:${n(f.X)}px;cy:${n(f.Y)}px;r:${n(f.r, 2)}px;opacity:${n(f.o, 2)}}`)
    .join("");

const project = (x, y, z) => {
  const s = F / (F - z);
  return { X: CX + x * s * PXU, Y: CY - y * s * PXU, s };
};

export function orbit() {
  const pts = worldPoints();

  // Every node's circle about the axis, and where on it the node is.
  for (const p of pts) {
    p.R = Math.hypot(p.x, p.z);
    p.phi = (Math.atan2(p.z, p.x) + TAU) % TAU;
  }
  const RMAX = Math.max(...pts.map((p) => p.R));

  /* ---- one sampled path per distinct circle ---- */

  const paths = new Map();
  for (const p of pts) {
    const frames = [];
    for (let i = 0; i <= STOPS; i++) {
      const th = (i / STOPS) * TAU;
      const z = p.R * Math.sin(th);
      const { X, Y, s } = project(p.R * Math.cos(th), p.y, z);
      frames.push({
        at: (i / STOPS) * 100,
        X,
        Y,
        r: p.base * s,
        // Depth on one scale for the whole structure, so a node of
        // the inner ring in front never out-reads one of the outer
        // ring behind it.
        o: 0.26 + 0.74 * ((z + RMAX) / (2 * RMAX)),
      });
    }

    // KEYED ON THE EMITTED CSS, NOT ON THE WORLD COORDINATES.
    //
    // Mirror partners are the same circle in exact arithmetic and
    // differ by about 1e-16 in this one, which stays invisible until
    // a pair lands either side of a rounding boundary and silently
    // becomes two keyframe blocks — which is what the coordinate key
    // here did to one pair of the thirty-five. Hashing the text that
    // actually gets written makes the question "do these render
    // identically", which is the question being asked all along.
    const body = css(frames);
    if (!paths.has(body)) paths.set(body, { id: `k${paths.size}`, frames, body });
    p.path = paths.get(body);
  }

  /* ---- guard: the projection has to fit the plate ---- */

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const { frames } of paths.values()) {
    for (const f of frames) {
      minX = Math.min(minX, f.X - f.r);
      maxX = Math.max(maxX, f.X + f.r);
      minY = Math.min(minY, f.Y - f.r);
      maxY = Math.max(maxY, f.Y + f.r);
    }
  }
  // Not a comment that hopes: a build that pushes the structure off
  // the plate fails here rather than shipping a clipped picture.
  if (minX < 400 || maxX > 800 || minY < 56 || maxY > 376) {
    throw new Error(
      `orbit: projection out of bounds x[${n(minX)},${n(maxX)}] y[${n(minY)},${n(maxY)}] ` +
        `— adjust PXU (${PXU}) or F (${F})`,
    );
  }

  /* ---- css ---- */

  const keyframes = [...paths.values()]
    .map((p) => `    @keyframes ${p.id} {${p.body}}`)
    .join("\n");

  const classes = [...paths.values()]
    .map((p) => `    .${p.id} { animation-name: ${p.id}; }`)
    .join("\n");

  /* ---- elements ---- */

  const rails = [...paths.values()]
    .map(
      (p) =>
        `<path d="${p.frames
          .map((f, i) => `${i ? "L" : "M"}${n(f.X)} ${n(f.Y)}`)
          .join(" ")}Z" fill="none" stroke="${P.edge}" stroke-width=".8" opacity=".3"/>`,
    )
    .join("");

  const nodes = pts
    .map((p) => {
      // The resting pose is the node's ACTUAL position, not the
      // nearest of the twenty samples. It is what a reader sees
      // whenever the animation does not run, so it should not carry
      // the sampling error that only the moving version can afford.
      const here = project(p.x, p.y, p.z);
      const rest = {
        X: here.X,
        Y: here.Y,
        r: p.base * here.s,
        o: 0.26 + 0.74 * ((p.z + RMAX) / (2 * RMAX)),
      };
      const delay = -(p.phi / TAU) * DUR;
      return `<circle class="orb ${p.path.id}" style="animation-delay:${n(delay, 2)}s" cx="${n(rest.X)}" cy="${n(rest.Y)}" r="${n(rest.r, 2)}" opacity="${n(rest.o, 2)}" fill="${p.accent ? P.mark : P.node}"/>`;
    })
    .join("");

  const FORMATIONS = ["stack", "pipeline", "crossstack", "orbit", "ledger", "mesh"];
  const list = FORMATIONS.map((f, i) => {
    const on = f === "orbit";
    return `<text x="1156" y="${104 + i * 22}" text-anchor="end" fill="${on ? P.mark : P.inkLo}" font-family="${MONO}" font-size="11">${f}${on ? "  ◂" : ""}</text>`;
  }).join("");

  const blurb = [
    "one WebGL scene, six formations.",
    "the case study picks the shape;",
    "scroll drives the camera.",
  ]
    .map(
      (t, i) =>
        `<text x="44" y="${106 + i * 20}" fill="${P.inkLo}" font-family="${MONO}" font-size="11.5">${t}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="The orbit formation from the portfolio's WebGL scene: ${pts.length} nodes on three tilted rings around a core, projected in perspective and rotating about the vertical axis.">
  <title>orbit — one of the six lattice formations, projected</title>
  <style>
${keyframes}
    @keyframes fadein { from { opacity: 0; } }
    @keyframes pulse  { 0%,100% { opacity: .30 } 50% { opacity: .70 } }

    /* The resting pose is on the elements as cx/cy/r; this only takes
       over while it is actually running. See the note at the top. */
    .orb  { animation-duration: ${DUR}s; animation-timing-function: linear;
            animation-iteration-count: infinite; }
${classes}
    .rail { opacity: 1; animation: fadein 1.2s .2s ease-out backwards; }
    .axis { animation: pulse 5s ease-in-out infinite; }
${REDUCED(".orb, .rail, .axis")}
  </style>

  <rect width="${W}" height="${H}" fill="${P.ground}"/>
  <rect width="${W}" height="1.5" fill="${P.mark}"/>

  <text x="44" y="32" fill="${P.inkMd}" font-family="${DISPLAY}" font-size="10" font-weight="700" letter-spacing="2.4">THE LATTICE, PROJECTED</text>
  <text x="1156" y="32" fill="${P.inkLo}" font-family="${MONO}" font-size="10" text-anchor="end">perspective divide · rotation about y</text>
  <line x1="44" y1="46" x2="1156" y2="46" stroke="${P.hair}" stroke-width="1"/>

  ${blurb}
  ${list}
  <text x="1156" y="76" fill="${P.inkMd}" font-family="${DISPLAY}" font-size="8.5" font-weight="700" letter-spacing="1.6" text-anchor="end">FORMATIONS</text>

  <!-- the axis everything turns about -->
  <line class="axis" x1="${CX}" y1="${n(CY - 186)}" x2="${CX}" y2="${n(CY + 186)}" stroke="${P.measured}" stroke-width="1" stroke-dasharray="2 6"/>

  <g class="rail">${rails}</g>
  <g>${nodes}</g>

  <text x="44" y="394" fill="${P.inkLo}" font-family="${MONO}" font-size="10.5">${pts.length} nodes · ${paths.size} distinct circles · one keyframe each, phase-shifted by a negative delay — the whole structure reads one clock.</text>
  <text x="1156" y="394" fill="${P.inkLo}" font-family="${MONO}" font-size="9.5" text-anchor="end">assets/parts/orbit.mjs</text>
</svg>
`;
}
