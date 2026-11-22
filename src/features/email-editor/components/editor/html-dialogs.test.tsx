import { fireEvent, render, screen } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImportHtmlDialog, ViewHtmlDialog } from "./html-dialogs";

const { success, error } = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success, error } }));

/** The import/view screens use only `editor.commands.setContent`. */
function mockEditor() {
  const setContent = vi.fn();
  return {
    editor: { commands: { setContent } } as unknown as Editor,
    setContent,
  };
}

beforeEach(() => {
  success.mockClear();
  error.mockClear();
});

describe("ImportHtmlDialog (full-screen)", () => {
  it("replaces the body with sanitised, de-Google-Docs'd HTML", () => {
    const { editor, setContent } = mockEditor();
    render(<ImportHtmlDialog editor={editor} open onClose={() => {}} />);

    const ta = screen.getByLabelText("HTML to import");
    fireEvent.change(ta, {
      target: { value: "<h1>Season 3</h1><p>Packs are live.</p>" },
    });

    fireEvent.click(screen.getByRole("button", { name: /replace the email/i }));

    expect(setContent).toHaveBeenCalledTimes(1);
    const [[html, opts]] = setContent.mock.calls;
    expect(html).toContain("<h1>Season 3</h1>");
    expect(opts).toMatchObject({ emitUpdate: true });
    expect(success).toHaveBeenCalledWith(
      "Imported. The footer stays as it was"
    );
  });

  it("keeps Replace disabled until there is HTML to import", () => {
    const { editor } = mockEditor();
    render(<ImportHtmlDialog editor={editor} open onClose={() => {}} />);
    expect(
      screen.getByRole("button", { name: /replace the email/i })
    ).toBeDisabled();
  });

  it("warns that unsafe content will be stripped before it is imported", () => {
    const { editor, setContent } = mockEditor();
    render(<ImportHtmlDialog editor={editor} open onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText("HTML to import"), {
      target: { value: "<p>Hi</p><script>alert(1)</script>" },
    });

    expect(screen.getByText(/unsafe thing/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /replace the email/i }));
    expect(setContent.mock.calls[0][0]).not.toContain("<script");
  });
});

describe("ViewHtmlDialog (full-screen)", () => {
  it("shows the send HTML read-only with a size meter", () => {
    const html = "<table><tr><td>Hello {{ first_name }}</td></tr></table>";
    render(
      <ViewHtmlDialog name="My Email" html={html} open onClose={() => {}} />
    );

    const ta = screen.getByRole<HTMLTextAreaElement>("textbox", {
      name: "Email HTML",
    });
    expect(ta).toHaveValue(html);
    expect(ta).toHaveAttribute("readonly");
    // The Gmail-clip meter reads in KB.
    expect(screen.getByText(/of 102 KB/i)).toBeInTheDocument();
  });

  it("does not render while closed", () => {
    render(
      <ViewHtmlDialog
        name="x"
        html="<p>hi</p>"
        open={false}
        onClose={() => {}}
      />
    );
    expect(
      screen.queryByRole("textbox", { name: "Email HTML" })
    ).not.toBeInTheDocument();
  });
});
