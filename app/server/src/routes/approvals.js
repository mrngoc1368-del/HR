import { Router } from 'express';
import { pool, query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const approvalsRouter = Router();
approvalsRouter.use(requireAuth, requireRole('lead', 'director'));

const COLS = `r.id, r.user_id, u.name, u.title, u.team, r.type, r.from_date::text, r.to_date::text,
  r.half_day, r.days::float, r.reason, r.status, r.created_at::text`;

// Hàng đợi: trưởng nhóm thấy đơn "chờ trưởng nhóm" của nhóm mình; giám đốc thấy đơn "chờ giám đốc".
// status=all: toàn bộ lịch sử (trưởng nhóm: trong nhóm; giám đốc: toàn công ty).
approvalsRouter.get('/', async (req, res) => {
  const all = req.query.status === 'all';
  const dir = req.user.role === 'director';
  const where = all
    ? (dir ? 'TRUE' : 'u.team = $1')
    : (dir ? `r.status = 'director'` : `r.status = 'lead' AND u.team = $1`);
  const { rows } = await query(
    `SELECT ${COLS} FROM leave_requests r JOIN users u ON u.id=r.user_id WHERE ${where} ORDER BY r.created_at DESC, r.id DESC`,
    !dir ? [req.user.team] : []);
  res.json({ requests: rows, level: dir ? 2 : 1 });
});

const BALANCE_COL = { annual: 'annual_used', sick: 'sick_used' };

export async function decide(req, res) {
  const { action } = req.body || {};
  if (!['approve', 'reject'].includes(action)) return res.status(422).json({ error: 'invalid_action' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = (await client.query(
      `SELECT r.*, r.from_date::text AS from_txt, u.team, u.name FROM leave_requests r JOIN users u ON u.id=r.user_id WHERE r.id=$1 FOR UPDATE OF r`, [req.params.id])).rows[0];
    if (!r) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'not_found' }); }
    const dir = req.user.role === 'director';
    // Kiểm tra quyền: đúng cấp và (với trưởng nhóm) đúng nhóm, không tự duyệt đơn của mình
    const level = dir ? 'director' : 'lead';
    if (r.user_id === req.user.id || (!dir && r.team !== req.user.team)) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'forbidden' }); }
    if (r.status !== level) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'wrong_state', message: 'Đơn đã được xử lý hoặc chưa tới cấp của bạn' }); }

    const next = action === 'reject' ? 'rejected' : dir ? 'approved' : 'director';
    await client.query('UPDATE leave_requests SET status=$2 WHERE id=$1', [r.id, next]);
    if (next === 'approved' && BALANCE_COL[r.type]) {
      const col = BALANCE_COL[r.type];
      await client.query(`UPDATE leave_balances SET ${col} = ${col} + $2 WHERE user_id=$1 AND year=$3`, [r.user_id, r.days, +r.from_txt.slice(0, 4)]);
    }
    await client.query('INSERT INTO approval_logs (request_id, actor_id, action) VALUES ($1,$2,$3)', [r.id, req.user.id, `${level}:${action}`]);
    const msg = next === 'approved' ? 'Đơn nghỉ của bạn đã được duyệt' : next === 'rejected' ? 'Đơn nghỉ của bạn đã bị từ chối' : 'Đơn nghỉ của bạn đã được trưởng nhóm duyệt, chờ giám đốc';
    await client.query('INSERT INTO notifications (user_id,message,request_id) VALUES ($1,$2,$3)', [r.user_id, msg, r.id]);
    if (next === 'director') {
      for (const d of (await client.query(`SELECT id FROM users WHERE role='director'`)).rows) {
        await client.query('INSERT INTO notifications (user_id,message,request_id) VALUES ($1,$2,$3)', [d.id, `${r.name} có đơn nghỉ chờ bạn duyệt`, r.id]);
      }
    }
    await client.query('COMMIT');
    const row = (await query(`SELECT ${COLS} FROM leave_requests r JOIN users u ON u.id=r.user_id WHERE r.id=$1`, [r.id])).rows[0];
    res.json({ request: row });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
