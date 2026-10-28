# Bé Học Vui (TTTNAVA)

Ứng dụng web trắc nghiệm dành cho học sinh tiểu học, giao diện tiếng Việt, xây dựng bằng HTML/CSS/JavaScript thuần, Express, MySQL/MariaDB và Socket.IO.

- **Học sinh:** luyện tập theo chủ đề, thi thử có giới hạn thời gian, thách đấu Robot hoặc bạn bè 1–1 theo thời gian thực, xem lịch sử, kim cương và bảng xếp hạng.
- **Quản trị viên:** tạo và quản lý tài khoản học sinh, khoá/mở khoá, đặt lại mật khẩu, duyệt và sửa ngân hàng câu hỏi, xem thống kê.
- **Không có:** đăng ký tự do, cửa hàng, cá cược, gọi AI lúc chạy, học phí hoặc nội dung Kĩ năng sống.

Tài liệu chi tiết: [Kiến trúc](docs/architecture.md) · [API](docs/api.md) · [Kiểm thử và nghiệm thu](docs/acceptance.md)

## Quy tắc chính

| Hoạt động | Nội dung | Kim cương |
| --- | --- | --- |
| Luyện tập | 10 câu, phản hồi đúng/sai và lời giải ngay sau mỗi câu | Hoàn thành +1, đúng 100% +3 (không cộng dồn) |
| Thi thử | 20 câu / 15 phút, không lộ đáp án trước khi nộp | +1, đúng 100% +3 |
| Thách đấu | 5/10/15 phút (mặc định 10), mỗi người tự đi theo tốc độ của mình | Thắng +3, hoà/thua +1, bỏ trận 0 |
| Điều kiện thưởng | Chỉ người chơi trả lời ít nhất 1 câu mới được thưởng | Mỗi trận thưởng tối đa một lần |

- Lời mời thách đấu hết hạn sau **30 giây**, trận bắt đầu sau **5 giây** khi được nhận lời.
- Kết quả trận do máy chủ quyết định; hoà/so điểm theo số câu đúng giảm dần, sau đó theo số câu sai tăng dần.
- Robot có định danh cố định `00000000-0000-4000-8000-000000000b07`, tên đăng nhập `robot_thach_dau`, ảnh `cu`; câu trả lời của Robot được sinh xác định bằng `sha256("<challengeId>|bot|<index>")`.
- Câu hỏi của 3 lượt gần nhất theo từng chủ đề được ưu tiên tránh; thứ tự phương án được xáo trộn xác định theo phiên/trận.

## Công nghệ

- **Frontend:** HTML5, CSS3, ES Modules, thiết kế mobile-first cho 360/768/1280 px; font Baloo 2 và Be Vietnam Pro.
- **Backend:** Node.js (đang chạy và kiểm thử với Node 24.15.0, `.nvmrc` = 24), Express 5, Zod, `mysql2` pool, JWT trong cookie HttpOnly, Helmet, rate limit.
- **Realtime:** Socket.IO, xác thực bằng cookie, sự kiện cập nhật trận và kết quả.
- **Cơ sở dữ liệu:** MySQL 8.x hoặc MariaDB 10.4+; đã kiểm thử với MariaDB 10.4.32 trong XAMPP.
- **Kiểm thử:** Vitest + Supertest cho backend, Playwright + Chromium cho E2E desktop và 360 px.

## Cấu trúc thư mục

```text
TTTNAVA/
├─ backend/
│  ├─ scripts/              # migrate, sinh/nhập/kiểm tra câu hỏi, tạo admin
│  ├─ seed-data/            # subjects.json + 91 module câu hỏi theo chủ đề
│  ├─ sql/migrations/       # 7 migration SQL
│  ├─ src/
│  │  ├─ config/            # env, mysql2 pool
│  │  ├─ controllers/       # xử lý HTTP
│  │  ├─ middlewares/       # auth, phân quyền, same-origin, rate limit, lỗi
│  │  ├─ realtime/          # Socket.IO và emit sự kiện
│  │  ├─ routes/            # /api/v1/*
│  │  ├─ services/          # nghiệp vụ, chia nhỏ theo miền
│  │  ├─ utils/             # JWT, chuẩn hoá, thời gian, serializers
│  │  └─ validators/        # schema Zod
│  └─ tests/                # 9 file Vitest + fixture/helper
├─ frontend/
│  ├─ assets/{css,js,avatars}/
│  └─ pages/{login,student,admin}/
├─ e2e/                     # 16 test Playwright desktop + mobile
├─ docs/
├─ playwright.config.js
└─ package.json
```

Toàn bộ file JavaScript nghiệp vụ được giữ dưới 200 dòng; các service lớn được tách thành module nhỏ và một file re-export.

## Yêu cầu môi trường

- Node.js **>= 22** (khuyến nghị Node 24 theo `.nvmrc`).
- MySQL **8.x** hoặc MariaDB **10.4+**.
- npm.
- Với XAMPP trên Windows, thêm thư mục `mysql\bin` vào `PATH` hoặc dùng đường dẫn đầy đủ, ví dụ `E:\xampp_server\mysql\bin\mysql.exe`.

## Cài đặt

```powershell
# 1. Cài dependency ở root (Playwright) và backend
npm install
npm --prefix backend install

# 2. Tạo file môi trường
Copy-Item backend/.env.example backend/.env

# 3. Sinh JWT secret mạnh rồi dán vào JWT_SECRET trong backend/.env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"

# 4. Tạo cơ sở dữ liệu chính (migration không tự tạo database)
& 'E:\xampp_server\mysql\bin\mysql.exe' -u root -e "CREATE DATABASE IF NOT EXISTS kids_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 5. Chạy migration, nhập câu hỏi và tạo admin đầu tiên
npm run db:migrate
npm run seed:questions
cd backend
npm run seed:admin -- --username=admin --password="MatKhauManh123" --name="Cô giáo"
cd ..
```

Có thể đặt sẵn `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME` trong `backend/.env` thay cho tham số dòng lệnh. Không commit `backend/.env`.

### Biến môi trường

| Biến | Ý nghĩa |
| --- | --- |
| `NODE_ENV` | `development`, `test` hoặc `production` |
| `PORT` | Cổng HTTP, mặc định `3000` |
| `APP_ORIGIN` | Origin của ứng dụng, mặc định `http://localhost:3000` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` | Kết nối MySQL/MariaDB |
| `DB_POOL_SIZE` | Số kết nối pool, mặc định `10` |
| `JWT_SECRET` | Bắt buộc, tối thiểu 32 ký tự |
| `JWT_EXPIRES_IN` | Thời hạn token, mặc định `7d` |
| `COOKIE_SECURE` | `true` khi chạy HTTPS production |
| `BOOTSTRAP_ADMIN_*` | Chỉ dùng cho script tạo admin đầu tiên |

## Chạy ứng dụng

```powershell
npm run dev     # Express + Socket.IO, tự khởi động lại khi sửa backend
# hoặc
npm start
```

Mở <http://localhost:3000>. Đăng nhập bằng tài khoản admin vừa tạo, sau đó tạo học sinh tại **Quản trị → Học sinh**. Không có màn hình đăng ký công khai.

### Câu hỏi

- Ngân hàng hiện có **3 môn, 91 chủ đề, 5.263 câu hỏi**.
- `npm run validate:questions` kiểm tra cấu trúc, số lượng và tính duy nhất.
- `npm run generate:questions` sinh lại nội dung xác định ở thời điểm phát triển; không gọi AI lúc chạy.

## Kiểm thử

```powershell
# Backend: 9 file, 69 test; tự tạo/migrate/seed database kids_learning_test
cd backend
npx vitest run --config vitest.config.js

# E2E: 16 test trên Chromium desktop + mobile 360 px
cd ..
npx playwright test
```

Lần chạy E2E đầu tiên cần cài Chromium:

```powershell
npx playwright install chromium
```

Playwright tự tạo người dùng `e2e_admin`, `e2e_lan`, `e2e_minh`, storage state trong `e2e/.auth/` và dọn dữ liệu sau khi chạy. Database test được tách khỏi `kids_learning`.

## API và realtime

- Base URL: `/api/v1`.
- Xác thực: cookie `tttnava_token` (HttpOnly, SameSite=Lax).
- Phân quyền: `authenticateToken`, `requireStudent`, `requireAdmin`.
- Mọi thao tác ghi yêu cầu same-origin; request JSON được kiểm tra bằng Zod.
- Socket.IO dùng chung cookie đăng nhập và phát sự kiện `challenge:invite`, `challenge:updated`, `challenge:finished`.

Danh sách endpoint đầy đủ ở [docs/api.md](docs/api.md).

## Bảo mật và độ tin cậy

- Mật khẩu băm bằng bcrypt; không trả `password_hash` ra API.
- Cookie HttpOnly, `Secure` bật được qua biến môi trường; CSP chỉ cho script `'self'`.
- Rate limit đăng nhập 10 lần/phút/IP; các thao tác tạo phiên thi/luyện/thách đấu có giới hạn riêng.
- Máy chủ là nguồn sự thật cho thời gian, đáp án, điểm và kim cương.
- Kết thúc lượt/trận có cơ chế chống ghi trùng; ledger kim cương có ràng buộc duy nhất theo tham chiếu.
- Trạng thái trận được chốt lười sau `endsAt + 1 giây`; bài thi tự nộp sau hạn thêm 5 giây ân hạn.

## Ghi chú vận hành

- Database test `kids_learning_test` do Vitest/Playwright tự tạo và migrate.
- Nếu chạy lại test đăng nhập liên tục trong thời gian ngắn, có thể gặp HTTP 429 do rate limit; chờ một phút hoặc khởi động lại server.
- Khi triển khai production: dùng HTTPS, đặt `COOKIE_SECURE=true`, đổi `JWT_SECRET`, sao lưu database và không dùng tài khoản `root` cho ứng dụng.
- Screenshot tự động và kiểm thử đa trình duyệt/thiết bị thật chưa nằm trong phạm vi bộ test hiện tại.

## Trạng thái nghiệm thu

Xem [docs/acceptance.md](docs/acceptance.md) để biết phạm vi đã kiểm chứng, kết quả lệnh và các mục còn lại.
