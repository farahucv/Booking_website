// Fixed prices (SAR). Shared by client display and server validation; the server recomputes everything.
export const SERVICES = {
  evening: { price: 300, deposit: 50 },
  queen: { price: 500, deposit: 50 },
  bride: { price: 700, deposit: 200 },
} as const;

export type ServiceKey = keyof typeof SERVICES;
export const SERVICE_KEYS: ServiceKey[] = ["evening", "queen", "bride"];

export type ServiceCounts = Record<ServiceKey, number>;
export type LocationType = "at_jood" | "client_in_buraidah" | "client_outside";

export const HAIR = { min: 200, max: 350, bride: 400 };

export function calcMakeup(counts: ServiceCounts) {
  let total = 0;
  let deposit = 0;
  let people = 0;
  for (const k of SERVICE_KEYS) {
    const n = Math.max(0, Math.floor(counts[k] || 0));
    total += n * SERVICES[k].price;
    deposit += n * SERVICES[k].deposit;
    people += n;
  }
  return { total, deposit, remaining: total - deposit, people };
}

export function calcHairRange(count: number, brideHair: boolean) {
  const others = Math.max(0, count - (brideHair ? 1 : 0));
  const b = brideHair ? HAIR.bride : 0;
  return { min: others * HAIR.min + b, max: others * HAIR.max + b };
}

/** Home visit for a single evening makeup is not offered. */
export function isLocationBlocked(counts: ServiceCounts, loc: LocationType) {
  const { people } = calcMakeup(counts);
  return loc !== "at_jood" && people === 1 && counts.evening === 1;
}

export type Durations = {
  evening: number; // minutes
  queen: number;
  bride: number;
  prep: number;
  buffer: number;
  travel_in: number;
  travel_out: number;
};

export function totalDurationMinutes(counts: ServiceCounts, d: Durations, loc: LocationType) {
  let m = d.prep;
  for (const k of SERVICE_KEYS) m += (counts[k] || 0) * d[k];
  if (loc === "client_in_buraidah") m += d.travel_in * 2;
  if (loc === "client_outside") m += d.travel_out * 2;
  return m;
}

export const TZ = "Asia/Riyadh";
