"use client";

import { useEffect } from "react";

/**
 * Adds a show/hide toggle to every password input in the admin panel.
 *
 * Payload has no built-in visibility toggle, and its password inputs are not
 * collection fields — they are synthesised inside Payload's own views (create
 * first user, login, account), so there is no field config to hang an
 * `AfterInput` component on. Overriding those whole views would mean
 * reimplementing Payload's auth forms and re-testing them on every upgrade.
 *
 * So this enhances the rendered inputs instead: one provider, mounted once,
 * covering every password field that exists now or is added later. It only ever
 * flips `input.type` and adds a sibling button — it never touches the value, so
 * React's control of the field is unaffected.
 *
 * Admin-only. `admin.components.providers` wraps the Payload dashboard, so none
 * of this reaches the public blog bundle.
 */

const MARKER = "data-ocs-pw-toggle";

const EYE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="M2.036 12.322a1 1 0 0 1 0-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178a1 1 0 0 1 0 .644C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z"/><circle cx="12" cy="12" r="3"/></svg>`;

const EYE_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.584 10.587a2 2 0 0 0 2.828 2.83"/><path d="M9.363 5.365A9.466 9.466 0 0 1 12 5c4.638 0 8.573 3.007 9.963 7.178a1 1 0 0 1 0 .644 10.2 10.2 0 0 1-1.67 2.958M6.228 6.228A10.45 10.45 0 0 0 2.037 11.678a1 1 0 0 0 0 .644C3.423 16.49 7.36 19.5 12 19.5a9.7 9.7 0 0 0 4.02-.858"/></svg>`;

function styleButton(button: HTMLButtonElement, input: HTMLInputElement) {
  const wrapper = input.closest<HTMLElement>(".field-type");
  if (wrapper && getComputedStyle(wrapper).position === "static") {
    // Payload already sets position:relative on .field-type.password; this only
    // covers any other field type that might host a password input later.
    wrapper.style.position = "relative";
  }

  Object.assign(button.style, {
    alignItems: "center",
    background: "none",
    border: "none",
    borderRadius: "3px",
    color: "var(--theme-elevation-500)",
    cursor: "pointer",
    display: "flex",
    // offsetTop/offsetHeight are measured against the positioned .field-type
    // ancestor, so the button lines up with the input itself rather than the
    // label sitting above it.
    height: `${input.offsetHeight}px`,
    insetInlineEnd: "0",
    justifyContent: "center",
    padding: "0 0.75rem",
    position: "absolute",
    top: `${input.offsetTop}px`,
  });
}

export function PasswordVisibilityProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  useEffect(() => {
    const buttons = new Set<HTMLButtonElement>();

    const setState = (button: HTMLButtonElement, visible: boolean) => {
      button.innerHTML = visible ? EYE_OFF : EYE;
      button.setAttribute("aria-pressed", String(visible));
      button.setAttribute(
        "aria-label",
        visible ? "Hide password" : "Show password"
      );
      button.title = visible ? "Hide password" : "Show password";
    };

    const enhance = (input: HTMLInputElement) => {
      if (input.hasAttribute(MARKER)) {
        return;
      }
      input.setAttribute(MARKER, "");

      const button = document.createElement("button");
      // Without an explicit type, a <button> inside Payload's auth form submits
      // it — clicking "show password" would try to create the user.
      button.type = "button";
      button.tabIndex = 0;
      setState(button, false);
      styleButton(button, input);

      button.addEventListener("click", () => {
        const visible = input.type === "text";
        input.type = visible ? "password" : "text";
        setState(button, !visible);
        // Keep the caret where the user left it.
        input.focus();
      });

      // Leave room so the glyph never sits on top of typed characters.
      input.style.paddingInlineEnd = "2.75rem";
      input.insertAdjacentElement("afterend", button);
      buttons.add(button);
    };

    const scan = () => {
      document
        .querySelectorAll<HTMLInputElement>(
          `input[type="password"]:not([${MARKER}])`
        )
        .forEach(enhance);
    };

    scan();

    // Payload re-renders and client-navigates between admin views, so new
    // password inputs appear after mount. Re-scanning on mutation covers login,
    // create-first-user and the account screen without knowing their routes.
    const observer = new MutationObserver(() => scan());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      buttons.forEach((button) => button.remove());
    };
  }, []);

  return <>{children}</>;
}

export default PasswordVisibilityProvider;
