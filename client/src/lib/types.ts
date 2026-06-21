// Types mirroring the backend schemas (server/app/schemas.py) exactly.

export type ScalarFeedback = "match" | "miss";
export type DirectionFeedback = "match" | "higher" | "lower";
export type ElementFeedback = "match" | "partial" | "miss";

export interface Entity {
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
  guess: Entity;
  feedback: ClassicGuessFeedback;
  is_correct: boolean;
}

export interface ClassicTodayResponse {
  puzzle_date: string; // ISO date
  puzzle_number: number;
  entities: Entity[];
  yesterday: Entity | null; // previous day's answer (no longer a spoiler)
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

// Client-only state.

export type GameStatus = "in_progress" | "won" | "lost";

export interface StoredGameState {
  guesses: ClassicGuessResponse[];
  status: GameStatus;
  puzzle_number: number;
  stats_recorded: boolean; // prevents double-counting stats on refresh
  revealed_answer?: Entity | null; // optional: pre-reveal states lack it
}

// Pictos game state — parallels StoredGameState.
export interface PictoStoredGameState {
  guesses: PictoGuessResponse[];
  status: GameStatus;
  puzzle_number: number;
  stats_recorded: boolean; // prevents double-counting stats on refresh
  revealed_answer?: Picto | null; // optional: pre-reveal states lack it
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
