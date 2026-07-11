"""Load + validate the CSV data into typed objects at startup.

No database. The two CSVs are read once into memory. Everything downstream
(resolver, draft, routes) reads from the GameData instance built here.

A person is uniquely identified by (Name, Company, Era).
"Already Wealthy" CEOs = people whose Name also appears in the investor list;
their Money is looked up from there.
"""
from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
RATINGS_CSV = DATA_DIR / "ratings.csv"
INVESTORS_CSV = DATA_DIR / "investors.csv"

ROLES = ["CEO", "CTO", "SWE", "CMO", "COO", "INV"]
COMPANY_ROLES = ["CEO", "CTO", "SWE", "CMO", "COO"]
TRACKS = ["HW", "SW"]

# Attribute-based accent palette. Computed server-side so the color is
# consistent everywhere and the frontend never re-derives it.
SPECIALTY_ACCENTS: Dict[str, str] = {
    "Chips": "#F9A825",       # amber
    "Infra": "#1565C0",       # blue
    "B2B": "#00838F",         # teal
    "B2C": "#AD1457",         # magenta
    "Computers": "#2E7D32",   # green
    "Deep Tech": "#6A1B9A",   # deep purple
}
SPECIALTY_FALLBACK = "#546E7A"  # blue-grey for any unknown specialty
INVESTOR_ACCENTS: Dict[str, str] = {
    "Entity": "#3949AB",      # indigo, funds
    "Individual": "#EF6C00",  # orange, angels
}


@dataclass(frozen=True)
class Person:
    name: str
    wikipedia: Optional[str]
    github: Optional[str]
    company: str
    era: str
    vision: float
    marketing: float
    tech_hw: float
    tech_sw: float
    specialty: str
    deception: float
    ego: float
    monetization: float
    # Filled after investors load: personal capital IF this person is
    # "Already Wealthy" (name present in the investor list). Else None.
    wealth_money: Optional[float] = None

    @property
    def id(self) -> str:
        return f"person:{self.name}|{self.company}|{self.era}"

    @property
    def accent(self) -> str:
        return SPECIALTY_ACCENTS.get(self.specialty, SPECIALTY_FALLBACK)

    @property
    def is_already_wealthy(self) -> bool:
        return self.wealth_money is not None


@dataclass(frozen=True)
class Investor:
    name: str
    type: str  # "Individual" | "Entity"
    primary_era: str
    money: float
    ego: float
    wikipedia: Optional[str]

    @property
    def id(self) -> str:
        return f"investor:{self.name}"

    @property
    def accent(self) -> str:
        return INVESTOR_ACCENTS.get(self.type, SPECIALTY_FALLBACK)


class DataError(ValueError):
    """Raised on malformed data so startup fails fast with a clear message."""


def _num(raw: str, *, field: str, ctx: str, lo: float = 0, hi: float = 99) -> float:
    raw = (raw or "").strip()
    if raw == "":
        raise DataError(f"{ctx}: empty value for numeric field '{field}'")
    try:
        val = float(raw)
    except ValueError as exc:
        raise DataError(f"{ctx}: field '{field}' is not a number: {raw!r}") from exc
    if val != val:  # NaN
        raise DataError(f"{ctx}: field '{field}' is NaN")
    if not (lo <= val <= hi):
        raise DataError(f"{ctx}: field '{field}'={val} out of range [{lo}, {hi}]")
    return val


class GameData:
    """In-memory store of validated people + investors."""

    def __init__(self, people: List[Person], investors: List[Investor]):
        self.people = people
        self.investors = investors
        self._people_by_id = {p.id: p for p in people}
        self._investors_by_id = {i.id: i for i in investors}
        self.companies = sorted({p.company for p in people})
        self.specialties = sorted({p.specialty for p in people})
        # The draftable unit is a (company, era) group, "2010s Tesla" is
        # distinct from "2000s Tesla". Rolling uniformly over these groups
        # naturally makes companies present in more eras more likely to appear
        # (and single-era "small" companies less likely).
        self.company_era_groups = sorted({(p.company, p.era) for p in people})

    # ---- lookups ----------------------------------------------------------
    def person(self, pid: str) -> Person:
        p = self._people_by_id.get(pid)
        if p is None:
            raise KeyError(f"unknown person id: {pid}")
        return p

    def investor(self, iid: str) -> Investor:
        i = self._investors_by_id.get(iid)
        if i is None:
            raise KeyError(f"unknown investor id: {iid}")
        return i

    def people_for_company(self, company: str) -> List[Person]:
        return [p for p in self.people if p.company == company]

    def people_for_company_era(self, company: str, era: str) -> List[Person]:
        return [p for p in self.people if p.company == company and p.era == era]


def _load_investors(path: Path = INVESTORS_CSV) -> List[Investor]:
    if not path.exists():
        raise DataError(f"investors.csv not found at {path}")
    investors: List[Investor] = []
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        # CSV header: "Entity / Person, Type, Primary Era, Money, Ego, Wikipedia Link"
        required = {"Entity / Person", "Type", "Primary Era", "Money", "Ego"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise DataError(f"investors.csv missing columns: {sorted(missing)}")
        for row in reader:
            name = (row["Entity / Person"] or "").strip()
            if not name:
                continue
            itype = (row["Type"] or "").strip()
            if itype not in {"Individual", "Entity"}:
                raise DataError(f"investor {name!r}: bad Type {itype!r}")
            ctx = f"investor {name!r}"
            investors.append(
                Investor(
                    name=name,
                    type=itype,
                    primary_era=(row["Primary Era"] or "").strip(),
                    money=_num(row["Money"], field="Money", ctx=ctx),
                    ego=_num(row["Ego"], field="Ego", ctx=ctx),
                    wikipedia=(row.get("Wikipedia Link") or "").strip() or None,
                )
            )
    if not investors:
        raise DataError("investors.csv contained no rows")
    return investors


def _load_people(path: Path, wealth_by_name: Dict[str, float]) -> List[Person]:
    if not path.exists():
        raise DataError(f"ratings.csv not found at {path}")
    people: List[Person] = []
    seen: set = set()
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        required = {
            "Name", "Company", "Era", "Vision", "Marketing",
            "Tech (HW)", "Tech (SW)", "Specialty", "Deception",
            "Ego", "Monetization", "GitHub Link",
        }
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise DataError(f"ratings.csv missing columns: {sorted(missing)}")
        for row in reader:
            name = (row["Name"] or "").strip()
            company = (row["Company"] or "").strip()
            era = (row["Era"] or "").strip()
            if not (name and company and era):
                continue
            key = (name, company, era)
            if key in seen:
                raise DataError(f"duplicate person (Name, Company, Era): {key}")
            seen.add(key)
            ctx = f"person {name!r} @ {company}/{era}"
            people.append(
                Person(
                    name=name,
                    wikipedia=(row.get("Wikipedia Link") or "").strip() or None,
                    github=(row.get("GitHub Link") or "").strip() or None,
                    company=company,
                    era=era,
                    vision=_num(row["Vision"], field="Vision", ctx=ctx),
                    marketing=_num(row["Marketing"], field="Marketing", ctx=ctx),
                    tech_hw=_num(row["Tech (HW)"], field="Tech (HW)", ctx=ctx),
                    tech_sw=_num(row["Tech (SW)"], field="Tech (SW)", ctx=ctx),
                    specialty=(row["Specialty"] or "").strip(),
                    deception=_num(row["Deception"], field="Deception", ctx=ctx),
                    ego=_num(row["Ego"], field="Ego", ctx=ctx),
                    monetization=_num(row["Monetization"], field="Monetization", ctx=ctx),
                    wealth_money=wealth_by_name.get(name),
                )
            )
    if not people:
        raise DataError("ratings.csv contained no rows")
    return people


def load_game_data(
    ratings_path: Path = RATINGS_CSV, investors_path: Path = INVESTORS_CSV
) -> GameData:
    """Load + validate both CSVs. Raises DataError (fail-fast) on any problem."""
    investors = _load_investors(investors_path)
    # "Already Wealthy" lookup: a person's Name matching an investor's Name
    # inherits that investor's Money. Individuals only (Entities aren't founders).
    wealth_by_name = {
        i.name: i.money for i in investors if i.type == "Individual"
    }
    people = _load_people(ratings_path, wealth_by_name)
    return GameData(people, investors)
