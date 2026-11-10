import { Router } from 'express';
import { pool, query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { decide } from './approvals.js';
import { today, isDate, workingDays, weekOf, addDays } from '../lib/dates.js';

export const leaveRouter = Router();
leaveRouter.use(requireAuth);

const TYPES = ['annual', 'sick', 'unpaid'];
const COLS = `r.id, r.user_id, u.name, u.title, u.team, r.type, r.from_date::text, r.to_date::text,
  r.half_day, r.days::float, r.reason, r.status, r.created_at::text`;

// Cấp duyệt đầu tiên phụ thuộc người gửi: nhân viên → trưởng nhóm, trưởng nhóm → giám đốc, giám đốc tự duyệt.
export const firstStatus = (role) => (role === 'employee' ? 'lead' : role === 'lead' ? 'director' : 'approved');

export function validate(body) {
  const { type, from, to, half, reason } = body || {};
  if (!TYPES.includes(type)) return { error: 'invalid_type' };
  if (!isDate(from) || (!half && !isDate(to))) return { error: 'invalid_date' };
  const end = half ? from : to;
  if (end < from) return { error: 'invalid_range', message: 'Ngày kết thúc phải sau ngày bắt đầu' };
  const days = workingDays(from, end, !!half);
  if (days <= 0) return { error: 'no_working_days', message: 'Khoảng ngày chọn không có ngày làm việc' };
  return { value: { type, from, to: end, half: !!half, reason: String(reason || '').trim().slice(0, 500), days } };
}

/** Phép năm/nghỉ ốm còn lại, đã trừ các đơn đang chờ duyệt để không "đặt chồng" quỹ. */
export async function remaining(client, userId, type, year) {
  if (type === 'unpaid') return Infinity;
  const col = type === 'annual' ? ['annual_total', 'annual_used'] : ['sick_total', 'sick_used'];
  const b = (await client.query(`SELECT ${col[0]} t, ${col[1]} u FROM leave_balances WHERE user_id=$1 AND year=$2`, [userId, year])).rows[0];
  if (!b) return 0;
  const pend = (await client.query(
    `SELECT COALESCE(SUM(days),0)::float s FROM leave_requests WHERE user_id=$1 AND type=$2 AND status IN ('lead','director')`,
    [userId, type])).rows[0].s;
  return +b.t - +b.u - pend;
}

leaveRouter.post('/', async (req, res) => {
  const v = validate(req.body);
  if (v.error) return res.status(422).json(v);
  const r = v.value;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT 1 FROM users WHERE id=$1 FOR UPDATE', [req.user.id]); // tuần tự hoá đơn của cùng một người
    const dup = await client.query(
      `SELECT id FROM leave_requests WHERE user_id=$1 AND status <> 'rejected' AND from_date <= $3 AND to_date >= $2 LIMIT 1`,
      [req.user.id, r.from, r.to]);
    if (dup.rows[0]) { await client.query('ROLLBACK'); return res.status(422).json({ error: 'overlap', message: 'Trùng với đơn nghỉ đã có trong khoảng ngày này' }); }
    const left = await remaining(client, req.user.id, r.type, +r.from.slice(0, 4));
    if (r.days > left) {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'insufficient_balance', message: `Vượt quỹ phép: còn ${left} ngày, đơn cần ${r.days} ngày` });
    }
    const status = firstStatus(req.user.role);
    const id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await client.query(
      `INSERT INTO leave_requests (id,user_id,type,from_date,to_date,half_day,days,reason,status,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, req.user.id, r.type, r.from, r.to, r.half, r.days, r.reason || '—', status, today()]);
    if (status === 'approved') {
      const col = r.type === 'annual' ? 'annual_used' : r.type === 'sick' ? 'sick_used' : null;
      if (col) await client.query(`UPDATE leave_balances SET ${col} = ${col} + $2 WHERE user_id=$1 AND year=$3`, [req.user.id, r.days, +r.from.slice(0, 4)]);
    }
    // Thông báo cho người duyệt kế tiếp
    const me = (await client.query('SELECT name, team FROM users WHERE id=$1', [req.user.id])).rows[0];
    const approvers = status === 'lead'
      ? (await client.query(`SELECT id FROM users WHERE role='lead' AND team=$1`, [me.team])).rows
      : status === 'director' ? (await client.query(`SELECT id FROM users WHERE role='director'`)).rows : [];
    for (const a of approvers) {
      await client.query('INSERT INTO notifications (user_id,message,request_id) VALUES ($1,$2,$3)', [a.id, `${me.name} gửi đơn nghỉ chờ bạn duyệt`, id]);
    }
    await client.query('COMMIT');
    const row = (await query(`SELECT ${COLS} FROM leave_requests r JOIN users u ON u.id=r.user_id WHERE r.id=$1`, [id])).rows[0];
    res.status(201).json({ request: row });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
});

// Đơn của tôi
leaveRouter.get('/mine', async (req, res) => {
  const { rows } = await query(
    `SELECT ${COLS} FROM leave_requests r JOIN users u ON u.id=r.user_id WHERE r.user_id=$1 ORDER BY r.created_at DESC, r.id DESC`, [req.user.id]);
  res.json({ requests: rows });
});

// Lịch vắng mặt: tuần này + sắp tới (mọi người dùng đều xem được)
leaveRouter.get('/calendar', async (_req, res) => {
  const { start, end } = weekOf(today());
  const horizon = addDays(end, 21);
  const [away, upcoming] = await Promise.all([
    query(`SELECT ${COLS} FROM leave_requests r JOIN users u ON u.id=r.user_id
           WHERE r.status IN ('approved','director') AND r.from_date <= $2 AND r.to_date >= $1 ORDER BY r.from_date`, [start, end]),
    query(`SELECT ${COLS} FROM leave_requests r JOIN users u ON u.id=r.user_id
           WHERE r.status <> 'rejected' AND r.from_date > $1 AND r.from_date <= $2 ORDER BY r.from_date`, [end, horizon]),
  ]);
  res.json({ week: { start, end }, away: away.rows, upcoming: upcoming.rows });
});

leaveRouter.patch('/:id', requireRole('lead', 'director'), decide);
