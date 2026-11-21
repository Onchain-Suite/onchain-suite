import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { block, pass, warn } from "../test/fixtures";
import { PresendDialog } from "./presend-dialog";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const noop = () => undefined;

describe("PresendDialog", () => {
  it("lists blocks first with the backend message, fix and a settings link, and disables the primary action", () => {
    render(
      <PresendDialog
        open
        action="send"
        checks={[
          warn("GMAIL_CLIP"),
          block("DKIM_NOT_PASSING"),
          pass("SPF_TOO_MANY_LOOKUPS"),
        ]}
        onConfirm={noop}
        onCancel={noop}
      />
    );

    const blockRow = screen.getByTestId("presend-block-DKIM_NOT_PASSING");
    const warnRow = screen.getByTestId("presend-warn-GMAIL_CLIP");
    // Blocks render above warnings.
    expect(
      blockRow.compareDocumentPosition(warnRow) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(blockRow).toHaveTextContent("DKIM_NOT_PASSING message");
    expect(blockRow).toHaveTextContent("DKIM_NOT_PASSING fix");
    expect(
      screen.getByRole("link", { name: "Domain settings" })
    ).toHaveAttribute("href", "/integrations?tab=channels&channel=email");
    expect(
      screen.getByText(/can't continue until this is fixed/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send anyway" })).toBeDisabled();
    // No acknowledgement offered: a block cannot be overridden.
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("keeps Send anyway disabled until the warnings are acknowledged", () => {
    const onConfirm = vi.fn();
    render(
      <PresendDialog
        open
        action="send"
        checks={[warn("GMAIL_CLIP"), warn("NEW_LINK_DOMAIN")]}
        onConfirm={onConfirm}
        onCancel={noop}
      />
    );

    const primary = screen.getByRole("button", { name: "Send anyway" });
    expect(primary).toBeDisabled();
    fireEvent.click(primary);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(primary).toBeEnabled();
    fireEvent.click(primary);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("collapses passes to a count and notes skipped checks quietly", () => {
    render(
      <PresendDialog
        open
        action="activate"
        checks={[
          warn("GMAIL_CLIP"),
          pass("DMARC_MISSING"),
          pass("SPF_TOO_MANY_LOOKUPS"),
          pass("NEW_LINK_DOMAIN", "RDAP lookup failed"),
        ]}
        onConfirm={noop}
        onCancel={noop}
      />
    );

    const toggle = screen.getByRole("button", { name: /2 checks passed/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByText(/No DMARC record: passed/)
    ).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByText(/No DMARC record: passed/)).toBeInTheDocument();

    expect(
      screen.getByText(/Couldn't check links to a newly registered domain/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Activate anyway" })
    ).toBeInTheDocument();
  });

  it("shows a loading state while the check runs", () => {
    render(
      <PresendDialog
        open
        loading
        action="send"
        checks={[]}
        onConfirm={noop}
        onCancel={noop}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent("Checking");
    expect(
      screen.queryByRole("button", { name: "Send anyway" })
    ).not.toBeInTheDocument();
  });

  it("marks warns that appeared after a confirmation as new", () => {
    render(
      <PresendDialog
        open
        action="send"
        checks={[warn("GMAIL_CLIP"), warn("NEW_LINK_DOMAIN")]}
        newCodes={["NEW_LINK_DOMAIN"]}
        onConfirm={noop}
        onCancel={noop}
      />
    );
    expect(
      screen.getByTestId("presend-warn-NEW_LINK_DOMAIN")
    ).toHaveTextContent("New");
    expect(screen.getByTestId("presend-warn-GMAIL_CLIP")).not.toHaveTextContent(
      /\bNew\b/
    );
  });
});
