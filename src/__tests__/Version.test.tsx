import { Version, transformVersion } from "$components/Version";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("transformVersion", () => {
  it("returns a plain semver for exact tagged builds", () => {
    expect(transformVersion("v0.2.0-0-gabc1234")).toBe("v0.2.0");
  });

  it("returns a dev version for commits after a tag", () => {
    expect(transformVersion("v0.2.0-5-gabc1234")).toBe("v0.2.0dev5+abc1234");
  });

  it("returns a dirty semver suffix for exact dirty tagged builds", () => {
    expect(transformVersion("v0.2.0-0-gabc1234-dirty")).toBe("v0.2.0.dirty");
  });
});

describe("Version", () => {
  it("renders the transformed version", () => {
    render(<Version value="v0.2.0-0-gabc1234" />);

    expect(screen.getByText("v0.2.0")).toBeInTheDocument();
  });

  it("renders nothing for blank input", () => {
    const { container } = render(<Version value="   " />);

    expect(container).toBeEmptyDOMElement();
  });
});
