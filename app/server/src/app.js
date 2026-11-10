import express from 'express';
import fs from 'node:fs';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth.js';
import { leaveRouter } from './routes/leave.js';
import { approvalsRouter } from './routes/approvals.js';
import { payslipsRouter, payrollRouter } from './routes/payroll.js';
import { employeesRouter } from './routes/employees.js';
import { dashboardRouter } from './routes/dashboard.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use('/api/leave-requests', leaveRouter);
  app.use('/api/approvals', approvalsRouter);
  app.use('/api/payslips', payslipsRouter);
  app.use('/api/payroll', payrollRouter);
  app.use('/api/employees', employeesRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));
  // Bản build frontend (npm run build ở app/web) được phục vụ chung một cổng
  const dist = new URL('../../web/dist/', import.meta.url).pathname;
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(dist + 'index.html'));
  }
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  });
  return app;
}
