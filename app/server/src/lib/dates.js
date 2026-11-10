// "Hôm nay" có thể ghim bằng biến TODAY (test, demo); mặc định lấy ngày hệ thống.
export const today = () => process.env.TODAY || new Date().toISOString().slice(0, 10);

const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const iso = (d) => d.toISOString().slice(0, 10);
export const addDays = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(parse(s)) === s;

/** Số ngày làm việc (T2–T6) trong [from, to]; nửa ngày = 0.5. */
export function workingDays(from, to, half) {
  if (half) return 0.5;
  let n = 0;
  for (let d = parse(from); d <= parse(to); d.setUTCDate(d.getUTCDate() + 1)) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}

/** Thứ Hai và Thứ Sáu của tuần chứa ngày s. */
export function weekOf(s) {
  const w = parse(s).getUTCDay();
  const monday = addDays(s, w === 0 ? -6 : 1 - w);
  return { start: monday, end: addDays(monday, 4) };
}
