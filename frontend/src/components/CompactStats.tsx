import { Box } from "@mui/material";
import type { CardDTO } from "../types";

// A dense one-line numeric readout with abbreviations, for already-chosen
// players on the draft board: VIZ MKT SW HW MTZ DEC EGO (+ MON for investors).
export default function CompactStats({ card }: { card: CardDTO }) {
  const s = card.stats;
  const items: [string, number, boolean?][] =
    card.kind === "investor"
      ? [
          ["MON", s.money ?? 0],
          ["EGO", s.ego, true],
        ]
      : [
          ["VIZ", s.vision],
          ["MKT", s.marketing],
          ["SW", s.techSW],
          ["HW", s.techHW],
          ["MTZ", s.monetization],
          ["DEC", s.deception, true],
          ["EGO", s.ego, true],
        ];

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.75,
        fontFamily: "monospace",
        fontSize: 10.5,
        mt: 0.5,
      }}
    >
      {items.map(([label, value, risk]) => (
        <Box key={label} component="span" sx={{ whiteSpace: "nowrap" }}>
          <Box component="span" sx={{ color: risk ? "#fdd663" : "text.secondary" }}>
            {label}
          </Box>{" "}
          <Box component="span" sx={{ color: "text.primary", fontWeight: 700 }}>
            {Math.round(value)}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
