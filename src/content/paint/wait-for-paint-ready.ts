/**
 * Wait until the document can yield client rects for restored ranges.
 * document_idle still races first layout on some pages.
 */
export function waitForPaintReady(
  doc: Document = document,
  raf: (cb: FrameRequestCallback) => number = requestAnimationFrame
): Promise<void> {
  const afterLayout = (): Promise<void> =>
    new Promise((resolve) => {
      raf(() => {
        raf(() => resolve());
      });
    });

  if (doc.readyState === 'complete') {
    return afterLayout();
  }

  return new Promise((resolve) => {
    const finish = (): void => {
      void afterLayout().then(resolve);
    };
    if (doc.readyState !== 'loading') {
      finish();
      return;
    }
    doc.addEventListener('DOMContentLoaded', finish, { once: true });
  });
}
