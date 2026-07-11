import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import PaidIcon from "@mui/icons-material/Paid";
import PublicIcon from "@mui/icons-material/Public";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { api } from "../api";
import type { CardDTO, Picks, Role, Track } from "../types";
import PlayerCard from "./PlayerCard";
import CompactStats from "./CompactStats";
import { surfaces } from "../theme";

const COMPANY_ROLES: Role[] = ["CEO", "CTO", "SWE", "CMO", "COO"];
const ALL_ROLES: Role[] = [...COMPANY_ROLES, "INV"];

const ROLE_META: Record<Role, { title: string; sub: string }> = {
  CEO: { title: "CEO", sub: "The Visionary" },
  CTO: { title: "CTO", sub: "The Architect" },
  SWE: { title: "Lead SWE", sub: "The Executioner" },
  CMO: { title: "CMO", sub: "The Hype Engine" },
  COO: { title: "COO", sub: "The Operator" },
  INV: { title: "Lead Investor", sub: "The Bankroll" },
};

type Reveal =
  | { kind: "company"; company: string; era: string; cards: CardDTO[] }
  | { kind: "investors"; cards: CardDTO[] }
  | null;

// Sort options for the reveal list, per reveal kind. "default" keeps roll order.
const PERSON_SORTS: [string, string][] = [
  ["default", "Draft order"],
  ["vision", "Vision"],
  ["marketing", "Marketing"],
  ["tech", "Tech"],
  ["monetization", "Monetization"],
  ["deception", "Deception"],
  ["ego", "Ego"],
  ["name", "Name"],
];
const INVESTOR_SORTS: [string, string][] = [
  ["default", "Draft order"],
  ["money", "Money"],
  ["ego", "Ego"],
  ["name", "Name"],
];

interface Props {
  track: Track;
  industry: string;
  companies: string[];
  picks: Record<Role, CardDTO | null>;
  onPick: (role: Role, card: CardDTO) => void;
  onResolve: (picks: Picks) => void;
  resolving: boolean;
}

export default function DraftScreen({
  track,
  industry,
  companies,
  picks,
  onPick,
  onResolve,
  resolving,
}: Props) {
  const [reveal, setReveal] = useState<Reveal>(null);
  const [held, setHeld] = useState<CardDTO | null>(null); // person "in hand"
  const boardRef = useRef<HTMLDivElement>(null); // draft board (place targets)
  const [spinning, setSpinning] = useState(false);
  const [wheelLabel, setWheelLabel] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>("default");

  // Sorted view of the revealed cards. Stats sort high-to-low; name sorts A-Z.
  const sortedCards = useMemo(() => {
    if (!reveal) return [];
    const cards = [...reveal.cards];
    if (sortKey === "default") return cards;
    if (sortKey === "name") return cards.sort((a, b) => a.name.localeCompare(b.name));
    const val = (c: CardDTO): number => {
      if (sortKey === "tech") return track === "HW" ? c.stats.techHW : c.stats.techSW;
      if (sortKey === "money") return c.stats.money ?? 0;
      return (c.stats as unknown as Record<string, number>)[sortKey] ?? 0;
    };
    return cards.sort((a, b) => val(b) - val(a));
  }, [reveal, sortKey, track]);

  const complete = ALL_ROLES.every((r) => picks[r]);
  const companySlotsFull = COMPANY_ROLES.every((r) => picks[r]);
  const pending = reveal !== null; // a roll is on the table awaiting placement

  // Roll excludes everyone already drafted into a company slot (backend also
  // bars the same name across eras).
  const excludedIds = useMemo(
    () => COMPANY_ROLES.map((r) => picks[r]?.id).filter((x): x is string => !!x),
    [picks]
  );

  // Which slots can receive the held card: kind-compatible and still EMPTY.
  // Filled slots lock during the draft (rebuild via the cheat panel instead).
  // You cannot target a slot until a person is in hand.
  const compatibleRoles = (card: CardDTO): Role[] =>
    card.kind === "investor" ? ["INV"] : COMPANY_ROLES;
  const canPlaceInto = (role: Role): boolean =>
    !!held && compatibleRoles(held).includes(role) && !picks[role];

  const animateWheel = (pool: string[], finalLabel: string) =>
    new Promise<void>((resolve) => {
      const total = 13;
      let n = 0;
      const iv = setInterval(() => {
        n += 1;
        if (n >= total) {
          clearInterval(iv);
          setWheelLabel(finalLabel);
          resolve();
        } else {
          setWheelLabel(pool[Math.floor(Math.random() * pool.length)] ?? "…");
        }
      }, 65);
    });

  const spinCompany = async () => {
    setError(null);
    setSpinning(true);
    setHeld(null);
    setReveal(null);
    setSortKey("default");
    try {
      const res = await api.rollCompanySlot(excludedIds);
      const pool = companies.length ? companies : [res.company];
      await animateWheel(pool, `${res.company} · ${res.era}`);
      setReveal({ kind: "company", company: res.company, era: res.era, cards: res.roster });
    } catch (e) {
      setError((e as Error).message);
      setWheelLabel("");
    } finally {
      setSpinning(false);
    }
  };

  const dealInvestors = async () => {
    setError(null);
    setSpinning(true);
    setHeld(null);
    setReveal(null);
    setSortKey("default");
    try {
      const res = await api.rollInvestors();
      await animateWheel(res.investors.map((i) => i.name), "Your 3 investors");
      setReveal({ kind: "investors", cards: res.investors });
    } catch (e) {
      setError((e as Error).message);
      setWheelLabel("");
    } finally {
      setSpinning(false);
    }
  };

  // On narrow screens the draft board sits above the reveal list, so once a
  // player is in hand, bring the placement slots back into view automatically.
  const scrollToBoard = () =>
    boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const holdCard = (card: CardDTO) => {
    setHeld(card);
    if (window.matchMedia("(max-width: 899px)").matches) {
      // Wait a tick so the slot highlights render before we scroll to them.
      requestAnimationFrame(scrollToBoard);
    }
  };

  const placeInto = (role: Role) => {
    if (!held || !canPlaceInto(role)) return;
    onPick(role, held);
    setHeld(null);
    setReveal(null);
    setWheelLabel("");
  };

  const takePublic = () => {
    if (!complete) return;
    const p = {} as Picks;
    ALL_ROLES.forEach((r) => (p[r] = picks[r]!.id));
    onResolve(p);
  };

  const status = spinning
    ? "Spinning…"
    : held
    ? `Holding ${held.name}: click a highlighted slot`
    : pending
    ? reveal!.kind === "company"
      ? "Pick a player to draft"
      : "Pick an investor"
    : complete
    ? "Roster complete"
    : "Spin to draft your next player";

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4">Draft your founding team</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip label={`Track: ${track}`} color="primary" size="small" />
            <Chip label={`Industry: ${industry}`} color="primary" variant="outlined" size="small" />
          </Stack>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={resolving ? <CircularProgress size={18} color="inherit" /> : <PublicIcon />}
          disabled={!complete || resolving}
          onClick={takePublic}
        >
          Take it public
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
          alignItems: "start",
        }}
      >
        {/* LEFT: draft board + spin controls */}
        <Box ref={boardRef} sx={{ scrollMarginTop: 16 }}>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {ALL_ROLES.map((role) => {
              const picked = picks[role];
              const placeable = canPlaceInto(role);
              return (
                <Paper
                  key={role}
                  variant="outlined"
                  onClick={() => placeInto(role)}
                  sx={{
                    p: 1.25,
                    cursor: placeable ? "pointer" : "default",
                    borderColor: placeable ? "primary.main" : undefined,
                    boxShadow: placeable ? "0 0 0 2px #8ab4f8" : undefined,
                    bgcolor: placeable
                      ? "rgba(138,180,248,0.10)"
                      : picked
                      ? surfaces.paper
                      : "rgba(255,255,255,0.03)",
                    transition: "box-shadow .12s, background-color .12s",
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" spacing={1.25}>
                    <Box sx={{ pt: 0.25 }}>
                      {picked ? (
                        <CheckCircleIcon sx={{ color: picked.accent, fontSize: 20 }} />
                      ) : (
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            border: `2px dashed ${placeable ? "#8ab4f8" : surfaces.border}`,
                          }}
                        />
                      )}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.1 }}>
                        {ROLE_META[role].title}
                        <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
                          {" "}· {ROLE_META[role].sub}
                        </Box>
                      </Typography>
                      {picked ? (
                        <>
                          <Typography sx={{ fontSize: 12, color: "text.secondary" }} noWrap>
                            {picked.name}
                            {picked.company ? ` · ${picked.company} · ${picked.era}` : ` · ${picked.type}`}
                          </Typography>
                          <CompactStats card={picked} />
                        </>
                      ) : (
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                          {placeable ? "Click to place here" : "Empty"}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>

          {/* the wheel */}
          <Paper
            variant="outlined"
            sx={{ p: 2, textAlign: "center", bgcolor: "#0b1020", overflow: "hidden", mb: 1.5 }}
          >
            <Typography sx={{ fontSize: 11, color: "#9aa0b4", letterSpacing: 1 }}>
              {status.toUpperCase()}
            </Typography>
            <Typography
              sx={{
                fontFamily: "monospace",
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
                minHeight: 30,
                mt: 0.5,
                filter: spinning ? "blur(0.4px)" : "none",
                opacity: spinning ? 0.85 : 1,
                transition: "opacity .1s",
              }}
            >
              {wheelLabel || (complete ? "🏁" : "· · ·")}
            </Typography>
          </Paper>

          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              variant="contained"
              startIcon={spinning ? <CircularProgress size={16} color="inherit" /> : <CasinoIcon />}
              disabled={spinning || pending || companySlotsFull}
              onClick={spinCompany}
            >
              Spin a company
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<PaidIcon />}
              disabled={spinning || pending || !!picks.INV}
              onClick={dealInvestors}
            >
              Deal investors
            </Button>
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 1, textAlign: "center" }}>
            {pending
              ? "Draft a player from the reveal, then click a slot to place them."
              : "One roll per pick. Choose from what you're dealt."}
          </Typography>
        </Box>

        {/* RIGHT: reveal panel, scrollable, one player per row */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, minHeight: 40 }}>
            {reveal?.kind === "company" ? (
              <>
                <Typography variant="h6">{reveal.company}</Typography>
                <Chip label={reveal.era} size="small" color="primary" variant="outlined" />
                <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                  click a player to draft them
                </Typography>
              </>
            ) : reveal?.kind === "investors" ? (
              <Typography variant="h6">Choose your lead investor</Typography>
            ) : (
              <Typography variant="h6" color="text.secondary">
                {spinning ? "Spinning…" : "Spin to reveal your options"}
              </Typography>
            )}
            <Box sx={{ flex: 1 }} />
            {reveal && (
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                  displayEmpty
                  renderValue={(v) => {
                    const opts = reveal.kind === "investors" ? INVESTOR_SORTS : PERSON_SORTS;
                    const label = opts.find(([k]) => k === v)?.[1] ?? "Draft order";
                    return `Sort: ${label}`;
                  }}
                >
                  {(reveal.kind === "investors" ? INVESTOR_SORTS : PERSON_SORTS).map(([k, label]) => (
                    <MenuItem key={k} value={k}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>

          {!reveal && !spinning && (
            <Paper
              variant="outlined"
              sx={{ p: 5, textAlign: "center", color: "text.secondary", borderStyle: "dashed" }}
            >
              {complete
                ? "Your roster is set. Take it public!"
                : "Spin a company (or deal investors) to draw a random pool, click one to hold them, then click a slot on the left to place them."}
            </Paper>
          )}

          {reveal && (
            <Box
              sx={{
                maxHeight: { xs: "none", md: "72vh" },
                overflowY: { xs: "visible", md: "auto" },
                pr: { md: 1 },
              }}
            >
              <Stack spacing={1.5}>
                {sortedCards.map((c) => (
                  <PlayerCard
                    key={c.id}
                    card={c}
                    track={track}
                    selected={held?.id === c.id}
                    onSelect={holdCard}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Box>

      {/* Mobile-only sticky helper: on narrow screens the placement slots
          scroll off-screen, so surface the held player + a jump-to-slots CTA. */}
      {held && (
        <Paper
          elevation={8}
          sx={{
            display: { xs: "flex", md: "none" },
            position: "fixed",
            left: 12,
            right: 12,
            bottom: 12,
            zIndex: 1300,
            p: 1.25,
            alignItems: "center",
            gap: 1.25,
            borderRadius: 3,
            border: `1px solid ${held.accent}`,
          }}
        >
          <Box sx={{ width: 10, height: 36, borderRadius: 1, bgcolor: held.accent, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.1 }}>
              Holding
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>
              {held.name}
            </Typography>
          </Box>
          <Button variant="contained" size="small" onClick={scrollToBoard}>
            Place →
          </Button>
        </Paper>
      )}
    </Container>
  );
}
