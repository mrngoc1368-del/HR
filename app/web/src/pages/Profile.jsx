import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { vnd } from '../format.js';
import { muted } from '../components.jsx';

const initials = (name) => name.split(' ').slice(-2).map((x) => x[0]).join('');
const Field = ({ label, children }) => <div><div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>{label}</div><div>{children}</div></div>;

export default function Profile({ id = 'me', onBack }) {
  const [e, setE] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api(`/api/employees/${id}`).then((r) => setE(r.employee)).catch(() => setError('Không tải được hồ sơ.')); }, [id]);
  if (error) return <div role="alert">{error}</div>;
  if (!e) return <div>Đang tải…</div>;
  return (
    <div style={{ maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {onBack && <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={onBack}>← Danh sách nhân viên</button>}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-4)' }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--color-accent-100)', color: 'var(--color-accent-800)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 30 }}>{initials(e.name)}</div>
        <div><h1 style={{ margin: 0 }}>{e.name}</h1><div style={{ fontSize: 16, color: 'var(--color-neutral-700)' }}>{e.title} · {e.team}</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 'var(--space-8)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h4 style={{ margin: 0 }}>Liên hệ & công việc</h4>
          <Field label="Email">{e.email}</Field><Field label="Điện thoại">{e.phone}</Field>
          <Field label="Ngày vào làm">{e.start_month}</Field><Field label="Quản lý trực tiếp">{e.manager ?? '—'}</Field>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h4 style={{ margin: 0 }}>Hợp đồng & phép</h4>
          <Field label="Loại hợp đồng">Không xác định thời hạn</Field>
          <Field label="Lương cơ bản">{vnd(e.base_salary)}</Field><Field label="Phụ cấp">{vnd(e.allowance)}</Field>
          <Field label="Phép năm còn"><span data-testid="annual-left">{e.annual_left} / {e.annual_total} ngày</span></Field>
        </div>
      </div>
      {!onBack && <div style={muted}>Cần cập nhật thông tin? Liên hệ Huỳnh Tấn Phát · Nhân sự – Hành chính.</div>}
    </div>
  );
}
