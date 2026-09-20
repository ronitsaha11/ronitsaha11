/**
 * Every image on the profile, generated rather than hand-written.
 *
 *   node assets/fetch.mjs     refresh the inputs  (network)
 *   node assets/build.mjs     draw the assets     (no network)
 *
 * THE BUILD IS A PURE FUNCTION OF COMMITTED FILES.
 *
 * `data/activity.json` and `icons/*.svg` are in the repository, so
 * this script never touches the network and a clone rebuilds the
 * committed SVGs byte for byte. It also means the figures drawn on
 * the images and the figures written in the README come from one
 * file and cannot drift apart — refresh the snapshot and they all
 * move together, or none of them do.
 *
 * WHY GENERATED AT ALL
 *
 * Because almost nothing in these pictures is a literal. The gate's
 * position along the banner, the fraction of the packet's run at
 * which it changes colour, the heatmap's bins, the perspective
 * divide in the orbit and the phase offset of every node in it are
 * all derived. Written by hand they would be several hundred magic
 * numbers that quietly disagree with each other the first time
 * anything moves — which is exactly how the first version shipped a
 * packet that turned teal a third of the strip before the boundary
 * it was supposed to be turning teal at.
 *
 * WHY SELF-HOSTED AND NOT capsule-render / readme-typing-svg /
 * skillicons.dev
 *
 * Those are free shared deployments. They rate-limit, and when they
 * do every README using them shows a row of broken images — which is
 * what the previous version of this profile was doing. These files
 * are served from the repository, so nothing can throttle them.
 *
 * THE ONE RULE: the base state of every animation is the FINISHED
 * state, and animations run `backwards`. See lib/palette.mjs for why
 * that is not a style preference.
 */

import { writeFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { banner } from "./parts/banner.mjs";
import { readout } from "./parts/readout.mjs";
import { activity, stats } from "./parts/activity.mjs";
import { orbit } from "./parts/orbit.mjs";
import { stack } from "./parts/stack.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const data = JSON.parse(readFileSync(join(here, "data/activity.json"), "utf8"));
const grid = stack();

const out = {
  "banner.svg": banner(),
  "readout.svg": readout(data),
  "activity.svg": activity(data),
  "orbit.svg": orbit(),
  "stack.svg": grid.svg,
};

/**
 * NOTHING SHIPS THAT AN XML PARSER WOULD REJECT.
 *
 * A bare `&` in a label — "MOBILE & DESKTOP" — is a fatal error in
 * SVG, and the way you find out is that the image silently does not
 * render at all. There is no console warning inside an `<img>`; the
 * section is just missing. That happened here, so it is now a build
 * failure rather than something to notice in a screenshot.
 */
const BARE_AMP = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;

function checkWellFormed(name, svg) {
  const bad = svg.match(BARE_AMP);
  if (bad) {
    const at = svg.slice(Math.max(0, bad.index - 60), bad.index + 60);
    throw new Error(`${name}: unescaped "&" — an SVG that will not render.
    ...${at}...`);
  }
  const opens = (svg.match(/<(?!\/|\?|!)/g) ?? []).length;
  const closes = (svg.match(/<\/|\/>/g) ?? []).length;
  if (opens !== closes) {
    throw new Error(`${name}: ${opens} elements opened, ${closes} closed`);
  }
}

mkdirSync(here, { recursive: true });
for (const [name, svg] of Object.entries(out)) {
  checkWellFormed(name, svg);
  writeFileSync(join(here, name), svg, "utf8");
}

/* ---------------- what the README has to agree with ---------------- */

const s = stats(data);

console.log(
  Object.keys(out)
    .map((f) => `  ${f.padEnd(14)} ${(statSync(join(here, f)).size / 1024).toFixed(1)} KB`)
    .join("\n"),
);
console.log(`
  snapshot      ${data.counted}  (${s.from} → ${s.to})
  contributions ${data.contributions}   commits ${data.commits}   PRs ${data.pullRequests}   repos ${data.repositories}
  active days   ${s.active} / ${s.days}   longest ${s.longest}d   busiest ${s.busiest}   median ${s.median}
  stack         ${grid.count} marks, ${grid.lifted.length} lifted for contrast: ${grid.lifted.join(", ")}`);
