import { Box, Typography } from "@mui/material";
import { surfaces } from "../theme";

interface Props {
  label: string;
  value: number;
  accent: string;
  /** "risk" stats (Deception/Ego) get a warning tint so meaning reads instantly. */
  risk?: boolean;
  max?: number;
}

// A compact bar for a single stat. Fill uses the card accent (or a warning
// amber/red for risk stats). Values can exceed 99 (tech synergy) so clamp width.
export default function StatBar({ label, value, accent, risk, max = 99 }: Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = risk ? (value >= 60 ? "#f28b82" : "#fdd663") : accent;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.4 }}>
      <Typography
        sx={{
          width: 70,
          fontSize: 11,
          color: risk ? "#fdd663" : "text.secondary",
          fontWeight: risk ? 600 : 500,
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          flex: 1,
          height: 7,
          borderRadius: 4,
          bgcolor: surfaces.track,
          overflow: "hidden",
        }}
      >
        <Box sx={{ width: `${pct}%`, height: "100%", bgcolor: fill, borderRadius: 4 }} />
      </Box>
      <Typography sx={{ width: 26, fontSize: 11, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {Math.round(value)}
      </Typography>
    </Box>
  );
}
