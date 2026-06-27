import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import AnswerRevealBase from "./AnswerRevealBase";
import { BOSSES_ATTRIBUTES } from "../lib/attributes";
import { BOSSES_GRID_TEMPLATE } from "./gridTemplates";
import type { Boss } from "../lib/types";

const boss = (image: string | null): Boss => ({
  id: 1,
  name: "Dualliste",
  weakness: ["Light"],
  resistance: ["Fire", "Dark"],
  category: "Nevron",
  location: "Forgotten Battlefield",
  encounter: "Required",
  act_introduced: 2,
  image,
});

const noop = () => {};

describe("BossesAnswerReveal", () => {
  it("renders the answer's boss icon from /bosses", () => {
    const { container } = render(
      <AnswerRevealBase
        answer={boss("dualliste.webp")}
        attributes={BOSSES_ATTRIBUTES}
        gridTemplate={BOSSES_GRID_TEMPLATE}
        dir="bosses"
        isError={false}
        onRetry={noop}
      />,
    );
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/bosses/dualliste.webp",
    );
  });

  it("falls back to a monogram when the answer has no image", () => {
    const { container, getByText } = render(
      <AnswerRevealBase
        answer={boss(null)}
        attributes={BOSSES_ATTRIBUTES}
        gridTemplate={BOSSES_GRID_TEMPLATE}
        dir="bosses"
        isError={false}
        onRetry={noop}
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(getByText("D")).toBeInTheDocument(); // monogram, not the name span
  });
});
