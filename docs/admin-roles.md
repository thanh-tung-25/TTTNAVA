# Phân quyền quản trị

Hệ thống phân quyền dùng được với MySQL local và PostgreSQL trên Supabase. Ngày 04/11/2026, người dùng đã yêu cầu cập nhật Git, Supabase và website Vercel.

## Ba phạm vi

| Chức năng | Admin tổng | Admin Tiếng Trung | Admin Tiểu học |
|---|---|---|---|
| Nội dung HSK 1–9, Word, bộ từ, bài kiểm tra, thống kê Tiếng Trung | Có | Có | Không |
| Nội dung Toán, Tiếng Việt, Tiếng Anh lớp 1–5; chương trình, Word, câu hỏi, bài tập tương tác, thống kê | Có | Không | Có |
| Danh sách học sinh | Tất cả | Thuộc chương trình Tiếng Trung | Thuộc chương trình Tiểu học |
| Tạo/sửa tài khoản học sinh, đặt lại mật khẩu, khóa tài khoản | Có | Không | Không |
| Giá khóa, QR thanh toán, duyệt đơn, cấp/thu hồi quyền học | Có | Không | Không |
| Tạo quản trị viên, đổi quyền, khóa, đặt lại mật khẩu quản trị viên, xem nhật ký | Có | Không | Không |

Học sinh vẫn dùng một tài khoản chung và có thể tham gia cả hai chương trình. Khi đó cả hai admin chuyên môn đều thấy học sinh trong danh sách của mình. Danh sách xét đăng ký/quyền học, kể cả lịch sử; tài khoản cũ chưa có đăng ký được phân theo khối lớp. Admin chuyên môn không thấy email và không được sửa tài khoản chung.

Quyền được kiểm tra trên backend cho từng API và trang, không chỉ ẩn menu. Thay đổi phạm vi, khóa tài khoản hoặc đặt lại mật khẩu quản trị viên sẽ hết hạn các phiên đăng nhập quản trị cũ. Không thể khóa hoặc hạ quyền admin tổng cuối cùng đang hoạt động. Muốn thay đổi quyền của chính mình phải nhờ admin tổng khác.

## Dùng trên máy

1. Bật MySQL trong XAMPP. Nếu server đang chạy, dừng bằng `Ctrl+C` và chạy lại `npm start` để nạp mã mới.
2. Đăng nhập bằng tài khoản admin hiện có: tài khoản này giữ quyền **Admin tổng**.
3. Mở mục **Quản trị viên** trên thanh điều hướng, hoặc `/pages/admin/team/`. Tại đây có thể thêm người quản lý, phân quyền, khóa/mở khóa và đặt lại mật khẩu.
4. Hai tài khoản chuyên môn đã được tạo trên MySQL local:
   - `admin_tiengtrung`: vào thẳng trang quản lý Tiếng Trung.
   - `admin_cap1`: vào thẳng trang Nội dung học tập tiểu học.
5. Mật khẩu khởi tạo riêng nằm trong tệp local được Git bỏ qua: `backend/backups/admin-accounts/2026-11-04T09-56-08-772Z.json`. Mở tệp này trên máy để xem; không đưa lên Git. Có thể đặt lại bằng tài khoản admin tổng.

Mục **Nhật ký quản trị** ghi tài khoản, thời điểm và loại thao tác; không lưu mật khẩu hay toàn văn tài liệu Word. Thay đổi tài khoản quản trị và nhật ký tương ứng được lưu trong cùng giao dịch.

## Cơ sở dữ liệu và triển khai sau này

- Migration MySQL `backend/sql/migrations/022_admin_scopes.sql` đã chạy local. Admin cũ mặc định thuộc phạm vi `super`.
- Migration PostgreSQL `backend/sql/postgres/022_admin_scopes.sql` đã áp dụng trên schema ứng dụng Supabase ngày 04/11/2026, trước khi triển khai mã phân quyền. Bản sao hồ sơ trước migration nằm trong thư mục riêng `backend/backups/admin-scopes-supabase/` được Git bỏ qua. Dữ liệu câu hỏi không bị thay thế.
- Khi đưa hai tài khoản chuyên môn lên online, chỉ tạo sau khi website đã chạy mã phân quyền mới. Không đưa mật khẩu vào bản dựng hay Git và không thay thế toàn bộ database online bằng dữ liệu local.
- Helper `node backend/scripts/create-local-program-admins.mjs` chỉ xem trước. Thêm `--apply` mới tạo hai tài khoản local còn thiếu; không đặt lại mật khẩu tài khoản đã tồn tại, và từ chối cơ sở dữ liệu từ xa.

## Kiểm tra

```powershell
npm --prefix backend test -- --pool=threads --reporter=dot
npx playwright test --config playwright.admin-scopes.config.js
```

Kiểm thử API dùng cơ sở dữ liệu test riêng. Kiểm thử giao diện dùng API giả lập, không sửa dữ liệu học sinh local.
