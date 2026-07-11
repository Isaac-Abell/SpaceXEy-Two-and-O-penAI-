// Persists the player's best run across sessions in localStorage, so the
// "Can you do better next time?" loop has something to beat. Purely a frontend
// convenience — the backend remains stateless and holds no game history.
import type { ResolveResponse } from "./types";

export interface BestRun {
  valuation_b: number;
  ending_label: string;
  ending_emoji: string;
  ending_id: string;
  track: string;
  industry: string;
}

const KEY = "spacexey.bestRun.v1";

export function loadBestRun(): BestRun | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BestRun) : null;
  } catch {
    return null;
  }
}

function save(run: BestRun): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(run));
  } catch {
    /* storage unavailable / full — best run is a nicety, so ignore */
  }
}

// Record a finished run if it beats the stored best (by valuation). Returns the
// current best and whether THIS run set a new record, for the ending screen.
export function recordRun(
  result: ResolveResponse,
  prev: BestRun | null
): { best: BestRun; isNewBest: boolean } {
  const isNewBest = !prev || result.valuation_b > prev.valuation_b;
  if (!isNewBest) return { best: prev!, isNewBest: false };
  const best: BestRun = {
    valuation_b: result.valuation_b,
    ending_label: result.ending_label,
    ending_emoji: result.ending_emoji,
    ending_id: result.ending_id,
    track: result.track,
    industry: result.industry,
  };
  save(best);
  return { best, isNewBest: true };
}
