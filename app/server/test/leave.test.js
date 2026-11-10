import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { resetDb, pool } from './helpers.js';
import { workingDays, weekOf } from '../src/lib/dates.js';

const app = createApp();
before(() => {});
after(() => pool.end());
beforeEach(resetDb);

async function as(email) {
  const r = await request(app).post('/api/auth/login').send({ email, password: 'demo1234' });
  const h = { Authorization: `Bearer ${r.body.accessToken}` };
  return {
    post: (b) => request(app).post('/api/leave-requests').set(h).send(b),
    get: (p) => request(app).get('/api/leave-requests' + p).set(h),
  };
}
const EMPLOYEE = 'linh.nguyen@ngoclinhn.vn'; // e1: đã dùng 4 ngày phép, đơn r1 chờ 2 ngày → còn 6; nghỉ 14/10, 3–4/9, 19–20/11
const LEAD = 'quan.tran@ngoclinhn.vn';
const DIRECTOR = 'linh.ngo@ngoclinhn.vn';

test('workingDays bỏ cuối tuần, nửa ngày = 0.5', () => {
  assert.equal(workingDays('2026-11-13', '2026-11-16', false), 2); // T6 → T2
  assert.equal(workingDays('2026-11-14', '2026-11-15', false), 0); // T7–CN
  assert.equal(workingDays('2026-11-13', '2026-11-13', true), 0.5);
  assert.deepEqual(weekOf('2026-11-10'), { start: '2026-11-09', end: '2026-11-13' });
});

test('nhân viên gửi đơn hợp lệ → 201, trạng thái chờ trưởng nhóm, thông báo tới trưởng nhóm', async () => {
  const u = await as(EMPLOYEE);
  const r = await u.post({ type: 'annual', from: '2026-11-23', to: '2026-11-24', reason: 'Việc nhà' });
  assert.equal(r.status, 201);
  assert.equal(r.body.request.status, 'lead');
  assert.equal(r.body.request.days, 2);
  const n = await pool.query(`SELECT user_id FROM notifications WHERE request_id=$1`, [r.body.request.id]);
  assert.deepEqual(n.rows.map((x) => x.user_id), ['e2']); // trưởng nhóm Marketing
});

test('trưởng nhóm gửi → chờ giám đốc; giám đốc gửi → duyệt luôn và trừ phép', async () => {
  assert.equal((await (await as(LEAD)).post({ type: 'annual', from: '2026-12-01', to: '2026-12-01' })).body.request.status, 'director');
  const d = await as(DIRECTOR);
  const r = await d.post({ type: 'annual', from: '2026-12-01', to: '2026-12-02' });
  assert.equal(r.body.request.status, 'approved');
  const b = await pool.query(`SELECT annual_used::float u FROM leave_balances WHERE user_id='e0'`);
  assert.equal(b.rows[0].u, 5); // 3 + 2
});

test('trùng ngày với đơn đang có → 422 overlap; đơn bị từ chối thì không tính', async () => {
  const u = await as(EMPLOYEE);
  const r = await u.post({ type: 'sick', from: '2026-11-20', to: '2026-11-23' }); // chạm r1 19–20/11
  assert.equal(r.status, 422);
  assert.equal(r.body.error, 'overlap');
  await pool.query(`UPDATE leave_requests SET status='rejected' WHERE id='r1'`);
  assert.equal((await u.post({ type: 'sick', from: '2026-11-20', to: '2026-11-20' })).status, 201);
});

test('vượt quỹ phép năm → 422; không tính khi nghỉ không lương', async () => {
  const u = await as(EMPLOYEE); // còn 6
  const bad = await u.post({ type: 'annual', from: '2026-12-01', to: '2026-12-09' }); // 7 ngày
  assert.equal(bad.status, 422);
  assert.equal(bad.body.error, 'insufficient_balance');
  assert.equal((await u.post({ type: 'annual', from: '2026-12-01', to: '2026-12-08' })).status, 201); // 6 ngày vừa đủ
  assert.equal((await u.post({ type: 'unpaid', from: '2027-01-04', to: '2027-01-29' })).status, 201);
});

test('đơn đang chờ cũng chiếm quỹ: gửi liên tiếp không vượt tổng', async () => {
  const u = await as(EMPLOYEE);
  assert.equal((await u.post({ type: 'annual', from: '2026-12-01', to: '2026-12-04' })).status, 201); // 4
  assert.equal((await u.post({ type: 'annual', from: '2026-12-07', to: '2026-12-09' })).status, 422); // 3 > 2 còn lại
});

test('dữ liệu sai → 422; nửa ngày bỏ qua ngày kết thúc; chỉ cuối tuần → từ chối', async () => {
  const u = await as(EMPLOYEE);
  assert.equal((await u.post({ type: 'xyz', from: '2026-12-01', to: '2026-12-01' })).status, 422);
  assert.equal((await u.post({ type: 'sick', from: '2026-12-05', to: '2026-12-01' })).status, 422);
  assert.equal((await u.post({ type: 'sick', from: 'abc', to: 'abc' })).status, 422);
  assert.equal((await u.post({ type: 'sick', from: '2026-12-05', to: '2026-12-06' })).body.error, 'no_working_days');
  const h = await u.post({ type: 'sick', from: '2026-12-01', half: true });
  assert.equal(h.body.request.days, 0.5);
});

test('chưa đăng nhập → 401; /mine chỉ trả đơn của mình; /calendar trả tuần 9–13/11', async () => {
  assert.equal((await request(app).post('/api/leave-requests').send({})).status, 401);
  const u = await as(EMPLOYEE);
  const mine = await u.get('/mine');
  assert.equal(mine.body.requests.length, 3);
  assert.ok(mine.body.requests.every((x) => x.user_id === 'e1'));
  const cal = await u.get('/calendar');
  assert.deepEqual(cal.body.week, { start: '2026-11-09', end: '2026-11-13' });
  const away = cal.body.away.map((x) => x.id);
  assert.ok(away.includes('r4') && away.includes('r7') && !away.includes('r1'));
  assert.ok(cal.body.upcoming.map((x) => x.id).includes('r1'));
});
