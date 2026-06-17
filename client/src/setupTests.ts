// Registers jest-dom matchers (toBeInTheDocument, etc.) on Vitest's expect.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// With globals disabled, RTL's automatic afterEach cleanup isn't wired up, so
// unmount rendered trees ourselves to keep tests isolated.
afterEach(() => cleanup());
