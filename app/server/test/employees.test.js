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
  return { get: (p) => request(app).get(p).set(h) };
}
const EMP = 'linh.nguyen@ngoclinhn.vn', LEAD = 'quan.tran@ngoclinhn.vn';

test('nhân viên không xem được danh sách (403) và hồ sơ người khác (404)', async () => {
  const u = await as(EMP);
  assert.equal((await u.get('/api/employees')).status, 403);
  assert.equal((await u.get('/api/employees/e0')).status, 404);
  assert.equal((await u.get('/api/employees/e1')).status, 200);
});

test('/me trả hồ sơ + quản lý trực tiếp + phép còn', async () => {
  const e = (await (await as(EMP)).get('/api/employees/me')).body.employee;
  assert.equal(e.id, 'e1');
  assert.equal(e.manager, 'Trần Minh Quân');
  assert.equal(e.annual_left, 8);
  assert.equal(e.password_hash, undefined);
  assert.equal((await (await as(LEAD)).get('/api/employees/me')).body.employee.manager, 'Ngô Ngọc Linh');
});

test('quản lý: 18 người; lọc nhóm; tìm không phân biệt hoa thường; có cờ đang nghỉ', async () => {
  const m = await as(LEAD);
  const all = (await m.get('/api/employees')).body;
  assert.equal(all.employees.length, 18);
  assert.equal(all.teams.length, 5);
  assert.equal((await m.get('/api/employees?team=Kế toán')).body.employees.length, 3);
  assert.deepEqual((await m.get('/api/employees?q=DESIGNER')).body.employees.map((x) => x.id), ['e4']);
  const onLeave = all.employees.filter((x) => x.on_leave).map((x) => x.id).sort();
  assert.ok(onLeave.includes('e11') && onLeave.includes('e8') && !onLeave.includes('e1'));
});

test('quản lý xem hồ sơ người khác; id không tồn tại → 404', async () => {
  const m = await as(LEAD);
  assert.equal((await m.get('/api/employees/e4')).body.employee.title, 'Designer');
  assert.equal((await m.get('/api/employees/zzz')).status, 404);
});
