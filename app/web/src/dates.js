const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
// Cùng quy tắc với backend: T2–T6, nửa ngày = 0.5
export function workingDays(from, to, half) {
  if (half) return 0.5;
  if (!from || !to || to < from) return 0;
  let n = 0;
  for (let d = parse(from); d <= parse(to); d.setUTCDate(d.getUTCDate() + 1)) { const w = d.getUTCDay(); if (w && w < 6) n++; }
  return n;
}
