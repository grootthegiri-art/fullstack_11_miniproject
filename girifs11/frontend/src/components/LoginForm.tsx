import { useState, type FormEvent } from "react";

interface Props {
  title: string;
  hint: string;
  defaultUser: string;
  error: string;
  busy: boolean;
  onSubmit: (user: string, pass: string) => void;
}

export default function LoginForm({ title, hint, defaultUser, error, busy, onSubmit }: Props) {
  const [user, setUser] = useState(defaultUser);
  const [pass, setPass] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(user.trim(), pass);
  }
  return (
    <div className="card">
      <h2 className="card-title">{title}</h2>
      <p className="card-sub">{hint}</p>
      <form onSubmit={submit}>
        <label className="field-label" htmlFor={`${defaultUser}-user`}>Username</label>
        <input id={`${defaultUser}-user`} className="field" value={user} onChange={(e) => setUser(e.target.value)} required autoComplete="username" />
        <label className="field-label" htmlFor={`${defaultUser}-pass`}>Password</label>
        <input id={`${defaultUser}-pass`} className="field" type="password" value={pass} onChange={(e) => setPass(e.target.value)} required autoComplete="current-password" />
        {error && <p className="error-text" role="alert">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy} style={{ marginBottom: 0 }}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}
