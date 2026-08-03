"use client";

import { useEffect } from "react";

/**
 * Adds a show/hide toggle to every password input in the admin panel.
 *
 * One implementation, applied everywhere — the create-first-user screen, the
 * login form, the account screen, and any password field added later. Payload's
 * password inputs are not collection fields; they are synthesised inside
 * Payload's own auth views, so there is no field config to attach a component to
 * and no shared input component of ours to swap in. Enhancing the rendered input
 * from a single provider is what keeps the behaviour identical in every view
 * instead of reimplementing Payload's forms three times.
 *
 * It only ever flips `input.type` and manages one sibling button; the value is
 * never touched, so React's control of the field is unaffected.
 *
 * Admin-only. `admin.components.providers` wraps the Payload dashboard, so none
 * of this reaches the public blog bundle.
 */

/**
 * Marks an input we manage, and carries the key its reveal state is stored under.
 * Survives the input being toggled to type=text.
 */
const FIELD_ATTR = "data-ocs-pw-field";

/** Marks our button, so we can tell whether one is currently attached. */
const TOGGLE_ATTR = "data-ocs-pw-toggle";

const EYE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="M2.036 12.322a1 1 0 0 1 0-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178a1 1 0 0 1 0 .644C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z"/><circle cx="12" cy="12" r="3"/></svg>`;

const EYE_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.584 10.587a2 2 0 0 0 2.828 2.83"/><path d="M9.363 5.365A9.466 9.466 0 0 1 12 5c4.638 0 8.573 3.007 9.963 7.178a1 1 0 0 1 0 .644 10.2 10.2 0 0 1-1.67 2.958M6.228 6.228A10.45 10.45 0 0 0 2.037 11.678a1 1 0 0 0 0 .644C3.423 16.49 7.36 19.5 12 19.5a9.7 9.7 0 0 0 4.02-.858"/></svg>`;

/** The toggle currently attached to an input, if any. */
function attachedToggle(input: HTMLInputElement): HTMLButtonElement | null {
  const next = input.nextElementSibling;
  return next instanceof HTMLElement && next.hasAttribute(TOGGLE_ATTR)
    ? (next as HTMLButtonElement)
    : null;
}

/**
 * Aligns the button with the input.
 *
 * Positioned against the input's own parent rather than the `.field-type`
 * wrapper: the wrapper also contains the label and description, and the depth of
 * markup between the two differs between Payload's auth views. Making the
 * immediate parent the containing block means `offsetTop` is measured from it, so
 * the same arithmetic works in every view.
 */
function position(button: HTMLButtonElement, input: HTMLInputElement) {
  const host = input.parentElement;
  if (host) {
    // Checking for "static" alone is not enough: an element with no position set
    // reports "" in some engines, and jsdom is one of them. Test for the values
    // that actually establish a containing block instead.
    const current = getComputedStyle(host).position;
    if (!["absolute", "fixed", "relative", "sticky"].includes(current)) {
      host.style.position = "relative";
    }
  }

  button.style.height = `${input.offsetHeight || 40}px`;
  button.style.top = `${input.offsetTop}px`;
}

export function PasswordVisibilityProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  useEffect(() => {
    /**
     * Whether each field is currently revealed.
     *
     * This has to be ours, not the DOM's. React owns `type` on these inputs and
     * re-asserts `type="password"` from its virtual DOM on every re-render — so
     * on every keystroke. Reading the live attribute would therefore lose the
     * user's choice the moment they type; instead the desired state is kept here
     * and re-applied whenever React overwrites it.
     *
     * Keyed by the field's stable id/name rather than the element, so the state
     * also survives Payload replacing the input outright.
     */
    const revealed = new Map<string, boolean>();

    const keyFor = (input: HTMLInputElement) =>
      (input.getAttribute(FIELD_ATTR) ?? input.id) ||
      input.name ||
      "unnamed-password-field";

    const setState = (button: HTMLButtonElement, visible: boolean) => {
      // Bail when nothing changes. `apply` runs on every DOM mutation, and
      // rewriting innerHTML unconditionally is itself a childList mutation — that
      // fed the observer back into apply and span forever.
      if (button.getAttribute("aria-pressed") === String(visible)) {
        return;
      }
      button.innerHTML = visible ? EYE_OFF : EYE;
      button.setAttribute("aria-pressed", String(visible));
      button.setAttribute(
        "aria-label",
        visible ? "Hide password" : "Show password"
      );
      button.title = visible ? "Hide password" : "Show password";
    };

    /**
     * Force the input and its button to match our stored state.
     *
     * Idempotent, and cheap enough to run on every keystroke and every DOM
     * mutation. Writing `type` only when it differs keeps this from bouncing
     * against the attribute observer.
     */
    const apply = (input: HTMLInputElement) => {
      const isRevealed = revealed.get(keyFor(input)) ?? false;
      const wanted = isRevealed ? "text" : "password";
      if (input.type !== wanted) {
        input.type = wanted;
      }
      const button = attachedToggle(input);
      if (button) {
        setState(button, isRevealed);
      }
    };

    const attach = (input: HTMLInputElement) => {
      // The presence of the button is the only thing that decides whether work
      // is needed. Keying off a marker on the *input* was a bug: Payload's forms
      // re-render and drop DOM they do not own, leaving the marker behind and the
      // button gone, so the input was skipped forever after.
      if (attachedToggle(input)) {
        return;
      }

      // Stamp the key up front so state survives a later remount.
      if (!input.getAttribute(FIELD_ATTR)) {
        input.setAttribute(
          FIELD_ATTR,
          input.id || input.name || "unnamed-password-field"
        );
      }

      const button = document.createElement("button");
      button.setAttribute(TOGGLE_ATTR, "");
      // Without an explicit type, a <button> inside Payload's auth form submits
      // it — clicking "show password" would try to log in or create the user.
      button.type = "button";
      button.tabIndex = 0;

      Object.assign(button.style, {
        alignItems: "center",
        background: "none",
        border: "none",
        borderRadius: "3px",
        color: "var(--theme-elevation-500)",
        cursor: "pointer",
        display: "flex",
        insetInlineEnd: "0",
        justifyContent: "center",
        padding: "0 0.75rem",
        position: "absolute",
        zIndex: "1",
      });

      button.addEventListener("click", () => {
        const key = keyFor(input);
        revealed.set(key, !(revealed.get(key) ?? false));
        apply(input);
        input.focus();
      });

      // Leave room so the glyph never sits on top of typed characters.
      input.style.paddingInlineEnd = "2.75rem";
      input.insertAdjacentElement("afterend", button);
      position(button, input);
      apply(input);

      // Typing is exactly when React re-asserts the attribute, so re-apply
      // immediately rather than waiting for the observer to notice.
      input.addEventListener("input", () => apply(input));
    };

    const scan = () => {
      // Both selectors matter: a revealed input is type=text and would otherwise
      // be invisible to a re-scan if its button had been removed.
      document
        .querySelectorAll<HTMLInputElement>(
          `input[type="password"], input[${FIELD_ATTR}]`
        )
        .forEach((input) => {
          attach(input);
          // React may have reset `type` since the last pass.
          apply(input);
        });
    };

    const resync = () => {
      document
        .querySelectorAll<HTMLInputElement>(`input[${FIELD_ATTR}]`)
        .forEach((input) => {
          const button = attachedToggle(input);
          if (button) {
            position(button, input);
          }
        });
    };

    scan();

    // Payload re-renders and client-navigates between admin views, so password
    // inputs appear — and our buttons disappear — after mount.
    const observer = new MutationObserver(() => scan());
    observer.observe(document.body, {
      // `type` matters as much as childList: React rewrites it on re-render, and
      // an attribute change does not surface in a childList-only observer, which
      // is why a revealed field silently re-masked itself while typing.
      attributeFilter: ["type"],
      attributes: true,
      childList: true,
      subtree: true,
    });
    window.addEventListener("resize", resync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resync);
      document
        .querySelectorAll<HTMLElement>(`[${TOGGLE_ATTR}]`)
        .forEach((button) => button.remove());
    };
  }, []);

  return <>{children}</>;
}

export default PasswordVisibilityProvider;
