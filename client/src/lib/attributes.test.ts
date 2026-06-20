import { describe, expect, it } from "vitest";
import {
  ATTRIBUTES,
  cellAriaLabel,
  describeState,
  FIELD_ORDER,
  PICTOS_ATTRIBUTES,
  STATE_GLYPH,
} from "./attributes";
import type { Entity, Picto } from "./types";

const SPARSE: Entity = {
  id: 1,
  name: "X",
  gender: "male",
  role: "Boss",
  weapon: "None",
  element: [],
  act_introduced: 1,
  category: "Nevron",
  affiliation: ["Independent"],
  zone: "The Manor",
  image: null,
};

describe("ATTRIBUTES config", () => {
  it("lists the 8 comparison columns in order", () => {
    expect(ATTRIBUTES.map((a) => a.key)).toEqual([
      "gender",
      "role",
      "weapon",
      "element",
      "act_introduced",
      "category",
      "affiliation",
      "zone",
    ]);
  });

  it("keeps the share FIELD_ORDER in sync with ATTRIBUTES", () => {
    expect(FIELD_ORDER).toEqual(ATTRIBUTES.map((a) => a.key));
  });

  it("formats sparse values with an em dash", () => {
    const byKey = Object.fromEntries(
      ATTRIBUTES.map((a) => [a.key, a.format(SPARSE)]),
    );
    expect(byKey.element).toBe("—");
    expect(byKey.gender).toBe("male");
  });

  it("formats present numeric and multi-value values", () => {
    const e: Entity = {
      ...SPARSE,
      element: ["Fire", "Ice"],
      affiliation: ["Expedition 33", "Lumière"],
    };
    const byKey = Object.fromEntries(
      ATTRIBUTES.map((a) => [a.key, a.format(e)]),
    );
    expect(byKey.element).toBe("Fire, Ice");
    expect(byKey.affiliation).toBe("Expedition 33 • Lumière");
    expect(byKey.act_introduced).toBe("1");
  });
});

describe("accessibility helpers", () => {
  it("cellAriaLabel composes label, value, and a state phrase", () => {
    expect(cellAriaLabel("Role", "Playable", "miss")).toBe(
      "Role: Playable, no match",
    );
    expect(cellAriaLabel("Act", "3", "higher")).toBe(
      "Act: 3, answer is higher",
    );
  });

  it("omits the phrase for neutral cells", () => {
    expect(cellAriaLabel("Name", "Gustave", "neutral")).toBe("Name: Gustave");
    expect(describeState("neutral")).toBe("");
  });

  it("provides a distinct glyph for match and miss (not color-only)", () => {
    expect(STATE_GLYPH.match).toBe("✓");
    expect(STATE_GLYPH.miss).toBe("✗");
    expect(STATE_GLYPH.match).not.toBe(STATE_GLYPH.miss);
  });
});

const SPARSE_PICTO: Picto = {
  id: 1,
  name: "X",
  type: "Offensive",
  stats: [],
  lumina_cost: 5,
  effect_category: "Damage",
  source: "Pickup",
  zone_obtained: "Flying Manor",
  act_introduced: 1,
};

describe("PICTOS_ATTRIBUTES config", () => {
  it("lists the 7 comparison columns in order", () => {
    expect(PICTOS_ATTRIBUTES.map((a) => a.key)).toEqual([
      "type",
      "stats",
      "lumina_cost",
      "effect_category",
      "source",
      "zone_obtained",
      "act_introduced",
    ]);
  });

  it("formats sparse stats with an em dash", () => {
    const byKey = Object.fromEntries(
      PICTOS_ATTRIBUTES.map((a) => [a.key, a.format(SPARSE_PICTO)]),
    );
    expect(byKey.stats).toBe("—");
    expect(byKey.type).toBe("Offensive");
  });

  it("formats present numeric and multi-value values", () => {
    const p: Picto = {
      ...SPARSE_PICTO,
      stats: ["HP", "Crit"],
      lumina_cost: 10,
      act_introduced: 2,
    };
    const byKey = Object.fromEntries(
      PICTOS_ATTRIBUTES.map((a) => [a.key, a.format(p)]),
    );
    expect(byKey.stats).toBe("HP • Crit");
    expect(byKey.lumina_cost).toBe("10");
    expect(byKey.act_introduced).toBe("2");
  });

  it("maps act 4 to DLC, other acts to the number", () => {
    const act = PICTOS_ATTRIBUTES.find((a) => a.key === "act_introduced")!;
    expect(act.format({ ...SPARSE_PICTO, act_introduced: 4 })).toBe("DLC");
    expect(act.format({ ...SPARSE_PICTO, act_introduced: 3 })).toBe("3");
  });
});
