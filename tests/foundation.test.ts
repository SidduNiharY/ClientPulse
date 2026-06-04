import { describe, expect, it } from "vitest";

describe("test foundation", () => {
  it("loads the jsdom environment and jest-dom matchers", () => {
    const element = document.createElement("section");

    element.textContent = "Reports Generator";
    document.body.appendChild(element);

    expect(element).toBeInTheDocument();
  });
});
