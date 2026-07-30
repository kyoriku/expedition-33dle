# /// script
# requires-python = ">=3.12"
# dependencies = ["requests", "pillow"]
# ///
"""Assemble a complete boss image set (plus two missing character portraits).

Two sources, one output dir (./boss_images, ready-to-copy 256x256 WebP):
- REUSE: bosses that are already characters copy the existing (already-squared)
  portrait under the boss's own slug, so every boss keeps a 1:1 file and any
  one can be re-arted later without touching the others.
- FETCH: bosses without a portrait pull the canonical og:image enemy render
  from their fextralife wiki page, then get the same square treatment as
  square_images.py (cover-crop from the top, resize to 256, WebP q90).

FETCH also sources characters' two missing portraits: scavenger.webp (shared
with the Scavenger boss) and verso-dessendre.webp (falls back to a copy of
verso.webp if the wiki has no page — same likeness in-game).

Run (network required):  cd server && uv run scripts/boss_imgs.py
Idempotent: re-running skips files already in ./boss_images.
"""

import io
import re
import time
import unicodedata
from pathlib import Path

import requests
from PIL import Image

SIZE = 256
QUALITY = 90
WIKI = "https://expedition33.wiki.fextralife.com"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"}

REPO_ROOT = Path(__file__).resolve().parents[2]
PORTRAITS = REPO_ROOT / "client" / "public" / "portraits"
OUT = Path(__file__).resolve().parent.parent / "boss_images"


def slugify(name: str) -> str:
    """'Flame Évêque' -> 'flame-eveque' (matches the portrait naming style)."""
    folded = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", folded.lower()).strip("-")


# Bosses that already have character art: boss name -> portrait filename.
# Variants share their base fight's portrait (Clea Unleashed -> clea, the
# elemental Évêques -> eveque, etc.).
REUSE = {
    "Alicia": "alicia-dessendre.webp",
    "Clea": "clea.webp",
    "Clea Unleashed": "clea.webp",
    "Dualliste": "dualliste.webp",
    "Duollistes": "dualliste.webp",
    "Flame Évêque": "eveque.webp",
    "François": "francois.webp",
    "Frost Évêque": "eveque.webp",
    "Gargant": "gargant.webp",
    "Goblu": "goblu.webp",
    "Golgra": "golgra.webp",
    "Lampmaster": "lampmaster.webp",
    "Monoco": "monoco.webp",
    "Reacher": "reacher.webp",
    "Renoir": "renoir.webp",
    "Sciel": "sciel.webp",
    "Serpenphare": "serpenphare.webp",
    "Simon": "simon.webp",
    "Simon the Divergent Star": "simon.webp",
    "Sirène": "sirene.webp",
    "The Paintress": "the-paintress.webp",
    "Thunder Évêque": "eveque.webp",
    "Tisseur": "tisseur.webp",
    "Ultimate Sakapatate": "ultimate-sakapatate.webp",
    "Visages": "visages.webp",
    "Évêque": "eveque.webp",
}

# Bosses (and the two character gaps) with no portrait: name -> wiki page.
# Page names verified against the wiki 2026-07: "Sapling" hosts Giant Sapling's
# art; "Petank" is the ASCII page name.
FETCH = {
    "Bourgeon": "Bourgeon",
    "Clair Obscur": "Clair Obscur",
    "Creation": "Creation",
    "Giant Sapling": "Sapling",
    "Glaise": "Glaise",
    "Glissando": "Glissando",
    "Grosse Tete": "Grosse Tete",
    "Grown Bourgeon": "Grown Bourgeon",
    "Half-Baked Gestral": "Half-Baked Gestral",
    "Jovial Moissonneuse": "Jovial Moissonneuse",
    "Licornapieds": "Licornapieds",
    "Mask Keeper": "Mask Keeper",
    "Mime": "Mime",
    "Osquio": "Osquio",
    "Painted Love": "Painted Love",
    "Pétank": "Petank",
    "Scavenger": "Scavenger",
    "Seething Boucheclier": "Seething Boucheclier",
    "Sorrowful Chapelier": "Sorrowful Chapelier",
    "Sprong": "Sprong",
    "Stalact": "Stalact",
    "The Curator": "The Curator",
    "Verso Dessendre": "Verso Dessendre",  # portraits gap; falls back to verso.webp
}

# No auto-fetchable art on either wiki as of 2026-07 (fextralife red-links
# Monsieur Frappe; both Fandom wikis' Julien pages have no files). These two
# were hand-sourced instead — julien-tiny-head.webp from Gamer Guides' copy of
# the in-game HUD portrait (t_ui_hud_portrait_gestralbaby), monsieur-frappe.webp
# cropped from game8's counter-challenge screenshot — and live in ./boss_images
# and client/public/bosses like the rest. A fresh re-run reports them
# unresolved rather than fetching; don't delete the committed files.
HAND_SOURCED = ["Julien Tiny Head", "Monsieur Frappe"]

FALLBACK_COPY = {"Verso Dessendre": "verso.webp"}

OG_IMAGE = re.compile(r'property="og:image" content="([^"]+)"')


def square(img: Image.Image) -> Image.Image:
    """Same treatment as square_images.py: object-cover object-top, then SIZE."""
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA")
    w, h = img.size
    if h > w:
        img = img.crop((0, 0, w, w))
    elif w > h:
        x = (w - h) // 2
        img = img.crop((x, 0, x + h, h))
    return img.resize((SIZE, SIZE), resample=Image.Resampling.LANCZOS)


CONTENT_IMAGE = re.compile(r'https://static0\.fextralifeimages\.com/[^"\s]+\.(?:png|jpg|webp)')


def fetch_wiki_image(page: str) -> str | None:
    """Return the page's canonical image URL, or None if the page/image is absent.

    Prefers og:image; some pages (Licornapieds, Osquio, Scavenger, ...) lack the
    meta tag, so fall back to content images whose filename starts with the page
    slug, preferring the boss/enemy render over gallery shots."""
    r = requests.get(f"{WIKI}/{page.replace(' ', '+')}", headers=UA, timeout=30)
    if r.status_code != 200:
        return None
    m = OG_IMAGE.search(r.text)
    # Real pages carry a /file/expedition33/ asset; anything else is site chrome.
    if m and "/file/expedition33/" in m.group(1):
        return m.group(1)
    prefix = slugify(page)
    candidates = [
        u for u in dict.fromkeys(CONTENT_IMAGE.findall(r.text))
        if u.rsplit("/", 1)[-1].lower().startswith(prefix)
    ]
    for keyword in ("boss", "enemy", ""):
        for u in candidates:
            if keyword in u.rsplit("/", 1)[-1].lower():
                return u
    return None


def main() -> int:
    OUT.mkdir(exist_ok=True)
    failed: list[str] = []

    for name, portrait in REUSE.items():
        dst = OUT / f"{slugify(name)}.webp"
        if dst.exists():
            continue
        dst.write_bytes((PORTRAITS / portrait).read_bytes())
        print(f"reuse  {dst.name}  <- portraits/{portrait}")

    for name, page in FETCH.items():
        dst = OUT / f"{slugify(name)}.webp"
        if dst.exists():
            continue
        url = fetch_wiki_image(page)
        if url is None:
            fallback = FALLBACK_COPY.get(name)
            if fallback:
                dst.write_bytes((PORTRAITS / fallback).read_bytes())
                print(f"fallbk {dst.name}  <- portraits/{fallback} (no wiki page)")
            else:
                failed.append(name)
                print(f"MISS   {name}: no usable wiki image")
            continue
        img_bytes = requests.get(url, headers=UA, timeout=60).content
        with Image.open(io.BytesIO(img_bytes)) as img:
            square(img).save(dst, quality=QUALITY, method=6)
        print(f"fetch  {dst.name}  <- {url.split('/')[-1].split('?')[0]}")
        time.sleep(0.4)  # be polite to the wiki

    print(f"\n{len(list(OUT.glob('*.webp')))} files in {OUT}")
    if failed:
        print(f"{len(failed)} unresolved: {', '.join(failed)}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
