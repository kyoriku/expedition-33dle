import { describe, expect, it } from "vitest";
import { buildPictosShareString, buildShareString } from "./share";
import type {
  Entity,
  ClassicGuessFeedback,
  ClassicGuessResponse,
  Picto,
  PictoGuessFeedback,
  PictoGuessResponse,
} from "./types";

const ENTITY: Entity = {
  id: 1,
  name: "X",
  gender: "male",
  role: "Boss",
  weapon: "Hybrid",
  element: [],
  act_introduced: 1,
  category: "Nevron",
  affiliation: ["Independent"],
  zone: "The Manor",
  image: null,
};

function row(feedback: Partial<ClassicGuessFeedback>, is_correct = false): ClassicGuessResponse {
  return {
    guess: ENTITY,
    is_correct,
    feedback: {
      gender: "miss",
      role: "miss",
      weapon: "miss",
      element: "miss",
      act_introduced: "lower", // DirectionFeedback has no "miss"
      category: "miss",
      affiliation: "miss",
      zone: "miss",
      ...feedback,
    },
  };
}

const gridLines = (s: string) =>
  s.split("\n").filter((l) => /[🟩🟨🟥]/u.test(l));

describe("buildShareString", () => {
  it("writes the header with mode label, puzzle number and X/6 on a loss", () => {
    const out = buildShareString([row({})], 42, "lost");
    expect(out.startsWith("Expedition 33dle Classic #42 X/6")).toBe(true);
  });

  it("uses the guess count for a win", () => {
    const out = buildShareString([row({}, true)], 7, "won");
    expect(out.startsWith("Expedition 33dle Classic #7 1/6")).toBe(true);
  });

  it("maps states to emoji, folding directions into red and partial into yellow", () => {
    const out = buildShareString(
      [
        row({
          gender: "match", // 🟩
          role: "miss", // 🟥
          weapon: "miss", // 🟥
          element: "partial", // 🟨
          act_introduced: "lower", // 🟥
          category: "miss", // 🟥
          affiliation: "miss", // 🟥
          zone: "match", // 🟩
        }),
      ],
      1,
      "lost",
    );
    expect(gridLines(out)[0]).toBe("🟩🟥🟥🟨🟥🟥🟥🟩");
  });

  it("orders rows oldest-on-top", () => {
    const first = row({ gender: "match" });
    const second = row({ zone: "match" });
    const lines = gridLines(buildShareString([first, second], 2, "lost"));
    expect(lines[0]).toBe("🟩🟥🟥🟥🟥🟥🟥🟥"); // first (oldest): gender match
    expect(lines[1]).toBe("🟥🟥🟥🟥🟥🟥🟥🟩"); // second (newest): zone match
  });

  it("ends with the classic route URL", () => {
    expect(buildShareString([row({})], 1, "lost")).toContain(
      "https://expedition33dle.com/classic",
    );
  });
});

const PICTO: Picto = {
  id: 1,
  name: "X",
  type: "Offensive",
  stats: ["Crit"],
  lumina_cost: 5,
  effect_category: "Damage",
  source: "Pickup",
  zone_obtained: "Lumière",
  act_introduced: 1,
  image: null,
};

function pictoRow(
  feedback: Partial<PictoGuessFeedback>,
  is_correct = false,
): PictoGuessResponse {
  return {
    guess: PICTO,
    is_correct,
    feedback: {
      type: "miss",
      stats: "miss",
      lumina_cost: "lower",
      effect_category: "miss",
      source: "miss",
      zone_obtained: "miss",
      act_introduced: "lower",
      ...feedback,
    },
  };
}

describe("buildPictosShareString", () => {
  it("labels the mode, scores out of 8, and links to /pictos on a win", () => {
    const win = buildPictosShareString([pictoRow({}, true)], 7, "won");
    expect(win.startsWith("Expedition 33dle Pictos #7 1/8")).toBe(true);
    expect(win).toContain("https://expedition33dle.com/pictos");
  });

  it("uses X/8 on a loss", () => {
    const loss = buildPictosShareString([pictoRow({})], 7, "lost");
    expect(loss.startsWith("Expedition 33dle Pictos #7 X/8")).toBe(true);
  });

  it("maps the 7 pictos cells to emoji in column order", () => {
    const out = buildPictosShareString(
      [
        pictoRow({
          type: "match", // 🟩
          stats: "partial", // 🟨
          lumina_cost: "higher", // 🟥
          effect_category: "miss", // 🟥
          source: "miss", // 🟥
          zone_obtained: "match", // 🟩
          act_introduced: "lower", // 🟥
        }),
      ],
      1,
      "lost",
    );
    expect(gridLines(out)[0]).toBe("🟩🟨🟥🟥🟥🟩🟥");
  });

  it("orders rows oldest-on-top", () => {
    const first = pictoRow({ type: "match" });
    const second = pictoRow({ act_introduced: "match" });
    const lines = gridLines(buildPictosShareString([first, second], 2, "lost"));
    expect(lines[0]).toBe("🟩🟥🟥🟥🟥🟥🟥"); // first (oldest): type match
    expect(lines[1]).toBe("🟥🟥🟥🟥🟥🟥🟩"); // second (newest): act match
  });
});
