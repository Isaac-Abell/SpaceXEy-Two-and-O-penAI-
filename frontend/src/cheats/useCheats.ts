// Cheats hook. All cheats-related state + backend calls live behind this and
// the CheatPanel component. The rest of the app touches cheats ONLY through the
// single conditional mount in App.tsx. Delete the src/cheats/ folder to remove.
import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

export interface CheatsState {
  configOverride: Record<string, unknown> | null;
  setScalar: (key: string, value: number) => void;
  setNested: (section: string, key: string, value: number) => void;
  resetConfig: () => void;
  defaults: Record<string, unknown> | null;
}

export function useCheats(): CheatsState {
  const [defaults, setDefaults] = useState<Record<string, unknown> | null>(null);
  const [configOverride, setConfigOverride] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setDefaults(await api.cheats.config());
      } catch {
        /* backend cheats not mounted, stay inert */
      }
    })();
  }, []);

  const setScalar = useCallback((key: string, value: number) => {
    setConfigOverride((prev) => ({ ...(prev ?? {}), [key]: value }));
  }, []);

  const setNested = useCallback((section: string, key: string, value: number) => {
    setConfigOverride((prev) => {
      const base = prev ?? {};
      const existing = (base[section] as Record<string, number> | undefined) ?? {};
      return { ...base, [section]: { ...existing, [key]: value } };
    });
  }, []);

  const resetConfig = useCallback(() => setConfigOverride(null), []);

  return { configOverride, setScalar, setNested, resetConfig, defaults };
}
