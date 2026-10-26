import type { Payload, Scenario, TokenView, WaitEstimate } from "./types";

export const hospitals = [
  "UAR-Q OPD", "Sunrise Multispeciality", "Grace Community Health",
  "St. Anne's Medical Centre", "Lakeview General Hospital",
];

export const doctors = [
  { name: "Dr. Kumar", spec: "General Medicine", dept: "Queue A" },
  { name: "Dr. Fernandes", spec: "Pediatrics", dept: "Queue B" },
  { name: "Dr. Iyer", spec: "Orthopedics", dept: "Queue C" },
  { name: "Dr. Rao", spec: "ENT", dept: "Queue A" },
  { name: "Dr. Thomas", spec: "Dermatology", dept: "Queue D" },
];

const types = [
  { name: "Fever", best: 3, exp: 5, worst: 7 },
  { name: "Cold", best: 2, exp: 3, worst: 5 },
  { name: "Follow-up", best: 3, exp: 4, worst: 6 },
  { name: "Diabetes", best: 5, exp: 8, worst: 12 },
];

const scenarios: Scenario[] = ["normal", "near_turn", "emergency", "delay", "offline"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

export function fmtClock(totalSeconds: number): string {
  const t = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(t / 60), s = t % 60;
  return m + ":" + String(s).padStart(2, "0");
}

/** Random simulator state (same logic as the original single-page version). */
export function buildRandomPayload(): Payload {
  const h = randInt(0, hospitals.length - 1);
  const d = randInt(0, doctors.length - 1);
  const sc = rand(scenarios);
  const cs = randInt(1, 20);
  const pa = sc === "near_turn" ? randInt(0, 1) : randInt(2, 7);
  const tk = cs + pa + 1;
  const aheadTypes = Array.from({ length: pa }, () => rand(types));

  const sumBest = aheadTypes.reduce((s, t) => s + t.best, 0);
  const sumWorst = aheadTypes.reduce((s, t) => s + t.worst, 0);
  const inProgressBest = 3, inProgressExp = 4, inProgressWorst = 6;
  let expFactor = 1, worstFactor = 1;
  if (sc === "emergency") { expFactor = 1.6; worstFactor = 1.9; }
  else if (sc === "delay") { expFactor = 1.4; worstFactor = 1.5; }

  const ip = Math.round(inProgressExp * expFactor);
  const se = aheadTypes.map((t) => Math.round(t.exp * expFactor));
  const e = ip + se.reduce((s, v) => s + v, 0);
  const b = inProgressBest + sumBest;
  const w = Math.round(inProgressWorst * worstFactor) + Math.round(sumWorst * worstFactor);
  const p = Math.round((b + 4 * e + w) / 6);

  return { h, d, sc, cs, pa, tk, b, e, w, p, ip, se, ts: Date.now() };
}

// ---- URL encoding of the simulator state (used for the QR code) ----
const scenarioCode: Record<Scenario, string> = {
  normal: "n", near_turn: "t", emergency: "e", delay: "d", offline: "o", your_turn: "y", completed: "c",
};
const scenarioName: Record<string, Scenario> = {
  n: "normal", t: "near_turn", e: "emergency", d: "delay", o: "offline", y: "your_turn", c: "completed",
};

export function encodePayload(pl: Payload): string {
  return [pl.h, pl.d, scenarioCode[pl.sc], pl.cs ?? 0, pl.pa, pl.tk, pl.b, pl.e, pl.w, pl.p, pl.ip, pl.ts, pl.se.join("_")].join(",");
}

export function decodePayload(str: string): Payload {
  const parts = str.split(",");
  if (parts.length < 12) throw new Error("bad payload");
  const sc = scenarioName[parts[2]];
  if (!sc) throw new Error("bad scenario");
  const nums = parts.slice(0, 12).filter((_, i) => i !== 2).map(Number);
  if (nums.some((n) => Number.isNaN(n))) throw new Error("bad number");
  return {
    h: +parts[0], d: +parts[1], sc, cs: +parts[3], pa: +parts[4], tk: +parts[5],
    b: +parts[6], e: +parts[7], w: +parts[8], p: +parts[9], ip: +parts[10], ts: +parts[11],
    se: parts[12] ? parts[12].split("_").filter((x) => x !== "").map(Number) : [],
  };
}

/**
 * Converts the server's estimate into the page's payload. If nothing changed since the
 * previous poll, the old timestamp is kept so the live countdown keeps running smoothly.
 */
export function fromEstimate(token: TokenView, est: WaitEstimate, prev: Payload | null): Payload {
  const sig = [est.scenario, est.status, est.peopleAhead, est.inProgressMinutes, est.bestMinutes,
    est.expectedMinutes, est.worstMinutes, est.currentlyServingTokenId,
    est.aheadExpectedMinutes.join("_")].join("|");
  const sameState = prev?.live && prev.sig === sig && prev.tk === est.tokenId;
  return {
    h: 0, d: 0,
    sc: est.scenario,
    cs: est.currentlyServingTokenId,
    pa: est.peopleAhead,
    tk: est.tokenId,
    b: est.bestMinutes, e: est.expectedMinutes, w: est.worstMinutes, p: est.expectedMinutes,
    ip: est.inProgressMinutes,
    se: est.aheadExpectedMinutes,
    ts: sameState && prev ? prev.ts : Date.now(),
    live: true,
    sig,
    custom: { doc: token.department, spec: "Live OPD queue", pill: token.status.replace("_", " ") },
  };
}
