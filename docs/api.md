# API – TTNAVA

Base URL: `http://localhost:3000/api/v1`

Định dạng thành công:

```json
{ "data": { }, "pagination": { "page": 1, "limit": 20, "total": 0 } }
```

Định dạng lỗi:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu chưa hợp lệ",
    "details": [{ "path": "username", "message": "..." }]
  }
}
```

Các endpoint được ghi "Công khai" và health check không cần cookie. Những endpoint còn lại cần cookie `tttnava_token`. Cookie do server đặt sau khi đăng nhập hoặc xác minh đăng ký; JavaScript phía trình duyệt không đọc được cookie này.

- `401` chưa đăng nhập / token hết hạn.
- `403` sai vai trò hoặc thao tác bị chặn.
- `404` không tìm thấy tài nguyên hoặc không thuộc về người dùng.
- `409` xung đột trạng thái/khóa duy nhất.
- `429` vượt giới hạn tần suất.
- `400` dữ liệu không qua Zod.

## Xác thực

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| POST | `/auth/login` | Công khai | Body `{ username, password }`; đặt cookie, trả profile |
| POST | `/auth/logout` | Công khai | Xoá cookie |
| GET | `/auth/me` | Đã đăng nhập | Profile hiện tại |
| GET | `/auth/registration-status` | Công khai | `{ data: { available } }`, không cache |
| POST | `/auth/register/request-otp` | Công khai | Body `{ email }` Gmail; trả `{ challengeId, expiresIn: 300, resendAfter: 60 }` sau khi gửi được mã |
| POST | `/auth/register` | Công khai | Body `{ challengeId, otp, username, password, displayName, grade?, avatarKey? }`; xác minh mã, tạo học sinh, đặt cookie, trả `201 { data: { profile } }` |

`username`: 3–20 ký tự `a-z`, `0-9`, `_`. `password`: 6–72 ký tự. Đăng nhập giới hạn 10 lần/phút/IP.

Đăng ký có một trang chung `/pages/register/`, không có link mời. OTP không trả qua API; hết hạn sau 5 phút, dùng một lần và tối đa 5 lần thử sai. Mỗi hộp Gmail tối đa 5 lần gửi/giờ, cách nhau ít nhất 60 giây; API gửi còn giới hạn 5 lần/10 phút/IP, xác minh 20 lần/10 phút/IP. Địa chỉ Gmail có dấu chấm hoặc `+tag` dùng chung khóa hộp thư duy nhất. `grade` chỉ nhận số nguyên 1–9 hoặc `null`, mặc định `null`.

Khi chưa cấu hình gửi email, trạng thái `available=false`; yêu cầu hợp lệ trả `503 REGISTRATION_UNAVAILABLE`. Lỗi nhà cung cấp trả `503 MAIL_DELIVERY_FAILED`, mã sai/hết hạn trả `400 INVALID_REGISTRATION_OTP`, Gmail hoặc username đã dùng trả `409`. Không tự cấp quyền khóa học. Học sinh tự đăng ký hiện cho admin tổng và admin Tiếng Trung; không nhận nguồn đăng ký/quyền quản trị do client truyền. Xem [cấu hình Gmail](gmail-registration.md).

## Danh mục

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| GET | `/catalog/subjects` | Đã đăng nhập | Danh sách môn học |
| GET | `/catalog/topics?subjectId=toan&grade=3` | Đã đăng nhập | Chủ đề theo môn/lớp, kèm số câu |
| GET | `/catalog/topics/:id` | Đã đăng nhập | Chi tiết chủ đề |

## Luyện tập

Tất cả yêu cầu vai trò `student`.

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| POST | `/practice` | Body `{ topicId }`; tạo phiên 10 câu |
| GET | `/practice/:id` | Trạng thái phiên |
| POST | `/practice/:id/answers` | Body `{ questionId, answer }`; chấm ngay, trả lời giải |
| POST | `/practice/:id/finish` | Kết thúc, tổng kết và thưởng kim cương |
| GET | `/practice/history?page=1&limit=20` | Lịch sử luyện tập |

Dạng `answer`:

```json
{ "key": "a" }
{ "keys": ["a", "c"] }
{ "value": true }
{ "value": "Hà Nội" }
```

Tạo phiên giới hạn 20 lần/phút. Kết quả gồm `correctCount`, `totalQuestions`, `percent`, `diamondsEarned`, danh sách câu hỏi để xem lại.

## Thi thử

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| POST | `/exams` | Body `{ topicId }`; tạo đề 20 câu / 15 phút |
| GET | `/exams/:id` | Đề và trạng thái, không trả đáp án khi đang thi |
| POST | `/exams/:id/answers` | Lưu tạm `{ questionId, answer }`, không trả đúng/sai |
| POST | `/exams/:id/submit` | Nộp bài và nhận kết quả |
| GET | `/exams/history?page=1&limit=20` | Lịch sử thi |

Tạo đề giới hạn 10 lần/phút. Server tự chốt bài khi hết hạn; client có thêm 5 giây ân hạn để gửi nốt câu đang làm. Câu gửi quá hạn có thể bị từ chối với `EXAM_TIME_UP`.

## Thách đấu

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/challenges/lobby` | Lời mời đến/đi, trận gần đây, trận đang dở |
| POST | `/challenges/invites` | Body `{ opponentUsername, topicId, durationSeconds, grade? }`, tạo lời mời 30 giây |
| POST | `/challenges/robot` | Body `{ topicId, durationSeconds, botLevel }`, tạo trận với Robot |
| GET | `/challenges/:id` | Trạng thái trận và câu hỏi hiện tại của người gọi |
| POST | `/challenges/:id/accept` | Nhận lời, hẹn bắt đầu sau 5 giây |
| POST | `/challenges/:id/decline` | Từ chối lời mời |
| POST | `/challenges/:id/forfeit` | Bỏ trận |
| POST | `/challenges/:id/answers` | Body `{ index, questionId, answer }` |

`durationSeconds` chỉ nhận `300`, `600`, `900`; mặc định `600`. `botLevel` là `easy`, `medium`, `hard`. Tạo lời mời/Robot giới hạn 12 lần/phút.

Phản hồi câu trả lời gồm `feedback` (đúng/sai, đáp án, lời giải) và `state` mới. Server kiểm tra thứ tự câu, thời gian, tư cách người chơi và tự chốt trận sau `endsAt + 1 giây`.

## Kim cương và xếp hạng

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/diamonds/summary` | Tổng kim cương và ledger gần đây |
| GET | `/diamonds/leaderboard?range=week&limit=50&grade=3` | Bảng xếp hạng |

`range`: `week`, `month`, `all` (mặc định `week`). `limit`: 1–100. `grade`: tuỳ chọn 1–5. Không xếp hạng tài khoản bot.

## Quản trị

Tất cả yêu cầu vai trò `admin`.

### Học sinh

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/admin/students?page=1&limit=20&q=lan` | Danh sách/tìm kiếm |
| POST | `/admin/students` | Tạo tài khoản |
| PATCH | `/admin/students/:id` | Sửa tên, lớp, avatar |
| POST | `/admin/students/:id/password` | Body `{ newPassword }` |
| POST | `/admin/students/:id/lock` | Body `{ locked: true/false }` |
| GET | `/admin/students?status=deleted` | Thùng rác học sinh, chỉ admin tổng |
| GET | `/admin/students/:id/deletion-preview` | Kiểm tra đúng học sinh và số dữ liệu liên quan, chỉ admin tổng |
| POST | `/admin/students/:id/deletion-confirmation` | Body `{ username, reason, password, acknowledged: true }`; xác minh admin, trả token xác nhận và thời gian chờ/hết hạn |
| DELETE | `/admin/students/:id` | Body `{ confirmationToken }`; chuyển vào thùng rác, chỉ admin tổng |
| POST | `/admin/students/:id/restore` | Khôi phục học sinh từ thùng rác, chỉ admin tổng |

Các endpoint xóa/khôi phục tương ứng cho admin phụ dùng tiền tố `/admin/team/:id`; danh sách thùng rác dùng `/admin/team?status=deleted`. Mọi tài khoản admin tổng được bảo vệ khỏi xóa. Mặc định danh sách chỉ chứa tài khoản chưa xóa. Xác nhận yêu cầu nhập lại đúng username, lý do 5–500 ký tự, mật khẩu admin hiện tại và `acknowledged: true`; server áp dụng thời gian chờ 5 giây, hạn dùng 5 phút, token một lần gắn với actor và target. Token chỉ lưu băm, không ghi nhật ký. Tài khoản chuyển vào thùng rác không bị xóa dữ liệu lịch sử; khôi phục yêu cầu đăng nhập mới. Xem [phân quyền và xóa an toàn](admin-roles.md).

Tạo học sinh:

```json
{
  "username": "be_lan",
  "password": "MatKhau123",
  "displayName": "Bé Lan",
  "grade": 3,
  "avatarKey": "meo"
}
```

`avatarKey` thuộc: `meo`, `cho`, `tho`, `gau`, `cao`, `cu`, `ech`, `ga`, `voi`, `khi`, `gau-truc`, `ho`.

### Câu hỏi

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/admin/questions?page=1&limit=20` | Danh sách, lọc theo `topicId`, `subjectId`, `grade`, `status`, `type`, `q` |
| GET | `/admin/questions/:id` | Chi tiết đầy đủ, gồm đáp án và lời giải |
| PATCH | `/admin/questions/:id` | Sửa nội dung/trạng thái, ghi audit |
| GET | `/admin/questions/:id/audit` | Lịch sử sửa câu hỏi |

Body PATCH gồm `prompt`, `options`, `answer`, `explanation`, `difficulty`, `imageUrl`, `status`. Sửa câu hỏi chạy trong transaction và ghi `atomic_question_writes`.

### Thống kê

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/admin/stats` | Số học sinh, ngân hàng câu hỏi, lượt luyện/thi, thách đấu, kim cương, top 5 tuần |

## Health check

`GET /api/v1/health` trả trạng thái máy chủ (không cần đăng nhập).

## Socket.IO

Kết nối cùng origin, gửi cookie tự động:

```js
const socket = window.io({ withCredentials: true });
socket.on('realtime:ready', ({ profileId }) => { });
socket.on('challenge:invite', ({ challengeId }) => { });
socket.on('challenge:updated', ({ challengeId }) => { });
socket.on('challenge:finished', ({ challengeId }) => { });
```

Socket từ chối kết nối nếu cookie thiếu/sai, tài khoản bị khoá hoặc là bot. Client gửi `ping:client` để kiểm tra vòng đời; trạng thái trận vẫn được đồng bộ bằng REST để tránh phụ thuộc hoàn toàn vào sự kiện.
