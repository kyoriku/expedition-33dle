// Types mirroring the backend schemas (server/app/schemas.py) exactly.

export type ScalarFeedback = "match" | "miss";
export type DirectionFeedback = "match" | "higher" | "lower";
export type AgeFeedback = "match" | "higher" | "lower" | "unknown";
export type ElementFeedback = "match" | "partial" | "miss";

export interface Entity {
  id: number;
  name: string;
  gender: string;
  age: number | null;
  class_role: string;
  weapon: string;
  element: string[];
  act_introduced: number;
  species: string;
  affiliation: string;
  image: string | null; // portrait filename in /portraits, or null for monogram
}

export interface GuessFeedback {
  gender: ScalarFeedback;
  age: AgeFeedback;
  class_role: ScalarFeedback;
  weapon: ScalarFeedback;
  element: ElementFeedback;
  act_introduced: DirectionFeedback;
  species: ScalarFeedback;
  affiliation: ScalarFeedback;
}

export interface GuessResponse {
  guess: Entity;
  feedback: GuessFeedback;
  is_correct: boolean;
}

export interface TodayResponse {
  puzzle_date: string; // ISO date
  puzzle_number: number;
  entities: Entity[];
  yesterday: Entity | null; // previous day's answer (no longer a spoiler)
}

// Client-only state.

export type GameStatus = "in_progress" | "won" | "lost";

export interface StoredGameState {
  guesses: GuessResponse[];
  status: GameStatus;
  puzzle_number: number;
  stats_recorded: boolean; // prevents double-counting stats on refresh
  revealed_answer?: Entity | null; // optional: pre-reveal states lack it
}

export interface Stats {
  played: number;
  won: number;
  current_streak: number;
  max_streak: number;
  guess_distribution: [number, number, number, number, number, number]; // wins by guess count (1-6)
  last_played_puzzle_number: number | null;
  last_played_date: string | null; // ISO date, used for streak gap detection
}
