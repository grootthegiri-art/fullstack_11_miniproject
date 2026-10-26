import { useCallback, useEffect, useState } from "react";
import { api, ApiError, basicAuth } from "../api";
import type { StaffTokenView } from "../types";
import LoginForm from "./LoginForm";

interface Props {
  auth: string | null;
  setAuth: (a: string | null) => void;
}

export default function DoctorPanel({ auth, setAuth }: Props) {
  const [rows, setRows] = useState<StaffTokenView[]>([]);
  const [doctorName, setDoctorName] = useState("Duty Doctor");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleError = useCallback((err: unknown) => {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      setAuth(null);
      setError(err.status === 401 ? "Wrong username or password." : "This account is not allowed to use the doctor panel.");
    } else {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }, [setAuth]);

  const load = useCallback(async (a: string) => {
    try {
      setRows(await api.doctorQueue(a));
      setError("");
    } catch (err) { handleError(err); }
  }, [handleError]);

  useEffect(() => {
    if (!auth) return;
    void load(auth);
    const id = setInterval(() => void load(auth), 5000);
    return () => clearInterval(id);
  }, [auth, load]);

  async function login(user: string, pass: string) {
    setBusy(true);
    setError("");
    const a = basicAuth(user, pass);
    try {
      setRows(await api.doctorQueue(a));
      setAuth(a);
    } catch (err) { handleError(err); }
    finally { setBusy(false); }
  }

  async function complete(id: number) {
    if (!auth) return;
    try {
      await api.complete(auth, id, doctorName.trim() || "Doctor");
      await load(auth);
    } catch (err) { handleError(err); }
  }

  if (!auth) {
    return <LoginForm title="Doctor sign-in" hint="Demo account: doctor / doctor123 (local academic use only)."
      defaultUser="doctor" error={error} busy={busy} onSubmit={login} />;
  }

  return (
    <div className="card">
      <div className="inline-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <h2 className="card-title" style={{ margin: 0 }}>Consultations</h2>
        <button className="logout" onClick={() => { setAuth(null); setRows([]); }}>Sign out</button>
      </div>
      <p className="card-sub">Mark a consultation as completed. Only active tokens are listed.</p>
      <label className="field-label" htmlFor="docname">Doctor name</label>
      <input id="docname" className="field" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} maxLength={100} />
      {error && <p className="error-text" role="alert">{error}</p>}
      {rows.length === 0 && <div className="empty">No active tokens.</div>}
      {rows.map((t) => (
        <div className="token-row" key={t.id}>
          <div className="top">
            <span className="num-badge">{String(t.id).padStart(3, "0")}</span>
            <span className={`pill ${t.status}`}>{t.status.replace("_", " ")}</span>
          </div>
          <div className="meta">{t.patientName} · {t.department}</div>
          <button className="btn-secondary" style={{ marginBottom: 0 }} onClick={() => void complete(t.id)}>
            Complete consultation
          </button>
        </div>
      ))}
    </div>
  );
}
