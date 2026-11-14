# Quiz HSK 1 theo danh sách đầy đủ của người dùng

Nguồn chuẩn là bản danh sách **cuối cùng** người dùng gửi ngày 14/11/2026, lưu tại `backend/src/data/chinese-q1-user-vocabulary.json`. Bản này thay thế các bản trích từ PDF và danh sách gửi trước đó. Có 570 dòng: 569 mục từ trong từng bài; `读` ở bài 6 xuất hiện hai lần với hai nghĩa, được gộp thành một mục nhưng giữ cả nghĩa và hai dòng nguồn. Giữ đủ từ ghép, tên riêng, số đếm, lượng từ, hoa quả, con giáp và các phần mở rộng. Bài 1 có cả 男 và 难 theo bản cuối.

Mỗi bài có hai phần nối tiếp trong bản đồ quiz hiện tại:

1. Học hết từ của **chính bài đó**, theo đúng thứ tự danh sách: câu chọn nghĩa và câu nhận diện chữ Hán cho từng mục. Nếu chặng cuối chưa đủ 20 câu, thêm câu ôn pinyin cho các từ đã học để đủ một chặng. Không đưa câu vận dụng chen vào chặng từ vựng.
2. Sau đó là 40 câu vận dụng, từ 20 tình huống song ngữ: hiểu câu tiếng Trung và chọn câu diễn đạt nghĩa tiếng Việt. Bài N chỉ dùng từ trong danh sách bài 1–N. Không lấy từ của bài sau.

| Bài | Dòng nguồn | Mục từ | Chặng từ vựng | Chặng vận dụng | Tổng câu |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 28 | 28 | 3 | 2 | 100 |
| 2 | 48 | 48 | 5 | 2 | 140 |
| 3 | 42 | 42 | 5 | 2 | 140 |
| 4 | 49 | 49 | 5 | 2 | 140 |
| 5 | 72 | 72 | 8 | 2 | 200 |
| 6 | 68 | 67 | 7 | 2 | 180 |
| 7 | 66 | 66 | 7 | 2 | 180 |
| 8 | 86 | 86 | 9 | 2 | 220 |
| 9 | 55 | 55 | 6 | 2 | 160 |
| 10 | 56 | 56 | 6 | 2 | 160 |

Tổng 1.620 câu, mỗi chặng đúng 20 câu. Các chặng từ vựng và vận dụng đều đủ bội số 20 nên không trộn hai phần hay cần gối câu ở ranh giới. Quy tắc mở chặng cũ tiếp tục yêu cầu hoàn thành chặng trước.

`chinese-quiz-language.js` kiểm tra từng đoạn chữ Hán của mọi câu vận dụng và lựa chọn tiếng Trung bằng danh sách từ cộng dồn. Từ ghép phải có trong danh sách hoặc ghép được từ các mục đã học; không tự tách chữ của từ ghép thành từ mới. Các cấu trúc được ghi rõ như 太……了 và 又……又…… cho phép dùng thành phần cấu trúc tương ứng. Không tự bổ sung từ nối/ngữ pháp ngoài phạm vi. Các câu nguồn trong `chinese-q1-quiz-application.js` đều có bản dịch tiếng Việt, không gọi AI để sinh ngẫu nhiên lúc học.

Chỉ ngân hàng câu hỏi được cập nhật. Câu không còn phù hợp được đặt `active=0`, không xóa. Tái sử dụng ID câu nghĩa/nhận chữ phù hợp; các câu mới có ID ổn định để chạy lại không tạo trùng. Không sửa bảng attempts, reviews, progress hoặc diamond_ledger, cũng không sửa nội dung ngoài quiz. Kết quả đã hoàn thành và kim cương giữ nguyên; tiến độ chặng mới tính theo ngân hàng mới. Lượt dở dùng nguồn cũ được ứng dụng báo cập nhật để mở chặng hiện tại, không tự chấm/trừ kim cương.

## Áp dụng và kiểm tra

`node backend/scripts/repair-chinese-quiz-source.mjs` mặc định xem trước MySQL local; thêm `--production` để xem trước PostgreSQL online. Áp dụng bằng `--apply --expected <fingerprint>` với đúng môi trường của bản xem trước. Công cụ kiểm tra đúng 10 file Word tương ứng, từ chối nếu ngân hàng đổi, sao lưu vào `backend/backups/chinese-quiz-source/`, cập nhật trong một transaction, kiểm tra toàn bộ ngân hàng sau sửa và hash lịch sử/kim cương trước khi commit. Chạy lại phải không có thay đổi.

Không dùng các bộ tạo Word/curation cũ để ghi đè nguồn đã xác nhận. Nếu người dùng gửi bản mới hơn, cập nhật dữ liệu nguồn và kiểm tra đủ mọi dòng trước khi áp dụng.

Kiểm thử: `npm --prefix backend test -- chinese-quiz-source.test.js chinese-quiz-resume.test.js`. Bao gồm toàn bộ 570 dòng, giữ hai nghĩa của 读, thứ tự từ, ranh giới chặng, nguồn của đáp án nhiễu, từ cộng dồn, chặn từ tương lai, tính lặp lại an toàn và bảo vệ lượt quiz cũ. Giao diện/chọn chặng: `npx playwright test --config playwright.chinese-journey.config.js`.
