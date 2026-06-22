import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import WeaponsAnswerReveal from "./WeaponsAnswerReveal";
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
      <WeaponsAnswerReveal
        answer={weapon("abysseram.webp")}
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
      <WeaponsAnswerReveal answer={weapon(null)} isError={false} onRetry={noop} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(getByText("A")).toBeInTheDocument(); // monogram, not the name span
  });
});
