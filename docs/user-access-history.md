# Lịch sử truy cập từng tài khoản

Admin mở **Lịch sử truy cập** trong menu hoặc **Học sinh → Lịch sử truy cập** ở dòng người cần xem. Tìm theo tên/tên đăng nhập, chọn tài khoản và lọc nhật ký theo loại hoạt động hoặc khoảng ngày. Giờ hiển thị cố định theo Việt Nam (UTC+7).

Nhật ký gồm đăng nhập thành công, đăng xuất có xác thực, các trang HTML được mở sau khi qua kiểm tra đăng nhập và quyền học; hiển thị thời điểm, tên trang, khóa đang mở, loại thiết bị và nhóm trình duyệt. Cùng tài khoản mở lại cùng trang/khóa/trình duyệt trong một phút được gộp thành một mục với bộ đếm và thời điểm truy cập cuối cùng. Tài khoản chưa có bản ghi hiện **Chưa ghi nhận**, không bị kết luận là chưa từng vào web.

Đây là nhật ký yêu cầu mở trang, không phải công cụ xác nhận đang online hay đo chính xác thời gian học. Thao tác trong một trang không tải lại, khôi phục trang từ bộ nhớ trình duyệt hoặc chỉ chuyển tab có thể không tạo mục mới. Ghi nhận trên server trước khi gửi HTML, không phụ thuộc JavaScript theo dõi của học sinh. Không ghi tài nguyên JS/CSS, API thông thường, trang 404, chuyển hướng khóa học bị chặn hoặc yêu cầu prefetch.

## Quyền xem

- Admin tổng: tài khoản học sinh/phụ huynh và quản trị viên; có thể mở nhật ký của tài khoản đã xóa mềm khi có liên kết trực tiếp.
- Admin Tiếng Trung: học sinh thuộc phạm vi quản lý/xác minh nguồn tạo và chương trình theo quy tắc hiện có; không xem nhật ký admin hoặc học sinh riêng của nhóm khác.
- Admin Tiểu học/THCS: học sinh thuộc chương trình tương ứng.
- Học sinh và người chưa đăng nhập không được đọc API nhật ký. Phạm vi được kiểm tra trên server ở cả danh sách và URL tài khoản, không chỉ ẩn nút ở giao diện.

## Dữ liệu và dung lượng

Hai bảng mới: user_access_tracking lưu thời điểm bật và lần dọn; user_access_events lưu metadata truy cập, có khóa ngoại xóa theo tài khoản khi xóa hẳn. Xóa mềm/khôi phục tài khoản vẫn giữ nhật ký.

Không lưu mật khẩu, token đăng nhập, query string, URL nguồn đầy đủ, địa chỉ IP, User-Agent gốc, nội dung chat AI, câu trả lời hay audio/video. Tên trang lấy từ danh sách cố định; hệ thống chỉ suy ra nhóm thiết bị/trình duyệt từ User-Agent rồi bỏ chuỗi gốc.

Chỉ hiển thị 90 ngày gần nhất. Khi web được dùng, cơ chế bảo trì kiểm tra tối đa một lần/ngày theo từng tiến trình và dùng cột DB để giành lượt dọn mỗi 24 giờ. Mỗi lượt xóa tối đa 2.000 bản ghi cũ hơn 90 ngày. Không có cron: nếu web không nhận truy cập, dữ liệu vật lý có thể còn đến lần dọn kế tiếp. Backup DB vẫn theo chính sách vận hành riêng. API vẫn lọc cửa sổ 90 ngày kể cả khi chưa dọn vật lý.

Không thể khôi phục những lần đăng nhập/truy cập trước khi bật tính năng. Giao diện ghi rõ thời điểm bắt đầu từ user_access_tracking.enabled_at. Lỗi ghi nhật ký không chặn đăng nhập hoặc tải trang, chỉ ghi một thông báo kỹ thuật không chứa dữ liệu người dùng.

## Cài đặt

1. MySQL XAMPP: npm --prefix backend run db:migrate (037_user_access_history.sql).
2. PostgreSQL: node --use-system-ca backend/scripts/prepare-access-history-postgres.mjs để xem trước, thêm --apply để chỉ tạo schema trong đúng project/schema đã xác định. Không chèn bản ghi người dùng hoặc dữ liệu thử.
3. Chỉ đẩy code/triển khai khi chủ web cho phép. Kiểm tra build yêu cầu cả hai bảng mới trước khi phát hành. Không cần khóa API, dịch vụ AI hay phần mềm ngoài.
4. Nhật ký bắt đầu có khi người dùng thực tế đăng nhập/mở trang sau lúc bản mới chạy. Không tạo giả lịch sử cũ.

Kiểm thử: backend/tests/user-access-history.test.js; auth.test.js và admin-scopes.test.js; npx playwright test --config playwright.access-history.config.js. UI dùng API stub, không ghi dữ liệu Production.
