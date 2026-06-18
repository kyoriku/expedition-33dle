import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import Portrait from "./Portrait";

describe("Portrait", () => {
  it("renders the image from /portraits when one is set", () => {
    const { container } = render(<Portrait name="Gustave" image="gustave.png" />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "/portraits/gustave.png");
  });

  it("renders a monogram when there is no image", () => {
    const { container, getByText } = render(
      <Portrait name="Gustave" image={null} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(getByText("G")).toBeInTheDocument();
  });

  it("falls back to the monogram if the image fails to load", () => {
    const { container, getByText } = render(
      <Portrait name="Maelle" image="missing.png" />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(getByText("M")).toBeInTheDocument();
  });
});
