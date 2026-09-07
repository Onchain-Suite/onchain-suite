import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MarkdownLite } from "./markdown-lite";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("MarkdownLite", () => {
  it("renders a fenced code block with a language tag and a copy button", () => {
    const html = "<table><tr><td>Hi</td></tr></table>";
    const text = ["Here is your email:", "", "```html", html, "```"].join("\n");
    render(<MarkdownLite text={text} />);

    // The prose around the block still renders.
    expect(screen.getByText(/Here is your email/)).toBeInTheDocument();
    // The code is shown verbatim (a copyable block, not backticked prose).
    expect(screen.getByText(html)).toBeInTheDocument();
    // Language tag + a copy affordance scoped to the code.
    expect(screen.getByText("HTML")).toBeInTheDocument();
    expect(screen.getByLabelText("Copy html")).toBeInTheDocument();
  });

  it("labels an unlabelled code fence as CODE", () => {
    render(<MarkdownLite text={"```\nplain\n```"} />);
    expect(screen.getByText("CODE")).toBeInTheDocument();
    expect(screen.getByLabelText("Copy code")).toBeInTheDocument();
  });

  it("offers a whole-answer copy only when copyable", () => {
    const { rerender } = render(<MarkdownLite text="An article." />);
    expect(screen.queryByLabelText("Copy answer")).not.toBeInTheDocument();

    rerender(<MarkdownLite text="An article." copyable />);
    expect(screen.getByLabelText("Copy answer")).toBeInTheDocument();
  });

  it("still renders inline markdown (bold, bullets) around code", () => {
    render(<MarkdownLite text={"**Launch** plan\n- step one\n- step two"} />);
    expect(screen.getByText("Launch")).toBeInTheDocument();
    expect(screen.getByText("step one")).toBeInTheDocument();
    expect(screen.getByText("step two")).toBeInTheDocument();
  });
});
