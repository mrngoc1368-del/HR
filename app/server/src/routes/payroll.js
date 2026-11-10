import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { summarize } from '../lib/payroll.js';

export const payslipsRouter = Router();
export const payrollRouter = Router();
payslipsRouter.use(requireAuth);
payrollRouter.use(requireAuth, requireRole('lead', 'director'));

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const FONT = (n) => new URL(`../../assets/fonts/${n}`, import.meta.url).pathname;
const itemsOf = async (id) =>
  (await query('SELECT kind, code, label, amount::bigint FROM payslip_items WHERE payslip_id=$1 ORDER BY id', [id])).rows
    .map((i) => ({ ...i, amount: Number(i.amount) }));

// Phiếu lương của chính người dùng — user_id lấy từ token, không nhận từ client.
payslipsRouter.get('/', async (req, res) => {
  const months = (await query('SELECT month FROM payslips WHERE user_id=$1 ORDER BY month DESC', [req.user.id])).rows.map((r) => r.month);
  const month = req.query.month || months[0];
  if (!MONTH_RE.test(String(month))) return res.status(422).json({ error: 'invalid_month' });
  const p = (await query('SELECT id, month FROM payslips WHERE user_id=$1 AND month=$2', [req.user.id, month])).rows[0];
  if (!p) return res.status(404).json({ error: 'not_found', months });
  res.json({ months, payslip: { id: p.id, month: p.month, ...summarize(await itemsOf(p.id)) } });
});

payslipsRouter.get('/:id/pdf', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'not_found' });
  const p = (await query(
    `SELECT p.id, p.month, p.user_id, u.name, u.title, u.team FROM payslips p JOIN users u ON u.id=p.user_id WHERE p.id=$1`, [req.params.id])).rows[0];
  if (!p) return res.status(404).json({ error: 'not_found' });
  // Chủ phiếu hoặc quản lý (đúng với quyền xem bảng lương công ty)
  if (p.user_id !== req.user.id && req.user.role === 'employee') return res.status(404).json({ error: 'not_found' });
  const s = summarize(await itemsOf(p.id));
  const vnd = (n) => n.toLocaleString('vi-VN') + ' ₫';
  const doc = new PDFDocument({ size: 'A4', margin: 56 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="phieu-luong-${p.user_id}-${p.month}.pdf"`);
  doc.pipe(res);
  doc.registerFont('r', FONT('DejaVuSans.ttf')).registerFont('b', FONT('DejaVuSans-Bold.ttf'));
  doc.font('b').fontSize(18).text('Ngoclinhn Group — Phiếu lương');
  doc.font('r').fontSize(11).text(`Tháng ${p.month.slice(5)}/${p.month.slice(0, 4)}`).moveDown();
  doc.text(`${p.name} · ${p.title} · ${p.team}`).moveDown();
  const row = (label, amount, bold) => { doc.font(bold ? 'b' : 'r').text(label, 56, doc.y, { continued: true, width: 300 }).text(vnd(amount), { align: 'right' }); };
  doc.font('b').text('Thu nhập').moveDown(0.3); s.earnings.forEach((i) => row(i.label, i.amount)); row('Tổng thu nhập', s.gross, true);
  doc.moveDown().font('b').text('Khấu trừ').moveDown(0.3); s.deductions.forEach((i) => row(i.label, i.amount)); row('Tổng khấu trừ', s.deductionsTotal, true);
  doc.moveDown().fontSize(14); row('Thực nhận', s.net, true);
  doc.end();
});

// Bảng lương toàn công ty (quản lý)
payrollRouter.get('/', async (req, res) => {
  const month = req.query.month;
  if (!MONTH_RE.test(String(month))) return res.status(422).json({ error: 'invalid_month' });
  const { rows } = await query(
    `SELECT u.id, u.name, u.title, u.team, p.id AS payslip_id,
       COALESCE(SUM(CASE WHEN i.kind='earning' THEN i.amount END),0)::bigint gross,
       COALESCE(SUM(CASE WHEN i.kind='deduction' THEN i.amount END),0)::bigint deductions
     FROM payslips p JOIN users u ON u.id=p.user_id LEFT JOIN payslip_items i ON i.payslip_id=p.id
     WHERE p.month=$1 GROUP BY u.id, p.id ORDER BY u.team, u.name`, [month]);
  const out = rows.map((r) => ({ ...r, gross: +r.gross, deductions: +r.deductions, net: +r.gross - +r.deductions }));
  res.json({ month, rows: out, total: out.reduce((t, r) => t + r.net, 0) });
});
