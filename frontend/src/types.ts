// Types mirroring the backend JSON contract (see backend/app/schemas.py).
// The frontend holds NO game logic; these are pure data shapes.

export type Track = "HW" | "SW";
export type Role = "CEO" | "CTO" | "SWE" | "CMO" | "COO" | "INV";

export interface CardStats {
  vision: number;
  marketing: number;
  techHW: number;
  techSW: number;
  deception: number;
  ego: number;
  monetization: number;
  money?: number | null;
}

export interface CardDTO {
  id: string;
  name: string;
  kind: "person" | "investor";
  company?: string | null;
  era?: string | null;
  specialty?: string | null;
  type?: string | null; // investor: Individual | Entity
  wikipedia?: string | null;
  github?: string | null;
  stats: CardStats;
  accent: string;
  alreadyWealthy?: boolean;
}

export interface EndingTier {
  id: string;
  label: string;
  emoji: string;
  category: "victory" | "gameover";
  min_valuation_b?: number | null;
  max_valuation_b?: number | null;
  note: string;
}

export interface MetaResponse {
  tracks: Track[];
  industries: string[];
  industries_by_track: Record<string, string[]>;
  roles: Role[];
  companies: string[];
  ending_tiers: EndingTier[];
  cheats_enabled: boolean;
}

export interface RollCompanyResponse {
  company: string;
  era: string;
  roster: CardDTO[];
}

export interface RollInvestorsResponse {
  investors: CardDTO[];
}

export interface TeamStats {
  vision: number;
  marketing: number;
  tech: number;
  deception: number;
  monetization: number;
  ego: number;
  money: number;
  potential: number;
}

export interface DeathCheck {
  id: string;
  label: string;
  detail: string;
}

export interface ResolveResponse {
  track: Track;
  industry: string;
  team_stats: TeamStats;
  death_check: DeathCheck | null;
  cashout: boolean;
  valuation_b: number;
  ending_id: string;
  ending_label: string;
  ending_emoji: string;
  ending_category: "victory" | "gameover";
  blurb: string;
  cards: CardDTO[];
}

export type Picks = Record<Role, string>;

export interface ResolveRequest {
  track: Track;
  industry: string;
  picks: Picks;
  config_override?: Record<string, unknown> | null;
}
