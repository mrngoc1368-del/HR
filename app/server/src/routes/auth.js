import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { config } from '../config.js';
import { signAccess } from '../middleware/auth.js';

export const authRouter = Router();

const COOKIE = 'refresh_token';
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10); // chống dò email qua thời gian phản hồi
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, title: u.title, team: u.team });

async function issueRefresh(res, userId) {
  const raw = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + config.refreshDays * 86400_000);
  await query('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,$3)', [userId, sha(raw), expires]);
  res.cookie(COOKIE, raw, { httpOnly: true, sameSite: 'lax', expires, path: '/api/auth' });
}

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ error: 'invalid_input' });
  }
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: 'invalid_credentials' });
  await issueRefresh(res, user.id);
  res.json({ accessToken: signAccess(user), role: user.role, user: publicUser(user) });
});

authRouter.post('/refresh', async (req, res) => {
  const raw = req.cookies?.[COOKIE];
  if (!raw) return res.status(401).json({ error: 'unauthorized' });
  const { rows } = await query(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND NOT s.revoked AND s.expires_at > now()`, [sha(raw)]);
  if (!rows[0]) return res.status(401).json({ error: 'unauthorized' });
  res.json({ accessToken: signAccess(rows[0]), role: rows[0].role, user: publicUser(rows[0]) });
});

authRouter.post('/logout', async (req, res) => {
  const raw = req.cookies?.[COOKIE];
  if (raw) await query('UPDATE sessions SET revoked = TRUE WHERE token_hash = $1', [sha(raw)]);
  res.clearCookie(COOKIE, { path: '/api/auth' });
  res.status(204).end();
});
