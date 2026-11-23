# Quản trị nội dung Tiểu học, THCS và THPT

Cập nhật: 23/11/2026. Điểm vào: **Admin → Nội dung học tập** (`/pages/admin/questions/`).

Chọn **cấp học → lớp → môn**, sau đó mở một trong ba mục bên dưới. Tài khoản phụ trách một cấp chỉ thấy và sửa nội dung trong cấp được giao. Admin tổng có thể chuyển cả ba cấp.

## Bài học

Mỗi thẻ bài có bốn lối vào giống cách học sinh học:

| Phần | Cách thêm và nơi xuất hiện |
| --- | --- |
| Cần nhớ / công thức | Soạn mục kiến thức, công thức, điều kiện áp dụng và những chỗ dễ nhầm; hiển thị trong Bài học. |
| Ví dụ hướng dẫn | Soạn đề ví dụ và cách làm; hiển thị trong phần Ví dụ của bài. |
| Quiz theo bài | Thêm từng câu hoặc nhập Word vào ngân hàng câu hỏi của bài. Chỉ câu đã đăng được dùng để tạo quiz. |
| Bộ bài tập | Soạn bộ câu hỏi tương tác gắn với bài đang chọn; học sinh mở trong Bài tập tương tác. |

Ngữ văn và Tiếng Anh từ lớp 6 trở lên gom các phần cùng chương/chủ đề/Unit thành một thẻ, giống danh mục học sinh. Kiến thức và ví dụ dùng chung cho thẻ đó. Khi thêm câu hỏi hoặc bộ bài tập, chọn **Phần nhận nội dung mới trong bài / Unit** để xác định phần lưu bên dưới.

Mở một bài chưa có kiến thức chỉ hiển thị trình soạn trống, không tạo bản ghi. **Lưu nháp** mới lưu nội dung. Có thể đăng riêng kiến thức trước rồi bổ sung ví dụ sau; phần chưa có nội dung có thông báo rõ ràng. Quiz cần ít nhất **20 câu khác nhau đã đăng** và kiến thức của bài đã đăng. Thẻ bài cho biết còn thiếu gì.

Chọn một chương rồi bấm **Thêm bài học** để tạo bài trong chương đó. **Thêm chương / chủ đề** cho phép chọn học kì trong lớp và môn đang mở.

## Bài kiểm tra

Đây là bài tạo từ ngân hàng câu hỏi theo **chủ đề, học kì hoặc cả năm**. Màn hình hiển thị số câu đã đăng và số câu còn thiếu để đủ phạm vi:

| Phạm vi | Số câu | Thời gian |
| --- | ---: | ---: |
| Chủ đề | 30 | 30 phút |
| Học kì | 50 | 50 phút |
| Cả năm | 50 | 60 phút |

Nút **Quản lý câu hỏi** đưa về bài học/phạm vi nguồn để bổ sung câu. Đề cố định tải lên không nằm trong mục này. Số câu cả năm đếm trực tiếp trên toàn phạm vi, tránh cộng trùng câu giống nhau giữa các học kì.

## Đề thi

Chọn **Giữa kì I / Cuối kì I / Giữa kì II / Cuối kì II / Đề khác**, rồi bấm **Thêm đề thi**. Đề mới có sẵn lớp, môn, đợt thi và là bản nháp. Đề thi được quản lý theo lớp–môn–đợt thi, không tự gắn vào bài học đang chọn.

Nếu đã có đề trắc nghiệm trong Word, bấm **Tải đề thi từ Word** ngay trên danh sách. Không cần tạo đề trống trước. Chọn tệp để tự đọc, sửa từng câu/lựa chọn/đáp án trong bản xem trước, đặt tên và thời gian rồi bấm **Lưu đề nháp**. Đợt thi được điền theo bộ lọc đang chọn; nếu đang xem tất cả thì chọn đợt ngay trong cửa sổ. Chọn tệp hoặc đóng cửa sổ chưa lưu không tạo đề. Lưu lỗi giữ bản xem trước để thử lại. Đề mới theo thang 10 điểm, chia điểm theo câu; có thể chỉnh điểm trong trình soạn trước khi đăng.

Tải mẫu trắc nghiệm ở `frontend/assets/templates/mau-de-thi-trac-nghiem.docx`. Dùng bố cục giống nhập Quiz: `Câu 1. ...`, các dòng `A. ...`, `B. ...`, `C. ...`, `D. ...`, `Đáp án: B` và `Lời giải: ...` nếu có. Khi chưa có đáp án, hệ thống giữ trống để giáo viên nhập thêm.

Nhập tên, thời gian, các câu, đáp án, lời giải và điểm theo cách chấm của đề. Có thể tải ảnh đề và ảnh lời giải riêng. Ảnh lời giải chỉ hiện cho học sinh sau khi nộp bài. Cách nhập tay dùng cùng cấu trúc câu hỏi và cách chấm với đề đã nhập bằng công cụ.

**Nhập Word theo mẫu** có bước đọc và xem trước, sau đó mới thêm câu vào bản đang soạn. Tải mẫu ngay trong cửa sổ nhập hoặc tại `frontend/assets/templates/mau-nhap-de-thi.docx`.

- Hỗ trợ câu chọn một đáp án và điền đáp án; đề chấm điểm từng ý hỗ trợ thêm câu đúng/sai đơn.
- Câu nhiều đáp án và nhóm đúng/sai THPT bốn ý cần dùng trình soạn của đề để giữ đúng cách chấm.
- Word tối đa 20 MB; mỗi đề tối đa 50 câu/ý. Nội dung vượt giới hạn báo lỗi, không cắt bỏ âm thầm.
- Câu chưa đọc được đáp án vẫn thiếu đáp án trong bản nháp; không tự chọn A. Phải bổ sung trước khi đăng.
- Ảnh và công thức phức tạp/MathType cần tải ảnh riêng; đây không phải công cụ đọc tự động mọi PDF hoặc mọi cách trình bày Word.
- Đọc Word và thêm vào bản đang soạn không ghi câu vào ngân hàng của bài học.

## Lưu, xuất bản và xem trước

Khung **HỌC SINH SẼ THẤY Ở** hiển thị đường dẫn lớp–môn–phần học. Trình soạn câu hỏi và trình nhập Word cũng hiển thị vị trí đích. Sau khi lưu có thông báo kết quả; bản nháp và nội dung đang ẩn được phân biệt với nội dung học sinh đang thấy.

**Xem như học sinh** xem bố cục nội dung mà không tạo lượt làm hoặc điểm. Xem thử từng câu vẫn dùng công cụ chấm thử dành cho admin. Khi chuyển lớp/môn/phần khác trong lúc đang sửa bộ bài chưa lưu, hệ thống hỏi trước khi bỏ thay đổi. Với kiến thức, nếu một nơi khác đã sửa cùng bài, thao tác lưu bản cũ bị từ chối và giữ nội dung đang soạn để tránh ghi đè.

**Quản lý nâng cao** chứa năm học, lịch sử nhập Word, bài chờ chấm, nội dung chưa xếp bài và tìm toàn bộ nội dung môn. Học sinh mặc định dùng năm học đang hoạt động; chọn năm cũ là quản lý nội dung năm đó. Đề thi không có trường năm học, nên mục Đề thi không dùng bộ lọc năm học.

## Dữ liệu và kiểm tra phát hành

Bản cập nhật này không cần migration, seed hoặc nhập lại đề. Các bản ghi cũ được đọc tại chỗ. Không chuyển đổi hồ sơ, email, quyền học, bài làm, điểm hay kim cương. Trình sửa kiến thức giữ các trường nội bộ, câu hỏi riêng và mã nguồn nội dung đã có; chỉ thay các mục học và trạng thái khi admin bấm lưu.

Kiểm tra ngày 23/11/2026:

- 21 kiểm tra Node: lưu kiến thức, bảo toàn trường riêng, phiên bản đồng thời, nhập Word theo mẫu, đáp án và cách chấm đề.
- 11 kiểm tra trình duyệt với API giả lập: ba cấp học, quyền admin từng cấp, Unit, lưu/đăng kiến thức, thêm câu hỏi, nhập đề, nơi hiển thị, giữ bản chưa lưu, bài kiểm tra và kết quả sau nộp. Có kiểm tra bố cục 390 px.
- Database thật chỉ dùng giao dịch `READ ONLY`: danh mục lớp 1 có 142 nhóm bài, lớp 6 có 36 nhóm, lớp 12 có 208 nhóm; phạm vi Toán 12 có 8 chương, 407 câu cả năm tại thời điểm kiểm tra.
- Dựng tài nguyên Vercel và kiểm tra schema chỉ đọc thành công; kiểm tra đóng gói bằng tracer cũ không gặp lại lỗi `Division by zero`.

Trạng thái bản phát hành thực tế đối chiếu bằng `/api/v1/health` và `/assets/build-info.json`. Hồ sơ phát hành cục bộ lưu tại `backend/backups/admin-school-workspace/`; không đưa khóa kết nối hay dữ liệu người dùng vào Git.

Lượt bổ sung tải Word trực tiếp đã mở rộng kiểm tra thành **24 Node + 14 trình duyệt**, gồm mẫu trắc nghiệm thật, thang điểm 10, sửa bản xem trước, hủy không tạo đề, đáp án thiếu và thử lại khi lưu lỗi. Các kiểm tra này dùng dữ liệu tách biệt/API giả lập, không ghi dữ liệu học sinh thật. Hồ sơ riêng tại `backend/backups/exam-word-upload/`.
