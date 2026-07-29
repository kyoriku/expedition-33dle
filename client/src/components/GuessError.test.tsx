import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import GuessError from "./GuessError";
import { ApiError } from "../lib/api";

describe("GuessError", () => {
  it("shows the server's detail when the guess was rejected by the API", () => {
    render(<GuessError error={new ApiError(403, "Puzzle not yet completed")} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Puzzle not yet completed");
  });

  it("falls back to offline copy for a non-API failure", () => {
    render(<GuessError error={new TypeError("Failed to fetch")} />);
    // The raw network error is never surfaced — it means nothing to a player.
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Guess failed — check your connection and try again",
    );
  });

  it("stays sized to the combobox above it, not the page container", () => {
    render(<GuessError error={new TypeError("Failed to fetch")} />);
    expect(screen.getByRole("alert")).toHaveClass("max-w-md");
  });
});
