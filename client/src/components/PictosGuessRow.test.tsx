import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import GuessRowBase from "./GuessRowBase";
import { PICTOS_ATTRIBUTES } from "../lib/attributes";
import { PICTOS_GRID_TEMPLATE } from "./gridTemplates";
import type { PictoGuessResponse } from "../lib/types";

const response = (image: string | null): PictoGuessResponse => ({
  guess: {
    id: 1,
    name: "Glass Cannon",
    type: "Offensive",
    stats: ["Crit"],
    lumina_cost: 5,
    effect_category: "Damage",
    source: "Pickup",
    zone_obtained: "Lumière",
    act_introduced: 1,
    image,
  },
  is_correct: false,
  feedback: {
    type: "miss",
    stats: "miss",
    lumina_cost: "lower",
    effect_category: "miss",
    source: "miss",
    zone_obtained: "miss",
    act_introduced: "lower",
  },
});

describe("PictosGuessRow", () => {
  it("renders the picto icon from /pictos when an image is set", () => {
    const { container } = render(
      <GuessRowBase
        result={response("glass-cannon.webp")}
        attributes={PICTOS_ATTRIBUTES}
        gridTemplate={PICTOS_GRID_TEMPLATE}
        dir="pictos"
      />,
    );
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/pictos/glass-cannon.webp",
    );
  });

  it("falls back to a monogram when the picto has no image", () => {
    const { container, getByText } = render(
      <GuessRowBase
        result={response(null)}
        attributes={PICTOS_ATTRIBUTES}
        gridTemplate={PICTOS_GRID_TEMPLATE}
        dir="pictos"
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(getByText("G")).toBeInTheDocument(); // monogram, not the name span
  });
});
