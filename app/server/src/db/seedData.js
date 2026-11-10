// Dữ liệu mẫu lấy từ prototype "HR App": id, tên, chức danh, nhóm, vai trò, lương cơ bản, phụ cấp, vào làm, SĐT, ngày phép đã dùng
export const EMP = [
  ['e0','Ngô Ngọc Linh','Giám đốc','Ban Giám đốc','director',48000000,6000000,'03/2019','0903 112 018',3],
  ['e2','Trần Minh Quân','Trưởng nhóm Marketing','Marketing','lead',28000000,3000000,'06/2020','0912 334 210',5],
  ['e1','Nguyễn Thảo Linh','Chuyên viên Marketing','Marketing','employee',16500000,1500000,'09/2023','0987 450 112',4],
  ['e3','Lê Hoàng Anh','Content Writer','Marketing','employee',13000000,1000000,'02/2024','0934 221 908',2],
  ['e4','Phạm Gia Huy','Designer','Marketing','employee',15000000,1200000,'11/2022','0905 778 341',6],
  ['e5','Võ Thu Trang','Trưởng nhóm Kinh doanh','Kinh doanh','lead',27000000,3000000,'01/2020','0918 004 556',3],
  ['e6','Đặng Quốc Bảo','Sales Executive','Kinh doanh','employee',14000000,2000000,'07/2023','0976 312 450',7],
  ['e7','Hồ Ngọc Mai','Sales Executive','Kinh doanh','employee',14000000,2000000,'04/2024','0938 665 120',1],
  ['e8','Bùi Thanh Tùng','Account Manager','Kinh doanh','employee',18000000,1800000,'08/2021','0909 117 893',5],
  ['e9','Phan Minh Châu','Sales Executive','Kinh doanh','employee',13500000,2000000,'03/2025','0967 220 781',0],
  ['e10','Đỗ Khánh Vy','Trưởng nhóm Vận hành','Vận hành','lead',25000000,2500000,'05/2020','0913 887 602',4],
  ['e11','Ngô Đức Thịnh','Điều phối kho','Vận hành','employee',12000000,1500000,'10/2022','0935 448 170',3],
  ['e12','Lý Hải Yến','Chăm sóc khách hàng','Vận hành','employee',11000000,1000000,'06/2024','0989 503 266',2],
  ['e13','Trịnh Văn Nam','Giao nhận','Vận hành','employee',10500000,1800000,'12/2023','0977 129 845',6],
  ['e14','Mai Phương Thảo','Chăm sóc khách hàng','Vận hành','employee',11000000,1000000,'02/2025','0908 664 731',1],
  ['e15','Cao Thị Hồng','Kế toán trưởng','Kế toán','lead',24000000,2500000,'04/2019','0916 225 097',2],
  ['e16','Lâm Bích Ngọc','Kế toán viên','Kế toán','employee',13000000,1000000,'09/2022','0937 880 413',4],
  ['e17','Huỳnh Tấn Phát','Nhân sự – Hành chính','Kế toán','employee',14000000,1200000,'01/2023','0968 341 225',3],
].map(([id, name, title, team, role, base, allow, start, phone, used]) => ({
  id, name, title, team, role, base, allow, start, phone, used, email: emailOf(id, name),
}));

function emailOf(id, name) {
  const fixed = { e0: 'linh.ngo', e2: 'quan.tran', e1: 'linh.nguyen' };
  if (fixed[id]) return `${fixed[id]}@ngoclinhn.vn`;
  const last = name.split(' ').slice(-1)[0].normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  return `${last}.${id}@ngoclinhn.vn`;
}

export const DEMO_PASSWORD = 'demo1234';

// Đơn nghỉ mẫu (từ prototype)
export const REQUESTS = [
  ['r1','e1','annual','2026-11-19','2026-11-20',false,'Về quê dự đám cưới em gái','lead','2026-11-08'],
  ['r2','e1','sick','2026-10-14','2026-10-14',false,'Sốt, có giấy khám','approved','2026-10-14'],
  ['r3','e1','annual','2026-09-03','2026-09-04',false,'Nghỉ lễ nối dài','approved','2026-08-25'],
  ['r4','e3','annual','2026-11-12','2026-11-13',false,'Việc gia đình','director','2026-11-05'],
  ['r5','e4','annual','2026-11-24','2026-11-24',true,'Đi khám răng buổi sáng','lead','2026-11-09'],
  ['r6','e6','unpaid','2026-11-26','2026-11-28',false,'Thi chứng chỉ','director','2026-11-06'],
  ['r7','e11','sick','2026-11-10','2026-11-11',false,'Đau lưng','approved','2026-11-10'],
  ['r8','e8','annual','2026-11-09','2026-11-10',false,'Du lịch cùng gia đình','approved','2026-10-28'],
  ['r9','e16','annual','2026-11-13','2026-11-13',true,'Đón con','approved','2026-11-07'],
  ['r10','e13','unpaid','2026-10-20','2026-10-21',false,'Việc riêng','rejected','2026-10-15'],
].map(([id, emp, type, from, to, half, reason, status, created]) => ({ id, emp, type, from, to, half, reason, status, created }));
