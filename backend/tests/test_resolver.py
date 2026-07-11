"""Unit tests pinning every formula + death-check order to the design spec.

The resolver is pure, so we construct synthetic Person/Investor objects directly
and assert exact numbers. Uniform teams make team stats trivially predictable:
with five identical company members, each team stat = value * Σ(role weights).
Every stat row sums to 1.0, so a uniform team's team stat equals the member value.
Ego is the exception: the individual-investor row puts 0.88 on the company and
0.12 on the investor; the entity row puts the full 1.0 on the company.
"""
from __future__ import annotations

import pytest

from app.config import load_settings
from app.data import Person, Investor, load_game_data
from app.resolver import resolve, tech_value
from app.endings import ENDINGS_BY_ID

SETTINGS = load_settings()

_counter = 0


def mk_person(**kw) -> Person:
    global _counter
    _counter += 1
    base = dict(
        name=kw.pop("name", f"P{_counter}"),
        wikipedia=None,
        company=kw.pop("company", "Acme"),
        era=kw.pop("era", "2010s"),
        vision=0.0, marketing=0.0, tech_hw=0.0, tech_sw=0.0,
        specialty="Infra", deception=0.0, ego=0.0, monetization=0.0,
        wealth_money=None,
    )
    base.update(kw)
    return Person(**base)


def mk_inv(money=50.0, ego=50.0, type_="Individual") -> Investor:
    return Investor(
        name=f"Inv-{type_}-{money}-{ego}", type=type_, primary_era="2010s",
        money=money, ego=ego, wikipedia=None,
    )


def uniform_team(vision, marketing, tech, deception, monetization, ego,
                 *, era="2010s", specialty="Infra", inv=None, ceo_wealth=None):
    """Five identical company members whose team stats equal the targets.

    Every stat row sums to 1.0, so a uniform member value passes straight through
    to the team stat (no scaling needed). tech is placed in tech_sw (tests use the
    SW track); no synergy unless the chosen industry equals `specialty`.
    """
    def member(role):
        return mk_person(
            name=f"{role}", era=era, specialty=specialty,
            vision=vision, marketing=marketing, tech_sw=tech,
            deception=deception, ego=ego, monetization=monetization,
            wealth_money=ceo_wealth if role == "CEO" else None,
        )
    picks = {r: member(r) for r in ["CEO", "CTO", "SWE", "CMO", "COO"]}
    picks["INV"] = inv if inv is not None else mk_inv(money=50, ego=ego)
    return picks


# --------------------------------------------------------------------------
# Step 0 — synergy applies to Tech ONLY
# --------------------------------------------------------------------------


def test_synergy_applies_to_tech_only():
    picks_no = uniform_team(60, 40, 50, 10, 50, 60, specialty="Infra")
    picks_yes = uniform_team(60, 40, 50, 10, 50, 60, specialty="Infra")
    r_no = resolve("SW", "B2B", picks_no, SETTINGS)     # specialty != industry
    r_yes = resolve("SW", "Infra", picks_yes, SETTINGS)  # specialty == industry
    assert r_yes.tech == pytest.approx(r_no.tech * 1.05)
    assert r_yes.vision == pytest.approx(r_no.vision)       # untouched
    assert r_yes.marketing == pytest.approx(r_no.marketing)  # untouched


def test_tech_value_uses_track():
    p = mk_person(tech_hw=80, tech_sw=20, specialty="Infra")
    assert tech_value(p, "HW", "B2B", SETTINGS) == 80
    assert tech_value(p, "SW", "B2B", SETTINGS) == 20
    assert tech_value(p, "SW", "Infra", SETTINGS) == pytest.approx(20 * 1.05)


# --------------------------------------------------------------------------
# Step 1 — weighted team stats & ego redistribution
# --------------------------------------------------------------------------


def test_uniform_team_stats_match_weight_sums():
    picks = uniform_team(70, 50, 60, 20, 40, 55, inv=mk_inv(money=50, ego=55))
    r = resolve("SW", "B2B", picks, SETTINGS)
    assert r.vision == pytest.approx(70)
    assert r.marketing == pytest.approx(50)
    assert r.tech == pytest.approx(60)
    assert r.deception == pytest.approx(20)
    assert r.monetization == pytest.approx(40)
    assert r.ego == pytest.approx(55)
    assert r.potential == pytest.approx((70 + 50 + 60 + 40) / 4)


def test_entity_vs_individual_ego_redistribution():
    # Company members ego=50, investor ego=0.
    ind = mk_inv(money=50, ego=0, type_="Individual")
    ent = mk_inv(money=50, ego=0, type_="Entity")
    picks_ind = uniform_team(60, 40, 60, 10, 50, 50, inv=ind)
    picks_ent = uniform_team(60, 40, 60, 10, 50, 50, inv=ent)
    r_ind = resolve("SW", "B2B", picks_ind, SETTINGS)
    r_ent = resolve("SW", "B2B", picks_ent, SETTINGS)
    # Individual: 0.88*50 + 0.12*0 = 44. Entity redistributes -> 1.0*50 = 50.
    assert r_ind.ego == pytest.approx(44)
    assert r_ent.ego == pytest.approx(50)


def test_already_wealthy_ceo_adds_money():
    inv = mk_inv(money=30, ego=50)
    picks = uniform_team(60, 40, 60, 10, 50, 50, inv=inv, ceo_wealth=99)
    r = resolve("SW", "B2B", picks, SETTINGS)
    assert r.money == pytest.approx(30 + 99)

    picks_poor = uniform_team(60, 40, 60, 10, 50, 50, inv=inv, ceo_wealth=None)
    r2 = resolve("SW", "B2B", picks_poor, SETTINGS)
    assert r2.money == pytest.approx(30)


# --------------------------------------------------------------------------
# Step 2 — ratio-based death checks. Every check is scored; the WORST failed
#          check becomes the ending (no fixed order, no tolerance).
# --------------------------------------------------------------------------


def test_vaporware_isolation():
    # Low tech, high deception + marketing -> fraud is the worst failure.
    picks = uniform_team(60, 80, 20, 80, 50, 30, inv=mk_inv(money=50, ego=30))
    r = resolve("SW", "B2B", picks, SETTINGS)
    assert r.ending_id == "vaporware"
    assert r.valuation_b == 0


def test_overhype_isolation():
    # Marketing outruns tech but deception is low -> overhyped, not fraud.
    picks = uniform_team(60, 70, 40, 5, 50, 30, inv=mk_inv(money=50, ego=30))
    r = resolve("SW", "B2B", picks, SETTINGS)
    assert r.ending_id == "overhyped"


def test_bankruptcy_isolation():
    picks = uniform_team(40, 20, 40, 5, 5, 75, inv=mk_inv(money=5, ego=75))
    r = resolve("SW", "B2B", picks, SETTINGS)
    assert r.ending_id == "bankruptcy"


def test_implosion_isolation():
    # Ego (88) above the base, project quality (~46) below it -> implodes.
    picks = uniform_team(50, 40, 50, 10, 50, 88, inv=mk_inv(money=40, ego=88))
    r = resolve("SW", "B2B", picks, SETTINGS)
    assert r.ending_id == "implosion"


def test_implosion_depends_on_quality_vs_ego():
    # Same ego (86); a great project (avg > 86) survives, a mediocre one implodes.
    great = uniform_team(95, 90, 95, 10, 95, 86, inv=mk_inv(money=90, ego=86))
    mediocre = uniform_team(45, 40, 45, 10, 40, 86, inv=mk_inv(money=30, ego=86))
    assert resolve("SW", "B2B", great, SETTINGS).death_check_id is None
    assert resolve("SW", "B2B", mediocre, SETTINGS).ending_id == "implosion"


def test_max_ego_survives_only_with_near_perfect_stats():
    # Ego 90 clears implosion ONLY when the stat average (money capped 100)
    # exceeds it — otherwise even a strong roster implodes.
    elite = uniform_team(99, 95, 99, 10, 99, 90, inv=mk_inv(money=99, ego=90))
    assert resolve("SW", "B2B", elite, SETTINGS).death_check_id is None
    good = uniform_team(85, 80, 85, 10, 85, 90, inv=mk_inv(money=85, ego=90))
    assert resolve("SW", "B2B", good, SETTINGS).ending_id == "implosion"


def test_low_ego_never_implodes_regardless_of_quality():
    # Ego 79 is below the base ceiling, so it never implodes even on a weak team.
    picks = uniform_team(40, 35, 45, 10, 60, 79, inv=mk_inv(money=50, ego=79))
    assert resolve("SW", "B2B", picks, SETTINGS).death_check_id is None


def test_masayoshi_isolation():
    # Money + hype, monetization below the floor -> pet project.
    picks = uniform_team(70, 70, 90, 10, 50, 50, inv=mk_inv(money=90, ego=50))
    r = resolve("SW", "B2B", picks, SETTINGS)
    assert r.ending_id == "masayoshi"


def test_worst_failure_wins_not_first():
    # Fails BOTH fraud (marginally) and implosion (worse) -> implosion shown,
    # proving all checks are scored and the worst wins (no fixed ordering).
    picks = uniform_team(60, 60, 50, 50, 80, 95, inv=mk_inv(money=50, ego=95))
    r = resolve("SW", "B2B", picks, SETTINGS)
    # sanity: both would fire
    assert (50 + 60) > SETTINGS.vaporware_ratio * 50          # vaporware fails
    assert 95 > SETTINGS.ego_implosion_ceiling                # implosion fails
    assert r.ending_id == "implosion"                          # implosion is worse


def test_blatant_fraud_beats_everything():
    # A Theranos-shaped team fails several checks; fraud is by far the worst.
    picks = uniform_team(50, 90, 10, 90, 10, 90, inv=mk_inv(money=90, ego=90))
    r = resolve("SW", "B2B", picks, SETTINGS)
    assert r.ending_id == "vaporware"


def test_high_tech_protected_from_vaporware():
    # 90 tech only fraud-busts when deception + marketing approach 99/99...
    near99 = uniform_team(60, 99, 90, 99, 50, 40, inv=mk_inv(money=50, ego=40))
    assert resolve("SW", "B2B", near99, SETTINGS).ending_id == "vaporware"

    # ...a strong-but-not-max team at 90 tech survives the fraud check.
    strong = uniform_team(60, 90, 90, 80, 50, 40, inv=mk_inv(money=50, ego=40))
    assert resolve("SW", "B2B", strong, SETTINGS).death_check_id is None

    # ...and 95 tech is effectively immune even at 99/99.
    immune = uniform_team(60, 99, 95, 99, 50, 40, inv=mk_inv(money=50, ego=40))
    assert resolve("SW", "B2B", immune, SETTINGS).death_check_id != "vaporware"


def test_masayoshi_fires_last():
    picks = uniform_team(
        vision=60, marketing=72, tech=70, deception=10, monetization=50, ego=50,
        inv=mk_inv(money=90, ego=50),
    )
    r = resolve("SW", "B2B", picks, SETTINGS)
    assert r.ending_id == "masayoshi"


# --------------------------------------------------------------------------
# Step 4 — deterministic valuation, cashout cap
# --------------------------------------------------------------------------


def test_valuation_is_deterministic():
    picks = uniform_team(85, 80, 85, 10, 80, 60, inv=mk_inv(money=50, ego=60))
    r1 = resolve("SW", "B2B", picks, SETTINGS)
    r2 = resolve("SW", "B2B", picks, SETTINGS)
    assert r1.valuation_b == r2.valuation_b


def test_valuation_formula_matches_spec():
    picks = uniform_team(85, 80, 85, 10, 80, 60, inv=mk_inv(money=50, ego=60))
    r = resolve("SW", "B2B", picks, SETTINGS)
    potential = (85 + 80 + 85 + 80) / 4
    expected = min(1000, 1000 * (potential / 91.8) ** 22)
    assert r.valuation_b == pytest.approx(expected)


def test_perfect_season_caps_at_1000():
    picks = uniform_team(96, 92, 96, 10, 96, 70, era="1950s", inv=mk_inv(money=50, ego=70))
    r = resolve("SW", "B2B", picks, SETTINGS)
    assert r.valuation_b == 1000
    assert r.ending_id == "perfect_season"


def test_cashout_caps_valuation_at_1b():
    # High potential (~big valuation) but very low ego -> cash-out cap = $1B.
    picks = uniform_team(85, 85, 85, 10, 85, 1, era="1950s", inv=mk_inv(money=50, ego=1))
    r = resolve("SW", "B2B", picks, SETTINGS)
    assert r.cashout is True
    assert r.valuation_b == 1.0
    assert r.ending_id == "sold_too_early"


def test_anti_founder_survives_all_gates_under_10m():
    # Survives every death check, no cashout, but valuation < $10M.
    picks = uniform_team(10, 5, 10, 1, 5, 5, inv=mk_inv(money=50, ego=5))
    r = resolve("SW", "B2B", picks, SETTINGS)
    assert r.death_check_id is None
    assert r.cashout is False
    assert r.valuation_b < SETTINGS.worst_ipo_threshold_b
    assert r.ending_id == "anti_founder"




# --------------------------------------------------------------------------
# One golden end-to-end case per victory tier ending id
# --------------------------------------------------------------------------


def _survive_team(vision, marketing, tech, monetization, ego):
    return uniform_team(vision, marketing, tech, 10, monetization, ego,
                        era="1950s", inv=mk_inv(money=50, ego=ego))


@pytest.mark.parametrize("ending_id,team", [
    ("perfect_season", _survive_team(96, 92, 96, 96, 70)),
    ("generational", _survive_team(90, 88, 90, 90, 60)),
    ("blockbuster", _survive_team(82, 82, 82, 82, 60)),
    ("unicorn", _survive_team(80, 72, 80, 80, 60)),
    ("kiddie_pool", _survive_team(59, 59, 59, 59, 50)),
])
def test_golden_victory_endings(ending_id, team):
    r = resolve("SW", "B2B", team, SETTINGS)
    assert r.death_check_id is None, f"unexpected bust: {r.ending_id}"
    assert r.ending_id == ending_id, f"got {r.ending_id} val={r.valuation_b}"


def test_every_ending_id_has_blurb():
    for r in ENDINGS_BY_ID.values():
        assert r.blurb.strip()
        assert r.emoji
        assert r.category in {"victory", "gameover"}


# --------------------------------------------------------------------------
# Integration: real CSV data loads and resolves
# --------------------------------------------------------------------------


def test_real_data_loads_and_resolves():
    data = load_game_data()
    assert len(data.people) > 100
    assert len(data.investors) > 10

    # Build a legal roster from the real data (5 distinct-named people + a VC),
    # without pinning to specific CSV rows (the data file may be edited).
    chosen = []
    seen = set()
    for p in data.people:
        if p.name not in seen:
            seen.add(p.name)
            chosen.append(p)
        if len(chosen) == 5:
            break
    roles = ["CEO", "CTO", "SWE", "CMO", "COO"]
    picks = {role: chosen[i] for i, role in enumerate(roles)}
    picks["INV"] = data.investors[0]

    r = resolve("SW", "Infra", picks, SETTINGS)
    assert r.ending_id in ENDINGS_BY_ID
    # Some founders whose name also appears in the investor list are Already Wealthy.
    assert any(p.is_already_wealthy for p in data.people)
