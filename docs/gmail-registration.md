# Đăng ký Gmail và OTP

Chỉ có một trang đăng ký công khai: `/pages/register/`. Học sinh tự đăng ký hiện cho admin tổng và admin Tiếng Trung. Học sinh do admin tổng tạo vẫn riêng tư; tài khoản do admin Tiếng Trung tạo vẫn hiện cho cả hai. Không có link mời hoặc tham số chọn admin.

Tài khoản chỉ được tạo sau khi xác minh OTP. Tài khoản cũ và quyền học giữ nguyên; đăng ký không tự cấp khóa học có phí. Người dùng tiếp tục đăng nhập bằng tên đăng nhập và mật khẩu.

Admin tổng và admin Tiếng Trung vào **Học sinh** để xem cột **Gmail**, trạng thái và thời điểm xác minh, cùng nguồn tự đăng ký/admin tạo. Ô tìm kiếm hỗ trợ Gmail trong đúng phạm vi học sinh được xem. Tài khoản cũ dùng địa chỉ nội bộ `.invalid` hiển thị **Chưa có Gmail**. Thông tin này lấy từ hồ sơ đã lưu; không cần yêu cầu người dùng xác minh lại hoặc chuyển dữ liệu.

## Gửi miễn phí qua Gmail

1. Dùng một Gmail riêng do chủ website quản lý.
2. Bật [xác minh hai bước](https://myaccount.google.com/security), rồi tạo [mật khẩu ứng dụng](https://myaccount.google.com/apppasswords). Dùng mật khẩu ứng dụng, không dùng mật khẩu đăng nhập Gmail. Một số loại tài khoản Google không hỗ trợ mật khẩu ứng dụng.
3. Vào dự án `tttnava-backend` trên Vercel → Settings → Environment Variables. Thêm các giá trị sau cho **Production**:

| Tên biến | Giá trị |
|---|---|
| `REGISTRATION_ENABLED` | `true` |
| `REGISTRATION_MAIL_PROVIDER` | `gmail` |
| `GMAIL_USER` | Địa chỉ Gmail gửi thư của website |
| `GMAIL_APP_PASSWORD` | Mật khẩu ứng dụng 16 ký tự vừa tạo |

4. Redeploy bản Production sau khi lưu. Không đưa mật khẩu ứng dụng vào Git, mã nguồn hay tin nhắn.
5. Mở `/pages/register/`, yêu cầu mã tới Gmail bạn kiểm soát, nhập mã và kiểm tra tài khoản xuất hiện ở cả hai admin. Cấu hình có đủ biến chỉ xác nhận dịch vụ sẵn sàng thử gửi; kết nối thực tế vẫn có thể bị Google từ chối.

Không cần mua tên miền cho phương án Gmail. Đây là lựa chọn cho lượng gửi nhỏ: Gmail có hạn mức gửi và có thể tạm chặn kết nối tự động. Tham khảo [Google về mật khẩu ứng dụng](https://support.google.com/accounts/answer/185833), [hạn mức gửi Gmail](https://support.google.com/mail/answer/22839), [Nodemailer với Gmail](https://nodemailer.com/guides/using-gmail), [SMTP trên Vercel](https://vercel.com/kb/guide/serverless-functions-and-smtp).

## Dịch vụ thay thế

Có thể đặt `REGISTRATION_MAIL_PROVIDER=resend`, `RESEND_API_KEY` và `REGISTRATION_FROM_EMAIL` cùng `REGISTRATION_ENABLED=true`. Resend yêu cầu tên miền gửi đã xác minh để gửi cho người dùng thật; miền thử chỉ gửi tới chủ tài khoản. [Tài liệu Resend](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

## Triển khai và vận hành

Chạy migration `030_public_registration.sql` trước khi triển khai mã mới. MySQL dùng `npm run db:migrate`; PostgreSQL trên cấu hình Supabase hiện tại dùng `node --use-system-ca backend/scripts/release-school.mjs --apply --schema-only`. Không thay đổi giá trị JWT hiện có khi bật gửi email.

OTP chỉ lưu mã HMAC, hết hạn sau 5 phút, dùng một lần và khóa sau 5 lần nhập sai. Mỗi hộp Gmail chờ ít nhất 60 giây giữa các lần gửi, tối đa 5 lần/giờ; endpoint còn giới hạn theo IP. Mã mới thay thế mã cũ sau khi nhà cung cấp chấp nhận gửi. Lỗi gửi không tạo challenge mới có hiệu lực. OTP và bộ đếm nằm trong database để dùng nhất quán giữa các Vercel Functions.

Gmail được chuẩn hóa chữ thường, dấu chấm và phần `+tag` cho khóa duy nhất của hộp thư; địa chỉ người dùng nhập được giữ để gửi thư. Ràng buộc UNIQUE và transaction bảo vệ việc đăng ký đồng thời. Không chấp nhận email khác `@gmail.com` ở luồng này.

Khi chưa cấu hình email, trang thông báo đăng ký tạm chưa khả dụng; API không tạo tài khoản hoặc giả vờ gửi mã. Có thể tạm dừng đăng ký bằng `REGISTRATION_ENABLED=false` rồi redeploy, không ảnh hưởng đăng nhập hiện có. Nếu dịch vụ gửi lỗi, người dùng nhận thông báo thử lại, không nhận thông tin nhạy cảm từ nhà cung cấp.

Định kỳ dọn các dòng `registration_otps` quá hạn lâu, ví dụ hết hạn trên 7 ngày. Chỉ xóa challenge hết hạn; không xóa hồ sơ học sinh hoặc dùng challenge hết hạn làm căn cứ thay đổi email tài khoản.
