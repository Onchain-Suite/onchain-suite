import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { PasswordVisibilityProvider } from "@/payload/components/password-visibility-provider";

/**
 * Recreates the DOM Payload renders around a password input, so the provider is
 * exercised against the structure it actually meets at runtime rather than a
 * convenient stand-in.
 */
function mountPayloadField(id = "pw") {
  const field = document.createElement("div");
  field.className = "field-type password";
  const input = document.createElement("input");
  input.type = "password";
  input.id = id;
  field.appendChild(input);
  document.body.appendChild(field);
  return input;
}

const toggleFor = (input: HTMLInputElement) =>
  input.nextElementSibling as HTMLButtonElement | null;

/** The toggle, or a clear failure — keeps the assertions free of `!`. */
function requireToggle(input: HTMLInputElement): HTMLButtonElement {
  const button = toggleFor(input);
  if (!button) {
    throw new Error("expected a visibility toggle next to the password input");
  }
  return button;
}

describe("PasswordVisibilityProvider", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("adds a toggle button to an existing password input", async () => {
    const input = mountPayloadField();
    render(<PasswordVisibilityProvider />);

    await waitFor(() => expect(toggleFor(input)).not.toBeNull());
    const button = requireToggle(input);

    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("aria-label")).toBe("Show password");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(input.type).toBe("password");
  });

  it("uses type=button so it cannot submit the auth form", async () => {
    // A bare <button> inside Payload's form defaults to type=submit, so
    // clicking "show password" would attempt to create the user.
    const input = mountPayloadField();
    render(<PasswordVisibilityProvider />);

    await waitFor(() => expect(toggleFor(input)).not.toBeNull());
    expect(requireToggle(input).type).toBe("button");
  });

  it("toggles the input between password and text, and back", async () => {
    const input = mountPayloadField();
    render(<PasswordVisibilityProvider />);
    await waitFor(() => expect(toggleFor(input)).not.toBeNull());
    const button = requireToggle(input);

    button.click();
    expect(input.type).toBe("text");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe("Hide password");

    button.click();
    expect(input.type).toBe("password");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.getAttribute("aria-label")).toBe("Show password");
  });

  it("never alters the value it is revealing", async () => {
    const input = mountPayloadField();
    input.value = "correct horse battery staple";
    render(<PasswordVisibilityProvider />);
    await waitFor(() => expect(toggleFor(input)).not.toBeNull());

    requireToggle(input).click();
    expect(input.value).toBe("correct horse battery staple");
    requireToggle(input).click();
    expect(input.value).toBe("correct horse battery staple");
  });

  it("enhances every password field on the form independently", async () => {
    // create-first-user has both "New Password" and "Confirm Password".
    const first = mountPayloadField("new");
    const second = mountPayloadField("confirm");
    render(<PasswordVisibilityProvider />);

    await waitFor(() => {
      expect(toggleFor(first)).not.toBeNull();
      expect(toggleFor(second)).not.toBeNull();
    });

    requireToggle(first).click();
    expect(first.type).toBe("text");
    // Revealing one must not reveal the other.
    expect(second.type).toBe("password");
  });

  it("enhances inputs that appear after mount", async () => {
    // Payload client-navigates between login, create-first-user and account,
    // so the field often does not exist when the provider mounts.
    render(<PasswordVisibilityProvider />);
    const late = mountPayloadField("late");

    await waitFor(() => expect(toggleFor(late)).not.toBeNull());
    requireToggle(late).click();
    expect(late.type).toBe("text");
  });

  it("does not double-enhance on repeated DOM mutations", async () => {
    const input = mountPayloadField();
    render(<PasswordVisibilityProvider />);
    await waitFor(() => expect(toggleFor(input)).not.toBeNull());

    // Provoke the MutationObserver repeatedly.
    for (let i = 0; i < 3; i++) {
      document.body.appendChild(document.createElement("div"));
    }

    await waitFor(() =>
      expect(document.querySelectorAll("button[aria-label]").length).toBe(1)
    );
  });

  it("removes its buttons on unmount", async () => {
    const input = mountPayloadField();
    const { unmount } = render(<PasswordVisibilityProvider />);
    await waitFor(() => expect(toggleFor(input)).not.toBeNull());

    unmount();
    expect(document.querySelectorAll("button[aria-label]").length).toBe(0);
  });

  it("renders its children untouched", () => {
    const { getByText } = render(
      <PasswordVisibilityProvider>
        <span>admin content</span>
      </PasswordVisibilityProvider>
    );
    expect(getByText("admin content")).toBeTruthy();
  });
});
