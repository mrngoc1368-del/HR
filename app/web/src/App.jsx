import { useEffect, useState } from 'react';
import { auth, api } from './api.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Leave from './pages/Leave.jsx';
import Approve from './pages/Approve.jsx';
import Pay from './pages/Pay.jsx';
import Employees from './pages/Employees.jsx';
import Profile from './pages/Profile.jsx';

// Menu theo vai trò: mục "Duyệt đơn" và "Nhân viên" chỉ dành cho quản lý.
export const navFor = (role) => [
  ['dash', 'Tổng quan'], ['leave', 'Nghỉ phép'],
  ...(role !== 'employee' ? [['approve', 'Duyệt đơn']] : []),
  ['pay', 'Bảng lương'],
  ...(role !== 'employee' ? [['emp', 'Nhân viên']] : []),
  ['profile', 'Hồ sơ của tôi'],
];

const ICON = { dash: 'ph-newspaper', leave: 'ph-calendar-blank', approve: 'ph-stamp', pay: 'ph-receipt', emp: 'ph-users-three', profile: 'ph-identification-card' };
const SHORT = { dash: 'Tổng quan', leave: 'Nghỉ phép', approve: 'Duyệt', pay: 'Lương', emp: 'Nhân sự', profile: 'Hồ sơ' };

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = đang khôi phục phiên
  const [screen, setScreen] = useState('dash');
  const [badge, setBadge] = useState(0);
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => { const f = () => setW(window.innerWidth); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  const mobile = w < 760;
  useEffect(() => { auth.restore().then((r) => setSession(r)); }, []);
  const isMgr = !!session && session.user.role !== 'employee';
  const refreshBadge = () => api('/api/approvals?status=pending').then((r) => setBadge(r.requests.length)).catch(() => {});
  useEffect(() => { if (isMgr) refreshBadge(); }, [isMgr, screen]);
  if (session === undefined) return null;
  if (!session) return <Login onLoggedIn={(r) => { setScreen('dash'); setSession(r); }} />;
  const { user } = session;
  const logout = async () => { await auth.logout(); setSession(null); };
  const items = navFor(user.role);
  const badgeTag = (k) => k === 'approve' && badge > 0 && <span className="tag tag-accent-2" style={{ marginLeft: 'auto', padding: '1px 7px' }}>{badge}</span>;
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {!mobile && (
        <aside style={{ width: 232, flex: 'none', padding: 'var(--space-6) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', position: 'sticky', top: 0, height: '100vh' }}>
          <div><div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19 }}>Ngoclinhn Group</div>
            <div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>Cổng nhân sự</div></div>
          <nav aria-label="Menu chính" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map(([k, label]) => (
              <button key={k} className="btn" aria-current={screen === k ? 'page' : undefined} onClick={() => setScreen(k)}
                style={{ justifyContent: 'flex-start', gap: 10, background: screen === k ? 'var(--color-accent-100)' : 'transparent', color: screen === k ? 'var(--color-accent-700)' : 'var(--color-text)', fontWeight: screen === k ? 600 : 400 }}>
                <i className={`ph-duotone ${ICON[k]}`} style={{ fontSize: 19 }} aria-hidden="true" /><span>{label}</span>{badgeTag(k)}
              </button>
            ))}
          </nav>
          <div style={{ marginTop: 'auto' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>{user.title}</div>
            <button className="btn btn-ghost" style={{ paddingLeft: 0 }} onClick={logout}>Đăng xuất</button>
          </div>
        </aside>
      )}
      <main style={{ flex: 1, minWidth: 0, padding: mobile ? '16px 16px 96px' : '40px 48px 64px' }}>
        {mobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17 }}>Ngoclinhn Group</div>
            <button className="btn btn-ghost" style={{ minHeight: 44 }} onClick={logout} aria-label="Đăng xuất"><i className="ph-duotone ph-sign-out" style={{ fontSize: 20 }} /></button>
          </div>
        )}
        {screen === 'dash' ? <Dashboard user={user} onNavigate={setScreen} />
          : screen === 'leave' ? <Leave today={new Date().toISOString().slice(0, 10)} />
          : screen === 'approve' ? <Approve user={user} onChanged={refreshBadge} />
          : screen === 'pay' ? <Pay user={user} />
          : screen === 'emp' ? <Employees />
          : <Profile />}
      </main>
      {mobile && (
        <nav aria-label="Menu chính" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, display: 'flex', background: 'var(--color-surface)', boxShadow: 'var(--shadow-md)', padding: '4px 4px calc(4px + env(safe-area-inset-bottom))' }}>
          {items.map(([k, label]) => (
            <button key={k} className="btn" aria-label={label} aria-current={screen === k ? 'page' : undefined} onClick={() => setScreen(k)}
              style={{ flex: 1, flexDirection: 'column', gap: 2, minHeight: 54, padding: '6px 2px', fontSize: 11, position: 'relative', fontWeight: screen === k ? 600 : 400, color: screen === k ? 'var(--color-accent-700)' : 'var(--color-neutral-700)' }}>
              <i className={`ph-duotone ${ICON[k]}`} style={{ fontSize: 22 }} aria-hidden="true" />{SHORT[k]}
              {k === 'approve' && badge > 0 && <span className="tag tag-accent-2" style={{ position: 'absolute', top: 2, right: 10, padding: '0 6px' }}>{badge}</span>}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
