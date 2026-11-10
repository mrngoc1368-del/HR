import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/', async (req, res) => {
  const uid = req.user.id;
  const [u, bal, reqs, slip, pending] = await Promise.all([
    query('SELECT id,name,email,role,title,team FROM users WHERE id=$1', [uid]),
    query('SELECT * FROM leave_balances WHERE user_id=$1 AND year=2026', [uid]),
    query(`SELECT id,type,from_date::text,to_date::text,half_day,days,reason,status,created_at::text
           FROM leave_requests WHERE user_id=$1 ORDER BY created_at DESC, id DESC LIMIT 5`, [uid]),
    query(`SELECT p.month,
             COALESCE(SUM(CASE WHEN i.kind='earning' THEN i.amount ELSE -i.amount END),0)::bigint AS net
           FROM payslips p LEFT JOIN payslip_items i ON i.payslip_id=p.id
           WHERE p.user_id=$1 GROUP BY p.id ORDER BY p.month DESC LIMIT 1`, [uid]),
    req.user.role === 'employee' ? { rows: [{ n: 0 }] }
      : req.user.role === 'director'
        ? query(`SELECT count(*)::int n FROM leave_requests WHERE status='director'`)
        : query(`SELECT count(*)::int n FROM leave_requests r JOIN users e ON e.id=r.user_id
                 WHERE r.status='lead' AND e.team=$1`, [req.user.team]),
  ]);
  const b = bal.rows[0];
  res.json({
    user: u.rows[0],
    balance: b && {
      annualTotal: +b.annual_total, annualUsed: +b.annual_used, annualLeft: b.annual_total - b.annual_used,
      sickTotal: +b.sick_total, sickUsed: +b.sick_used, sickLeft: b.sick_total - b.sick_used,
    },
    recentRequests: reqs.rows,
    latestPayslip: slip.rows[0] ? { month: slip.rows[0].month, net: Number(slip.rows[0].net) } : null,
    pendingApprovals: pending.rows[0].n,
  });
});
