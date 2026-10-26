import type { StaffTokenView, TokenView, WaitEstimate } from "./types";

// Defaults to the backend on the same machine; override with VITE_API_URL in a .env file.
export const API_BASE: string =
  import.meta.env.VITE_API_URL ?? `http://${window.location.hostname || "localhost"}:8080`;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Builds an HTTP Basic header value (UTF-8 safe). The password is only kept in memory. */
export function basicAuth(user: string, pass: string): string {
  const bytes = new TextEncoder().encode(`${user}:${pass}`);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return "Basic " + btoa(bin);
}

async function request<T>(path: string, init: RequestInit = {}, auth?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body) headers["Content-Type"] = "application/json";
  if (auth) headers["Authorization"] = auth;
  let res: Response;
  try {
    res = await fetch(API_BASE + path, { ...init, headers });
  } catch {
    throw new ApiError(0, "Cannot reach the API. Is the Spring Boot backend running?");
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body.message === "string" && body.message) message = body.message;
    } catch { /* body was not JSON */ }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export const api = {
  getQueue: () => request<TokenView[]>("/api/queue"),
  getToken: (id: number) => request<TokenView>(`/api/tokens/${id}`),
  getWait: (id: number) => request<WaitEstimate>(`/api/tokens/${id}/wait`),
  createToken: (name: string, phone: string, department: string) =>
    request<TokenView>("/api/tokens", {
      method: "POST",
      body: JSON.stringify({ name, phone, department }),
    }),
  staffQueue: (auth: string) => request<StaffTokenView[]>("/api/staff/queue", {}, auth),
  setStatus: (auth: string, id: number, status: string) =>
    request<TokenView>(`/api/staff/tokens/${id}/status`,
      { method: "PUT", body: JSON.stringify({ status }) }, auth),
  doctorQueue: (auth: string) => request<StaffTokenView[]>("/api/doctor/queue", {}, auth),
  complete: (auth: string, id: number, doctorName: string) =>
    request<TokenView>(`/api/doctor/tokens/${id}/complete`,
      { method: "POST", body: JSON.stringify({ doctorName }) }, auth),
};
