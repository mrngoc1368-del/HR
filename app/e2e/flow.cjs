// E2E: chạy với DB đã seed + server (npm start ở app/server) đã build web. Dùng: node app/e2e/flow.cjs [thư-mục-ảnh]
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const BASE = process.env.BASE || 'http://localhost:3001';
const SHOTS = process.argv[2];
const shot = (p, n) => SHOTS && p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });

async function login(page, who) {
  await page.goto(BASE);
  await page.getByRole('button', { name: new RegExp(who) }).click();
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.getByTestId('annual-left').waitFor();
}
(async () => {
  const b = await chromium.launch();
  const ctx = (vp) => b.newContext({ viewport: vp, deviceScaleFactor: 1 });

  // 1. Nhân viên đăng nhập, gửi đơn 1 ngày
  let c = await ctx({ width: 1280, height: 800 }), p = await c.newPage();
  await login(p, 'Nguyễn Thảo Linh');
  assert.equal(await p.getByRole('button', { name: 'Duyệt đơn' }).count(), 0, 'nhân viên không thấy Duyệt đơn');
  await shot(p, '1-dashboard-nhanvien');
  await p.getByRole('button', { name: 'Nghỉ phép', exact: true }).click();
  await p.getByRole('button', { name: 'Tạo đơn nghỉ' }).click();
  await p.getByLabel('Từ ngày').fill('2026-12-14'); await p.getByLabel('Đến ngày').fill('2026-12-14');
  await p.getByLabel('Lý do').fill('E2E test');
  await p.getByRole('button', { name: 'Gửi đơn' }).click();
  await p.getByRole('status').waitFor();
  await shot(p, '2-gui-don');
  // trùng ngày bị chặn
  await p.getByRole('button', { name: 'Tạo đơn nghỉ' }).click();
  await p.getByLabel('Từ ngày').fill('2026-12-14'); await p.getByLabel('Đến ngày').fill('2026-12-14');
  await p.getByRole('button', { name: 'Gửi đơn' }).click();
  await p.getByRole('alert').filter({ hasText: 'Trùng' }).waitFor();
  // xem lương + tải PDF
  await p.getByRole('button', { name: 'Bảng lương' }).click();
  await p.getByTestId('net').waitFor(); await shot(p, '3-luong');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Tải PDF' }).click()]);
  assert.match(dl.suggestedFilename(), /phieu-luong-2026-10\.pdf/);
  await c.close();

  // 2. Trưởng nhóm duyệt cấp 1
  c = await ctx({ width: 1280, height: 800 }); p = await c.newPage();
  await login(p, 'Trần Minh Quân');
  await p.getByRole('button', { name: /Duyệt đơn/ }).click();
  await p.getByTestId('pending-count').waitFor();
  await shot(p, '4-duyet-truongnhom');
  await p.getByRole('button', { name: 'Duyệt đơn của Nguyễn Thảo Linh' }).first().click();
  await p.getByRole('status').filter({ hasText: 'chuyển Giám đốc' }).waitFor();
  await p.getByRole('button', { name: 'Bảng lương' }).click();
  await p.getByRole('region', { name: 'Bảng lương toàn công ty' }).waitFor();
  await c.close();

  // 3. Giám đốc duyệt cấp 2
  c = await ctx({ width: 1280, height: 800 }); p = await c.newPage();
  await login(p, 'Ngô Ngọc Linh');
  await p.getByRole('button', { name: /Duyệt đơn/ }).click();
  await p.getByRole('button', { name: 'Duyệt đơn của Nguyễn Thảo Linh' }).first().click();
  await p.getByRole('status').filter({ hasText: 'Đã duyệt đơn' }).waitFor();
  await p.getByRole('button', { name: 'Nhân viên', exact: true }).click();
  await p.getByTestId('count').waitFor(); await shot(p, '5-nhanvien');
  await c.close();

  // 4. Mobile
  c = await ctx({ width: 390, height: 800 }); p = await c.newPage();
  await login(p, 'Nguyễn Thảo Linh'); await shot(p, '6-mobile');
  await c.close();
  await b.close();
  console.log('E2E OK');
})().catch((e) => { console.error(e); process.exit(1); });
