// CheatPanel: the ONLY cheats UI surface besides the badge. Mounted once, in
// App.tsx, behind `{CHEATS && <CheatPanel .../>}`. No cheats logic leaks into
// normal components. Delete the src/cheats/ folder + that mount to remove.
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Fab,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { api } from "../api";
import type { CardDTO, Role } from "../types";
import PlayerCard from "../components/PlayerCard";
import { useCheats } from "./useCheats";

const COMPANY_ROLES: Role[] = ["CEO", "CTO", "SWE", "CMO", "COO"];

interface Props {
  onPick: (role: Role, card: CardDTO) => void;
  // Lifts the current config_override up to App so /api/resolve can send it.
  onConfigChange: (override: Record<string, unknown> | null) => void;
}

// Minimal YAML serializer for the known config shape (scalars, one-level dicts,
// arrays of pairs). Used for the "copy as YAML" convenience.
function toYaml(obj: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (v !== null && typeof v === "object") {
          lines.push(`  ${k}: ${JSON.stringify(v)}`);
        } else {
          lines.push(`  "${k}": ${v}`);
        }
      }
    } else if (Array.isArray(val)) {
      lines.push(`${key}:`);
      for (const item of val) lines.push(`  - ${JSON.stringify(item)}`);
    } else {
      lines.push(`${key}: ${val}`);
    }
  }
  return lines.join("\n");
}

function deepMerge(
  base: Record<string, unknown>,
  over: Record<string, unknown> | null
): Record<string, unknown> {
  if (!over) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v !== null && typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object") {
      out[k] = { ...(out[k] as object), ...(v as object) };
    } else {
      out[k] = v;
    }
  }
  return out;
}

export default function CheatPanel({ onPick, onConfigChange }: Props) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("CEO");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardDTO[]>([]);
  const cheats = useCheats();
  const { defaults, configOverride, setScalar, setNested, resetConfig } = cheats;

  // Keep App's config_override in sync with the panel.
  useEffect(() => {
    onConfigChange(configOverride);
  }, [configOverride, onConfigChange]);

  const search = async () => {
    if (role === "INV") setResults(await api.cheats.searchInvestors(query));
    else setResults(await api.cheats.searchPeople(query));
  };

  const assign = (card: CardDTO) => {
    onPick(role, card);
  };

  const copyYaml = async () => {
    if (!defaults) return;
    const merged = deepMerge(defaults, configOverride);
    await navigator.clipboard.writeText(toYaml(merged));
  };

  const currentVal = (key: string): number =>
    (configOverride?.[key] as number | undefined) ??
    (defaults?.[key] as number | undefined) ??
    0;

  const scalarKeys = defaults
    ? Object.entries(defaults)
        .filter(([, v]) => typeof v === "number")
        .map(([k]) => k)
    : [];

  const eraTol = (defaults?.era_tolerance as Record<string, number> | undefined) ?? {};

  return (
    <>
      <Tooltip title="Cheats panel">
        <Fab
          color="secondary"
          onClick={() => setOpen(true)}
          sx={{ position: "fixed", bottom: 24, right: 24, bgcolor: "#5f6368", "&:hover": { bgcolor: "#3c4043" } }}
        >
          <TuneIcon />
        </Fab>
      </Tooltip>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: { xs: 340, sm: 420 }, p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">🛠️ Cheats</Typography>
            <IconButton onClick={() => setOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>

          <Typography variant="subtitle2" gutterBottom>
            Direct slot assignment
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5, mb: 1 }}>
            {[...COMPANY_ROLES, "INV" as Role].map((r) => (
              <Chip
                key={r}
                label={r}
                size="small"
                color={role === r ? "primary" : "default"}
                onClick={() => {
                  setRole(r);
                  setResults([]);
                }}
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={role === "INV" ? "Search investors…" : "Search name / company…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <Button variant="outlined" onClick={search}>
              Find
            </Button>
          </Stack>
          <Box sx={{ maxHeight: 280, overflowY: "auto", display: "grid", gap: 1, mb: 2 }}>
            {results.slice(0, 40).map((c) => (
              <PlayerCard key={c.id} card={c} onSelect={assign} compact />
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Live config tuning</Typography>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Copy merged config as YAML">
                <IconButton size="small" onClick={copyYaml}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset to defaults">
                <IconButton size="small" onClick={resetConfig}>
                  <RestartAltIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 1.5 }}>
            Changes apply on the next “Take it public” via config_override.
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 2 }}>
            {scalarKeys.map((key) => (
              <TextField
                key={key}
                size="small"
                type="number"
                label={key}
                value={currentVal(key)}
                onChange={(e) => setScalar(key, Number(e.target.value))}
                InputLabelProps={{ sx: { fontSize: 11 } }}
                inputProps={{ step: "any", style: { fontSize: 13 } }}
              />
            ))}
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Era tolerance (uses CEO era)
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
            {Object.keys(eraTol).map((era) => (
              <TextField
                key={era}
                size="small"
                type="number"
                label={era}
                value={
                  (configOverride?.era_tolerance as Record<string, number> | undefined)?.[era] ??
                  eraTol[era]
                }
                onChange={(e) => setNested("era_tolerance", era, Number(e.target.value))}
                InputLabelProps={{ sx: { fontSize: 11 } }}
                inputProps={{ step: "any", style: { fontSize: 13 } }}
              />
            ))}
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
