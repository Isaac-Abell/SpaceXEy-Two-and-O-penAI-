"""Loads config.yaml into a typed Settings object.

Every tunable game constant lives in config.yaml (never hardcoded in logic).
Load once at startup; the object is treated as immutable. Cheats mode may build
a temporary Settings by merging a per-request override (see resolver / routes).
"""
from __future__ import annotations

import copy
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List

import yaml

# config.yaml lives at backend/config.yaml (one level up from app/)
DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.yaml"


@dataclass(frozen=True)
class Settings:
    """Typed view over config.yaml. All game numbers come from here."""

    vaporware_ratio: float
    overhype_ratio: float
    burn_ratio: float
    burn_base: float
    burn_k_ego: float
    burn_k_tech: float
    ego_implosion_ceiling: float
    ego_cashout_ratio: float
    masayoshi_money_min: float
    masayoshi_marketing_min: float
    masayoshi_monetization_max: float
    potential_for_1t: float
    valuation_exponent: float
    valuation_cap_b: float
    specialty_synergy_bonus: float
    worst_ipo_threshold_b: float
    cashout_cap_b: float
    track_industries: Dict[str, List[str]]
    weights: Dict[str, Dict[str, float]]

    # ---- serialization helpers -------------------------------------------
    def as_dict(self) -> Dict[str, Any]:
        """Round-trippable dict (used by GET /config and the cheats YAML copy)."""
        return {
            "vaporware_ratio": self.vaporware_ratio,
            "overhype_ratio": self.overhype_ratio,
            "burn_ratio": self.burn_ratio,
            "burn_base": self.burn_base,
            "burn_k_ego": self.burn_k_ego,
            "burn_k_tech": self.burn_k_tech,
            "ego_implosion_ceiling": self.ego_implosion_ceiling,
            "ego_cashout_ratio": self.ego_cashout_ratio,
            "masayoshi_money_min": self.masayoshi_money_min,
            "masayoshi_marketing_min": self.masayoshi_marketing_min,
            "masayoshi_monetization_max": self.masayoshi_monetization_max,
            "potential_for_1t": self.potential_for_1t,
            "valuation_exponent": self.valuation_exponent,
            "valuation_cap_b": self.valuation_cap_b,
            "specialty_synergy_bonus": self.specialty_synergy_bonus,
            "worst_ipo_threshold_b": self.worst_ipo_threshold_b,
            "cashout_cap_b": self.cashout_cap_b,
            "track_industries": {k: list(v) for k, v in self.track_industries.items()},
            "weights": {k: dict(v) for k, v in self.weights.items()},
        }

    def merged_with(self, override: Dict[str, Any]) -> "Settings":
        """Return a NEW Settings with `override` deep-merged on top.

        Used only for cheats-mode config_override; the base Settings is never
        mutated. Nested dicts (era_tolerance, weights) merge key-by-key.
        """
        base = self.as_dict()
        for key, value in (override or {}).items():
            if key not in base:
                continue
            if isinstance(base[key], dict) and isinstance(value, dict):
                merged = copy.deepcopy(base[key])
                for sub_key, sub_val in value.items():
                    if isinstance(merged.get(sub_key), dict) and isinstance(sub_val, dict):
                        merged[sub_key] = {**merged[sub_key], **sub_val}
                    else:
                        merged[sub_key] = sub_val
                base[key] = merged
            else:
                base[key] = value
        return Settings(**base)


def load_settings(path: Path | str = DEFAULT_CONFIG_PATH) -> Settings:
    """Parse config.yaml into a Settings object. Fails fast if malformed."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"config.yaml not found at {path}")
    with path.open("r", encoding="utf-8") as fh:
        raw = yaml.safe_load(fh)
    if not isinstance(raw, dict):
        raise ValueError("config.yaml did not parse to a mapping")
    try:
        return Settings(**raw)
    except TypeError as exc:  # missing / unexpected keys
        raise ValueError(f"config.yaml is missing or has unexpected keys: {exc}") from exc


def load_dotenv_if_present(path: Path | str | None = None) -> None:
    """Minimal, dependency-free .env loader for local (non-Docker) runs.

    Reads backend/.env (KEY=VALUE lines) and sets any keys not already present
    in the process environment. Docker/compose set env directly and win.
    """
    path = Path(path) if path else Path(__file__).resolve().parent.parent / ".env"
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def cheats_enabled() -> bool:
    """Backend cheats flag. When false, every cheats capability is inert."""
    return os.environ.get("CHEATS_ENABLED", "false").strip().lower() in {"1", "true", "yes"}
