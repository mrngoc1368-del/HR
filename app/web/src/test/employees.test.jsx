import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach, test, expect } from 'vitest';
import Employees from '../pages/Employees.jsx';

const json = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
const E = (id, name, o = {}) => ({ id, name, title: 'T', team: 'Marketing', annual_left: 8, on_leave: false, ...o });
const emp = { id: 'e4', name: 'Phạm Gia Huy', title: 'Designer', team: 'Marketing', email: 'huy@x.vn', phone: '09', start_month: '11/2022', manager: 'Q', base_salary: 15e6, allowance: 1e6, annual_left: 6, annual_total: 12 };
let urls;
beforeEach(() => {
  urls = [];
  global.fetch = vi.fn((url) => {
    urls.push(url);
    if (url.startsWith('/api/employees?')) return json(200, { teams: ['Marketing', 'Kế toán'], employees: [E('e4', 'Phạm Gia Huy', { on_leave: true }), E('e3', 'Lê Hoàng Anh')] });
    if (url === '/api/employees/e4') return json(200, { employee: emp });
    return json(404, {});
  });
});

test('hiện danh sách, cờ đang nghỉ, lọc nhóm gọi API với team', async () => {
  render(<Employees />);
  expect(await screen.findByText('Phạm Gia Huy')).toBeInTheDocument();
  expect(screen.getByText('Đang nghỉ')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Kế toán' }));
  await waitFor(() => expect(urls.some((u) => u.includes('team=K%E1%BA%BF%20to%C3%A1n'))).toBe(true));
});

test('gõ tìm kiếm gọi API với q; mở hồ sơ rồi quay lại', async () => {
  render(<Employees />);
  await userEvent.type(await screen.findByLabelText('Tìm nhân viên'), 'des');
  await waitFor(() => expect(urls.some((u) => u.includes('q=des'))).toBe(true));
  await userEvent.click(await screen.findByRole('button', { name: /Phạm Gia Huy/ }));
  expect(await screen.findByRole('heading', { name: 'Phạm Gia Huy' })).toBeInTheDocument();
  expect(screen.getByTestId('annual-left')).toHaveTextContent('6 / 12');
  await userEvent.click(screen.getByRole('button', { name: /Danh sách nhân viên/ }));
  expect(await screen.findByLabelText('Tìm nhân viên')).toBeInTheDocument();
});
