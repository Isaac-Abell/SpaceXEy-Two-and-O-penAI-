import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import ReplayIcon from "@mui/icons-material/Replay";
import IosShareIcon from "@mui/icons-material/IosShare";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import type { ResolveResponse } from "../types";
import type { BestRun } from "../bestRun";
import { fmtValuation } from "../format";
import PlayerCard from "./PlayerCard";
import Confetti from "./Confetti";

interface Props {
  result: ResolveResponse;
  bestRun: BestRun | null;
  isNewBest: boolean;
  onRunItBack: () => void;
}

// The frontend maps ending_id to a visual treatment ONLY. It never re-derives
// any threshold: id, label, emoji and blurb all come from the backend.
const SPECIAL_BG: Record<string, string> = {
  perfect_season: "linear-gradient(135deg,#2a2410,#1a160a)",
  anti_founder: "linear-gradient(135deg,#2a2410,#1a160a)",
};

const ROLE_LABELS = ["CEO", "CTO", "Lead SWE", "CMO", "COO", "Investor"];

function buildShareText(result: ResolveResponse): string {
  const lines = [
    "SpaceXEY Two and O(penAI)",
    `${result.ending_emoji} ${result.ending_label}`,
    `Valuation: ${fmtValuation(result.valuation_b)}`,
    `Potential: ${result.team_stats.potential.toFixed(1)} / 100`,
    "",
    "Roster:",
  ];
  result.cards.forEach((c, i) => {
    const loc =
      c.kind === "investor"
        ? c.type ?? ""
        : `${c.company ?? ""} ${c.era ?? ""}`.trim();
    lines.push(`${ROLE_LABELS[i]}: ${c.name}${loc ? ` (${loc})` : ""}`);
  });
  return lines.join("\n");
}

// Render a shareable PNG of the roster + score onto an offscreen canvas.
function makeShareImage(result: ResolveResponse): Promise<Blob | null> {
  const scale = 2;
  const W = 900;
  const pad = 44;
  const rowH = 60;
  const rosterTop = 366;
  const H = rosterTop + result.cards.length * rowH + 54;

  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.scale(scale, scale);

  const victory = result.ending_category === "victory";
  const accent = victory ? "#81c995" : "#f28b82";
  const font = (spec: string) =>
    (ctx.font = `${spec} "Segoe UI","Helvetica Neue",Arial,sans-serif`);

  // background
  ctx.fillStyle = "#0e1015";
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#9aa0a6";
  font("600 16px");
  ctx.fillText("SpaceXEY: Two and O(penAI)", W / 2, 42);

  font("72px");
  ctx.fillText(result.ending_emoji, W / 2, 132);

  ctx.fillStyle = accent;
  font("700 38px");
  ctx.fillText(result.ending_label, W / 2, 186);

  const cx1 = W / 2 - 140;
  const cx2 = W / 2 + 140;
  ctx.fillStyle = "#9aa0a6";
  font("12px");
  ctx.fillText("VALUATION", cx1, 224);
  ctx.fillText("POTENTIAL", cx2, 224);
  ctx.fillStyle = "#e8eaed";
  font("700 27px");
  ctx.fillText(fmtValuation(result.valuation_b), cx1, 255);
  ctx.fillText(result.team_stats.potential.toFixed(1), cx2, 255);

  const s = result.team_stats;
  const strip = `VIZ ${Math.round(s.vision)}   MKT ${Math.round(s.marketing)}   TECH ${Math.round(
    s.tech
  )}   MON ${Math.round(s.monetization)}   DEC ${Math.round(s.deception)}   EGO ${Math.round(s.ego)}`;
  ctx.fillStyle = "#9aa0a6";
  font("600 15px");
  ctx.fillText(strip, W / 2, 292);

  ctx.strokeStyle = "#2a2f3a";
  ctx.beginPath();
  ctx.moveTo(pad, 316);
  ctx.lineTo(W - pad, 316);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#9aa0a6";
  font("700 13px");
  ctx.fillText("ROSTER", pad, 344);

  result.cards.forEach((c, i) => {
    const y = rosterTop + i * rowH;
    ctx.fillStyle = c.accent;
    ctx.fillRect(pad, y, 6, 40);
    ctx.fillStyle = "#9aa0a6";
    font("700 12px");
    ctx.fillText(ROLE_LABELS[i].toUpperCase(), pad + 18, y + 15);
    ctx.fillStyle = "#e8eaed";
    font("700 17px");
    ctx.fillText(c.name, pad + 18, y + 35);
    const loc =
      c.kind === "investor" ? c.type ?? "" : `${c.company ?? ""} · ${c.era ?? ""}`;
    const nameW = ctx.measureText(c.name).width;
    ctx.fillStyle = "#9aa0a6";
    font("14px");
    ctx.fillText(loc, pad + 18 + nameW + 14, y + 35);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#5f6368";
  font("13px");
  ctx.fillText("Draft a startup. Take it public.", W / 2, H - 22);

  return new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
}

function StatChip({ label, value }: { label: string; value: number | string }) {
  return (
    <Paper variant="outlined" sx={{ px: 1.5, py: 1, textAlign: "center", minWidth: 92 }}>
      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
    </Paper>
  );
}

export default function EndingScreen({ result, bestRun, isNewBest, onRunItBack }: Props) {
  const victory = result.ending_category === "victory";
  const accent = victory ? "#81c995" : "#f28b82";
  const bg = SPECIAL_BG[result.ending_id] ?? (victory ? "#132018" : "#201414");
  const s = result.team_stats;
  // The two rarest, gold-treatment endings earn a confetti celebration.
  const celebrate = result.ending_id === "perfect_season" || result.ending_id === "anti_founder";
  const [snack, setSnack] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    setSharing(true);
    try {
      const blob = await makeShareImage(result);
      const text = buildShareText(result);
      const nav = navigator as Navigator & {
        canShare?: (d: unknown) => boolean;
      };

      if (blob) {
        const file = new File([blob], "spacexey-result.png", { type: "image/png" });
        // Native share sheet with the image, where supported (mostly mobile).
        if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
          try {
            await nav.share({ files: [file], title: "SpaceXEY: Two and O(penAI)", text });
            return;
          } catch {
            /* cancelled or failed; fall through to download */
          }
        }
        // Fallback: save the PNG so it can be shared anywhere.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "spacexey-result.png";
        a.click();
        URL.revokeObjectURL(url);
        setSnack("Image saved to your downloads");
        return;
      }

      // Last resort if canvas is unavailable: copy the text.
      await navigator.clipboard.writeText(text);
      setSnack("Result copied to clipboard");
    } catch {
      setSnack("Could not generate the share image");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Confetti fire={celebrate} />
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          border: `1px solid ${victory ? "rgba(129,201,149,0.35)" : "rgba(242,139,130,0.35)"}`,
        }}
      >
        <Box sx={{ background: bg, p: { xs: 3, sm: 5 }, textAlign: "center" }}>
          <Typography sx={{ fontSize: 64, lineHeight: 1 }}>{result.ending_emoji}</Typography>
          <Typography variant="h4" sx={{ mt: 1, color: accent }}>
            {result.ending_label}
          </Typography>
          {isNewBest && (
            <Chip
              icon={<EmojiEventsIcon sx={{ fontSize: 16, color: "#fdd663 !important" }} />}
              label="New personal best!"
              size="small"
              sx={{ mt: 1.5, bgcolor: "rgba(253,214,99,0.16)", color: "#fdd663", fontWeight: 700 }}
            />
          )}
          <Stack direction="row" spacing={3} justifyContent="center" sx={{ mt: 2 }}>
            <Box>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>VALUATION</Typography>
              <Typography variant="h5">{fmtValuation(result.valuation_b)}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>POTENTIAL</Typography>
              <Typography variant="h5">{s.potential.toFixed(1)}</Typography>
            </Box>
          </Stack>
          {bestRun && !isNewBest && (
            <Typography sx={{ mt: 1.5, fontSize: 12, color: "text.secondary" }}>
              Your best: {fmtValuation(bestRun.valuation_b)} · {bestRun.ending_emoji}{" "}
              {bestRun.ending_label || "Trillion-Dollar Club"}
            </Typography>
          )}
        </Box>

        <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Typography sx={{ fontSize: 16, lineHeight: 1.7, color: "text.primary" }}>
            {result.blurb}
          </Typography>

          <Divider sx={{ my: 3 }} />

          {result.death_check ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              <b>{result.death_check.label}</b>: {result.death_check.detail}
            </Alert>
          ) : (
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
              <Chip
                label={`Potential ${s.potential.toFixed(1)} / 100`}
                color="primary"
                variant="outlined"
              />
              {result.cashout && <Chip label="Cash-out cap ($1B)" color="warning" />}
            </Stack>
          )}

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Team stats
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, mb: 3 }}>
            <StatChip label="Vision" value={s.vision.toFixed(1)} />
            <StatChip label="Marketing" value={s.marketing.toFixed(1)} />
            <StatChip label="Tech" value={s.tech.toFixed(1)} />
            <StatChip label="Monetiz." value={s.monetization.toFixed(1)} />
            <StatChip label="Deception" value={s.deception.toFixed(1)} />
            <StatChip label="Ego" value={s.ego.toFixed(1)} />
            <StatChip label="Money" value={s.money.toFixed(0)} />
          </Stack>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Your roster
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
              mb: 3,
            }}
          >
            {result.cards.map((c) => (
              <PlayerCard key={c.id} card={c} track={result.track} compact />
            ))}
          </Box>

          <Stack direction="row" spacing={1.5} justifyContent="center">
            <Button
              variant="outlined"
              size="large"
              startIcon={sharing ? <CircularProgress size={18} /> : <IosShareIcon />}
              onClick={share}
              disabled={sharing}
            >
              Share image
            </Button>
            <Button variant="contained" size="large" startIcon={<ReplayIcon />} onClick={onRunItBack}>
              Run it back
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Snackbar
        open={!!snack}
        autoHideDuration={2800}
        onClose={() => setSnack(null)}
        message={snack ?? ""}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Container>
  );
}
