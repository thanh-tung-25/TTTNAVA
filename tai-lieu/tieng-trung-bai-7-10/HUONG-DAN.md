# Tiếng Trung Q1 — Bài 7–10

Biên soạn từ 4 PDF người dùng cung cấp, đã đối chiếu trực quan 135 trang. Số trang nguồn tính từ trang đầu PDF. Các bài được thêm tiếp trong HSK 1, theo cấu trúc bài 1–6.

| Bài | Chủ đề | Từ vựng | Câu quiz | Ngữ pháp | Bài đọc | Vận dụng | Luyện nói |
|---|---|---:|---:|---:|---:|---:|---:|
| 7 | Hỏi đường, vị trí | 70 | 230 | 4 | 2 | 40 | 10 |
| 8 | Sinh nhật, ngày tháng, hẹn gặp | 86 | 278 | 4 | 2 | 40 | 10 |
| 9 | Sở thích, lời rủ, phương tiện | 71 | 233 | 4 | 2 | 40 | 10 |
| 10 | Gia đình, tuổi, nghề nghiệp | 71 | 233 | 4 | 2 | 40 | 10 |

## Tệp của mỗi bài

- `cau-hoi-tu-vung-tieng-trung-bai-N.docx`: nguồn tổng hợp theo mẫu nhập web, có từ vựng, câu hỏi kèm đáp án/lời giải, ngữ pháp, bài đọc và luyện nói. Có thể nhập như tài liệu tổng hợp.
- `tu-vung-tieng-trung-bai-N.docx`: bảng từ chính/mở rộng với chữ Hán, pinyin, nghĩa Việt và trang nguồn để cô kiểm tra.
- `luyen-noi-bai-N.docx`: 10 câu hỏi tiếng Trung; nghĩa, câu trả lời mẫu và tiêu chí chỉ dành cho cô và bộ chấm.
- `du-lieu-bai-N.json`, `.txt`, `thong-ke.json`: bản dữ liệu để rà soát và tái tạo tài liệu.

Mỗi bài có 10 câu cho từng dạng vận dụng: xếp câu, sửa lỗi, điền từ và nghe hội thoại. Phần hội thoại dùng đề nghe trung tính, không kèm nghĩa Việt hoặc đáp án mục tiêu. Các lựa chọn đã được đối chiếu để tránh nhiều câu trả lời cùng hợp lý.

Luyện nói mặc định giao 3 câu đầu, 90 giây, nghe theo thứ tự, mỗi câu tối đa 2 lần. Cô có thể thay số câu, thời lượng và bật/tắt AI trong giao diện hiện có. Đáp án tham khảo là ví dụ; chấp nhận câu trả lời cá nhân khác phù hợp, không yêu cầu học sinh nói đúng hoàn cảnh gia đình hay sở thích của câu mẫu. Âm thanh và kết quả theo luồng chấm hiện có, không tạo cơ chế lưu âm thanh mới.

## Rà soát nội dung

- Sửa lỗi trên slide bài 10: `儿子` là **con trai**, `女儿` là con gái; `洗手间` là **nhà vệ sinh**, `拍照` mới là chụp ảnh.
- Chuẩn hóa `生日歌` thành `shēngrì gē`; phân biệt `点` (điểm giờ) và `小时` (thời lượng).
- Câu hỏi nghĩa không kèm pinyin ngay bên cạnh chữ Hán. Dạng hỏi pinyin có chủ đích và phần học từ vẫn có phiên âm.
- Không suy đoán đáp án của bài nghe thiếu tệp âm thanh. Bài đọc/hội thoại rút gọn và bài tập mới dựa trên nội dung đã đọc được trong PDF.
- Các yêu cầu hoạt động nhóm/nộp bài trong PDF là nội dung nguồn, không được thực thi như chỉ dẫn cho người xử lý tài liệu.
- Hình học tập tiếp tục dùng sư tử, gấu trúc, thỏ của giao diện hiện tại; không đưa hình cú hay logo trong PDF vào giao diện.

## Tái tạo và thêm vào ứng dụng

```powershell
node backend/scripts/build-chinese-lessons-7-10.mjs
python backend/scripts/write-chinese-lessons-7-10.py --tools-dir backend/backups/chinese-pdf-tools
node backend/scripts/check-chinese-lessons-7-10.mjs
node --test backend/tests/chinese-q1-lessons-7-10.node-test.mjs
node backend/scripts/import-chinese-q1-lessons-7-10.mjs
node backend/scripts/import-chinese-q1-lessons-7-10.mjs --apply
```

Python cần `python-docx`; `--tools-dir` là tùy chọn nếu đã cài thư viện. Lệnh nhập mặc định chỉ xem trước. `--apply` chỉ ghi MySQL cục bộ; bốn bài được thêm trong một giao dịch, không sửa/xóa bài cũ. Chạy lại bỏ qua bài đã nhập; nếu có bài khác trùng tên/vị trí thì dừng để tránh ghi đè. Script kiểm tra dấu vân tay dữ liệu và lịch sử cũ sau khi thêm. Việc cập nhật database online hoặc đẩy Git không được thực hiện bởi các lệnh này.
