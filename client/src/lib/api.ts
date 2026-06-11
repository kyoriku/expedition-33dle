import type { GuessResponse, TodayResponse } from "./types";

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

export function fetchToday(): Promise<TodayResponse> {
  return request<TodayResponse>("/api/today");
}

export function submitGuess(entityId: number): Promise<GuessResponse> {
  return request<GuessResponse>("/api/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity_id: entityId }),
  });
}
