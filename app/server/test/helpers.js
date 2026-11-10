import { pool } from '../src/db/pool.js';
import { seed } from '../src/db/seed.js';
import { migrate } from '../src/db/migrate.js';

export async function resetDb() {
  await migrate();
  await pool.query(`TRUNCATE notifications, approval_logs, leave_requests, payslip_items, payslips, leave_balances, sessions, users RESTART IDENTITY CASCADE`);
  await seed({ cost: 4 });
}
export { pool };
