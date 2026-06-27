import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import BossesAnswerReveal from "./BossesAnswerReveal";
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
      <BossesAnswerReveal
        answer={boss("dualliste.webp")}
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
      <BossesAnswerReveal answer={boss(null)} isError={false} onRetry={noop} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(getByText("D")).toBeInTheDocument(); // monogram, not the name span
  });
});
