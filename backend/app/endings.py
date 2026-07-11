"""Ending-screen definitions and blurbs, verbatim from design spec section 8.

The backend owns all threshold/tier knowledge and the human blurb text. The
frontend maps `ending_id` -> a visual treatment and never re-implements any
threshold logic. Tier boundaries (min/max valuation in $B) are exposed via
GET /api/meta so screens render without the frontend knowing the numbers.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass(frozen=True)
class Ending:
    id: str
    label: str
    emoji: str
    category: str  # "victory" | "gameover"
    min_valuation_b: Optional[float]
    max_valuation_b: Optional[float]
    note: str
    blurb: str


# NOTE: min/max are documentation of the tier bands for the frontend/meta.
# The authoritative selection logic lives in resolver.choose_ending().
ENDINGS: List[Ending] = [
    Ending(
        id="perfect_season",
        label="Trillion-Dollar Club",
        emoji="🏆",
        category="victory",
        min_valuation_b=1000,
        max_valuation_b=None,
        note="$1 TRILLION+",
        blurb=(
            "A flawless IPO. The market handed you a valuation with twelve zeroes and a"
            " permanent seat in the history books. Every VC on Sand Hill Road is now telling"
            " people they \"saw it early.\" Your S-1 is being taught in business schools."
            " There is no note to give. No \"but.\" No \"next time.\""
            " You built the thing the entire industry will spend the next decade trying to clone."
        ),
    ),
    Ending(
        id="generational",
        label="Generational Exit",
        emoji="🚀",
        category="victory",
        min_valuation_b=500,
        max_valuation_b=1000,
        note="$500B to $1T",
        blurb=(
            "A monster IPO. The kind of number that makes a CNBC anchor briefly lose "
            "composure on air. You're a household name, possibly a verb. And yet, there's "
            "a cleaner run sitting just above you, a full trillion, close enough to taste. "
            "Spectacular work. But can you do better next time?"
        ),
    ),
    Ending(
        id="blockbuster",
        label="Blockbuster IPO",
        emoji="💰",
        category="victory",
        min_valuation_b=50,
        max_valuation_b=500,
        note="$50B to $500B",
        blurb=(
            "A genuinely huge exit. You're rich, your early employees are rich, and your "
            "Wikipedia page now has a \"Controversies\" section, which is how you know "
            "you've truly made it. This is an outcome 99% of founders would trade a kidney "
            "for. Still, the legendary tier is up there glinting in the distance. Can you "
            "do better next time?"
        ),
    ),
    Ending(
        id="unicorn",
        label="Unicorn",
        emoji="🦄",
        category="victory",
        min_valuation_b=1,
        max_valuation_b=50,
        note="$1B to $50B",
        blurb=(
            "You did it, a real unicorn, horn and all. Confetti on the Nasdaq floor, a "
            "bell, a hoodie with your own logo on it. The vast majority of founders never "
            "touch this. Respectable, enviable, real. But we both know there are bigger "
            "horns out there. Can you do better next time?"
        ),
    ),
    Ending(
        id="kiddie_pool",
        label="The Kiddie-Pool IPO",
        emoji="🩴",
        category="victory",
        min_valuation_b=0.01,
        max_valuation_b=1,
        note="$10M to $1B",
        blurb=(
            "You made it public. Technically. It's an IPO in the same way a kiddie pool is "
            "a body of water. The bell got rung, a ticker exists, and by Friday afternoon "
            "three analysts had already quietly dropped coverage. Nobody's mad. Nobody's "
            "impressed either. Can you do better next time? Almost certainly, yes."
        ),
    ),
    Ending(
        id="anti_founder",
        label="The Anti-Founder",
        emoji="👑",
        category="victory",
        min_valuation_b=0,
        max_valuation_b=0.01,
        note="SUCCESSFUL IPO UNDER $10M, a masterpiece of failure",
        blurb=(
            "Congratulations. Do you know how many checks there are to make you lose?"
            " Somehow, you survived all of them, and then you achieved a valuation less"
            " than most Software Engineers' net worth. To fail this precisely, this deliberately,"
            " while beating every mechanism designed to prevent you from IPO'ing, takes vision."
            " It takes commitment. It takes a competitive drive most founders will never comprehend."
            " It is statistically harder to reach this end screen than it is to reach the 1 trillion valuation."
            " You aimed so low it looped back around to greatness. Bravo. 👏"
        ),
    ),
    Ending(
        id="sold_too_early",
        label="Sold Too Early",
        emoji="🦥",
        category="gameover",
        min_valuation_b=None,
        max_valuation_b=1,
        note="CASH-OUT · valuation capped",
        blurb=(
            "Your team was so drama-free, so reasonable, so utterly free of the "
            "pathological self-belief this game demands, that the instant a mid-sized "
            "acquirer waved a check, you all said \"yeah, that seems fair\" and took it. "
            "You left a truly staggering amount of money on the table. Everyone got a "
            "decent payout and a company Patagonia vest. Nobody got a statue. Can you do "
            "better next time? A little delusion goes a long way."
        ),
    ),
    Ending(
        id="vaporware",
        label="Vaporware",
        emoji="📰",
        category="gameover",
        min_valuation_b=0,
        max_valuation_b=0,
        note="FRAUD · shut down",
        blurb=(
            "The Wall Street Journal ran the story on a Tuesday. By Thursday your Slack was "
            "a ghost town and your general counsel had stopped picking up. Turns out "
            "Deception and Hype wrote checks your engineering simply could not cash. "
            "You didn't build a company, you built a narrative, and "
            "narratives get subpoenaed. Somewhere, a documentary crew is already booking "
            "your former employees. Can you do better next time? Ideally the kind of "
            "\"better\" that doesn't come with an ankle monitor."
        ),
    ),
    Ending(
        id="overhyped",
        label="Overhyped",
        emoji="🎈",
        category="gameover",
        min_valuation_b=0,
        max_valuation_b=0,
        note="DIED BEFORE SERIES A",
        blurb=(
            "The demo slapped. The waitlist hit six figures. The launch thread went viral. "
            "And then somebody tried to actually use the product and the whole thing folded "
            "like a lawn chair. Your marketing was cashing checks your engineering had never "
            "even heard of. You ran out of runway before the next raise, because hype is not "
            "a moat, it's a countdown timer. Can you do better next time? Try shipping "
            "something first."
        ),
    ),
    Ending(
        id="bankruptcy",
        label="Out of Runway",
        emoji="🔥",
        category="gameover",
        min_valuation_b=0,
        max_valuation_b=0,
        note="BANKRUPTCY",
        blurb=(
            "You had the vision. You had the team. You had a $14,000-a-month cold-brew "
            "contract and a \"culture offsite\" in Tulum. What you did not have was revenue "
            "that outran your burn. The runway ended mid-sentence. Your landlord has "
            "thoughts. Can you do better next time? Consider selling something before the "
            "money's gone."
        ),
    ),
    Ending(
        id="implosion",
        label="The Implosion",
        emoji="💥",
        category="gameover",
        min_valuation_b=0,
        max_valuation_b=0,
        note="FOUNDERS FORCED EACH OTHER OUT",
        blurb=(
            "Six founders, six visions, and a combined ego reading visible from low orbit. "
            "There wasn't room in the building for all of you, so you solved it the classic "
            "way: a boardroom coup, a leaked memo, two competing all-hands scheduled at the "
            "same time, and a LinkedIn post that opened with \"After much reflection.\" The "
            "product shipped with nobody at the wheel. Can you do better next time? Consider "
            "hiring exactly one (1) adult."
        ),
    ),
    Ending(
        id="masayoshi",
        label="Masayoshi's Pet Project",
        emoji="🪂",
        category="gameover",
        min_valuation_b=0,
        max_valuation_b=0,
        note="ALL MONEY, ALL HYPE, NO REVENUE",
        blurb=(
            "Congratulations, you raised an absolutely obscene sum on the strength of pure "
            "vibes and a founder who \"thinks in trillions.\" You blitzscaled into fourteen "
            "countries, acquired a company that makes robotic pizza, and never once figured "
            "out how any of it produces a dollar. Your lead investor is already reframing "
            "this as \"a learning experience\" on an earnings call. The valuation was a "
            "number somebody said out loud once, confidently. Can you do better next time? "
            "The word you're looking for is revenue."
        ),
    ),
]

ENDINGS_BY_ID: Dict[str, Ending] = {e.id: e for e in ENDINGS}


def get_ending(ending_id: str) -> Ending:
    return ENDINGS_BY_ID[ending_id]
