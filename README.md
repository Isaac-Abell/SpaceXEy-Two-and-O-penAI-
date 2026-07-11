# SpaceXEY: Two and O(penAI)

A founder-drafting roguelike. Spin a company, draft a legend, take it public — or take it
down. Commit to a Technical Track + Industry, draft a six-person team (5 company roles + 1
VC), and the backend resolves your run into an IPO valuation and an ending screen.
Objective: a **$1 Trillion IPO**.

All game logic and rules come **only** from
[`spacexey_two_and_oh_design_spec.md`](spacexey_two_and_oh_design_spec.md).

---

## Removing cheats mode

Cheats mode is gated by a single flag per side (`VITE_CHEATS` / `CHEATS_ENABLED`) and is
completely inert when off. To physically remove it, delete these and the app still builds
and plays normally:

1. **Frontend folder:** delete `frontend/src/cheats/`.
2. **Frontend mount:** in `frontend/src/App.tsx`, delete the two marked blocks
   (`// --- CHEATS START ---` … `// --- CHEATS END ---`) — one is the `import CheatPanel`,
   the other is the `{CHEATS && <CheatPanel .../>}` mount. You can also drop the
   `configOverride` state and the `CHEATS ? configOverride : null` argument, but leaving them
   is harmless.
3. **Backend file:** delete `backend/app/routes_cheats.py`.
4. **Backend mount:** in `backend/app/main.py`, delete the marked
   `# --- CHEATS START ---` … `# --- CHEATS END ---` block (the conditional
   `include_router`).
5. **Backend override honoring:** in `backend/app/service.py`, delete the marked
   `# --- CHEATS START ---` … `# --- CHEATS END ---` block inside `do_resolve` (the
   `config_override` merge). Normal `/api/resolve` already ignores `config_override`.

That's it — no cheats logic lives anywhere else.

---

## Architecture

Two **fully separated** halves that communicate only over a documented HTTP/JSON API, so
they deploy independently (e.g. static frontend on a CDN, backend on a container host).

```
backend/    Python 3.11 · FastAPI · Pydantic · Uvicorn
            Pure-function resolver. ALL game logic + every tunable number.
            No database — CSVs are loaded into memory at startup.

frontend/   React · Vite · TypeScript · MUI (Material)
            No game logic, no thresholds. Talks to the backend through the
            single typed client in src/api.ts. Backend URL from VITE_API_BASE.
```

- **No game logic in the frontend.** It only maps `ending_id` → a visual treatment; every
  threshold, formula, blurb and valuation come from the backend.
- **All tunables live in [`backend/config.yaml`](backend/config.yaml)** — adjust between
  plays without touching logic. Also served at `GET /config`.

---

## Run it

### Option A — Docker (both services)

```bash
docker-compose up --build
```

- Frontend: <http://localhost:3000>
- Backend:  <http://localhost:8000>  (docs at `/docs`)

### Option B — each half independently

**Backend**

```bash
cd backend
python -m venv .venv
# Windows PowerShell:  .\.venv\Scripts\Activate.ps1
# macOS/Linux:         source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
cp .env.example .env        # sets VITE_API_BASE=http://localhost:8000
npm run dev                 # http://localhost:5173
```

CORS is preconfigured for `localhost:5173` (dev) and `localhost:3000` (docker). Override with
the backend `CORS_ORIGINS` env var.

---

## The tuning workflow

Every calibrated constant from the design spec lives in
[`backend/config.yaml`](backend/config.yaml) — valuation exponent, death-check thresholds,
the death-check ratio cutoffs, the role weight tables, etc. Two ways to tune:

1. **Edit `config.yaml`** and restart the backend. `resolver.py` reads every number from the
   loaded `Settings` object; nothing is hardcoded.
2. **Use the cheats panel** (when enabled): sliders/inputs for every value are sent as a
   per-request `config_override` so you see the effect on the next resolve **without
   restarting**. "Reset to defaults" and "Copy as YAML" let you paste good values back into
   `config.yaml`.

Re-run the tests after tuning: `cd backend && pytest`.

---

## Cheats mode (optional)

Enable on **both** sides:

- Backend: `CHEATS_ENABLED=true`
- Frontend: `VITE_CHEATS=true`

Then a "CHEATS ON" badge appears and a tools FAB opens the panel, which lets you:

- **Hand-pick any person/VC into any slot** (searchable), bypassing the rolls — only the
  no-same-person rule is enforced so you can still build legal rosters.
- **Live-tune every config value** and see the effect instantly via `config_override`.

When the flags are off, none of this renders or runs, and `/api/resolve` ignores any
`config_override` sent to it.

---

## API (versioned under `/api`)

| Method & path | Body | Returns |
|---|---|---|
| `GET /api/health` | — | `{status:"ok"}` |
| `GET /api/meta` | — | tracks, industries, **industries_by_track**, roles, companies, ending-tier defs, cheats flag |
| `GET /api/people?company=` | — | all people as card DTOs (optional company filter) |
| `GET /api/companies` | — | distinct company names |
| `GET /api/investors` | — | all investors as card DTOs |
| `POST /api/roll/company-slot` | `{excluded_people:[id]}` | one random **(company, era)** group + its selectable roster |
| `POST /api/roll/investors` | `{}` | **3** random investors |
| `POST /api/resolve` | `{track, industry, picks:{CEO,CTO,SWE,CMO,COO,INV}, config_override?}` | full resolution (team stats, death check, valuation, `ending_id` + blurb) |
| `GET /config` | — | current tunables |
| `POST /api/cheats/pick` *(cheats only)* | `{role, id, current_person_ids}` | validated card for direct slot assignment |
| `GET /api/cheats/people?q=` · `GET /api/cheats/investors?q=` *(cheats only)* | — | searchable pickers |

**Card DTO** (people and VCs):

```jsonc
{ "id", "name", "kind": "person|investor", "company?", "era?", "specialty?", "type?",
  "wikipedia?", "stats": { "vision","marketing","techHW","techSW","deception","ego",
  "monetization","money?" }, "accent": "#RRGGBB", "alreadyWealthy" }
```

Cards are colored by a meaningful attribute — **Specialty** for people (Chips/Infra/B2B/
B2C/Computers/Deep Tech each get a hue) and **Entity vs Individual** for investors. The
`accent` is computed server-side so it's consistent everywhere.

Every resolution includes a machine-readable `ending_id` (one of `perfect_season,
generational, blockbuster, unicorn, kiddie_pool, anti_founder, vaporware, overhyped,
bankruptcy, implosion, masayoshi, sold_too_early`) plus the human blurb, so the frontend
maps id → screen and never re-implements threshold logic.

---

## Tests

```bash
cd backend && pytest
```

The suite pins every formula: the ratio-based death checks (fraud, overhype, burn, implosion,
masayoshi) and the "score all, worst failure wins" selection, ×1.05 synergy on tech only,
entity-vs-individual ego redistribution, deterministic valuation, cash-out
cap, high-tech fraud protection, the anti-founder ending, and one golden end-to-end case per
victory tier.

---

## Data

- `backend/data/ratings.csv` — people: `Name, Wikipedia Link, Company, Era, Vision,
  Marketing, Tech (HW), Tech (SW), Specialty, Deception, Ego, Monetization`. Unique by
  `(Name, Company, Era)`.
- `backend/data/investors.csv` — VCs: `Entity / Person, Type, Primary Era, Money, Ego,
  Wikipedia Link`.

"Already Wealthy" CEOs are people whose name also appears in the investor list; their
personal `Money` is looked up from there and added on top of the lead investor's capital.

**Two draft rules layered on top of the spec:**

- **Track-gated industries.** You choose a track (HW/SW) first, and only that track's
  industries become selectable — `SW → Infra/B2B/B2C`, `HW → Chips/Computers/Deep Tech`. The
  mapping lives in `config.yaml` under `track_industries` (tunable) and is served via
  `industries_by_track` in `/api/meta`.
- **Draft by (company, era).** The spin's unit is a `(company, era)` group, so "2010s Tesla"
  and "2000s Tesla" are separate draws. Rolling uniformly over groups means companies that
  span more eras come up more often, and small single-era companies less often.
