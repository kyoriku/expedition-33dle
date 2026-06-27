import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import GuessRowBase from "./GuessRowBase";
import { WEAPONS_ATTRIBUTES } from "../lib/attributes";
import { WEAPONS_GRID_TEMPLATE } from "./gridTemplates";
import type { WeaponGuessResponse } from "../lib/types";

const response = (image: string | null): WeaponGuessResponse => ({
  guess: {
    id: 1,
    name: "Blodam",
    wielder: ["Gustave", "Verso"],
    element: "Physical",
    max_power: 3000,
    scaling_stats: ["Vitality"],
    source: "Pickup",
    act_introduced: 1,
    image,
  },
  is_correct: false,
  feedback: {
    wielder: "miss",
    element: "miss",
    max_power: "lower",
    scaling_stats: "miss",
    source: "miss",
    act_introduced: "lower",
  },
});

describe("WeaponsGuessRow", () => {
  it("renders the weapon icon from /weapons when an image is set", () => {
    const { container } = render(
      <GuessRowBase
        result={response("blodam.webp")}
        attributes={WEAPONS_ATTRIBUTES}
        gridTemplate={WEAPONS_GRID_TEMPLATE}
        dir="weapons"
      />,
    );
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/weapons/blodam.webp",
    );
  });

  it("falls back to a monogram when the weapon has no image", () => {
    const { container, getByText } = render(
      <GuessRowBase
        result={response(null)}
        attributes={WEAPONS_ATTRIBUTES}
        gridTemplate={WEAPONS_GRID_TEMPLATE}
        dir="weapons"
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(getByText("B")).toBeInTheDocument(); // monogram, not the name span
  });
});
