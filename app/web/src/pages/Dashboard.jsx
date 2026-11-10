import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { vnd, range, fmtDate, TYPES, STATUS } from '../format.js';
import { Seg, kicker, muted } from '../components.jsx';

const VARIANTS = [['A', 'Trang nhất'], ['B', 'Sổ cái'], ['C', 'Việc cần làm']];
const big = { fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 48, lineHeight: 1 };
const unit = { fontSize: 16, color: 'var(--color-neutral-600)' };
const typeLabel = (r) => TYPES[r.type] + (r.half_day ? ' · nửa ngày' : '');

function storedVariant() { try { return localStorage.getItem('dash-variant') || 'A'; } catch { return 'A'; } }

export default function Dashboard({ user, onNavigate = () => {} }) {
  const [data, setData] = useState(null);
  const [cal, setCal] = useState(null);
  const [error, setError] = useState('');
  const [variant, setVariant] = useState(storedVariant);
  useEffect(() => {
    Promise.all([api('/api/dashboard'), api('/api/leave-requests/calendar')])
      .then(([d, c]) => { setData(d); setCal(c); }).catch(() => setError('Không tải được dữ liệu.'));
  }, []);
  const pick = (v) => { setVariant(v); try { localStorage.setItem('dash-variant', v); } catch { /* bỏ qua */ } };
  if (error) return <div role="alert">{error}</div>;
  if (!data || !cal) return <div>Đang tải…</div>;

  const { balance: b, recentRequests: reqs, latestPayslip: slip } = data;
  const isMgr = user.role !== 'employee';
  const first = user.name.split(' ').slice(-1)[0];
  const pendingMine = reqs.filter((r) => ['lead', 'director'].includes(r.status)).length;
  const weekLabel = `${fmtDate(cal.week.start)} – ${fmtDate(cal.week.end)}`;
  const away = <List title={`Vắng mặt tuần ${weekLabel}`} rows={cal.away} empty="Không ai vắng tuần này." testid="away" />;
  const upcoming = <List title="Lịch nghỉ sắp tới" rows={cal.upcoming} empty="Chưa có lịch nghỉ sắp tới." testid="upcoming" />;
  const pendingBlock = isMgr && (
    <div data-testid="pending"><div style={kicker}>Chờ bạn duyệt</div>
      <div style={{ ...big, fontSize: 32 }}>{data.pendingApprovals} đơn</div>
      <button className="btn btn-ghost" style={{ paddingLeft: 0 }} onClick={() => onNavigate('approve')}>Mở trang duyệt →</button></div>
  );

  return (
    <div style={{ maxWidth: 1080, display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)', ...muted, fontSize: 12 }}>
        <span>Phương án dashboard:</span><Seg label="Phương án dashboard" options={VARIANTS.map(([k, l]) => [k, `${k} · ${l}`])} value={variant} onChange={pick} />
      </div>

      {variant === 'A' && (<>
        <div><div style={muted}>{user.title} · {user.team}</div><h1 style={{ margin: 0 }}>Chào {first}</h1></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 'var(--space-8)' }}>
          <div><div style={kicker}>Phép năm còn lại</div><div style={big} data-testid="annual-left">{b.annualLeft}<span style={unit}> / {b.annualTotal} ngày</span></div></div>
          <div><div style={kicker}>Nghỉ ốm còn lại</div><div style={big} data-testid="sick-left">{b.sickLeft}<span style={unit}> ngày</span></div></div>
          <div><div style={kicker}>Lương gần nhất</div>{slip ? <><div style={{ ...big, fontSize: 28 }}>{vnd(slip.net)}</div><div style={muted}>Tháng {slip.month}</div></> : <div style={muted}>Chưa có phiếu lương</div>}</div>
          <div><div style={kicker}>Đơn gần nhất</div>{reqs[0] ? <><div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20 }}>{TYPES[reqs[0].type]}, {range(reqs[0].from_date, reqs[0].to_date)}</div><span className={STATUS[reqs[0].status].cls}>{STATUS[reqs[0].status].label}</span></> : <div style={muted}>Chưa có đơn nào</div>}</div>
        </div>
        {pendingBlock}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 'var(--space-8)' }}>{away}{upcoming}</div>
      </>)}

      {variant === 'B' && (<>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-3)' }}>
          <div><h2 style={{ margin: 0 }}>Sổ của {user.name}</h2><div style={muted}>{user.title} · {user.team}</div></div>
          <button className="btn btn-primary" onClick={() => onNavigate('leave')}>Tạo đơn nghỉ</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 'var(--space-4)' }}>
          <div className="card"><div className="card-kicker">Phép năm còn</div><div style={{ ...big, fontSize: 32 }} data-testid="annual-left">{b.annualLeft}<span style={{ ...unit, fontSize: 15 }}> ngày</span></div></div>
          <div className="card"><div className="card-kicker">Nghỉ ốm còn</div><div style={{ ...big, fontSize: 32 }} data-testid="sick-left">{b.sickLeft}<span style={{ ...unit, fontSize: 15 }}> ngày</span></div></div>
          <div className="card"><div className="card-kicker">Đơn đang chờ</div><div style={{ ...big, fontSize: 32 }}>{pendingMine}</div></div>
          <div className="card"><div className="card-kicker">Thực nhận {slip ? 'T' + slip.month.slice(5) : ''}</div><div style={{ ...big, fontSize: 22, paddingTop: 8 }}>{slip ? vnd(slip.net) : '—'}</div></div>
        </div>
        {pendingBlock}
        <div><h4>Đơn của tôi</h4>
          <div style={{ overflowX: 'auto' }}><table className="table"><thead><tr><th>Loại</th><th>Ngày</th><th>Số ngày</th><th>Trạng thái</th></tr></thead><tbody>
            {reqs.map((r) => <tr key={r.id}><td>{typeLabel(r)}</td><td>{range(r.from_date, r.to_date)}</td><td>{r.days} ngày</td><td><span className={STATUS[r.status].cls}>{STATUS[r.status].label}</span></td></tr>)}
          </tbody></table></div></div>
        {away}
      </>)}

      {variant === 'C' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 'var(--space-8)', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2 style={{ margin: 0 }}>Hôm nay, {first} cần làm</h2>
            {pendingBlock}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <button className="btn btn-primary" onClick={() => onNavigate('leave')}>Tạo đơn nghỉ</button>
              <button className="btn btn-secondary" onClick={() => onNavigate('pay')}>Xem phiếu lương</button>
            </div>
            <div style={muted}>Phép năm còn <b data-testid="annual-left">{b.annualLeft}</b> ngày · nghỉ ốm còn <b data-testid="sick-left">{b.sickLeft}</b> ngày{slip ? ` · lương T${slip.month.slice(5)}: ${vnd(slip.net)}` : ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>{away}{upcoming}</div>
        </div>
      )}
    </div>
  );
}

function List({ title, rows, empty, testid }) {
  return (
    <div data-testid={testid}>
      <h3 style={{ marginBottom: 'var(--space-3)' }}>{title}</h3>
      {rows.length === 0 ? <div style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>{empty}</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {rows.map((r) => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>{r.team} · {typeLabel(r)}</div></div>
              <div style={{ whiteSpace: 'nowrap' }}>{range(r.from_date, r.to_date)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
