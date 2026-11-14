# Kiến trúc – TTNAVA

## 1. Tổng quan

Ứng dụng là một khối Node.js phục vụ cả API và file tĩnh:

```text
Trình duyệt
  ├─ HTML/CSS/ES Modules tại frontend/
  ├─ REST /api/v1/*  ─────────────┐
  └─ Socket.IO (cookie auth) ─────┤
                                  ▼
                        Express + Socket.IO
                                  │
                   services (nghiệp vụ, transaction)
                                  │
                        mysql2 pool (UTC)
                                  │
                         MySQL / MariaDB
```

Không có build step cho frontend. Mỗi trang là một HTML tĩnh, nạp module ES tương ứng. Express giới hạn route trang theo vai trò, kiểm tra cookie trước khi trả file.

## 2. Phân lớp backend

| Lớp | Trách nhiệm |
| --- | --- |
| `routes/` | Khai báo endpoint, middleware xác thực/phân quyền/rate limit |
| `controllers/` | Parse Zod, gọi service, trả JSON |
| `services/` | Nghiệp vụ, transaction, kiểm tra quyền sở hữu, tính điểm/thời gian |
| `realtime/` | Xác thực socket, room theo người dùng, phát sự kiện |
| `config/db.js` | Pool `mysql2`, `SET time_zone = '+00:00'` |
| `middlewares/` | `authenticateToken`, `requireStudent`, `requireAdmin`, same-origin, rate limit, lỗi |
| `validators/` | Schema Zod dùng chung |
| `utils/` | JWT, thời gian, chuẩn hoá, serializers, lỗi ứng dụng |

Các miền lớn được tách thành module dưới 200 dòng. File `*-service.js` đóng vai trò facade re-export, ví dụ:

- `practice-service.js` → `practice-state`, `practice-answer`, `practice-finish`, `practice-history`.
- `exam-service.js` → `exam-constants`, `exam-state`, `exam-finalize`, `exam-history`.
- `admin-service.js` → `admin-students`, `admin-questions`, `admin-question-write`.

## 3. Xác thực và phân quyền

- Đăng nhập bằng username/password; mật khẩu băm bcrypt.
- Server ký JWT chứa `sub` (profile id), `role`, `username`; đặt trong cookie HttpOnly `tttnava_token`.
- `authenticateToken` đọc cookie, xác minh chữ ký, đối chiếu profile hiện tại và kiểm tra tài khoản bị khoá.
- `requireStudent` / `requireAdmin` chặn sai vai trò.
- Trang HTML được bảo vệ bằng middleware tương tự API; người chưa đăng nhập bị chuyển về `/pages/login/`.
- Tự đăng ký bị vô hiệu hoá; admin tạo tài khoản học sinh.
- Rate limit trong bộ nhớ: đăng nhập 10/phút/IP; tạo phiên luyện 20/phút; tạo đề 10/phút; lời mời/Robot 12/phút.
- Thao tác ghi kiểm tra same-origin để giảm CSRF; CSP chỉ cho script `'self'`.

Socket.IO dùng chung cookie, xác thực ở middleware `io.use`, tham gia room `user:<profileId>`. Bot không được kết nối socket.

## 4. Mô hình dữ liệu

| Nhóm | Bảng |
| --- | --- |
| Tài khoản | `profiles` |
| Danh mục | `subjects`, `topics` |
| Chương trình | `school_years`, `curriculum_chapters`, `curriculum_lessons` |
| Câu hỏi | `questions`, `question_options`, `question_answers`, `atomic_question_writes` |
| Luyện tập | `practice_sessions`, `practice_questions`, `practice_answers` |
| Thi thử | `exam_attempts`, `exam_questions`, `exam_answers` |
| Lịch sử thưởng cũ | `challenges`, `challenge_answers`, `challenge_rewards` |
| Kim cương | `diamond_ledger` |
| Hạ tầng | `schema_migrations`, `finish_guard` |

Điểm đáng chú ý:

- ID chính là UUID/chuỗi; câu hỏi và chủ đề dùng ID ổn định từ seed.
- Thời gian lưu UTC (`DATETIME(3)`), server là nguồn thời gian duy nhất.
- `diamond_ledger` có ràng buộc duy nhất theo `(profile_id, ref_type, ref_id)` để chống cộng thưởng hai lần.
- `finish_guard` hỗ trợ chốt lượt/trận idempotent khi có request đồng thời.
- `atomic_question_writes` lưu `before_json`, `after_json`, admin và hành động (`update`, `hide`, `show`).

## 5. Cây chương trình, soạn và nhập câu hỏi

- `seed-data/subjects.json` mô tả 3 môn; `topics.json` mô tả 91 chủ đề.
- `seed-data/curriculum.json` ánh xạ 91 chủ đề vào 1 năm học, 30 chương và 91 bài học. Bài học liên kết `curriculum_lessons.topic_id` tới `topics.id`; câu hỏi vẫn liên kết qua `questions.topic_id`.
- `seed-catalog.js` dùng transaction + `ON DUPLICATE KEY UPDATE` để đồng bộ danh mục; không nhập câu hỏi mẫu.
- `curriculum-service.js` dựng cây năm → lớp → học kỳ → môn → chương → bài học, đếm câu và câu đã đăng bằng SQL.
- `curriculum-scope.js` xác minh tổ hợp phạm vi; API danh sách bắt buộc `chapterId` hoặc `lessonId` (hoặc `topicId` tương thích) và trả `SCOPE_REQUIRED`, `SCOPE_NOT_FOUND`, `SCOPE_MISMATCH` khi cần.
- Admin tạo/sửa câu hỏi theo đúng bài học; form tải cấp con từ cây và loại bỏ lựa chọn không hợp lệ khi đổi cấp trên.
- Nhập Word đọc `.docx` theo mẫu, cho admin xem/sửa, rồi lưu tất cả ở trạng thái **Nháp**; không tự đăng.
- AI là tuỳ chọn, mặc định tắt, chỉ chạy khi admin chủ động bấm nút; kết quả vẫn là bản nháp.
- Nội dung hỗ trợ 4 loại: `single_choice`, `multiple_choice`, `true_false`, `fill_in`.

## 6. Luồng luyện tập

1. `POST /practice` chọn 10 câu từ chủ đề, ưu tiên tránh câu của 3 lượt gần nhất, xáo phương án xác định.
2. Mỗi câu trả lời được chấm ngay; lưu `practice_answers`, trả đáp án + lời giải.
3. `POST /practice/:id/finish` tổng kết, tính điểm, thưởng một lần qua ledger, trả danh sách câu để xem lại.
4. Mức khen: 100% / ≥70% / ≥40% / dưới 40%.

## 7. Luồng thi thử

1. `POST /exams` tạo 20 câu, hạn 15 phút, lưu `started_at`, `ends_at`, `deadline`.
2. Client lưu tạm từng câu; API không trả đáp án đúng.
3. Hết hạn, server tự chốt; client có 5 giây ân hạn để gửi câu cuối.
4. `POST /exams/:id/submit` tính điểm, thưởng, trả toàn bộ đáp án/lời giải.
5. Lịch sử thi hiển thị cả kim cương của từng lượt.

## 8. Điều hướng bài kiểm tra

Nút thứ ba là **Bài kiểm tra**. Tiểu học/THCS mở `/pages/student/exam/`; Tiếng Trung mở `/pages/student/chinese/?view=tests`. Các trang chơi, API, dịch vụ Robot, lời mời đấu bạn và thử thách tuần đã được xóa. Dữ liệu phần thưởng đã ghi trước đây được giữ để đối chiếu lịch sử và tổng kim cương.

## 9. Frontend

- `ui-core.js`: header, điều hướng, profile, chip kim cương.
- `ui-modal.js`: modal, xác nhận, trạng thái busy, hiển thị lỗi.
- `ui-content.js`: nhãn loại câu, định dạng đáp án, trạng thái rỗng, lời khen.
- `ui.js` re-export để các trang dùng một điểm vào.
- Mỗi trang lớn tách context (state + DOM), render, actions, realtime/event.
- Ngân hàng câu hỏi admin tách `admin-questions-context`, `admin-questions-tree`, `admin-questions-list`, `admin-question-editor`, `admin-question-form`, `admin-questions-import`.
- API wrapper tự xử lý JSON, lỗi và chuyển hướng khi phiên hết hạn.
- CSS mobile-first; avatar SVG tĩnh; không có framework UI.

## 10. Kiểm thử

- **Vitest + Supertest:** 12 file, 93 test; database `kids_learning_test` tạo riêng, migrate/seed trong global setup.
- **Playwright:** 22 test, project desktop Chromium và mobile 360 px; storage state được sinh từ token để tránh rate limit đăng nhập.
- Test bao phủ: auth, catalog, practice, exam, socket auth, admin, thống kê, kim cương/xếp hạng, bất biến ngân hàng câu hỏi và tiện ích.
- Quy ước tên test: `test_<hệ thống>_<tình huống>_<kết quả>`.

Chi tiết lệnh và kết quả ở [acceptance.md](acceptance.md).
