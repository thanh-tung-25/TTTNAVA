# Trò chuyện giọng nói tiếng Trung cùng Sư tử AI

## Cách dùng

Vào **Tiếng Trung → Giao tiếp với AI**, chọn bài và bấm **Bắt đầu trò chuyện** một lần. Cho phép micro; AI nói tiếng Trung trước, sau đó app tự nghe người học. Khi người học ngừng khoảng 1,4 giây, app gửi lượt nói để nhận diện và tạo lời đáp. AI nói xong thì app tự nghe tiếp. Hai bên có thể hỏi, trả lời và kể chuyện tự nhiên theo chủ đề của bài.

Ba nút trong buổi:
- **Tạm dừng / Tiếp tục**: tắt hoặc mở lại micro.
- **Nói xong**: gửi lượt nói ngay khi không muốn đợi phát hiện khoảng lặng.
- **Kết thúc**: dừng micro, hủy yêu cầu đang đợi và xóa nội dung khỏi trang. Nút nằm ở đầu thẻ để dễ tìm trên điện thoại.

Mục **Hiện chữ khi cần** mặc định đóng, có dịch nghĩa, nghe lại và nghe chậm. **Nhập chữ thay micro** là phương án dự phòng khi không dùng được micro hoặc giọng đọc. Không có bước nghe lại bản ghi rồi nộp bài, chấm điểm hay gửi tổng kết cho giáo viên. Chức năng **Luyện nói** có chấm bài là mục riêng, vẫn hoạt động như trước.

Mỗi buổi tối đa 5 phút hoặc 20 lượt người học, mỗi lượt âm thanh tối đa 20 giây. Hệ thống tự ngắt một lượt nói dài để giữ giới hạn này. Nếu không phát hiện người nói trong 25 giây, app tạm dừng micro. Chuyển tab cũng tạm dừng; khi quay lại, người học chủ động bấm Tiếp tục.

Đây là hội thoại tự chuyển lượt: nghe → nhận diện → tạo đáp → đọc → nghe tiếp. Có khoảng chờ mạng và xử lý AI; chưa hỗ trợ nói chồng lên AI như cuộc gọi hai chiều đồng thời.

## Giao diện giáo viên

Admin Tiếng Trung và admin tổng vào cùng mục, chọn đúng bài, mở **Sửa chủ đề trò chuyện** để sửa tình huống, mục tiêu, câu mở đầu, nghĩa tiếng Việt và từ gợi ý cho AI. Lưu rồi bấm bắt đầu để thử như học sinh.

Không còn bảng tổng kết học sinh trong mục này. API báo cáo cũ trả HTTP 410 và không trả nội dung lịch sử. Tham số số lượt cũ trong cấu hình vẫn được chấp nhận để tương thích dữ liệu, nhưng buổi giọng nói mới dùng giới hạn chung 20 lượt / 5 phút.

## Dịch vụ và hạn mức

Tận dụng khóa Groq hiện có của phần luyện nói:

```dotenv
CHINESE_SPEAKING_AI_ENABLED=true
GROQ_API_KEY=<khóa riêng chỉ đặt trên backend>
GROQ_ZERO_DATA_RETENTION_CONFIRMED=true
```

Chủ web phải kiểm tra **Global ZDR** đã bật trong Groq Data Controls. Biến xác nhận trên chỉ là xác nhận thủ công, không tự bật hay kiểm chứng cài đặt tài khoản. Xem [chính sách dữ liệu Groq](https://console.groq.com/docs/your-data).

- Nhận diện: `whisper-large-v3`, ngôn ngữ `zh`, timeout 25 giây.
- Tạo lời đáp: `openai/gpt-oss-120b`, JSON được kiểm tra chặt, tối đa 600 token đầu ra, timeout 25 giây. Không yêu cầu nhận xét hoặc điểm số.
- Đọc tiếng Trung: giọng `zh` của thiết bị qua Speech Synthesis, không thêm dịch vụ TTS trả phí. Nếu máy không có giọng, app tạm dừng và hướng dẫn mở chữ; người học có thể tiếp tục dùng micro sau khi đọc. Bộ máy đọc của thiết bị có thể dùng mạng riêng, tùy hệ điều hành.
- 2 buổi/học sinh/ngày theo UTC+7, tính chung các cấp; admin có 5 buổi thử/ngày. Bắt đầu rồi bỏ buổi vẫn tính hạn mức. Một buổi cùng bài còn hoạt động có thể được dùng lại trong thời gian còn lại; không khôi phục nội dung đã mất sau tải lại trang.
- Khi gặp 429, app tạm dừng và giữ tạm lượt chưa gửi thành công để người học thử lại. Không tự lặp vô hạn, đổi nhà cung cấp hay nâng gói. Hạn mức Groq dùng chung với các tính năng khác nên quota của app không bảo đảm Groq luôn nhận yêu cầu. Xem [hạn mức Groq](https://console.groq.com/docs/rate-limits).

## Dữ liệu và quyền riêng tư

**Các buổi phiên bản mới không ghi nội dung hội thoại, transcript, bản ghi âm hoặc tổng kết vào database hay storage.** Không gửi kết quả tới giáo viên. Server chỉ nhận âm thanh và văn bản để xử lý yêu cầu hiện tại; buffer upload và multipart được xóa sau xử lý. Âm thanh vẫn được truyền tới Groq để nhận diện; yêu cầu không lưu tại nhà cung cấp phụ thuộc cấu hình ZDR thực tế.

App vẫn giữ **metadata giới hạn sử dụng** trong database: mã tài khoản/buổi/bài, thời điểm, trạng thái, số lượt, snapshot chủ đề do giáo viên soạn, lease và mã/hash chống gửi trùng. Đây không phải chế độ không ghi bất kỳ dữ liệu nào. Các cột `context`, `summary` và `last_response` luôn NULL với buổi mới.

Ngữ cảnh tối đa 6 tin gần nhất nằm trong token AES-256-GCM, gắn với tài khoản, buổi, số lượt và thời hạn. Token chỉ nằm trong biến của trang, không vào URL, localStorage hoặc sessionStorage; server không cache token. Trình duyệt chỉ hiển thị lời đáp gần nhất khi mở chữ. Kết thúc hoặc rời trang xóa nội dung trên trang; tải lại không khôi phục cuộc trò chuyện.

Mỗi lượt có số thứ tự + UUID + hash; lease 75 giây ngăn gọi đồng thời, không giữ transaction DB trong lúc chờ AI. Nếu server đã xử lý nhưng kết nối mất phản hồi, yêu cầu trùng không gọi AI lần nữa: trả câu đề nghị nói lại và token tiếp tục, vì server không giữ lời đáp cũ. Kết thúc trong lúc AI đang xử lý sẽ vô hiệu hóa lượt đó, không cho lưu hay mở micro lại khi phản hồi đến muộn.

Dữ liệu tổng kết của **phiên bản cũ**, nếu đã tồn tại trong database hoặc backup, không bị âm thầm xóa bởi thay đổi này. App đã ngừng hiển thị/chia sẻ qua API báo cáo; việc xóa lịch sử cũ và xử lý backup cần quyết định riêng của chủ hệ thống.

## Cập nhật và kiểm tra

- Cài mới cần migration `035_chinese_ai_chat.sql` (MySQL hoặc PostgreSQL tương ứng). Nếu đã có bảng này, thay đổi giọng nói mới **không cần thêm migration hoặc seed**, không phải đồng bộ lại câu hỏi/bài học.
- Chỉ phát hành code khi được chủ web cho phép. Reload trang sau khi cập nhật để dùng giao thức token mới; phiên giao diện cũ thiếu token sẽ bị từ chối an toàn.
- Backend: chạy `npx vitest run tests/chinese-ai-chat.test.js tests/chinese-speaking-assessment.test.js tests/chinese-street.test.js --config vitest.config.js` trong thư mục backend.
- UI: `npx playwright test --config playwright.ai-chat.config.js`. Dùng API stub và micro thử của Chromium; không tạo bài nộp, gọi Groq hay ghi dữ liệu online.
- Cần thử thêm trên điện thoại thực tế: cấp quyền micro, giọng Trung đã cài, phát hiện khoảng lặng ở nơi yên tĩnh/ồn, tự chuyển lượt, tạm dừng khi khóa màn hình và kết thúc. Kiểm thử trình duyệt tự động không thay thế được kiểm tra phần cứng và chính sách âm thanh của từng máy.
