import type {
  Entity,
  ClassicGuessResponse,
  ClassicTodayResponse,
  Picto,
  PictoGuessResponse,
  PictoTodayResponse,
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
    const detail = await res
      .json()
      .then((body: { detail?: unknown }) => String(body.detail ?? res.statusText))
      .catch(() => res.statusText);
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export function fetchToday(): Promise<ClassicTodayResponse> {
  return request<ClassicTodayResponse>("/api/classic/today");
}

export function revealAnswer(guessIds: number[]): Promise<Entity> {
  return request<Entity>("/api/classic/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guess_ids: guessIds }),
  });
}

export function submitGuess(entityId: number): Promise<ClassicGuessResponse> {
  return request<ClassicGuessResponse>("/api/classic/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity_id: entityId }),
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
