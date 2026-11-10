import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach, test, expect } from 'vitest';
import Leave from '../pages/Leave.jsx';
import { workingDays } from '../dates.js';

const json = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
const bal = { annualTotal: 12, annualLeft: 8, sickTotal: 5, sickLeft: 5 };
const req = (o) => ({ id: 'r1', type: 'annual', from_date: '2026-11-19', to_date: '2026-11-20', half_day: false, days: 2, reason: 'x', status: 'lead', ...o });
let post;
beforeEach(() => {
  post = vi.fn();
  global.fetch = vi.fn((url, opts) => {
    if (url === '/api/leave-requests/mine') return json(200, { requests: [req()] });
    if (url === '/api/dashboard') return json(200, { balance: bal });
    if (url === '/api/leave-requests' && opts?.method === 'POST') return post(JSON.parse(opts.body));
    return json(404, {});
  });
});

test('workingDays phía client khớp quy tắc server', () => {
  expect(workingDays('2026-11-13', '2026-11-16', false)).toBe(2);
  expect(workingDays('2026-11-13', '2026-11-13', true)).toBe(0.5);
});

test('hiện đơn của tôi và tính ngày khi chọn khoảng', async () => {
  render(<Leave today="2026-11-23" />);
  expect(await screen.findByText('Chờ trưởng nhóm')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Tạo đơn nghỉ' }));
  expect(screen.getByTestId('days')).toHaveTextContent('1 ngày');
  await userEvent.click(screen.getByLabelText('Nghỉ nửa ngày'));
  expect(screen.getByTestId('days')).toHaveTextContent('0.5 ngày');
});

test('cảnh báo vượt quỹ: còn 8 − 2 chờ = 6, chọn 7 ngày', async () => {
  render(<Leave today="2026-11-23" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Tạo đơn nghỉ' }));
  const to = screen.getByLabelText('Đến ngày');
  await userEvent.clear(to); await userEvent.type(to, '2026-12-01'); // 23/11 → 1/12 = 7 ngày làm việc
  expect(screen.getByRole('alert')).toHaveTextContent('Vượt quỹ phép');
});

test('gửi thành công: đóng form, hiện toast', async () => {
  post.mockReturnValue(json(201, { request: req({ id: 'r9' }) }));
  render(<Leave today="2026-11-23" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Tạo đơn nghỉ' }));
  await userEvent.click(screen.getByRole('button', { name: 'Gửi đơn' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Đã gửi đơn');
  expect(post).toHaveBeenCalledWith({ type: 'annual', from: '2026-11-23', to: '2026-11-23', half: false, reason: '' });
  expect(screen.queryByRole('form', { name: 'Tạo đơn nghỉ' })).toBeNull();
});

test('server trả 422 → hiện lý do trên form, form vẫn mở', async () => {
  post.mockReturnValue(json(422, { error: 'overlap', message: 'Trùng với đơn nghỉ đã có trong khoảng ngày này' }));
  render(<Leave today="2026-11-23" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Tạo đơn nghỉ' }));
  await userEvent.click(screen.getByRole('button', { name: 'Gửi đơn' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Trùng với đơn'));
  expect(screen.getByRole('form', { name: 'Tạo đơn nghỉ' })).toBeInTheDocument();
});
