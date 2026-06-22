from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


# Full in-game element taxonomy, shared by Weapon (scalar) and Character
# (multi-valued). Validating against all 8 — not just the values currently in the
# data — avoids loud-failing a valid/DLC Physical character in the seed.
Element = Literal["Physical", "Fire", "Ice", "Lightning", "Earth", "Light", "Dark", "Void"]

# Closed-set Character fields, derived exactly from characters.json. Reused by the
# seed validator via get_args to fail loudly on enum typos.
CharacterGender = Literal["Female", "Male", "Unknown"]
CharacterRole = Literal["Boss", "NPC", "Optional Boss", "Playable"]
CharacterCategory = Literal[
    "Axon", "Gestral", "Human", "Mythical Creature", "Nevron", "Painted Human"
]
CharacterAffiliation = Literal[
    "Independent", "Expedition 33", "Dessendre Family", "Lumière", "Gestrals",
    "Painted Dessendre Family", "Expedition Zero",
]


class CharacterRead(BaseModel):
    """Public view of a character. Built from ORM rows via from_attributes.

    The DB columns are plain strings, but the closed-set scalar fields (gender,
    role, category) are constrained here with Literal so invalid values surface at
    the schema layer — mirroring WeaponRead/PictoRead. weapon and zone stay open
    (str); element/affiliation stay list[str] (their closed sets are enforced in
    the seed via get_args, like scaling_stats/stats).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    gender: CharacterGender
    role: CharacterRole
    weapon: str
    element: list[str]
    act_introduced: int
    category: CharacterCategory
    affiliation: list[str]
    zone: str
    image: Optional[str] = None


PictoType = Literal["Offensive", "Defensive", "Support"]
PictoEffectCategory = Literal[
    "AP", "Break", "Burn", "Critical", "Damage", "Death/Revive",
    "Free Aim / Other", "Heal", "Shield", "Status",
]
PictoSource = Literal["Boss Drop", "Merchant", "Paint Cage", "Pickup", "Quest"]
# stats stays list[str] on the wire (like scaling_stats); this closed set is
# reused by the seed to validate the multi-value column loudly.
PictoStat = Literal["HP", "Crit", "SPD", "DEF"]


class PictoRead(BaseModel):
    """Public view of a Picto. Built from ORM rows via from_attributes.

    The DB columns are plain strings, but the closed-set fields (type,
    effect_category, source) are constrained here with Literal so invalid values
    surface at the schema layer. zone_obtained stays open (str) for DLC zones.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: PictoType
    stats: list[str]
    lumina_cost: int
    effect_category: PictoEffectCategory
    source: PictoSource
    zone_obtained: str
    act_introduced: int
    image: Optional[str] = None


class ClassicTodayResponse(BaseModel):
    """Response for GET /api/classic/today.

    Intentionally does NOT expose which character is the answer; the full
    character list is included so the frontend can do autocomplete.
    """

    puzzle_date: date
    puzzle_number: int
    characters: list[CharacterRead]
    yesterday: Optional[CharacterRead] = None  # previous day's answer (over, so public)


ScalarFeedback = Literal["match", "miss"]
DirectionFeedback = Literal["match", "higher", "lower"]
ElementFeedback = Literal["match", "partial", "miss"]


class RevealRequest(BaseModel):
    """Body for POST /api/<mode>/reveal: the ids the player has guessed. Shared by
    both modes; the answer is returned only on a proven solve/loss (see routers)."""

    guess_ids: list[int]


class ClassicGuessRequest(BaseModel):
    """Request body for POST /api/classic/guess."""

    character_id: int


class ClassicGuessFeedback(BaseModel):
    """Per-attribute comparison of a guess against today's answer.

    Directional values are answer-relative: "higher" means the answer's value
    is higher than the guess's (act_introduced only). "partial" (element only)
    means overlapping but unequal sets.
    """

    gender: ScalarFeedback
    role: ScalarFeedback
    weapon: ScalarFeedback
    element: ElementFeedback
    act_introduced: DirectionFeedback
    category: ScalarFeedback
    affiliation: ElementFeedback
    zone: ScalarFeedback


class ClassicGuessResponse(BaseModel):
    """Response for POST /api/classic/guess.

    Echoes the guessed character plus feedback. The answer character never
    appears here in any form — name is not compared per-attribute; is_correct
    covers it.
    """

    guess: CharacterRead
    feedback: ClassicGuessFeedback
    is_correct: bool


class PictoTodayResponse(BaseModel):
    """Response for GET /api/pictos/today.

    Mirrors ClassicTodayResponse: the answer picto is never singled out; the
    full picto list is included so the frontend can do autocomplete.
    """

    puzzle_date: date
    puzzle_number: int
    pictos: list[PictoRead]
    yesterday: Optional[PictoRead] = None  # previous day's answer (over, so public)


class PictoGuessRequest(BaseModel):
    """Request body for POST /api/pictos/guess."""

    picto_id: int


class PictoGuessFeedback(BaseModel):
    """Per-attribute comparison of a picto guess against today's answer.

    Reuses the classic feedback atoms: scalar (match/miss) for the closed-set
    fields, ElementFeedback (match/partial/miss) for the multi-value `stats`,
    and DirectionFeedback (match/higher/lower) for the numeric fields.
    """

    type: ScalarFeedback
    stats: ElementFeedback
    lumina_cost: DirectionFeedback
    effect_category: ScalarFeedback
    source: ScalarFeedback
    zone_obtained: ScalarFeedback
    act_introduced: DirectionFeedback


class PictoGuessResponse(BaseModel):
    """Response for POST /api/pictos/guess.

    Echoes the guessed picto plus feedback. The answer picto never appears here
    in any form — name is not compared per-attribute; is_correct covers it.
    """

    guess: PictoRead
    feedback: PictoGuessFeedback
    is_correct: bool


# wielder is multi-valued: Gustave & Verso share weapons, so a shared weapon
# carries both names. Stays list[str] on the wire (like scaling_stats); these
# individual names are the closed set the seed validates each entry against.
WeaponWielder = Literal["Gustave", "Verso", "Lune", "Maelle", "Sciel", "Monoco"]
WeaponSource = Literal["Starting", "Boss Drop", "Merchant", "Pickup", "Paint Cage", "Quest"]
# scaling_stats stays list[str] on the wire (mirrors Picto.stats); this closed set
# is reused by the seed to validate the multi-value column loudly.
WeaponScalingStat = Literal["Vitality", "Might", "Agility", "Defense", "Luck"]


class WeaponRead(BaseModel):
    """Public view of a Weapon. Built from ORM rows via from_attributes.

    The DB columns are plain strings, but the closed-set scalar fields (element,
    source) are constrained here with Literal so invalid values surface at the
    schema layer. wielder and scaling_stats stay open (list[str]) — multi-valued,
    with their closed sets enforced in the seed via get_args.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    wielder: list[str]
    element: Element
    max_power: int
    scaling_stats: list[str]
    source: WeaponSource
    act_introduced: int
    image: Optional[str] = None


class WeaponTodayResponse(BaseModel):
    """Response for GET /api/weapons/today.

    Mirrors PictoTodayResponse: the answer weapon is never singled out; the full
    weapon list is included so the frontend can do autocomplete.
    """

    puzzle_date: date
    puzzle_number: int
    weapons: list[WeaponRead]
    yesterday: Optional[WeaponRead] = None  # previous day's answer (over, so public)


class WeaponGuessRequest(BaseModel):
    """Request body for POST /api/weapons/guess."""

    weapon_id: int


class WeaponGuessFeedback(BaseModel):
    """Per-attribute comparison of a weapon guess against today's answer.

    Reuses the shared feedback atoms: scalar (match/miss) for the closed-set
    fields, ElementFeedback (match/partial/miss) for the multi-value
    scaling_stats, and DirectionFeedback (match/higher/lower) for the numeric
    fields (max_power and the ordinal act_introduced).
    """

    wielder: ElementFeedback
    element: ScalarFeedback
    max_power: DirectionFeedback
    scaling_stats: ElementFeedback
    source: ScalarFeedback
    act_introduced: DirectionFeedback


class WeaponGuessResponse(BaseModel):
    """Response for POST /api/weapons/guess.

    Echoes the guessed weapon plus feedback. The answer weapon never appears here
    in any form — name is not compared per-attribute; is_correct covers it.
    """

    guess: WeaponRead
    feedback: WeaponGuessFeedback
    is_correct: bool
