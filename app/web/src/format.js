export const vnd = (n) => Number(n).toLocaleString('vi-VN') + ' ₫';
export const fmtDate = (iso) => { const [, m, d] = iso.slice(0, 10).split('-'); return `${+d}/${+m}`; };
export const range = (a, b) => (a.slice(0, 10) === b.slice(0, 10) ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`);
export const TYPES = { annual: 'Phép năm', sick: 'Nghỉ ốm', unpaid: 'Nghỉ không lương' };
export const STATUS = {
  lead: { label: 'Chờ trưởng nhóm', cls: 'tag tag-neutral', step: 'Bước 1/2' },
  director: { label: 'Chờ giám đốc', cls: 'tag tag-accent-2', step: 'Bước 2/2' },
  approved: { label: 'Đã duyệt', cls: 'tag tag-accent', step: 'Hoàn tất' },
  rejected: { label: 'Từ chối', cls: 'tag tag-outline', step: 'Đã đóng' },
};
