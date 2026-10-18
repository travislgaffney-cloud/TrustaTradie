// A minimal stand-in for supabase-js's fluent query builder. Every chain
// method returns the same mock so `.from().select().eq().single()` (and any
// other combination) resolves correctly, and the chain itself is thenable so
// code that awaits without a terminal `.single()`/`.maybeSingle()` call
// (e.g. `await supabase.from(x).update(y).eq(z).select()`) still works.
//
// Each call to a terminal point (`.single()`, `.maybeSingle()`, or awaiting
// the chain directly) shifts the next `{ data, error }` off a queue you
// provide — so a function that makes two sequential Supabase calls (a SELECT
// then an UPDATE, say) gets a different mocked response for each.
type MockResult<T = any> = { data: T; error: any };

export function createSupabaseMock(results: MockResult[]) {
  let i = 0;
  const next = (): MockResult => (i < results.length ? results[i++] : { data: null, error: null });

  const chain: any = {};
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'overlaps',
    'not', 'is', 'order', 'limit', 'range',
  ];
  for (const m of chainMethods) {
    chain[m] = jest.fn(() => chain);
  }
  chain.single = jest.fn(() => Promise.resolve(next()));
  chain.maybeSingle = jest.fn(() => Promise.resolve(next()));
  chain.then = (resolve: (v: MockResult) => any, reject?: (e: any) => any) =>
    Promise.resolve(next()).then(resolve, reject);

  const fromFn = jest.fn(() => chain);

  return {
    supabase: { from: fromFn },
    chain,
    fromFn,
  };
}
