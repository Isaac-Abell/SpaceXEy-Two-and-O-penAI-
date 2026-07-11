"""FastAPI app + routes (thin). All game logic lives in resolver/draft/service.

Frontend and backend communicate only over this documented HTTP/JSON API.
"""
from __future__ import annotations

import os
from typing import List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import cheats_enabled, load_dotenv_if_present, load_settings
from .data import load_game_data

# Pick up backend/.env for local runs (Docker/compose set env directly instead).
load_dotenv_if_present()
from . import draft as draft_mod
from .schemas import (
    CardDTO,
    MetaResponse,
    ResolveRequest,
    ResolveResponse,
    RollCompanyRequest,
    RollCompanyResponse,
    RollInvestorsResponse,
    investor_card,
    person_card,
)
from .service import build_meta, do_resolve

# ---- startup: load config + data once into memory ------------------------
SETTINGS = load_settings()
DATA = load_game_data()
CHEATS_ON = cheats_enabled()

app = FastAPI(
    title="SpaceXEY: Two and O(penAI), API",
    version="1.0.0",
    description="Founder-drafting roguelike. All game logic + tunables live here.",
)

# CORS for local dev (frontend on a different origin/port). Override via env.
_origins = os.environ.get(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()] or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
# Core routes
# --------------------------------------------------------------------------


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/config")
def get_config() -> dict:
    """Expose the current tunables (design-time visibility / cheats panel seed)."""
    return SETTINGS.as_dict()


@app.get("/api/meta", response_model=MetaResponse)
def meta() -> MetaResponse:
    return build_meta(DATA, SETTINGS, CHEATS_ON)


@app.get("/api/people", response_model=List[CardDTO])
def people(company: str | None = Query(default=None)) -> List[CardDTO]:
    src = DATA.people_for_company(company) if company else DATA.people
    return [person_card(p) for p in src]


@app.get("/api/companies", response_model=List[str])
def companies() -> List[str]:
    return list(DATA.companies)


@app.get("/api/investors", response_model=List[CardDTO])
def investors() -> List[CardDTO]:
    return [investor_card(i) for i in DATA.investors]


@app.post("/api/roll/company-slot", response_model=RollCompanyResponse)
def roll_company_slot(req: RollCompanyRequest) -> RollCompanyResponse:
    try:
        company, era, roster = draft_mod.roll_company_slot(DATA, req.excluded_people)
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return RollCompanyResponse(company=company, era=era, roster=[person_card(p) for p in roster])


@app.post("/api/roll/investors", response_model=RollInvestorsResponse)
def roll_investors() -> RollInvestorsResponse:
    dealt = draft_mod.deal_investors(DATA, count=3)
    return RollInvestorsResponse(investors=[investor_card(i) for i in dealt])


@app.post("/api/resolve", response_model=ResolveResponse)
def resolve_run(req: ResolveRequest) -> ResolveResponse:
    return do_resolve(DATA, SETTINGS, req, CHEATS_ON)


# --------------------------------------------------------------------------
# Cheats router, mounted ONLY when CHEATS_ENABLED. Delete routes_cheats.py
# and this block to remove cheats entirely (see README).
# --------------------------------------------------------------------------
# --- CHEATS START ---
if CHEATS_ON:
    from .routes_cheats import make_cheats_router

    app.include_router(make_cheats_router(DATA, SETTINGS))
# --- CHEATS END ---
