// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@/features/language/hooks/useLanguage';
import { FeedbackDashboard } from '@/features/admin/feedback/FeedbackDashboard';
import { AdminAccessDenied } from '@/features/admin/feedback/AdminAccessDenied';
import { adminFeedbackCopy } from '@/features/admin/feedback/presentation/copy';
import type { AdminFeedbackPage } from '@/features/admin/feedback/types';

/**
 * The admin feedback dashboard's presentation.
 *
 * The server decides who may see this page; what is tested here is that the
 * three states are distinguishable and that the figures shown are the ones the
 * server sent. The recurring hazard is collapsing "empty" into "loading", which
 * makes a working dashboard look broken — so both are asserted explicitly, along
 * with the error path and paging.
 */

const COPY = adminFeedbackCopy.en;

function renderDashboard() {
  return render(
    <LanguageProvider>
      <FeedbackDashboard />
    </LanguageProvider>
  );
}

function payload(overrides: Partial<AdminFeedbackPage> = {}): AdminFeedbackPage {
  return {
    items: [
      {
        id: 'fb-1',
        module: 'loan',
        rating: 5,
        comment: 'The EMI breakdown helped a lot.',
        createdAt: '2026-03-01T09:00:00.000Z',
      },
      {
        id: 'fb-2',
        module: 'schemes',
        rating: 2,
        comment: null,
        createdAt: '2026-02-28T09:00:00.000Z',
      },
    ],
    stats: {
      total: 42,
      averageRating: 4.12,
      distribution: { '1': 2, '2': 4, '3': 6, '4': 10, '5': 20 },
    },
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: 42,
      totalPages: 3,
      hasPrevious: false,
      hasNext: true,
    },
    ...overrides,
  };
}

/** A fetch stub that records the URLs it was asked for. */
function stubFetch(handler: (url: string) => { status: number; body: unknown }) {
  const urls: string[] = [];
  const fetchMock = async (url: string) => {
    urls.push(url);
    const { status, body } = handler(url);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  };
  (globalThis as { fetch: unknown }).fetch = fetchMock;
  return { urls };
}

function ok(body: unknown) {
  return { status: 200, body: { success: true, data: body, meta: { timestamp: 'now' } } };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (globalThis as { fetch?: unknown }).fetch;
});

describe('summary statistics', () => {
  it('shows the total submissions', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    expect(await screen.findByText(COPY.totalSubmissions)).toBeDefined();
    expect(screen.getByText('42')).toBeDefined();
  });

  it('shows the average rating to two decimals', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    expect(await screen.findByText(COPY.averageRating)).toBeDefined();
    expect(screen.getByText('4.12')).toBeDefined();
    expect(screen.getByText(COPY.outOfFive)).toBeDefined();
  });

  it('shows a dash rather than zero when nothing was submitted', async () => {
    // "No ratings yet" and "an average rating of zero" are different facts, and a
    // zero would read as catastrophic feedback.
    stubFetch(() =>
      ok(
        payload({
          items: [],
          stats: { total: 0, averageRating: null, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } },
          pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasPrevious: false, hasNext: false },
        })
      )
    );
    renderDashboard();

    expect(await screen.findByText(COPY.noAverageYet)).toBeDefined();
    expect(screen.queryByText('0.00')).toBeNull();
  });

  it('shows all five rating rows with their counts', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    expect(await screen.findByText(COPY.distributionTitle)).toBeDefined();
    for (const [rating, count] of [
      [1, 2],
      [2, 4],
      [3, 6],
      [4, 10],
      [5, 20],
    ] as const) {
      expect(screen.getAllByText(new RegExp(`^${count} \\(`)).length).toBeGreaterThan(0);
      expect(screen.getAllByText(String(rating)).length).toBeGreaterThan(0);
    }
  });

  it('labels each distribution row for a screen reader', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    const label = COPY.distributionRowLabel
      .replace('{count}', '20')
      .replace('{total}', '42')
      .replace('{rating}', '5');
    await waitFor(() => expect(screen.getByLabelText(label)).toBeDefined());
  });
});

describe('the feedback list', () => {
  /** The list of submissions, without the summary statistics above it. */
  async function list(): Promise<HTMLElement> {
    await screen.findByText('The EMI breakdown helped a lot.');
    const section = document.getElementById('admin-feedback-list')!.parentElement!;
    return section.querySelector('ul')!;
  }

  it('renders exactly one row per submission', async () => {
    // One list, not a table plus a card list. Rendering both and toggling with
    // CSS duplicated every message in the DOM; a jsdom test caught it.
    stubFetch(() => ok(payload()));
    renderDashboard();

    const rows = within(await list()).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
  });

  it('renders each message exactly once', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    await list();
    expect(screen.getAllByText('The EMI breakdown helped a lot.')).toHaveLength(1);
  });

  it('shows the module each submission came from', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    const rows = within(await list()).getAllByRole('listitem');
    expect(rows[0].textContent).toContain('loan');
    expect(rows[1].textContent).toContain('schemes');
  });

  it('shows the rating for every submission', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    const rows = within(await list()).getAllByRole('listitem');
    expect(within(rows[0]).getByLabelText('5 out of 5')).toBeDefined();
    expect(within(rows[1]).getByLabelText('2 out of 5')).toBeDefined();
  });

  it('renders a full message rather than truncating it', async () => {
    const long = 'A'.repeat(900);
    stubFetch(() => ok(payload({ items: [{ ...payload().items[0], comment: long }] })));
    renderDashboard();

    expect(await screen.findByText(long)).toBeDefined();
  });

  it('says so plainly when a submission was rating-only', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    // The second item has comment: null.
    expect((await screen.findAllByText(COPY.noComment)).length).toBeGreaterThan(0);
  });

  it('renders a submitted timestamp', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    const rows = within(await list()).getAllByRole('listitem');
    expect(rows[0].textContent).toMatch(/2026|2025/);
  });

  it('never renders a user id', async () => {
    stubFetch(() => ok(payload()));
    const { container } = renderDashboard();

    await list();
    expect(container.innerHTML).not.toMatch(/user_id|userId/i);
  });
});

describe('empty state', () => {
  it('shows the empty state when there are no submissions', async () => {
    stubFetch(() =>
      ok(
        payload({
          items: [],
          stats: { total: 0, averageRating: null, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } },
          pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasPrevious: false, hasNext: false },
        })
      )
    );
    renderDashboard();

    expect(await screen.findByText(COPY.emptyTitle)).toBeDefined();
    expect(screen.getByText(COPY.emptyBody)).toBeDefined();
  });

  it('is distinct from the loading state', async () => {
    // If empty folded into loading, a working dashboard would look broken.
    stubFetch(() =>
      ok(
        payload({
          items: [],
          stats: { total: 0, averageRating: null, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } },
          pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasPrevious: false, hasNext: false },
        })
      )
    );
    renderDashboard();

    expect(await screen.findByText(COPY.emptyTitle)).toBeDefined();
    expect(screen.queryByText(COPY.loading)).toBeNull();
  });

  it('hides pagination controls when there is nothing to page through', async () => {
    stubFetch(() =>
      ok(
        payload({
          items: [],
          stats: { total: 0, averageRating: null, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } },
          pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasPrevious: false, hasNext: false },
        })
      )
    );
    renderDashboard();

    await screen.findByText(COPY.emptyTitle);
    expect(screen.queryByRole('button', { name: COPY.next })).toBeNull();
  });
});

describe('loading state', () => {
  it('announces that it is loading', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    stubFetch(() => ok(payload()));
    const fetchMock = (globalThis as { fetch: unknown }).fetch as (u: string) => Promise<Response>;
    (globalThis as { fetch: unknown }).fetch = async (url: string) => {
      await gate;
      return fetchMock(url);
    };

    renderDashboard();

    // The Spinner is itself a status region, so assert on the loading copy that
    // belongs to this component rather than counting status regions.
    expect(screen.getByText(COPY.loading)).toBeDefined();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);

    release!();
    await screen.findByText('The EMI breakdown helped a lot.');
    expect(screen.queryByText(COPY.loading)).toBeNull();
  });
});

describe('error state', () => {
  it('shows an error and a retry control when the read fails', async () => {
    stubFetch(() => ({ status: 500, body: { success: false, error: { message: 'Server error' } } }));
    renderDashboard();

    expect(await screen.findByText(COPY.errorTitle)).toBeDefined();
    expect(screen.getByRole('button', { name: COPY.retry })).toBeDefined();
  });

  it('surfaces the server message rather than a generic one', async () => {
    stubFetch(() => ({ status: 500, body: { success: false, error: { message: 'Feedback is unavailable.' } } }));
    renderDashboard();

    expect(await screen.findByText('Feedback is unavailable.')).toBeDefined();
  });

  it('reports a 403 as a permissions problem, not a failure to load', async () => {
    // A session that lapsed while the page was open is not the same problem as an
    // outage, and retrying into it would never succeed.
    stubFetch(() => ({ status: 403, body: { success: false, error: { message: 'Forbidden' } } }));
    renderDashboard();

    expect(await screen.findByText(COPY.notAdminTitle)).toBeDefined();
  });

  it('reports a 401 as needing a session', async () => {
    stubFetch(() => ({ status: 401, body: { success: false, error: { message: 'Unauthorized' } } }));
    renderDashboard();

    expect(await screen.findByText(COPY.signedOutTitle)).toBeDefined();
  });

  it('handles an unreachable network without crashing', async () => {
    (globalThis as { fetch: unknown }).fetch = async () => {
      throw new Error('network down');
    };
    renderDashboard();

    expect(await screen.findByText(COPY.errorTitle)).toBeDefined();
  });

  it('handles a non-JSON response', async () => {
    (globalThis as { fetch: unknown }).fetch = async () =>
      ({ ok: false, status: 502, json: async () => { throw new Error('bad json'); } }) as unknown as Response;
    renderDashboard();

    expect(await screen.findByText(COPY.errorTitle)).toBeDefined();
  });

  it('actually retries when the retry control is used', async () => {
    // A retry button that does not retry is worse than no retry button: the
    // administrator is left staring at an error that looks permanent.
    let attempt = 0;
    stubFetch(() => {
      attempt += 1;
      return attempt === 1
        ? { status: 500, body: { success: false, error: { message: 'Temporary failure' } } }
        : ok(payload());
    });

    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText(COPY.errorTitle);
    await user.click(screen.getByRole('button', { name: COPY.retry }));

    expect(await screen.findByText('The EMI breakdown helped a lot.')).toBeDefined();
    expect(attempt).toBe(2);
  });
});

describe('pagination', () => {
  it('shows controls only when there is more than one page', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    await screen.findByText('The EMI breakdown helped a lot.');
    expect(screen.getByRole('button', { name: COPY.next })).toBeDefined();
    expect(screen.getByRole('button', { name: COPY.previous })).toBeDefined();
  });

  it('hides controls on a single page', async () => {
    stubFetch(() => ok(payload({ pagination: { ...payload().pagination, totalPages: 1, hasNext: false } })));
    renderDashboard();

    await screen.findByText('The EMI breakdown helped a lot.');
    expect(screen.queryByRole('button', { name: COPY.next })).toBeNull();
  });

  it('disables previous on the first page', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    await screen.findByText('The EMI breakdown helped a lot.');
    const previous = screen.getByRole('button', { name: COPY.previous }) as HTMLButtonElement;
    expect(previous.disabled).toBe(true);
  });

  it('disables next on the last page', async () => {
    stubFetch(() =>
      ok(payload({ pagination: { ...payload().pagination, page: 3, totalPages: 3, hasPrevious: true, hasNext: false } }))
    );
    renderDashboard();

    await screen.findByText('The EMI breakdown helped a lot.');
    const next = screen.getByRole('button', { name: COPY.next }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it('shows the current position', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    await screen.findByText('The EMI breakdown helped a lot.');
    expect(screen.getByText('Page 1 of 3')).toBeDefined();
  });

  it('requests the next page when Next is used', async () => {
    const { urls } = stubFetch(() => ok(payload()));
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText('The EMI breakdown helped a lot.');
    await user.click(screen.getByRole('button', { name: COPY.next }));

    await waitFor(() => expect(urls.some((u) => u.includes('page=2'))).toBe(true));
  });

  it('sends the session cookie with every request', async () => {
    let seenCredentials: RequestCredentials | undefined;
    (globalThis as { fetch: unknown }).fetch = async (_url: string, init?: RequestInit) => {
      seenCredentials = init?.credentials;
      return { ok: true, status: 200, json: async () => ({ success: true, data: payload() }) } as Response;
    };
    renderDashboard();

    await screen.findByText('The EMI breakdown helped a lot.');
    // Without this the read would silently return 401 and look like "no access".
    expect(seenCredentials).toBe('same-origin');
  });
});

describe('accessibility', () => {
  it('has exactly one h1', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    await screen.findByText('The EMI breakdown helped a lot.');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('uses a semantic list for the submissions', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    await screen.findByText('The EMI breakdown helped a lot.');
    expect(screen.getAllByRole('list').length).toBeGreaterThan(0);
  });

  it('labels each rating for a screen reader, not just a colour or a star', async () => {
    stubFetch(() => ok(payload()));
    renderDashboard();

    expect(await screen.findByLabelText('5 out of 5')).toBeDefined();
    expect(screen.getByLabelText('2 out of 5')).toBeDefined();
  });

  it('renders pagination as buttons, not links', async () => {
    // A link would put the page in history and produce a URL that outlives the
    // session.
    stubFetch(() => ok(payload()));
    renderDashboard();

    await screen.findByText('The EMI breakdown helped a lot.');
    expect(screen.getByRole('button', { name: COPY.next }).tagName).toBe('BUTTON');
  });
});

describe('bilingual rendering', () => {
  it('renders Kannada copy and Kannada content together', async () => {
    stubFetch(() =>
      ok(
        payload({
          items: [
            { id: 'k1', module: 'learn', rating: 5, comment: 'ಇದು ತುಂಬಾ ಉಪಯೋಗವಾಗಿದೆ.', createdAt: '2026-03-01T09:00:00.000Z' },
          ],
        })
      )
    );
    localStorage.setItem('gramfinance_lang', 'kn');
    renderDashboard();

    expect(await screen.findByText('ಇದು ತುಂಬಾ ಉಪಯೋಗವಾಗಿದೆ.')).toBeDefined();
    expect(screen.getByText(adminFeedbackCopy.kn.totalSubmissions)).toBeDefined();
  });

  it('leaves no English UI chrome behind in Kannada mode', async () => {
    stubFetch(() => ok(payload()));
    localStorage.setItem('gramfinance_lang', 'kn');
    renderDashboard();

    await screen.findByText('The EMI breakdown helped a lot.');
    expect(screen.queryByText('Total submissions')).toBeNull();
    expect(screen.queryByText('Loading feedback...')).toBeNull();
  });
});

describe('AdminAccessDenied', () => {
  it('tells a signed-out visitor to sign in', () => {
    render(
      <LanguageProvider>
        <AdminAccessDenied signedIn={false} />
      </LanguageProvider>
    );

    expect(screen.getByText(COPY.signedOutTitle)).toBeDefined();
    expect(screen.getByText(COPY.notAuthorisedBody)).toBeDefined();
  });

  it('tells a signed-in non-admin they lack access', () => {
    render(
      <LanguageProvider>
        <AdminAccessDenied signedIn />
      </LanguageProvider>
    );

    // Not "sign in required": they already are. A wrong prompt sends a
    // demoted administrator in circles.
    expect(screen.getByText(COPY.notAdminTitle)).toBeDefined();
    expect(screen.queryByText(COPY.signedOutTitle)).toBeNull();
  });

  it('never reveals what the page contains', () => {
    render(
      <LanguageProvider>
        <AdminAccessDenied signedIn={false} />
      </LanguageProvider>
    );

    expect(document.body.textContent).not.toMatch(/rating|comment|submission|average/i);
  });

  it('offers a way out', () => {
    render(
      <LanguageProvider>
        <AdminAccessDenied signedIn={false} />
      </LanguageProvider>
    );

    expect(screen.getByRole('link')).toBeDefined();
  });
});