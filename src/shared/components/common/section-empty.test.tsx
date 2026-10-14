import { UsersIcon } from "@heroicons/react/24/outline";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { SectionEmpty } from "./section-empty";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

describe("SectionEmpty", () => {
  it("renders title and body", () => {
    render(
      <SectionEmpty icon={UsersIcon} title="No contacts" body="Index first." />
    );
    expect(screen.getByText("No contacts")).toBeInTheDocument();
    expect(screen.getByText("Index first.")).toBeInTheDocument();
  });

  it("shows the waiting hint by default", () => {
    render(<SectionEmpty icon={UsersIcon} title="t" body="b" />);
    expect(
      screen.getByText(/waiting on your first indexed contract/i)
    ).toBeInTheDocument();
  });

  it("hides the waiting hint when waits is false", () => {
    render(<SectionEmpty icon={UsersIcon} title="t" body="b" waits={false} />);
    expect(
      screen.queryByText(/waiting on your first indexed contract/i)
    ).not.toBeInTheDocument();
  });

  it("shows an 'on its way' hint while a contract is indexing", () => {
    render(
      <SectionEmpty icon={UsersIcon} title="t" body="b" indexing="Acme" />
    );
    expect(
      screen.getByText(/indexing acme\. this fills in/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/waiting on your first indexed contract/i)
    ).not.toBeInTheDocument();
  });

  it("renders a link action as an anchor to href", () => {
    render(
      <SectionEmpty
        icon={UsersIcon}
        title="t"
        body="b"
        action={{ label: "Index a contract", href: "/dashboard" }}
      />
    );
    const link = screen.getByRole("link", { name: /index a contract/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders a button action that calls onClick", () => {
    const onClick = vi.fn();
    render(
      <SectionEmpty
        icon={UsersIcon}
        title="t"
        body="b"
        action={{ label: "Do it", onClick }}
      />
    );
    screen.getByRole("button", { name: /do it/i }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
