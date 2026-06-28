import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import AnswerRevealBase from "./AnswerRevealBase";
import type { AttributeDescriptor } from "../lib/attributes";
import {
  ATTRIBUTES,
  BOSSES_ATTRIBUTES,
  PICTOS_ATTRIBUTES,
  WEAPONS_ATTRIBUTES,
} from "../lib/attributes";
import {
  BOSSES_GRID_TEMPLATE,
  CLASSIC_GRID_TEMPLATE,
  PICTOS_GRID_TEMPLATE,
  WEAPONS_GRID_TEMPLATE,
} from "../lib/gridTemplates";
import type { NamedEntity } from "./GuessCells";
import type {
  Boss,
  BossGuessFeedback,
  Character,
  ClassicGuessFeedback,
  Picto,
  PictoGuessFeedback,
  Weapon,
  WeaponGuessFeedback,
} from "../lib/types";

const noop = () => {};

// One parametrized regression per mode (replaces the per-mode *AnswerReveal.test
// files): the answer icon loads from the mode's public /<dir>, and a null image
// falls back to the name's monogram. Includes classic (dir="portraits"), which
// never had its own test.
function revealCases<T extends NamedEntity, F>(
  mode: string,
  dir: string,
  attributes: readonly AttributeDescriptor<T, F>[],
  gridTemplate: string,
  build: (image: string | null) => T,
  file: string,
  monogram: string,
) {
  describe(`AnswerRevealBase — ${mode}`, () => {
    it(`renders the answer icon from /${dir}`, () => {
      const { container } = render(
        <AnswerRevealBase
          answer={build(file)}
          attributes={attributes}
          gridTemplate={gridTemplate}
          dir={dir}
          isError={false}
          onRetry={noop}
        />,
      );
      expect(container.querySelector("img")).toHaveAttribute("src", `/${dir}/${file}`);
    });

    it("falls back to a monogram when the answer has no image", () => {
      const { container, getByText } = render(
        <AnswerRevealBase
          answer={build(null)}
          attributes={attributes}
          gridTemplate={gridTemplate}
          dir={dir}
          isError={false}
          onRetry={noop}
        />,
      );
      expect(container.querySelector("img")).toBeNull();
      expect(getByText(monogram)).toBeInTheDocument(); // monogram, not the name span
    });
  });
}

revealCases<Character, ClassicGuessFeedback>(
  "Classic",
  "portraits",
  ATTRIBUTES,
  CLASSIC_GRID_TEMPLATE,
  (image) => ({
    id: 1,
    name: "Gustave",
    gender: "Male",
    role: "Playable",
    weapon: "Sword & Pistol",
    element: ["Lightning"],
    act_introduced: 1,
    category: "Human",
    affiliation: ["Expedition 33"],
    zone: "Lumière",
    image,
  }),
  "gustave.webp",
  "G",
);

revealCases<Picto, PictoGuessFeedback>(
  "Pictos",
  "pictos",
  PICTOS_ATTRIBUTES,
  PICTOS_GRID_TEMPLATE,
  (image) => ({
    id: 1,
    name: "Energising Start",
    type: "Support",
    stats: ["DEF"],
    lumina_cost: 30,
    effect_category: "AP",
    source: "Merchant",
    zone_obtained: "Lumière",
    act_introduced: 1,
    image,
  }),
  "energising-start.webp",
  "E",
);

revealCases<Weapon, WeaponGuessFeedback>(
  "Weapons",
  "weapons",
  WEAPONS_ATTRIBUTES,
  WEAPONS_GRID_TEMPLATE,
  (image) => ({
    id: 1,
    name: "Abysseram",
    wielder: ["Gustave", "Verso"],
    element: "Physical",
    max_power: 3228,
    scaling_stats: ["Vitality", "Defense"],
    source: "Pickup",
    act_introduced: 1,
    image,
  }),
  "abysseram.webp",
  "A",
);

revealCases<Boss, BossGuessFeedback>(
  "Bosses",
  "bosses",
  BOSSES_ATTRIBUTES,
  BOSSES_GRID_TEMPLATE,
  (image) => ({
    id: 1,
    name: "Dualliste",
    weakness: ["Light"],
    resistance: ["Fire", "Dark"],
    category: "Nevron",
    location: "Forgotten Battlefield",
    encounter: "Required",
    act_introduced: 2,
    image,
  }),
  "dualliste.webp",
  "D",
);
