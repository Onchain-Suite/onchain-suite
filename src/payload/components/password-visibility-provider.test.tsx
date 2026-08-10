import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

/** The toggle, or a clear failure - keeps the assertions free of `!`. */
function requireToggle(input: HTMLInputElement): HTMLButtonElement {
  const button = toggleFor(input);
  if (!button) {
    throw new Error("expected a visibility toggle next to the password input");
  }
  return button;
}

// The shared setup registers RTL cleanup inside a promise, so it is not reliably
// active. Unmounting explicitly matters here: a leaked provider keeps a live
// MutationObserver that goes on enhancing DOM in later tests.
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

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

describe("resilience to React re-renders", () => {
  it("re-adds the toggle if React removes it", async () => {
    // Payload's auth forms re-render and drop DOM they do not own. The marker
    // stays on the input, so a marker-only guard would refuse to re-enhance and
    // the toggle would be gone for good.
    const input = mountPayloadField();
    render(<PasswordVisibilityProvider />);
    await waitFor(() => expect(toggleFor(input)).not.toBeNull());

    requireToggle(input).remove();
    expect(toggleFor(input)).toBeNull();

    // Provoke the observer the way a re-render would.
    document.body.appendChild(document.createElement("div"));

    await waitFor(() => expect(toggleFor(input)).not.toBeNull());
  });
});

describe("Payload's real auth-view markup", () => {
  /**
   * The login form nests deeper than create-first-user:
   *   .field-type.password > .field-type__wrap > div > input
   * Positioning must not depend on that depth.
   */
  function mountLoginField() {
    const field = document.createElement("div");
    field.className = "field-type password";
    const wrap = document.createElement("div");
    wrap.className = "field-type__wrap";
    const inner = document.createElement("div");
    const input = document.createElement("input");
    input.type = "password";
    input.id = "field-password";
    input.setAttribute("aria-label", "Password");
    inner.appendChild(input);
    wrap.appendChild(inner);
    field.appendChild(wrap);
    document.body.appendChild(field);
    return input;
  }

  it("attaches to the login form's deeper markup", async () => {
    const input = mountLoginField();
    render(<PasswordVisibilityProvider />);

    await waitFor(() => expect(toggleFor(input)).not.toBeNull());
    const button = requireToggle(input);
    expect(button.type).toBe("button");
    // Positioned against the input's own parent, whatever the depth above it.
    expect(input.parentElement?.style.position).toBe("relative");
    expect(button.style.position).toBe("absolute");
  });

  it("toggles on the login form", async () => {
    const input = mountLoginField();
    render(<PasswordVisibilityProvider />);
    await waitFor(() => expect(toggleFor(input)).not.toBeNull());

    requireToggle(input).click();
    expect(input.type).toBe("text");
    requireToggle(input).click();
    expect(input.type).toBe("password");
  });

  it("re-attaches even when the input is currently revealed", async () => {
    // A revealed input is type=text, so a selector looking only for
    // input[type=password] would never find it again.
    const input = mountLoginField();
    render(<PasswordVisibilityProvider />);
    await waitFor(() => expect(toggleFor(input)).not.toBeNull());

    requireToggle(input).click();
    expect(input.type).toBe("text");

    requireToggle(input).remove();
    document.body.appendChild(document.createElement("div"));

    await waitFor(() => expect(toggleFor(input)).not.toBeNull());
    // Re-attached in the state the input is actually in.
    expect(requireToggle(input).getAttribute("aria-pressed")).toBe("true");
  });

  it("still shows exactly one toggle per field after churn", async () => {
    const a = mountLoginField();
    const b = mountPayloadField("second");
    render(<PasswordVisibilityProvider />);
    await waitFor(() => {
      expect(toggleFor(a)).not.toBeNull();
      expect(toggleFor(b)).not.toBeNull();
    });

    for (let i = 0; i < 5; i++) {
      document.body.appendChild(document.createElement("div"));
    }

    await waitFor(() =>
      expect(document.querySelectorAll("[data-ocs-pw-toggle]").length).toBe(2)
    );
  });
});

describe("survives React re-asserting the type attribute", () => {
  it("stays revealed when React resets type while typing", async () => {
    // The reported bug: reveal, type one character, and the field silently
    // re-masked while the button still claimed "Hide password". React owns `type`
    // on these inputs and rewrites it from its vdom on every keystroke.
    const input = mountPayloadField();
    render(<PasswordVisibilityProvider />);
    await waitFor(() => expect(toggleFor(input)).not.toBeNull());

    requireToggle(input).click();
    expect(input.type).toBe("text");

    // Exactly what React does on re-render, then the keystroke event.
    input.type = "password";
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(input.type).toBe("text");
    expect(requireToggle(input).getAttribute("aria-pressed")).toBe("true");
  });

  it("self-heals from an attribute reset with no input event at all", async () => {
    const input = mountPayloadField();
    render(<PasswordVisibilityProvider />);
    await waitFor(() => expect(toggleFor(input)).not.toBeNull());
    requireToggle(input).click();

    input.type = "password";

    // The observer watches the type attribute, so this recovers unprompted.
    await waitFor(() => expect(input.type).toBe("text"));
  });

  it("stays masked when hidden, even if something sets type=text", async () => {
    // The inverse must hold too, or a stray render could expose a password.
    const input = mountPayloadField();
    render(<PasswordVisibilityProvider />);
    await waitFor(() => expect(toggleFor(input)).not.toBeNull());

    input.type = "text";
    await waitFor(() => expect(input.type).toBe("password"));
    expect(requireToggle(input).getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps each field's state separate under churn", async () => {
    const a = mountPayloadField("one");
    const b = mountPayloadField("two");
    render(<PasswordVisibilityProvider />);
    await waitFor(() => {
      expect(toggleFor(a)).not.toBeNull();
      expect(toggleFor(b)).not.toBeNull();
    });

    requireToggle(a).click();
    a.type = "password";
    b.type = "text";
    a.dispatchEvent(new Event("input", { bubbles: true }));
    b.dispatchEvent(new Event("input", { bubbles: true }));

    expect(a.type).toBe("text");
    expect(b.type).toBe("password");
  });
});
