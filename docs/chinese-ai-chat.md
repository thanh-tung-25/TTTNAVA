# Hội thoại tiếng Trung cùng Sư tử AI

Học sinh vào **Tiếng Trung → Giao tiếp với AI**, chọn bài rồi bắt đầu. Mỗi buổi gồm tối đa 10 câu trả lời; cô có thể đặt từ 2–10 câu. Học sinh nghe AI, ghi âm tối đa 20 giây hoặc gõ chữ, rồi bấm gửi. Bản ghi có thể nghe lại và ghi lại trước khi gửi. Hiện chữ, dịch nghĩa và gợi ý đều đóng mặc định.

Admin Tiếng Trung và admin tổng vào cùng mục, chọn bài, mở **Soạn tình huống cho bài này** để sửa tình huống, mục tiêu, câu mở đầu, từ cần luyện và số lượt. Lưu trước rồi bấm **Thử như học sinh**. Buổi thử không xuất hiện trong báo cáo học sinh. Mục **Tổng kết học sinh gửi về** bên dưới hiển thị tối đa 100 buổi gần nhất của cấp đang chọn, gồm người học, bài, thời gian, số lượt, điểm tốt, lỗi ngữ pháp/từ vựng và từ cần ôn. Không chấm điểm phát âm/thanh điệu từ transcript.

## Dịch vụ và cấu hình

Tận dụng đúng khóa Groq của phần luyện nói, không cần tạo tài khoản khác. Backend chỉ mở AI khi có đủ:

```dotenv
CHINESE_SPEAKING_AI_ENABLED=true
GROQ_API_KEY=<khóa riêng chỉ đặt trên backend>
GROQ_ZERO_DATA_RETENTION_CONFIRMED=true
```

Chủ web phải tự kiểm tra **Global ZDR** đã bật trong Groq Data Controls; biến xác nhận không tự thay đổi hoặc kiểm chứng cài đặt tài khoản. Xem [chính sách dữ liệu Groq](https://console.groq.com/docs/your-data).

- Nhận diện âm thanh: `whisper-large-v3`, ngôn ngữ `zh`, timeout 25 giây.
- Hội thoại và nhận xét: `openai/gpt-oss-120b`, JSON được kiểm tra chặt, timeout 25 giây; tối đa 1.400 token đầu ra. Ngữ cảnh chỉ giữ 6 tin gần nhất và tổng kết tích lũy để giảm lượng token; hạn mức mô hình dùng chung với chấm nội dung luyện nói.
- Đọc tiếng Trung: giọng `zh` có sẵn của thiết bị, không gọi dịch vụ TTS trả phí. Nếu máy thiếu giọng, app thông báo và cho mở chữ để học tiếp. Cần thử trên thiết bị thật; khả năng đọc phụ thuộc hệ điều hành/trình duyệt và giọng đã cài. Bộ máy đọc của thiết bị có thể dùng dịch vụ mạng riêng.
- 2 buổi/học sinh/ngày theo ngày Việt Nam (UTC+7), tính chung các cấp. Admin có 5 buổi thử/ngày. Bắt đầu rồi bỏ buổi vẫn tính hạn mức. Buổi đang hoạt động được mở lại, không trừ buổi mới.
- Groq có hạn mức dùng chung theo tài khoản/mô hình. Mức giới hạn trong app không bảo đảm mọi yêu cầu đều được Groq chấp nhận. Khi 429, giữ câu trả lời để người học bấm thử lại; không tự gọi thêm, đổi nhà cung cấp hoặc nâng gói. Xem [hạn mức Groq](https://console.groq.com/docs/rate-limits).

## Dữ liệu và bảo vệ tài nguyên

Không lưu audio/video, tệp media hoặc URL media trong database/storage. Trình duyệt giữ bản ghi trong bộ nhớ trang; chỉ gửi WAV mono 16 kHz khi bấm Gửi. Dừng ghi, chuyển tab và rời trang đều dừng các track micro. Server chỉ giữ buffer trong lúc xử lý, xóa buffer upload và multipart sau yêu cầu. Tổng thời gian hai bước AI nằm trong khoảng 50 giây, phù hợp cấu hình hàm 60 giây hiện có.

Trong buổi đang học, DB giữ tạm tối đa 6 tin chữ, phản hồi gần nhất để thử lại và tổng kết tích lũy. Kết thúc thủ công hoặc đủ số lượt sẽ xóa ngữ cảnh và cache phản hồi, chỉ giữ thông tin buổi/tổng kết cùng mã/hash chống gửi trùng. Nếu rời trang, có thể tiếp tục trong 30 phút kể từ lúc mở buổi; sau đó lần truy cập API hội thoại tiếp theo dọn các buổi hết hạn và xóa ngữ cảnh. Không có cron bảo đảm thời điểm xóa đúng phút thứ 30; nếu hệ thống ngừng nhận yêu cầu, ngữ cảnh hết hạn được dọn khi dịch vụ được truy cập trở lại. Cơ chế backup của DB vẫn theo chính sách vận hành DB.

Khóa hàng profile bảo đảm giới hạn buổi khi nhiều yêu cầu cùng lúc. Mỗi lượt có số thứ tự + UUID + hash; cache trả lại lượt đã xử lý, không gọi AI lần nữa. Lease ngăn hai câu trả lời chạy đồng thời; lease thất bại được giải phóng, lease treo hết hạn sau 75 giây. Không giữ transaction DB trong lúc chờ AI. Nội dung học sinh không được dùng làm system prompt; danh tính/quyền học và cấu hình được xác nhận trên server.

## Cập nhật và kiểm tra

1. MySQL: `npm --prefix backend run db:migrate` (migration `035_chinese_ai_chat.sql`). PostgreSQL: áp dụng file `backend/sql/postgres/035_chinese_ai_chat.sql` trong đúng schema trước khi phát hành code. Bản PG bật RLS, thu hồi quyền truy cập trực tiếp của `anon`/`authenticated`.
2. Không sửa khóa, gói dịch vụ, dữ liệu bài học hoặc lịch sử cũ. Migration chỉ thêm hai bảng.
3. Backend: `cd backend` rồi `npx vitest run tests/chinese-ai-chat.test.js tests/chinese-speaking-assessment.test.js --config vitest.config.js`.
4. UI: `npx playwright test --config playwright.ai-chat.config.js`. Các API UI dùng stub, không gửi dữ liệu thật hoặc tạo kết quả online.
5. Trước khi dùng thật, chủ web thử micro/quyền truy cập, giọng tiếng Trung, ghi lại, kết thúc và xem tổng kết bằng tài khoản học sinh trên điện thoại thực tế.
