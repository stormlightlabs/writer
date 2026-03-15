import { Support } from "$components/Support";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Support", () => {
  it("renders the support heading", () => {
    render(<Support />);
    expect(screen.getByText("Support Writer")).toBeInTheDocument();
  });

  it("renders the support description", () => {
    render(<Support />);
    expect(screen.getByText("Help keep the app alive and free")).toBeInTheDocument();
  });

  it("renders the Stormlight Labs link", () => {
    render(<Support />);

    const link = screen.getByRole("link", { name: "Stormlight Labs" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://stormlightlabs.org");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the Owais link", () => {
    render(<Support />);

    const link = screen.getByRole("link", { name: "Owais" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://github.com/desertthunder");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the Ko-fi support link", () => {
    render(<Support />);

    const link = screen.getByRole("link", { name: /ko-fi/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://ko-fi.com/desertthunder");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("Buy me a coffee")).toBeInTheDocument();
  });

  it("renders the GitHub Sponsors link", () => {
    render(<Support />);

    const link = screen.getByRole("link", { name: /github sponsors/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://github.com/sponsors/desertthunder");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("Sponsor on GitHub")).toBeInTheDocument();
  });

  it("renders the thank you message", () => {
    render(<Support />);
    expect(screen.getByText("Thanks for using Writer!")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Support className="custom-class" />);
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
