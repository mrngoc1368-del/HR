import { test, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { resetDb, pool } from './helpers.js';

const app = createApp();
after(() => pool.end());
beforeEach(resetDb);

async function as(email) {
  const r = await request(app).post('/api/auth/login').send({ email, password: 'demo1234' });
  const h = { Authorization: `Bearer ${r.body.accessToken}` };
  return { get: (p) => request(app).get(p).set(h).buffer(true).parse((res, cb) => { const c = []; res.on('data', (d) => c.push(d)); res.on('end', () => { res.text = Buffer.concat(c); cb(null, res.headers['content-type']?.includes('json') ? JSON.parse(Buffer.concat(c)) : Buffer.concat(c)); }); }) };
}
const EMP = 'linh.nguyen@ngoclinhn.vn', LEAD = 'quan.tran@ngoclinhn.vn', DIR = 'linh.ngo@ngoclinhn.vn';

test('cần đăng nhập', async () => {
  assert.equal((await request(app).get('/api/payslips')).status, 401);
  assert.equal((await request(app).get('/api/payroll?month=2026-10')).status, 401);
});

test('phiếu lương tháng 10 của e1 khớp công thức prototype', async () => {
  const u = await as(EMP);
  const r = await u.get('/api/payslips?month=2026-10');
  assert.equal(r.status, 200);
  const { payslip: p } = r.body;
  // base 16.5M + allow 1.5M + OT 1.2M = 19.2M; BH = 1.7325M → 1.733.. ; thuế = max(0, 18M − 1.7325M − 11M) × 8%
  assert.equal(p.gross, 19_200_000);
  const ins = Math.round(16_500_000 * 0.105);
  const tax = Math.round((16_500_000 + 1_500_000 - ins - 11_000_000) * 0.08);
  assert.equal(p.deductionsTotal, ins + tax);
  assert.equal(p.net, 19_200_000 - ins - tax);
  assert.deepEqual(r.body.months, ['2026-10', '2026-09', '2026-08']);
});

test('không chỉ định tháng → tháng mới nhất; tháng không có → 404; sai định dạng → 422', async () => {
  const u = await as(EMP);
  assert.equal((await u.get('/api/payslips')).body.payslip.month, '2026-10');
  assert.equal((await u.get('/api/payslips?month=2025-01')).status, 404);
  assert.equal((await u.get('/api/payslips?month=abc')).status, 422);
});

test('nhân viên không thể xem lương người khác qua query user_id', async () => {
  const u = await as(EMP);
  const r = await u.get('/api/payslips?month=2026-10&user_id=e0');
  assert.equal(r.body.payslip.gross, 19_200_000); // vẫn là của e1, không phải giám đốc
});

test('nghỉ không lương của e13 bị khấu trừ tháng 10', async () => {
  const u = await as('nam.e13@ngoclinhn.vn');
  const items = (await u.get('/api/payslips?month=2026-10')).body.payslip.deductions.map((i) => i.code);
  assert.ok(items.includes('unpaid'));
});

test('bảng lương công ty: nhân viên 403, quản lý thấy 18 dòng và tổng', async () => {
  assert.equal((await (await as(EMP)).get('/api/payroll?month=2026-10')).status, 403);
  for (const email of [LEAD, DIR]) {
    const r = await (await as(email)).get('/api/payroll?month=2026-10');
    assert.equal(r.body.rows.length, 18);
    assert.equal(r.body.total, r.body.rows.reduce((t, x) => t + x.net, 0));
    assert.ok(r.body.total > 0);
  }
  assert.equal((await (await as(DIR)).get('/api/payroll?month=bad')).status, 422);
});

test('PDF: chủ phiếu tải được; nhân viên khác bị 404; quản lý tải được', async () => {
  const id = (await (await as(EMP)).get('/api/payslips?month=2026-10')).body.payslip.id;
  const own = await (await as(EMP)).get(`/api/payslips/${id}/pdf`);
  assert.equal(own.status, 200);
  assert.match(own.headers['content-type'], /application\/pdf/);
  assert.equal(own.body.subarray(0, 5).toString(), '%PDF-');
  assert.equal((await (await as('thinh.e11@ngoclinhn.vn')).get(`/api/payslips/${id}/pdf`)).status, 404);
  assert.equal((await (await as(LEAD)).get(`/api/payslips/${id}/pdf`)).status, 200);
  assert.equal((await (await as(EMP)).get('/api/payslips/abc/pdf')).status, 404);
});

test('dashboard hiện thực nhận của phiếu mới nhất', async () => {
  const u = await as(EMP);
  const d = await u.get('/api/dashboard');
  const p = (await u.get('/api/payslips?month=2026-10')).body.payslip;
  assert.equal(d.body.latestPayslip.net, p.net);
});
