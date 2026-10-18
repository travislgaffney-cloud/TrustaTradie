import { createSupabaseMock } from '../helpers/supabase-mock';

const mockNotifyUser = jest.fn().mockResolvedValue(undefined);
const mockCreateTransaction = jest.fn().mockResolvedValue({ id: 'txn-1' });

jest.mock('@/lib/notifications', () => ({
  notifyUser: (...args: any[]) => mockNotifyUser(...args),
}));

jest.mock('@/hooks/use-transactions', () => ({
  createTransaction: (...args: any[]) => mockCreateTransaction(...args),
}));

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/hooks/use-refresh-on-focus', () => ({ useRefreshOnFocus: jest.fn() }));
jest.mock('@/store/auth-store', () => ({ useAuthStore: jest.fn() }));

import { supabase } from '@/lib/supabase';
import { acceptQuote } from '@/hooks/use-quotes';

// Call order inside acceptQuote(), which is what the mock queue below lines
// up with: 1) accept the winning quote, 2) accept the job, 3) bulk-reject
// every other pending quote for that job, 4+5) re-fetch the quote and job
// (run concurrently via Promise.all, but array elements still evaluate
// left-to-right so the queue order holds).
function mockAcceptQuoteCalls(opts: {
  rejectedQuotes: { id: string; tradie_id: string }[];
  quote: { tradie_id: string; amount: number } | null;
  job: { title: string; customer_id: string } | null;
}) {
  const mock = createSupabaseMock([
    { data: null, error: null }, // accept quote update
    { data: null, error: null }, // accept job update
    { data: opts.rejectedQuotes, error: null }, // bulk-reject others, .select('id, tradie_id')
    { data: opts.quote, error: null }, // re-fetch quote
    { data: opts.job, error: null }, // re-fetch job
  ]);
  (supabase.from as jest.Mock).mockImplementation(mock.fromFn);
}

describe('acceptQuote (hooks/use-quotes.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('notifies every rejected tradie, not just the winner', async () => {
    mockAcceptQuoteCalls({
      rejectedQuotes: [
        { id: 'quote-2', tradie_id: 'tradie-2' },
        { id: 'quote-3', tradie_id: 'tradie-3' },
      ],
      quote: { tradie_id: 'tradie-1', amount: 500 },
      job: { title: 'Fix the leak', customer_id: 'cust-1' },
    });

    await acceptQuote('quote-1', 'job-1');

    expect(mockNotifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'tradie-2', type: 'quote_rejected' })
    );
    expect(mockNotifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'tradie-3', type: 'quote_rejected' })
    );
    expect(mockNotifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'tradie-1', type: 'quote_accepted' })
    );
    // winner + 2 rejected = 3 notifications
    expect(mockNotifyUser).toHaveBeenCalledTimes(3);
  });

  it('skips the rejection notification entirely when no other quotes existed', async () => {
    mockAcceptQuoteCalls({
      rejectedQuotes: [],
      quote: { tradie_id: 'tradie-1', amount: 500 },
      job: { title: 'Fix the leak', customer_id: 'cust-1' },
    });

    await acceptQuote('quote-1', 'job-1');

    expect(mockNotifyUser).toHaveBeenCalledTimes(1);
    expect(mockNotifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'quote_accepted' })
    );
  });

  it('creates the internal transaction ledger row for the winning quote', async () => {
    mockAcceptQuoteCalls({
      rejectedQuotes: [],
      quote: { tradie_id: 'tradie-1', amount: 750 },
      job: { title: 'Fix the leak', customer_id: 'cust-1' },
    });

    await acceptQuote('quote-1', 'job-1');

    expect(mockCreateTransaction).toHaveBeenCalledWith({
      jobId: 'job-1',
      quoteId: 'quote-1',
      customerId: 'cust-1',
      tradieId: 'tradie-1',
      quotedAmount: 750,
    });
  });
});
