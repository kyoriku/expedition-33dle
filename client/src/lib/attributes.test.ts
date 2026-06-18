import { describe, expect, it } from "vitest";
import {
  ATTRIBUTES,
  cellAriaLabel,
  describeState,
  FIELD_ORDER,
  STATE_GLYPH,
} from "./attributes";
import type { Entity } from "./types";

const SPARSE: Entity = {
  id: 1,
  name: "X",
  gender: "male",
  role: "Boss",
  weapon: "None",
  element: [],
  act_introduced: 1,
  category: "Nevron",
  affiliation: "Independent",
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

  it("formats present numeric and multi-element values", () => {
    const e: Entity = { ...SPARSE, element: ["Fire", "Ice"] };
    const byKey = Object.fromEntries(
      ATTRIBUTES.map((a) => [a.key, a.format(e)]),
    );
    expect(byKey.element).toBe("Fire, Ice");
    expect(byKey.act_introduced).toBe("1");
  });
});

describe("accessibility helpers", () => {
  it("cellAriaLabel composes label, value, and a state phrase", () => {
    expect(cellAriaLabel("Role", "Engineer", "miss")).toBe(
      "Role: Engineer, no match",
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
