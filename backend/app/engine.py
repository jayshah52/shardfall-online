"""
SHARDFALL V2 — Game Engine
Core game logic: rift claims/tolls, hand limit, contracts, tier gating,
rotating first player, anomalies throughout, enhanced scoring.
"""
import random
import uuid
from .constants import (
    SHARD_TYPES, RIFT_CARDS, ANOMALY_CARDS, CONSTRUCT_CARDS,
    SEEKER_CARDS, CONTRACT_CARDS, FRACTURE_THRESHOLDS, SHARD_ICONS,
    PLAYER_COLORS, HAND_LIMIT, CONSTRUCTS_END_COUNT, MARKET_SIZE,
    GATHER_COUNT, STARTING_RIFTS, CONSTRUCT_DISPLAY_SIZE,
)


class ShardFallEngine:
    def __init__(self, player_names: list[str]):
        assert 2 <= len(player_names) <= 5
        self.game_id = str(uuid.uuid4())[:8]
        self.player_count = len(player_names)
        self.phase = "setup"  # setup | contracts | playing | discard | game_over
        self.round_num = 0
        self.current_player = 0
        self.actions_remaining = 0
        self.extracts_this_turn = 0
        self.game_end_trigger = None
        self.first_player_offset = 0  # rotates each round
        self.first_large_builder = None  # track for Speed Builder contract
        self.discard_required = 0  # shards to discard

        # Players
        self.players = []
        for i, name in enumerate(player_names):
            self.players.append({
                "index": i, "name": name, "color": PLAYER_COLORS[i],
                "seeker": None, "seeker_choices": [],
                "shards": {t: 0 for t in SHARD_TYPES},
                "constructs": [],
                "guardian_tokens": 0, "explorer_tokens": 0,
                "explored_types": [],  # rift types discovered (max 5)
                "contracts": [], "contract_choices": [],
                "free_stabilize_used": False,
                "shard_convert_used": False,
                # V2 tracking for contracts
                "tolls_collected": 0,
                "rifts_stabilized": [],  # rift IDs stabilized
                "trades_completed": 0,
                "rift_extracts": {},  # type -> set of rift IDs extracted from
                "deep_extracts": 0,
                "milestones": [], # New! Track achievements
            })

        # Rift deck — ALL shuffled together (anomalies throughout)
        rift_cards = [dict(c) for c in RIFT_CARDS]
        anomaly_cards = [{"is_anomaly": True, **a} for a in ANOMALY_CARDS]
        self.rift_deck = rift_cards + anomaly_cards
        random.shuffle(self.rift_deck)

        self.active_rifts = []
        self.supply = {t: 16 for t in SHARD_TYPES}
        self.shard_market = []
        construct_cards = [dict(c) for c in CONSTRUCT_CARDS]
        # Tier-structured deck: smalls on top, mediums in middle, larges at bottom
        # This ensures early rounds have buildable constructs (tier gating friendly)
        smalls = [c for c in construct_cards if c["tier"] == "small"]
        mediums = [c for c in construct_cards if c["tier"] == "medium"]
        larges = [c for c in construct_cards if c["tier"] == "large"]
        random.shuffle(smalls)
        random.shuffle(mediums)
        random.shuffle(larges)

        # Mix 1-2 mediums into the top section so players see medium options early
        # More players = more smalls needed before mediums appear
        early_medium_count = 2 if self.player_count <= 3 else 1
        early_mediums = mediums[:early_medium_count]
        late_mediums = mediums[early_medium_count:]

        # Top section: all smalls + a few mediums (shuffled together)
        top_section = smalls + early_mediums
        random.shuffle(top_section)

        # Bottom section: mix of all remaining mediums and ALL larges!
        bottom_section = late_mediums + larges
        random.shuffle(bottom_section)

        # Deck: pop() draws from end, so top_section must be at end
        # Bottom (drawn last) → Top (drawn first)
        self.construct_deck = bottom_section + top_section
        self.construct_display = []
        self.fracture = 0
        self.fracture_threshold = FRACTURE_THRESHOLDS[self.player_count]
        self.last_collapse_player = None
        self.activity_log = []

        # Claim tracking: rift_id -> {"player": idx, "rounds_left": 1 or 2}
        self.rift_claims = {}

        # Contract deck
        self.contract_deck = [dict(c) for c in CONTRACT_CARDS]
        random.shuffle(self.contract_deck)

        # Init
        self._deal_seekers()
        self._fill_shard_market()
        self._fill_construct_display()
        self._reveal_starting_rifts()

    # === SETUP HELPERS ===

    def _deal_seekers(self):
        seekers = [dict(s) for s in SEEKER_CARDS]
        random.shuffle(seekers)
        for p in self.players:
            if len(seekers) >= 2:
                p["seeker_choices"] = [seekers.pop(), seekers.pop()]
            else:
                p["seeker_choices"] = [seekers.pop()]

    def _deal_contracts(self):
        for p in self.players:
            choices = []
            for _ in range(3):
                if self.contract_deck:
                    choices.append(self.contract_deck.pop())
            p["contract_choices"] = choices

    def _draw_shard_from_supply(self):
        available = [t for t in SHARD_TYPES if self.supply[t] > 0]
        if not available:
            return None
        chosen = random.choice(available)
        self.supply[chosen] -= 1
        return chosen

    def _return_shard_to_supply(self, shard_type):
        self.supply[shard_type] += 1

    def _fill_shard_market(self):
        while len(self.shard_market) < MARKET_SIZE:
            s = self._draw_shard_from_supply()
            if s is None:
                break
            self.shard_market.append(s)

    def _fill_construct_display(self):
        while len(self.construct_display) < CONSTRUCT_DISPLAY_SIZE and self.construct_deck:
            self.construct_display.append(self.construct_deck.pop())

    def _reveal_starting_rifts(self):
        for _ in range(STARTING_RIFTS):
            self._reveal_rift(silent=True)

    def _reveal_rift(self, silent=False):
        if not self.rift_deck:
            return None
        card = self.rift_deck.pop(0)
        if card.get("is_anomaly"):
            if not silent:
                self._log("anomaly", f"⚡ ANOMALY: {card['name']} — {card['description']}", card)
                self._resolve_anomaly(card)
            return self._reveal_rift(silent)
        # No Rift Cap: allow rifts to spawn naturally so players aren't forced to destroy their own rifts

        rift = {
            "id": card["id"], "type": card["type"],
            "stability": card["max_stability"], "max_stability": card["max_stability"],
            "explored_by": [],
            "destabilized_by": None,
        }
        self.active_rifts.append(rift)
        if not silent:
            self._log("rift", f"🌀 New Rift: {card['type'].title()} (Stability {card['max_stability']})")
        return rift

    def _resolve_anomaly(self, anomaly):
        aid = anomaly["id"]
        if aid == "dimensional_surge":
            for rift in self.active_rifts:
                rift["stability"] = max(0, rift["stability"] - 1)
        elif aid == "shard_rain":
            for p in self.players:
                for _ in range(2):
                    s = self._draw_shard_from_supply()
                    if s:
                        p["shards"][s] += 1
            self._log("info", "🎁 All players received 2 random Shards!")
        elif aid == "reality_shift":
            for c in self.construct_display:
                self.construct_deck.append(c)
            self.construct_display.clear()
            random.shuffle(self.construct_deck)
            self._fill_construct_display()
            self._log("info", "🔄 Construct display replaced!")
        elif aid == "rift_storm":
            if self.active_rifts:
                lowest = min(self.active_rifts, key=lambda r: r["stability"])
                self._log("danger", f"⚡ Rift Storm! {lowest['type'].title()} Rift collapses!")
                self._collapse_rift(lowest)
        elif aid == "dimensional_calm":
            for rift in self.active_rifts:
                rift["stability"] = min(rift["max_stability"], rift["stability"] + 1)
            self._log("info", "💫 Dimensional Calm — all Rifts healed +1!")
        elif aid == "convergence":
            contributors = 0
            for p in self.players:
                total = sum(p["shards"].values())
                if total >= 2:
                    # Auto-contribute: remove 2 most abundant
                    removed = 0
                    for t in sorted(SHARD_TYPES, key=lambda x: p["shards"][x], reverse=True):
                        while removed < 2 and p["shards"][t] > 0:
                            p["shards"][t] -= 1
                            self._return_shard_to_supply(t)
                            removed += 1
                    p["guardian_tokens"] += 1
                    contributors += 1
            self.fracture = max(0, self.fracture - contributors)
            self._log("info", f"🤝 Convergence: {contributors} player(s) contributed! Fracture −{contributors}")
        elif aid == "market_surge":
            while len(self.shard_market) < 6:
                s = self._draw_shard_from_supply()
                if s is None:
                    break
                self.shard_market.append(s)
            for p in self.players:
                s = self._draw_shard_from_supply()
                if s:
                    p["shards"][s] += 1
            self._log("info", "🎭 Market Surge! Market expanded, each player got 1 free shard!")
        elif aid == "rift_merge":
            if len(self.active_rifts) >= 2:
                sorted_rifts = sorted(self.active_rifts, key=lambda r: r["stability"])
                removed = sorted_rifts[0]
                boosted = sorted_rifts[1]
                self.active_rifts.remove(removed)
                self.rift_claims.pop(str(removed["id"]), None)
                boosted["stability"] = min(boosted["max_stability"], boosted["stability"] + 2)
                self._log("info",
                    f"🌀 Rift Merge! {removed['type'].title()} Rift removed, "
                    f"{boosted['type'].title()} Rift gains +2 stability!")

    def _collapse_rift(self, rift):
        # Attribute collapse to the player who destabilized it
        blamed = rift.get("destabilized_by")
        if blamed is not None:
            blame_name = self.players[blamed]["name"]
            self._log("danger", f"💥 {rift['type'].title()} Rift COLLAPSED! {blame_name} destabilized it! Fracture +1")
            self.last_collapse_player = blamed
        else:
            self._log("danger", f"💥 {rift['type'].title()} Rift COLLAPSED! Fracture +1")
            self.last_collapse_player = self.current_player

        # Backlash: all players lose 1 shard of that type
        for p in self.players:
            if self._player_seeker_power(p) == "no_backlash":
                continue
            if p["shards"].get(rift["type"], 0) > 0:
                p["shards"][rift["type"]] -= 1
                self._return_shard_to_supply(rift["type"])
                self._log("danger", f"⚡ {p['name']} lost 1 {SHARD_ICONS[rift['type']]} (backlash)")

        self.active_rifts.remove(rift)
        self.rift_claims.pop(str(rift["id"]), None)
        self.fracture += 1

    def _log(self, log_type, message, data=None):
        self.activity_log.append({
            "type": log_type, "message": message,
            "round": self.round_num, "player": self.current_player, "data": data,
        })
        if len(self.activity_log) > 60:
            self.activity_log = self.activity_log[-60:]

    def _player_has_ability(self, player, ability):
        return any(c.get("ability") == ability for c in player["constructs"])

    def _player_seeker_power(self, player):
        return player["seeker"]["power"] if player["seeker"] else None

    def _get_hand_limit(self, player):
        if self._player_has_ability(player, "hand_limit_up"):
            return HAND_LIMIT + 2
        return HAND_LIMIT

    def _get_total_shards(self, player):
        return sum(player["shards"].values())

    def _get_rift_sensitivity(self, player):
        n = len(player["constructs"])
        return max(0, n - 2)

    def _get_trade_rate(self, player):
        if self._player_seeker_power(player) == "trade_discount":
            return 2
        if self._player_has_ability(player, "trade_discount"):
            return 2
        return 3

    def _get_gather_count(self, player):
        base = GATHER_COUNT
        if self._player_has_ability(player, "gather_bonus"):
            base = 2
        return base

    def _get_stabilize_cost(self, player):
        return 1 if self._player_has_ability(player, "stabilize_discount") else 2

    def _get_actions_per_turn(self, player):
        return 3 if self._player_seeker_power(player) == "extra_action" else 2

    def _get_toll_amount(self, claimer):
        return 2 if self._player_has_ability(claimer, "toll_bonus") else 1

    def _count_constructs_by_tier(self, player, tier):
        return sum(1 for c in player["constructs"] if c["tier"] == tier)

    def _can_build_tier(self, player, tier):
        if tier == "small":
            return True
        if tier == "medium":
            return self._count_constructs_by_tier(player, "small") >= 2
        if tier == "large":
            return (self._count_constructs_by_tier(player, "small") >= 2 and
                    self._count_constructs_by_tier(player, "medium") >= 1)
        return False

    def _check_hand_limit(self, player):
        limit = self._get_hand_limit(player)
        total = self._get_total_shards(player)
        if total > limit:
            self.discard_required = total - limit
            return True
        return False

    # === PUBLIC API ===

    def choose_seeker(self, player_index: int, choice_index: int):
        p = self.players[player_index]
        if p["seeker"] is not None:
            return {"error": "Seeker already chosen"}
        if choice_index < 0 or choice_index >= len(p["seeker_choices"]):
            return {"error": "Invalid choice"}
        p["seeker"] = p["seeker_choices"][choice_index]
        self._log("info", f"🧙 {p['name']} chose {p['seeker']['name']}!")
        if all(pl["seeker"] is not None for pl in self.players):
            self._deal_contracts()
            self.phase = "contracts"
            self.current_player = 0
        return self.get_state()

    def choose_contracts(self, player_index: int, chosen_indices: list[int]):
        p = self.players[player_index]
        if len(p["contracts"]) > 0:
            return {"error": "Contracts already chosen"}
        if len(chosen_indices) != 2:
            return {"error": "Must choose exactly 2 contracts"}
        if any(i < 0 or i >= len(p["contract_choices"]) for i in chosen_indices):
            return {"error": "Invalid contract index"}
        p["contracts"] = [p["contract_choices"][i] for i in chosen_indices]
        self._log("info", f"📜 {p['name']} chose their secret contracts!")
        if all(len(pl["contracts"]) > 0 for pl in self.players):
            self._start_game()
        else:
            self.current_player = player_index + 1
        return self.get_state()

    def _start_game(self):
        self.phase = "playing"
        self.round_num = 1
        self.first_player_offset = 0
        self.current_player = 0
        p = self.players[0]
        self.actions_remaining = self._get_actions_per_turn(p)
        self.extracts_this_turn = 0
        self._log("info", f"🎮 Game started! Round 1 — {p['name']}'s turn")

    def do_action(self, action: str, params: dict = None):
        if self.phase == "discard":
            if action != "discard":
                return {"error": "Must discard shards first (hand limit exceeded)"}
            return self._action_discard(self.players[self.current_player], params or {})
        if self.phase != "playing":
            return {"error": f"Cannot act in phase: {self.phase}"}
        if self.actions_remaining <= 0:
            return {"error": "No actions remaining"}

        params = params or {}
        player = self.players[self.current_player]
        result = None

        if action == "gather":
            result = self._action_gather(player, params)
        elif action == "extract":
            result = self._action_extract(player, params)
        elif action == "build":
            result = self._action_build(player, params)
        elif action == "stabilize":
            result = self._action_stabilize(player, params)
        elif action == "trade_bank":
            result = self._action_trade_bank(player, params)
        elif action == "convert":
            result = self._action_convert(player, params)
        else:
            return {"error": f"Unknown action: {action}"}

        if result and result.get("error"):
            return result

        self._check_milestones()

        # Convert is free action
        if action != "convert":
            self.actions_remaining -= 1

        # Check hand limit
        if self._check_hand_limit(player):
            self.phase = "discard"
            self._log("info",
                f"⚠️ {player['name']} exceeded hand limit! Must discard {self.discard_required} shard(s).")
            return self.get_state()

        if self._check_game_end():
            return self.get_state()

        if self.actions_remaining <= 0:
            self._advance_turn()

        return self.get_state()

    def _action_discard(self, player, params):
        shards_to_discard = params.get("shards", {})  # {type: count}
        total_discarding = sum(shards_to_discard.values())
        if total_discarding != self.discard_required:
            return {"error": f"Must discard exactly {self.discard_required} shard(s)"}
        for stype, count in shards_to_discard.items():
            if player["shards"].get(stype, 0) < count:
                return {"error": f"Not enough {stype} shards"}

        for stype, count in shards_to_discard.items():
            player["shards"][stype] -= count
            self.supply[stype] = self.supply.get(stype, 0) + count

        discarded_str = ", ".join(f"{c}× {SHARD_ICONS[t]}" for t, c in shards_to_discard.items() if c > 0)
        self._log("info", f"🗑️ {player['name']} discarded {discarded_str} (hand limit)")
        self.discard_required = 0
        self.phase = "playing"

        if self._check_game_end():
            return self.get_state()
        if self.actions_remaining <= 0:
            self._advance_turn()
        return self.get_state()

    def _action_gather(self, player, params):
        indices = params.get("shard_indices", [])
        count = self._get_gather_count(player)
        max_take = min(count, len(self.shard_market))
        if len(indices) != max_take:
            return {"error": f"Must pick exactly {max_take} shard(s)"}
        if any(i < 0 or i >= len(self.shard_market) for i in indices):
            return {"error": "Invalid shard index"}
        if len(set(indices)) != len(indices):
            return {"error": "Duplicate indices"}

        gained = []
        for i in sorted(indices, reverse=True):
            shard = self.shard_market.pop(i)
            player["shards"][shard] += 1
            gained.append(shard)

        # Market Engine bonus: +1 random from bag
        if self._player_has_ability(player, "market_bonus"):
            s = self._draw_shard_from_supply()
            if s:
                player["shards"][s] += 1
                gained.append(s)

        self._fill_shard_market()
        shard_str = ", ".join(SHARD_ICONS.get(s, s) for s in gained)
        self._log("action", f"💎 {player['name']} gathered {shard_str}")
        return {"ok": True}

    def _action_extract(self, player, params):
        rift_index = params.get("rift_index")
        deep = params.get("deep", False)

        if self._player_seeker_power(player) == "extra_action" and self.extracts_this_turn >= 1:
            return {"error": "Storm Seeker: max 1 Extract per turn"}
        if rift_index is None or rift_index < 0 or rift_index >= len(self.active_rifts):
            return {"error": "Invalid rift index"}

        rift = self.active_rifts[rift_index]
        rift_id_str = str(rift["id"])

        # Check and pay toll
        claim = self.rift_claims.get(rift_id_str)
        if claim and claim["player"] != player["index"]:
            if self._player_seeker_power(player) != "toll_immune":
                claimer = self.players[claim["player"]]
                toll_amount = self._get_toll_amount(claimer)
                total = self._get_total_shards(player)
                if total < toll_amount:
                    return {"error": f"Need {toll_amount} shard(s) to pay toll to {claimer['name']}"}
                # Auto-pay from most abundant
                paid = []
                remaining = toll_amount
                for t in sorted(SHARD_TYPES, key=lambda x: player["shards"][x], reverse=True):
                    while remaining > 0 and player["shards"][t] > 0:
                        player["shards"][t] -= 1
                        claimer["shards"][t] += 1
                        claimer["tolls_collected"] += 1
                        paid.append(t)
                        remaining -= 1
                paid_str = ", ".join(SHARD_ICONS[t] for t in paid)
                self._log("action",
                    f"🔖 {player['name']} paid toll ({paid_str}) to {claimer['name']}")

        # Stability cost
        base_cost = 2 if deep else 1
        sensitivity = self._get_rift_sensitivity(player)
        discount = 1 if self._player_has_ability(player, "extract_discount") else 0
        total_cost = max(0, base_cost + sensitivity - discount)

        # Block extraction if rift doesn't have enough stability
        if rift["stability"] < total_cost:
            if deep:
                return {"error": f"Rift only has {rift['stability']} stability — Deep Extract needs {total_cost}. Try Safe Extract instead."}
            else:
                return {"error": f"Rift only has {rift['stability']} stability — Extract needs {total_cost} (sensitivity: +{sensitivity}). Stabilize first!"}

        # Shards gained
        base_shards = 4 if deep else 2
        bonus = 0
        if self._player_seeker_power(player) == "ember_extract_bonus" and rift["type"] == "ember":
            bonus = 1

        shards_gained = base_shards + bonus
        for _ in range(shards_gained):
            if self.supply.get(rift["type"], 0) > 0:
                player["shards"][rift["type"]] += 1
                self.supply[rift["type"]] -= 1

        rift["stability"] -= total_cost

        # Track who destabilized this rift (for collapse blame)
        if rift["stability"] <= 0:
            rift["destabilized_by"] = player["index"]
            self._log("danger",
                f"⚠️ {player['name']} drained {rift['type'].title()} Rift to 0! It will COLLAPSE at end of round!")

        # Claim the rift
        persist = 2 if self._player_has_ability(player, "persistent_claim") else 1
        self.rift_claims[rift_id_str] = {"player": player["index"], "rounds_left": persist}

        # Explorer token — max 1 per rift TYPE
        if rift["type"] not in player["explored_types"] and len(player["explored_types"]) < 5:
            player["explored_types"].append(rift["type"])
            tokens = 2 if self._player_seeker_power(player) == "double_explore" else 1
            player["explorer_tokens"] += tokens
            self._log("action", f"🧭 {player['name']} discovered {rift['type'].title()}! +{tokens} Explorer")

        # Track for contracts
        self.extracts_this_turn += 1
        if deep:
            player["deep_extracts"] += 1
        rt = rift["type"]
        if rt not in player["rift_extracts"]:
            player["rift_extracts"][rt] = []
        if rift["id"] not in player["rift_extracts"][rt]:
            player["rift_extracts"][rt].append(rift["id"])

        mode = "Deep" if deep else "Safe"
        self._log("action",
            f"⛏️ {player['name']} {mode} Extracted {shards_gained} {SHARD_ICONS[rift['type']]} "
            f"(Stability: {rift['stability']}/{rift['max_stability']})")

        # Push-Your-Luck Rift Surges (20% chance)
        if random.random() < 0.20:
            surge = random.choice(["bonus", "instability", "echo", "jackpot"])
            if surge == "bonus":
                s = self._draw_shard_from_supply()
                if s:
                    player["shards"][s] += 1
                    self._log("info", f"✨ RIFT SURGE! {player['name']} finds a hidden {s.title()} shard!")
            elif surge == "instability":
                rift["stability"] = max(0, rift["stability"] - 1)
                self._log("danger", f"⚠️ RIFT SURGE! The {rift['type'].title()} Rift destabilizes further (−1)!")
                if rift["stability"] == 0 and not rift.get("destabilized_by"):
                    rift["destabilized_by"] = player["index"]
            elif surge == "echo":
                rift["stability"] = min(rift["max_stability"], rift["stability"] + 1)
                self._log("info", f"🌀 RIFT SURGE! An echo stabilizes the {rift['type'].title()} Rift (+1)!")
            elif surge == "jackpot":
                for _ in range(2):
                    s = self._draw_shard_from_supply()
                    if s:
                        player["shards"][s] += 1
                self._log("info", f"💰 JACKPOT SURGE! {player['name']} strikes a rich deposit (+2 shards)!")

        return {"ok": True}

    def _action_build(self, player, params):
        ci = params.get("construct_index")
        if ci is None or ci < 0 or ci >= len(self.construct_display):
            return {"error": "Invalid construct index"}

        construct = self.construct_display[ci]

        # Tier gating
        if not self._can_build_tier(player, construct["tier"]):
            req = ""
            if construct["tier"] == "medium":
                req = "2 Small Constructs"
            elif construct["tier"] == "large":
                req = "2 Small + 1 Medium Construct"
            return {"error": f"Need {req} before building {construct['tier'].title()}"}

        cost = dict(construct["cost"])
        # Void Seeker discount
        if self._player_seeker_power(player) == "build_discount" and cost:
            cheapest = min(cost, key=cost.get)
            cost[cheapest] = max(0, cost[cheapest] - 1)
            if cost[cheapest] == 0:
                del cost[cheapest]

        for stype, amount in cost.items():
            if player["shards"].get(stype, 0) < amount:
                return {"error": f"Not enough {stype} (need {amount}, have {player['shards'].get(stype, 0)})"}

        for stype, amount in cost.items():
            player["shards"][stype] -= amount
            self.supply[stype] = self.supply.get(stype, 0) + amount

        built = self.construct_display.pop(ci)
        player["constructs"].append(built)
        self._fill_construct_display()

        # On-build effects
        if built.get("ability") == "extra_explorer":
            player["explorer_tokens"] += 1
            self._log("info", f"🧭 {player['name']} gained bonus Explorer Token!")

        # Track first large builder
        if built["tier"] == "large" and self.first_large_builder is None:
            self.first_large_builder = player["index"]

        self._log("action", f"🏗️ {player['name']} built {built['name']} (+{built['vp']} VP)")
        return {"ok": True}

    def _action_stabilize(self, player, params):
        rift_index = params.get("rift_index")
        if rift_index is None or rift_index < 0 or rift_index >= len(self.active_rifts):
            return {"error": "Invalid rift index"}
        rift = self.active_rifts[rift_index]
        if rift["stability"] >= rift["max_stability"]:
            return {"error": "Rift already at max stability"}

        is_free = (self._player_seeker_power(player) == "free_stabilize"
                   and not player["free_stabilize_used"])
        if is_free:
            player["free_stabilize_used"] = True
        else:
            cost = self._get_stabilize_cost(player)
            if self._get_total_shards(player) < cost:
                return {"error": f"Need {cost} shards to stabilize"}
            removed = 0
            for t in sorted(SHARD_TYPES, key=lambda x: player["shards"][x], reverse=True):
                while removed < cost and player["shards"][t] > 0:
                    player["shards"][t] -= 1
                    self._return_shard_to_supply(t)
                    removed += 1

        rift["stability"] = min(rift["max_stability"], rift["stability"] + 1)
        tokens = 2 if self._player_has_ability(player, "double_guardian") else 1
        player["guardian_tokens"] += tokens

        # Contract tracking
        if rift["id"] not in player["rifts_stabilized"]:
            player["rifts_stabilized"].append(rift["id"])

        cost_str = "free" if is_free else f"{self._get_stabilize_cost(player)} Shards"
        self._log("action",
            f"🛡️ {player['name']} stabilized {rift['type'].title()} Rift ({cost_str}) "
            f"— +{tokens} Guardian Token(s)")
        return {"ok": True}

    def _action_trade_bank(self, player, params):
        give_type = params.get("give_type")
        receive_type = params.get("receive_type")
        if give_type not in SHARD_TYPES or receive_type not in SHARD_TYPES:
            return {"error": "Invalid shard type"}
        if give_type == receive_type:
            return {"error": "Can't trade same type"}

        rate = self._get_trade_rate(player)
        if player["shards"].get(give_type, 0) < rate:
            return {"error": f"Need {rate} {give_type} (have {player['shards'].get(give_type, 0)})"}

        player["shards"][give_type] -= rate
        self.supply[give_type] += rate
        player["shards"][receive_type] += 1
        self.supply[receive_type] -= 1
        player["trades_completed"] += 1

        self._log("action",
            f"🤝 {player['name']} traded {rate} {SHARD_ICONS[give_type]} → 1 {SHARD_ICONS[receive_type]}")
        return {"ok": True}

    def _action_convert(self, player, params):
        """Shard Forge ability: convert 1 shard to any type (free action, once/round)"""
        if not self._player_has_ability(player, "shard_convert"):
            return {"error": "No Shard Forge ability"}
        if player["shard_convert_used"]:
            return {"error": "Already used Shard Forge this round"}
        from_type = params.get("from_type")
        to_type = params.get("to_type")
        if from_type not in SHARD_TYPES or to_type not in SHARD_TYPES:
            return {"error": "Invalid shard type"}
        if from_type == to_type:
            return {"error": "Same type"}
        if player["shards"].get(from_type, 0) < 1:
            return {"error": f"No {from_type} shards"}
        player["shards"][from_type] -= 1
        player["shards"][to_type] += 1
        player["shard_convert_used"] = True
        self._log("action",
            f"🔧 {player['name']} converted {SHARD_ICONS[from_type]} → {SHARD_ICONS[to_type]} (Shard Forge)")
        return {"ok": True}

    def _advance_turn(self):
        # Find next player in rotated order
        play_order = [(self.first_player_offset + i) % self.player_count
                      for i in range(self.player_count)]
        current_idx_in_order = play_order.index(self.current_player)
        next_idx_in_order = current_idx_in_order + 1

        if next_idx_in_order >= self.player_count:
            self._stability_check()
            if self._check_game_end():
                return
            self._cleanup_round()
            self._start_new_round()
        else:
            self.current_player = play_order[next_idx_in_order]
            p = self.players[self.current_player]
            self.actions_remaining = self._get_actions_per_turn(p)
            self.extracts_this_turn = 0
            self._log("info", f"➡️ {p['name']}'s turn ({self.actions_remaining} actions)")

    def _stability_check(self):
        collapsed = [r for r in self.active_rifts if r["stability"] <= 0]
        for rift in collapsed:
            self._collapse_rift(rift)

    def _cleanup_round(self):
        # Clear claims (except persistent ones)
        to_remove = []
        for rid, claim in self.rift_claims.items():
            claim["rounds_left"] -= 1
            if claim["rounds_left"] <= 0:
                to_remove.append(rid)
        for rid in to_remove:
            del self.rift_claims[rid]

        # Reset per-round flags
        for p in self.players:
            p["free_stabilize_used"] = False
            p["shard_convert_used"] = False

        # Underdog bonus
        fewest = min(len(p["constructs"]) for p in self.players)
        for p in self.players:
            if len(p["constructs"]) == fewest:
                s = self._draw_shard_from_supply()
                if s:
                    p["shards"][s] += 1

    def _start_new_round(self):
        self.round_num += 1
        self.first_player_offset = (self.first_player_offset + 1) % self.player_count
        self._log("info", f"━━━ Round {self.round_num} ━━━")

        if self.rift_deck:
            self._reveal_rift()
        else:
            self._log("info", "📦 Rift deck empty!")

        if self._check_game_end():
            return

        first = self.first_player_offset % self.player_count
        self.current_player = first
        p = self.players[first]
        self.actions_remaining = self._get_actions_per_turn(p)
        self.extracts_this_turn = 0
        self._log("info", f"➡️ {p['name']}'s turn ({self.actions_remaining} actions)")

    def _check_game_end(self):
        if self.phase == "game_over":
            return True
        if self.fracture >= self.fracture_threshold:
            self.phase = "game_over"
            self.game_end_trigger = "fracture"
            self._log("danger", "💀 WORLD FRACTURE! Dimensional fabric torn apart!")
            self._calculate_scores()
            return True
        for p in self.players:
            if len(p["constructs"]) >= CONSTRUCTS_END_COUNT:
                self.phase = "game_over"
                self.game_end_trigger = "constructs"
                self._log("info", f"🏆 {p['name']} built {CONSTRUCTS_END_COUNT} Constructs! Game ends!")
                self._calculate_scores()
                return True
        if not self.rift_deck and self.actions_remaining <= 0:
            play_order = [(self.first_player_offset + i) % self.player_count
                          for i in range(self.player_count)]
            if self.current_player == play_order[-1]:
                self.phase = "game_over"
                self.game_end_trigger = "deck_empty"
                self._log("info", "📦 Rift deck exhausted! Game ends!")
                self._calculate_scores()
                return True
        return False

    def _check_contract(self, player, contract):
        cid = contract["id"]
        if cid == "the_guardian":
            return player["guardian_tokens"] >= 5
        if cid == "universal_explorer":
            return len(player["explored_types"]) >= 5
        if cid == "essence_hoarder":
            return self._get_total_shards(player) == self._get_hand_limit(player)
        if cid == "master_builder":
            return self._count_constructs_by_tier(player, "large") >= 2
        if cid == "toll_collector":
            return player["tolls_collected"] >= 5
        if cid == "rift_warden":
            return len(player["rifts_stabilized"]) >= 4
        if cid == "specialist":
            return any(player["shards"][t] >= 8 for t in SHARD_TYPES)
        if cid == "rainbow":
            return all(player["shards"][t] >= 2 for t in SHARD_TYPES)
        if cid == "trader":
            return player["trades_completed"] >= 6
        if cid == "ember_lord":
            return len(player["rift_extracts"].get("ember", [])) >= 3
        if cid == "tide_lord":
            return len(player["rift_extracts"].get("tide", [])) >= 3
        if cid == "daredevil":
            return player["deep_extracts"] >= 3
        if cid == "fortress_contract":
            return sum(1 for c in player["constructs"] if c.get("ability")) >= 3
        if cid == "world_saver":
            return self.fracture <= 2
        if cid == "speed_builder":
            return self.first_large_builder == player["index"]
        return False

    def _calculate_scores(self):
        for p in self.players:
            score = {"total": 0, "breakdown": {}}

            # Constructs
            cvp = sum(c["vp"] for c in p["constructs"])
            score["breakdown"]["constructs"] = cvp
            score["total"] += cvp

            # Guardian tokens
            gm = 2 if self._player_has_ability(p, "double_guardian_vp") else 1
            gvp = p["guardian_tokens"] * gm
            score["breakdown"]["guardian_tokens"] = gvp
            score["total"] += gvp

            # Explorer tokens
            em = 2 if self._player_has_ability(p, "double_explorer_vp") else 1
            evp = p["explorer_tokens"] * em
            score["breakdown"]["explorer_tokens"] = evp
            score["total"] += evp

            # Shard sets
            shard_counts = [p["shards"][t] for t in SHARD_TYPES]
            min_count = min(shard_counts)
            sset = 0
            if min_count >= 2:
                sset += 8
            elif min_count >= 1:
                sset += 3
            for t in SHARD_TYPES:
                sset += p["shards"][t] // 3
            score["breakdown"]["shard_sets"] = sset
            score["total"] += sset

            # Contracts
            contract_vp = 0
            p["contract_results"] = []
            for c in p["contracts"]:
                completed = self._check_contract(p, c)
                vp = c["vp"] if completed else -2
                contract_vp += vp
                p["contract_results"].append({
                    "contract": c, "completed": completed, "vp": vp
                })
            score["breakdown"]["contracts"] = contract_vp
            score["total"] += contract_vp

            # Fracture bonus (World Anchor)
            if self._player_has_ability(p, "fracture_bonus") and self.fracture <= 2:
                score["breakdown"]["fracture_bonus"] = 4
                score["total"] += 4

            # Toll Empire
            if self._player_has_ability(p, "toll_vp"):
                toll_bonus = p["tolls_collected"]
                score["breakdown"]["toll_empire"] = toll_bonus
                score["total"] += toll_bonus

            # Fracture penalty
            if self.game_end_trigger == "fracture":
                score["breakdown"]["fracture_penalty"] = -5
                score["total"] -= 5
                if p["index"] == self.last_collapse_player:
                    score["breakdown"]["last_collapse"] = -2
                    score["total"] -= 2

            p["score"] = score

        # Most Guardian/Explorer bonuses
        max_g = max(p["guardian_tokens"] for p in self.players)
        if max_g > 0:
            winners = [p for p in self.players if p["guardian_tokens"] == max_g]
            if len(winners) == 1:
                winners[0]["score"]["breakdown"]["most_guardians"] = 5
                winners[0]["score"]["total"] += 5

        max_e = max(p["explorer_tokens"] for p in self.players)
        if max_e > 0:
            winners = [p for p in self.players if p["explorer_tokens"] == max_e]
            if len(winners) == 1:
                winners[0]["score"]["breakdown"]["most_explorers"] = 5
                winners[0]["score"]["total"] += 5

        winner = max(self.players, key=lambda p: p["score"]["total"])
        self._log("info", f"🏆 {winner['name']} wins with {winner['score']['total']} VP!")

    def get_available_actions(self):
        if self.phase == "discard":
            return [{"action": "discard", "label": "Discard", "icon": "🗑️",
                     "description": f"Discard {self.discard_required} shard(s) to meet hand limit",
                     "helper": "Click shards in your panel to select them for discard"}]
        if self.phase != "playing" or self.actions_remaining <= 0:
            return []
        player = self.players[self.current_player]
        actions = []

        # Gather
        if self.shard_market:
            gc = self._get_gather_count(player)
            actions.append({"action": "gather", "label": "Gather", "icon": "💎",
                "description": f"Take {gc} Shard(s) from the Market",
                "helper": f"Click {gc} shard(s) in the market"})

        # Extract
        if self.active_rifts:
            can = True
            if self._player_seeker_power(player) == "extra_action" and self.extracts_this_turn >= 1:
                can = False
            if can:
                actions.append({"action": "extract", "label": "Extract", "icon": "⛏️",
                    "description": "Harvest Shards from a Rift (claims it, costs stability)",
                    "helper": "Click a Rift. Hold Shift for Deep Extract. Claimed rifts cost a toll."})

        # Build
        for c in self.construct_display:
            if self._can_build_tier(player, c["tier"]):
                cost = dict(c["cost"])
                if self._player_seeker_power(player) == "build_discount" and cost:
                    cheapest = min(cost, key=cost.get)
                    cost[cheapest] = max(0, cost[cheapest] - 1)
                    if cost[cheapest] == 0:
                        del cost[cheapest]
                if all(player["shards"].get(t, 0) >= a for t, a in cost.items()):
                    actions.append({"action": "build", "label": "Build", "icon": "🏗️",
                        "description": "Build a Construct (tier gated: 2 Small → Medium → Large)",
                        "helper": "Click an affordable Construct"})
                    break

        # Stabilize
        stab_cost = self._get_stabilize_cost(player)
        has_free = (self._player_seeker_power(player) == "free_stabilize"
                    and not player["free_stabilize_used"])
        if any(r["stability"] < r["max_stability"] for r in self.active_rifts):
            if self._get_total_shards(player) >= stab_cost or has_free:
                fc = "0 (free!)" if has_free else str(stab_cost)
                actions.append({"action": "stabilize", "label": "Stabilize", "icon": "🛡️",
                    "description": f"Spend {fc} Shards → Rift +1, earn Guardian Token",
                    "helper": "Click a damaged Rift"})

        # Trade
        rate = self._get_trade_rate(player)
        if any(player["shards"].get(t, 0) >= rate for t in SHARD_TYPES):
            actions.append({"action": "trade_bank", "label": "Trade", "icon": "🤝",
                "description": f"Bank trade: {rate}:1",
                "helper": "Select shard to give and receive"})

        # Convert (free action)
        if (self._player_has_ability(player, "shard_convert")
                and not player["shard_convert_used"]
                and self._get_total_shards(player) > 0):
            actions.append({"action": "convert", "label": "Convert", "icon": "🔧",
                "description": "Free: Convert 1 shard to any type (Shard Forge)",
                "helper": "Select shard to convert from and to"})

        return actions

    def _check_milestones(self):
        """Tier 1: High-Impact Addictive Mechanic - Mid-game dopamine hits."""
        for p in self.players:
            m = p["milestones"]
            
            # 1. Pioneer (First to 5 types)
            if "pioneer" not in m and len(p["explored_types"]) >= 5:
                # First only? Let's check if anyone else has it
                if not any("pioneer" in op["milestones"] for op in self.players):
                    m.append("pioneer")
                    p["score"] = p.get("score", 0) + 3
                    self._log("info", f"🏆 MILESTONE! {p['name']} is the FIRST to discover all 5 elements! (+3 VP)")
            
            # 2. Foundation (2nd Small Construct)
            if "foundation" not in m:
                smalls = [c for c in p["constructs"] if c["tier"] == "small"]
                if len(smalls) >= 2:
                    m.append("foundation")
                    p["score"] = p.get("score", 0) + 1
                    self._log("info", f"🏆 MILESTONE! {p['name']} built their 2nd Small Construct: Foundation laid! (+1 VP)")

            # 3. Daredevil (3 Deep Extracts)
            if "daredevil" not in m and p["deep_extracts"] >= 3:
                m.append("daredevil")
                p["score"] = p.get("score", 0) + 2
                self._log("info", f"🏆 MILESTONE! {p['name']} performed 3 Deep Extracts: Daredevil! (+2 VP)")

            # 4. Diplomat (3 Trades)
            if "diplomat" not in m and p["trades_completed"] >= 3:
                m.append("diplomat")
                p["score"] = p.get("score", 0) + 1
                self._log("info", f"🏆 MILESTONE! {p['name']} completed 3 Trades: Diplomat! (+1 VP)")

            # 5. Toll Baron (3 Tolls)
            if "toll_baron" not in m and p["tolls_collected"] >= 3:
                if not any("toll_baron" in op["milestones"] for op in self.players):
                    m.append("toll_baron")
                    p["score"] = p.get("score", 0) + 2
                    self._log("info", f"🏆 MILESTONE! {p['name']} is the FIRST to collect 3 Tolls: Toll Baron! (+2 VP)")

            # 6. Architect (1st Medium)
            if "architect" not in m and any(c["tier"] == "medium" for c in p["constructs"]):
                m.append("architect")
                p["score"] = p.get("score", 0) + 1
                self._log("info", f"🏆 MILESTONE! {p['name']} built their first Medium Construct: Architect! (+1 VP)")

            # 7. Titan (1st Large)
            if "titan" not in m and any(c["tier"] == "large" for c in p["constructs"]):
                if not any("titan" in op["milestones"] for op in self.players):
                    m.append("titan")
                    p["score"] = p.get("score", 0) + 2
                    self._log("info", f"🏆 MILESTONE! {p['name']} is the FIRST to build a Large Construct: TITAN! (+2 VP)")

    def get_state(self):
        current_p = self.players[self.current_player] if self.current_player < len(self.players) else None
        # Peek deck for Scout Tower
        peek_cards = None
        if current_p and self._player_has_ability(current_p, "peek_deck") and self.rift_deck:
            peek_cards = []
            for card in self.rift_deck[:1]:
                if card.get("is_anomaly"):
                    peek_cards.append({"type": "anomaly", "name": card["name"]})
                else:
                    peek_cards.append({"type": "rift", "rift_type": card["type"],
                                       "stability": card["max_stability"]})

        return {
            "game_id": self.game_id,
            "phase": self.phase,
            "round": self.round_num,
            "current_player": self.current_player,
            "actions_remaining": self.actions_remaining,
            "discard_required": self.discard_required,
            "hand_limit": HAND_LIMIT,
            "constructs_end_count": CONSTRUCTS_END_COUNT,
            "players": [
                {
                    "index": p["index"], "name": p["name"], "color": p["color"],
                    "seeker": p["seeker"],
                    "seeker_choices": p["seeker_choices"] if p["seeker"] is None else [],
                    "contract_choices": (p["contract_choices"]
                                         if len(p["contracts"]) == 0 and p["contract_choices"]
                                         else []),
                    "contracts": p["contracts"],
                    "contract_results": p.get("contract_results", []),
                    "shards": dict(p["shards"]),
                    "constructs": p["constructs"],
                    "guardian_tokens": p["guardian_tokens"],
                    "explorer_tokens": p["explorer_tokens"],
                    "explored_types": p["explored_types"],
                    "tolls_collected": p["tolls_collected"],
                    "trades_completed": p["trades_completed"],
                    "deep_extracts": p["deep_extracts"],
                    "score": p.get("score"),
                }
                for p in self.players
            ],
            "active_rifts": self.active_rifts,
            "rift_claims": {k: v for k, v in self.rift_claims.items()},
            "shard_market": list(self.shard_market),
            "construct_display": self.construct_display,
            "fracture": self.fracture,
            "fracture_threshold": self.fracture_threshold,
            "rift_deck_remaining": len([c for c in self.rift_deck if not c.get("is_anomaly")]),
            "activity_log": self.activity_log[-25:],
            "available_actions": self.get_available_actions(),
            "game_end_trigger": self.game_end_trigger,
            "peek_deck": peek_cards,
        }
