import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Payload } from "../types";
import { bannerFor } from "../banners";
import { doctors, fmtClock } from "../sim";
import { sound } from "../sound";

interface Props {
  payload: Payload;
  /** Extra banner(s) shown above the scenario banner (e.g. "Connected to live API"). */
  notice?: ReactNode;
}

const pad3 = (n: number | null) => (n == null ? "—" : String(n).padStart(3, "0"));

export default function PatientView({ payload: pl, notice }: Props) {
  const live = !!pl.live;
  const b = bannerFor(pl.sc);
  const doc = pl.custom
    ? { name: pl.custom.doc, spec: pl.custom.spec, dept: pl.custom.pill }
    : doctors[pl.d] || doctors[0];

  // One tick per second drives the countdown; the numbers are derived from pl.ts.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!b.showRange) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pl.ts, b.showRange]);

  const elapsed = (now - pl.ts) / 1000;
  const rB = Math.max(0, pl.b * 60 - elapsed);
  const rE = Math.max(0, pl.e * 60 - elapsed);
  const rW = Math.max(0, pl.w * 60 - elapsed);
  const rP = Math.max(0, pl.p * 60 - elapsed);
  const maxScale = Math.max(pl.w, 10);
  const arrived = b.showRange && rE <= 0;

  const arrivedFor = useRef<number | null>(null);
  useEffect(() => {
    if (arrived && !live && arrivedFor.current !== pl.ts) {
      arrivedFor.current = pl.ts;
      sound("near_turn");
    }
  }, [arrived, live, pl.ts]);

  let banner = b.node;
  if (arrived && !live) {
    banner = <div className="banner green pulse"><span className="icon">🎉</span><div><b>It's your turn now!</b><p>Please proceed to the consultation room.</p></div></div>;
  } else if (arrived && live) {
    banner = <div className="banner amber"><span className="icon">⏳</span><div><b>Taking a little longer than estimated</b><p>Please wait — staff will call your token shortly.</p></div></div>;
  }

  const aheadSum = pl.se.reduce((s, v) => s + v, 0);

  return (
    <>
      <div>{notice}{banner}</div>

      <div className="card">
        <div className="doctor-row">
          <div><strong>{doc.name}</strong><span>{doc.spec}</span></div>
          <div className="dept-pill">{doc.dept}</div>
        </div>
        <div className="token-hero">
          <div className="label">Your Token</div>
          <div className="num">{pad3(pl.tk)}</div>
        </div>
        <div className="stat-row">
          <div className="stat"><div className="v">{pad3(pl.cs)}</div><div className="k">Currently Serving</div></div>
          <div className="stat"><div className="v">{pl.pa}</div><div className="k">People Ahead</div></div>
        </div>
      </div>

      {b.showRange && (
        <div className="card">
          <div className="pert-hero">
            <div className="plabel">Live countdown — updates every second</div>
            <div className="pval">{fmtClock(rP)}</div>
            <div className="pnote">Weighted estimate (PERT). Reaches 0:00 when it's your turn.</div>
          </div>
          <div className="range-title">Full range (for context, also ticking down)</div>
          <div className="range-bars">
            <div className="range-bar"><div className="track"><div className="fill best" style={{ height: `${rB / 60 / maxScale * 100}%` }} /></div><div className="mins">{fmtClock(rB)}</div><div className="lbl">Best</div></div>
            <div className="range-bar"><div className="track"><div className="fill expected" style={{ height: `${rE / 60 / maxScale * 100}%` }} /></div><div className="mins">{fmtClock(rE)}</div><div className="lbl">Expected</div></div>
            <div className="range-bar"><div className="track"><div className="fill worst" style={{ height: `${rW / 60 / maxScale * 100}%` }} /></div><div className="mins">{fmtClock(rW)}</div><div className="lbl">Worst</div></div>
          </div>
          <div className="ahead-list">
            {pl.se.map((mins, i) => (
              <div className="ahead-item" key={i}><span>Patient ahead of you</span><span className="chip">Expected ~{mins} min</span></div>
            ))}
          </div>
          <div className="breakdown">
            <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>Composition at scan time</div>
            <div>Consultation in progress right now: ~{pl.ip} min</div>
            <div>+ {pl.pa} patient{pl.pa === 1 ? "" : "s"} ahead (summed): ~{aheadSum} min</div>
            <div className="bd-total">= Expected wait: {pl.e} min</div>
          </div>
          <p className="privacy-note">🔒 No diagnosis or personal details shown — only anonymized wait estimates, per health-data privacy guidelines.</p>
          <div className="voice-line">{b.voice}</div>
        </div>
      )}
      {!b.showRange && <div className="voice-line" style={{ marginBottom: 14 }}>{b.voice}</div>}
    </>
  );
}
