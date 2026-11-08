/**
 * Pure reading-position maths for the article page. The client components only
 * measure the DOM and hand the numbers here, so the behaviour is testable
 * without a browser.
 */

/** Height of the sticky site navbar (ns.css `.nav-in`). */
export const NAV_HEIGHT = 60;

/**
 * A heading becomes the "current section" once its top crosses this line,
 * measured from the top of the viewport. Sits a little below the navbar (and
 * the mobile outline bar) so a section lights up as you start reading it.
 */
export const ACTIVE_LINE = 140;

/**
 * How far through the article body the reader is, 0 to 1.
 *
 * 0 while the body's top is still below the navbar; 1 once its last line is on
 * screen. Measuring the body (not the page) means the header, related posts and
 * footer don't count, so the bar reaches 100% at the final paragraph.
 */
export function readingProgress(
  body: { top: number; height: number },
  viewportHeight: number,
  offset: number = NAV_HEIGHT
): number {
  const visible = viewportHeight - offset;
  const scrollable = body.height - visible;

  if (scrollable <= 0) {
    // Shorter than the screen: done as soon as all of it is in view.
    return body.top + body.height <= viewportHeight ? 1 : 0;
  }

  const scrolled = offset - body.top;
  return Math.min(1, Math.max(0, scrolled / scrollable));
}

/** Whole minutes still to read. Never 0 until the reader has finished. */
export function minutesLeft(totalMinutes: number, progress: number): number {
  if (progress >= 1) {
    return 0;
  }

  return Math.max(1, Math.ceil(totalMinutes * (1 - progress)));
}

/**
 * The section being read: the last heading whose top has crossed `line`.
 * Before the first heading is reached, nothing is current (null).
 * `tops` are viewport-relative, in document order; null for a missing heading.
 */
export function activeHeadingIndex(
  tops: Array<number | null>,
  line: number = ACTIVE_LINE
): number | null {
  let active: number | null = null;

  tops.forEach((top, index) => {
    if (top !== null && top <= line) {
      active = index;
    }
  });

  return active;
}
