// Per-table variant of the app's Supabase mock: routes that touch several
// tables with some calls happening concurrently (Promise.all) are easier to
// stub correctly by table name than by a single global call-order queue.
// Each table can be given either one static { data, error } reused for every
// call, or an array consumed in order (for a table hit more than once with
// different expected results, e.g. two sequential inserts).
type MockResult<T = any> = { data: T; error: any };
type TableConfig = MockResult | MockResult[];

export function createSupabaseTableMock(tables: Record<string, TableConfig>) {
  const counters: Record<string, number> = {};

  const chainFor = (table: string) => {
    const config = tables[table];
    const next = (): MockResult => {
      if (!config) return { data: null, error: null };
      if (Array.isArray(config)) {
        const i = counters[table] ?? 0;
        counters[table] = i + 1;
        return i < config.length ? config[i] : config[config.length - 1];
      }
      return config;
    };

    const chain: any = {};
    const chainMethods = [
      'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains',
      'not', 'is', 'order', 'limit', 'range',
    ];
    for (const m of chainMethods) chain[m] = jest.fn(() => chain);
    chain.single = jest.fn(() => Promise.resolve(next()));
    chain.maybeSingle = jest.fn(() => Promise.resolve(next()));
    chain.then = (resolve: (v: MockResult) => any, reject?: (e: any) => any) =>
      Promise.resolve(next()).then(resolve, reject);
    return chain;
  };

  const fromFn = jest.fn((table: string) => chainFor(table));
  return { supabase: { from: fromFn }, fromFn };
}
