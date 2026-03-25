# 💎 SHARDFALL V2 — Chronicles of the Beyond

> *Redesigned based on real playtesting feedback to fix multiplayer solitaire, pacing, strategy depth, and player interaction.*

---

## 🔬 What Changed & Why

This version directly addresses 6 playtesting problems:

| # | Problem from V1 | Root Cause | V2 Solution |
|---|---|---|---|
| 1 | **Multiplayer solitaire** — no reason to interact | Players are self-sufficient. Market + Rifts give everything you need. Trading is never necessary. | **Rift Claims & Tolls** — extract = claim it. Others pay you 1 shard toll. **Hand Limit (10)** — forces trading/spending. **Market nerfed** — take 1 shard instead of 2. |
| 2 | **First-player advantage** — free explorer tokens + first rift access | Static turn order every round. Explorer tokens are too easy for first player. | **Rotating first player** each round. **Explorer reworked** — max 1 token per rift TYPE (5 possible total, not unlimited). |
| 3 | **Too quick / no strategy** — blindly gathering and building | 5 constructs is too easy. No barriers to rushing. No hidden goals to create tension. | **7 constructs to end game.** **Construct prerequisites** (tier gating). **Contract Cards** (secret objectives). |
| 4 | **Never reached anomalies** — game ended before bottom-half anomalies appeared | Anomalies buried in bottom half. Game ends round 7. | **8 anomalies spread evenly throughout the ENTIRE deck.** |
| 5 | **Basic visual design** — needs polish | MVP aesthetics | **UI overhaul** planned (not in this doc). |
| 6 | **No spatial/interactive elements** — just collect and build | No contention, no blocking, no territory | **Rift Claims** add pseudo-territory. **Contracts** add hidden goals. **Hand Limit** forces choices. |

---

## 📊 At a Glance

| | V1 | V2 |
|---|---|---|
| **End Condition** | 5 constructs | **7 constructs** |
| **Market Gather** | Take 2 shards | **Take 1 shard** |
| **Market Size** | 5 shards | **4 shards** |
| **Rift Claims** | None | **Extract → Claim → Toll** |
| **Hand Limit** | None | **10 shards max** |
| **Contracts** | None | **Deal 3, keep 2 (secret objectives)** |
| **Construct Tiers** | Build anything | **Must build 2 Small → Medium → Large** |
| **Anomalies** | 5, bottom half only | **8, spread throughout** |
| **Turn Order** | Fixed | **Rotating first player** |
| **Explorer Tokens** | 1 per new rift (unlimited) | **1 per rift TYPE (max 5 total)** |
| **Rift Cards** | 15 (3 per type) | **20 (4 per type)** |
| **Expected Rounds** | ~7 | **~12–15** |
| **Expected Play Time** | 20–25 min | **35–50 min** |

---

## 🧩 Components (V2)

| Component | Count | What's New? |
|---|---|---|
| 🌀 **Rift Cards** | **20** | +5 from v1 (4 per type) |
| 🃏 **Anomaly Cards** | **8** | +3 from v1, spread throughout entire deck |
| 💎 **Shard Tokens** | 80 | Same |
| 🏗️ **Construct Cards** | **24** | +6 from v1, rebalanced with tier gates |
| 🧙 **Seeker Cards** | 8 | Same but rebalanced |
| 📜 **Contract Cards** | **15** | 🆕 Secret objectives |
| 🛡️ **Guardian Tokens** | 15 | Same |
| 🧭 **Explorer Tokens** | 20 | Same but capped at 5 per player |
| 🔖 **Claim Markers** | 5 (per player color) | 🆕 For rift claiming |
| 📊 **Fracture Track** | 1 | Same |

---

## 🔥 The 3 Big New Mechanics

### 1. ⛏️ RIFT CLAIMS & TOLLS

> *The single biggest change. This mechanic turns SHARDFALL from solitaire into a negotiation game.*

**How it works:**

When you **Extract** from a rift, you automatically **Claim** it — place your colored Claim Marker on that rift card.

**The Rule:** If another player wants to Extract from a rift **you claimed**, they must **pay you a toll of 1 shard** (their choice of type) before extracting.

**Details:**
- Only **1 claim** per rift at a time — extracting **replaces** the previous claim
- The toll goes directly to the claiming player (not the supply)
- The claimer can publicly **waive the toll** ("Extract for free, but you owe me a favor")
- **Claims CAN change within a round** — if Player B extracts from a rift Player A claimed, B pays A's toll, then B becomes the new claimer
- At the **end of each round** (after stability check), all remaining claims are cleared
- Exception: The **Toll Fortress** construct makes your claims persist for 2 rounds

**Why this works:**
- Creates **negotiation** every single turn: "Can I extract from your rift? What do you want?"
- Creates **territory**: You're incentivized to claim rifts that others need
- Creates **deals & alliances**: "Waive my toll and I'll stabilize your rift"
- Creates **strategic extraction**: Claiming the right rift at the right time matters

**Example interaction:**
> *Alice claims the Ember Rift. Bob needs Ember shards for his construct. He has two choices:*
> 1. *Pay Alice 1 shard (her choice: she asks for a Tide shard she needs)*
> 2. *Negotiate: "I'll stabilize the Void Rift next turn if you waive my toll"*
> 3. *Extract from a different rift instead (but he doesn't need those shards...)*
>
> *This creates a real conversation every turn. V1 had zero reason for this.*

---

### 2. 📜 CONTRACT CARDS (Secret Objectives)

> *Hidden goals that force diverse strategies and create tension.*

At setup, deal **3 Contract Cards** face-down to each player. They look privately and **keep exactly 2**, discarding 1 to the bottom of the contract deck.

**At game end:**
- **Completed** contracts score their VP value (3–8 VP)
- **Failed** contracts lose **−2 VP** each

**Important:** Contracts are **SECRET**. Other players don't know what you're trying to accomplish. This creates information asymmetry and deception.

### Example Contracts:

| Contract | Requirement | VP |
|---|---|---|
| 🛡️ **The Guardian** | Have 5+ Guardian Tokens at game end | 6 |
| 🧭 **Universal Explorer** | Discover all 5 rift types (1 Explorer Token per type) | 8 |
| 💰 **Essence Hoarder** | End with exactly 10 shards (hand limit) | 5 |
| 🏗️ **Master Builder** | Build at least 2 Large Constructs | 7 |
| 🤝 **Toll Collector** | Earn 5+ shards from tolls during the game | 5 |
| 🌀 **Rift Warden** | Stabilize 4+ different rifts during the game | 6 |
| 🎯 **Specialist** | Have 8+ shards of a single type at game end | 4 |
| 💎 **Rainbow** | End with at least 2 of each shard type | 7 |
| ♻️ **Trader** | Complete 6+ trades (bank or player) during the game | 5 |
| 🌋 **Ember Lord** | Extract from 3+ different Ember Rifts | 4 |
| 🌊 **Tide Lord** | Extract from 3+ different Tide Rifts | 4 |
| 💀 **Daredevil** | Deep Extract 3+ times during the game | 5 |
| 🏰 **Fortress** | Build 3+ Constructs with abilities (not pure VP) | 6 |
| 🌍 **World Saver** | Fracture is 2 or less at game end | 8 |
| ⚡ **Speed Builder** | Be the first player to build a Large Construct | 3 |

**Why this works:**
- Players have **different hidden goals** → can't just copy the leader
- Some contracts reward **interaction** (Toll Collector, Trader)
- Some contracts reward **contribution** (World Saver, Rift Warden)
- Creates **bluffing**: "Why is she stabilizing so much? Is she going for World Saver?"
- Failed contracts create **risk**: Keep ambitious ones or play it safe?

---

### 3. ✋ HAND LIMIT (10 Shards)

> *The simplest change with the biggest ripple effect.*

**Rule:** You may never hold more than **10 shard tokens** at any time.

If you would gain shards that put you over 10, you must **immediately** either:
1. **Discard** excess to the supply, OR
2. **Trade** with any player (any agreed ratio) to stay at/below 10, OR
3. **Build** a construct to spend some (if it's your turn and you have actions)

**Why this works:**
- **Prevents hoarding** — you can't just stockpile 20+ shards and build whatever
- **Forces decisions** — do you trade, spend, or discard? Every turn matters
- **Incentivizes trading** — trading is better than discarding
- **Slows down rushing** — can't amass huge reserves to rush constructs
- **Creates interesting timing** — extract when you have room, build when you're full

---

## 🎬 Game Setup (V2)

### Step 1: Build the Rift Deck
Take all **20 Rift Cards** and **8 Anomaly Cards**. Shuffle everything together into one deck. *(Anomalies are no longer buried — they appear throughout the game.)*

### Step 2: Shard Market
Bag all 80 shards. Draw **4** face-up → Shard Market.

### Step 3: Construct Display
Shuffle **24 Construct Cards**. Deal **5 face-up** → Construct Display.

### Step 4: Contract Cards 🆕
Shuffle **15 Contract Cards**. Deal **3 face-down** to each player. Each player keeps **2**, discards 1 face-down to the bottom.

### Step 5: Seekers
Deal 2 Seeker Cards to each player, keep 1.

### Step 6: Starting Rifts
Flip **3 Rift Cards** from the deck (if Anomaly, resolve + flip again). These are the starting active rifts.

### Step 7: First Player
Choose randomly. This rotates each round.

> **📌 V2 Setup Checklist:**
> - ✅ 20 Rifts + 8 Anomalies shuffled together (ONE deck)
> - ✅ 4 shards in market
> - ✅ 5 constructs in display
> - ✅ Each player has 2 secret Contracts
> - ✅ Each player has 1 Seeker
> - ✅ 3 starting rifts active
> - ✅ Each player gets their Claim Markers
> - ✅ Fracture at 0

---

## 🔄 Round Structure (V2)

```
┌──────────────────────────────────────────────────┐
│              ROUND STRUCTURE (V2)                 │
├──────────────────────────────────────────────────┤
│                                                   │
│  ① RIFTFALL                                       │
│     → Reveal 1 card from the deck                 │
│     → If Rift → add to active rifts               │
│     → If Anomaly → resolve it, draw another       │
│                                                   │
│  ② SEEKER TURNS (starting from first player)      │
│     → Each player takes 2 actions (clockwise)     │
│     → First player ROTATES each round 🆕          │
│                                                   │
│  ③ STABILITY CHECK                                │
│     → Collapse rifts at stability 0               │
│     → Fracture +1 per collapse                    │
│                                                   │
│  ④ CLEANUP 🆕                                     │
│     → Clear all Rift Claims                       │
│     → Check hand limits (discard if > 10)         │
│     → Underdog bonus: player(s) with fewest       │
│       constructs draw 1 free shard from bag       │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

## 🎯 Your Turn: 2 Actions (V2)

### The 5 Actions

#### 1. 💎 GATHER — Take 1 Shard from Market *(nerfed)*

Take **1 shard** (was 2 in V1) from the face-up market. Market refills from bag.

> **Why nerfed:** In V1, Gather was too strong — you got 2 free shards with no risk. Now it's a safe-but-slow option. Extract is the primary shard source, but it has a cost (stability) and creates claims. This tradeoff forces meaningful decisions.

#### 2. ⛏️ EXTRACT — Harvest from a Rift *(now with Claims & Tolls)*

Choose an active rift. **If another player has claimed it**, you must pay them **1 shard toll** first (or negotiate a waiver).

| Extract Type | Shards Gained | Base Stability Cost |
|---|---|---|
| **Safe Extract** | 2 shards of that rift's type | Stability −1 |
| **Deep Extract** | 4 shards of that rift's type | Stability −2 |

**⚠️ IMPORTANT: You can only extract if the rift has enough stability to pay the FULL cost.** If a rift has 1 stability, you can Safe Extract (costs 1), but Deep Extract is blocked (needs 2). If your rift sensitivity adds to the cost, you may need even more stability.

After extracting, **place your Claim Marker** on the rift. You now own the claim.

**Explorer Token:** First time you extract from each rift **TYPE** (not each card!), gain 1 Explorer Token. Max 5 per player (1 per type). *(V1 gave unlimited per new rift card — major first-player advantage.)*

**🧩 Rift Sensitivity (anti-runaway):**

The more constructs you've built, the MORE stability each Extract costs. This prevents the leader from freely extracting:

| Constructs Built | Extra Cost | Total Safe Cost | Total Deep Cost |
|---|---|---|---|
| 0–2 | +0 | 1 stability | 2 stability |
| 3 | +1 | 2 stability | 3 stability |
| 4 | +2 | 3 stability | 4 stability |
| 5+ | +3 | 4 stability | 5 stability |

> **Example:** You have 4 constructs. A rift has 3 stability. Safe Extract costs 1 + 2 = **3 stability** → the rift drops to 0 and will collapse at end of round! Deep Extract would cost 2 + 2 = **4 stability** → BLOCKED (rift only has 3). The leader must stabilize rifts before extracting, or use the market instead.

#### 3. 🏗️ BUILD — Construct with Tier Requirements 🆕

Choose a Construct from the display. Pay its shard cost. Place in front of you.

**🆕 TIER GATING:**

| You Want To Build... | You Must First Have... |
|---|---|
| Small Construct | *(no requirement)* |
| Medium Construct | At least **2 Small** Constructs built |
| Large Construct | At least **2 Small** + **1 Medium** built |

This prevents rushing. You can't jump to a 7-VP Large Construct on turn 3. You must invest in foundation first.

> **Why this matters:** In V1, the optimal strategy was to gather/extract aggressively and rush to big constructs. There was no reason to build small first. Now, small constructs (which have useful abilities) are prerequisites, creating a natural game arc: **early game** (build abilities) → **mid game** (use abilities to gather efficiently) → **late game** (build large constructs for VP).

#### 4. 🛡️ STABILIZE — Spend any shards to heal a rift

Spend **2 shards of ANY type(s)** → Rift stability +1 → Gain **1 Guardian Token**.

The shards can be any mix of types — the game automatically spends your most abundant shard type first to minimize strategic loss. The shards return to the supply.

> **Why any type?** Stabilizing is a selfless group act (prevents fracture). Making it require specific types would make it too restrictive when the whole group needs someone to stabilize.

#### 5. 🤝 TRADE — Enhanced 🆕

| Trade Type | Rate | When Available |
|---|---|---|
| **Player Trade** | Any agreed ratio | Always — negotiate freely |
| **Bank Trade** | 3:1 | Always |

**🆕 Toll Income counts as a "trade" for Contract purposes.**

> **Why player trades matter now:** With a hand limit of 10, you NEED to spend shards efficiently. With Gather nerfed to 1, you can't self-serve. You'll frequently have 6 Ember and need 2 Tide — trading with a player who has excess Tide is the only efficient path. In V1, you could just gather from the market. In V2, scarcity is real.

---

## ✋ Hand Limit — The Critical Rule

**You may never hold more than 10 shards.**

This is checked:
- ✅ After every Gather
- ✅ After every Extract
- ✅ After receiving a Toll payment
- ✅ During Cleanup phase

If you exceed 10, you must **immediately** resolve it:
1. Discard excess to supply (worst option — wasted resources)
2. Trade with any player at any ratio (better — benefits both)
3. Build a construct if possible and it's your turn (best — spend them!)

> **💡 Strategic Depth:** The hand limit creates a constant tension. Do you hold 8 shards and Extract (might go to 10-12, forcing discard)? Or Build first to make room? Do you trade 2 excess shards to a player who needs them? The limit makes EVERY turn a real decision.

---

## 🃏 Anomaly Cards (V2) — Spread Throughout

**8 anomaly cards**, shuffled into the ENTIRE deck (not buried at the bottom).

| Anomaly | Effect | Type |
|---|---|---|
| 🌋 **Dimensional Surge** | All rifts lose 1 stability | Dangerous |
| 🎁 **Shard Rain** | All players gain 2 random shards from bag | Helpful |
| 🔄 **Reality Shift** | Replace all constructs in display with new ones | Chaotic |
| ⚡ **Rift Storm** | Lowest-stability rift collapses immediately | Dangerous |
| 💫 **Dimensional Calm** | All rifts gain 1 stability (up to max) | Helpful |
| 🤝 **Convergence** 🆕 | Each player secretly votes: contribute 2 shards (reduce Fracture by 1) or keep. Reveal simultaneously. Contributor(s) gain 1 Guardian Token. | Social |
| 🎭 **Market Surge** 🆕 | Refill market to 6 shards (instead of 4). Players take turns taking 1 free shard. | Helpful |
| 🌀 **Rift Merge** 🆕 | Two lowest-stability rifts of DIFFERENT types merge — remove both, create a new "Dual Rift" with combined stability. Dual Rifts produce EITHER shard type when extracted. | Strategic |

All of these happen throughout the game, creating drama from round 1 to round 15.

---

## 🏗️ Construct Cards (V2) — Rebalanced

### ⭐ Small Constructs (Cost: 3–4 shards, 2–3 VP)

| Construct | Cost | VP | Ability |
|---|---|---|---|
| **Shard Lens** | 🔴🔴🔵 | 2 | Gather takes **2 shards** instead of 1 |
| **Drift Anchor** | 🟢🟢🟡 | 2 | Stabilize costs **1 shard** instead of 2 |
| **Trade Post** | 🔵🟢🟡 | 2 | Bank trades at **2:1** |
| **Warden's Seal** | 🔴🔵🟢🟡 | 3 | No ability — diverse cost |
| **Compass Stone** | 🟣🟣 | 2 | Gain 1 Explorer Token on build |
| **Shard Forge** | 🔴🔴🔴 | 2 | Once per round, convert 1 shard to any type |
| **Echo Chamber** | 🟣🟣🔴 | 3 | No ability |
| **Toll Gate** 🆕 | 🟡🟡🔵 | 2 | Tolls you collect are **2 shards** instead of 1 |
| **Scout Tower** 🆕 | 🟢🔵🟣 | 2 | Peek at top 2 cards of rift deck at start of your turn |

### ⭐⭐ Medium Constructs (Cost: 5–6 shards, 4–5 VP) — *Requires 2 Small*

| Construct | Cost | VP | Ability |
|---|---|---|---|
| **Rift Engine** | 🔴🔴🔵🔵🟣 | 4 | Extracts cost 1 less stability |
| **Harmony Spire** | 🟢🟢🟡🟡🔵 | 5 | No ability |
| **Crystal Bastion** | 🔵🔵🟢🟢🟡🟡 | 5 | Hand limit raised to **12** |
| **Storm Harvester** | 🟡🟡🟡🔴🟣 | 4 | No ability |
| **Alliance Hall** | 🔴🔵🟢🟡🟣 | 5 | No ability — requires all 5 types |
| **Toll Fortress** 🆕 | 🔴🔴🟡🟡🟣 | 4 | Claims you make persist through **2 rounds** (not cleared in cleanup) |
| **Market Engine** 🆕 | 🔵🔵🟢🟢🔴 | 4 | When you Gather, take **1 extra** shard from the bag (random) |

### ⭐⭐⭐ Large Constructs (Cost: 7+ shards, 6–8 VP) — *Requires 2 Small + 1 Medium*

| Construct | Cost | VP | Ability |
|---|---|---|---|
| **Nexus Spire** | 🔴🔴🔵🔵🟢🟢🟣 | 7 | Stabilize gives **2 Guardian Tokens** |
| **World Anchor** | 🟡🟡🟡🟡🔴🔴🔵 | 6 | If Fracture ≤ 2 at end, gain **+4 VP** |
| **Guardian Citadel** | 🔵🔵🔵🟢🟢🟢🟣 | 7 | Guardian Tokens worth **2 VP each** |
| **Explorer's Atlas** | 🟡🟡🔴🔴🟢🟢🟣 | 7 | Explorer Tokens worth **2 VP each** |
| **Dimensional Forge** | 🔴🔴🔵🔵🟢🟢🟡🟡🟣🟣 | 8 | Legendary — pure VP |
| **Toll Empire** 🆕 | 🟡🟡🟡🔴🔴🔵🔵 | 6 | At game end, gain **+1 VP per toll collected** during game |

---

## 🏆 Scoring (V2)

### End Game Triggers (any one — finish the round)

| Trigger | Change from V1 |
|---|---|
| 🏗️ **7th Construct** built | Was 5th — now takes longer |
| 💀 **Fracture Threshold** | Same |
| 🌀 **Rift Deck Empty** | Same, but deck is larger (28 cards) |

### Scoring Breakdown

| Category | Points | Details |
|---|---|---|
| 🏗️ Constructs | 2–8 per card | VP printed on card |
| 🛡️ Guardian Tokens | 1 VP each | (2x if have Guardian Citadel) |
| 🧭 Explorer Tokens | 1 VP each | Max 5 per player (2x if have Explorer's Atlas) |
| 💎 Shard Sets | +3 (1 of each) / +8 (2 of each) | Same as V1 |
| 📜 Contracts | +3 to +8 each | Completed = score; Failed = −2 VP each |
| 👑 Most Guardians | +5 VP bonus | Tie = no one gets it |
| 👑 Most Explorers | +5 VP bonus | Tie = no one gets it |
| 💀 Fracture Penalty | −5 VP all | If game ended by Fracture |
| 🌍 World Anchor bonus | +4 VP | If Fracture ≤ 2 (requires the Construct) |
| 🏰 Toll Empire bonus | +1 VP per toll collected | (requires the Construct) |

---

## 🧠 How V2 Fixes Each Problem (Detailed)

### Problem 1: "Multiplayer Solitaire"

**V1:** Players independently gather from market and extract from rifts. No reason to talk.

**V2 fix — 3 interaction pressure points:**

```
  RIFT CLAIMS          HAND LIMIT           SCARCITY
     ⬇                    ⬇                   ⬇
  "Pay me 1 shard     "I'm at 10 shards,  "Market only gives 1.
   to use my rift"     I NEED to trade      I need Tide but
                        or I discard"       only Ember is here"
     ⬇                    ⬇                   ⬇
  NEGOTIATION          FORCED TRADES        DEPENDENCY
     ⬇                    ⬇                   ⬇
  ┌──────────────────────────────────────────────┐
  │         REAL PLAYER INTERACTION              │
  └──────────────────────────────────────────────┘
```

In a typical V2 turn, a player will:
- Check if the rift they want is claimed (negotiate toll)
- Extract and potentially go over hand limit (need to trade away excess)
- Consider what other players need (for leverage in negotiations)
- Factor in their secret contracts (hidden information creates intrigue)

### Problem 2: "First Player Advantage"

**V1:** Player 1 always gets first pick of rifts and explorer tokens.

**V2 fix:**
- First player **rotates** each round — everyone gets first pick equally
- Explorer tokens are **max 1 per rift TYPE** (not per card) — first-time value is diluted
- The **Underdog bonus** (free shard for trailing players) helps compensate

### Problem 3: "Too Quick / No Strategy"

**V1:** Gather 2 + Extract = flood of shards → build 5 constructs in ~7 rounds.

**V2 fix:**
- Gather is **nerfed to 1** — slower income
- **Tier gating** — must build 2 Small → Medium → Large
- **7 constructs** to end (not 5) — much longer game
- **Contracts** add a second strategic layer (optimize for hidden goals)
- **Hand limit** prevents blind accumulation — must make efficient spending decisions

**Expected V2 game arc:**
```
Rounds 1-4:   Build 2-3 Small Constructs (foundation)
Rounds 5-8:   Build 1-2 Medium Constructs (engine)
Rounds 9-12:  Build 1-2 Large Constructs (VP push)
Rounds 12-15: Final positioning, contract completion
```

### Problem 4: "Never Reached Anomalies"

**V1:** 5 anomalies in bottom half of a 20-card deck. Game ends at round 7.

**V2:** 8 anomalies spread throughout a 28-card deck (20 rifts + 8 anomalies). On average, **an anomaly appears every 3-4 rounds**. Players will see 3-5 anomalies per game.

### Problem 5: "Visual Design"

This is a UI/code issue, not a rules issue. A future sprint should focus on:
- Premium card borders with type-colored gradients
- Rift claim visualization (colored borders/overlays)
- Particle effects on extraction animation
- Animated toll payment between players
- Contract card reveal animations at game end
- Better mobile responsive layout
- Sound design (optional)

### Problem 6: "Add More Elements / Too Simple"

**V2 adds without overcomplicating:**
- **Rift Claims + Tolls** — simple rule, massive interaction depth
- **Contracts** — 2 secret cards, checked at end
- **Tier Gating** — 1 simple rule that changes the entire game arc
- **Hand Limit** — 1 number (10) that creates constant tension
- **Convergence Anomaly** — prisoner's dilemma moment (dramatic!)
- **Rift Merge** — creates exciting new rifts mid-game

None of these require learning new action types. The same 5 actions exist (Gather, Extract, Build, Stabilize, Trade) — they just have more consequences now.

---

## 📐 Quick Reference Card (V2)

### Setup
```
1. Shuffle 20 Rifts + 8 Anomalies (ALL together, no separation)
2. Fill Shard bag, draw 4 → Market
3. Shuffle Constructs, reveal 5 → Display
4. Deal 3 Contracts each, keep 2
5. Deal 2 Seekers each, keep 1
6. Fracture Track → 0
7. Reveal 3 starting Rifts
8. Choose first player (rotates each round)
```

### Your Turn = 2 Actions
```
💎 GATHER     → Take 1 shard from Market
⛏️ EXTRACT    → Take shards from a Rift (pay toll if claimed)
                Safe: 2 shards, stability -1
                Deep: 4 shards, stability -2
                → YOU NOW CLAIM this rift
🏗️ BUILD      → Spend shards → Construct (tier gate!)
                Need: 2 Small → Medium, 2S+1M → Large
🛡️ STABILIZE  → Spend 2 shards → Rift +1, earn Guardian Token
🤝 TRADE      → Player: any ratio. Bank: 3:1
```

### Key V2 Rules
```
✋ HAND LIMIT   → Max 10 shards. Over? Discard, trade, or build.
🔖 CLAIMS      → Extract = claim rift. Others pay 1 shard toll.
📜 CONTRACTS   → 2 secret objectives. +3-8 VP / -2 VP each.
🏗️ TIER GATE   → 2 Small → Medium. 2S+1M → Large.
🔄 FIRST PLAYER ROTATES each round.
🧭 EXPLORER    → Max 1 per rift TYPE (5 max total).
```

### End Game (any trigger, finish round)
```
🏗️ Any player builds 7th Construct
💀 Fracture reaches threshold
🌀 Rift deck empty
```

---

## 💡 Design Philosophy: Why V2 Works

### The Interaction Triangle

Every good multiplayer game has THREE things that force players to interact:

```
          SCARCITY
         /         \
        /     🔺     \
       /   TENSION    \
      /                \
   CONTENTION ——— INFORMATION
```

**V1 had none of these:**
- No scarcity (market gave unlimited shards)
- No contention (anyone could extract from any rift freely)
- No information asymmetry (no hidden goals)

**V2 has all three:**
- **Scarcity**: Gather gives 1 shard. Hand limit is 10. You can't be self-sufficient.
- **Contention**: Rift claims make extraction contested. Construct tier gating slows everyone.
- **Information**: Contract cards create hidden goals. "Why is she hoarding Ember shards?"

When all three exist simultaneously, player interaction is **inevitable, not optional**.

---

## 🔧 V2 Variants

### 🌱 Beginner Mode (Learning Game)
- Remove Contracts (too much to track while learning)
- No toll system (simpler)
- Hand limit 12 instead of 10
- End at 5 constructs (quicker)

### ⚡ Speed Mode
- Start with 4 rifts instead of 3
- End at 5 constructs
- No tier gating

### 🏆 Expert Mode
- Hand limit of 8 (brutal scarcity)
- Tolls cost 2 shards instead of 1
- Failed contracts = −4 VP (very punishing)
- Add a "Sabotage" action: spend 2 shards to reduce a rift's stability by 1 (aggressive play)

---

## 🗺️ Future Considerations (V3?)

- **Physical Board**: A hex grid or network map where rifts appear at locations. Players move pawns. Adjacent players can trade 1:1. Creates real spatial strategy.
- **Asymmetric Rift Powers**: Each rift card has a unique bonus effect when extracted (not just shards). "Ember Rift #2: Gain 1 free stabilization."
- **Player Powers that evolve**: Level-up system where your Seeker gets stronger as you complete contracts.
- **Team Mode**: 4 players in 2v2 teams sharing resources and strategies.
- **Legacy Mode**: Persistent changes between games (unlock new constructs, rifts, seekers).

---

*SHARDFALL V2 was redesigned from real playtesting feedback. The core of the game is the same — 5 simple actions, dimensional rifts, crystal shards. But now every turn is a conversation, every shard is a decision, and every player matters.*
