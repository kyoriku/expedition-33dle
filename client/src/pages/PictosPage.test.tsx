import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PictosPage from "./PictosPage";

describe("PictosPage", () => {
  it("renders the coming-soon stub", () => {
    render(
      <MemoryRouter>
        <PictosPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });
});
