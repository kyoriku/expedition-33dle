// Types mirroring the backend schemas (server/app/schemas.py) exactly.

export type ScalarFeedback = "match" | "miss";
export type DirectionFeedback = "match" | "higher" | "lower";
export type ElementFeedback = "match" | "partial" | "miss";

export interface Character {
  id: number;
  name: string;
  gender: string;
  role: string;
  weapon: string;
  element: string[];
  act_introduced: number;
  category: string;
  affiliation: string[];
  zone: string;
  image: string | null; // portrait filename in /portraits, or null for monogram
}

export interface Picto {
  id: number;
  name: string;
  type: string;
  stats: string[];
  lumina_cost: number;
  effect_category: string;
  source: string;
  zone_obtained: string;
  act_introduced: number;
  image: string | null; // picto icon filename in /pictos, or null for monogram
}

export interface ClassicGuessFeedback {
  gender: ScalarFeedback;
  role: ScalarFeedback;
  weapon: ScalarFeedback;
  element: ElementFeedback;
  act_introduced: DirectionFeedback;
  category: ScalarFeedback;
  affiliation: ElementFeedback;
  zone: ScalarFeedback;
}

export interface ClassicGuessResponse {
  guess: Character;
  feedback: ClassicGuessFeedback;
  is_correct: boolean;
}

export interface ClassicTodayResponse {
  puzzle_date: string; // ISO date
  puzzle_number: number;
  characters: Character[];
  yesterday: Character | null; // previous day's answer (no longer a spoiler)
}

// Pictos mode — parallels the Classic* shapes (server/app/schemas.py).

export interface PictoGuessFeedback {
  type: ScalarFeedback;
  stats: ElementFeedback;
  lumina_cost: DirectionFeedback;
  effect_category: ScalarFeedback;
  source: ScalarFeedback;
  zone_obtained: ScalarFeedback;
  act_introduced: DirectionFeedback;
}

export interface PictoGuessResponse {
  guess: Picto;
  feedback: PictoGuessFeedback;
  is_correct: boolean;
}

export interface PictoTodayResponse {
  puzzle_date: string; // ISO date
  puzzle_number: number;
  pictos: Picto[];
  yesterday: Picto | null; // previous day's answer (no longer a spoiler)
}

// Weapons mode — parallels the Classic*/Picto* shapes (server/app/schemas.py).

export interface Weapon {
  id: number;
  name: string;
  wielder: string[]; // Gustave & Verso share weapons, so this is a set
  element: string;
  max_power: number;
  scaling_stats: string[];
  source: string;
  act_introduced: number;
  image: string | null; // weapon icon filename in /weapons, or null for monogram
}

export interface WeaponGuessFeedback {
  wielder: ElementFeedback; // multi-value set comparison (match/partial/miss)
  element: ScalarFeedback;
  max_power: DirectionFeedback;
  scaling_stats: ElementFeedback;
  source: ScalarFeedback;
  act_introduced: DirectionFeedback;
}

export interface WeaponGuessResponse {
  guess: Weapon;
  feedback: WeaponGuessFeedback;
  is_correct: boolean;
}

export interface WeaponTodayResponse {
  puzzle_date: string; // ISO date
  puzzle_number: number;
  weapons: Weapon[];
  yesterday: Weapon | null; // previous day's answer (no longer a spoiler)
}

// Bosses mode — parallels the Classic*/Picto*/Weapon* shapes (server/app/schemas.py).

export interface Boss {
  id: number;
  name: string;
  weakness: string[]; // 0+ elements, set-compared
  resistance: string[]; // 0+ elements, set-compared
  category: string;
  location: string; // free-form zone, not a closed set
  encounter: string;
  act_introduced: number;
  image: string | null; // boss icon filename in /bosses, or null for monogram
}

export interface BossGuessFeedback {
  weakness: ElementFeedback; // multi-value set comparison (match/partial/miss)
  resistance: ElementFeedback;
  category: ScalarFeedback;
  location: ScalarFeedback;
  encounter: ScalarFeedback;
  act_introduced: DirectionFeedback;
}

export interface BossGuessResponse {
  guess: Boss;
  feedback: BossGuessFeedback;
  is_correct: boolean;
}

export interface BossTodayResponse {
  puzzle_date: string; // ISO date
  puzzle_number: number;
  bosses: Boss[];
  yesterday: Boss | null; // previous day's answer (no longer a spoiler)
}

// Client-only state.

export type GameStatus = "in_progress" | "won" | "lost";

export interface StoredGameState {
  guesses: ClassicGuessResponse[];
  status: GameStatus;
  puzzle_number: number;
  stats_recorded: boolean; // prevents double-counting stats on refresh
  revealed_answer?: Character | null; // optional: pre-reveal states lack it
}

// Pictos game state — parallels StoredGameState.
export interface PictoStoredGameState {
  guesses: PictoGuessResponse[];
  status: GameStatus;
  puzzle_number: number;
  stats_recorded: boolean; // prevents double-counting stats on refresh
  revealed_answer?: Picto | null; // optional: pre-reveal states lack it
}

// Weapons game state — parallels StoredGameState.
export interface WeaponStoredGameState {
  guesses: WeaponGuessResponse[];
  status: GameStatus;
  puzzle_number: number;
  stats_recorded: boolean; // prevents double-counting stats on refresh
  revealed_answer?: Weapon | null; // optional: pre-reveal states lack it
}

// Bosses game state — parallels StoredGameState.
export interface BossStoredGameState {
  guesses: BossGuessResponse[];
  status: GameStatus;
  puzzle_number: number;
  stats_recorded: boolean; // prevents double-counting stats on refresh
  revealed_answer?: Boss | null; // optional: pre-reveal states lack it
}

export interface Stats {
  played: number;
  won: number;
  current_streak: number;
  max_streak: number;
  guess_distribution: number[]; // wins by guess count (length = mode's max guesses: 6 classic, 8 pictos)
  last_played_puzzle_number: number | null;
  last_played_date: string | null; // ISO date, used for streak gap detection
}
