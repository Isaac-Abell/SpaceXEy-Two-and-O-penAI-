# SpaceXEY: Two and O(penAI) — Game Design & Logic Specification

*The founder-drafting roguelike. Spin a company, draft a legend, take it public — or take it down.*

**Objective:** a $1 Trillion IPO — a perfect **82–0**. Under skilled play this is roughly a **1-in-500** run.

---

## 1. Premise

SpaceXEY: Two and O(penAI) is a draft-and-pray roguelike about assembling the perfect startup from the legends and corpses of tech history. It borrows its spine from the "82–0" sports format: you don't pick the *best* players, you're handed *random* ones and must make the most of the hand you're dealt. Here the "players" are real founders, engineers, operators, and investors — each rated on how they actually performed at a specific company during a specific era.

You assemble a six-person founding team one slot at a time. The simulation then runs your company forward: it checks whether you get investigated for fraud, whether you burn through your cash, whether your egos detonate the cap table — and if you survive all of that, it produces an IPO valuation and converts it into a win–loss record.

The core tension: the talent pool is stacked with brilliant people (survivorship bias — history mostly remembers winners), so simply **surviving** is common. **Greatness** is not. The valuation curve is deliberately merciless at the top, so the gap between a good roster and a perfect one is enormous.

---

## 2. The Core Loop

A single run resolves in this order:

1. **Set your bet.** Before drafting, commit to a **Technical Track** (Hardware or Software) and an **Industry** (Infra, B2B, B2C, Chips, Computers, Deep Tech). Locked for the run; colors everything.
2. **Draft five company roles.** For each of CEO, CTO, Lead SWE, CMO, COO: the game rolls a **random company**, then you pick **one person** from that company's roster.
3. **Draft your money.** The Lead Investor slot is different — the game deals you **three random investors** from a separate VC/angel pool and you choose one.
4. **Resolve.** The sim computes six weighted team stats, runs the death checks in fixed order, and — if you live — calculates your IPO valuation and final record.

**Draft rules.** The same real person can't be drafted twice, and can't appear as two different eras (no early-Apple Jobs *and* late-Apple Jobs on one team). The company pool and the investor pool are **separate**, so Elon-the-CEO and Elon-the-Investor could both appear — one is a company role, the other a bankroll.

---

## 3. The Six Slots

Each slot is an archetype. Anyone can technically go anywhere — there's no hard position lock — but the skill weightings act as a **soft lock**. Put a brilliant engineer in the CMO chair and you waste their entire stat line.

- **CEO — The Visionary.** Sets the ceiling (TAM) and culture. Dominates Vision. If independently wealthy, also contributes starting capital.
- **CTO — The Architect.** Designs the tech stack, sets the scalability ceiling. Anchors Technical Ability alongside the SWE.
- **Lead SWE — The Executioner.** Actually builds the thing. A monster engineer can brute-force a mediocre CTO's design; a weak one fails to deliver a great one.
- **CMO — The Hype Engine.** Drives acquisition, valuation narrative, public perception. Dominates Marketing; a major contributor to Deception.
- **COO — The Operator.** Runs burn, logistics, path to profit. Dominates Monetization.
- **Lead Investor — The Bankroll.** Provides capital and sets the board's ego/pressure baseline. Funds (as opposed to individuals) carry zero ego by design.

---

## 4. The Seven Inputs

Every person is rated 0–99 on raw attributes. Team stats are weighted blends of these, by role (Section 6).

- **Vision (TAM)** — how big the swing is.
- **Marketing (Hype)** — narrative and demand generation.
- **Technical Ability** — derived from Hardware *or* Software depending on the chosen track (see Step 0).
- **Deception (Fraud)** — willingness to "get ahead of the facts." High deception is dangerous, not helpful.
- **Ego (Implosion Risk)** — the closest thing to a uniform stat, and the game's true balancing axis. Too high and the team implodes; too low and they sell out early.
- **Monetization** — ability to convert product into money.
- **Money** — capital. From the Investor, plus the CEO if independently wealthy.

---

## 5. The Math, Step by Step

This is the exact resolver pipeline. Values shown are the current calibrated ones.

### Step 0 — Technical Ability (the one track-dependent stat)

Each drafted person's Technical Ability is computed from the chosen track — and **only Technical Ability is affected by the track/industry choice.** Every other stat is read raw.

Use their Hardware rating if the track is HW, Software rating if SW. Then, if the person's **Specialty matches the chosen Industry**, multiply by **1.05** (a 5% synergy bonus):

```
tech_value(person) = (track == 'HW' ? HW_rating : SW_rating)
                     * (person.Specialty == chosen_industry ? 1.05 : 1.00)
```

That ×1.05 is the **only** place the industry choice touches the numbers.

### Step 1 — Weighted Team Stats

Each team stat is the weighted sum of slot contributions. For every stat **except Ego and Money**, the Investor contributes nothing.

```
team_stat = Σ over slots [ weight(stat, slot) * person_value(slot, stat) ]
```

Example — Vision: `0.80*CEO.Vision + 0.10*CTO.Vision + 0.05*CMO.Vision + 0.05*COO.Vision`.

**Ego is special (the salary cap).** Ego is the game's balancing constraint. It uses all six slots. But investment **funds** have zero ego by design, so when the drafted investor is an **Entity** (fund, not a person), that investor's 12% ego weight is **redistributed across the four non-CEO human roles**. This prevents a fund pick from artificially deflating ego into the "sold too early" zone.

```
Individual investor: Ego = .28 CEO + .18 CTO + .10 SWE + .16 CMO + .16 COO + .12 INV
Entity investor:     Ego = .28 CEO + .21 CTO + .13 SWE + .19 CMO + .19 COO + .00 INV
```

**Money.** Investor capital plus the CEO's personal wealth *if* that CEO is independently wealthy (an "Already Wealthy" trait, looked up from the investor list — only a handful of founders qualify). Otherwise the CEO contributes 0.

```
money = investor.Money + (CEO is Already Wealthy ? CEO.Money : 0)
```

### Step 2 — The Death Checks (score all, worst failure wins)

Every check is evaluated (no short-circuit) and scored as a **severity**: `1.0` means exactly on the failing boundary, and higher means worse. If any check fails, the run ends at **$0** and the **worst-scoring** failed check becomes the ending — so a blatant fraud beats a marginal ego problem. Every check is **ratio-based** against the team's substance, so a high-substance roster is inherently safe. There is **no era tolerance anywhere** — the numbers alone decide.

**Check — The Vaporware Check (Fraud).** If hype and lies outrun what the tech can actually back up, journalists and the SEC arrive.

```
severity = (Deception + Marketing) / (2.1 * TechAbility)
BUST if severity > 1
```

**Check — The Overhyped Check.** Survived fraud, but marketing still outpaces the actual product. You raise on buzz, then die before the next round because you can't back it up.

```
severity = Marketing / (1.4 * TechAbility)
BUST if severity > 1
```

**Check — The Burn Check (Bankruptcy).** Burn rises with ego (jets, hubris, fancy offices), falls with technical ability (a strong team ships efficiently). If burn outruns income plus capital, the runway ends.

```
BurnRate = max(0, 30 + 0.6*Ego - 0.3*TechAbility)
Runway   = 1.0 * (Monetization + Money)
severity = BurnRate / Runway
BUST if severity > 1
```

**Check — The Chemistry Check (Implosion).** Too many alphas in one room and the founders force each other out. Ego below the base ceiling (80) is always fine. At or above it, the team survives only if project quality — the average of the non-risk stats (Money capped at 100) — exceeds ego.

```
only when Ego >= 80:
    Quality  = (Vision + Marketing + TechAbility + Monetization + min(Money, 100)) / 5
    severity = Ego / Quality
    BUST if severity > 1
```

**Check — Masayoshi's Pet Project.** A very specific, very fundable way to die: a mountain of money, a mountain of hype, and no discernible path to a dollar. The board keeps writing checks until suddenly it doesn't.

```
when Money > 85 AND Marketing > 65 AND Monetization < 68:
    severity = 1 + (68 - Monetization) / 68     # always a bust
```

**The Ego Floor — Early Cash-Out (not a bust, but a cap).** Separately, if team ego is too low relative to Potential, the team lacks the delusional conviction to hold out — they take the first reasonable offer. Not a $0 failure; it **caps** valuation at $1B regardless of how good the company could have been.

```
CASH-OUT (valuation capped at $1B) if Ego < 0.55 * Potential
```

### Step 3 — Potential

If you survive every check, the four "building" stats average into a single Potential score. Deception and Ego are deliberately excluded — they've already done their job in the death checks.

```
Potential = (Vision + Marketing + TechAbility + Monetization) / 4
```

### Step 4 — The Valuation Curve (deterministic)

Valuation is a pure, deterministic function of Potential — **no randomness is applied to the final number.** All luck lives in the draw; once the roster is set, an identical roster always yields an identical valuation. This is intentional: players must feel the outcome was earned, not dice-rolled.

```
Valuation ($B) = 1000 * (Potential / 91.8) ^ 22,  capped at $1000B
```

The exponent of 22 makes the top brutal. A Potential of 91.8 yields the full $1T; drop a few points and valuation collapses — which is why a flawless 82–0 lands around **1-in-500** even under skilled play, while a merely-great company still clears unicorn status comfortably.

### Step 5 — The Win–Loss Record

Finally, valuation maps onto an 82-game record on a **logarithmic** scale, so the sports-brain gets a scoreboard. Anchor points:

| Valuation | Record |
|-----------|--------|
| $1000B | 82–0 |
| $750B | 81–1 |
| $500B | 80–2 |
| $150B | 77–5 |
| $50B | 74–8 |
| $15B | 70–12 |
| $2B | 63–19 |
| $0 (any bust) | 0–82 |

Between anchors, interpolate wins linearly in log-valuation space, clamp to `[0, 82]`, and set losses = `82 − wins`.

---

## 6. The Weight Tables

Read each row as "this stat is built X% from this slot." Every row sums to 100%.

**Non-Ego stats — Investor contributes 0% to all of these:**

| Stat | CEO | CTO | Lead SWE | CMO | COO |
|------|-----|-----|----------|-----|-----|
| Vision | 80% | 10% | 0% | 5% | 5% |
| Marketing | 30% | 5% | 0% | 60% | 5% |
| Tech Ability | 5% | 50% | 45% | 0% | 0% |
| Deception | 40% | 10% | 0% | 50% | 0% |
| Monetization | 25% | 5% | 0% | 10% | 60% |

**Ego — uses all six slots (Investor column depends on Entity vs Individual):**

| Ego source | CEO | CTO | SWE | CMO | COO | Investor |
|------------|-----|-----|-----|-----|-----|----------|
| Individual VC | 28% | 18% | 10% | 16% | 16% | 12% |
| Entity / Fund | 28% | 21% | 13% | 19% | 19% | 0% |

**Money** — Investor always, plus CEO only if "Already Wealthy."

---

## 7. How "Skilled Play" Is Modeled (for balancing)

> **Offline design tool only.** The heuristic below is how balance was simulated during tuning. It is **not** part of the shipped resolver and has no runtime endpoint — the game never recommends picks to the player. It is retained here to document how the target distributions were derived.

For balancing, the simulation assumes a competent (not omniscient) player: at each slot it picks the best available person for that role, actively steering away from the two things that silently zero a run. It values a candidate by their weighted on-stat contribution, then subtracts **double weight** for Deception and **reduced weight** for Ego — because a smart human knows a fraud bust or an ego implosion erases everything.

```
draft_value(person, role) =
    on-stat weighted contribution
  - 2.0 * (deception_weight[role] * person.Deception)
  - 0.6 * (ego_weight[role]       * person.Ego)

Investor pick: maximize (Money - 0.5 * Ego) among the 3 offered
```

Under this model with the optimal pre-commitment (**Software / Infra**), the outcome distribution lands where we want it:

| Outcome | Rate |
|---------|------|
| Fraud bust | ~26% |
| Overhyped bust | ~2% |
| Masayoshi bust | ~3% |
| Burn / Implosion bust | ~0% |
| Early cash-out | ~6% |
| Clean survival | ~62% |

| Tier | Odds |
|------|------|
| $1T (82–0) | ~1-in-500 |
| $500B (80–2) | ~1-in-30 |
| $50B (73–9) | ~1-in-3 |
| $1B (unicorn) | ~1-in-2 |

Hardware is intentionally far more punishing (best HW combo busts ~75% of the time vs ~26% for the best SW combo) — hardware startups are supposed to be brutal.

---

## 8. The Ending Screens

Only the perfect season gets unconditional praise; nearly everything else nudges you to run it back. The single worst outcome gets a standing ovation — because you clearly meant it.

### Victory Screens (you IPO'd)

**🏆 Perfection — $1 TRILLION+ **

> 82–0. A flawless season. You didn't just win the game — you played it the way it was always meant to be played, and the market handed you a valuation with twelve zeroes and a permanent seat in the history books. Every VC on Sand Hill Road is now telling people they "saw it early." Your S-1 is being taught in business schools. There is no note to give. No "but." No "next time." You built the thing the entire industry will spend the next decade trying to clone. Take the win — you earned every last basis point of it.

**🚀 Generational Exit — $500B–$1T · 80–2 / 81–1**

> A monster IPO. The kind of number that makes a CNBC anchor briefly lose composure on air. You're a household name, possibly a verb. And yet — there's a cleaner run sitting just above you, a full trillion, an unblemished 82–0, close enough to taste. Spectacular work. But can you do better next time?

**💰 Blockbuster IPO — $50B–$500B · 74–8 to 79–3**

> A genuinely huge exit. You're rich, your early employees are rich, and your Wikipedia page now has a "Controversies" section — which is how you know you've truly made it. This is an outcome 99% of founders would trade a kidney for. Still, the legendary tier is up there glinting in the distance. Can you do better next time?

**🦄 Unicorn — $1B–$50B**

> You did it — a real unicorn, horn and all. Confetti on the Nasdaq floor, a bell, a hoodie with your own logo on it. The vast majority of founders never touch this. Respectable, enviable, real. But we both know there are bigger horns out there. Can you do better next time?

**🩴 The Kiddie-Pool IPO — $10M–$1B**

> You made it public. Technically. It's an IPO in the same way a kiddie pool is a body of water. The bell got rung, a ticker exists, and by Friday afternoon three analysts had already quietly dropped coverage. Nobody's mad. Nobody's impressed either. Can you do better next time? Almost certainly — yes.

**👑 The Anti-Founder (a masterpiece of failure) — SUCCESSFUL IPO UNDER $10M**

*The rarest run in the game — you survived every death check and still IPO'd under $10M.*

> Wait. Let's talk about what just happened. You survived the fraud investigators. You survived the burn check. You dodged the ego implosion, sidestepped the hype death-spiral, threaded Masayoshi's needle — you passed every single test this game built to kill a company — and then you took that pristine, fully-surviving company public at a valuation a suburban dentist could cover with a home-equity loan. That is not an accident. Nobody stumbles into this. To fail this precisely, this deliberately, while beating every mechanism designed to end you, takes vision. It takes commitment. It takes a competitive drive most founders will never comprehend. You weren't trying to win — you were trying to lose, beautifully, and you built a floor so low it loops back around to greatness. We are, sincerely, in awe. Bravo. 👏

### Game-Over Screens (you hit $0)

**📰 Vaporware — FRAUD · shut down**

> The Wall Street Journal ran the story on a Tuesday. By Thursday your Slack was a ghost town and your general counsel had stopped picking up. Turns out (Deception + Hype) wrote checks that (Tech + the era's gullibility) simply could not cash. You didn't build a company — you built a narrative, and narratives get subpoenaed. Somewhere, a documentary crew is already booking your former employees. Can you do better next time? Ideally the kind of "better" that doesn't come with an ankle monitor.

**🎈 Overhyped — DIED BEFORE SERIES A**

> The demo slapped. The waitlist hit six figures. The launch thread went viral. And then somebody tried to actually use the product and the whole thing folded like a lawn chair. Your marketing was cashing checks your engineering had never even heard of. You ran out of runway before the next raise, because hype is not a moat — it's a countdown timer. Can you do better next time? Try shipping something first.

**🔥 Out of Runway — BANKRUPTCY**

> You had the vision. You had the team. You had a $14,000-a-month cold-brew contract and a "culture offsite" in Tulum. What you did not have was revenue that outran your burn. The runway ended mid-sentence. Your landlord has thoughts. Can you do better next time? Consider selling something before the money's gone.

**💥 The Implosion — FOUNDERS FORCED EACH OTHER OUT**

> Six founders, six visions, and a combined ego reading visible from low orbit. There wasn't room in the building for all of you, so you solved it the classic way: a boardroom coup, a leaked memo, two competing all-hands scheduled at the same time, and a LinkedIn post that opened with "After much reflection." The product shipped with nobody at the wheel. Can you do better next time? Consider hiring exactly one (1) adult.

**🪂 Masayoshi's Pet Project — ALL MONEY, ALL HYPE, NO REVENUE**

> Congratulations — you raised an absolutely obscene sum on the strength of pure vibes and a founder who "thinks in trillions." You blitzscaled into fourteen countries, acquired a company that makes robotic pizza, and never once figured out how any of it produces a dollar. Your lead investor is already reframing this as "a learning experience" on an earnings call. The valuation was a number somebody said out loud once, confidently. Can you do better next time? The word you're looking for is revenue.

**🦥 Sold Too Early — CASH-OUT · valuation capped**

> Your team was so drama-free, so reasonable, so utterly free of the pathological self-belief this game demands, that the instant a mid-sized acquirer waved a check, you all said "yeah, that seems fair" and took it. You left a truly staggering amount of money on the table. Everyone got a decent payout and a company Patagonia vest. Nobody got a statue. Can you do better next time? A little delusion goes a long way.

---

## 9. Designer Quick-Reference

All tunable constants in one place (current calibrated values). Adjust, re-simulate, re-tune — balance is never right on the first pass.

| Constant | Value | Controls |
|----------|-------|----------|
| Vaporware ratio | 2.1 | Fraud busts when (Deception + Marketing) exceeds 2.1 × Tech |
| Overhype ratio | 1.4 | Overhype busts when Marketing exceeds 1.4 × Tech |
| Burn ratio | 1.0 | Runway = 1.0 × (Monetization + Money) |
| Burn base / kEgo / kTech | 30 / 0.6 / 0.3 | Burn rate formula |
| Ego implosion ceiling | 80 | Chemistry check only engages at or above this ego |
| Ego cash-out ratio | 0.55 × Potential | Sold-too-early floor |
| Masayoshi thresholds | Money>85, Mkt>65, Mon<68 | Pet-project death |
| Potential for $1T | 91.8 | Where the curve hits the cap |
| Valuation exponent | 22 | Steepness of the top end |
| Specialty synergy bonus | ×1.05 | Tech Ability when industry matches |
| Worst-IPO threshold | < $10M | Triggers the Anti-Founder ovation |

**Note:** Money currently draws only from the Investor pool plus a small set of "Already Wealthy" CEOs. When you expand the wealth data, the Burn and Masayoshi checks will shift and should be re-simulated.

---

## 10. Resolver Pseudocode (reference)

```
function resolve(track, industry, picks):
    # picks = {CEO, CTO, SWE, CMO, COO, INV}

    # Step 0: track-dependent tech value per person
    for slot in [CEO, CTO, SWE, CMO, COO]:
        base = (track == 'HW') ? picks[slot].HW : picks[slot].SW
        picks[slot].tech = base * (picks[slot].Specialty == industry ? 1.05 : 1.0)

    # Step 1: weighted team stats (INV = 0 for all non-ego/non-money)
    vision       = weighted('Vision', picks)
    marketing    = weighted('Marketing', picks)
    tech         = weighted('TechAbility', picks)   # uses picks[slot].tech
    deception    = weighted('Deception', picks)
    monetization = weighted('Monetization', picks)

    ego   = (picks.INV.type == 'Entity') ? egoEntity(picks) : egoIndividual(picks)
    money = picks.INV.Money + (isAlreadyWealthy(picks.CEO) ? picks.CEO.Money : 0)

    potential = (vision + marketing + tech + monetization) / 4

    # Step 2: death checks — score ALL, worst failure wins (no era tolerance).
    # severity 1.0 == exactly on the failing boundary; higher == worse.
    safeTech = max(tech, 1e-9)
    failures = []                                   # list of (screen, severity)

    sev = (deception + marketing) / (2.1 * safeTech)
    if sev > 1: failures.add('vaporware', sev)

    sev = marketing / (1.4 * safeTech)
    if sev > 1: failures.add('overhyped', sev)

    burn   = max(0, 30 + 0.6*ego - 0.3*tech)
    runway = 1.0 * (monetization + money)
    sev    = (runway > 0) ? burn / runway : (burn > 0 ? +inf : 0)
    if sev > 1: failures.add('bankruptcy', sev)

    if ego >= 80:                                   # ceiling; below it, never implodes
        quality = (vision + marketing + tech + monetization + min(money, 100)) / 5
        sev = ego / quality
        if sev > 1: failures.add('implosion', sev)

    if money > 85 and marketing > 65 and monetization < 68:
        sev = 1 + (68 - monetization) / 68          # always a bust
        failures.add('masayoshi', sev)

    if failures is not empty:
        return end(argmax_by_severity(failures), 0)  # worst failure wins

    cashout = ego < 0.55 * potential

    # Step 4: deterministic valuation
    val = 1000 * (potential / 91.8) ^ 22

    if cashout: val = min(val, 1.0)         # $1B cap
    val = min(val, 1000)                     # $1T cap

    # Step 5: valuation -> record, choose ending screen
    if val < 0.01:  screen = 'anti_founder'        # < $10M, survived all gates
    elif cashout:   screen = 'sold_too_early'
    else:           screen = tierScreen(val)        # kiddie-pool / unicorn / blockbuster / generational / perfect

    return end(screen, val, recordFromValuation(val))
```
