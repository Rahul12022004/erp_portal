import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import App from "./App";

describe("App startup", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("renders the initial route without crashing", async () => {
    render(<App />);

    expect((await screen.findAllByRole("button", { name: /Get Started Free/i })).length).toBeGreaterThan(0);
  });
});
