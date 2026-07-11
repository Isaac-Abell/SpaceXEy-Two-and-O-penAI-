// Single typed API client module. The ONLY place the app talks to the backend.
// Base URL comes from VITE_API_BASE, never hardcoded.

import type {
  CardDTO,
  MetaResponse,
  Picks,
  ResolveResponse,
  RollCompanyResponse,
  RollInvestorsResponse,
  Track,
} from "./types";

const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  base: API_BASE,

  health: () => req<{ status: string }>("/api/health"),

  meta: () => req<MetaResponse>("/api/meta"),

  rollCompanySlot: (excludedPeople: string[]) =>
    req<RollCompanyResponse>("/api/roll/company-slot", {
      method: "POST",
      body: JSON.stringify({ excluded_people: excludedPeople }),
    }),

  rollInvestors: () =>
    req<RollInvestorsResponse>("/api/roll/investors", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  resolve: (
    track: Track,
    industry: string,
    picks: Picks,
    configOverride?: Record<string, unknown> | null
  ) =>
    req<ResolveResponse>("/api/resolve", {
      method: "POST",
      body: JSON.stringify({
        track,
        industry,
        picks,
        config_override: configOverride ?? null,
      }),
    }),

  // ---- cheats-only endpoints (inert unless the backend has them mounted) ---
  cheats: {
    searchPeople: (q: string) =>
      req<CardDTO[]>(`/api/cheats/people?q=${encodeURIComponent(q)}`),
    searchInvestors: (q: string) =>
      req<CardDTO[]>(`/api/cheats/investors?q=${encodeURIComponent(q)}`),
    config: () => req<Record<string, unknown>>("/config"),
  },
};
