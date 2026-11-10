// Quy tắc tính phiếu lương mẫu (theo prototype): lương cơ bản + phụ cấp + tăng ca − bảo hiểm − nghỉ không lương − thuế.
export const MONTHS = ['2026-10', '2026-09', '2026-08'];
const OT = [1_200_000, 800_000, 0];

export function buildItems(e, monthIdx) {
  const ot = e.role === 'employee' ? OT[monthIdx] : 0;
  const ins = Math.round(e.base * 0.105);
  const unpaid = e.id === 'e13' && monthIdx === 0 ? Math.round((e.base / 22) * 2) : 0;
  const tax = Math.round(Math.max(0, e.base + e.allow - ins - 11_000_000 - (e.id === 'e1' ? 0 : 4_400_000)) * 0.08);
  return [
    ['earning', 'base', 'Lương cơ bản', e.base],
    ['earning', 'allowance', 'Phụ cấp', e.allow],
    ...(ot ? [['earning', 'overtime', 'Tăng ca', ot]] : []),
    ['deduction', 'insurance', 'Bảo hiểm (10,5%)', ins],
    ...(unpaid ? [['deduction', 'unpaid', 'Nghỉ không lương', unpaid]] : []),
    ['deduction', 'tax', 'Thuế TNCN', tax],
  ];
}

export function summarize(items) {
  const earnings = items.filter((i) => i.kind === 'earning');
  const deductions = items.filter((i) => i.kind === 'deduction');
  const sum = (a) => a.reduce((t, i) => t + Number(i.amount), 0);
  const gross = sum(earnings), ded = sum(deductions);
  return { earnings, deductions, gross, deductionsTotal: ded, net: gross - ded };
}
