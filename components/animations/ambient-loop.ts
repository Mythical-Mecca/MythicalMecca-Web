/**
 * Drives a throttled requestAnimationFrame loop for ambient/background
 * canvases. The loop automatically:
 *   - caps the frame rate (backgrounds don't need 60fps), and
 *   - pauses entirely while the tab is hidden or `el` is scrolled off-screen,
 * so idle/offscreen animations stop burning the main thread.
 *
 * Pass `loop: false` (e.g. for prefers-reduced-motion) to paint a single
 * static frame and never animate.
 *
 * `step` should advance + paint exactly one frame. It must NOT schedule its
 * own requestAnimationFrame — this helper owns the loop.
 *
 * Returns a cleanup function that stops the loop and detaches listeners.
 */
export function runAmbientLoop(
  el: Element,
  step: () => void,
  { fps = 30, loop = true }: { fps?: number; loop?: boolean } = {}
): () => void {
  if (!loop) {
    step(); // single static frame
    return () => {};
  }

  const interval = 1000 / fps;
  let raf = 0;
  let last = 0;
  let running = false;
  let visible =
    typeof document === "undefined" || document.visibilityState === "visible";
  let onScreen = true;

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (now - last < interval) return;
    last = now;
    step();
  };

  const start = () => {
    if (running || !visible || !onScreen) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(tick);
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const sync = () => (visible && onScreen ? start() : stop());

  const onVisibility = () => {
    visible = document.visibilityState === "visible";
    sync();
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    },
    { rootMargin: "120px" }
  );
  io.observe(el);
  document.addEventListener("visibilitychange", onVisibility);

  start();

  return () => {
    stop();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
