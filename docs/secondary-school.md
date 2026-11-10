# Khối THCS (cấp 2)

Khối THCS là chương trình riêng (`secondary`), gồm các khóa Lớp 6–9.
Học sinh chọn **THCS** tại trang Khóa học; quyền học vẫn do quản trị viên
mở theo từng khóa. Khóa mới chưa có học phí hay thông tin chuyển khoản;
quản trị viên cấu hình khi cần, hoặc cấp quyền trực tiếp.

## Mục lục Toán 9

Nội dung mục lục lấy từ danh sách người dùng cung cấp, không tự bổ sung
bài học hay câu hỏi. Có 10 chương, 29 bài đánh số và 10 mục **Luyện tập chung**:

- Tập 1 / học kì 1: Chương I–V, Bài 1–15 và 5 mục luyện tập.
- Tập 2 / học kì 2: Chương VI–X, Bài 16–29 và 5 mục luyện tập.
- Luyện tập chung Chương III đứng trước Bài 10; Chương VI đứng trước Bài 19.
- Toán lớp 6–8 hiện có khung khóa học để quản trị viên bổ sung nội dung.

## Ngữ văn 6–9

Mỗi lớp có 2 tập và 10 chủ đề/bài lớn, gồm các mục đọc văn bản, thực hành
tiếng Việt, viết, nói và nghe theo sách **Kết nối tri thức với cuộc sống**.
Khung có 273 mục học: lớp 6 và 7 mỗi lớp 70 mục, lớp 8 có 66 mục, lớp 9 có 67 mục.
Bài 10 là dự án đọc sách; không thêm phần thực hành tiếng Việt khi sách không có.

Tệp người dùng dán có hai danh sách lớp 8 không thống nhất và phần sau số
“9” vẫn ghi lớp 8. Mục lục được đối chiếu lại với sách/tài liệu NXB Giáo dục,
không lấy danh sách lớp 8 đó làm chương trình lớp 9. Nguồn và giới hạn nhập
được ghi ở [lớp 6–7](sources/literature-6-7.md) và [lớp 8–9](sources/literature-8-9.md).
Khung tập trung vào văn bản chính và các mạch học; một số nhiệm vụ được rút
gọn tên hoặc giữ nhãn chung, chưa bao gồm mọi mục tự đọc và ôn tập của sách.
Không chứa toàn văn tác phẩm, câu hỏi, đáp án hoặc lời giải.

Học sinh chọn **THCS → Lớp 6/7/8/9 → Ngữ văn**, sau đó lọc theo tập và bài học.
Quản trị viên chọn lớp, học kì, môn **Ngữ văn**, bài lớn rồi mục học để nhập
Word hoặc tạo câu hỏi/bộ bài tập. Môn này dùng ID nội bộ `tieng-viet` chung
với cấp 1; tên hiển thị theo khối nên Tiếng Việt lớp 1–5 giữ nguyên.

Quản trị viên vào **Nội dung học tập → Lớp 9 → Học kì → Toán → Chương → Bài**
để tạo câu hỏi, nhập Word hoặc tạo bộ bài tập tương tác như ở cấp 1.
Mục luyện tập chung có bài học riêng nên cũng nhận câu hỏi và bộ bài tập.
Câu hỏi nháp phải được kiểm tra và xuất bản trước khi học sinh sử dụng.
Khi chưa đủ câu hỏi, giao diện hiển thị nội dung đang chuẩn bị và không
cho bắt đầu lượt luyện/kiểm tra thiếu câu.

Quản trị viên chương trình **THCS** (`adminScope: secondary`) quản lý nội dung
lớp 6–9; quản trị viên **Tiểu học** quản lý lớp 1–5. Quản trị viên tổng có
thể quản lý cả hai và cấp quyền cho đội ngũ. Luồng luyện tập, thi thử,
thách đấu, phiếu bài tập, sổ câu sai và báo cáo dùng chung hệ thống hiện có,
với quyền truy cập kiểm tra theo khóa học tương ứng.

## Tiếng Anh 6–9

Khung **Global Success** có 12 Unit và 4 Review cho mỗi lớp, tổng cộng
64 nhánh và 151 mục học: lớp 6 có 41 mục, lớp 7 có 36, lớp 8 có 38, lớp 9 có 36.
Mỗi Unit tách nhóm từ vựng và từng điểm ngữ pháp trọng tâm; mỗi Review có
hai mục Language và Skills, đặt sau các Unit 3, 6, 9 và 12.

Học sinh chọn **THCS → Lớp → Tiếng Anh → Học kì → Unit / Review**.
Quản trị viên dùng cây chương trình để nhập Word hoặc tạo câu hỏi/bộ bài tập
đúng mục. Đây là khung mục lục kiến thức cốt lõi, chưa chứa danh sách từ vựng
đầy đủ, bài giảng, câu hỏi hoặc toàn bộ các tiết kỹ năng của sách.

Tệp người dùng có nhiều tên bài và điểm ngữ pháp của sách cũ, nhất là lớp 9.
Các mục được đối chiếu lại; xem nguồn và giới hạn tại
[Tiếng Anh 6–7](sources/english-6-7.md) và [Tiếng Anh 8–9](sources/english-8-9.md).
Nhóm học kì phục vụ điều hướng ứng dụng, không khẳng định sách được xuất bản
thành hai cuốn. Mã môn `tieng-anh` dùng chung, nội dung và quyền học được
tách theo lớp; chương trình Tiếng Anh cấp 1 được giữ nguyên.

## Cập nhật cơ sở dữ liệu

Với MySQL/MariaDB, chạy từ thư mục dự án:

```powershell
npm run db:migrate
npm run db:seed-secondary
```

Migration `027_secondary_school.sql` mở giới hạn lớp đến 9 và thêm loại khóa,
phạm vi quản trị THCS. Seed bổ sung mục lục và khóa học, có thể chạy lại;
không tự tạo câu hỏi, mở quyền học hay thay đổi nội dung cấp 1.

PostgreSQL có migration tương ứng trong `backend/sql/postgres/`.
Áp dụng migration trong schema ứng dụng, sau đó chạy `npm run db:seed-secondary`
với cấu hình PostgreSQL của ứng dụng trước khi triển khai phiên bản mã mới.
Script seed THCS hỗ trợ cả hai hệ cơ sở dữ liệu. Không chạy script
`db:migrate` dành cho MySQL trực tiếp vào PostgreSQL.

## Kiểm thử

```powershell
npm --prefix backend test -- secondary-school.test.js secondary-literature.test.js secondary-english.test.js
npx playwright test --config playwright.secondary.config.js
```

Các kiểm thử tích hợp và trình duyệt chỉ dùng `kids_learning_test`.
