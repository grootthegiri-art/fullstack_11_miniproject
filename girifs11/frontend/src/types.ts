export type Scenario =
  | "normal" | "near_turn" | "emergency" | "delay" | "offline" | "your_turn" | "completed";

/** Everything the patient page needs to draw one queue state (simulated or live). */
export interface Payload {
  h: number;            // hospital index (simulator)
  d: number;            // doctor index (simulator)
  sc: Scenario;
  cs: number | null;    // currently serving token (null = nobody yet)
  pa: number;           // patients ahead (waiting, not counting the one in consultation)
  tk: number;           // my token number
  b: number;            // best-case wait, minutes
  e: number;            // expected wait, minutes
  w: number;            // worst-case wait, minutes
  p: number;            // PERT headline value, minutes
  ip: number;           // minutes for the consultation in progress
  se: number[];         // expected minutes of each patient ahead
  ts: number;           // time (ms) when these values were computed
  live?: boolean;
  sig?: string;         // change signature (live mode) so the countdown is not reset on every poll
  custom?: { doc: string; spec: string; pill: string };
}

/** GET /api/tokens/{id}/wait */
export interface WaitEstimate {
  tokenId: number;
  status: string;
  scenario: Scenario;
  currentlyServingTokenId: number | null;
  peopleAhead: number;
  inProgressMinutes: number;
  aheadExpectedMinutes: number[];
  bestMinutes: number;
  expectedMinutes: number;
  worstMinutes: number;
}

/** Public view of a token (no name, no phone). */
export interface TokenView {
  id: number;
  patientLabel: string;
  department: string;
  status: string;
  bestMinutes: number;
  likelyMinutes: number;
  worstMinutes: number;
  expectedMinutes: number;
  createdAt: string;
}

/** Staff / doctor view. phone is null for doctors. */
export interface StaffTokenView {
  id: number;
  patientName: string;
  phone: string | null;
  department: string;
  status: string;
  expectedMinutes: number;
  createdAt: string;
}

export const STATUSES = [
  "WAITING", "CALLED", "IN_CONSULTATION", "DELAYED", "EMERGENCY", "COMPLETED",
] as const;

export const DEPARTMENTS = [
  "General Medicine", "Pediatrics", "Orthopedics", "ENT", "Dermatology",
] as const;
