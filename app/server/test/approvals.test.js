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
  return {
    queue: (q = '') => request(app).get('/api/approvals' + q).set(h),
    act: (id, action) => request(app).patch(`/api/leave-requests/${id}`).set(h).send({ action }),
    post: (b) => request(app).post('/api/leave-requests').set(h).send(b),
  };
}
const EMP = 'linh.nguyen@ngoclinhn.vn', LEAD_MKT = 'quan.tran@ngoclinhn.vn', LEAD_SALES = 'trang.e5@ngoclinhn.vn', DIR = 'linh.ngo@ngoclinhn.vn';
const status = async (id) => (await pool.query('SELECT status FROM leave_requests WHERE id=$1', [id])).rows[0].status;
const used = async (u, c = 'annual_used') => (await pool.query(`SELECT ${c}::float v FROM leave_balances WHERE user_id=$1`, [u])).rows[0].v;

test('nhân viên không vào được hàng đợi hay duyệt → 403', async () => {
  const e = await as(EMP);
  assert.equal((await e.queue()).status, 403);
  assert.equal((await e.act('r4', 'approve')).status, 403);
});

test('hàng đợi trưởng nhóm: chỉ đơn "chờ trưởng nhóm" của nhóm mình', async () => {
  const l = await as(LEAD_MKT);
  const ids = (await l.queue()).body.requests.map((r) => r.id).sort();
  assert.deepEqual(ids, ['r1', 'r5']); // Marketing: Thảo Linh, Gia Huy (r4 đã lên giám đốc)
  const s = await as(LEAD_SALES);
  assert.deepEqual((await s.queue()).body.requests.map((r) => r.id), []); // r6 đã ở cấp giám đốc
});

test('hàng đợi giám đốc: đơn chờ giám đốc toàn công ty; status=all trả lịch sử', async () => {
  const d = await as(DIR);
  assert.deepEqual((await d.queue()).body.requests.map((r) => r.id).sort(), ['r4', 'r6']);
  assert.equal((await d.queue('?status=all')).body.requests.length, 10);
  const l = await as(LEAD_MKT);
  assert.ok((await l.queue('?status=all')).body.requests.every((r) => r.team === 'Marketing'));
});

test('2 cấp: trưởng nhóm duyệt → chờ giám đốc (chưa trừ phép) → giám đốc duyệt → trừ phép', async () => {
  const before = await used('e1');
  const l = await as(LEAD_MKT);
  assert.equal((await l.act('r1', 'approve')).body.request.status, 'director');
  assert.equal(await used('e1'), before);
  assert.equal((await pool.query(`SELECT 1 FROM notifications WHERE request_id='r1' AND user_id='e0'`)).rowCount, 1);
  const d = await as(DIR);
  assert.equal((await d.act('r1', 'approve')).body.request.status, 'approved');
  assert.equal(await used('e1'), before + 2);
  const logs = await pool.query(`SELECT action FROM approval_logs WHERE request_id='r1' ORDER BY id`);
  assert.deepEqual(logs.rows.map((x) => x.action), ['lead:approve', 'director:approve']);
});

test('từ chối ở bất kỳ cấp → rejected, không trừ phép, báo người gửi', async () => {
  const l = await as(LEAD_MKT);
  assert.equal((await l.act('r5', 'reject')).body.request.status, 'rejected');
  const b = await used('e4');
  const d = await as(DIR);
  assert.equal((await d.act('r4', 'reject')).body.request.status, 'rejected');
  assert.equal(await used('e4'), b);
  assert.equal((await pool.query(`SELECT 1 FROM notifications WHERE request_id='r4' AND user_id='e3'`)).rowCount, 1);
});

test('duyệt nghỉ không lương không trừ quỹ phép năm', async () => {
  const d = await as(DIR);
  await d.act('r6', 'approve');
  assert.equal(await status('r6'), 'approved');
  assert.equal(await used('e6'), 7);
});

test('sai cấp / sai nhóm / đã xử lý → lỗi, trạng thái không đổi', async () => {
  const l = await as(LEAD_MKT), s = await as(LEAD_SALES), d = await as(DIR);
  assert.equal((await s.act('r1', 'approve')).status, 403); // trưởng nhóm nhóm khác
  assert.equal((await l.act('r4', 'approve')).status, 409); // r4 đã ở cấp giám đốc
  assert.equal((await d.act('r1', 'approve')).status, 409); // r1 chưa tới giám đốc
  assert.equal(await status('r1'), 'lead');
  await l.act('r1', 'approve');
  assert.equal((await l.act('r1', 'approve')).status, 409); // duyệt lần 2
  assert.equal((await l.act('nope', 'approve')).status, 404);
  assert.equal((await l.act('r5', 'maybe')).status, 422);
});

test('không tự duyệt đơn của chính mình (trưởng nhóm gửi → chỉ giám đốc duyệt)', async () => {
  const l = await as(LEAD_MKT);
  const r = await l.post({ type: 'annual', from: '2026-12-01', to: '2026-12-01' });
  assert.equal((await l.act(r.body.request.id, 'approve')).status, 403);
  const d = await as(DIR);
  assert.equal((await d.act(r.body.request.id, 'approve')).body.request.status, 'approved');
});

test('hai lần duyệt đồng thời chỉ một lần thắng, phép chỉ bị trừ một lần', async () => {
  await pool.query(`UPDATE leave_requests SET status='director' WHERE id='r1'`);
  const d = await as(DIR);
  const res = await Promise.all([d.act('r1', 'approve'), d.act('r1', 'approve')]);
  assert.deepEqual(res.map((r) => r.status).sort(), [200, 409]);
  assert.equal(await used('e1'), 6);
});
