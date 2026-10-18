// Town names come from free-text input on both sides (a tradie's serviced
// towns, a customer's job town) — matching is a plain string comparison, so
// both sides need to funnel through the same normalization or "Sandton" and
// "sandton " would never match.
export function normalizeTown(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
