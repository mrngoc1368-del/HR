import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach, test, expect } from 'vitest';
import Approve from '../pages/Approve.jsx';

const json = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
const R = (o) => ({ id: 'r1', name: 'Nguyễn Thảo Linh', title: 'CV', team: 'Marketing', type: 'annual', from_date: '2026-11-19', to_date: '2026-11-20', half_day: false, days: 2, reason: 'Việc nhà', status: 'lead', ...o });
let queue, patch;
beforeEach(() => {
  queue = [R(), R({ id: 'r5', name: 'Phạm Gia Huy', days: 0.5, half_day: true })];
  patch = vi.fn(() => json(200, {}));
  global.fetch = vi.fn((url, o) => {
    if (url.includes('status=pending')) return json(200, { requests: queue });
    if (url.includes('status=all')) return json(200, { requests: [...queue, R({ id: 'r2', status: 'approved' })] });
    if (o?.method === 'PATCH') { const r = patch(url, JSON.parse(o.body)); queue = queue.filter((x) => !url.endsWith(x.id)); return r; }
    return json(404, {});
  });
});
const lead = { role: 'lead', team: 'Marketing' };

test('hiện hàng đợi và lịch sử', async () => {
  render(<Approve user={lead} />);
  expect(await screen.findByTestId('pending-count')).toHaveTextContent('2 đơn');
  expect(screen.getAllByText('Đã duyệt').length).toBeGreaterThan(0);
});

test('bấm Duyệt gọi PATCH approve, đơn rời hàng đợi, toast theo cấp', async () => {
  const onChanged = vi.fn();
  render(<Approve user={lead} onChanged={onChanged} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Duyệt đơn của Nguyễn Thảo Linh' }));
  expect(patch).toHaveBeenCalledWith('/api/leave-requests/r1', { action: 'approve' });
  expect(await screen.findByRole('status')).toHaveTextContent('chuyển Giám đốc');
  await waitFor(() => expect(screen.getByTestId('pending-count')).toHaveTextContent('1 đơn'));
  expect(onChanged).toHaveBeenCalled();
});

test('giám đốc duyệt → toast "Đã duyệt đơn"; từ chối → "Đã từ chối đơn"', async () => {
  render(<Approve user={{ role: 'director', team: 'Ban Giám đốc' }} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Từ chối đơn của Phạm Gia Huy' }));
  expect(patch).toHaveBeenCalledWith('/api/leave-requests/r5', { action: 'reject' });
  expect(await screen.findByRole('status')).toHaveTextContent('Đã từ chối đơn');
});

test('409 → báo đơn đã được người khác xử lý', async () => {
  patch.mockReturnValue(json(409, { error: 'wrong_state' }));
  render(<Approve user={lead} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Duyệt đơn của Nguyễn Thảo Linh' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('đã được xử lý');
});
