import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFoundPage from "./NotFoundPage";

function renderNotFound() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe("NotFoundPage", () => {
  it("renders the not-found heading and stale-link copy", () => {
    renderNotFound();
    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/this page doesn’t exist/i)).toBeInTheDocument();
  });

  it("links back to the game menu", () => {
    renderNotFound();
    expect(screen.getByRole("link", { name: /back to game/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("links to each game mode", () => {
    renderNotFound();
    const mode = (name: string) => screen.getByRole("link", { name });
    expect(mode("Classic")).toHaveAttribute("href", "/classic");
    expect(mode("Pictos")).toHaveAttribute("href", "/pictos");
    expect(mode("Weapons")).toHaveAttribute("href", "/weapons");
    expect(mode("Bosses")).toHaveAttribute("href", "/bosses");
  });
});
