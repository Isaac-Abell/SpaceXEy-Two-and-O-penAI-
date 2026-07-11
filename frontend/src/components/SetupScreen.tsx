import { Box, Button, Card, Container, Paper, Stack, Typography } from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import type { MetaResponse, Track } from "../types";
import type { BestRun } from "../bestRun";
import { fmtValuation } from "../format";

interface Props {
  meta: MetaResponse;
  track: Track | null;
  industry: string | null;
  bestRun: BestRun | null;
  onTrack: (t: Track) => void;
  onIndustry: (i: string) => void;
  onStart: () => void;
}

const TRACK_INFO: Record<
  Track,
  { label: string; image: string; blurb: string }
> = {
  SW: {
    label: "Software",
    image: "💻",
    blurb:
      "You build in code. Each founder's Technical Ability is read from their Software rating. Far more forgiving, more software startups survive to IPO. The recommended track if you actually want to win.",
  },
  HW: {
    label: "Hardware",
    image: "🔩",
    blurb:
      "You build physical things (atoms, not just bits). Technical Ability comes from the Hardware rating, significantly harder to succeed in.",
  },
};

// Each Industry is one of the Specialties in the data. Matching a founder's
// Specialty to your Industry grants the ×1.05 tech synergy bonus.
const SPECIALTY_INFO: Record<string, { image: string; blurb: string }> = {
  Infra: {
    image: "☁️",
    blurb: "The plumbing the rest of tech runs on: cloud, databases, dev tools, AI.",
  },
  B2B: {
    image: "🏢",
    blurb: "Software sold to other businesses: enterprise SaaS, workflow, back-office.",
  },
  B2C: {
    image: "📱",
    blurb: "Consumer products used directly by millions: apps, social, marketplaces.",
  },
  Chips: {
    image: "🧩",
    blurb: "The silicon itself: processors, GPUs, and the semiconductors everything needs.",
  },
  Computers: {
    image: "🖥️",
    blurb: "Whole machines: PCs, devices, and consoles",
  },
  "Deep Tech": {
    image: "🚀",
    blurb: "Frontier bets: rockets, EVs, robotics, and other physics-hard moonshots.",
  },
};

export default function SetupScreen({
  meta,
  track,
  industry,
  bestRun,
  onTrack,
  onIndustry,
  onStart,
}: Props) {
  const industries = track ? meta.industries_by_track[track] ?? [] : [];

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      {bestRun && (
        <Paper
          variant="outlined"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            mb: 3,
            borderColor: "rgba(253,214,99,0.4)",
            bgcolor: "rgba(253,214,99,0.06)",
          }}
        >
          <EmojiEventsIcon sx={{ color: "#fdd663" }} />
          <Box>
            <Typography sx={{ fontSize: 11, color: "text.secondary", letterSpacing: 0.5 }}>
              YOUR BIGGEST WIN
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>
              {fmtValuation(bestRun.valuation_b)}
              <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
                {" "}· {bestRun.ending_emoji} {bestRun.ending_label || "Trillion-Dollar Club"} ·{" "}
                {bestRun.track}/{bestRun.industry}
              </Box>
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: 12, color: "text.secondary", display: { xs: "none", sm: "block" } }}>
            Can you beat it?
          </Typography>
        </Paper>
      )}

      <Typography variant="h4" gutterBottom>
        Pick your Industry and Technical Track
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Commit to a Technical Track and an Industry.
        Your track decides which Tech rating counts, Hardware or Software. Matching a founder's Specialty to your
        Industry grants a <b>×1.05 synergy</b> bonus to their Technical Ability.
      </Typography>

      <Typography variant="h6" gutterBottom>
        1 · Technical Track
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 4 }}>
        {(["SW", "HW"] as Track[]).map((t) => (
          <Card
            key={t}
            variant="outlined"
            onClick={() => onTrack(t)}
            sx={{
              flex: 1,
              p: 2.5,
              cursor: "pointer",
              borderColor: track === t ? "primary.main" : undefined,
              boxShadow: track === t ? "0 0 0 2px #8ab4f8" : undefined,
              transition: "box-shadow .15s",
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ fontSize: 40, lineHeight: 1 }}>{TRACK_INFO[t].image}</Box>
              <Box>
                <Typography variant="h6">{TRACK_INFO[t].label}</Typography>
                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                  Track: {t}
                </Typography>
              </Box>
            </Stack>
            <Typography color="text.secondary" fontSize={13} lineHeight={1.5}>
              {TRACK_INFO[t].blurb}
            </Typography>
          </Card>
        ))}
      </Stack>

      <Typography variant="h6" gutterBottom>
        2 · Industry
      </Typography>
      {!track ? (
        <Typography color="text.secondary" sx={{ mb: 5 }}>
          Pick a Technical Track first. Each track unlocks its own set of industries.
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            mb: 5,
          }}
        >
          {industries.map((ind) => {
            const info = SPECIALTY_INFO[ind] ?? { image: "•", blurb: "" };
            const active = industry === ind;
            return (
              <Card
                key={ind}
                variant="outlined"
                onClick={() => onIndustry(ind)}
                sx={{
                  p: 1.75,
                  cursor: "pointer",
                  borderColor: active ? "primary.main" : undefined,
                  boxShadow: active ? "0 0 0 2px #8ab4f8" : undefined,
                  transition: "box-shadow .15s",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Box sx={{ fontSize: 26, lineHeight: 1 }}>{info.image}</Box>
                  <Typography sx={{ fontWeight: 700 }}>{ind}</Typography>
                </Stack>
                <Typography sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.45 }}>
                  {info.blurb}
                </Typography>
              </Card>
            );
          })}
        </Box>
      )}

      <Button
        variant="contained"
        size="large"
        startIcon={<RocketLaunchIcon />}
        disabled={!track || !industry}
        onClick={onStart}
      >
        Start the draft
      </Button>
    </Container>
  );
}
