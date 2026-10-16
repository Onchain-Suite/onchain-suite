import { afterEach } from "vitest";

const isDom = typeof window !== "undefined" && typeof document !== "undefined";

if (isDom) {
  // Top-level await (not a floating `.then`) so the matchers, cleanup hook and
  // timeout config below are all in place BEFORE the first test runs — vitest
  // awaits setup modules, but not promises left dangling inside them.
  await import("@testing-library/jest-dom/vitest");
  const { cleanup, configure } = await import("@testing-library/react");

  // Raise RTL's async-utility timeout from its 1000ms default. The suite runs
  // single-worker (fileParallelism is off in vitest.config), so under full-suite
  // CPU contention a legitimate multi-step async chain — e.g. the SQL query
  // tab's react-query run -> status poll -> results fetch, gated on
  // `enabled` flags flipping across renders — can take longer than 1s to
  // settle and make `findBy`/`waitFor` flake, even though the same test passes
  // in isolation. 5s is headroom, not latency: these helpers resolve the
  // instant the element appears, so passing tests are not slowed; only a
  // genuine miss now takes longer to surface.
  configure({ asyncUtilTimeout: 5000 });

  afterEach(() => cleanup());

  // jsdom ships without a handful of browser APIs that component trees touch on
  // mount (media queries, observers, imperative scrolling, server-sent events).
  // Provide minimal, side-effect-free polyfills so any surface can render. Each
  // is guarded so a richer environment (or a per-test override) is never
  // clobbered.

  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
  }

  if (typeof window.IntersectionObserver === "undefined") {
    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = "";
      readonly thresholds: ReadonlyArray<number> = [];
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
    globalThis.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  }

  if (typeof window.ResizeObserver === "undefined") {
    class MockResizeObserver implements ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    window.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;
    globalThis.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;
  }

  if (typeof Element.prototype.scrollIntoView !== "function") {
    Element.prototype.scrollIntoView = function scrollIntoView(): void {};
  }

  if (typeof window.scrollTo !== "function") {
    window.scrollTo = (() => {}) as typeof window.scrollTo;
  }

  if (typeof window.EventSource === "undefined") {
    class MockEventSource implements EventSource {
      static readonly CONNECTING = 0 as const;
      static readonly OPEN = 1 as const;
      static readonly CLOSED = 2 as const;
      readonly CONNECTING = 0 as const;
      readonly OPEN = 1 as const;
      readonly CLOSED = 2 as const;
      readonly url: string = "";
      readonly withCredentials: boolean = false;
      readonly readyState: number = 0;
      onopen: ((this: EventSource, ev: Event) => unknown) | null = null;
      onmessage: ((this: EventSource, ev: MessageEvent) => unknown) | null =
        null;
      onerror: ((this: EventSource, ev: Event) => unknown) | null = null;
      addEventListener(): void {}
      removeEventListener(): void {}
      dispatchEvent(): boolean {
        return false;
      }
      close(): void {}
    }
    window.EventSource = MockEventSource as unknown as typeof EventSource;
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource;
  }
}
