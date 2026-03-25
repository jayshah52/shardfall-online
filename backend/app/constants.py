"""
SHARDFALL V2 — Game Constants & Card Definitions
Updated: claims/tolls, contracts, 24 constructs, 8 anomalies, 20 rifts, 15 contracts.
"""

SHARD_TYPES = ["ember", "tide", "verdant", "storm", "void"]

SHARD_COLORS = {
    "ember": "#e74c3c", "tide": "#3498db", "verdant": "#27ae60",
    "storm": "#f1c40f", "void": "#9b59b6",
}

SHARD_ICONS = {
    "ember": "🔴", "tide": "🔵", "verdant": "🟢", "storm": "🟡", "void": "🟣",
}

HAND_LIMIT = 10

# 20 Rift Cards: 4 per type with stabilities 2, 3, 3, 4
RIFT_CARDS = []
_rift_id = 0
for _stype in SHARD_TYPES:
    for _stab in [2, 3, 3, 4]:
        RIFT_CARDS.append({"id": _rift_id, "type": _stype, "max_stability": _stab})
        _rift_id += 1

# 8 Anomaly Cards — shuffled throughout the ENTIRE deck
ANOMALY_CARDS = [
    {"id": "dimensional_surge", "name": "Dimensional Surge",
     "description": "All active Rifts lose 1 stability!", "icon": "🌋"},
    {"id": "shard_rain", "name": "Shard Rain",
     "description": "Every player gains 2 random Shards!", "icon": "🎁"},
    {"id": "reality_shift", "name": "Reality Shift",
     "description": "All Constructs in display are replaced!", "icon": "🔄"},
    {"id": "rift_storm", "name": "Rift Storm",
     "description": "Lowest-stability Rift collapses immediately!", "icon": "⚡"},
    {"id": "dimensional_calm", "name": "Dimensional Calm",
     "description": "All Rifts gain 1 stability (up to max).", "icon": "💫"},
    {"id": "convergence", "name": "Convergence",
     "description": "Each player with 2+ shards contributes 2 → Fracture −1, +1 Guardian Token.", "icon": "🤝"},
    {"id": "market_surge", "name": "Market Surge",
     "description": "Market refills to 6 shards! Each player takes 1 free shard.", "icon": "🎭"},
    {"id": "rift_merge", "name": "Rift Merge",
     "description": "Lowest-stability Rift is removed. Second-lowest gains +2 stability!", "icon": "🌀"},
]

# 22 Construct Cards  — SMALL (9) / MEDIUM (7) / LARGE (6)
CONSTRUCT_CARDS = [
    # === SMALL (3-4 shards, 2-3 VP) ===
    {"id": 0, "name": "Shard Lens", "tier": "small", "vp": 2,
     "cost": {"ember": 2, "tide": 1}, "ability": "gather_bonus",
     "ability_desc": "Gather takes 2 Shards instead of 1"},
    {"id": 1, "name": "Drift Anchor", "tier": "small", "vp": 2,
     "cost": {"verdant": 2, "storm": 1}, "ability": "stabilize_discount",
     "ability_desc": "Stabilize costs 1 Shard instead of 2"},
    {"id": 2, "name": "Trade Post", "tier": "small", "vp": 2,
     "cost": {"tide": 1, "verdant": 1, "storm": 1}, "ability": "trade_discount",
     "ability_desc": "Bank trades at 2:1 instead of 3:1"},
    {"id": 3, "name": "Warden's Seal", "tier": "small", "vp": 3,
     "cost": {"ember": 1, "tide": 1, "verdant": 1, "storm": 1},
     "ability": None, "ability_desc": None},
    {"id": 4, "name": "Compass Stone", "tier": "small", "vp": 2,
     "cost": {"void": 2}, "ability": "extra_explorer",
     "ability_desc": "Gain 1 Explorer Token when built"},
    {"id": 5, "name": "Shard Forge", "tier": "small", "vp": 2,
     "cost": {"ember": 3}, "ability": "shard_convert",
     "ability_desc": "Once per round: convert 1 shard to any type"},
    {"id": 6, "name": "Echo Chamber", "tier": "small", "vp": 3,
     "cost": {"void": 2, "ember": 1}, "ability": None, "ability_desc": None},
    {"id": 7, "name": "Toll Gate", "tier": "small", "vp": 2,
     "cost": {"storm": 2, "tide": 1}, "ability": "toll_bonus",
     "ability_desc": "Tolls you collect are 2 shards instead of 1"},
    {"id": 8, "name": "Scout Tower", "tier": "small", "vp": 2,
     "cost": {"verdant": 1, "tide": 1, "void": 1}, "ability": "peek_deck",
     "ability_desc": "See top card of the Rift Deck at start of your turn"},
    # === MEDIUM (5-6 shards, 4-5 VP) — Requires 2 Small ===
    {"id": 9, "name": "Rift Engine", "tier": "medium", "vp": 4,
     "cost": {"ember": 2, "tide": 2, "void": 1}, "ability": "extract_discount",
     "ability_desc": "Your Extracts cost 1 less stability"},
    {"id": 10, "name": "Harmony Spire", "tier": "medium", "vp": 5,
     "cost": {"verdant": 2, "storm": 2, "tide": 1},
     "ability": None, "ability_desc": None},
    {"id": 11, "name": "Crystal Bastion", "tier": "medium", "vp": 5,
     "cost": {"tide": 2, "verdant": 2, "storm": 2}, "ability": "hand_limit_up",
     "ability_desc": "Your hand limit is raised to 12"},
    {"id": 12, "name": "Storm Harvester", "tier": "medium", "vp": 4,
     "cost": {"storm": 3, "ember": 1, "void": 1},
     "ability": None, "ability_desc": None},
    {"id": 13, "name": "Alliance Hall", "tier": "medium", "vp": 5,
     "cost": {"ember": 1, "tide": 1, "verdant": 1, "storm": 1, "void": 1},
     "ability": None, "ability_desc": None},
    {"id": 14, "name": "Toll Fortress", "tier": "medium", "vp": 4,
     "cost": {"ember": 2, "storm": 2, "void": 1}, "ability": "persistent_claim",
     "ability_desc": "Your claims persist 2 rounds instead of being cleared"},
    {"id": 15, "name": "Market Engine", "tier": "medium", "vp": 4,
     "cost": {"tide": 2, "verdant": 2, "ember": 1}, "ability": "market_bonus",
     "ability_desc": "When you Gather, also take 1 random shard from bag"},
    # === LARGE (7+ shards, 6-8 VP) — Requires 2 Small + 1 Medium ===
    {"id": 16, "name": "Nexus Spire", "tier": "large", "vp": 7,
     "cost": {"ember": 2, "tide": 2, "verdant": 2, "void": 1},
     "ability": "double_guardian",
     "ability_desc": "Stabilize gives 2 Guardian Tokens instead of 1"},
    {"id": 17, "name": "World Anchor", "tier": "large", "vp": 6,
     "cost": {"storm": 4, "ember": 2, "tide": 1}, "ability": "fracture_bonus",
     "ability_desc": "If Fracture ≤ 2 at game end, gain +4 VP"},
    {"id": 18, "name": "Guardian Citadel", "tier": "large", "vp": 7,
     "cost": {"tide": 3, "verdant": 3, "void": 1}, "ability": "double_guardian_vp",
     "ability_desc": "Guardian Tokens worth 2 VP each"},
    {"id": 19, "name": "Explorer's Atlas", "tier": "large", "vp": 7,
     "cost": {"storm": 2, "ember": 2, "verdant": 2, "void": 1},
     "ability": "double_explorer_vp",
     "ability_desc": "Explorer Tokens worth 2 VP each"},
    {"id": 20, "name": "Dimensional Forge", "tier": "large", "vp": 8,
     "cost": {"ember": 2, "tide": 2, "verdant": 2, "storm": 2, "void": 2},
     "ability": None, "ability_desc": None},
    {"id": 21, "name": "Toll Empire", "tier": "large", "vp": 6,
     "cost": {"storm": 3, "ember": 2, "tide": 2}, "ability": "toll_vp",
     "ability_desc": "At game end, gain +1 VP per toll collected"},
]

# 8 Seeker Cards (same as V1)
SEEKER_CARDS = [
    {"id": "ember_seeker", "name": "Ember Seeker", "icon": "🔥",
     "color": "#e74c3c", "power": "ember_extract_bonus",
     "description": "Ember Extracts give +1 extra Shard"},
    {"id": "tide_seeker", "name": "Tide Seeker", "icon": "🌊",
     "color": "#3498db", "power": "free_stabilize",
     "description": "1 free Stabilize per round (no shard cost)"},
    {"id": "verdant_seeker", "name": "Verdant Seeker", "icon": "🌿",
     "color": "#27ae60", "power": "trade_discount",
     "description": "Bank trades cost 2:1 instead of 3:1"},
    {"id": "storm_seeker", "name": "Storm Seeker", "icon": "⚡",
     "color": "#f1c40f", "power": "extra_action",
     "description": "Take 3 actions per turn (max 1 Extract)"},
    {"id": "void_seeker", "name": "Void Seeker", "icon": "🔮",
     "color": "#9b59b6", "power": "build_discount",
     "description": "Constructs cost 1 fewer Shard (cheapest removed)"},
    {"id": "wanderer", "name": "Wanderer", "icon": "🧭",
     "color": "#1abc9c", "power": "double_explore",
     "description": "Gain 2 Explorer Tokens when discovering a new rift type"},
    {"id": "sentinel", "name": "Sentinel", "icon": "🛡️",
     "color": "#7f8c8d", "power": "no_backlash",
     "description": "Immune to Rift collapse backlash"},
    {"id": "diplomat", "name": "Diplomat", "icon": "🤝",
     "color": "#e67e22", "power": "toll_immune",
     "description": "Never pays tolls when extracting from claimed Rifts"},
]

# 15 Contract Cards — secret objectives
CONTRACT_CARDS = [
    {"id": "the_guardian", "name": "The Guardian", "vp": 6, "icon": "🛡️",
     "requirement": "Have 5+ Guardian Tokens at game end"},
    {"id": "universal_explorer", "name": "Universal Explorer", "vp": 8, "icon": "🧭",
     "requirement": "Discover all 5 rift types (1 Explorer per type)"},
    {"id": "essence_hoarder", "name": "Essence Hoarder", "vp": 5, "icon": "💰",
     "requirement": "End with exactly 10 shards (at hand limit)"},
    {"id": "master_builder", "name": "Master Builder", "vp": 7, "icon": "🏗️",
     "requirement": "Build 2+ Large Constructs"},
    {"id": "toll_collector", "name": "Toll Collector", "vp": 5, "icon": "🤝",
     "requirement": "Collect 5+ shards from tolls during the game"},
    {"id": "rift_warden", "name": "Rift Warden", "vp": 6, "icon": "🌀",
     "requirement": "Stabilize 4+ different rifts"},
    {"id": "specialist", "name": "Specialist", "vp": 4, "icon": "🎯",
     "requirement": "Have 8+ shards of a single type at game end"},
    {"id": "rainbow", "name": "Rainbow", "vp": 7, "icon": "💎",
     "requirement": "End with 2+ of each shard type"},
    {"id": "trader", "name": "Trader", "vp": 5, "icon": "♻️",
     "requirement": "Complete 6+ trades (bank or player) during the game"},
    {"id": "ember_lord", "name": "Ember Lord", "vp": 4, "icon": "🌋",
     "requirement": "Extract from 3+ different Ember Rift cards"},
    {"id": "tide_lord", "name": "Tide Lord", "vp": 4, "icon": "🌊",
     "requirement": "Extract from 3+ different Tide Rift cards"},
    {"id": "daredevil", "name": "Daredevil", "vp": 5, "icon": "💀",
     "requirement": "Deep Extract 3+ times during the game"},
    {"id": "fortress_contract", "name": "Fortress", "vp": 6, "icon": "🏰",
     "requirement": "Build 3+ Constructs with abilities"},
    {"id": "world_saver", "name": "World Saver", "vp": 8, "icon": "🌍",
     "requirement": "Fracture is 2 or less at game end"},
    {"id": "speed_builder", "name": "Speed Builder", "vp": 3, "icon": "⚡",
     "requirement": "Be the first player to build a Large Construct"},
]

CONSTRUCTS_END_COUNT = 7
MARKET_SIZE = 4
GATHER_COUNT = 1   # take 1 from market (nerfed from 2)
STARTING_RIFTS = 3  # 3 starting rifts (up from 2)
CONSTRUCT_DISPLAY_SIZE = 5  # show 5 constructs (up from 4)

FRACTURE_THRESHOLDS = {2: 4, 3: 5, 4: 6, 5: 7}
PLAYER_COLORS = ["#e74c3c", "#3498db", "#27ae60", "#f39c12", "#9b59b6"]
