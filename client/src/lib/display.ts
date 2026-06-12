// Words >7 chars that can wrap inside the 48px matrix cells, with syllable
// break points marked by soft hyphens (­ — rendered as a hyphen only
// when the browser actually wraps there). Deterministic in every browser,
// unlike `hyphens: auto`, which needs hyphenation dictionaries Chromium
// doesn't ship on Linux. Unmapped words fall back to break-words.
const SHY = "­";

const HYPHENATION: Record<string, string> = {
  Engineer: `En${SHY}gi${SHY}neer`,
  Swordsman: `Swords${SHY}man`,
  Shapeshifter: `Shape${SHY}shifter`,
  Mythical: `Myth${SHY}i${SHY}cal`,
  Companion: `Com${SHY}pan${SHY}ion`,
  Civilian: `Ci${SHY}vil${SHY}ian`,
  Councilor: `Coun${SHY}cil${SHY}or`,
  Commander: `Com${SHY}mand${SHY}er`,
  Paintress: `Paint${SHY}ress`,
  Expeditioner: `Ex${SHY}pe${SHY}di${SHY}tion${SHY}er`,
  Merchant: `Mer${SHY}chant`,
  Creature: `Crea${SHY}ture`,
  Elemental: `Ele${SHY}men${SHY}tal`,
  Paintbrush: `Paint${SHY}brush`,
  Lightning: `Light${SHY}ning`,
  Pistol: `Pis${SHY}tol`,
  Gustave: `Gus${SHY}tave`,
  François: `Fran${SHY}çois`,
};

/** Inject soft hyphens into known long words for clean wrapping in cells. */
export function hyphenate(text: string): string {
  return text
    .split(" ")
    .map((word) => HYPHENATION[word] ?? word)
    .join(" ");
}
