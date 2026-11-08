# Trò chuyện học sinh

## Kết bạn trước khi trò chuyện

Học sinh và mọi tài khoản admin, gồm admin tiếng Trung, đều có khung chat cá nhân. Mục **Bạn bè** cho tìm người theo tên/tên đăng nhập, gửi lời mời, xem lời mời đến/đã gửi, chấp nhận, từ chối, hủy lời mời hoặc hủy kết bạn. Kết quả tìm kiếm thể hiện tài khoản admin, không trả email hay thông tin bí mật. Chỉ người nhận lời mời được chấp nhận; hai người cùng gửi lời mời không tự trở thành bạn.

Nhắn riêng chỉ được tạo và gửi tin sau khi hai bên đã kết bạn. Tạo nhóm và thêm thành viên chỉ được chọn bạn bè đã chấp nhận của người tạo/trưởng nhóm; backend kiểm tra lại từng người. Hủy kết bạn khóa gửi tin mới trong cuộc nhắn riêng, giữ lịch sử. Chặn một người xóa cả quan hệ bạn bè/lời mời; bỏ chặn không tự kết bạn lại. Nhóm đã có giữ quyền theo thành viên nhóm, không tự giải tán khi hai người hủy kết bạn.

Các cuộc trò chuyện cũ không tự chuyển thành quan hệ bạn bè. Sau cập nhật, hai người trong cuộc nhắn riêng cũ phải xác nhận kết bạn để gửi tiếp. Tài khoản admin dùng khung chat cá nhân, còn mục xử lý báo cáo chỉ xuất hiện trong menu của admin tổng và vẫn được backend kiểm tra quyền.

MySQL local đã bổ sung migration `025_chat_friendships.sql`. Với website online, chạy `backend/sql/postgres/025_chat_friendships.sql` trong SQL Editor của đúng project Supabase, sau đó triển khai frontend/backend mới. Có thể chạy lại file tổng hợp `backend/sql/postgres/apply-chat-and-activities.sql` để bổ sung các bảng còn thiếu; kết quả hiện có 7 bảng. Không lấy quan hệ bạn bè từ local để ghi đè dữ liệu online.

API: GET `/api/v1/chat/friends`, PUT `/api/v1/chat/friends/:id` với action `request`, `accept`, `reject`, `cancel`, `remove`. Danh sách phòng trả `friendship` và `can_message` để giao diện khóa ô nhập khi chưa là bạn; API gửi tin kiểm tra độc lập.

Giao diện dùng bong bóng tròn và các bề mặt nổi 3D, ảnh đại diện tài khoản, nút gửi/thu nhỏ bằng biểu tượng. Kéo bong bóng bằng chuột hoặc cảm ứng để đổi vị trí; kéo thanh tiêu đề để di chuyển cửa sổ. Vị trí lưu riêng theo tài khoản trên trình duyệt và được giới hạn lại khi đổi kích thước màn hình. Menu dấu ba chấm có nút đưa về vị trí mặc định. Các thao tác chặn, quản lý nhóm, gỡ hoặc báo cáo tin nằm trong menu thay vì hiển thị thành các nút chữ trên màn hình nhắn tin.

Tài khoản đăng nhập thấy nút **Trò chuyện** nổi trên các trang sử dụng `initPage`. Bấm **Bạn bè** để tìm và kết bạn, **Nhắn riêng** để chọn một bạn đã chấp nhận, hoặc **Tạo nhóm học**, đặt tên và chọn bạn bè. Tin nhắn chỉ là văn bản, tối đa 2.000 ký tự, không hỗ trợ tệp đính kèm. Enter gửi, Shift+Enter xuống dòng. Nội dung hiển thị bằng text node, không thực thi HTML hay liên kết.

Tin nhắn và nhóm lưu trong cơ sở dữ liệu, dùng chung giữa các môn/khóa. Tìm kiếm chỉ trả tên hiển thị và tên đăng nhập, không trả email, số điện thoại hoặc thông tin tài khoản khác. Chỉ thành viên mới xem/gửi hoặc báo cáo tin trong phòng. Tin nhắn có mã gửi để thử lại không tạo trùng. Có số tin chưa đọc, xem tin cũ, gỡ tin của mình, chặn và bỏ chặn. Chặn có hiệu lực hai chiều với nhắn riêng; tin nhóm từ người có quan hệ chặn bị lọc khỏi phản hồi API.

Nhóm tối đa 20 người. Trưởng nhóm thêm/bỏ thành viên và đổi tên; thành viên tự rời nhóm. Khi trưởng nhóm rời, quyền được chuyển cho thành viên còn lại theo thứ tự tham gia. Khi người cuối rời nhóm, nhóm được xóa. Thành viên bị bỏ hoặc rời mất quyền truy cập ngay. Chỉ tài khoản học sinh đang hoạt động mới được thêm vào nhóm.

Người dùng báo cáo từng tin nhắn và nhập lý do. Quản trị viên cấp **super** có mục **Báo cáo chat** trong menu khung chat, xem các tin đã được báo cáo, gỡ tin hoặc đánh dấu đã xử lý. Các admin chỉ phụ trách môn không được xem báo cáo chat. Gỡ tin thay nội dung người dùng thấy bằng thông báo đã gỡ; dữ liệu gốc vẫn có thể được admin xem trong báo cáo. Tính năng không tự động lọc/chấm nội dung trước khi gửi.

Giao diện cập nhật mỗi 4 giây khi mở, mỗi 12 giây khi đóng, ngừng tải khi tab ẩn. Đây là polling HTTP, hoạt động cả khi hosting không hỗ trợ WebSocket; không yêu cầu một máy chủ socket riêng. API giới hạn tần suất gửi, tạo nhóm, tìm kiếm và báo cáo. Chưa có push notification, trạng thái online, ảnh, âm thanh hay cuộc gọi.

## Triển khai

MySQL: `npm run db:migrate` (migration 024). PostgreSQL: áp dụng `backend/sql/postgres/024_student_chat.sql` vào schema ứng dụng trước khi cập nhật backend. Cần cập nhật cả frontend và backend khi đưa lên website online. Các bảng `chat_rooms`, `chat_members`, `chat_messages`, `chat_blocks`, `chat_reports` sử dụng cùng cơ sở dữ liệu tài khoản.

## Kiểm tra

`npm --prefix backend test -- chat.test.js`: đăng nhập, dữ liệu công khai tối thiểu, thành viên, chống gửi trùng, chặn hai chiều, báo cáo/phân quyền quản trị, chuyển trưởng nhóm và thu hồi quyền khi rời nhóm.

`npx playwright test --config playwright.applied.config.js chat-widget.spec.js`: hai phiên học sinh, nhắn qua lại, hiển thị văn bản HTML an toàn, tải lại vẫn có lịch sử, tạo nhóm, danh sách thành viên và bố cục 390px. Kiểm tra trình duyệt dùng API giả lập; backend test dùng cơ sở dữ liệu kiểm thử.
