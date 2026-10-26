import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api";
import { DEPARTMENTS, type TokenView } from "../types";

interface Props {
  /** Called after a token is created so the app can start tracking it. */
  onCreated: (token: TokenView) => void;
}

export default function TokenForm({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<TokenView | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const token = await api.createToken(name.trim(), phone.trim(), department);
      setCreated(token);
      setName("");
      setPhone("");
      onCreated(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">Get an OPD token</h2>
      <p className="card-sub">Your name and phone number are only visible to hospital staff. The public queue shows just an initial.</p>
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="pname">Name</label>
        <input id="pname" className="field" value={name} onChange={(e) => setName(e.target.value)}
          required maxLength={100} placeholder="Patient name" />
        <label className="field-label" htmlFor="pphone">Phone (optional)</label>
        <input id="pphone" className="field" value={phone} onChange={(e) => setPhone(e.target.value)}
          inputMode="tel" pattern="[0-9+\(\)\- ]{7,20}" title="7–20 digits; + ( ) - and spaces allowed"
          placeholder="e.g. 9876543210" />
        <label className="field-label" htmlFor="pdept">Department</label>
        <select id="pdept" className="field" value={department} onChange={(e) => setDepartment(e.target.value)}>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {error && <p className="error-text" role="alert">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy} style={{ marginBottom: 0 }}>
          {busy ? "Creating…" : "Create token"}
        </button>
      </form>
      {created && (
        <p className="ok-text" style={{ marginTop: 12 }} role="status">
          Token <b>{String(created.id).padStart(3, "0")}</b> created for {created.department}. Open the Patient tab to see your live wait.
        </p>
      )}
    </div>
  );
}
