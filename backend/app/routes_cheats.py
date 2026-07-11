"""Cheats-only endpoints. This entire file is mounted ONLY when CHEATS_ENABLED.

To remove cheats mode from the backend: delete this file and the marked
`# --- CHEATS START ---` / `# --- CHEATS END ---` block in main.py. Nothing
else references it. The normal /api/resolve already ignores config_override
unless the flag is on.
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from .config import Settings
from .data import GameData
from .schemas import CardDTO, investor_card, person_card


class CheatPickRequest(BaseModel):
    # Direct slot assignment, bypassing rolls. Only the no-same-person rule is
    # enforced, so legal rosters can still be built by hand.
    role: str
    id: str
    current_person_ids: List[str] = []  # ids already assigned to OTHER slots


class CheatPickResponse(BaseModel):
    role: str
    card: CardDTO


def make_cheats_router(data: GameData, settings: Settings) -> APIRouter:
    router = APIRouter(prefix="/api/cheats", tags=["cheats"])

    @router.get("/status")
    def status() -> dict:
        return {"cheats": True}

    @router.get("/people", response_model=List[CardDTO])
    def all_people(
        q: Optional[str] = Query(default=None),
        company: Optional[str] = Query(default=None),
    ) -> List[CardDTO]:
        src = data.people_for_company(company) if company else data.people
        if q:
            needle = q.lower()
            src = [p for p in src if needle in p.name.lower() or needle in p.company.lower()]
        return [person_card(p) for p in src]

    @router.get("/investors", response_model=List[CardDTO])
    def all_investors(q: Optional[str] = Query(default=None)) -> List[CardDTO]:
        src = data.investors
        if q:
            needle = q.lower()
            src = [i for i in src if needle in i.name.lower()]
        return [investor_card(i) for i in src]

    @router.post("/pick", response_model=CheatPickResponse)
    def pick(req: CheatPickRequest) -> CheatPickResponse:
        if req.role == "INV":
            try:
                inv = data.investor(req.id)
            except KeyError:
                raise HTTPException(status_code=404, detail=f"unknown investor id: {req.id}")
            return CheatPickResponse(role=req.role, card=investor_card(inv))

        try:
            person = data.person(req.id)
        except KeyError:
            raise HTTPException(status_code=404, detail=f"unknown person id: {req.id}")

        # Respect only the no-same-person rule against other assigned slots.
        other_names = set()
        for pid in req.current_person_ids:
            try:
                other_names.add(data.person(pid).name)
            except KeyError:
                continue
        if person.name in other_names:
            raise HTTPException(
                status_code=409,
                detail=f"{person.name} is already assigned to another slot",
            )
        return CheatPickResponse(role=req.role, card=person_card(person))

    return router
