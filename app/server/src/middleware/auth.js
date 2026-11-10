import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signAccess(user) {
  return jwt.sign({ sub: user.id, role: user.role, team: user.team }, config.jwtSecret, { expiresIn: config.accessTtl });
}

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    const p = jwt.verify(token, config.jwtSecret);
    req.user = { id: p.sub, role: p.role, team: p.team };
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'forbidden' });
