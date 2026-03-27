"""
SHARDFALL V2 — Game Engine
Core game logic: rift claims/tolls, hand limit, contracts, tier gating,
rotating first player, anomalies throughout, enhanced scoring.
"""
import random
import uuid
from .constants import (
    GEM_TYPES, PORTAL_CARDS, ANOMALY_CARDS, CONSTRUCT_CARDS,
    SEEKER_CARDS, CONTRACT_CARDS, FRACTURE_THRESHOLDS, GEM_ICONS,
    PLAYER_COLORS, HAND_LIMIT, CONSTRUCTS_END_COUNT, MARKET_SIZE,
    GATHER_COUNT, STARTING_PORTALS, CONSTRUCT_DISPLAY_SIZE,
)


class ShardFallEngine:
    def __init__(self, player_names: list[str], mode: str = "normal"):
        assert 2 <= len(player_names) <= 5
        self.game_id = str(uuid.uuid4())[:8]
        self.player_count = len(player_names)
        self.mode = mode
        self.phase = "setup"  # setup | contracts | playing | discard | game_over
        self.round_num = 0
        self.current_player = 0
        self.actions_remaining = 0
        self.extracts_this_turn = 0
        self.game_end_trigger = None
        self.first_player_offset = 0  # rotates each round
        self.first_large_builder = None  # track for Speed Builder contract
        self.discard_required = 0  # gems to discard
        self.active_trade = None  # dict tracking p2p trade state
        self.constructs_end_count = 5 if mode == "fast" else CONSTRUCTS_END_COUNT

        # Players
        self.players = []
        for i, name in enumerate(player_names):
            self.players.append({
                "index": i, "name": name, "color": PLAYER_COLORS[i],
                "seeker": None, "seeker_choices": [],
                "gems": {t: 0 for t in GEM_TYPES},
                "constructs": [],
                "guardian_tokens": 0, "explorer_tokens": 0,
                "explored_types": [],  # portal types discovered (max 5)
                "contracts": [], "contract_choices": [],
                "free_stabilize_used": False,
                "gem_convert_used": False,
                # V2 tracking for contracts
                "tolls_collected": 0,
                "portals_stabilized": [],  # portal IDs stabilized
                "trades_completed": 0,
                "portal_harvests": {},  # type -> set of portal IDs harvested from
                "deep_harvests": 0,
                "milestones": [], # New! Track achievements
            })

        # Portal deck — ALL shuffled together (anomalies throughout)
        portal_cards = [dict(c) for c in PORTAL_CARDS]
        anomaly_cards = [{"is_anomaly": True, **a} for a in ANOMALY_CARDS]
        self.portal_deck = portal_cards + anomaly_cards
        random.shuffle(self.portal_deck)

        self.active_portals = []
        self.supply = {t: 16 for t in GEM_TYPES}
        self.gem_market = []
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
        early_medium_count = 1 if self.player_count <= 2 else 0
        early_mediums = mediums[:early_medium_count]
        late_mediums = mediums[early_medium_count:]

        # Top section: all smalls + a few mediums (shuffled together)
        top_section = smalls + early_mediums
        random.shuffle(top_section)
        
        # Ensure at least 3 smalls are at the VERY top (last in the list, drawn first)
        # We'll just shuffle the top section and then move 3 random smalls to the end
        if len(top_section) >= 3:
            smalls_in_top = [c for c in top_section if c["tier"] == "small"]
            if len(smalls_in_top) >= 3:
                for _ in range(3):
                    s = random.choice(smalls_in_top)
                    top_section.remove(s)
                    top_section.append(s)
                    smalls_in_top.remove(s)

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

        # Claim tracking: portal_id -> {"player": idx, "rounds_left": 1 or 2}
        self.portal_claims = {}

        # Contract deck
        self.contract_deck = [dict(c) for c in CONTRACT_CARDS]
        random.shuffle(self.contract_deck)

        # Init
        self._deal_seekers()
        self._fill_gem_market()
        self._fill_construct_display()
        self._reveal_starting_portals()

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

    def _draw_gem_from_supply(self):
        available = [t for t in GEM_TYPES if self.supply[t] > 0]
        if not available:
            return None
        chosen = random.choice(available)
        self.supply[chosen] -= 1
        return chosen

    def _return_gem_to_supply(self, gem_type):
        self.supply[gem_type] += 1

    def _fill_gem_market(self):
        while len(self.gem_market) < MARKET_SIZE:
            s = self._draw_gem_from_supply()
            if s is None:
                break
            self.gem_market.append(s)

    def _fill_construct_display(self):
        # Build "current progress" thresholds
        # Don't show Medium until someone has 1 Small.
        # Don't show Large until someone has 2 Small + 1 Medium.
        max_smalls = max([len([c for c in p["constructs"] if c["tier"] == "small"]) for p in self.players] + [0])
        max_mediums = max([len([c for c in p["constructs"] if c["tier"] == "medium"]) for p in self.players] + [0])

        retry_limit = 20
        while len(self.construct_display) < CONSTRUCT_DISPLAY_SIZE and self.construct_deck and retry_limit > 0:
            card = self.construct_deck.pop()
            
            # Logic: If card is too advanced for ALL players, bury it lower in the deck
            # unless the deck is very small.
            if card["tier"] == "medium" and max_smalls < 1 and len(self.construct_deck) > 5:
                self.construct_deck.insert(random.randint(0, len(self.construct_deck)//2), card)
                retry_limit -= 1
                continue
            if card["tier"] == "large" and (max_smalls < 2 or max_mediums < 1) and len(self.construct_deck) > 5:
                self.construct_deck.insert(0, card) # Bury at the very bottom
                retry_limit -= 1
                continue
                
            self.construct_display.append(card)

    def _reveal_starting_portals(self):
        for _ in range(STARTING_PORTALS):
            self._reveal_portal(silent=True)

    def _reveal_portal(self, silent=False):
        if not self.portal_deck:
            return None
        card = self.portal_deck.pop(0)
        if card.get("is_anomaly"):
            if not silent:
                self._log("anomaly", f"⚡ ANOMALY: {card['name']} — {card['description']}", card)
                self._resolve_anomaly(card)
            return self._reveal_portal(silent)
        # No Portal Cap: allow portals to spawn naturally so players aren't forced to destroy their own portals

        portal = {
            "id": card["id"], "type": card["type"],
            "stability": card["max_stability"], "max_stability": card["max_stability"],
            "explored_by": [],
            "destabilized_by": None,
        }
        self.active_portals.append(portal)
        if not silent:
            self._log("portal", f"🌀 New Portal: {card['type'].title()} (Stability {card['max_stability']})")
        return portal

    def _resolve_anomaly(self, anomaly):
        aid = anomaly["id"]
        if aid == "dimensional_surge":
            for portal in self.active_portals:
                portal["stability"] = max(0, portal["stability"] - 1)
        elif aid == "gem_rain":
            for p in self.players:
                for _ in range(2):
                    s = self._draw_gem_from_supply()
                    if s:
                        p["gems"][s] += 1
            self._log("info", "🎁 All players received 2 random Gems!")
        elif aid == "reality_shift":
            for c in self.construct_display:
                self.construct_deck.append(c)
            self.construct_display.clear()
            random.shuffle(self.construct_deck)
            self._fill_construct_display()
            self._log("info", "🔄 Construct display replaced!")
        elif aid == "rift_storm":
            if self.active_portals:
                lowest = min(self.active_portals, key=lambda r: r["stability"])
                self._log("danger", f"⚡ Portal Storm! {lowest['type'].title()} Portal collapses!")
                self._collapse_portal(lowest)
        elif aid == "dimensional_calm":
            for portal in self.active_portals:
                portal["stability"] = min(portal["max_stability"], portal["stability"] + 1)
            self._log("info", "💫 Dimensional Calm — all Portals healed +1!")
        elif aid == "convergence":
            contributors = 0
            for p in self.players:
                total = sum(p["gems"].values())
                if total >= 2:
                    # Auto-contribute: remove 2 most abundant
                    removed = 0
                    for t in sorted(GEM_TYPES, key=lambda x: p["gems"][x], reverse=True):
                        while removed < 2 and p["gems"][t] > 0:
                            p["gems"][t] -= 1
                            self._return_gem_to_supply(t)
                            removed += 1
                    p["guardian_tokens"] += 1
                    contributors += 1
            self.fracture = max(0, self.fracture - contributors)
            self._log("info", f"🤝 Convergence: {contributors} player(s) contributed! Fracture −{contributors}")
        elif aid == "market_surge":
            while len(self.gem_market) < 6:
                s = self._draw_gem_from_supply()
                if s is None:
                    break
                self.gem_market.append(s)
            for p in self.players:
                s = self._draw_gem_from_supply()
                if s:
                    p["gems"][s] += 1
            self._log("info", "🎭 Market Surge! Market expanded, each player got 1 free gem!")
        elif aid == "rift_merge":
            if len(self.active_portals) >= 2:
                sorted_portals = sorted(self.active_portals, key=lambda r: r["stability"])
                removed = sorted_portals[0]
                boosted = sorted_portals[1]
                self.active_portals.remove(removed)
                self.portal_claims.pop(str(removed["id"]), None)
                boosted["stability"] = min(boosted["max_stability"], boosted["stability"] + 2)
                self._log("info",
                    f"🌀 Portal Merge! {removed['type'].title()} Portal removed, "
                    f"{boosted['type'].title()} Portal gains +2 stability!")

    def _collapse_portal(self, portal):
        # Attribute collapse to the player who destabilized it
        blamed = portal.get("destabilized_by")
        if blamed is not None:
            blame_name = self.players[blamed]["name"]
            self._log("danger", f"💥 {portal['type'].title()} Portal COLLAPSED! {blame_name} destabilized it! Fracture +1")
            self.last_collapse_player = blamed
        else:
            self._log("danger", f"💥 {portal['type'].title()} Portal COLLAPSED! Fracture +1")
            self.last_collapse_player = self.current_player

        # Backlash: all players lose 1 gem of that type
        for p in self.players:
            if self._player_seeker_power(p) == "collapse_bonus" and p["index"] == self.current_player:
                # Sentinel is immune to backlash during their own collapse event
                continue
            if self._player_seeker_power(p) == "no_backlash": # Legacy check
                continue
            if p["gems"].get(portal["type"], 0) > 0:
                p["gems"][portal["type"]] -= 1
                self._return_gem_to_supply(portal["type"])
                self._log("danger", f"⚡ {p['name']} lost 1 {GEM_ICONS[portal['type']]} (backlash)")

        self.active_portals.remove(portal)
        self.portal_claims.pop(str(portal["id"]), None)
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

    def _get_collect_count(self, player):
        count = GATHER_COUNT
        if self._player_has_ability(player, "gather_bonus"):
            count = 2
        return count

    def _player_seeker_power(self, player):
        return player["seeker"]["power"] if player["seeker"] else None

    def _get_hand_limit(self, player):
        if self._player_has_ability(player, "hand_limit_up"):
            return HAND_LIMIT + 2
        return HAND_LIMIT

    def _get_total_gems(self, player):
        return sum(player["gems"].values())

    def _get_portal_sensitivity(self, player):
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
        total = self._get_total_gems(player)
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

    def do_action(self, player_idx: int, action: str, params: dict = None):
        params = params or {}
        player = self.players[player_idx]

        # Handle out-of-turn trade responses explicitly
        if action == "respond_trade":
            result = self._action_trade_respond(player, params)
            if result and result.get("error"): return result
            return self.get_state()

        # All other actions require it to be your turn
        if player_idx != self.current_player:
            return {"error": "Not your turn"}

        if self.phase == "discard":
            if action != "discard":
                return {"error": "Must discard gems first (hand limit exceeded)"}
            return self._action_discard(player, params)
        
        if self.phase != "playing":
            return {"error": f"Cannot act in phase: {self.phase}"}

        is_free_action = action in ["convert", "trade_player_offer", "trade_player_cancel", "trade_player_confirm"]

        if not is_free_action and self.actions_remaining <= 0:
            return {"error": "No actions remaining"}

        result = None

        if action == "collect":
            result = self._action_collect(player, params)
        elif action == "harvest":
            result = self._action_harvest(player, params)
        elif action == "build":
            result = self._action_build(player, params)
        elif action == "stabilize":
            result = self._action_stabilize(player, params)
        elif action == "trade_bank":
            result = self._action_trade_bank(player, params)
        elif action == "convert":
            result = self._action_convert(player, params)
        elif action == "trade_player_offer":
            result = self._action_trade_offer(player, params)
        elif action == "trade_player_cancel":
            result = self._action_trade_cancel(player, params)
        elif action == "trade_player_confirm":
            result = self._action_trade_confirm(player, params)
        else:
            return {"error": f"Unknown action: {action}"}

        if result and result.get("error"):
            return result

        self._check_milestones()

        if not is_free_action:
            self.actions_remaining -= 1

        # Check hand limit
        if self._check_hand_limit(player):
            self.phase = "discard"
            self._log("info",
                f"⚠️ {player['name']} exceeded hand limit! Must discard {self.discard_required} gem(s).")
            return self.get_state()

        if self._check_game_end():
            return self.get_state()

        if self.actions_remaining <= 0:
            self._advance_turn()

        return self.get_state()

    def _action_discard(self, player, params):
        gems_to_discard = params.get("gems", {})  # {type: count}
        total_discarding = sum(gems_to_discard.values())
        if total_discarding != self.discard_required:
            return {"error": f"Must discard exactly {self.discard_required} gem(s)"}
        for stype, count in gems_to_discard.items():
            if player["gems"].get(stype, 0) < count:
                return {"error": f"Not enough {stype} gems"}

        for stype, count in gems_to_discard.items():
            player["gems"][stype] -= count
            self.supply[stype] = self.supply.get(stype, 0) + count

        discarded_str = ", ".join(f"{c}× {GEM_ICONS[t]}" for t, c in gems_to_discard.items() if c > 0)
        self._log("info", f"🗑️ {player['name']} discarded {discarded_str} (hand limit)")
        self.discard_required = 0
        self.phase = "playing"

        if self._check_game_end():
            return self.get_state()
        if self.actions_remaining <= 0:
            self._advance_turn()
        return self.get_state()

    def _action_collect(self, player, params):
        indices = params.get("gem_indices", [])
        count = self._get_collect_count(player)
        max_take = min(count, len(self.gem_market))
        if len(indices) != max_take:
            return {"error": f"Must pick exactly {max_take} gem(s)"}
        if any(i < 0 or i >= len(self.gem_market) for i in indices):
            return {"error": "Invalid gem index"}
        if len(set(indices)) != len(indices):
            return {"error": "Duplicate indices"}

        gained = []
        for i in sorted(indices, reverse=True):
            gem = self.gem_market.pop(i)
            player["gems"][gem] += 1
            gained.append(gem)

        # Market Engine bonus: +1 random from bag
        if self._player_has_ability(player, "market_bonus"):
            s = self._draw_gem_from_supply()
            if s:
                player["gems"][s] += 1
                gained.append(s)

        self._fill_gem_market()
        gem_str = ", ".join(GEM_ICONS.get(s, s) for s in gained)
        self._log("action", f"💎 {player['name']} collected {gem_str}")
        return {"ok": True}

    def _action_harvest(self, player, params):
        portal_index = params.get("portal_index")
        deep = params.get("deep", False)

        if self._player_seeker_power(player) == "extra_action" and self.extracts_this_turn >= 1:
            return {"error": "Storm Seeker: max 1 Harvest per turn"}
        if portal_index is None or portal_index < 0 or portal_index >= len(self.active_portals):
            return {"error": "Invalid portal index"}

        portal = self.active_portals[portal_index]
        portal_id_str = str(portal["id"])

        # Check and pay toll
        claim = self.portal_claims.get(portal_id_str)
        if claim and claim["player"] != player["index"]:
            if self._player_seeker_power(player) != "toll_immune":
                claimer = self.players[claim["player"]]
                toll_amount = self._get_toll_amount(claimer)
                total = self._get_total_gems(player)
                if total < toll_amount:
                    return {"error": f"Need {toll_amount} gem(s) to pay toll to {claimer['name']}"}
                # Auto-pay from most abundant
                paid = []
                remaining = toll_amount
                for t in sorted(GEM_TYPES, key=lambda x: player["gems"][x], reverse=True):
                    while remaining > 0 and player["gems"][t] > 0:
                        player["gems"][t] -= 1
                        claimer["gems"][t] += 1
                        claimer["tolls_collected"] += 1
                        paid.append(t)
                        remaining -= 1
                paid_str = ", ".join(GEM_ICONS[t] for t in paid)
                self._log("action",
                    f"🔖 {player['name']} paid toll ({paid_str}) to {claimer['name']}")

        # Stability cost
        base_cost = 2 if deep else 1
        sensitivity = self._get_portal_sensitivity(player)
        discount = 1 if self._player_has_ability(player, "extract_discount") else 0
        total_cost = max(0, base_cost + sensitivity - discount)

        # Ember Seeker extra power: pay 1 extra stability for +3 gems
        is_ember_seeker_bonus = (
            self._player_seeker_power(player) == "ember_extract_bonus" 
            and portal["type"] == "ember"
            and portal["stability"] >= total_cost + 1
        )
        if is_ember_seeker_bonus:
            total_cost += 1

        # Block harvest if portal doesn't have enough stability
        if portal["stability"] < total_cost:
            if deep:
                return {"error": f"Portal only has {portal['stability']} stability — Deep Harvest needs {total_cost}. Try Safe Harvest instead."}
            else:
                return {"error": f"Portal only has {portal['stability']} stability — Harvest needs {total_cost} (sensitivity: +{sensitivity}). Stabilize first!"}
        
        # ACTUALLY SUBTRACT STABILITY
        portal["stability"] -= total_cost

        # Gems gained
        base_gems = 4 if deep else 2
        bonus = 3 if is_ember_seeker_bonus else 0

        gems_gained = base_gems + bonus
        gained = []
        for _ in range(gems_gained):
            if self.supply[portal["type"]] > 0:
                player["gems"][portal["type"]] += 1
                self.supply[portal["type"]] -= 1
        if portal["stability"] <= 0:
            portal["destabilized_by"] = player["index"]
            self._log("danger",
                f"⚠️ {player['name']} drained {portal['type'].title()} Portal to 0! It will COLLAPSE at end of round!")

        # Claim the portal
        persist = 2 if self._player_has_ability(player, "persistent_claim") else 1
        self.portal_claims[portal_id_str] = {"player": player["index"], "rounds_left": persist}

        # Explorer token — max 1 per portal TYPE
        if portal["type"] not in player["explored_types"] and len(player["explored_types"]) < 5:
            player["explored_types"].append(portal["type"])
            tokens = 2 if self._player_seeker_power(player) == "double_explore" else 1
            player["explorer_tokens"] += tokens
            self._log("action", f"🧭 {player['name']} discovered {portal['type'].title()}! +{tokens} Explorer")

        # Track for contracts (using legacy names for telemetry/contracts)
        self.extracts_this_turn += 1
        if deep:
            player["deep_harvests"] += 1
        rt = portal["type"]
        if rt not in player["portal_harvests"]:
            player["portal_harvests"][rt] = []
        if portal["id"] not in player["portal_harvests"][rt]:
            player["portal_harvests"][rt].append(portal["id"])

        mode = "Deep" if deep else "Safe"
        self._log("action",
            f"⛏️ {player['name']} {mode} Harvested {gems_gained} {GEM_ICONS[portal['type']]} "
            f"(Stability: {portal['stability']}/{portal['max_stability']})")

        # Push-Your-Luck Portal Surges (20% chance)
        if random.random() < 0.20:
            surge = random.choice(["bonus", "instability", "echo", "jackpot"])
            if surge == "bonus":
                s = self._draw_gem_from_supply()
                if s:
                    player["gems"][s] += 1
                    self._log("info", f"✨ PORTAL SURGE! {player['name']} finds a hidden {s.title()} gem!")
            elif surge == "instability":
                portal["stability"] = max(0, portal["stability"] - 1)
                self._log("danger", f"⚠️ PORTAL SURGE! The {portal['type'].title()} Portal destabilizes further (−1)!")
                if portal["stability"] == 0 and not portal.get("destabilized_by"):
                    portal["destabilized_by"] = player["index"]
            elif surge == "echo":
                portal["stability"] = min(portal["max_stability"], portal["stability"] + 1)
                self._log("info", f"🌀 PORTAL SURGE! An echo stabilizes the {portal['type'].title()} Portal (+1)!")
            elif surge == "jackpot":
                for _ in range(2):
                    s = self._draw_gem_from_supply()
                    if s:
                        player["gems"][s] += 1
                self._log("info", f"💰 JACKPOT SURGE! {player['name']} strikes a rich deposit (+2 gems)!")

        # Sentinel bonus: if portal collapsed during extraction, gain extra random gems
        if portal["stability"] <= 0 and self._player_seeker_power(player) == "collapse_bonus":
            g_extra = []
            for _ in range(2):
                s = self._draw_gem_from_supply()
                if s:
                    player["gems"][s] += 1
                    g_extra.append(GEM_ICONS[s])
            if g_extra:
                self._log("info", f"🛡️ Sentinel scavenges {' '.join(g_extra)} from the collapse!")

        return {"ok": True}

    def _action_build(self, player, params):
        construct_index = params.get("construct_index")
        if construct_index is None or construct_index < 0 or construct_index >= len(self.construct_display):
            return {"error": "Invalid construct index"}

        construct = self.construct_display[construct_index]

        # Tier gating
        if not self._can_build_tier(player, construct["tier"]):
            return {"error": f"Cannot build {construct['tier']} tier yet. (2 Small needed for Medium, 2S+1M for Large)"}

        cost = dict(construct["cost"])

        # Seeker power: build discount
        if self._player_seeker_power(player) == "build_discount" and cost:
            # Remove one of the cheapest gem costs
            cheapest_type = min(cost.keys(), key=lambda t: cost[t])
            cost[cheapest_type] -= 1
            if cost[cheapest_type] <= 0:
                del cost[cheapest_type]

        # Check affordability
        for t, amount in cost.items():
            if player["gems"].get(t, 0) < amount:
                return {"error": f"Need {amount}x {GEM_ICONS[t]} but only have {player['gems'].get(t, 0)}"}

        # Pay cost
        for t, amount in cost.items():
            player["gems"][t] -= amount
            self.supply[t] += amount

        # Build logic
        self.construct_display.pop(construct_index)
        player["constructs"].append(construct)

        self._fill_construct_display()

        msg = f"🏗️ {player['name']} built {construct['name']} ({construct['tier']})! (+{construct['vp']} VP)"
        if construct.get("ability_desc"):
            msg += f" — Ability: {construct['ability_desc']}"
        self._log("info", msg)

        # Track speed builder
        if construct["tier"] == "large" and self.first_large_builder is None:
            self.first_large_builder = player["index"]

        # Milestone check (handled at end of do_action, but checking here for token rewards)
        if construct["ability"] == "extra_explorer":
            player["explorer_tokens"] += 1
            self._log("info", f"🧭 {player['name']} gained 1 Explorer Token from Compass Stone!")

        return {"ok": True}

    def _action_stabilize(self, player, params):
        portal_index = params.get("portal_index")
        if portal_index is None or portal_index < 0 or portal_index >= len(self.active_portals):
            return {"error": "Invalid portal index"}

        portal = self.active_portals[portal_index]
        if portal["stability"] >= portal["max_stability"]:
            return {"error": "Portal is already at max stability"}

        cost = self._get_stabilize_cost(player)
        has_free = self._player_seeker_power(player) == "free_stabilize" and not player["free_stabilize_used"]

        # Check if they can afford
        if not has_free:
            total = self._get_total_gems(player)
            if total < cost:
                return {"error": f"Need {cost} gems to stabilize but only have {total}"}

            # Pay cost (take from most abundant)
            remaining = cost
            for t in sorted(GEM_TYPES, key=lambda x: player["gems"][x], reverse=True):
                while remaining > 0 and player["gems"][t] > 0:
                    player["gems"][t] -= 1
                    self.supply[t] += 1
                    remaining -= 1
        else:
            player["free_stabilize_used"] = True
            self._log("info", f"🛡️ {player['name']} used their FREE stabilize (Water Seeker)")

        portal["stability"] = min(portal["max_stability"], portal["stability"] + 1)
        
        # Track for Portal Warden contract
        if portal["id"] not in player["portals_stabilized"]:
            player["portals_stabilized"].append(portal["id"])

        tokens = 2 if self._player_has_ability(player, "double_guardian") else 1
        player["guardian_tokens"] += tokens

        cost_str = "free" if has_free else f"{self._get_stabilize_cost(player)} Gems"
        self._log("action",
            f"🛡️ {player['name']} stabilized {portal['type'].title()} Portal ({cost_str}) "
            f"— +{tokens} Guardian Token(s)")
        return {"ok": True}

    def _action_trade_bank(self, player, params):
        give_type = params.get("give_type")
        receive_type = params.get("receive_type")
        if not give_type or not receive_type or give_type == receive_type:
            return {"error": "Must choose different types to trade"}

        rate = self._get_trade_rate(player)
        if player["gems"].get(give_type, 0) < rate:
            return {"error": f"Need {rate}x {GEM_ICONS[give_type]} to trade"}
        if self.supply[receive_type] < 1:
            return {"error": f"Bank is out of {GEM_ICONS[receive_type]}"}

        # Swap
        player["gems"][give_type] -= rate
        self.supply[give_type] += rate
        player["gems"][receive_type] += 1
        self.supply[receive_type] -= 1
        player["trades_completed"] += 1

        self._log("action", f"🤝 {player['name']} traded {rate}× {GEM_ICONS[give_type]} for 1× {GEM_ICONS[receive_type]} (Bank)")
        return {"ok": True}

    def _action_convert(self, player, params):
        from_type = params.get("from_type")
        to_type = params.get("to_type")
        if not from_type or not to_type or from_type == to_type:
            return {"error": "Invalid conversion"}
        if not self._player_has_ability(player, "gem_convert") or player["gem_convert_used"]:
            return {"error": "Gem Forge already used this round or not available"}
        if player["gems"].get(from_type, 0) < 1:
            return {"error": f"No {GEM_ICONS[from_type]} to convert"}

        player["gems"][from_type] -= 1
        self.supply[from_type] += 1
        player["gems"][to_type] += 1
        self.supply[to_type] -= 1
        player["gem_convert_used"] = True

        self._log("info", f"🔧 {player['name']} used Gem Forge: {GEM_ICONS[from_type]} → {GEM_ICONS[to_type]}")
        return {"ok": True}

    def _action_trade_offer(self, player, params):
        if self.active_trade: return {"error": "A trade is already active"}
        give = {k: v for k, v in params.get("give", {}).items() if v > 0}
        request = {k: v for k, v in params.get("request", {}).items() if v > 0}
        if not give and not request: return {"error": "Empty trade offer"}
        for t, count in give.items():
            if player["gems"].get(t, 0) < count: return {"error": f"You lack {count} {t}"}
        self.active_trade = {
            "initiator": player["index"], "initiator_name": player["name"],
            "give": give, "request": request, "responses": {}
        }
        self._log("info", f"🤝 {player['name']} opened a trade offer to the table.")
        return {"ok": True}

    def _action_trade_respond(self, player, params):
        if not self.active_trade: return {"error": "No active trade"}
        if player["index"] == self.active_trade["initiator"]: return {"error": "You initiated this"}
        status = params.get("status")
        if status not in ["accept", "reject", "counter"]: return {"error": "Invalid response"}

        if status == "accept":
            for t, count in self.active_trade["request"].items():
                if player["gems"].get(t, 0) < count: return {"error": f"Not enough {t}"}
            self.active_trade["responses"][str(player["index"])] = {"status": "accept"}
            self._log("info", f"✅ {player['name']} accepted the trade request!")
        elif status == "reject":
            self.active_trade["responses"][str(player["index"])] = {"status": "reject"}
        elif status == "counter":
            give = {k: v for k, v in params.get("give", {}).items() if v > 0}
            request = {k: v for k, v in params.get("request", {}).items() if v > 0}
            if not give and not request: return {"error": "Empty counter"}
            for t, count in give.items():
                if player["gems"].get(t, 0) < count: return {"error": f"Not enough {t}"}
            self.active_trade["responses"][str(player["index"])] = {
                "status": "counter", "give": give, "request": request
            }
            self._log("info", f"🔄 {player['name']} made a counter-offer.")
        return {"ok": True}

    def _action_trade_cancel(self, player, params):
        if not self.active_trade or self.active_trade["initiator"] != player["index"]:
            return {"error": "Not your trade"}
        self.active_trade = None
        self._log("info", f"❌ {player['name']} cancelled their trade offer.")
        return {"ok": True}

    def _action_trade_confirm(self, player, params):
        if not self.active_trade or self.active_trade["initiator"] != player["index"]:
            return {"error": "Not your trade"}
        partner_idx = params.get("partner_idx")
        resp = self.active_trade["responses"].get(str(partner_idx))
        if not resp or resp["status"] not in ["accept", "counter"]:
            return {"error": "Invalid partner response"}

        partner = self.players[int(partner_idx)]
        give_p1 = self.active_trade["give"]
        give_p2 = self.active_trade["request"]
        if resp["status"] == "counter":
            give_p2 = resp["give"]
            give_p1 = resp["request"]

        for t, count in give_p1.items():
            if player["gems"].get(t, 0) < count: return {"error": "You no longer have the gems"}
        for t, count in give_p2.items():
            if partner["gems"].get(t, 0) < count: return {"error": f"{partner['name']} lacks gems"}

        for t, count in give_p1.items():
            player["gems"][t] -= count
            partner["gems"][t] += count
        for t, count in give_p2.items():
            partner["gems"][t] -= count
            player["gems"][t] += count

        player["trades_completed"] += 1
        partner["trades_completed"] += 1
        self.active_trade = None
        self._log("action", f"🤝 {player['name']} and {partner['name']} traded gems!")
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

            # If player gained gems out of turn (via Tolls or Anomalies), enforce limit before they act
            if self._check_hand_limit(p):
                self.phase = "discard"
                self._log("info", f"⚠️ {p['name']} exceeded hand limit out-of-turn! Must discard {self.discard_required} gem(s).")

    def _stability_check(self):
        collapsed = [r for r in self.active_portals if r["stability"] <= 0]
        for portal in collapsed:
            self._collapse_portal(portal)

    def _cleanup_round(self):
        # Clear claims (except persistent ones)
        to_remove = []
        for rid, claim in self.portal_claims.items():
            claim["rounds_left"] -= 1
            if claim["rounds_left"] <= 0:
                to_remove.append(rid)
        for rid in to_remove:
            del self.portal_claims[rid]

        # Reset per-round flags
        for p in self.players:
            p["free_stabilize_used"] = False
            p["gem_convert_used"] = False

        # Underdog bonus
        fewest = min(len(p["constructs"]) for p in self.players)
        for p in self.players:
            if len(p["constructs"]) == fewest:
                s = self._draw_gem_from_supply()
                if s:
                    p["gems"][s] += 1

    def _start_new_round(self):
        self.round_num += 1
        self.first_player_offset = (self.first_player_offset + 1) % self.player_count
        self._log("info", f"━━━ Round {self.round_num} ━━━")

        if self.portal_deck:
            self._reveal_portal()
        else:
            self._log("info", "📦 Portal deck empty!")

        if self._check_game_end():
            return

        first = self.first_player_offset % self.player_count
        self.current_player = first
        p = self.players[first]
        self.actions_remaining = self._get_actions_per_turn(p)
        self.extracts_this_turn = 0

        if self._check_hand_limit(p):
            self.phase = "discard"
            self._log("info", f"⚠️ {p['name']} exceeded hand limit out-of-turn! Must discard {self.discard_required} gem(s).")
        else:
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
            if len(p["constructs"]) >= self.constructs_end_count:
                self.phase = "game_over"
                self.game_end_trigger = "constructs"
                self._log("info", f"🏆 {p['name']} built {self.constructs_end_count} Constructs! Game ends!")
                self._calculate_scores()
                return True
        if not self.portal_deck and self.actions_remaining <= 0:
            play_order = [(self.first_player_offset + i) % self.player_count
                          for i in range(self.player_count)]
            if self.current_player == play_order[-1]:
                self.phase = "game_over"
                self.game_end_trigger = "deck_empty"
                self._log("info", "📦 Portal deck exhausted! Game ends!")
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
            return self._get_total_gems(player) == self._get_hand_limit(player)
        if cid == "master_builder":
            return self._count_constructs_by_tier(player, "large") >= 2
        if cid == "toll_collector":
            return player["tolls_collected"] >= 5
        if cid == "portal_warden":
            return len(player["portals_stabilized"]) >= 4
        if cid == "specialist":
            return any(player["gems"][t] >= 8 for t in GEM_TYPES)
        if cid == "rainbow":
            return all(player["gems"][t] >= 2 for t in GEM_TYPES)
        if cid == "trader":
            return player["trades_completed"] >= 6
        if cid == "ember_lord":
            return len(player["portal_harvests"].get("ember", [])) >= 3
        if cid == "tide_lord":
            return len(player["portal_harvests"].get("tide", [])) >= 3
        if cid == "daredevil":
            return player["deep_harvests"] >= 3
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

            # Gem sets
            gem_counts = [p["gems"][t] for t in GEM_TYPES]
            min_count = min(gem_counts)
            gset = 0
            if min_count >= 2:
                gset += 8
            elif min_count >= 1:
                gset += 3
            for t in GEM_TYPES:
                gset += p["gems"][t] // 3
            score["breakdown"]["gem_sets"] = gset
            score["total"] += gset

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

    def _get_total_gems(self, player):
        return sum(player["gems"].values())

    def _check_hand_limit(self, player):
        limit = HAND_LIMIT
        if self._player_has_ability(player, "hand_limit_up"):
            limit = 12
        total = self._get_total_gems(player)
        if total > limit:
            self.discard_required = total - limit
            return True
        return False

    def get_available_actions(self):
        if self.phase == "discard":
            return [{"action": "discard", "label": "Discard", "icon": "🗑️",
                     "description": f"Discard {self.discard_required} gem(s) to meet hand limit",
                     "helper": "Click gems in your panel to select them for discard"}]
        if self.phase != "playing" or self.actions_remaining <= 0:
            return []
        player = self.players[self.current_player]
        actions = []

        # Collect
        if self.gem_market:
            gc = self._get_collect_count(player)
            actions.append({"action": "collect", "label": "Collect", "icon": "💎",
                "description": f"Take {gc} Gem(s) from the Market",
                "helper": f"Click {gc} gem(s) in the market"})

        # Harvest
        if self.active_portals:
            can = True
            if self._player_seeker_power(player) == "extra_action" and self.extracts_this_turn >= 1:
                can = False
            if can:
                actions.append({"action": "harvest", "label": "Harvest", "icon": "⛏️",
                    "description": "Harvest Gems from a Portal (claims it, costs stability)",
                    "helper": "Click a Portal. Hold Shift for Deep Harvest. Claimed portals cost a toll."})

        # Build
        for c in self.construct_display:
            if self._can_build_tier(player, c["tier"]):
                cost = dict(c["cost"])
                if self._player_seeker_power(player) == "build_discount" and cost:
                    cheapest = min(cost, key=cost.get)
                    cost[cheapest] = max(0, cost[cheapest] - 1)
                    if cost[cheapest] == 0:
                        del cost[cheapest]
                if all(player["gems"].get(t, 0) >= a for t, a in cost.items()):
                    actions.append({"action": "build", "label": "Build", "icon": "🏗️",
                        "description": "Build a Construct (tier gated: 2 Small → Medium → Large)",
                        "helper": "Click an affordable Construct"})
                    break

        # Stabilize
        stab_cost = self._get_stabilize_cost(player)
        has_free = (self._player_seeker_power(player) == "free_stabilize"
                    and not player["free_stabilize_used"])
        if any(r["stability"] < r["max_stability"] for r in self.active_portals):
            if self._get_total_gems(player) >= stab_cost or has_free:
                fc = "0 (free!)" if has_free else str(stab_cost)
                actions.append({"action": "stabilize", "label": "Stabilize", "icon": "🛡️",
                    "description": f"Spend {fc} Gems → Portal +1, earn Guardian Token",
                    "helper": "Click a damaged Portal"})

        # Trade
        rate = self._get_trade_rate(player)
        if any(player["gems"].get(t, 0) >= rate for t in GEM_TYPES):
            actions.append({"action": "trade_bank", "label": "Trade", "icon": "🤝",
                "description": f"Bank trade: {rate}:1",
                "helper": "Select gem to give and receive"})

        # Convert (free action)
        if (self._player_has_ability(player, "gem_convert")
                and not player["gem_convert_used"]
                and self._get_total_gems(player) > 0):
            actions.append({"action": "convert", "label": "Convert", "icon": "🔧",
                "description": "Free: Convert 1 gem to any type (Gem Forge)",
                "helper": "Select gem to convert from and to"})

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

            # 3. Daredevil (3 Deep Harvests)
            if "daredevil" not in m and p["deep_harvests"] >= 3:
                m.append("daredevil")
                p["score"] = p.get("score", 0) + 2
                self._log("info", f"🏆 MILESTONE! {p['name']} performed 3 Deep Harvests: Daredevil! (+2 VP)")

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
        if current_p and self._player_has_ability(current_p, "peek_deck") and self.portal_deck:
            peek_cards = []
            for card in self.portal_deck[:1]:
                if card.get("is_anomaly"):
                    peek_cards.append({"type": "anomaly", "name": card["name"]})
                else:
                    peek_cards.append({"type": "portal", "rift_type": card["type"],
                                       "stability": card["max_stability"]})

        return {
            "game_id": self.game_id,
            "mode": self.mode,
            "phase": self.phase,
            "round": self.round_num,
            "current_player": self.current_player,
            "actions_remaining": self.actions_remaining,
            "discard_required": self.discard_required,
            "hand_limit": HAND_LIMIT,
            "active_trade": self.active_trade,
            "constructs_end_count": self.constructs_end_count,
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
                    "gems": dict(p["gems"]),
                    "constructs": p["constructs"],
                    "guardian_tokens": p["guardian_tokens"],
                    "explorer_tokens": p["explorer_tokens"],
                    "explored_types": p["explored_types"],
                    "tolls_collected": p["tolls_collected"],
                    "trades_completed": p["trades_completed"],
                    "deep_harvests": p["deep_harvests"],
                    "score": p.get("score"),
                }
                for p in self.players
            ],
            "active_portals": self.active_portals,
            "portal_claims": {k: v for k, v in self.portal_claims.items()},
            "gem_market": list(self.gem_market),
            "construct_display": self.construct_display,
            "fracture": self.fracture,
            "fracture_threshold": self.fracture_threshold,
            "portal_deck_remaining": len([c for c in self.portal_deck if not c.get("is_anomaly")]),
            "activity_log": self.activity_log[-25:],
            "available_actions": self.get_available_actions(),
            "game_end_trigger": self.game_end_trigger,
            "peek_deck": peek_cards,
        }
