import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PrivacyPage from "./PrivacyPage";

function renderPrivacy() {
  return render(
    <MemoryRouter>
      <PrivacyPage />
    </MemoryRouter>,
  );
}

describe("PrivacyPage", () => {
  it("renders the policy heading", () => {
    renderPrivacy();
    expect(
      screen.getByRole("heading", { name: "Privacy Policy" }),
    ).toBeInTheDocument();
  });

  it("does not render markdown editor comments as page text", () => {
    // privacy-policy.md opens with an HTML comment for editors. Without
    // skipHtml on LegalPage's ReactMarkdown, raw HTML nodes render as
    // literal text and the comment shows up on the live page.
    renderPrivacy();
    expect(screen.queryByText(/second source of truth/i)).toBeNull();
    expect(screen.queryByText(/<!--/)).toBeNull();
  });
});
