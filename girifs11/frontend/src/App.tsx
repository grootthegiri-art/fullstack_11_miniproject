import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";
import { buildRandomPayload, decodePayload, encodePayload, fromEstimate, hospitals } from "./sim";
import { isMuted, setMuted, sound } from "./sound";
import type { Payload } from "./types";
import PatientView from "./components/PatientView";
import QrCard from "./components/QrCard";
import TokenForm from "./components/TokenForm";
import StaffPanel from "./components/StaffPanel";
import DoctorPanel from "./components/DoctorPanel";

type Tab = "patient" | "get" | "staff" | "doctor";
type Mode = "sim" | "live";
interface Notice { kind: "ok" | "error"; text: string; }

const STORE_KEY = "uarq.myToken";
const POLL_MS = 5000;

function readStored(): number | null {
  try {
    const n = Number(localStorage.getItem(STORE_KEY));
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch { return null; }
}
function storeToken(id: number): void {
  try { localStorage.setItem(STORE_KEY, String(id)); } catch { /* storage unavailable */ }
}

/** Reads ?token=7 (live tracking link) or ?s=... (simulator link, as in the original page). */
function initialState(): { mode: Mode; trackId: number | null; payload: Payload | null } {
  const params = new URLSearchParams(window.location.search);
  const t = Number(params.get("token"));
  if (params.get("token") && Number.isInteger(t) && t > 0) return { mode: "live", trackId: t, payload: null };
  const s = params.get("s");
  if (s) {
    try { return { mode: "sim", trackId: null, payload: decodePayload(s) }; } catch { /* fall through */ }
  }
  return { mode: "sim", trackId: null, payload: buildRandomPayload() };
}

function NoticeBanner({ n }: { n: Notice }) {
  return n.kind === "ok"
    ? <div className="banner gray"><span className="icon">🗄️</span><div><b>Connected to live API</b><p>{n.text}</p></div></div>
    : <div className="banner amber"><span className="icon">⚠️</span><div><b>Live API unavailable</b><p>{n.text}</p></div></div>;
}

export default function App() {
  const [init] = useState(initialState);
  const [tab, setTab] = useState<Tab>("patient");
  const [mode, setMode] = useState<Mode>(init.mode);
  const [trackId, setTrackId] = useState<number | null>(init.trackId);
  const [inputId, setInputId] = useState(init.trackId ? String(init.trackId) : "");
  const [payload, setPayload] = useState<Payload | null>(init.payload);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [staffAuth, setStaffAuth] = useState<string | null>(null);
  const [doctorAuth, setDoctorAuth] = useState<string | null>(null);
  const lastScenario = useRef<string | null>(null);

  // Live mode: load now, then poll every 5 seconds.
  useEffect(() => {
    if (mode !== "live" || trackId == null) return;
    let cancelled = false;
    async function load(id: number) {
      try {
        const [token, est] = await Promise.all([api.getToken(id), api.getWait(id)]);
        if (cancelled) return;
        if (lastScenario.current && lastScenario.current !== est.scenario) sound(est.scenario);
        lastScenario.current = est.scenario;
        setPayload((prev) => fromEstimate(token, est, prev));
        setLoadError("");
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "Could not load the queue");
        // Fall back to manual calling instead of showing a frozen or wrong estimate.
        setPayload((prev) => (prev ? { ...prev, sc: "offline" } : prev));
      }
    }
    void load(trackId);
    const timer = setInterval(() => void load(trackId), POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [mode, trackId, refreshKey]);

  // Keep the address bar and the QR code in step with what is on screen.
  const base = window.location.href.split(/[?#]/)[0];
  const qrUrl = !payload ? base
    : payload.live ? `${base}?token=${payload.tk}`
    : `${base}?s=${encodePayload(payload)}`;
  useEffect(() => {
    if (!payload) return;
    try { window.history.replaceState(null, "", qrUrl); } catch { /* not allowed when opened as a file:// page */ }
  }, [qrUrl, payload]);

  function startTracking(id: number) {
    if (id !== trackId || mode !== "live") setPayload(null);
    lastScenario.current = null;
    storeToken(id);
    setTrackId(id);
    setInputId(String(id));
    setMode("live");
    setLoadError("");
    setRefreshKey((k) => k + 1);
  }

  async function connectLive(idOverride?: number) {
    setConnecting(true);
    setNotice(null);
    try {
      let id = idOverride ?? trackId ?? readStored();
      if (id == null) {
        const queue = await api.getQueue();
        const active = queue.filter((r) => r.status !== "COMPLETED");
        if (active.length === 0) throw new Error("No active tokens yet. Create one from the “Get token” tab.");
        id = active[active.length - 1].id;
      }
      await api.getToken(id);
      startTracking(id);
      setNotice({ kind: "ok", text: "Queue values loaded from the Spring Boot backend connected to MySQL. Refreshes every 5 seconds." });
    } catch (err) {
      let text = err instanceof Error ? err.message : "Unknown error";
      if (err instanceof ApiError && err.status === 404) text = "That token number was not found.";
      setNotice({ kind: "error", text: `${text} Simulator mode is still available.` });
    } finally {
      setConnecting(false);
    }
  }

  function simulate() {
    sound("click");
    setSpinning(true);
    setTimeout(() => setSpinning(false), 500);
    setTimeout(() => {
      const next = buildRandomPayload();
      setMode("sim");
      setNotice(null);
      setLoadError("");
      setPayload(next);
      sound(next.sc);
    }, 180);
  }

  function toggleSound() {
    setMuted(!muted);
    setMutedState(!muted);
  }

  const hospital = hospitals[payload?.h ?? 0] || hospitals[0];
  const tabs: [Tab, string][] = [["patient", "Patient"], ["get", "Get token"], ["staff", "Staff"], ["doctor", "Doctor"]];
  const connectLabel = connecting ? "Connecting..."
    : mode === "live" ? "Refresh from MySQL queue"
    : notice?.kind === "error" ? "Retry MySQL connection"
    : "Connect to MySQL queue";

  return (
    <div className="app">
      <div className="brand">
        <div className="logo">🏥</div>
        <h1>{hospital}<span>Scanned via OPD token QR</span></h1>
        <button className="mute-btn" title="Toggle sound" aria-label="Toggle sound" onClick={toggleSound}>{muted ? "🔇" : "🔊"}</button>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key}
            className={`tab${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === "patient" && (
        <>
          {mode === "live" && !payload && (
            <div className="card">
              {loadError
                ? <NoticeBanner n={{ kind: "error", text: `${loadError} Retrying every 5 seconds.` }} />
                : <div className="empty">Connecting to the live queue…</div>}
            </div>
          )}
          {payload && <PatientView payload={payload} notice={notice ? <NoticeBanner n={notice} /> : null} />}
          {!payload && notice && <NoticeBanner n={notice} />}
          {payload && <QrCard url={qrUrl} live={!!payload.live} />}

          <button className="btn-primary" onClick={simulate}>
            <span className={`spin${spinning ? " spinning" : ""}`}>🔄</span> Simulate / Refresh
          </button>
          <button className="btn-secondary" onClick={() => void connectLive()} disabled={connecting}>{connectLabel}</button>

          {mode === "live" && (
            <form className="card" onSubmit={(e) => { e.preventDefault(); const n = Number(inputId); if (Number.isInteger(n) && n > 0) void connectLive(n); }}>
              <label className="field-label" htmlFor="trackid">Tracking token number</label>
              <div className="inline-row">
                <input id="trackid" className="field" type="number" min={1} value={inputId} onChange={(e) => setInputId(e.target.value)} />
                <button type="submit" className="btn-primary" disabled={connecting}>Track</button>
              </div>
            </form>
          )}
          <p className="fallback-note">If the system ever goes offline, the counter falls back to plain manual token-calling — you'll never be shown a frozen or wrong estimate.</p>
        </>
      )}

      {tab === "get" && <TokenForm onCreated={(t) => { startTracking(t.id); setNotice({ kind: "ok", text: "Tracking your new token. Refreshes every 5 seconds." }); }} />}
      {tab === "staff" && <StaffPanel auth={staffAuth} setAuth={setStaffAuth} />}
      {tab === "doctor" && <DoctorPanel auth={doctorAuth} setAuth={setDoctorAuth} />}
    </div>
  );
}
