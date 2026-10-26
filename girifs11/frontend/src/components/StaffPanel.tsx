import { useCallback, useEffect, useState } from "react";
import { api, ApiError, basicAuth } from "../api";
import { STATUSES, type StaffTokenView } from "../types";
import LoginForm from "./LoginForm";

interface Props {
  auth: string | null;
  setAuth: (a: string | null) => void;
}

export default function StaffPanel({ auth, setAuth }: Props) {
  const [rows, setRows] = useState<StaffTokenView[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleError = useCallback((err: unknown) => {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      setAuth(null);
      setError(err.status === 401 ? "Wrong username or password." : "This account is not allowed to use the staff panel.");
    } else {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }, [setAuth]);

  const load = useCallback(async (a: string) => {
    try {
      setRows(await api.staffQueue(a));
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
      setRows(await api.staffQueue(a));
      setAuth(a);
    } catch (err) { handleError(err); }
    finally { setBusy(false); }
  }

  async function changeStatus(id: number, status: string) {
    if (!auth) return;
    try {
      await api.setStatus(auth, id, status);
      await load(auth);
    } catch (err) { handleError(err); }
  }

  if (!auth) {
    return <LoginForm title="Staff sign-in" hint="Demo account: staff / staff123 (local academic use only)."
      defaultUser="staff" error={error} busy={busy} onSubmit={login} />;
  }

  return (
    <div className="card">
      <div className="inline-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <h2 className="card-title" style={{ margin: 0 }}>Queue control</h2>
        <button className="logout" onClick={() => { setAuth(null); setRows([]); }}>Sign out</button>
      </div>
      <p className="card-sub">Change a token's status. The list refreshes every 5 seconds.</p>
      {error && <p className="error-text" role="alert">{error}</p>}
      {rows.length === 0 && <div className="empty">No tokens yet. Create one from the “Get token” tab.</div>}
      {rows.map((t) => (
        <div className="token-row" key={t.id}>
          <div className="top">
            <span className="num-badge">{String(t.id).padStart(3, "0")}</span>
            <span className={`pill ${t.status}`}>{t.status.replace("_", " ")}</span>
          </div>
          <div className="meta">{t.patientName}{t.phone ? ` · ${t.phone}` : ""} · {t.department} · ~{t.expectedMinutes} min</div>
          <select className="field" style={{ marginBottom: 0 }} aria-label={`Status for token ${t.id}`}
            value={t.status} disabled={t.status === "COMPLETED"}
            onChange={(e) => void changeStatus(t.id, e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}
