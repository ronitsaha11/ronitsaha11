/**
 * One palette, shared by every asset, lifted from the portfolio's
 * tokens so the profile and the site are visibly the same instrument.
 *
 * NO LIGHT VARIANT — the same decision the portfolio makes. A second
 * full palette is a second set of contrast ratios to keep true, and
 * the lattice only reads against a ground darker than anything drawn
 * on it. A dark plate on a light README page reads as a captured
 * frame, which is exactly what it is.
 */
export const P = {
  ground: "#0B0E0F",
  plate: "#12161A",
  grid: "rgba(232,235,232,0.045)",
  hair: "rgba(232,235,232,0.10)",
  inkHi: "#E8EBE8",
  inkMd: "#A3ADAC",
  inkLo: "#879191",
  node: "#8E9A9A",
  edge: "#596466",
  mark: "#FF6B33",
  measured: "#3FBFA6",
};

export const DISPLAY = "'Helvetica Neue', Helvetica, Arial, sans-serif";
export const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";

/** Deterministic jitter, so every rebuild draws the same lattice. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Trim a float to the shortest form that still draws the same. */
export const n = (v, places = 1) => Number(v.toFixed(places)).toString();

/** Text destined for an attribute or a text node. */
export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * THE ONE RULE EVERY ASSET HERE FOLLOWS.
 *
 * Each animation sets the FINISHED state as its normal value and uses
 * `animation-fill-mode: backwards`, which holds the opening frame
 * only while the animation is waiting to start. Anywhere the CSS does
 * not run — an embed that strips it, a feed reader, a screenshot
 * taken mid-load — the image is already assembled rather than blank.
 *
 * This was learned the hard way here: the first banner opened with a
 * clip mask at zero width and animated it out to full. Looks right
 * when it plays; renders a completely empty rectangle when it does
 * not. Never hide something and rely on an animation to bring it back.
 *
 * It is also why honouring `prefers-reduced-motion` is one line —
 * switching the animations off leaves the finished picture behind.
 */
export const REDUCED = (selectors) => `
    @media (prefers-reduced-motion: reduce) {
      ${selectors} { animation: none !important; }
    }`;
