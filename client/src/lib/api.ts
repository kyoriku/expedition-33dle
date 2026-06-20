import type { Entity, ClassicGuessResponse, ClassicTodayResponse } from "./types";

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

export function revealAnswer(): Promise<Entity> {
  return request<Entity>("/api/classic/reveal");
}

export function submitGuess(entityId: number): Promise<ClassicGuessResponse> {
  return request<ClassicGuessResponse>("/api/classic/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity_id: entityId }),
  });
}
