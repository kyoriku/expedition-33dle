import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import AnswerRevealBase from "./AnswerRevealBase";
import { PICTOS_ATTRIBUTES } from "../lib/attributes";
import { PICTOS_GRID_TEMPLATE } from "./gridTemplates";
import type { Picto } from "../lib/types";

const picto = (image: string | null): Picto => ({
  id: 1,
  name: "Energising Start",
  type: "Support",
  stats: ["DEF"],
  lumina_cost: 30,
  effect_category: "AP",
  source: "Merchant",
  zone_obtained: "Lumière",
  act_introduced: 1,
  image,
});

const noop = () => {};

describe("PictosAnswerReveal", () => {
  it("renders the answer's picto icon from /pictos", () => {
    const { container } = render(
      <AnswerRevealBase
        answer={picto("energising-start.webp")}
        attributes={PICTOS_ATTRIBUTES}
        gridTemplate={PICTOS_GRID_TEMPLATE}
        dir="pictos"
        isError={false}
        onRetry={noop}
      />,
    );
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/pictos/energising-start.webp",
    );
  });

  it("falls back to a monogram when the answer has no image", () => {
    const { container, getByText } = render(
      <AnswerRevealBase
        answer={picto(null)}
        attributes={PICTOS_ATTRIBUTES}
        gridTemplate={PICTOS_GRID_TEMPLATE}
        dir="pictos"
        isError={false}
        onRetry={noop}
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(getByText("E")).toBeInTheDocument(); // monogram, not the name span
  });
});
