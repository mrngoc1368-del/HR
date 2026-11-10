import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { migrate } from './migrate.js';
import { EMP, DEMO_PASSWORD, REQUESTS } from './seedData.js';
import { workingDays } from '../lib/dates.js';
import { MONTHS, buildItems } from '../lib/payroll.js';

export async function seed({ cost = 10 } = {}) {
  await migrate();
  const hash = await bcrypt.hash(DEMO_PASSWORD, cost);
  for (const e of EMP) {
    await pool.query(
      `INSERT INTO users (id,name,email,password_hash,role,title,team,phone,start_month,base_salary,allowance)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET name=$2,email=$3,password_hash=$4,role=$5,title=$6,team=$7,phone=$8,start_month=$9,base_salary=$10,allowance=$11`,
      [e.id, e.name, e.email, hash, e.role, e.title, e.team, e.phone, e.start, e.base, e.allow]
    );
    await pool.query(
      `INSERT INTO leave_balances (user_id,year,annual_used) VALUES ($1,2026,$2)
       ON CONFLICT (user_id,year) DO UPDATE SET annual_used=$2`,
      [e.id, e.used]
    );
  }
  for (const e of EMP) {
    for (const [mi, month] of MONTHS.entries()) {
      const ps = await pool.query(
        `INSERT INTO payslips (user_id, month) VALUES ($1,$2) ON CONFLICT (user_id, month) DO UPDATE SET month=EXCLUDED.month RETURNING id`, [e.id, month]);
      await pool.query('DELETE FROM payslip_items WHERE payslip_id=$1', [ps.rows[0].id]);
      for (const [kind, code, label, amount] of buildItems(e, mi)) {
        await pool.query('INSERT INTO payslip_items (payslip_id,kind,code,label,amount) VALUES ($1,$2,$3,$4,$5)', [ps.rows[0].id, kind, code, label, amount]);
      }
    }
  }
  for (const r of REQUESTS) {
    await pool.query(
      `INSERT INTO leave_requests (id,user_id,type,from_date,to_date,half_day,days,reason,status,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET status=$9`,
      [r.id, r.emp, r.type, r.from, r.to, r.half, workingDays(r.from, r.to, r.half), r.reason, r.status, r.created]);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--reset')) {
    await migrate();
    await pool.query('TRUNCATE notifications, approval_logs, leave_requests, payslip_items, payslips, leave_balances, sessions, users RESTART IDENTITY CASCADE');
  }
  await seed();
  console.log(`seeded ${EMP.length} users`);
  await pool.end();
}
