import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ROLES: [string, string, string][] = [
  ["CEO", "The Visionary", "Drives the core Vision of the company, while keeping a hand in every department."],
  ["CTO", "The Architect", "Drives the Tech output, but exerts influence across the rest of the company."],
  ["Lead SWE", "The Builder", "Code Monkey"],
  ["CMO", "The Marketer", "Works on Marketing reach and user acquisition."],
  ["COO", "The Revenue Chief", "Focused on Monetization and optimizing cash flow."],
  ["Lead Investor", "The Bankroll", "Provides the Money to fund the company"],
];

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
      <Box
        sx={{
          flexShrink: 0,
          width: 26,
          height: 26,
          borderRadius: "50%",
          bgcolor: "primary.main",
          color: "#0e1015",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
        }}
      >
        {n}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
        <Typography sx={{ fontSize: 13.5, color: "text.secondary", lineHeight: 1.5 }}>
          {body}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function InstructionsDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <span>How to play</span>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Typography color="text.secondary" sx={{ mb: 2.5 }}>
          SpaceXEY is a startup-building game. Spin to reveal real companies from tech history,
          draft their actual founders and operators into your six roles, then take the company
          public. How well those people fit together decides whether you build a giant or a bust.
        </Typography>

        <Step
          n={1}
          title="Set your bet"
          body="Choose a Technical Track (Hardware or Software) and an Industry, locked for the run. Your track decides whether each founder's Hardware or Software Tech rating counts, and matching a founder's specialty to your industry gives their Tech a small bonus."
        />
        <Step
          n={2}
          title="Spin for a company"
          body="Each spin lands on a random company from a specific era (ie 1990s Google) and reveals notable people from that time who you can draft onto your team."
        />
        <Step
          n={3}
          title="Draft a person, then place them"
          body="Click a founder to hold them, then click an open role slot to place them there. For the money slot you're given three random investors; pick one. You get one shot per pick, so choose carefully."
        />
        <Step
          n={4}
          title="Take it public"
          body="Once all six slots are filled, take the company public and see how it performs, from a runaway success to an outright bust."
        />

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          The six slots
        </Typography>
        <Stack spacing={0.75} sx={{ mb: 2 }}>
          {ROLES.map(([role, arch, desc]) => (
            <Box key={role}>
              <Typography sx={{ fontSize: 13.5 }}>
                <b>{role}</b>{" "}
                <Box component="span" sx={{ color: "text.secondary" }}>
                  ({arch})
                </Box>
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>{desc}</Typography>
            </Box>
          ))}
        </Stack>

        <Typography variant="subtitle2" gutterBottom>
          Reading the cards
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: "text.secondary", lineHeight: 1.6 }}>
          Every founder is rated on Vision, Marketing, Tech, and Monetization, plus two risk
          stats shown in amber: <b>Deception</b> and <b>Ego</b>. Those two are dangerous, not
          helpful. Too much Deception and the company gets exposed as fraud; too much Ego and the
          founders force each other out. Investors bring Money and their own Ego. Build a team
          that is brilliant without being a powder keg.
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
