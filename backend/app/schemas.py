"""Pydantic request/response models for the HTTP/JSON API.

These are the documented contract between the (separately deployed) frontend
and backend. No game logic lives here, only shapes + card DTO construction.
"""
from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from .data import Investor, Person

# --------------------------------------------------------------------------
# Card DTO
# --------------------------------------------------------------------------


class CardStats(BaseModel):
    vision: float
    marketing: float
    techHW: float
    techSW: float
    deception: float
    ego: float
    monetization: float
    money: Optional[float] = None


class CardDTO(BaseModel):
    id: str
    name: str
    kind: str  # "person" | "investor"
    company: Optional[str] = None
    era: Optional[str] = None
    specialty: Optional[str] = None
    type: Optional[str] = None  # investor: "Individual" | "Entity"
    wikipedia: Optional[str] = None
    github: Optional[str] = None
    stats: CardStats
    accent: str
    alreadyWealthy: bool = False


def person_card(p: Person) -> CardDTO:
    return CardDTO(
        id=p.id,
        name=p.name,
        kind="person",
        company=p.company,
        era=p.era,
        specialty=p.specialty,
        wikipedia=p.wikipedia,
        github=p.github,
        stats=CardStats(
            vision=p.vision,
            marketing=p.marketing,
            techHW=p.tech_hw,
            techSW=p.tech_sw,
            deception=p.deception,
            ego=p.ego,
            monetization=p.monetization,
            money=p.wealth_money,
        ),
        accent=p.accent,
        alreadyWealthy=p.is_already_wealthy,
    )


def investor_card(i: Investor) -> CardDTO:
    return CardDTO(
        id=i.id,
        name=i.name,
        kind="investor",
        era=i.primary_era,
        type=i.type,
        wikipedia=i.wikipedia,
        stats=CardStats(
            vision=0, marketing=0, techHW=0, techSW=0,
            deception=0, ego=i.ego, monetization=0, money=i.money,
        ),
        accent=i.accent,
    )


# --------------------------------------------------------------------------
# Meta
# --------------------------------------------------------------------------


class EndingTier(BaseModel):
    id: str
    label: str
    emoji: str
    category: str  # "victory" | "gameover"
    min_valuation_b: Optional[float] = None
    max_valuation_b: Optional[float] = None
    note: str


class MetaResponse(BaseModel):
    tracks: List[str]
    industries: List[str]  # all specialties (reference)
    industries_by_track: Dict[str, List[str]]  # selectable industries per track
    roles: List[str]
    companies: List[str]
    ending_tiers: List[EndingTier]
    cheats_enabled: bool


# --------------------------------------------------------------------------
# Roll endpoints
# --------------------------------------------------------------------------


class RollCompanyRequest(BaseModel):
    excluded_people: List[str] = Field(default_factory=list)


class RollCompanyResponse(BaseModel):
    company: str
    era: str
    roster: List[CardDTO]


class RollInvestorsResponse(BaseModel):
    investors: List[CardDTO]


# --------------------------------------------------------------------------
# Resolve
# --------------------------------------------------------------------------


class Picks(BaseModel):
    CEO: str
    CTO: str
    SWE: str
    CMO: str
    COO: str
    INV: str


class ResolveRequest(BaseModel):
    track: str
    industry: str
    picks: Picks
    # Honored ONLY in cheats mode (CHEATS_ENABLED). Ignored otherwise.
    config_override: Optional[Dict] = None


class TeamStats(BaseModel):
    vision: float
    marketing: float
    tech: float
    deception: float
    monetization: float
    ego: float
    money: float
    potential: float


class DeathCheck(BaseModel):
    id: str
    label: str
    detail: str


class ResolveResponse(BaseModel):
    track: str
    industry: str
    team_stats: TeamStats
    death_check: Optional[DeathCheck] = None
    cashout: bool
    valuation_b: float
    ending_id: str
    ending_label: str
    ending_emoji: str
    ending_category: str
    blurb: str
    cards: List[CardDTO]
