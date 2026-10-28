# Kiểm thử và nghiệm thu – Bé Học Vui

- Ngày nghiệm thu: **27/10/2026**
- Môi trường: Windows, Node **v24.15.0**, npm **11.12.1**, MariaDB **10.4.32-MariaDB** (XAMPP), Chromium do Playwright quản lý.
- Database chính: `kids_learning`; database kiểm thử: `kids_learning_test`.

## 1. Phạm vi đã hoàn thành

### Học sinh

- Đăng nhập, đăng xuất, chặn truy cập trang khi chưa đăng nhập hoặc sai vai trò.
- Trang chủ, chọn môn/lớp/chủ đề.
- Luyện tập 10 câu: phản hồi ngay, lời giải, điều hướng câu, màn hình kết quả, xem lại câu sai, lịch sử.
- Thi thử 20 câu / 15 phút: lưu tạm đáp án, palette câu hỏi, đồng hồ, nộp bài, tự nộp, xem lại toàn bộ, lịch sử.
- Thách đấu Robot 3 mức và 1–1: lời mời 30 giây, nhận/từ chối/huỷ, đếm ngược 5 giây, thời lượng 5/10/15 phút, trả lời theo tiến độ riêng, bỏ trận, kết quả và thưởng.
- Kim cương, ledger, bảng xếp hạng tuần/tháng/tất cả, lọc lớp.
- Giao diện tiếng Việt, mobile-first, avatar, bảng màu môn học, bàn phím và modal.

### Quản trị viên

- Tạo, tìm kiếm, sửa học sinh; khoá/mở khoá; đặt lại mật khẩu.
- Xem danh sách câu hỏi, lọc theo môn/lớp/chủ đề/loại/trạng thái/từ khoá.
- Xem chi tiết, sửa đề/phương án/đáp án/lời giải/độ khó/trạng thái; ghi audit.
- Ẩn/hiện câu hỏi, xem thống kê ngân hàng câu hỏi, lượt chơi, kim cương và top học sinh.

### Hệ thống

- 7 migration, 3 môn, 91 chủ đề, 5.263 câu, 13.455 phương án.
- JWT HttpOnly, bcrypt, phân quyền, same-origin, Helmet/CSP, rate limit, Zod.
- Socket.IO xác thực cookie, sự kiện lời mời/cập nhật/kết thúc trận.
- Chống thưởng trùng, chống nộp trùng, thời gian do máy chủ quyết định.
- Không có đăng ký công khai, cửa hàng, cá cược, gọi AI lúc chạy, học phí, Kĩ năng sống.

## 2. Kết quả kiểm chứng

### 2.1. Kiểm tra ngân hàng câu hỏi

```powershell
npm run validate:questions
```

Kết quả:

```text
Kiểm tra thành công: 91/91 chủ đề, 5263 câu hỏi.
VALIDATE_EXIT=0
```

Truy vấn database:

```text
subjects = 3
topics = 91
questions = 5263
question_options = 13455
schema_migrations = 7
```

### 2.2. Backend – Vitest + Supertest

```powershell
cd backend
npx vitest run --config vitest.config.js
```

Kết quả:

```text
Test Files  9 passed (9)
Tests       69 passed (69)
Duration    ~10.4s
VITEST_EXIT=0
```

Các vùng được kiểm thử:

| File | Nội dung |
| --- | --- |
| `auth.test.js` | Đăng nhập, sai mật khẩu, tài khoản khoá, đăng xuất, chặn tự đăng ký, phân quyền |
| `practice.test.js` | Tạo phiên, chấm đúng/sai, không trả đáp án sai, hoàn thành, thưởng, lịch sử |
| `exam.test.js` | Tạo đề, lưu tạm, không lộ đáp án, nộp, tự nộp, thưởng, lịch sử |
| `challenge.test.js` | Robot thắng/thua/hoà, thưởng một lần, lời mời, hết hạn, từ chối, bỏ trận, 1–1 |
| `socket.test.js` | Từ chối socket không cookie, chấp nhận sinh viên/admin, từ chối bot |
| `admin-students.test.js` | CRUD học sinh, khoá, reset mật khẩu, tìm kiếm, phân trang |
| `admin-questions.test.js` | Lọc, chi tiết, sửa, audit, ẩn/hiện, validation |
| `question-bank.test.js` | Bất biến 91 chủ đề/5.263 câu, quota, đáp án, lời giải |
| `utilities.test.js` | Chuẩn hoá, thời gian, serializer, các hàm dùng chung |

Test chạy trên `kids_learning_test`; global setup tự tạo database, migrate, seed và dọn dữ liệu. Không ghi vào `kids_learning`.

### 2.3. E2E – Playwright + Chromium

```powershell
npx playwright test
```

Kết quả:

```text
16 passed (39.0s)
PLAYWRIGHT_EXIT=0
```

| Khu vực | Số test | Nội dung |
| --- | --- | --- |
| Xác thực | 4 | Khách bị chuyển hướng, sai mật khẩu, đăng nhập, đăng xuất |
| Quản trị | 3 | Tạo/tìm học sinh, mở chi tiết câu hỏi, xem thống kê |
| Luyện tập | 2 | Hoàn thành vòng 10 câu có phản hồi/kết quả; lịch sử |
| Thi thử | 1 | Bắt đầu, trả lời, nộp, xem lại |
| Thách đấu | 2 | Robot trả lời/bỏ trận; 1–1 mời/nhận/đấu/bỏ trận |
| Kim cương – xếp hạng | 2 | Tổng/ledger; bảng xếp hạng và lọc |
| Di động 360 px | 2 | Trang chủ và màn hình luyện tập không tràn ngang |

E2E dùng storage state sinh từ JWT để tránh giới hạn đăng nhập 10 lần/phút. Người dùng `e2e_admin`, `e2e_lan`, `e2e_minh` và dữ liệu liên quan được tạo trước, dọn sau khi chạy.

### 2.4. Sức khoẻ máy chủ

```text
GET http://localhost:3000/api/v1/health
HTTP 200
{"data":{"status":"ok","time":"2026-10-27T14:57:35.052Z"}}
```

### 2.5. Kích thước mã nguồn

```text
SOURCE_JS_FILES=104
SOURCE_JS_OVER_200=0
SOURCE_JS_MAX_LINES=178
```

Đã kiểm tra toàn bộ `backend/src/**/*.js` và `frontend/assets/js/**/*.js`: không file nào từ 200 dòng; file lớn nhất 178 dòng. Các module nội dung seed trong `backend/scripts/content/` là dữ liệu sinh câu hỏi ở thời điểm phát triển, không chạy trong ứng dụng.

### 2.6. Kiểm tra thủ công / trình duyệt

Trong quá trình phát triển đã kiểm tra bằng trình duyệt thật trên máy:

- Đăng nhập, trang chủ, luyện tập, thi, thách đấu Robot, lời mời 1–1, kim cương, xếp hạng, lịch sử.
- Quản trị học sinh, danh sách/chi tiết/lọc/audit câu hỏi, thống kê.
- Console không có lỗi CSP/import sau khi tách module.
- Các luồng lỗi: hết hạn lời mời, bỏ trận, nộp bài khi hết giờ, truy cập sai vai trò.

## 3. Chưa kiểm chứng

- Chưa chạy trên **Firefox, WebKit/Safari**, thiết bị iOS/Android thật; E2E hiện chỉ dùng Chromium (desktop + giả lập Pixel 5, viewport 360 px).
- Chưa kiểm thử tải/đồng thời quy mô lớn, độ bền 24 giờ, mất mạng kéo dài hoặc failover database.
- Chưa kiểm thử trên **MySQL 8.x** thực tế; mới chạy với MariaDB 10.4.32 tương thích schema.
- Chưa triển khai production với HTTPS/reverse proxy, `COOKIE_SECURE=true`, sao lưu/phục hồi và giám sát.
- Chưa có kiểm thử hình ảnh (visual regression), kiểm thử tiếp cận tự động toàn diện hoặc kiểm thử xâm nhập bảo mật độc lập.
- Chưa có chức năng quên mật khẩu qua email; học sinh được admin đặt lại mật khẩu theo thiết kế.

## 4. Còn lại

Không còn hạng mục chức năng bắt buộc bị chặn. Các việc khuyến nghị trước khi phát hành thật:

1. Chạy E2E bổ sung trên Firefox/WebKit và thiết bị thật.
2. Kiểm thử tải Socket.IO + API, đo độ trễ chốt trận và xử lý mất kết nối.
3. Dựng HTTPS, đặt `COOKIE_SECURE=true`, dùng tài khoản database riêng, sao lưu định kỳ.
4. Thêm giám sát lỗi/structured log và cảnh báo khi database hoặc socket bất thường.
5. Chạy kiểm thử xâm nhập và rà soát CSP/rate limit trong môi trường staging.

## 5. Cách chạy lại toàn bộ

```powershell
# Từ thư mục gốc
npm run validate:questions
npm --prefix backend test
npx playwright test
```

Yêu cầu: MySQL/MariaDB đang chạy, `backend/.env` hợp lệ, server tại `http://localhost:3000` hoặc để Playwright tự khởi động.
