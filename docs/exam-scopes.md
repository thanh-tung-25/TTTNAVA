# Kiểm tra chủ đề và thi thử theo chương trình

Trong trang Thi thử, học sinh chọn môn và một trong ba chế độ:

| Chế độ | Phạm vi | Số câu | Thời gian |
|---|---|---:|---:|
| Kiểm tra chủ đề | Các bài học thuộc một chủ đề trong cây chương trình | 30 | 30 phút |
| Thi học kì | Các chủ đề của học kì 1 hoặc học kì 2 | 50 | 50 phút |
| Thi cả năm | Các chủ đề của cả hai học kì | 50 | 60 phút |

Chỉ lấy câu đã đăng, đúng lớp đang được mở quyền và đúng môn/năm học.
Không lấy chủ đề cũ được đánh dấu `is_legacy`. Mỗi đề không trùng ID câu hỏi.
Các câu trong từng chủ đề được xáo trộn theo seed của lượt thi; sau đó lấy lần
lượt từ các chủ đề còn câu, rồi xáo trộn thứ tự đề. Vì vậy đề học kì/cả năm
bao phủ các chủ đề có dữ liệu thay vì vô tình chỉ lấy từ một chủ đề đông câu.
Nếu phạm vi chưa đủ câu, không tạo lượt thi và hiển thị số câu cần bổ sung.

`GET /api/v1/exams/catalog?subjectId=toan` trả danh sách chủ đề, số câu sẵn có,
hai học kì và cấu hình cả năm. Dùng khóa đang chọn qua `X-Course-Id`.

`POST /api/v1/exams` nhận:

```json
{"mode":"chapter","subjectId":"toan","chapterId":"kntt-toan-1-c01","yearId":"2026-2027"}
```

```json
{"mode":"semester","subjectId":"toan","semester":"hk1","yearId":"2026-2027"}
```

```json
{"mode":"annual","subjectId":"toan","yearId":"2026-2027"}
```

Migration `020_exam_scopes.sql` lưu tên đề và phạm vi tại thời điểm tạo.
`topic_id` trong lượt thi mới là bài học của một câu trong đề, dùng để liên kết
lớp/môn và kiểm tra quyền truy cập; phạm vi đầy đủ nằm trong `scope_json`.
Lịch sử và trạng thái hiển thị `exam_title`, không dùng tên bài học đại diện.

Các lượt thi cũ và API cũ gửi `topicId` tiếp tục hoạt động theo cấu hình 20 câu,
15 phút trước đây. Lịch sử, đáp án, chấm điểm, hạn giờ và kim cương vẫn sử dụng
các bảng và luồng cũ; điểm số luôn dựa trên tổng số câu của từng lượt.
