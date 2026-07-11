"""Draft mechanics: roll companies and deal investors.

The roll functions are the only place RNG lives in the whole backend.
"""
from __future__ import annotations

import random
from typing import Iterable, List, Optional, Tuple

from .data import GameData, Investor, Person


# --------------------------------------------------------------------------
# Rolls
# --------------------------------------------------------------------------


def _excluded_names(data: GameData, excluded_ids: Iterable[str]) -> set:
    """Expand drafted person ids into the set of their Names.

    Enforces "the same real person can't be drafted twice, and can't appear as
    two different eras", a name once drafted is barred under any (Company, Era).
    """
    names: set = set()
    for pid in excluded_ids:
        try:
            names.add(data.person(pid).name)
        except KeyError:
            continue
    return names


def selectable_roster(
    data: GameData, company: str, era: str, excluded_ids: Iterable[str]
) -> List[Person]:
    barred = _excluded_names(data, excluded_ids)
    return [p for p in data.people_for_company_era(company, era) if p.name not in barred]


def roll_company_slot(
    data: GameData,
    excluded_ids: Iterable[str],
    rng: Optional[random.Random] = None,
) -> Tuple[str, str, List[Person]]:
    """Roll a random (company, era) group that has >=1 selectable person.

    The unit is a (company, era) group, so "2010s Tesla" and "2000s Tesla" are
    separate rolls. Uniform over groups => companies spanning more eras are more
    likely, small single-era companies less likely.

    Returns (company, era, selectable_roster). Raises if the pool is exhausted.
    """
    rng = rng or random
    excluded_ids = list(excluded_ids)
    groups = list(data.company_era_groups)
    rng.shuffle(groups)
    for company, era in groups:
        roster = selectable_roster(data, company, era, excluded_ids)
        if roster:
            return company, era, roster
    raise RuntimeError("no (company, era) group has any selectable people left")


def deal_investors(
    data: GameData, count: int = 3, rng: Optional[random.Random] = None
) -> List[Investor]:
    rng = rng or random
    count = min(count, len(data.investors))
    return rng.sample(data.investors, count)
