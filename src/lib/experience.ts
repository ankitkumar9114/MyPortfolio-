// Years of experience, worked out from the career start date so it updates
// by itself. Counted in half years:
//   exactly on a whole/half-year anniversary -> "3" / "3.5"
//   any time after it (until the next one)   -> "3+" / "3.5+"
// e.g. start 1 Jun 2023: 1 Jun 2026 -> "3", 2 Jun 2026 -> "3+",
// 1 Dec 2026 -> "3.5", 2 Dec 2026 -> "3.5+".
//
// Text can use the {years} placeholder (resume experience line and About Me,
// the site's intro paragraph); fillYears() swaps in the current value.

// First full-time role (Sideways Consulting, Jun 2023). Change it here only.
export const CAREER_START = "2023-06-01";

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

export function experienceYears(start: string = CAREER_START, now: Date = new Date()): string {
  const [sy, sm, sd] = start.split("-").map(Number);
  if (!sy || !sm || !sd) return "";
  // calendar dates in UTC, so it's the same on the server and in the browser
  const ny = now.getUTCFullYear(), nm = now.getUTCMonth(), nd = now.getUTCDate();
  let months = (ny - sy) * 12 + (nm - (sm - 1));
  // the "monthly anniversary" this month (31st -> last day of a shorter month)
  const anchorDay = Math.min(sd, daysInMonth(ny, nm));
  if (nd < anchorDay) months -= 1;
  if (months < 0) return "0";
  const halfYears = Math.floor(months / 6);
  // exact only on the anniversary day itself, at a whole half year
  const exact = months % 6 === 0 && nd === anchorDay;
  const value = halfYears / 2; // 3, 3.5, 4, …
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${exact ? "" : "+"}`;
}

export const fillYears = (text: string, years: string = experienceYears()) => text.replaceAll("{years}", years);
