# Trò chuyện học sinh

Giao diện dùng bong bóng tròn và các bề mặt nổi 3D, ảnh đại diện tài khoản, nút gửi/thu nhỏ bằng biểu tượng. Kéo bong bóng bằng chuột hoặc cảm ứng để đổi vị trí; kéo thanh tiêu đề để di chuyển cửa sổ. Vị trí lưu riêng theo tài khoản trên trình duyệt và được giới hạn lại khi đổi kích thước màn hình. Menu dấu ba chấm có nút đưa về vị trí mặc định. Các thao tác chặn, quản lý nhóm, gỡ hoặc báo cáo tin nằm trong menu thay vì hiển thị thành các nút chữ trên màn hình nhắn tin.

Học sinh đăng nhập thấy nút **Trò chuyện** nổi trên các trang sử dụng `initPage`. Bấm **Nhắn riêng** để tìm bạn bằng tên hoặc tên đăng nhập (ít nhất 2 ký tự), hoặc **Tạo nhóm học**, đặt tên và chọn các bạn. Tin nhắn chỉ là văn bản, tối đa 2.000 ký tự, không hỗ trợ tệp đính kèm. Enter gửi, Shift+Enter xuống dòng. Nội dung hiển thị bằng text node, không thực thi HTML hay liên kết.

Tin nhắn và nhóm lưu trong cơ sở dữ liệu, dùng chung giữa các môn/khóa. Tìm kiếm chỉ trả tên hiển thị và tên đăng nhập, không trả email, số điện thoại hoặc thông tin tài khoản khác. Chỉ thành viên mới xem/gửi hoặc báo cáo tin trong phòng. Tin nhắn có mã gửi để thử lại không tạo trùng. Có số tin chưa đọc, xem tin cũ, gỡ tin của mình, chặn và bỏ chặn. Chặn có hiệu lực hai chiều với nhắn riêng; tin nhóm từ người có quan hệ chặn bị lọc khỏi phản hồi API.

Nhóm tối đa 20 người. Trưởng nhóm thêm/bỏ thành viên và đổi tên; thành viên tự rời nhóm. Khi trưởng nhóm rời, quyền được chuyển cho thành viên còn lại theo thứ tự tham gia. Khi người cuối rời nhóm, nhóm được xóa. Thành viên bị bỏ hoặc rời mất quyền truy cập ngay. Chỉ tài khoản học sinh đang hoạt động mới được thêm vào nhóm.

Học sinh báo cáo từng tin nhắn và nhập lý do. Quản trị viên cấp **super** có nút **Báo cáo chat** nổi, xem các tin đã được báo cáo, gỡ tin hoặc đánh dấu đã xử lý. Các admin chỉ phụ trách môn không được xem báo cáo chat. Gỡ tin thay nội dung học sinh thấy bằng thông báo đã gỡ; dữ liệu gốc vẫn có thể được admin xem trong báo cáo. Tính năng không tự động lọc/chấm nội dung trước khi gửi.

Giao diện cập nhật mỗi 4 giây khi mở, mỗi 12 giây khi đóng, ngừng tải khi tab ẩn. Đây là polling HTTP, hoạt động cả khi hosting không hỗ trợ WebSocket; không yêu cầu một máy chủ socket riêng. API giới hạn tần suất gửi, tạo nhóm, tìm kiếm và báo cáo. Chưa có push notification, trạng thái online, ảnh, âm thanh hay cuộc gọi.

## Triển khai

MySQL: `npm run db:migrate` (migration 024). PostgreSQL: áp dụng `backend/sql/postgres/024_student_chat.sql` vào schema ứng dụng trước khi cập nhật backend. Cần cập nhật cả frontend và backend khi đưa lên website online. Các bảng `chat_rooms`, `chat_members`, `chat_messages`, `chat_blocks`, `chat_reports` sử dụng cùng cơ sở dữ liệu tài khoản.

## Kiểm tra

`npm --prefix backend test -- chat.test.js`: đăng nhập, dữ liệu công khai tối thiểu, thành viên, chống gửi trùng, chặn hai chiều, báo cáo/phân quyền quản trị, chuyển trưởng nhóm và thu hồi quyền khi rời nhóm.

`npx playwright test --config playwright.applied.config.js chat-widget.spec.js`: hai phiên học sinh, nhắn qua lại, hiển thị văn bản HTML an toàn, tải lại vẫn có lịch sử, tạo nhóm, danh sách thành viên và bố cục 390px. Kiểm tra trình duyệt dùng API giả lập; backend test dùng cơ sở dữ liệu kiểm thử.
