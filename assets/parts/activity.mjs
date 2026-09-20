/**
 * The contribution year, drawn from the snapshot in `data/activity.json`.
 *
 * WHAT THIS IS NOT
 *
 * It is not a streak flex. The honest reading of this particular year
 * is that 31 of 366 days have a contribution on them and nearly two
 * thirds of the total landed in one month, so a graphic that implied
 * steady daily output would be a graphic that lied. Everything here
 * is therefore literal: the real calendar, the real weekly cadence,
 * and four figures that include the unflattering ones. The caption
 * says "bursts" because the data says bursts.
 *
 * WHY THE SPARKLINE SITS DIRECTLY UNDER THE CALENDAR
 *
 * They share an x axis — column i of the heatmap and point i of the
 * line are the same week, positioned from the same constant. Two
 * charts of the same series on two different scales is how a reader
 * gets quietly misled, so there is one scale and it is computed once.
 */

import { P, DISPLAY, MONO, n, REDUCED } from "../lib/palette.mjs";

const W = 1200;
const H = 340;

/* The calendar's geometry. Everything else is positioned from these. */
const CELL = 13;
const GAP = 3.5;
const STEP = CELL + GAP;
const CAL_X = 72;
const CAL_Y = 80;

const CHART_TOP = 222;
const CHART_BASE = 292;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Mix the accent into the ground, so the ramp cannot drift off-palette. */
function ember(t) {
  const g = [0x0b, 0x0e, 0x0f];
  const m = [0xff, 0x6b, 0x33];
  const c = g.map((v, i) => Math.round(v + (m[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Five buckets. The thresholds are stated on the page rather than
 * being a private decision of the renderer, because a heatmap with
 * unlabelled bins can be made to say almost anything.
 */
const BINS = [
  { min: 1, fill: ember(0.26), label: "1–3" },
  { min: 4, fill: ember(0.5), label: "4–9" },
  { min: 10, fill: ember(0.74), label: "10–19" },
  { min: 20, fill: ember(1), label: "20+" },
];
const EMPTY = "#171C20";
const UPTO = [3, 9, 19, Infinity];

const binOf = (v) => (v <= 0 ? -1 : UPTO.findIndex((t) => v <= t));

/** Everything the page states about the year, derived in one place. */
export function stats(data) {
  const days = data.weeks.flat();
  const active = days.filter((d) => d[1] > 0);
  const counts = active.map((d) => d[1]).sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  for (const d of days) {
    run = d[1] > 0 ? run + 1 : 0;
    if (run > best) best = run;
  }

  return {
    days: days.length,
    active: active.length,
    longest: best,
    busiest: Math.max(...counts),
    median: counts[Math.floor(counts.length / 2)],
    weekly: data.weeks.map((w) => w.reduce((a, d) => a + d[1], 0)),
    from: days[0][0],
    to: days.at(-1)[0],
    partialLast: data.weeks.at(-1).length < 7,
  };
}

export function activity(data) {
  const s = stats(data);
  const weeks = data.weeks;
  const span = weeks.length * STEP - GAP;

  /* ---- the heatmap, one group per week so the reveal can sweep ---- */

  const columns = weeks
    .map((week, i) => {
      const x = CAL_X + i * STEP;
      const cells = week
        .map((d) => {
          const b = binOf(d[1]);
          const y = CAL_Y + d[2] * STEP;
          const fill = b < 0 ? EMPTY : BINS[b].fill;
          return `<rect x="${n(x)}" y="${n(y)}" width="${CELL}" height="${CELL}" rx="2.5" fill="${fill}"><title>${d[0]}: ${d[1]}</title></rect>`;
        })
        .join("");
      return `<g class="wk" style="animation-delay:${n(i * 0.011, 3)}s">${cells}</g>`;
    })
    .join("");

  /* ---- month rules, placed where the month actually turns ---- */

  const monthMarks = [];
  let seen = "";
  weeks.forEach((week, i) => {
    const m = week[0][0].slice(0, 7);
    if (m === seen) return;
    seen = m;
    // The first column is not a month boundary, it is where the
    // window happens to start; labelling it invites the reader to
    // read a partial month as a full one.
    if (i === 0) return;
    monthMarks.push({ x: CAL_X + i * STEP, label: MONTHS[Number(m.slice(5)) - 1] });
  });

  const monthEls = monthMarks
    .map(
      (m) =>
        `<text x="${n(m.x)}" y="70" fill="${P.inkLo}" font-family="${MONO}" font-size="9.5">${m.label}</text>`,
    )
    .join("");

  const weekdayEls = [
    [1, "Mon"],
    [3, "Wed"],
    [5, "Fri"],
  ]
    .map(
      ([i, t]) =>
        `<text x="64" y="${n(CAL_Y + i * STEP + 10)}" fill="${P.inkLo}" font-family="${MONO}" font-size="9.5" text-anchor="end">${t}</text>`,
    )
    .join("");

  /* ---- the weekly cadence, on the calendar's own x axis ---- */

  const peak = Math.max(...s.weekly);
  const px = (i) => CAL_X + i * STEP + CELL / 2;
  const py = (v) => CHART_BASE - (v / peak) * (CHART_BASE - CHART_TOP);

  const line = s.weekly.map((v, i) => `${i ? "L" : "M"}${n(px(i))} ${n(py(v))}`).join(" ");
  const area = `${line} L${n(px(s.weekly.length - 1))} ${CHART_BASE} L${n(px(0))} ${CHART_BASE} Z`;

  const peakAt = s.weekly.indexOf(peak);

  /* ---- four figures, including the unflattering ones ---- */

  const figures = [
    { label: "ACTIVE DAYS", value: `${s.active} / ${s.days}` },
    { label: "LONGEST STREAK", value: `${s.longest} d` },
    { label: "BUSIEST DAY", value: String(s.busiest), accent: true },
    { label: "MEDIAN / ACTIVE DAY", value: String(s.median) },
  ]
    .map((f, i) => {
      // One column, label left and figure right on a shared baseline.
      // Two-up did not fit: "MEDIAN / ACTIVE DAY" over "31 / 366" is
      // wider than half the panel, so the columns collided.
      const y = 96 + i * 28;
      return `<g class="fig" style="animation-delay:${n(0.5 + i * 0.09, 2)}s">
      ${i ? `<line x1="984" y1="${y - 19}" x2="1156" y2="${y - 19}" stroke="${P.hair}" stroke-width="1"/>` : ""}
      <text x="984" y="${y}" fill="${P.inkLo}" font-family="${DISPLAY}" font-size="8" font-weight="600" letter-spacing="1.2">${f.label}</text>
      <text x="1156" y="${y + 1}" text-anchor="end" fill="${f.accent ? P.mark : P.inkHi}" font-family="${MONO}" font-size="15">${f.value}</text>
    </g>`;
    })
    .join("");

  const legend = BINS.map(
    (b, i) =>
      `<rect x="${n(820 + i * 17)}" y="205" width="11" height="11" rx="2" fill="${b.fill}"/>`,
  ).join("");

  const alt =
    `Contribution calendar for ${s.from} to ${s.to}: ${data.contributions} contributions, ` +
    `${s.active} active days out of ${s.days}, longest streak ${s.longest} days, ` +
    `busiest day ${s.busiest}, median ${s.median} on an active day.`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${alt}">
  <title>Contribution year — ${s.from} to ${s.to}</title>
  <style>
    @keyframes col   { from { opacity: 0; transform: translateY(7px); } }
    @keyframes rise  { from { opacity: 0; transform: translateY(6px); } }
    @keyframes draw  { from { stroke-dashoffset: 1; } }
    @keyframes fade  { from { opacity: 0; } }
    @keyframes sweep { from { transform: translateX(-140px); } to { transform: translateX(${n(span + 140)}px); } }
    @keyframes blink { 0%,45% { opacity: 1 } 50%,95% { opacity: 0 } 100% { opacity: 1 } }

    /* Base state is the finished one throughout — see lib/palette.mjs. */
    .wk    { opacity: 1; animation: col .5s cubic-bezier(.16,1,.3,1) backwards; }
    .fig   { opacity: 1; animation: rise .5s cubic-bezier(.16,1,.3,1) backwards; }
    .trace { stroke-dasharray: 1; stroke-dashoffset: 0; pathLength: 1;
             animation: draw 1.6s .35s cubic-bezier(.4,0,.2,1) backwards; }
    .wash  { opacity: 1; animation: fade 1.1s .9s ease-out backwards; }
    .scan  { animation: sweep 7s 1.2s linear infinite; }
    .now   { animation: blink 1.3s step-end infinite; }
${REDUCED(".wk, .fig, .trace, .wash, .scan, .now")}
    /* The scan is the one element with nothing behind it, so it is
       the one element that has to be sent away rather than stilled. */
    @media (prefers-reduced-motion: reduce) { .scan { opacity: 0; } }
  </style>

  <rect width="${W}" height="${H}" fill="${P.ground}"/>
  <rect width="${W}" height="1.5" fill="${P.mark}"/>

  <defs>
    <linearGradient id="scanG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${P.mark}" stop-opacity="0"/>
      <stop offset=".5" stop-color="${P.mark}" stop-opacity=".16"/>
      <stop offset="1" stop-color="${P.mark}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="washG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.mark}" stop-opacity=".30"/>
      <stop offset="1" stop-color="${P.mark}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="calClip">
      <rect x="${CAL_X}" y="${CAL_Y - 4}" width="${n(span)}" height="${n(7 * STEP)}"/>
    </clipPath>
  </defs>

  <text x="44" y="32" fill="${P.inkMd}" font-family="${DISPLAY}" font-size="10" font-weight="700" letter-spacing="2.4">CONTRIBUTION YEAR</text>
  <text x="1156" y="32" fill="${P.inkLo}" font-family="${MONO}" font-size="10" text-anchor="end">${s.from} → ${s.to}</text>
  <line x1="44" y1="46" x2="1156" y2="46" stroke="${P.hair}" stroke-width="1"/>

  ${monthEls}
  ${weekdayEls}
  <g>${columns}</g>

  <!-- A moving highlight rather than a moving chart: the data stays
       where it is and the light passes over it. -->
  <g clip-path="url(#calClip)">
    <rect class="scan" x="${CAL_X}" y="${CAL_Y - 4}" width="140" height="${n(7 * STEP)}" fill="url(#scanG)"/>
  </g>

  <!-- today -->
  <g class="now">
    <rect x="${n(CAL_X + (weeks.length - 1) * STEP - 2)}" y="${n(CAL_Y + weeks.at(-1).at(-1)[2] * STEP - 2)}" width="${CELL + 4}" height="${CELL + 4}" rx="4" fill="none" stroke="${P.inkHi}" stroke-width="1.2" opacity=".75"/>
  </g>

  <g>${figures}</g>

  <text x="44" y="214" fill="${P.inkMd}" font-family="${DISPLAY}" font-size="9" font-weight="700" letter-spacing="2">WEEKLY CADENCE</text>
  <text x="${n(820 - 10)}" y="214" fill="${P.inkLo}" font-family="${MONO}" font-size="9" text-anchor="end">less</text>
  ${legend}
  <text x="${n(820 + BINS.length * 17 + 4)}" y="214" fill="${P.inkLo}" font-family="${MONO}" font-size="9">more · ${BINS.map((b) => b.label).join("  ")}</text>

  <line x1="${CAL_X}" y1="${CHART_BASE}" x2="${n(CAL_X + span)}" y2="${CHART_BASE}" stroke="${P.hair}" stroke-width="1"/>
  <path class="wash" d="${area}" fill="url(#washG)"/>
  <path class="trace" d="${line}" fill="none" stroke="${P.mark}" stroke-width="1.8" stroke-linejoin="round"/>
  <circle cx="${n(px(peakAt))}" cy="${n(py(peak))}" r="3" fill="${P.mark}"/>
  <text x="${n(px(peakAt) + 8)}" y="${n(py(peak) + 4)}" fill="${P.inkMd}" font-family="${MONO}" font-size="10">${peak} in one week</text>

  <text x="44" y="326" fill="${P.inkLo}" font-family="${MONO}" font-size="10.5">${s.active} of ${s.days} days carry a contribution. The work arrives in bursts, not daily — this is the shape of it, not a target.</text>
  <text x="1156" y="326" fill="${P.inkLo}" font-family="${MONO}" font-size="9.5" text-anchor="end">counted ${data.counted}${s.partialLast ? " · final column is a partial week" : ""}</text>
</svg>
`;
}
