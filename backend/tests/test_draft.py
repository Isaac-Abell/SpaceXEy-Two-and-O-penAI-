"""Tests for the draft rolls — the draftable unit is a (company, era) group."""
from __future__ import annotations

import random

from app.data import load_game_data
from app.draft import roll_company_slot

DATA = load_game_data()


def test_roll_returns_single_company_era_group():
    for seed in range(25):
        company, era, roster = roll_company_slot(DATA, [], rng=random.Random(seed))
        assert roster, "roster should never be empty"
        # Every person in the roster shares the rolled company AND era.
        assert all(p.company == company and p.era == era for p in roster)


def test_roll_excludes_drafted_names_across_eras():
    # Draft the first person; that NAME must never reappear in later rolls
    # (no same person twice, no two eras of the same person).
    drafted = DATA.people[0]
    for seed in range(60):
        _, _, roster = roll_company_slot(DATA, [drafted.id], rng=random.Random(seed))
        assert all(p.name != drafted.name for p in roster)


def test_multi_era_companies_weight_larger_companies():
    # Companies spanning multiple eras produce multiple draftable groups, so
    # there are strictly more (company, era) groups than distinct companies.
    apple_groups = [g for g in DATA.company_era_groups if g[0] == "Apple"]
    assert len(apple_groups) >= 3
    assert len(DATA.company_era_groups) > len(DATA.companies)
