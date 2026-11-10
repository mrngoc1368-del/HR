import { useState } from 'react';
import { auth } from '../api.js';

const DEMO = [
  ['linh.nguyen@ngoclinhn.vn', 'Nguyễn Thảo Linh', 'Nhân viên'],
  ['quan.tran@ngoclinhn.vn', 'Trần Minh Quân', 'Quản lý · Trưởng nhóm'],
  ['linh.ngo@ngoclinhn.vn', 'Ngô Ngọc Linh', 'Quản lý · Giám đốc'],
];

export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Vui lòng nhập email và mật khẩu.'); return; } // bước 2: kiểm tra form
    setBusy(true); setError('');
    try { onLoggedIn(await auth.login(email, password)); }
    catch (err) { setError(err.status === 401 ? 'Sai email hoặc mật khẩu' : 'Không thể kết nối máy chủ, thử lại sau.'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,380px),1fr))' }}>
      <div style={{ padding: 'clamp(32px,7vw,96px) clamp(24px,6vw,80px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 'var(--space-8)' }}>
        <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>Ngoclinhn Group · Cổng nhân sự</div>
        <div style={{ maxWidth: 520 }}>
          <h1 style={{ fontSize: 'clamp(40px,6vw,68px)', lineHeight: 1.02, margin: '0 0 var(--space-4)' }}>Mọi việc nhân sự, trên một trang giấy.</h1>
          <p style={{ fontSize: 17, maxWidth: 420, color: 'var(--color-neutral-700)' }}>Xem ngày phép, gửi đơn nghỉ, nhận phiếu lương — và duyệt đơn cho đội của bạn.</p>
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>18 nhân sự</div>
      </div>
      <form onSubmit={submit} noValidate style={{ padding: 'clamp(32px,7vw,96px) clamp(24px,6vw,80px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: 380, width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h2 style={{ margin: 0 }}>Đăng nhập</h2>
          <div className="field"><label htmlFor="email">Email công ty</label>
            <input id="email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label htmlFor="pw">Mật khẩu</label>
            <input id="pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          {error && <div role="alert" style={{ fontSize: 13, color: 'var(--color-accent-2-700)' }}>{error}</div>}
          <button className="btn btn-primary" style={{ width: '100%', minHeight: 44 }} disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>Tài khoản demo (mật khẩu demo1234)</div>
            {DEMO.map(([em, name, role]) => (
              <button type="button" key={em} className="btn btn-secondary" style={{ justifyContent: 'space-between', minHeight: 44, width: '100%' }}
                onClick={() => { setEmail(em); setPassword('demo1234'); setError(''); }}>
                <span>{name}</span><span style={{ fontWeight: 400, fontSize: 12, color: 'var(--color-neutral-700)' }}>{role}</span>
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
