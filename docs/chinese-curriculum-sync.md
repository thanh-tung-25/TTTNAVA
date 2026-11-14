# Đồng bộ toàn bộ HSK 1 theo danh sách đã chốt

Nguồn duy nhất là `backend/src/data/chinese-q1-user-vocabulary.json`, chép nguyên danh sách đầy đủ cuối cùng: 570 dòng, 569 mục từ theo bài sau khi gộp hai nghĩa của 读 trong bài 6. Số từ bài 1–10: 28, 48, 42, 49, 72, 67, 66, 86, 55, 56. Bài 1 có cả 男 và 难 trong danh sách cuối.

`chinese-curriculum.js` lập nội dung thẻ học, ví dụ từ vựng, 20 mục ngữ pháp, 20 bài đọc, 10 hội thoại, 100 câu luyện nói, 400 hoạt động vận dụng, 10 tình huống AI và 30 nhiệm vụ Phố tiếng Trung. Mỗi câu Hán được tách theo từ đã học từ bài 1 đến bài hiện tại. Câu hỏi luyện nói chỉ chọn số câu cô đã cấu hình; đáp án tham khảo và tiêu chí chấm vẫn chỉ dành cho giáo viên. Bộ 1.620 câu Quiz 20 đã chốt giữ nguyên ID, phiên bản và thứ tự; cập nhật liên kết đến từ vựng đầy đủ.

Luyện nghe lấy đủ mục từ trong bài theo thứ tự nguồn, chia chặng tối đa 10 từ. Các từ có cùng nghĩa vẫn được luyện riêng, lựa chọn nghĩa không trùng nhau. Phố tiếng Trung giữ trò chọn địa điểm ở bài 7; tên Hán của địa điểm chỉ hiện khi thuộc vốn từ đã học. AI nhận danh sách từ cộng dồn, kiểm tra cả câu trả lời và phần dịch; nếu có từ ngoài phạm vi thì dùng câu dự phòng đã duyệt. Câu kết và câu khôi phục cũng được giới hạn.

Trình tự cập nhật:

1. Chạy `node backend/scripts/generate-chinese-curriculum-templates.mjs` để cập nhật mẫu tự luyện và mở đầu AI. Không xuất ngân hàng quiz hoặc bộ tiêu chí chấm luyện nói lên frontend.
2. Chạy `node backend/scripts/sync-chinese-curriculum.mjs` để xem thay đổi trên MySQL; chạy lại với `--apply --expected <fingerprint>` sau khi đối chiếu.
3. Thêm `--export-word` để thay các bản Word, TXT, JSON và ZIP cũ trong `tai-lieu`, đồng thời xuất 70 Word mới và dữ liệu từng bài vào `tai-lieu/tieng-trung-dong-bo`. ZIP tổng hợp là `tai-lieu/tieng-trung-dong-bo.zip`.
4. Với online, xem trước bằng `node --use-system-ca backend/scripts/sync-chinese-curriculum.mjs --production`, sau đó áp dụng với `--apply --expected <fingerprint>`. Dùng môi trường riêng tư sẵn có; không đưa khóa lên Git.
5. Chạy kiểm thử curriculum, importer, quiz/resume, activities, street, AI chat và các bài kiểm tra trình duyệt tương ứng; build và phát hành code. Kiểm tra đủ 10 bài qua API học sinh/giáo viên và tải lại Word từ đường dẫn quản trị hiện có.

Trình đồng bộ sao lưu nội dung, Word gốc và con trỏ kho tệp trước khi thay. Các tệp Supabase mới có tên theo SHA-256, tải lại để kiểm tra trước khi chuyển con trỏ; giữ nguyên tệp cũ. Cập nhật nội dung trong một transaction, không xóa các ID đang được lịch sử tham chiếu. Fingerprint các bảng kết quả, ôn tập, tiến độ, kim cương, bài nói, phiên AI và Phố tiếng Trung phải giữ nguyên. Chạy lại phải không còn chênh lệch.

Các bản sao lưu nằm trong `backend/backups/chinese-curriculum/`, không đưa vào Git. `backup.json` lưu nội dung và con trỏ kho tệp cũ; `local-artifacts.json` ánh xạ các tệp tài liệu bị thay. Các trình tạo Word/đồng bộ dựa trên bộ PDF cũ đã được thay bởi quy trình này.
