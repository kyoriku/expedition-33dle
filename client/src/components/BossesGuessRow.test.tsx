import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import BossesGuessRow from "./BossesGuessRow";
import type { BossGuessResponse } from "../lib/types";

const response = (image: string | null): BossGuessResponse => ({
  guess: {
    id: 1,
    name: "Goblu",
    weakness: ["Lightning"],
    resistance: ["Ice"],
    category: "Nevron",
    location: "Flying Waters",
    encounter: "Required",
    act_introduced: 1,
    image,
  },
  is_correct: false,
  feedback: {
    weakness: "miss",
    resistance: "miss",
    category: "miss",
    location: "miss",
    encounter: "miss",
    act_introduced: "lower",
  },
});

describe("BossesGuessRow", () => {
  it("renders the boss icon from /bosses when an image is set", () => {
    const { container } = render(
      <BossesGuessRow result={response("goblu.webp")} />,
    );
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/bosses/goblu.webp",
    );
  });

  it("falls back to a monogram when the boss has no image", () => {
    const { container, getByText } = render(
      <BossesGuessRow result={response(null)} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(getByText("G")).toBeInTheDocument(); // monogram, not the name span
  });
});
