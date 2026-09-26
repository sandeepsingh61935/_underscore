/**
 * Bound third-party response bodies before logging: enough to diagnose,
 * bounded blast radius for customer data in log aggregators.
 */
export function truncateForLog(value: unknown, maxChars = 200): string {
  let text: string;
  if (typeof value === 'string') {
    text = value;
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      return '[unserializable]';
    }
  }
  return text.length > maxChars ? text.slice(0, maxChars) + '…' : text;
}
