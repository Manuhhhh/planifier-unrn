/**
 * Courses covered by a drag that started on `anchor` and is now over `current`, in list order.
 * If `current` is no longer listed only the anchor counts; if the anchor is gone, nothing does.
 */
export function rangeBetween(order: readonly string[], anchor: string, current: string): string[] {
  const start = order.indexOf(anchor);
  if (start === -1) return [];
  const end = order.indexOf(current);
  if (end === -1) return [anchor];
  return order.slice(Math.min(start, end), Math.max(start, end) + 1);
}
