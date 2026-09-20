export type WebClientKind = 'phone' | 'tablet' | 'desktop';

export type ClassifyWebClientInput = {
  userAgent: string;
  maxTouchPoints: number;
  pointerCoarse: boolean;
  viewportWidth: number;
};

export function isHandheldClient(kind: WebClientKind): boolean {
  return kind === 'phone' || kind === 'tablet';
}

export function classifyWebClient(input: ClassifyWebClientInput): WebClientKind {
  const ua = input.userAgent;
  const iPhone = /iPhone|iPod/i.test(ua);
  const iPadToken = /iPad/i.test(ua);
  const iPadOsDesktopUa = /Macintosh/i.test(ua) && input.maxTouchPoints > 1;
  const android = /Android/i.test(ua);
  const androidMobile = android && /Mobile/i.test(ua);

  if (iPhone || androidMobile) return 'phone';
  if (iPadToken || iPadOsDesktopUa) return 'tablet';
  if (android && !androidMobile) return 'tablet';
  if (input.pointerCoarse && input.viewportWidth < 768) return 'phone';
  if (input.pointerCoarse) return 'tablet';
  return 'desktop';
}
