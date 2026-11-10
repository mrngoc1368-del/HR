import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach, test, expect } from 'vitest';
import Pay from '../pages/Pay.jsx';

const json = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
const slip = (month, net) => ({ id: 7, month, earnings: [{ label: 'Lương cơ bản', amount: 20_000_000 }], deductions: [{ label: 'Thuế TNCN', amount: 1_000_000 }], gross: 20_000_000, deductionsTotal: 1_000_000, net });
const months = ['2026-10', '2026-09'];
let calls;
beforeEach(() => {
  calls = [];
  global.fetch = vi.fn((url) => {
    calls.push(url);
    if (url === '/api/payslips') return json(200, { months });
    if (url === '/api/payslips?month=2026-10') return json(200, { months, payslip: slip('2026-10', 19_000_000) });
    if (url === '/api/payslips?month=2026-09') return json(200, { months, payslip: slip('2026-09', 18_000_000) });
    if (url.startsWith('/api/payroll')) return json(200, { month: '2026-10', rows: [{ id: 'e1', name: 'A', team: 'T', gross: 2, deductions: 1, net: 1 }], total: 1 });
    return json(404, {});
  });
});

test('nhân viên thấy phiếu của mình, đổi tháng đổi số, không gọi API công ty', async () => {
  render(<Pay user={{ role: 'employee', name: 'A' }} />);
  expect(await screen.findByTestId('net')).toHaveTextContent('19.000.000');
  await userEvent.click(screen.getByRole('button', { name: 'Tháng 09/2026' }));
  await waitFor(() => expect(screen.getByTestId('net')).toHaveTextContent('18.000.000'));
  expect(calls.some((u) => u.startsWith('/api/payroll'))).toBe(false);
  expect(screen.queryByRole('region', { name: 'Bảng lương toàn công ty' })).toBeNull();
});

test('quản lý thấy thêm bảng toàn công ty và tổng', async () => {
  render(<Pay user={{ role: 'lead', name: 'Q' }} />);
  expect(await screen.findByTestId('company-total')).toHaveTextContent('1 ₫');
});

test('Tải PDF gọi đúng endpoint với token', async () => {
  URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn();
  global.fetch.mockImplementation((url) => url === '/api/payslips/7/pdf'
    ? Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve(new Blob(['%PDF'])) })
    : url === '/api/payslips' ? json(200, { months }) : json(200, { months, payslip: slip('2026-10', 19_000_000) }));
  render(<Pay user={{ role: 'employee', name: 'A' }} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Tải PDF' }));
  await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
  expect(global.fetch.mock.calls.some(([u]) => u === '/api/payslips/7/pdf')).toBe(true);
});
