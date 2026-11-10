import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { TYPES, STATUS, range } from '../format.js';
import { Toast, kicker, muted } from '../components.jsx';

export default function Approve({ user, onChanged }) {
  const [pending, setPending] = useState(null);
  const [history, setHistory] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const isDir = user.role === 'director';

  const load = () => Promise.all([api('/api/approvals?status=pending'), api('/api/approvals?status=all')])
    .then(([p, h]) => { setPending(p.requests); setHistory(h.requests); }).catch(() => setError('Không tải được danh sách.'));
  useEffect(() => { load(); }, []);

  async function decide(r, action) {
    setBusyId(r.id); setError('');
    try {
      await api(`/api/leave-requests/${r.id}`, { method: 'PATCH', body: { action } });
      setToast(action === 'reject' ? 'Đã từ chối đơn' : isDir ? 'Đã duyệt đơn' : 'Đã duyệt · chuyển Giám đốc');
      setTimeout(() => setToast(''), 2600);
      onChanged?.();
    } catch (e) {
      setError(e.status === 409 ? 'Đơn này đã được xử lý bởi người khác.' : 'Không thực hiện được, thử lại sau.');
    } finally { setBusyId(null); await load(); }
  }

  if (!pending || !history) return error ? <div role="alert">{error}</div> : <div>Đang tải…</div>;
  return (
    <div style={{ maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div><h1 style={{ margin: 0 }}>Duyệt đơn</h1>
        <div style={muted}>{isDir ? 'Giám đốc · duyệt cấp 2' : `Trưởng nhóm ${user.team} · duyệt cấp 1`}</div></div>
      {error && <div role="alert" style={{ color: 'var(--color-accent-2-700)' }}>{error}</div>}
      <div>
        <div style={kicker}>Chờ bạn duyệt</div>
        <h3 data-testid="pending-count" style={{ marginTop: 4 }}>{pending.length} đơn</h3>
        {pending.length === 0 && <p style={muted}>Không có đơn nào chờ.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {pending.map((r) => (
            <div key={r.id} className="card elev-sm" data-testid={`req-${r.id}`} style={{ gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={muted}>{r.title} · {r.team}</div></div>
                <div style={{ textAlign: 'right' }}><div>{TYPES[r.type]}{r.half_day ? ' · nửa ngày' : ''}, {range(r.from_date, r.to_date)}</div><div style={muted}>{r.days} ngày</div></div>
              </div>
              <div style={{ fontStyle: 'italic' }}>“{r.reason}”</div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn btn-primary" disabled={busyId === r.id} onClick={() => decide(r, 'approve')} aria-label={`Duyệt đơn của ${r.name}`}>Duyệt</button>
                <button className="btn btn-secondary" disabled={busyId === r.id} onClick={() => decide(r, 'reject')} aria-label={`Từ chối đơn của ${r.name}`}>Từ chối</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3>{isDir ? 'Tất cả đơn' : `Đơn của nhóm ${user.team}`}</h3>
        <div style={{ overflowX: 'auto' }}><table className="table"><thead><tr><th>Nhân viên</th><th>Loại</th><th>Ngày</th><th>Số ngày</th><th>Trạng thái</th></tr></thead><tbody>
          {history.map((r) => (
            <tr key={r.id}><td>{r.name}</td><td>{TYPES[r.type]}{r.half_day ? ' · nửa ngày' : ''}</td><td>{range(r.from_date, r.to_date)}</td><td>{r.days} ngày</td>
              <td><span className={STATUS[r.status].cls}>{STATUS[r.status].label}</span></td></tr>
          ))}
        </tbody></table></div>
      </div>
      <Toast text={toast} />
    </div>
  );
}
