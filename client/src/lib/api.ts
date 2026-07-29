import type {
  Boss,
  BossGuessResponse,
  BossTodayResponse,
  Character,
  ClassicGuessResponse,
  ClassicTodayResponse,
  Picto,
  PictoGuessResponse,
  PictoTodayResponse,
  Weapon,
  WeaponGuessResponse,
  WeaponTodayResponse,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    // Only a string detail is player-facing copy. FastAPI's 422 body carries a
    // list of validation objects, which String() would render as
    // "[object Object]" straight into the guess-error banner.
    const detail = await res
      .json()
      .then((body: { detail?: unknown }) =>
        typeof body.detail === "string" && body.detail ? body.detail : res.statusText,
      )
      .catch(() => res.statusText);
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export function fetchToday(): Promise<ClassicTodayResponse> {
  return request<ClassicTodayResponse>("/api/classic/today");
}

export function revealAnswer(guessIds: number[]): Promise<Character> {
  return request<Character>("/api/classic/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guess_ids: guessIds }),
  });
}

export function submitGuess(characterId: number): Promise<ClassicGuessResponse> {
  return request<ClassicGuessResponse>("/api/classic/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ character_id: characterId }),
  });
}

// Pictos mode — parallels the classic functions above.

export function getPictosToday(): Promise<PictoTodayResponse> {
  return request<PictoTodayResponse>("/api/pictos/today");
}

export function revealPicto(guessIds: number[]): Promise<Picto> {
  return request<Picto>("/api/pictos/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guess_ids: guessIds }),
  });
}

export function submitPictoGuess(pictoId: number): Promise<PictoGuessResponse> {
  return request<PictoGuessResponse>("/api/pictos/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ picto_id: pictoId }),
  });
}

// Weapons mode — parallels the classic/pictos functions above.

export function getWeaponsToday(): Promise<WeaponTodayResponse> {
  return request<WeaponTodayResponse>("/api/weapons/today");
}

export function revealWeapon(guessIds: number[]): Promise<Weapon> {
  return request<Weapon>("/api/weapons/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guess_ids: guessIds }),
  });
}

export function submitWeaponGuess(weaponId: number): Promise<WeaponGuessResponse> {
  return request<WeaponGuessResponse>("/api/weapons/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weapon_id: weaponId }),
  });
}

// Bosses mode — parallels the classic/pictos/weapons functions above.

export function getBossesToday(): Promise<BossTodayResponse> {
  return request<BossTodayResponse>("/api/bosses/today");
}

export function revealBoss(guessIds: number[]): Promise<Boss> {
  return request<Boss>("/api/bosses/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guess_ids: guessIds }),
  });
}

export function submitBossGuess(bossId: number): Promise<BossGuessResponse> {
  return request<BossGuessResponse>("/api/bosses/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boss_id: bossId }),
  });
}
