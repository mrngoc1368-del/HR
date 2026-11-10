import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { today } from '../lib/dates.js';

export const employeesRouter = Router();
employeesRouter.use(requireAuth);

const YEAR = () => +today().slice(0, 4);

async function profile(id) {
  const u = (await query(
    `SELECT u.id,u.name,u.email,u.role,u.title,u.team,u.phone,u.start_month,u.base_salary::bigint base_salary,u.allowance::bigint allowance,
            b.annual_total::float annual_total, b.annual_used::float annual_used
     FROM users u LEFT JOIN leave_balances b ON b.user_id=u.id AND b.year=$2 WHERE u.id=$1`, [id, YEAR()])).rows[0];
  if (!u) return null;
  // Quản lý trực tiếp: nhân viên → trưởng nhóm của nhóm; trưởng nhóm → giám đốc
  const mgr = u.role === 'director' ? null
    : (await query(u.role === 'employee' ? `SELECT name FROM users WHERE role='lead' AND team=$1 LIMIT 1` : `SELECT name FROM users WHERE role='director' LIMIT 1`,
      u.role === 'employee' ? [u.team] : [])).rows[0];
  return { ...u, base_salary: Number(u.base_salary), allowance: Number(u.allowance), annual_left: u.annual_total - u.annual_used, manager: mgr?.name ?? null };
}

// Hồ sơ của chính mình (khai báo trước /:id)
employeesRouter.get('/me', async (req, res) => res.json({ employee: await profile(req.user.id) }));

// Danh sách (quản lý): lọc theo nhóm, tìm theo tên/chức danh; đánh dấu người đang nghỉ hôm nay
employeesRouter.get('/', requireRole('lead', 'director'), async (req, res) => {
  const team = String(req.query.team || '');
  const q = String(req.query.q || '').trim().toLowerCase();
  const { rows } = await query(
    `SELECT u.id,u.name,u.title,u.team,u.role,
            COALESCE(b.annual_total - b.annual_used, 0)::float annual_left,
            EXISTS (SELECT 1 FROM leave_requests r WHERE r.user_id=u.id AND r.status='approved' AND r.from_date <= $2 AND r.to_date >= $2) on_leave
     FROM users u LEFT JOIN leave_balances b ON b.user_id=u.id AND b.year=$1
     WHERE ($3 = '' OR u.team = $3) AND ($4 = '' OR lower(u.name) LIKE '%'||$4||'%' OR lower(u.title) LIKE '%'||$4||'%')
     ORDER BY u.team, u.role DESC, u.name`, [YEAR(), today(), team, q]);
  const teams = (await query('SELECT DISTINCT team FROM users ORDER BY team')).rows.map((r) => r.team);
  res.json({ employees: rows, teams });
});

employeesRouter.get('/:id', async (req, res) => {
  // Nhân viên chỉ xem hồ sơ của mình; người khác trả 404 để không lộ sự tồn tại
  if (req.user.role === 'employee' && req.params.id !== req.user.id) return res.status(404).json({ error: 'not_found' });
  const e = await profile(req.params.id);
  if (!e) return res.status(404).json({ error: 'not_found' });
  res.json({ employee: e });
});
