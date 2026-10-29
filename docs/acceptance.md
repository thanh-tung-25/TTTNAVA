# Kiểm thử và nghiệm thu – TTNAVA

- Ngày nghiệm thu: **29/10/2026**
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
- Cây chương trình năm học → lớp 1–5 → học kỳ → môn → chương → bài học; số câu đếm từ MySQL, thu gọn/mở rộng.
- Chọn chương/bài học để xem breadcrumb, tìm theo nội dung/mã, lọc độ khó/loại/trạng thái, phân trang, tải lại và xử lý lỗi/rỗng.
- Tạo/sửa câu hỏi theo đúng cấp chương trình; đổi cấp trên tự tải lại và loại bỏ lựa chọn không hợp lệ.
- Nhập `.docx` theo mẫu, xem trước/chỉnh sửa, chọn bài học và lưu Nháp; không tự xuất bản.
- Ẩn/hiện/đăng câu hỏi, xem audit, xem thống kê ngân hàng câu hỏi, lượt chơi, kim cương và top học sinh.
- Công cụ riêng xem trước/sao lưu/khôi phục trạng thái câu hỏi cũ; migration không xoá hàng loạt.

### Hệ thống

- 12 migration; danh mục 3 môn, 91 chủ đề, 1 năm học, 30 chương, 91 bài học; giữ nguyên 5.263 câu hỏi cũ.
- Câu hỏi có trạng thái Nháp/Đã đăng/Đang ẩn; học sinh chỉ nhận câu Đã đăng; câu cũ `visible` không tự đổi trạng thái.
- JWT HttpOnly, bcrypt, phân quyền, same-origin, Helmet/CSP, rate limit, Zod, upload `.docx` giới hạn.
- Socket.IO xác thực cookie, sự kiện lời mời/cập nhật/kết thúc trận.
- Chống thưởng trùng, chống nộp trùng, thời gian do máy chủ quyết định.
- Không có đăng ký công khai, cửa hàng, cá cược, học phí, Kĩ năng sống. AI mặc định tắt và chỉ chạy khi admin chủ động bấm nút sau khi cấu hình.

## 2. Kết quả kiểm chứng

### 2.1. Kiểm tra danh mục và cây chương trình

```powershell
npm run db:migrate
npm run db:seed-catalog
```

Kết quả:

```text
Migrate hoàn tất: 12 tổng cộng.
Đã đồng bộ 3 môn, 91 chủ đề, 30 chương và 91 bài học. Không nhập câu hỏi mẫu.
```

Truy vấn database:

```text
subjects = 3
topics = 91
school_years = 1
curriculum_chapters = 30
curriculum_lessons = 91
questions = 5263 (dữ liệu cũ được giữ nguyên)
schema_migrations = 12
```

Kiểm tra cây qua API admin: `GET /api/v1/admin/curriculum/tree` trả 5 khối lớp, số câu từng bài/chương và tổng câu của năm. Không có số liệu tự sinh ở frontend.

### 2.2. Backend – Vitest + Supertest

```powershell
cd backend
npx vitest run --config vitest.config.js
```

Kết quả:

```text
Test Files  12 passed (12)
Tests       93 passed (93)
Duration    ~38s
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
| `admin-questions.test.js` | Cây chương trình, bắt buộc phạm vi, tạo/sửa/đăng/ẩn, audit, import, AI chưa cấu hình |
| `question-bank.test.js` | Danh mục 91 chủ đề, 30 chương, 91 bài học, fixture câu hỏi, quota |
| `question-availability.test.js` | Chủ đề thiếu câu, luyện/thi/thách đấu trả lỗi phù hợp |
| `question-import-parser.test.js` | Phân tích mẫu `.docx`, lỗi thiếu dữ liệu và định dạng |
| `chinese.test.js` | Module tiếng Trung: import Word, bài học độc lập khối, luyện/flashcard, đề và bảo mật đáp án |
| `utils.test.js` | Chuẩn hoá, thời gian, serializer, các hàm dùng chung |

Test chạy trên `kids_learning_test`; global setup tự tạo database, migrate, seed và dọn dữ liệu. Không ghi vào `kids_learning`.

### 2.3. E2E – Playwright + Chromium

```powershell
npx playwright test
```

Kết quả:

```text
22 passed
PLAYWRIGHT_EXIT=0
```

| Khu vực | Số test | Nội dung |
| --- | --- | --- |
| Xác thực | 4 | Khách bị chuyển hướng, sai mật khẩu, đăng nhập, đăng xuất |
| Quản trị | 6 | Hướng dẫn khi chưa chọn mục; cây chương trình + chi tiết; tạo nháp rồi đăng; nhập Word; học sinh; thống kê |
| Tiếng Trung | 2 | Tạo học sinh không khối chính; duyệt Word, đăng, flashcard, đề và bố cục di động |
| Luyện tập | 2 | Hoàn thành vòng 10 câu có phản hồi/kết quả; lịch sử |
| Thi thử | 1 | Bắt đầu, trả lời, nộp, xem lại |
| Thách đấu | 2 | Robot trả lời/bỏ trận; 1–1 mời/nhận/đấu/bỏ trận |
| Kim cương – xếp hạng | 2 | Tổng/ledger; bảng xếp hạng và lọc |
| Di động 360 px | 3 | Trang chủ, màn hình luyện tập và ngân hàng câu hỏi admin không tràn ngang |

E2E dùng storage state sinh từ JWT để tránh giới hạn đăng nhập 10 lần/phút. Người dùng `e2e_admin`, `e2e_lan`, `e2e_minh` và dữ liệu liên quan được tạo trước, dọn sau khi chạy.

### 2.4. Sức khoẻ máy chủ

```text
GET http://localhost:3000/api/v1/health
HTTP 200
{"data":{"status":"ok","time":"2026-10-29T12:28:26.960Z"}}
```

### 2.5. Kích thước mã nguồn

```text
SOURCE_JS_FILES=126
SOURCE_JS_OVER_200=0
SOURCE_JS_MAX_LINES=199
```

Đã kiểm tra toàn bộ `backend/src/**/*.js` và `frontend/assets/js/**/*.js`: không file nào từ 200 dòng; file lớn nhất 199 dòng. Không còn module sinh nội dung câu hỏi ở thời điểm phát triển; danh mục và cây chương trình lấy từ `backend/seed-data/`.

### 2.6. Kiểm tra thủ công / trình duyệt

Trong quá trình phát triển đã kiểm tra bằng trình duyệt thật trên máy:

- Đăng nhập, trang chủ, luyện tập, thi, thách đấu Robot, lời mời 1–1, kim cương, xếp hạng, lịch sử.
- Quản trị học sinh, cây chương trình, chọn đúng bài học, danh sách/chi tiết/lọc/audit câu hỏi, tạo nháp/đăng, nhập Word, thống kê.
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
npm run db:seed-catalog
npm --prefix backend test
npx playwright test
```

Yêu cầu: MySQL/MariaDB đang chạy, `backend/.env` hợp lệ, server tại `http://localhost:3000` hoặc để Playwright tự khởi động.
