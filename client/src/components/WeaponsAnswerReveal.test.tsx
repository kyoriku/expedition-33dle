import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import AnswerRevealBase from "./AnswerRevealBase";
import { WEAPONS_ATTRIBUTES } from "../lib/attributes";
import { WEAPONS_GRID_TEMPLATE } from "./gridTemplates";
import type { Weapon } from "../lib/types";

const weapon = (image: string | null): Weapon => ({
  id: 1,
  name: "Abysseram",
  wielder: ["Gustave", "Verso"],
  element: "Physical",
  max_power: 3228,
  scaling_stats: ["Vitality", "Defense"],
  source: "Pickup",
  act_introduced: 1,
  image,
});

const noop = () => {};

describe("WeaponsAnswerReveal", () => {
  it("renders the answer's weapon icon from /weapons", () => {
    const { container } = render(
      <AnswerRevealBase
        answer={weapon("abysseram.webp")}
        attributes={WEAPONS_ATTRIBUTES}
        gridTemplate={WEAPONS_GRID_TEMPLATE}
        dir="weapons"
        isError={false}
        onRetry={noop}
      />,
    );
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/weapons/abysseram.webp",
    );
  });

  it("falls back to a monogram when the answer has no image", () => {
    const { container, getByText } = render(
      <AnswerRevealBase
        answer={weapon(null)}
        attributes={WEAPONS_ATTRIBUTES}
        gridTemplate={WEAPONS_GRID_TEMPLATE}
        dir="weapons"
        isError={false}
        onRetry={noop}
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(getByText("A")).toBeInTheDocument(); // monogram, not the name span
  });
});
