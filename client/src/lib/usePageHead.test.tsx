import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MenuPage from "../pages/MenuPage";
import PrivacyPage from "../pages/PrivacyPage";

// Head elements carry no ARIA role, so assertions read document.head
// directly; navigation still goes through role + accessible name. MenuPage
// and PrivacyPage are the two fetch-free routes, so no API mocks are needed.
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const canonical = () =>
  document.head
    .querySelector('link[rel="canonical"]')
    ?.getAttribute("href");
const ogUrl = () =>
  document.head
    .querySelector('meta[property="og:url"]')
    ?.getAttribute("content");
const description = () =>
  document.head
    .querySelector('meta[name="description"]')
    ?.getAttribute("content");

describe("usePageHead", () => {
  it("sets title, canonical, description, and og:url for the route", () => {
    renderAt("/privacy");
    expect(document.title).toBe("Privacy Policy | Expedition 33dle");
    expect(canonical()).toBe("https://expedition33dle.com/privacy");
    expect(ogUrl()).toBe("https://expedition33dle.com/privacy");
    expect(description()).toBe(
      "Privacy policy for Expedition 33dle, a daily guessing game for Clair Obscur: Expedition 33.",
    );
  });

  it("updates the tags on navigation instead of persisting stale ones", async () => {
    const user = userEvent.setup();
    renderAt("/privacy");
    expect(document.title).toBe("Privacy Policy | Expedition 33dle");

    await user.click(screen.getByRole("link", { name: /back to game/i }));

    expect(document.title).toBe("Expedition 33dle");
    expect(canonical()).toBe("https://expedition33dle.com/");
    expect(ogUrl()).toBe("https://expedition33dle.com/");
    expect(description()).toBe(
      "A daily guessing game for Clair Obscur: Expedition 33. New puzzle every day at midnight UTC.",
    );
  });
});
