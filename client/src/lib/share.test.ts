import { describe, expect, it } from "vitest";
import { buildShareString } from "./share";
import type { Entity, GuessFeedback, GuessResponse } from "./types";

const ENTITY: Entity = {
  id: 1,
  name: "X",
  gender: "male",
  age: null,
  class_role: "Boss",
  weapon: "Hybrid",
  element: [],
  act_introduced: 1,
  species: "Nevron",
  affiliation: "Independent",
  image: null,
};

function row(feedback: Partial<GuessFeedback>, is_correct = false): GuessResponse {
  return {
    guess: ENTITY,
    is_correct,
    feedback: {
      gender: "miss",
      age: "lower", // AgeFeedback has no "miss"; directions render as red
      class_role: "miss",
      weapon: "miss",
      element: "miss",
      act_introduced: "lower", // DirectionFeedback has no "miss"
      species: "miss",
      affiliation: "miss",
      ...feedback,
    },
  };
}

const gridLines = (s: string) =>
  s.split("\n").filter((l) => /[🟩🟨🟥]/u.test(l));

describe("buildShareString", () => {
  it("writes the header with puzzle number and X/6 on a loss", () => {
    const out = buildShareString([row({})], 42, "lost");
    expect(out.startsWith("Expedition 33dle #42 X/6")).toBe(true);
  });

  it("uses the guess count for a win", () => {
    const out = buildShareString([row({}, true)], 7, "won");
    expect(out.startsWith("Expedition 33dle #7 1/6")).toBe(true);
  });

  it("maps states to emoji, folding directions into red and unknown/partial into yellow", () => {
    const out = buildShareString(
      [
        row({
          gender: "match", // 🟩
          age: "unknown", // 🟨
          class_role: "miss", // 🟥
          weapon: "miss", // 🟥
          element: "partial", // 🟨
          act_introduced: "lower", // 🟥
          species: "miss", // 🟥
          affiliation: "miss", // 🟥
        }),
      ],
      1,
      "lost",
    );
    expect(gridLines(out)[0]).toBe("🟩🟨🟥🟥🟨🟥🟥🟥");
  });

  it("orders rows newest-on-top", () => {
    const first = row({ gender: "match" });
    const second = row({ age: "match" });
    const lines = gridLines(buildShareString([first, second], 2, "lost"));
    expect(lines[0]).toBe("🟥🟩🟥🟥🟥🟥🟥🟥"); // second (newest): age match
    expect(lines[1]).toBe("🟩🟥🟥🟥🟥🟥🟥🟥"); // first: gender match
  });

  it("ends with the site URL", () => {
    expect(buildShareString([row({})], 1, "lost")).toContain(
      "https://expedition33dle.com",
    );
  });
});
