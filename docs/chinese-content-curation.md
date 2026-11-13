# Giảm nội dung lặp trong 10 bài HSK 1

Ngày rà soát: 13/11/2026. Dữ liệu đã áp dụng trên MySQL XAMPP và PostgreSQL online; thay đổi code trộn theo từng lượt được phát hành riêng khi chủ web cho phép.

Nguyên nhân chính: mỗi từ có ba câu định nghĩa liền nhau (nghĩa, chọn chữ Hán, phiên âm). Thẻ câu hỏi dùng chung ngân hàng này, nên cũng lặp ba lần. Bảng Từ mới ban đầu không có từ trùng nguyên văn.

Quy tắc:

- Từ mới giữ tối đa hai câu định nghĩa khác dạng. Từ đã xuất hiện ở bài trước giữ một câu hỏi nghĩa trong bài sau.
- Giữ câu kiểm tra ngữ pháp, giao tiếp và ngữ cảnh khác nhau. Không coi mọi câu chứa 我 hoặc có cùng đáp án 是/吗 là trùng.
- Các câu hỏi chọn chữ có cùng nghĩa nhưng chữ Hán khác nhau được ưu tiên thay bằng dạng phiên âm đã có trong ngân hàng, tránh hai đề giống hệt nhau.
- Mỗi câu hoàn chỉnh trong phần vận dụng còn tối đa hai dạng, vẫn đủ xếp câu, sửa lỗi, điền từ và hội thoại ở từng bài.
- Trộn thứ tự từ/thẻ/câu hỏi và giãn những câu cùng mục từ. Code dùng chung cho học sinh, xem thử admin và luyện vận dụng. Giới hạn giãn được giảm an toàn khi ngân hàng quá nhỏ.
- Thẻ từ được lọc theo chữ Hán + pinyin + nghĩa; hai nghĩa hoặc cách đọc thực sự khác nhau vẫn được giữ.

| Bài | Quiz trước → sau | Vận dụng trước → sau | Từ mới giữ lại |
| --- | --- | --- | --- |
| 1 | 267 → 188 | 43 → 23 | 79 |
| 2 | 340 → 199 | 43 → 23 | 100 |
| 3 | 277 → 154 | 43 → 23 | 87 |
| 4 | 262 → 172 | 43 → 23 | 82 |
| 5 | 317 → 202 | 42 → 22 | 98 |
| 6 | 293 → 188 | 41 → 21 | 91 |
| 7 | 230 → 146 | 40 → 20 | 70 |
| 8 | 278 → 174 | 40 → 20 | 86 |
| 9 | 233 → 142 | 40 → 20 | 71 |
| 10 | 233 → 141 | 40 → 20 | 71 |
| Tổng | 2.730 → 1.706 | 415 → 215 | 835 |

## Lịch sử và buổi đang học

Các câu dư được đặt active=0; không xóa hàng hoặc tái sử dụng ID. Câu giữ lại vẫn có đáp án gốc. Thêm liên kết vocabulary_id vào câu định nghĩa để nhận diện mục từ khi trộn và ghi nhận ôn tập đúng từ.

Giữ nguyên tài khoản, quyền học, Kim Cương, reviews, lịch sử Quiz, tiến độ, bài luyện nói, buổi AI và tiến độ Phố tiếng Trung. Script so sánh fingerprint các bảng này trước và sau transaction. Nội dung đọc/ngữ pháp và bộ câu hỏi Luyện nói riêng không bị thay đổi.

Quiz còn dở chỉ được tiếp tục khi nội dung, ID câu hỏi, chặng và chế độ luyện khớp với ngân hàng hiện tại. Khác thứ tự lựa chọn trắc nghiệm không làm mất tính tương thích. Chọn Chặng 1 không được lấy lại lượt ở Chặng 5 hoặc một lượt ôn khác.

Nếu lượt còn dở thuộc ngân hàng cũ, app hiện nút mở bản đồ chặng hiện tại, không hiển thị lại câu đã bỏ. Khi người học bắt đầu lượt mới, lượt cũ không còn phù hợp được đóng bằng abandoned_at, giữ hàng dữ liệu/đáp án để đối chiếu; không chấm điểm hoặc ghi Kim Cương cho lượt đó. Kết quả đã hoàn thành vẫn xem được bằng snapshot lịch sử.

Bản đồ, số câu đã làm, phần trăm trên danh sách bài và báo cáo admin cùng đối chiếu ngân hàng hiện tại. Một chặng cũ không tự mở nhóm câu khác chỉ vì trùng số thứ tự. Chỉ mở bài hoặc bắt đầu Quiz không tăng phần trăm. Từ đã tự đánh giá và đoạn đã đánh dấu đọc vẫn được ghi nhận; giao diện tách số từ đã học và số chặng Quiz hoàn thành để giải thích rõ phần trăm nội dung.

Khi code mới được phát hành, thứ tự thẻ chỉ lưu bằng danh sách ID trong sessionStorage của tab. Tải lại giữ thứ tự và đúng thẻ đang học; đổi ngân hàng thì app tự xây lại danh sách. Không lưu thêm câu trả lời hoặc nội dung hội thoại AI vào bộ nhớ này. Nút Trộn thẻ tạo thứ tự mới.

## Công cụ an toàn

Trong thư mục backend:

```text
node scripts/curate-chinese-content.mjs
node --use-system-ca scripts/curate-chinese-content.mjs --production
```

Mặc định chỉ xem kế hoạch và fingerprint. Chỉ áp dụng sau khi đã đọc báo cáo, dùng thêm --apply --expected <fingerprint>. Script kiểm tra đúng DB, đủ 10 bài, đáp án hợp lệ, đủ bốn dạng vận dụng và tối thiểu 20 câu Quiz/bài; backup nội dung trước khi ghi, dùng transaction và tự kiểm tra chạy lại không phát sinh thay đổi.

Backup nằm trong backend/backups/chinese-curation/ và bị loại khỏi Git/Vercel. MySQL và PostgreSQL được xử lý độc lập, giữ ID vốn có ở mỗi hệ. Công cụ đồng bộ chương trình học vẫn dùng để đối chiếu nội dung tương đương giữa hai hệ sau khi lọc.

Word/PDF gốc được giữ nguyên để đối chiếu. Nếu nhập lại ngân hàng từ nguồn cũ có ba dạng định nghĩa, cần chạy lại bản xem trước của công cụ lọc và rà báo cáo trước khi xuất bản.

Kiểm thử: backend/tests/chinese-content-curation.test.js, chinese-quiz-resume.test.js, study-hub.test.js, các bộ chinese.test.js/chinese-activities.test.js, playwright.chinese-variety.config.js và playwright.chinese-journey.config.js. Kiểm tra online chỉ dùng GET với tài khoản đang có, không tạo bài học/bài nộp giả trên Production.
