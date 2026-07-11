"""Pure game logic: the deterministic resolver.

Every function here is pure: given (picks, track, industry, settings) it returns
a structured result with no RNG and no global mutable state. This is what makes
tuning (swap settings) and testing (pin every formula) trivial.

Implements the pipeline in design spec section 5 / section 10 EXACTLY. If this
disagrees with the spec, the spec wins.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

from .config import Settings
from .data import COMPANY_ROLES, Investor, Person
from .endings import get_ending


# --------------------------------------------------------------------------
# Step 0, track-dependent Technical Ability (the only stat the track touches)
# --------------------------------------------------------------------------


def tech_value(person: Person, track: str, industry: str, settings: Settings) -> float:
    base = person.tech_hw if track == "HW" else person.tech_sw
    bonus = settings.specialty_synergy_bonus if person.specialty == industry else 1.0
    return base * bonus


# --------------------------------------------------------------------------
# Step 1, weighted team stats
# --------------------------------------------------------------------------


def _weighted(values_by_role: Dict[str, float], weights: Dict[str, float]) -> float:
    """Σ over slots of weight(role) * value(role). Missing role => 0 value."""
    return sum(weights.get(role, 0.0) * values_by_role.get(role, 0.0) for role in weights)


# --------------------------------------------------------------------------
# Result container
# --------------------------------------------------------------------------


@dataclass
class ResolveResult:
    track: str
    industry: str
    vision: float
    marketing: float
    tech: float
    deception: float
    monetization: float
    ego: float
    money: float
    potential: float
    death_check_id: Optional[str]
    cashout: bool
    valuation_b: float
    ending_id: str


# --------------------------------------------------------------------------
# Ending selection (authoritative tier logic; endings.py holds the copy)
# --------------------------------------------------------------------------


def choose_ending(valuation_b: float, cashout: bool, settings: Settings) -> str:
    """Called only when the company SURVIVED every death check."""
    if valuation_b < settings.worst_ipo_threshold_b:  # < $10M, survived all gates
        return "anti_founder"
    if cashout:
        return "sold_too_early"
    if valuation_b >= settings.valuation_cap_b:  # >= $1T
        return "perfect_season"
    if valuation_b >= 500:
        return "generational"
    if valuation_b >= 50:
        return "blockbuster"
    if valuation_b >= 1:
        return "unicorn"
    return "kiddie_pool"  # $10M to $1B


# --------------------------------------------------------------------------
# The resolver
# --------------------------------------------------------------------------


def resolve(
    track: str,
    industry: str,
    picks: Dict[str, object],
    settings: Settings,
) -> ResolveResult:
    """Resolve a full run.

    `picks` maps role -> domain object: CEO/CTO/SWE/CMO/COO are Person, INV is
    an Investor. Returns a ResolveResult (no Pydantic dependency here).
    """
    ceo: Person = picks["CEO"]        # type: ignore[assignment]
    investor: Investor = picks["INV"]  # type: ignore[assignment]

    # Step 0: per-person technical ability
    tech_by_role = {
        role: tech_value(picks[role], track, industry, settings)  # type: ignore[arg-type]
        for role in COMPANY_ROLES
    }

    # Step 1: weighted team stats (INV weight is 0 for every non-ego stat)
    W = settings.weights
    vision = _weighted({r: picks[r].vision for r in COMPANY_ROLES}, W["vision"])          # type: ignore[union-attr]
    marketing = _weighted({r: picks[r].marketing for r in COMPANY_ROLES}, W["marketing"]) # type: ignore[union-attr]
    tech = _weighted(tech_by_role, W["tech"])
    deception = _weighted({r: picks[r].deception for r in COMPANY_ROLES}, W["deception"]) # type: ignore[union-attr]
    monetization = _weighted(
        {r: picks[r].monetization for r in COMPANY_ROLES}, W["monetization"]              # type: ignore[union-attr]
    )

    # Ego uses all six slots. Entity funds carry 0 ego -> weight redistributed.
    ego_weights = W["ego_entity"] if investor.type == "Entity" else W["ego_individual"]
    ego_values = {r: picks[r].ego for r in COMPANY_ROLES}  # type: ignore[union-attr]
    ego_values["INV"] = investor.ego
    ego = _weighted(ego_values, ego_weights)

    # Money: investor capital + CEO personal wealth iff Already Wealthy.
    money = investor.money + (ceo.wealth_money if ceo.is_already_wealthy else 0.0)

    potential = (vision + marketing + tech + monetization) / 4.0

    def _bust(ending_id: str) -> ResolveResult:
        return ResolveResult(
            track=track, industry=industry,
            vision=vision, marketing=marketing, tech=tech, deception=deception,
            monetization=monetization, ego=ego, money=money, potential=potential,
            death_check_id=ending_id, cashout=False,
            valuation_b=0.0, ending_id=ending_id,
        )

    # Step 2: death checks. Every check is evaluated (no short-circuit) and
    # scored as a severity where 1.0 == exactly on the failing boundary and
    # higher == worse. The WORST failed check becomes the ending, so a blatant
    # fraud beats a marginal ego problem. All checks are ratio-based against the
    # team's substance, so high-substance rosters are inherently safe, there is
    # no era tolerance anywhere.
    safe_tech = max(tech, 1e-9)
    failures = []  # list of (ending_id, severity)

    # Vaporware (fraud): hype + lies vs what the tech can actually back up.
    vaporware_sev = (deception + marketing) / (settings.vaporware_ratio * safe_tech)
    if vaporware_sev > 1.0:
        failures.append(("vaporware", vaporware_sev))

    # Overhyped: marketing outruns the actual product.
    overhype_sev = marketing / (settings.overhype_ratio * safe_tech)
    if overhype_sev > 1.0:
        failures.append(("overhyped", overhype_sev))

    # Burn (bankruptcy): burn rate outruns income + capital.
    burn = max(0.0, settings.burn_base + settings.burn_k_ego * ego - settings.burn_k_tech * tech)
    runway = settings.burn_ratio * (monetization + money)
    burn_sev = (burn / runway) if runway > 0 else (float("inf") if burn > 0 else 0.0)
    if burn_sev > 1.0:
        failures.append(("bankruptcy", burn_sev))

    # Chemistry (implosion): ego below the base ceiling is always fine. At or
    # above it, the team survives only if project quality, the average of the
    # non-risk stats (money capped at 100), exceeds ego. So a 90+ ego roster
    # can clear it only with near-perfect everything, and usually implodes.
    if ego >= settings.ego_implosion_ceiling:
        quality = (vision + marketing + tech + monetization + min(money, 100.0)) / 5.0
        implosion_sev = ego / max(quality, 1e-9)
        if implosion_sev > 1.0:  # ego exceeds project quality
            failures.append(("implosion", implosion_sev))

    # Masayoshi's Pet Project: mountain of money + hype, no path to revenue.
    if (
        money > settings.masayoshi_money_min
        and marketing > settings.masayoshi_marketing_min
        and monetization < settings.masayoshi_monetization_max
    ):
        mon_max = settings.masayoshi_monetization_max
        masayoshi_sev = 1.0 + (mon_max - monetization) / max(mon_max, 1e-9)
        failures.append(("masayoshi", masayoshi_sev))

    if failures:
        worst_id = max(failures, key=lambda f: f[1])[0]
        return _bust(worst_id)

    # Ego floor, early cash-out (a cap, not a bust)
    cashout = ego < settings.ego_cashout_ratio * potential

    # Step 4: deterministic valuation curve
    valuation = settings.valuation_cap_b * (potential / settings.potential_for_1t) ** settings.valuation_exponent

    if cashout:
        valuation = min(valuation, settings.cashout_cap_b)  # $1B cap
    valuation = min(valuation, settings.valuation_cap_b)     # $1T cap

    ending_id = choose_ending(valuation, cashout, settings)

    return ResolveResult(
        track=track, industry=industry,
        vision=vision, marketing=marketing, tech=tech, deception=deception,
        monetization=monetization, ego=ego, money=money, potential=potential,
        death_check_id=None, cashout=cashout,
        valuation_b=valuation, ending_id=ending_id,
    )
