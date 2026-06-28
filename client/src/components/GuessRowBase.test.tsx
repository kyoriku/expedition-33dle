import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import GuessRowBase from "./GuessRowBase";
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
import type { GuessResult, NamedEntity } from "./GuessCells";
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

// One parametrized regression per mode (replaces the per-mode *GuessRow.test files
// the wrappers used to carry): the icon loads from the mode's public /<dir>, and a
// null image falls back to the name's monogram. Every mode — including classic
// (dir="portraits"), which never had its own test — drives the same GuessRowBase.
function rowCases<T extends NamedEntity, F>(
  mode: string,
  dir: string,
  attributes: readonly AttributeDescriptor<T, F>[],
  gridTemplate: string,
  build: (image: string | null) => GuessResult<T, F>,
  file: string,
  monogram: string,
) {
  describe(`GuessRowBase — ${mode}`, () => {
    it(`renders the icon from /${dir} when an image is set`, () => {
      const { container } = render(
        <GuessRowBase
          result={build(file)}
          attributes={attributes}
          gridTemplate={gridTemplate}
          dir={dir}
        />,
      );
      expect(container.querySelector("img")).toHaveAttribute("src", `/${dir}/${file}`);
    });

    it("falls back to a monogram when there's no image", () => {
      const { container, getByText } = render(
        <GuessRowBase
          result={build(null)}
          attributes={attributes}
          gridTemplate={gridTemplate}
          dir={dir}
        />,
      );
      expect(container.querySelector("img")).toBeNull();
      expect(getByText(monogram)).toBeInTheDocument(); // monogram, not the name span
    });
  });
}

rowCases<Character, ClassicGuessFeedback>(
  "Classic",
  "portraits",
  ATTRIBUTES,
  CLASSIC_GRID_TEMPLATE,
  (image) => ({
    guess: {
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
    },
    is_correct: false,
    feedback: {
      gender: "miss",
      role: "miss",
      weapon: "miss",
      element: "miss",
      act_introduced: "lower",
      category: "miss",
      affiliation: "miss",
      zone: "miss",
    },
  }),
  "gustave.webp",
  "G",
);

rowCases<Picto, PictoGuessFeedback>(
  "Pictos",
  "pictos",
  PICTOS_ATTRIBUTES,
  PICTOS_GRID_TEMPLATE,
  (image) => ({
    guess: {
      id: 1,
      name: "Glass Cannon",
      type: "Offensive",
      stats: ["Crit"],
      lumina_cost: 5,
      effect_category: "Damage",
      source: "Pickup",
      zone_obtained: "Lumière",
      act_introduced: 1,
      image,
    },
    is_correct: false,
    feedback: {
      type: "miss",
      stats: "miss",
      lumina_cost: "lower",
      effect_category: "miss",
      source: "miss",
      zone_obtained: "miss",
      act_introduced: "lower",
    },
  }),
  "glass-cannon.webp",
  "G",
);

rowCases<Weapon, WeaponGuessFeedback>(
  "Weapons",
  "weapons",
  WEAPONS_ATTRIBUTES,
  WEAPONS_GRID_TEMPLATE,
  (image) => ({
    guess: {
      id: 1,
      name: "Blodam",
      wielder: ["Gustave", "Verso"],
      element: "Physical",
      max_power: 3000,
      scaling_stats: ["Vitality"],
      source: "Pickup",
      act_introduced: 1,
      image,
    },
    is_correct: false,
    feedback: {
      wielder: "miss",
      element: "miss",
      max_power: "lower",
      scaling_stats: "miss",
      source: "miss",
      act_introduced: "lower",
    },
  }),
  "blodam.webp",
  "B",
);

rowCases<Boss, BossGuessFeedback>(
  "Bosses",
  "bosses",
  BOSSES_ATTRIBUTES,
  BOSSES_GRID_TEMPLATE,
  (image) => ({
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
  }),
  "goblu.webp",
  "G",
);
