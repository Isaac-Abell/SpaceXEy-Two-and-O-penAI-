"""Orchestration layer: ties data + settings + pure resolver to the API schemas.

Kept separate from main.py so both the normal router and the cheats router can
reuse the resolution flow without circular imports.
"""
from __future__ import annotations

from typing import Dict

from fastapi import HTTPException

from .config import Settings
from .data import COMPANY_ROLES, GameData, TRACKS
from .endings import ENDINGS, get_ending
from .resolver import resolve
from .schemas import (
    DeathCheck,
    EndingTier,
    MetaResponse,
    Picks,
    ResolveRequest,
    ResolveResponse,
    TeamStats,
    investor_card,
    person_card,
)

_ROLES = ["CEO", "CTO", "SWE", "CMO", "COO", "INV"]

# Human labels for the death checks (the ending copy lives in endings.py).
_DEATH_LABELS = {
    "vaporware": "Vaporware Check (Fraud)",
    "overhyped": "Overhyped Check",
    "bankruptcy": "Burn Check (Bankruptcy)",
    "implosion": "Chemistry Check (Implosion)",
    "masayoshi": "Masayoshi's Pet Project",
}


def build_meta(data: GameData, settings: Settings, cheats_on: bool) -> MetaResponse:
    tiers = [
        EndingTier(
            id=e.id,
            label=e.label,
            emoji=e.emoji,
            category=e.category,
            min_valuation_b=e.min_valuation_b,
            max_valuation_b=e.max_valuation_b,
            note=e.note,
        )
        for e in ENDINGS
    ]
    return MetaResponse(
        tracks=list(TRACKS),
        industries=list(data.specialties),
        industries_by_track={t: list(settings.track_industries.get(t, [])) for t in TRACKS},
        roles=list(_ROLES),
        companies=list(data.companies),
        ending_tiers=tiers,
        cheats_enabled=cheats_on,
    )


def _lookup_picks(data: GameData, picks: Picks) -> Dict[str, object]:
    objs: Dict[str, object] = {}
    for role in COMPANY_ROLES:
        pid = getattr(picks, role)
        try:
            objs[role] = data.person(pid)
        except KeyError:
            raise HTTPException(status_code=400, detail=f"unknown person id for {role}: {pid}")
    try:
        objs["INV"] = data.investor(picks.INV)
    except KeyError:
        raise HTTPException(status_code=400, detail=f"unknown investor id for INV: {picks.INV}")

    # Legal-roster guard: the same real person can't fill two slots.
    names = [objs[r].name for r in COMPANY_ROLES]  # type: ignore[union-attr]
    if len(set(names)) != len(names):
        raise HTTPException(status_code=400, detail="the same person cannot fill two company slots")
    return objs


def do_resolve(
    data: GameData,
    base_settings: Settings,
    req: ResolveRequest,
    cheats_on: bool,
) -> ResolveResponse:
    if req.track not in TRACKS:
        raise HTTPException(status_code=400, detail=f"unknown track: {req.track}")

    settings = base_settings
    # --- CHEATS START ---
    # config_override is honored ONLY when cheats mode is enabled. When the flag
    # is off this whole block is dead: settings stays the immutable base.
    if cheats_on and req.config_override:
        settings = base_settings.merged_with(req.config_override)
    # --- CHEATS END ---

    allowed = settings.track_industries.get(req.track, [])
    if req.industry not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"industry {req.industry!r} is not selectable on track {req.track} (allowed: {allowed})",
        )

    picks_objs = _lookup_picks(data, req.picks)
    result = resolve(req.track, req.industry, picks_objs, settings)
    ending = get_ending(result.ending_id)

    death = None
    if result.death_check_id is not None:
        death = DeathCheck(
            id=result.death_check_id,
            label=_DEATH_LABELS.get(result.death_check_id, result.death_check_id),
            detail=ending.note,
        )

    cards = [person_card(picks_objs[r]) for r in COMPANY_ROLES]  # type: ignore[arg-type]
    cards.append(investor_card(picks_objs["INV"]))  # type: ignore[arg-type]

    return ResolveResponse(
        track=result.track,
        industry=result.industry,
        team_stats=TeamStats(
            vision=round(result.vision, 4),
            marketing=round(result.marketing, 4),
            tech=round(result.tech, 4),
            deception=round(result.deception, 4),
            monetization=round(result.monetization, 4),
            ego=round(result.ego, 4),
            money=round(result.money, 4),
            potential=round(result.potential, 4),
        ),
        death_check=death,
        cashout=result.cashout,
        valuation_b=round(result.valuation_b, 6),
        ending_id=ending.id,
        ending_label=ending.label,
        ending_emoji=ending.emoji,
        ending_category=ending.category,
        blurb=ending.blurb,
        cards=cards,
    )
