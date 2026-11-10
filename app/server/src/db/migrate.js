import fs from 'node:fs';
import { pool } from './pool.js';

export async function migrate() {
  const sql = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await migrate();
  console.log('migrated');
  await pool.end();
}
