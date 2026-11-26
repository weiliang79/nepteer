import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { preferenceStore } from "./lib/preferences";
afterEach(() => {
  cleanup();
  preferenceStore.dispose();
});
