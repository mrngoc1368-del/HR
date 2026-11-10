import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { resetDb, pool } from './helpers.js';

const app = createApp();
before(resetDb);
after(() => pool.end());

const login = (email, password = 'demo1234') => request(app).post('/api/auth/login').send({ email, password });

test('đăng nhập hợp lệ trả accessToken, role và cookie refresh httpOnly', async () => {
  const r = await login('linh.nguyen@ngoclinhn.vn');
  assert.equal(r.status, 200);
  assert.equal(r.body.role, 'employee');
  assert.ok(r.body.accessToken);
  assert.equal(r.body.user.password_hash, undefined);
  const cookie = r.headers['set-cookie'].join(';');
  assert.match(cookie, /refresh_token=/);
  assert.match(cookie, /HttpOnly/i);
  const { rows } = await pool.query('SELECT count(*)::int n FROM sessions');
  assert.equal(rows[0].n >= 1, true);
});

test('email không phân biệt hoa thường và khoảng trắng', async () => {
  assert.equal((await login('  QUAN.TRAN@ngoclinhn.vn ')).status, 200);
});

test('sai mật khẩu hoặc sai email đều 401 cùng một thông báo', async () => {
  const a = await login('linh.nguyen@ngoclinhn.vn', 'sai');
  const b = await login('khong.co@ngoclinhn.vn');
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.deepEqual(a.body, b.body);
});

test('thiếu trường → 400', async () => {
  assert.equal((await request(app).post('/api/auth/login').send({ email: 'x' })).status, 400);
  assert.equal((await request(app).post('/api/auth/login').send({})).status, 400);
});

test('3 vai trò nhận đúng role', async () => {
  assert.equal((await login('quan.tran@ngoclinhn.vn')).body.role, 'lead');
  assert.equal((await login('linh.ngo@ngoclinhn.vn')).body.role, 'director');
});

test('dashboard cần token; token sai bị 401', async () => {
  assert.equal((await request(app).get('/api/dashboard')).status, 401);
  assert.equal((await request(app).get('/api/dashboard').set('Authorization', 'Bearer abc')).status, 401);
});

test('dashboard trả quỹ phép đúng của người đăng nhập', async () => {
  const { body } = await login('linh.nguyen@ngoclinhn.vn');
  const r = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${body.accessToken}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.user.id, 'e1');
  assert.equal(r.body.balance.annualUsed, 4);
  assert.equal(r.body.balance.annualLeft, 8);
  assert.equal(r.body.pendingApprovals, 0);
});

test('refresh dùng cookie, logout thu hồi phiên', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: 'linh.nguyen@ngoclinhn.vn', password: 'demo1234' });
  assert.equal((await agent.post('/api/auth/refresh')).status, 200);
  assert.equal((await agent.post('/api/auth/logout')).status, 204);
  assert.equal((await agent.post('/api/auth/refresh')).status, 401);
});

test('refresh không có cookie → 401', async () => {
  assert.equal((await request(app).post('/api/auth/refresh')).status, 401);
});
