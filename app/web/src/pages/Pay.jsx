import { useEffect, useState } from 'react';
import { api, download } from '../api.js';
import { vnd } from '../format.js';
import { Seg, kicker, muted } from '../components.jsx';

const monthLabel = (m) => `Tháng ${m.slice(5)}/${m.slice(0, 4)}`;

export default function Pay({ user }) {
  const [months, setMonths] = useState(null);
  const [month, setMonth] = useState(null);
  const [slip, setSlip] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const isMgr = user.role !== 'employee';

  useEffect(() => { api('/api/payslips').then((r) => { setMonths(r.months); setMonth(r.months[0]); }).catch(() => setError('Không tải được bảng lương.')); }, []);
  useEffect(() => {
    if (!month) return;
    setError('');
    api(`/api/payslips?month=${month}`).then((r) => setSlip(r.payslip)).catch(() => { setSlip(null); setError('Chưa có phiếu lương cho tháng này.'); });
    if (isMgr) api(`/api/payroll?month=${month}`).then(setCompany).catch(() => setCompany(null));
  }, [month, isMgr]);

  if (!months) return error ? <div role="alert">{error}</div> : <div>Đang tải…</div>;
  const row = (l, v, strong) => (
    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', fontWeight: strong ? 600 : 400, padding: '4px 0' }}><span>{l}</span><span>{vnd(v)}</span></div>
  );
  return (
    <div style={{ maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div><h1 style={{ margin: 0 }}>Bảng lương</h1><div style={{ ...muted, marginBottom: 'var(--space-3)' }}>{user.name}</div>
        <Seg label="Chọn tháng" options={months.map((m) => [m, monthLabel(m)])} value={month} onChange={setMonth} /></div>

      {error && <div role="alert" style={muted}>{error}</div>}
      {slip && (
        <section aria-label="Phiếu lương" style={{ maxWidth: 480 }}>
          <div style={kicker}>Thu nhập</div>
          {slip.earnings.map((i) => row(i.label, i.amount))}
          {row('Tổng thu nhập', slip.gross, true)}
          <div style={{ ...kicker, marginTop: 'var(--space-4)' }}>Khấu trừ</div>
          {slip.deductions.map((i) => row(i.label, i.amount))}
          {row('Tổng khấu trừ', slip.deductionsTotal, true)}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <div style={kicker}>Thực nhận</div>
            <div data-testid="net" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 40 }}>{vnd(slip.net)}</div>
          </div>
          <button className="btn btn-secondary" style={{ marginTop: 'var(--space-3)' }}
            onClick={() => download(`/api/payslips/${slip.id}/pdf`, `phieu-luong-${slip.month}.pdf`).catch(() => setError('Không tải được PDF.'))}>Tải PDF</button>
        </section>
      )}

      {isMgr && company && (
        <section aria-label="Bảng lương toàn công ty">
          <h3>Toàn công ty · {monthLabel(company.month)}</h3>
          <div style={{ overflowX: 'auto' }}><table className="table"><thead><tr><th>Nhân viên</th><th>Nhóm</th><th style={{ textAlign: 'right' }}>Thu nhập</th><th style={{ textAlign: 'right' }}>Khấu trừ</th><th style={{ textAlign: 'right' }}>Thực nhận</th></tr></thead><tbody>
            {company.rows.map((r) => (
              <tr key={r.id}><td>{r.name}</td><td>{r.team}</td><td style={{ textAlign: 'right' }}>{vnd(r.gross)}</td><td style={{ textAlign: 'right' }}>{vnd(r.deductions)}</td><td style={{ textAlign: 'right' }}>{vnd(r.net)}</td></tr>
            ))}
          </tbody><tfoot><tr><td colSpan={4} style={{ fontWeight: 600 }}>Tổng thực nhận ({company.rows.length} người)</td><td data-testid="company-total" style={{ textAlign: 'right', fontWeight: 600 }}>{vnd(company.total)}</td></tr></tfoot></table></div>
        </section>
      )}
    </div>
  );
}
