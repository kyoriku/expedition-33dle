import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MenuPage from "./MenuPage";

function renderMenu() {
  return render(
    <MemoryRouter>
      <MenuPage />
    </MemoryRouter>,
  );
}

describe("MenuPage", () => {
  it("renders a card for each mode linking to its route", () => {
    renderMenu();
    const classic = screen.getByRole("link", { name: /classic/i });
    const pictos = screen.getByRole("link", { name: /pictos/i });
    expect(classic).toHaveAttribute("href", "/classic");
    expect(pictos).toHaveAttribute("href", "/pictos");
  });

  it("shows each mode's heading", () => {
    renderMenu();
    expect(
      screen.getByRole("heading", { name: "Classic" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pictos" })).toBeInTheDocument();
  });
});
