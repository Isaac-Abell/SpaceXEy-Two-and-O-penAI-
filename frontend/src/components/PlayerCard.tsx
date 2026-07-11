import {
  Box,
  Card,
  CardActionArea,
  Chip,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PaidIcon from "@mui/icons-material/Paid";
import StarIcon from "@mui/icons-material/Star";
import type { CardDTO, Track } from "../types";
import StatBar from "./StatBar";

interface Props {
  card: CardDTO;
  track?: Track; // if set, emphasize the on-track tech stat
  selected?: boolean;
  onSelect?: (card: CardDTO) => void;
  compact?: boolean;
}

// The collectible trading-card. Color is keyed to a meaningful attribute
// (Specialty for people, Entity/Individual for investors) and comes from the
// backend as `accent` so it's consistent everywhere.
export default function PlayerCard({ card, track, selected, onSelect, compact }: Props) {
  const isInvestor = card.kind === "investor";
  const accent = card.accent;
  const subtitle = isInvestor
    ? `${card.type ?? ""} · ${card.era ?? ""}`
    : `${card.company ?? ""} · ${card.era ?? ""}`;

  const body = (
    <Box sx={{ position: "relative" }}>
      {/* accent header bar */}
      <Box sx={{ height: 6, bgcolor: accent }} />
      <Box sx={{ p: compact ? 1.25 : 1.75 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{ fontWeight: 700, fontSize: compact ? 14 : 15, lineHeight: 1.2 }}
              noWrap
              title={card.name}
            >
              {card.name}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap title={subtitle}>
              {subtitle}
            </Typography>
          </Box>
          {card.alreadyWealthy && (
            <Chip
              icon={<StarIcon sx={{ fontSize: 14, color: "#fdd663 !important" }} />}
              label="Wealthy"
              size="small"
              sx={{ height: 20, fontSize: 10, bgcolor: "rgba(253,214,99,0.16)", color: "#fdd663" }}
            />
          )}
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, mb: 1, flexWrap: "wrap", gap: 0.5 }}>
          {card.specialty && (
            <Chip
              label={card.specialty}
              size="small"
              sx={{
                height: 20,
                fontSize: 10.5,
                fontWeight: 600,
                color: "#fff",
                bgcolor: accent,
              }}
            />
          )}
          {isInvestor && (
            <Chip
              label={card.type ?? ""}
              size="small"
              sx={{ height: 20, fontSize: 10.5, fontWeight: 600, color: "#fff", bgcolor: accent }}
            />
          )}
        </Stack>

        {isInvestor ? (
          // Investors: Money + Ego prominent.
          <Box>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
              <PaidIcon sx={{ fontSize: 16, color: accent }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                Money {Math.round(card.stats.money ?? 0)}
              </Typography>
            </Stack>
            <StatBar label="Money" value={card.stats.money ?? 0} accent={accent} />
            <StatBar label="Ego" value={card.stats.ego} accent={accent} risk />
          </Box>
        ) : (
          <Box>
            <StatBar label="Vision" value={card.stats.vision} accent={accent} />
            <StatBar label="Marketing" value={card.stats.marketing} accent={accent} />
            <StatBar
              label={track === "HW" ? "Tech HW" : "Tech SW"}
              value={track === "HW" ? card.stats.techHW : card.stats.techSW}
              accent={accent}
            />
            <StatBar label="Monetiz." value={card.stats.monetization} accent={accent} />
            <StatBar label="Deception" value={card.stats.deception} accent={accent} risk />
            <StatBar label="Ego" value={card.stats.ego} accent={accent} risk />
            {card.alreadyWealthy && card.stats.money != null && (
              <StatBar label="Money" value={card.stats.money} accent={accent} />
            )}
          </Box>
        )}

        {card.wikipedia && (
          <Link
            href={card.wikipedia}
            target="_blank"
            rel="noopener"
            sx={{
              mt: 0.75,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.3,
              fontSize: 11,
              color: "primary.main",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            Wikipedia <OpenInNewIcon sx={{ fontSize: 12 }} />
          </Link>
        )}
      </Box>
    </Box>
  );

  return (
    <Card
      variant="outlined"
      sx={{
        borderLeft: `4px solid ${accent}`,
        borderColor: selected ? "primary.main" : undefined,
        boxShadow: selected
          ? "0 0 0 2px #8ab4f8, 0 1px 3px rgba(0,0,0,0.4)"
          : "0 1px 2px rgba(0,0,0,0.3)",
        transition: "box-shadow .15s, transform .15s",
        "&:hover": onSelect ? { transform: "translateY(-2px)" } : undefined,
        height: "100%",
      }}
    >
      {onSelect ? (
        <CardActionArea onClick={() => onSelect(card)} sx={{ height: "100%" }}>
          {body}
        </CardActionArea>
      ) : (
        body
      )}
    </Card>
  );
}
