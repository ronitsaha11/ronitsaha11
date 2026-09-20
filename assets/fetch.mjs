/**
 * Refresh the inputs the build reads. Network happens HERE and nowhere else.
 *
 *   node assets/fetch.mjs            both
 *   node assets/fetch.mjs activity   contribution year only
 *   node assets/fetch.mjs icons      brand marks only
 *
 * WHY THE FETCH IS A SEPARATE SCRIPT
 *
 * Because `build.mjs` should be a pure function of files that are
 * committed. If the build called the GitHub API it would draw a
 * different picture every time it ran, the numbers printed on the
 * image would stop matching the numbers written in the README, and
 * anyone cloning this repository could not reproduce either. So the
 * API result is snapshotted to `data/activity.json` WITH THE DATE IT
 * WAS TAKEN, and that file is the thing the build reads. Rebuilding
 * offline is guaranteed to reproduce the committed SVGs byte for
 * byte.
 *
 * Same argument for the brand marks. They are cached into
 * `icons/` and served from this repository, so the profile does not
 * depend on a third-party CDN staying up — the whole reason the
 * shared-deployment badges were removed in the first place.
 *
 * Icon artwork is from Simple Icons (CC0). The marks themselves are
 * trademarks of their respective owners and are used here only to
 * identify the technology, which is what they are for.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import { ICON_SLUGS } from "./lib/stackData.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const what = process.argv[2] ?? "all";

/* ---------------- the contribution year ---------------- */

const QUERY = `
{
  user(login: "ronitsaha11") {
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalRepositoriesWithContributedCommits
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount weekday } }
      }
    }
  }
}`;

function refreshActivity() {
  // `gh` rather than a raw token: the contribution calendar needs an
  // authenticated call, and this way no secret is ever read, printed
  // or stored by this script.
  const raw = execFileSync("gh", ["api", "graphql", "-f", `query=${QUERY}`], {
    encoding: "utf8",
    maxBuffer: 8 << 20,
  });

  const c = JSON.parse(raw).data.user.contributionsCollection;
  const weeks = c.contributionCalendar.weeks.map((w) =>
    w.contributionDays.map((d) => [d.date, d.contributionCount, d.weekday]),
  );

  const snapshot = {
    // Not decoration. Every figure drawn from this file is captioned
    // with this date, so a reader can tell a stale number from a
    // current one without taking anyone's word for it.
    //
    // Taken from the LAST DAY OF THE CALENDAR, not from the clock.
    // `new Date()` here is the machine's, and a UTC machine running
    // this on an Indian evening stamps the file with yesterday while
    // the calendar it just downloaded already contains today. The
    // data knows what day GitHub thinks it is; ask the data.
    counted: weeks.at(-1).at(-1)[0],
    source: "GitHub GraphQL contributionsCollection",
    commits: c.totalCommitContributions,
    pullRequests: c.totalPullRequestContributions,
    repositories: c.totalRepositoriesWithContributedCommits,
    contributions: c.contributionCalendar.totalContributions,
    // If this is ever non-zero the calendar understates the year and
    // the caption has to say so.
    private: c.restrictedContributionsCount,
    weeks,
  };

  mkdirSync(join(here, "data"), { recursive: true });
  writeFileSync(
    join(here, "data/activity.json"),
    `${JSON.stringify(snapshot, null, 1)}\n`,
    "utf8",
  );

  const days = weeks.flat();
  console.log(
    `activity.json — ${days.length} days, ${days[0][0]} to ${days.at(-1)[0]}, ` +
      `${snapshot.contributions} contributions, counted ${snapshot.counted}`,
  );
}

/* ---------------- the brand marks ---------------- */

async function refreshIcons() {
  mkdirSync(join(here, "icons"), { recursive: true });
  let got = 0;
  let had = 0;

  for (const slug of ICON_SLUGS) {
    const file = join(here, "icons", `${slug}.svg`);
    if (existsSync(file) && readFileSync(file, "utf8").includes("<path")) {
      had++;
      continue;
    }
    // cdn.simpleicons.org returns the mark already filled with the
    // brand's own hex, which saves keeping a second table of colours
    // that could drift out of step with the artwork.
    const res = await fetch(`https://cdn.simpleicons.org/${slug}`);
    if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
    const body = await res.text();
    if (!body.includes("<path")) throw new Error(`${slug}: no path in response`);
    writeFileSync(file, body, "utf8");
    got++;
  }

  console.log(`icons — ${got} fetched, ${had} already cached, ${ICON_SLUGS.length} total`);
}

/* ---------------- run ---------------- */

if (what === "all" || what === "activity") refreshActivity();
if (what === "all" || what === "icons") await refreshIcons();
