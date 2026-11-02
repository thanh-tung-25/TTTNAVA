# Khóa học và xác nhận thanh toán

Học sinh đăng nhập vào `/pages/student/courses/`, chọn Tiểu học hoặc Tiếng Trung. Mọi tài khoản đều xem được 14 khóa. Khóa chưa được cấp quyền chỉ mở trang giới thiệu; bài học và API được kiểm tra quyền ở máy chủ.

## Giá ban đầu

- Lớp 1–5: 250.000đ / mỗi lớp, vĩnh viễn, gồm các môn tiểu học và chức năng luyện tập, thi thử, thách đấu theo lớp.
- HSK 1–9: lần lượt 1.000.000đ–9.000.000đ / cấp. Hiện để vĩnh viễn; admin có thể chỉnh thời hạn.
- Giá và thời hạn được chốt vào đơn khi gửi. Sửa cấu hình khóa không thay đổi đơn đã gửi hoặc quyền đã cấp.

## Vận hành

1. Chạy `npm run db:migrate` rồi khởi động lại backend.
2. Vào **Quản trị → Khóa học & thanh toán** (`/pages/admin/courses/`).
3. Nhập hướng dẫn chuyển khoản thực tế: ngân hàng, tài khoản, chủ tài khoản, mẫu nội dung chuyển tiền; áp dụng cho các khóa hoặc sửa riêng từng khóa.
   Trong tab **QR & học phí**, ở mục **Ảnh QR của bạn**, tải ảnh QR từ ứng dụng ngân hàng (PNG/JPEG/WebP, tối đa 2 MB). Chọn QR chung hoặc QR riêng cho từng khóa; QR riêng được ưu tiên. QR được lưu trong database, không cần dịch vụ QR bên ngoài.
4. Học sinh/phụ huynh chuyển tiền theo hướng dẫn rồi gửi tên người chuyển, mã/nội dung giao dịch, ghi chú.
5. Admin đối soát trong ngân hàng và ở mục **Duyệt đăng ký** bấm **Mở khóa**; có thể thêm ghi chú, hoặc dùng ghi chú xác nhận mặc định. Hệ thống không xác minh giao dịch ngân hàng tự động.
6. Học sinh bấm **Cập nhật** hoặc tải lại trang chọn khóa, sau đó **Vào học**. Có thể dùng **Đổi khóa** để chuyển sang khóa khác.

Chưa có hướng dẫn chuyển khoản thì chưa nhận đăng ký. Yêu cầu chờ duyệt không cấp quyền. Mỗi người chỉ có một yêu cầu đang chờ cho mỗi khóa; hủy hoặc từ chối xong có thể đăng ký lại. Việc duyệt và cấp quyền nằm trong cùng transaction, chống duyệt trùng. Từ chối cần ghi lý do; học sinh xem được phản hồi của chính mình.

Một tài khoản có thể sở hữu đồng thời nhiều khóa ở cả Tiểu học và Tiếng Trung. Mỗi khóa có yêu cầu và trạng thái riêng. Mua thêm không thu hồi quyền hoặc xóa tiến độ ở khóa cũ. Trong khóa đang học, bấm **Đổi khóa** để chọn hoặc đăng ký khóa khác.

Số yêu cầu chờ duyệt được hiển thị trên menu admin **Khóa học & thanh toán**, cập nhật mỗi 30 giây khi trang đang hiển thị. Admin mở trang này, bấm **Cập nhật** để xem đầy đủ người gửi, khóa, tiền, mã/nội dung giao dịch và ghi chú. Không gửi email/SMS và không yêu cầu ứng dụng ngân hàng kết nối website trong chế độ này.

Ảnh QR tĩnh chỉ chứa thông tin do admin cung cấp; website không tự sửa số tiền hoặc nội dung trong ảnh. Màn hình thanh toán hiển thị riêng số tiền và nội dung gợi ý `TTNAVA <tên đăng nhập> <mã khóa>` để phụ huynh nhập trong ứng dụng ngân hàng. Tiền đi trực tiếp tới ngân hàng của admin, không đi qua website. Admin phải đối chiếu người nhận, số tiền và giao dịch thực tế trước khi mở khóa. Để xác nhận tự động cần tích hợp dịch vụ thanh toán/ngân hàng có thông báo giao dịch được xác thực; tải QR lên không tạo ra kết nối đó.

Duyệt đăng ký tự động cấp quyền, không cần nhập lại thông tin học sinh. Tab Quyền học hiển thị các khóa đã mở và nút Thu hồi cho từng dòng; form cấp quyền thủ công đã được bỏ khỏi giao diện. Admin vẫn có thể đặt thời hạn hoặc tạm ngừng khóa trong cấu hình khóa. Thay đổi quyền và kết quả xét duyệt được lưu nhật ký. Khi hết hạn/thu hồi, API nội dung, thẻ, quiz, đáp án, bài luyện và bài thi bị chặn; lịch sử kết quả vẫn được giữ.

## Tài khoản cũ

Migration 014 chỉ chạy một lần: giữ khóa đúng lớp hiện tại cho học sinh tiểu học; giữ HSK 1–9 cho tài khoản Tiếng Trung cũ để không mất quyền đang có. Các quyền này có nguồn `legacy` trong admin. Tài khoản mới không tự được cấp khóa. Admin có thể thu hồi quyền cũ nếu cần chuyển sang trả phí. Không xóa lịch sử, điểm hay kim cương.

## Kiểm thử

- `npm test`: backend, gồm phân quyền, đóng băng giá đơn, duyệt trùng, thu hồi/hết hạn, truy cập trực tiếp và bảo vệ nội dung.
- `npm run test:student-ui`: giao diện học sinh với API giả lập.
- `npm run test:courses`: đăng nhập → chọn khóa → gửi yêu cầu → admin duyệt → vào học lớp khác lớp hồ sơ → thu hồi. Chạy trên `kids_learning_test`, cổng 3110, không giao dịch tiền thật. Cần chạy `npm test` trước để chuẩn bị schema test.

`.env` không được đưa lên Git. Môi trường triển khai cần chạy migration trên database riêng và cấu hình hướng dẫn thanh toán trước khi nhận đăng ký.
# Hiển thị QR và cửa sổ thanh toán

Migration `019_payment_qr_crop.sql` thêm `course_payment_qr.crop_json` để chỉ
hiển thị vùng mã QR của ảnh chụp màn hình. Ảnh gốc trong cơ sở dữ liệu giữ nguyên;
giao diện cắt khung nhìn bằng tọa độ, không vẽ lại mã. Tải ảnh mới sẽ xóa tọa độ
của ảnh cũ để tránh cắt sai. Khóa có QR riêng dùng đúng tọa độ của QR riêng,
không dùng nhầm tọa độ của QR chung.

Cửa sổ đăng ký khóa học chia QR và thông tin chuyển khoản thành hai cột trên
máy tính, một cột trên điện thoại. Ghi chú là phần thu gọn không bắt buộc.
Luồng gửi yêu cầu và xác nhận thủ công bởi admin giữ nguyên.
