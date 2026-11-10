import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { TYPES, STATUS, range } from '../format.js';
import { workingDays } from '../dates.js';
import { Seg, Toast, kicker, muted } from '../components.jsx';

const ERR = { overlap: 'Trùng với đơn nghỉ đã có trong khoảng ngày này.', insufficient_balance: 'Vượt quỹ phép còn lại.', no_working_days: 'Khoảng ngày chọn không có ngày làm việc.', invalid_range: 'Ngày kết thúc phải sau ngày bắt đầu.' };

export default function Leave({ today }) {
  const [reqs, setReqs] = useState(null);
  const [bal, setBal] = useState(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ type: 'annual', from: today, to: today, half: false, reason: '' });
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([api('/api/leave-requests/mine'), api('/api/dashboard')]).then(([m, d]) => { setReqs(m.requests); setBal(d.balance); });
  useEffect(() => { load(); }, []);
  if (!reqs || !bal) return <div>Đang tải…</div>;

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const days = workingDays(f.from, f.half ? f.from : f.to, f.half);
  const pending = (t) => reqs.filter((r) => r.type === t && ['lead', 'director'].includes(r.status)).reduce((a, r) => a + r.days, 0);
  const left = { annual: bal.annualLeft - pending('annual'), sick: bal.sickLeft - pending('sick'), unpaid: Infinity }[f.type];
  const over = days > left;

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/api/leave-requests', { method: 'POST', body: { type: f.type, from: f.from, to: f.half ? f.from : f.to, half: f.half, reason: f.reason } });
      setOpen(false); setF((s) => ({ ...s, reason: '' })); setToast('Đã gửi đơn · chờ duyệt'); setTimeout(() => setToast(''), 2600);
      await load();
    } catch (err) { setError(err.body?.message || ERR[err.body?.error] || 'Không gửi được đơn, thử lại sau.'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-3)' }}>
        <div><h1 style={{ margin: 0 }}>Nghỉ phép</h1>
          <div style={muted}>Phép năm còn {bal.annualLeft - pending("annual")} ngày · Nghỉ ốm còn {bal.sickLeft - pending('sick')} ngày</div></div>
        {!open && <button className="btn btn-primary" onClick={() => setOpen(true)}>Tạo đơn nghỉ</button>}
      </div>

      {open && (
        <form onSubmit={submit} aria-label="Tạo đơn nghỉ" className="card elev-sm" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div><div style={kicker}>Loại nghỉ</div><Seg label="Loại nghỉ" options={Object.entries(TYPES)} value={f.type} onChange={(v) => set('type', v)} /></div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={f.half} onChange={(e) => set('half', e.target.checked)} /> Nghỉ nửa ngày
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div className="field"><label htmlFor="from">{f.half ? 'Ngày nghỉ' : 'Từ ngày'}</label>
              <input id="from" className="input" type="date" value={f.from} onChange={(e) => set('from', e.target.value)} /></div>
            {!f.half && <div className="field"><label htmlFor="to">Đến ngày</label>
              <input id="to" className="input" type="date" value={f.to} min={f.from} onChange={(e) => set('to', e.target.value)} /></div>}
          </div>
          <div className="field"><label htmlFor="reason">Lý do</label>
            <input id="reason" className="input" value={f.reason} onChange={(e) => set('reason', e.target.value)} /></div>
          <div data-testid="days" style={{ fontWeight: 600 }}>{days} ngày làm việc</div>
          {over && <div role="alert" style={{ fontSize: 13, color: 'var(--color-accent-2-700)' }}>Vượt quỹ phép còn lại ({left} ngày). Server sẽ từ chối đơn này.</div>}
          {error && <div role="alert" style={{ fontSize: 13, color: 'var(--color-accent-2-700)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-primary" disabled={busy || days <= 0}>Gửi đơn</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setOpen(false); setError(''); }}>Hủy</button>
          </div>
        </form>
      )}

      <div>
        <h3>Đơn của tôi</h3>
        {reqs.length === 0 ? <p style={muted}>Chưa có đơn nào.</p> : (
          <div style={{ overflowX: 'auto' }}><table className="table"><thead><tr><th>Loại</th><th>Ngày</th><th>Số ngày</th><th>Lý do</th><th>Trạng thái</th></tr></thead><tbody>
            {reqs.map((r) => (
              <tr key={r.id}><td>{TYPES[r.type]}{r.half_day ? ' · nửa ngày' : ''}</td><td>{range(r.from_date, r.to_date)}</td><td>{r.days} ngày</td><td>{r.reason}</td>
                <td><span className={STATUS[r.status].cls}>{STATUS[r.status].label}</span> <span style={muted}>{STATUS[r.status].step}</span></td></tr>
            ))}
          </tbody></table></div>
        )}
      </div>
      <Toast text={toast} />
    </div>
  );
}
