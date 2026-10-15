/* In-page jumps on the playbook pages. Called only from client event
   handlers, so `window` is always there by the time these run. */

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Scrolls to an anchor, focuses its heading and updates the hash. */
export function scrollToAnchor(id: string, smooth = true): void {
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  // "instant", not "auto": <html> carries a global scroll-smooth class, and
  // "auto" would inherit it.
  target.scrollIntoView({
    behavior: smooth && !prefersReducedMotion() ? "smooth" : "instant",
    block: "start",
  });
  const heading = target.matches("[data-jump-focus]")
    ? target
    : target.querySelector<HTMLElement>("[data-jump-focus]");
  heading?.focus({ preventScroll: true });
  // replaceState keeps ?client=, and does not add a history entry or a page
  // view.
  if (window.location.hash !== `#${id}`) {
    window.history.replaceState(window.history.state, "", `#${id}`);
  }
}
