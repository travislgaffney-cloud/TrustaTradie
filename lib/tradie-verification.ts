// Shared helper for every screen that joins tradie_profiles just to read
// verification status. Postgrest returns a to-one nested embed as either a
// plain object or a single-element array depending on how it infers the
// relationship cardinality — normalized here once instead of guessed at
// each call site.
export interface TradieVerificationFields {
  is_verified: boolean;
  gold_verified: boolean;
}

export function normalizeTradieVerification(
  joined: TradieVerificationFields | TradieVerificationFields[] | null | undefined
): TradieVerificationFields | null {
  if (!joined) return null;
  return Array.isArray(joined) ? joined[0] ?? null : joined;
}

// Convenience for the common case of feeding an Avatar's `verified` prop
// directly from a joined tradie_profiles row.
export function avatarVerifiedProp(
  joined: TradieVerificationFields | TradieVerificationFields[] | null | undefined
): boolean | 'gold' | undefined {
  const tp = normalizeTradieVerification(joined);
  if (!tp) return undefined;
  return tp.gold_verified ? 'gold' : tp.is_verified;
}
