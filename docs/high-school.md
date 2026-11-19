# THPT lớp 10–12

Khối `highschool` dùng các khóa `grade-10`, `grade-11`, `grade-12`. Giao diện chọn khóa, môn học, quản trị chương trình, nhập Word, câu hỏi, phiếu bài tập, kiểm tra, quyền học, báo cáo và kim cương dùng cùng hệ thống với Tiểu học/THCS. Admin tổng quản lý tất cả; phạm vi `highschool` dành cho quản trị viên THPT. Không cấp quyền, mở đợt miễn phí hoặc đặt giá tự động.

## Mục lục

Nguồn là `muc_luc_sgk_kntt_lop_10_11_12_9_mon.docx` do người dùng cung cấp; SHA-256 `1d1d03bcb50ad70abcb9bff26fce419e7dc198a028263e7975f751b5de05080e`. Tệp nguồn không được đưa lên Git. Dữ liệu được trích thành `backend/seed-data/highschool-kntt.json`: 27 bộ lớp–môn, 239 chương/chủ đề, 1.082 mục học.

Chín môn gồm Toán, Ngữ văn, Tiếng Anh, Vật lí, Hóa học, Sinh học, Lịch sử, Địa lí, Giáo dục kinh tế và pháp luật. Ngữ văn giữ mã `tieng-viet` để dùng chung luồng có sẵn; tên Tiếng Việt ở lớp 1–5 giữ nguyên. Tiếng Anh theo cấu trúc Global Success (10 Unit, 4 Review mỗi lớp), mỗi Unit có các mục kỹ năng riêng. Môn không chia học kì trong tài liệu dùng nhánh `year` / Cả năm; không tự chia lại bài học theo một lịch dạy suy đoán.

Ngữ văn trong tài liệu chỉ có văn bản/chủ điểm tiêu biểu và mạch hoạt động, không khẳng định đủ mọi văn bản SGK. Dữ liệu giữ đúng phạm vi mục lục được cung cấp.

## Nội dung bài học

Theo yêu cầu bổ sung của người dùng, các tệp `backend/seed-data/highschool-content/*.json` chứa kiến thức, mục tiêu, ví dụ có giải thích và câu hỏi luyện tập tự biên soạn cho từng mục học. Đây là nội dung học được viết mới, không phải toàn văn SGK hoặc lời giải được sao chép. Nguồn tham khảo lưu cùng từng môn. Các tình huống minh họa/đoạn đọc tiếng Anh là ngữ liệu mới; số liệu giả định được ghi rõ.

Các JSON có đáp án được giữ riêng trên máy, bị loại khỏi Git và gói static Vercel. Git chỉ lưu manifest gồm số lượng và SHA-256; website đọc nội dung từ database sau kiểm tra quyền khóa học. Gói sao lưu riêng nằm tại `backend/backups/high-school/learning-content-private.zip`. Khi khôi phục máy khác, người quản trị cần giải nén gói này vào `backend/seed-data/highschool-content/` trước khi chạy công cụ nhập nội dung. Không đưa gói có đáp án vào repository công khai.

Học sinh chọn THPT → lớp → môn → Học bài. Trang bài học có kiến thức, ví dụ, luyện tập và chuyển bài trước/sau. Đoạn nghe tiếng Anh có thể phát bằng giọng cục bộ của trình duyệt nếu thiết bị có sẵn; luôn có kịch bản đọc. Không dùng API AI để phát âm hoặc nhận dạng trong tính năng này.

Nút luyện tập tạo `learning_runs` từ các câu đã xuất bản của đúng bài/khóa, dùng chung cơ chế lưu đáp án, chấm, sổ câu sai, tiến độ, báo cáo và giới hạn thưởng. Đáp án không có trong API đọc bài; chỉ được phản hồi qua luồng chấm có sẵn. Bài kiểm tra chuẩn vẫn áp dụng ngưỡng câu hỏi hiện hành, không lặp câu để đủ số lượng.

Admin vào Nội dung học tập, chọn lớp THPT, học kì/Cả năm, môn và chương. Mỗi bài có nút xem lý thuyết/ví dụ, có thể biên tập trực tiếp bài giảng; câu hỏi vẫn sửa/ẩn/đăng ở công cụ có sẵn. Seed chạy lại không ghi đè bài giảng hoặc câu hỏi admin đã chỉnh.

## Cập nhật dữ liệu

`045_highschool.sql` mở giới hạn lớp đến 12, thêm loại khóa/phạm vi THPT và nhánh Cả năm. Cột tên bài/chủ đề được nới đến 255 để giữ các tên dài trong tài liệu. Bảng `school_lesson_materials` lưu bài giảng theo lesson ID. Bản PostgreSQL có RLS và thu hồi quyền trực tiếp của anon/authenticated; truy cập qua API có kiểm tra quyền khóa học/phạm vi admin.

```powershell
# Chỉ đọc kế hoạch và đối chiếu dữ liệu đầu vào
node backend/scripts/release-highschool.mjs --target=local

# Áp dụng ở XAMPP
node backend/scripts/release-highschool.mjs --target=local --apply

# Khi phát hành website: cập nhật cấu trúc trước, chưa thêm lớp vào dữ liệu
node --use-system-ca backend/scripts/release-highschool.mjs --target=production --schema-only --apply
# Phát hành mã nguồn, xác nhận Vercel đã chạy bản mới, rồi bổ sung nội dung
node --use-system-ca backend/scripts/release-highschool.mjs --target=production --apply
```

`--catalog-only` chỉ thêm cây chương trình, không nhập bài giảng/câu hỏi; `--schema-only` chỉ mở cấu trúc. Không đưa dữ liệu lớp 10–12 vào khi website còn chạy bản chỉ hỗ trợ lớp 1–9. Không chạy migration cũ hoặc seed tổng để bổ sung THPT. Công cụ riêng chỉ INSERT dữ liệu mới; không UPDATE/DELETE tài khoản, quyền học, giao dịch, điểm, kim cương, bản ghi học tập hoặc nội dung cũ. Trước khi áp dụng có bản sao mục lục và băm các bản ghi cũ trong `backend/backups/high-school/` (bị Git bỏ qua). Trước COMMIT, đối chiếu mọi bản ghi ban đầu theo khóa chính và băm; thay đổi ngoài danh mục thêm mới làm giao dịch thất bại.

Người dùng yêu cầu tự kiểm giao diện; không chạy bộ kiểm thử chức năng hoặc tạo lượt học giả trên tài khoản thật. Kiểm tra cấu trúc mục lục/nội dung, cú pháp, build và đối chiếu dữ liệu trước/sau không tạo điểm hoặc lịch sử thử.
