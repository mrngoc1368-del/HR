import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Seg, muted } from '../components.jsx';
import Profile from './Profile.jsx';

export const initials = (name) => name.split(' ').slice(-2).map((x) => x[0]).join('');

export default function Employees() {
  const [team, setTeam] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => api(`/api/employees?team=${encodeURIComponent(team)}&q=${encodeURIComponent(q)}`).then(setData).catch(() => setError('Không tải được danh sách.')), 200);
    return () => clearTimeout(t);
  }, [team, q]);

  if (openId) return <Profile id={openId} onBack={() => setOpenId(null)} />;
  if (error) return <div role="alert">{error}</div>;
  if (!data) return <div>Đang tải…</div>;
  return (
    <div style={{ maxWidth: 1080, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div><h1 style={{ margin: 0 }}>Nhân viên</h1><div data-testid="count" style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>{data.employees.length} người</div></div>
      <input className="input" aria-label="Tìm nhân viên" style={{ maxWidth: 360, minHeight: 44 }} placeholder="Tìm theo tên hoặc chức danh" value={q} onChange={(e) => setQ(e.target.value)} />
      <Seg label="Lọc theo nhóm" options={[['', 'Tất cả'], ...data.teams.map((t) => [t, t])]} value={team} onChange={setTeam} />
      {data.employees.length === 0 && <p style={muted}>Không có ai khớp.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,240px),1fr))', gap: 'var(--space-3)' }}>
        {data.employees.map((e) => (
          <button key={e.id} className="card" onClick={() => setOpenId(e.id)}
            style={{ border: 0, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit', flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ width: 44, height: 44, flex: 'none', borderRadius: '50%', background: 'var(--color-accent-100)', color: 'var(--color-accent-800)', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 14 }}>{initials(e.name)}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{e.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>{e.title}</div>
              <div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>{e.team} · phép còn {e.annual_left} ngày</div>
            </div>
            {e.on_leave && <span className="tag tag-accent-2">Đang nghỉ</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
