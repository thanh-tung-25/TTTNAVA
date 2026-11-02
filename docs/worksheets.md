# Bài tập tương tác

Admin vào **Nội dung học tập** (`/pages/admin/questions/`). Một danh sách chung hiển thị câu hỏi đơn và bộ bài, có tìm kiếm, lọc lớp/trạng thái và nút Sửa. Để tạo bộ bài, chọn **Bộ bài tập**, bấm **Tạo nội dung**, đặt tên, lớp và môn. Bộ mới là bản nháp trống.

## Soạn bài

Chọn dạng bài rồi bấm **Thêm câu**. Nhập đề, đáp án, lời giải; có thể tải ảnh PNG/JPEG tối đa 2 MB. Bấm **Xem thử câu này** để làm thử và kiểm tra đáp án. **Lưu nháp** giữ nội dung cho admin; **Đăng bài** cho học sinh của lớp tương ứng; **Ẩn bài** ngừng nhận lượt làm mới.

| Dạng | Cách nhập |
| --- | --- |
| Điền đáp án | Các câu trả lời chấp nhận, mỗi dòng một đáp án thay thế |
| Nhiều ô trống | Tên từng ô và đáp án từng ô theo cùng thứ tự |
| Chọn đáp án | Mỗi dòng một lựa chọn, chọn số thứ tự đáp án đúng |
| Chọn dấu | Nhập đề so sánh và chọn dấu đúng |
| Sắp xếp | Nhập thẻ theo thứ tự đúng, mỗi dòng một thẻ; thẻ không trùng; hệ thống xáo trộn khi học sinh làm |
| Nối cặp | Mỗi dòng `vế trái = vế phải`; nếu vế trái có dấu bằng, dấu bằng cuối cùng phân cách đáp án |
| Đặt tính | Nhập hai số không âm và phép cộng/trừ; hệ thống tự dựng cột, tính đáp án; phép trừ không có kết quả âm |
| Toán có lời văn | Đề bài, đáp số chấp nhận và đơn vị tùy chọn; chấm đáp số, không tự đánh giá cách diễn giải |
| Tự luận / vẽ | Học sinh viết hoặc vẽ; giáo viên chấm đúng/chưa đúng và thêm nhận xét |

Một bộ có tối đa 50 câu. Hệ thống chấm mỗi câu trọng số bằng nhau. Câu nhiều ô có phản hồi từng ô, nhưng chỉ tính đúng cả câu khi tất cả ô đúng. Không cộng kim cương cho bộ bài này.

## Học sinh và chấm bài

Học sinh mở đúng khóa Tiểu học, từ Trang chủ chọn **Bài tập tương tác**. Chỉ bộ đã đăng của lớp đó được hiển thị. Bài làm tự lưu sau khi nhập và khi chuyển câu; có thể mở lại lượt đang làm. Sau khi bấm **Nộp bài**, hệ thống chấm các dạng có đáp án, hiển thị lời giải. Trước khi nộp, API không trả đáp án hoặc lời giải.

Nếu có tự luận/vẽ, kết quả là **Chờ giáo viên chấm**, chưa có điểm cuối cùng. Admin vào **Bài chờ chấm**, chọn **Xem và chấm**, đánh dấu kết quả và nhận xét, bấm **Lưu kết quả chấm**. Học sinh mở lại bài để xem điểm và nhận xét.

Quyền học được kiểm tra ở API, kể cả hình minh họa và lượt đã làm. Mỗi lượt lưu riêng đề và đáp án tại thời điểm bắt đầu; việc sửa bộ bài sau này không thay đổi đề hoặc cách chấm của lượt cũ. Bộ đã có lượt làm không được đổi lớp; hãy tạo bộ mới. Các phiên soạn đồng thời được kiểm tra phiên bản để tránh ghi đè thay đổi của nhau.

Chạy migration 016 trước khi dùng. Kiểm thử backend bằng `npm test`; luồng trình duyệt bằng `npm run test:worksheets` (database `kids_learning_test`, cổng 3120; tài khoản và nội dung kiểm thử được dọn sau khi chạy).

## Sửa và xóa

Bấm Sửa ngay trên dòng nội dung để mở phần soạn trong cùng trang. Bộ bài chưa có lượt làm có thể xóa hẳn (bao gồm hình đính kèm); bộ đã có học sinh làm được chuyển sang Đang ẩn để giữ nguyên bài làm, điểm và nhận xét cũ. Câu hỏi đơn có nút Ẩn/Đăng bài. Các đường dẫn quản lý bộ bài cũ chuyển về trang Nội dung học tập.
# Sắp xếp theo chương trình

Trang **Nội dung học tập** dùng chung cho câu hỏi đơn và bộ bài tập:
**Năm học → Lớp → Học kì → Môn → Chủ đề → Bài học**.
Danh sách ngoài gom thành thẻ bài học, hiển thị tên bài, số câu hỏi và số bộ bài tập.
Bấm **Xem bộ câu hỏi** để mở nội dung của một bài; bấm **Danh sách bài học**
để quay lại các bài trong chủ đề. Nhập Word lưu câu hỏi vào bài đã chọn,
không trải từng câu hỏi ra danh sách tổng hợp.
Trong bài học, **Đăng tất cả câu hỏi nháp** đăng toàn bộ câu hỏi nháp của bài,
kể cả các trang tiếp theo. Câu đang ẩn và nội dung bài khác giữ nguyên.
Máy chủ kiểm tra câu hỏi, ghi lịch sử đăng và thực hiện trong một giao dịch:
nếu có câu không hợp lệ thì chưa đăng câu nào, thông báo câu cần sửa.
Chọn đến bài học rồi tạo nội dung; lớp và môn của bộ bài được lấy từ bài học.
Có thể xem tổng hợp tại từng cấp, thêm chủ đề trong môn và thêm bài trong chủ đề.

Migration `017_content_curriculum.sql` bổ sung liên kết bộ bài với bài học.
Chạy `npm run db:migrate` rồi `npm run db:seed-catalog` khi cập nhật.
Seed `math-grade1-kntt.json` chỉ tạo mục lục Toán 1 (10 chủ đề, 41 bài):
học kì 1 bài 1–20, học kì 2 bài 21–41. Không tạo câu hỏi hay đáp án.
Tên mục lục đối chiếu SGK Kết nối tri thức tập 1 và tập 2:
https://loigiaihay.com/sgk-toan-1-tap-1-pdf-toan-1-tap-1-ket-noi-tri-thuc-a155403.html
https://loigiaihay.com/sgk-toan-1-tap-2-pdf-toan-1-tap-2-ket-noi-tri-thuc-a155404.html

Các chủ đề Toán 1 cũ vẫn giữ nguyên dưới nhãn **Nội dung cũ**.
Bộ bài chưa có bài học vẫn tồn tại trong **Nội dung chưa xếp bài học**;
mở bộ bài, chọn bài học ở phần chương trình, bấm **Xếp vào bài đang chọn** rồi lưu.
Máy chủ kiểm tra lớp/môn khớp với bài học, vẫn giữ phiên bản và lịch sử bài làm.
Học sinh có thể lọc danh sách bộ bài theo học kì và chủ đề.

Khung Toán 2 và Toán 3 dùng cùng bộ chọn chương trình:
- Toán 2: 14 chủ đề, 75 bài; học kì 1 bài 1–36, học kì 2 bài 37–75.
- Toán 3: 16 chủ đề, 81 bài; học kì 1 bài 1–44, học kì 2 bài 45–81.

Dữ liệu nằm ở `math-grade2-kntt.json`, `math-grade3-kntt.json`.
Mục lục đối chiếu: https://vietjack.com/toan-2-ket-noi/index.jsp và
https://vietjack.com/toan-3-kn/index.jsp.
Toán 3 dùng số bài theo mục lục đã đối chiếu (81 bài), thay cho bản tóm tắt 76 bài.
Chạy seed nhiều lần giữ nguyên các ID và không chuyển câu hỏi cũ sang bài SGK.

Khung Toán 4 và Toán 5:
- Toán 4: 13 chủ đề, 73 bài; học kì 1 bài 1–37, học kì 2 bài 38–73.
- Toán 5: 12 chủ đề, 75 bài; học kì 1 bài 1–35, học kì 2 bài 36–75.

Dữ liệu ở `math-grade4-kntt.json`, `math-grade5-kntt.json`; nguồn đối chiếu
https://vietjack.com/toan-4-kn/index.jsp và https://vietjack.com/toan-5-kn/index.jsp.
Tên và số thứ tự theo mục lục Kết nối tri thức đã đối chiếu, thay cho bản tóm tắt
Toán 4 gồm 75 bài / Toán 5 gồm 78 bài. Nội dung Toán 4–5 cũ vẫn giữ dưới nhãn
Nội dung cũ. Tổng khung Toán 1–5 có 65 chủ đề và 345 bài học, chưa nhập câu hỏi.

