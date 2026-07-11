import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Toolbar,
  Typography,
} from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { api } from "./api";
import type { CardDTO, MetaResponse, Picks, ResolveResponse, Role, Track } from "./types";
import SetupScreen from "./components/SetupScreen";
import DraftScreen from "./components/DraftScreen";
import EndingScreen from "./components/EndingScreen";
import InstructionsDialog from "./components/InstructionsDialog";
import { loadBestRun, recordRun, type BestRun } from "./bestRun";
// --- CHEATS START --- (delete this import + the mount below + src/cheats/ to remove)
import CheatPanel from "./cheats/CheatPanel";
// --- CHEATS END ---

// Single feature flag. When not "true", the cheats import + mount never runs
// and the feature leaves zero visible trace.
const CHEATS = import.meta.env.VITE_CHEATS === "true";

type Phase = "setup" | "draft" | "ending";

const EMPTY_PICKS: Record<Role, CardDTO | null> = {
  CEO: null, CTO: null, SWE: null, CMO: null, COO: null, INV: null,
};

export default function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [track, setTrack] = useState<Track | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<Role, CardDTO | null>>(EMPTY_PICKS);
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [resolving, setResolving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [bestRun, setBestRun] = useState<BestRun | null>(() => loadBestRun());
  const [isNewBest, setIsNewBest] = useState(false);
  // Cheats-only config override (null in normal play; backend ignores it too).
  const [configOverride, setConfigOverride] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api
      .meta()
      .then(setMeta)
      .catch((e) => setLoadError((e as Error).message));
  }, []);

  const setPick = useCallback((role: Role, card: CardDTO) => {
    setPicks((prev) => ({ ...prev, [role]: card }));
  }, []);

  // Changing track resets the industry; industries are track-specific.
  const chooseTrack = useCallback((t: Track) => {
    setTrack(t);
    setIndustry(null);
  }, []);

  const handleResolve = useCallback(
    async (finalPicks: Picks) => {
      if (!track || !industry) return;
      setResolving(true);
      try {
        const res = await api.resolve(track, industry, finalPicks, CHEATS ? configOverride : null);
        const { best, isNewBest: newBest } = recordRun(res, bestRun);
        setBestRun(best);
        setIsNewBest(newBest);
        setResult(res);
        setPhase("ending");
      } catch (e) {
        setLoadError((e as Error).message);
      } finally {
        setResolving(false);
      }
    },
    [track, industry, configOverride, bestRun]
  );

  const runItBack = useCallback(() => {
    setPicks(EMPTY_PICKS);
    setResult(null);
    setPhase("setup");
  }, []);

  // Clicking the logo returns to a fresh home screen.
  const goHome = useCallback(() => {
    setPicks(EMPTY_PICKS);
    setResult(null);
    setTrack(null);
    setIndustry(null);
    setPhase("setup");
  }, []);

  const cheatsBadge = useMemo(
    () =>
      CHEATS ? (
        <Chip
          label="CHEATS ON"
          size="small"
          sx={{ ml: 1.5, bgcolor: "rgba(242,139,130,0.18)", color: "#f28b82", fontWeight: 700 }}
        />
      ) : null,
    []
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky">
        <Toolbar>
          <Box
            onClick={goHome}
            title="Back to home"
            sx={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              borderRadius: 2,
              px: 0.5,
              "&:hover": { opacity: 0.8 },
            }}
          >
            <RocketLaunchIcon sx={{ mr: 1.5, color: "primary.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              SpaceXEY{" "}
              <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
                · Two and O(penAI)
              </Box>
            </Typography>
          </Box>
          {cheatsBadge}
          <Box sx={{ flex: 1 }} />
          <Button
            color="inherit"
            startIcon={<HelpOutlineIcon />}
            onClick={() => setShowHelp(true)}
            sx={{ color: "text.secondary" }}
          >
            How to play
          </Button>
        </Toolbar>
      </AppBar>

      <InstructionsDialog open={showHelp} onClose={() => setShowHelp(false)} />

      {loadError && (
        <Alert severity="error" sx={{ m: 2 }}>
          {loadError}
        </Alert>
      )}

      {!meta && !loadError && (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 10 }}>
          <CircularProgress />
        </Box>
      )}

      {meta && phase === "setup" && (
        <SetupScreen
          meta={meta}
          track={track}
          industry={industry}
          bestRun={bestRun}
          onTrack={chooseTrack}
          onIndustry={setIndustry}
          onStart={() => setPhase("draft")}
        />
      )}

      {meta && phase === "draft" && track && industry && (
        <DraftScreen
          track={track}
          industry={industry}
          companies={meta.companies}
          picks={picks}
          onPick={setPick}
          onResolve={handleResolve}
          resolving={resolving}
        />
      )}

      {meta && phase === "ending" && result && (
        <EndingScreen result={result} bestRun={bestRun} isNewBest={isNewBest} onRunItBack={runItBack} />
      )}

      {/* --- CHEATS START --- single conditional mount; delete to remove --- */}
      {CHEATS && <CheatPanel onPick={setPick} onConfigChange={setConfigOverride} />}
      {/* --- CHEATS END --- */}
    </Box>
  );
}
