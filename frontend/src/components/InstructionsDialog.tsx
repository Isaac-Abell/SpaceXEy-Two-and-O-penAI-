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
  ["CEO", "The Visionary", "Sets the ceiling and the culture. Dominates Vision."],
  ["CTO", "The Architect", "Designs the tech stack. Anchors Technical Ability."],
  ["Lead SWE", "The Executioner", "Actually builds the thing. The other half of Tech."],
  ["CMO", "The Hype Engine", "Drives the narrative and demand. Dominates Marketing."],
  ["COO", "The Operator", "Runs burn and the path to profit. Dominates Monetization."],
  ["Lead Investor", "The Bankroll", "Provides capital and sets the board's ego baseline."],
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
          SpaceXEY is a draft and pray roguelike. You assemble a startup from the legends of
          tech history, then take it public and see how it turns out. You do not pick the best
          players; you are handed random ones and make the most of the hand you are dealt.
        </Typography>

        <Step
          n={1}
          title="Set your bet"
          body="Commit to a Technical Track (Hardware or Software) and an Industry. Your track decides which Tech rating counts, and matching a founder's specialty to your industry gives their Tech a small synergy bonus. Locked for the run."
        />
        <Step
          n={2}
          title="Spin for a company"
          body="Each spin lands on a random company from a specific era (2010s Tesla is different from 2000s Tesla) and reveals that team's real founders and operators."
        />
        <Step
          n={3}
          title="Draft a player, then place them"
          body="Click a founder in the reveal to hold them, then click an open role slot to place them there. Deal three investors for the money slot and pick one. One roll per pick, so choose wisely."
        />
        <Step
          n={4}
          title="Take it public"
          body="Once all six slots are filled, take the company public and watch it resolve into an outcome, for better or worse."
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
