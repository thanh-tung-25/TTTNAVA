# Phân quyền quản trị

Hệ thống phân quyền dùng được với MySQL local và PostgreSQL trên Supabase. Ngày 04/11/2026, người dùng đã yêu cầu cập nhật Git, Supabase và website Vercel.

## Các phạm vi

| Chức năng | Admin tổng | Admin Tiếng Trung | Admin Tiểu học | Admin THCS |
|---|---|---|---|---|
| Nội dung HSK 1–9, Word, bộ từ, bài kiểm tra | Có | Có | Không | Không |
| Nội dung, câu hỏi, bài tập và thống kê lớp 1–5 | Có | Không | Có | Không |
| Nội dung, câu hỏi, bài tập và thống kê lớp 6–9 | Có | Không | Không | Có |
| Danh sách học sinh | Tất cả | Do admin Tiếng Trung tạo hoặc được giao rõ ràng cho phạm vi Tiếng Trung | Thuộc Tiểu học | Thuộc THCS |
| Tạo tài khoản học sinh | Có | Chỉ tài khoản Tiếng Trung, không có khối lớp | Không | Không |
| Sửa tài khoản học sinh, đặt lại mật khẩu, khóa tài khoản | Có | Không | Không | Không |
| Giá khóa, QR thanh toán, duyệt đơn, cấp/thu hồi quyền học | Có | Không | Không | Không |
| Quản lý quản trị viên và xem nhật ký | Có | Không | Không | Không |

Học sinh vẫn dùng một tài khoản chung và có thể tham gia nhiều chương trình.
Danh sách xét đăng ký/quyền học, kể cả lịch sử; tài khoản cũ chưa có đăng ký
được phân theo khối lớp. Admin chuyên môn không thấy email và không được
sửa tài khoản chung. Admin Tiếng Trung có thể tạo tài khoản học sinh mới và
chịu thêm quy tắc riêng tư theo phạm vi quản lý dưới đây.

## Tạo tài khoản học sinh Tiếng Trung

Admin Tiếng Trung có nút **Thêm học sinh** trong danh sách học sinh.
Biểu mẫu cố định chương trình Tiếng Trung, chỉ gửi `grade: null` và không
cho chọn lớp 1–9. Backend cũng từ chối khối lớp phổ thông khi người tạo là
admin Tiếng Trung. Tài khoản mới được ghi nguồn tạo và phạm vi quản lý
Tiếng Trung từ tài khoản admin đang đăng nhập, rồi xuất hiện ngay trong
danh sách của admin Tiếng Trung, kể cả khi chưa được cấp khóa HSK.
Tìm kiếm cũ được xóa và danh sách trở về trang đầu sau khi tạo thành công.

Việc tạo tài khoản không tự cấp quyền học khóa có phí. Quyền sửa hồ sơ,
đặt lại mật khẩu, khóa/mở khóa và cấp/thu hồi quyền học vẫn thuộc admin tổng.

## Học sinh riêng do admin tổng tạo

Từ phiên bản ngày 10/11/2026, tài khoản học sinh được tạo qua API ghi nhận
`student_created_by` và phạm vi của người tạo tại thời điểm tạo trong
`student_creator_scope`. Các giá trị do server lấy từ tài khoản đăng nhập;
không nhận người tạo hay phạm vi giả từ dữ liệu gửi lên. Chúng không xuất hiện
trong hồ sơ công khai. Đổi lớp, cấp HSK, đổi quyền hoặc xóa người tạo không
làm thay đổi phạm vi đã ghi nhận.

Phạm vi quản lý nằm riêng trong `student_management_scope`. Quy tắc hiển
thị xét `COALESCE(student_management_scope, student_creator_scope)`:
giá trị `chinese` cho phép admin Tiếng Trung thấy học sinh. Tài khoản mới
nhận phạm vi quản lý của người tạo; tài khoản cũ chưa được gán riêng tiếp
tục dùng nguồn tạo đã xác minh. Việc giao học sinh cho phạm vi Tiếng Trung
là thao tác quản trị chủ động đã được cho phép, không suy đoán từ tên tài
khoản, khối lớp hoặc đăng ký HSK. Gán phạm vi quản lý không viết lại
`student_created_by` hay `student_creator_scope`.

Admin Tiếng Trung không thấy học sinh do admin tổng tạo và chưa được giao
cho phạm vi Tiếng Trung, kể cả học sinh chỉ học HSK. Học sinh được giao rõ
ràng cho Tiếng Trung xuất hiện trong danh sách, tìm kiếm và chat mà vẫn
giữ nguyên nguồn tạo, mật khẩu, lịch sử và quyền học. Quy tắc áp dụng cho
danh sách, tìm kiếm, tổng số/phân trang, tiến độ,
thống kê lượt làm bài, phản ánh, tìm bạn, lời mời, danh sách chặn và chat.
Phòng chat cũ có người bị ẩn ở chủ phòng, thành viên hoặc lịch sử người gửi
được ẩn khỏi admin Trung. Truy cập trực tiếp tài nguyên bị ẩn trả 404 giống
tài nguyên không tồn tại; lời mời từ học sinh riêng tới admin Trung cũng bị chặn.
Admin tổng vẫn quản lý và học sinh vẫn đăng nhập, học các khóa được mở bình thường.

Migration 028 chỉ xác minh tài khoản cũ từ sự kiện tạo đầu tiên
`POST /api/v1/admin/students` trong nhật ký và phạm vi lưu cùng sự kiện đó.
Không suy đoán người tạo từ lớp học, quyền HSK hoặc người cấp khóa. Tài khoản
cũ không có bằng chứng nguồn tạo giữ giá trị NULL và được ẩn khỏi admin
Trung nếu chưa được giao rõ ràng cho phạm vi Tiếng Trung. Migration 029
thêm trường quản lý riêng, không tự giao tài khoản cũ và không đổi nguồn tạo.

Chạy `npm run db:migrate` trên MySQL/MariaDB để áp dụng
`028_student_privacy.sql` và `029_student_management_scope.sql`.
PostgreSQL có hai migration tương ứng trong
`backend/sql/postgres/`, cần áp dụng vào schema ứng dụng trước khi triển khai mã mới.

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
npm --prefix backend test -- --pool=threads student-privacy.test.js
npx playwright test --config playwright.student-privacy.config.js
```

Kiểm thử API và giao diện riêng tư dùng cơ sở dữ liệu test riêng; các tài
khoản kiểm thử được xóa sau khi chạy. Bộ giao diện phân quyền dùng API
giả lập. Các bộ này không sửa dữ liệu học sinh local.
