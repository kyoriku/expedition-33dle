import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GuessInput from "./GuessInput";
import type { Entity } from "../lib/types";

function ent(id: number, name: string): Entity {
  return {
    id,
    name,
    gender: "female",
    role: "Axon",
    weapon: "Hybrid",
    element: [],
    act_introduced: 2,
    category: "Axon",
    affiliation: "Independent",
    zone: "Sirène",
    image: null,
  };
}

const ENTITIES = [ent(1, "Lune"), ent(2, "Sirène"), ent(3, "Gustave")];

function setup(props: Partial<React.ComponentProps<typeof GuessInput>> = {}) {
  const onSubmit = vi.fn();
  render(
    <GuessInput
      entities={ENTITIES}
      guessedIds={new Set()}
      disabled={false}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

describe("GuessInput", () => {
  it("filters suggestions as you type", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("combobox"), "lun");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Lune");
  });

  it("matches accent-insensitively", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("combobox"), "sirene");
    expect(screen.getByRole("option")).toHaveTextContent("Sirène");
  });

  it("submits the picked entity", async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByRole("combobox"), "gust");
    await user.click(screen.getByRole("option", { name: "Gustave" }));
    expect(onSubmit).toHaveBeenCalledWith(ENTITIES[2]);
  });

  it("excludes already-guessed entities and shows an empty state", async () => {
    const { user } = setup({ guessedIds: new Set([1]) });
    await user.type(screen.getByRole("combobox"), "lune");
    expect(screen.queryByRole("option")).toBeNull();
    expect(screen.getByText(/no characters match/i)).toBeInTheDocument();
  });
});
