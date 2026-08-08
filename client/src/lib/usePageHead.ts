import { useEffect } from "react";

const ORIGIN = "https://expedition33dle.com";

interface PageHead {
  title: string;
  description: string;
  /** Route path ("/weapons"; "/" for the homepage). Canonical and og:url are
   *  ORIGIN + path and must match sitemap.xml's <loc> values byte-for-byte —
   *  the apex entry there is slash-terminated. */
  path: string;
}

/** Set the per-route head tags: title, canonical, meta description, and the
 *  og:/twitter: pairs mirroring them. Like usePageTitle, each route sets its
 *  own on mount with no restore-on-unmount. Tags are created when missing and
 *  updated in place otherwise, so index.html's static set stays as the pre-JS
 *  defaults without ever being duplicated.
 *
 *  Client-side only: Googlebot renders JS and sees these; social scrapers
 *  (Discord, X, Slack, Reddit) do not, so shared links preview with the
 *  static homepage tags until server-side per-route injection exists. */
export function usePageHead({ title, description, path }: PageHead) {
  useEffect(() => {
    document.title = title;
    const url = ORIGIN + path;

    let canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    // og:* live in `property`, twitter:* and description in `name` — matches
    // the static tags in index.html so updates hit them instead of appending.
    const metas: Array<["name" | "property", string, string]> = [
      ["name", "description", description],
      ["property", "og:title", title],
      ["property", "og:description", description],
      ["property", "og:url", url],
      ["name", "twitter:title", title],
      ["name", "twitter:description", description],
    ];
    for (const [attr, key, content] of metas) {
      let tag = document.head.querySelector<HTMLMetaElement>(
        `meta[${attr}="${key}"]`,
      );
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    }
  }, [title, description, path]);
}
