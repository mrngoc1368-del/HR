import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach, test, expect } from 'vitest';
import App, { navFor } from '../App.jsx';

const json = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
const dash = { user: {}, balance: { annualTotal: 12, annualLeft: 8, sickTotal: 5, sickLeft: 5 }, recentRequests: [], latestPayslip: null, pendingApprovals: 2 };
const cal = { week: { start: '2026-11-09', end: '2026-11-13' }, away: [], upcoming: [] };
const sessionOf = (role) => ({ accessToken: 't', role, user: { id: 'e1', name: 'Nguyễn Thảo Linh', title: 'Chuyên viên', team: 'Marketing', role } });

beforeEach(() => { global.fetch = vi.fn(); });

function route(map) {
  global.fetch.mockImplementation((url) => map[url] ? map[url]() : json(404, {}));
}

test('menu nhân viên không có Duyệt đơn, quản lý có', () => {
  expect(navFor('employee').map((n) => n[1])).not.toContain('Duyệt đơn');
  expect(navFor('lead').map((n) => n[1])).toContain('Duyệt đơn');
});

test('form rỗng báo lỗi và không gọi API', async () => {
  route({ '/api/auth/refresh': () => json(401, {}) });
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'Đăng nhập' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập');
  expect(global.fetch.mock.calls.some(([u]) => u === '/api/auth/login')).toBe(false);
});

test('sai mật khẩu hiện “Sai email hoặc mật khẩu”', async () => {
  route({ '/api/auth/refresh': () => json(401, {}), '/api/auth/login': () => json(401, { error: 'invalid_credentials' }) });
  render(<App />);
  await userEvent.type(await screen.findByLabelText('Email công ty'), 'a@b.vn');
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'x');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sai email hoặc mật khẩu');
});

test('đăng nhập thành công hiện Dashboard, rồi đăng xuất về form', async () => {
  route({ '/api/auth/refresh': () => json(401, {}), '/api/auth/login': () => json(200, sessionOf('employee')),
    '/api/dashboard': () => json(200, dash), '/api/leave-requests/calendar': () => json(200, cal), '/api/auth/logout': () => json(204, null) });
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: /Nguyễn Thảo Linh/ })); // nút demo điền sẵn
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByTestId('annual-left')).toHaveTextContent('8');
  expect(screen.queryByTestId('pending')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument());
});

test('quản lý thấy số đơn chờ duyệt', async () => {
  route({ '/api/auth/refresh': () => json(200, sessionOf('lead')), '/api/dashboard': () => json(200, dash), '/api/leave-requests/calendar': () => json(200, cal) });
  render(<App />);
  expect(await screen.findByTestId('pending')).toHaveTextContent('2 đơn');
});

test('mobile (<760px): menu chuyển xuống thanh dưới; desktop: sidebar', async () => {
  route({ '/api/auth/refresh': () => json(200, sessionOf('employee')), '/api/dashboard': () => json(200, dash), '/api/leave-requests/calendar': () => json(200, cal) });
  window.innerWidth = 500;
  const { unmount } = render(<App />);
  await screen.findByTestId('annual-left');
  expect(screen.getAllByRole('navigation', { name: 'Menu chính' })).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Đăng xuất' }).closest('nav')).toBeNull(); // nút đăng xuất ở thanh trên
  unmount();
  window.innerWidth = 1200;
});

test('chuyển phương án dashboard B hiện bảng "Đơn của tôi"', async () => {
  route({ '/api/auth/refresh': () => json(200, sessionOf('employee')), '/api/dashboard': () => json(200, dash), '/api/leave-requests/calendar': () => json(200, cal) });
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'B · Sổ cái' }));
  expect(screen.getByText('Đơn của tôi')).toBeInTheDocument();
  expect(screen.getByTestId('annual-left')).toHaveTextContent('8');
});
