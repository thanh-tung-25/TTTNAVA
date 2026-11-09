# Góc ôn tập, phản ánh và quiz theo nội dung

## Học sinh

- **Góp ý / Báo lỗi** nằm trên đầu trang của tài khoản đăng nhập. Chọn lỗi câu hỏi, đáp án/lời giải, âm thanh, ảnh, giao diện, tài khoản, thanh toán, đề xuất hoặc lỗi khác. Nút **Phản ánh câu này** gửi kèm nội dung câu và đường dẫn để quản trị viên kiểm tra. Không tự gửi thông tin, ảnh màn hình hay âm thanh khi chưa bấm Gửi. Lịch sử **Phản ánh của tôi** cho xem trạng thái và phản hồi.
- **Thêm → Góc ôn tập** gồm tìm nội dung, sổ câu sai và mục tiêu 7 ngày. Tìm từ tiếng Trung bằng Hán tự, pinyin có/không dấu, hoặc nghĩa. Các môn tiểu học tìm theo tên chủ đề hoặc nội dung câu hỏi đã xuất bản trong lớp đang học. Kết quả không mở nội dung khóa chưa được cấp.
- **Sổ câu sai** lấy các lượt đã lưu theo tài khoản và khóa đang chọn: luyện tập, bài thi đã nộp, thách đấu kết thúc, phiếu đã chấm và quiz tiếng Trung. Kết quả mới nhất đúng sẽ loại câu đó khỏi danh sách; các nguồn có giới hạn truy vấn an toàn (200 câu hiển thị, tối đa 300 lượt tiếng Trung/1.000 câu mỗi nguồn tiểu học). Câu tự luyện không lưu server không nằm trong sổ. Có ô tự trả lời trước khi mở lời giải; phần này không tự chấm hay cộng Kim Cương. Mở lượt gốc để xem đáp án và bài làm. Học hôm nay tạo lượt 10 câu trong chủ đề cần ôn của tiểu học; quiz ôn tiếng Trung vẫn giữ 20 câu.
- **Mục tiêu** chọn 1–7 ngày học trong 7 ngày gần nhất, lưu trên server riêng từng tài khoản/khóa. Ngày tính theo UTC+7, dựa vào lượt hoàn thành đã lưu. Huy hiệu động viên tính từ tiến độ thật; không phát Kim Cương, không phải hệ thống phần thưởng mới. Đếm dựa trên cùng dữ liệu báo cáo 7 ngày (tối đa 1.000 lượt mỗi nguồn).
- Trang chủ/Học tập của khóa tiếng Trung hiện nhắc từ đến lịch ôn. Nhắc không tự đọc và không ép học; dẫn đến Sổ từ với bộ lọc đến hạn.

## Tiếng Trung

Mỗi bộ có **Từ mới** với đúng ba cột: nghĩa tiếng Việt, pinyin, Hán tự. Có lọc theo cả ba trường, nút nghe theo thao tác và liên kết đến thẻ của từ. Nhiều bộ trong cùng bài được hiển thị riêng theo nội dung đã xuất bản của bộ đó.

**Luyện nghe** là lượt tự luyện tối đa 10 từ trong bộ, chỉ bắt đầu phát khi bấm nghe. Học sinh chọn nghĩa, xem Hán tự/pinyin và kết quả sau khi chọn. Không lưu điểm nghe, không tự đánh dấu Đã nhớ và không cộng Kim Cương. Cần ít nhất hai nghĩa khác nhau để có lựa chọn. Nguồn âm thanh dùng cơ chế hiện có, gồm MP3 backend khi thiết bị thiếu giọng; cần cấu hình âm thanh online đúng như chức năng đọc đề.

**Quiz 20 câu** mở màn hình chọn cách luyện:

1. **Luyện theo phần**: mỗi phần lấy theo thứ tự tài liệu, có xem trước câu hỏi, không lộ đáp án. Phần cuối có thể giao với phần trước để đủ 20 câu duy nhất. Học bảng từ và xem trước trước khi bắt đầu. Đây là chia theo câu hỏi nguồn, chưa phải chia theo từng nhóm từ do giáo viên gắn nhãn.
2. **Ôn câu đã làm**: chỉ dùng ID câu đã chốt trong các lượt của bộ, ưu tiên câu có kết quả gần nhất sai. Cần đủ 20 câu đã làm, không bù bằng câu mới. “Đã làm” không đồng nghĩa với đã thành thạo. Khi chưa đủ, dùng sổ câu sai hoặc luyện từng phần trước.

Lượt đang làm vẫn được tiếp tục trước khi tạo lượt mới. Lựa chọn/phần được lưu trong snapshot và giữ khi làm lại; API cũ không truyền cách chọn vẫn tương thích. Bài kiểm tra có cấu hình riêng không đổi nguồn hoặc số câu từ frontend.

Trong quiz có thanh số câu, nút **Câu trước** và **Về câu đang làm**. Câu đã chốt xem được đáp án/lời giải nhưng không sửa; không cho nhảy vượt câu chưa làm. Khi quay lại, câu trả lời đang nhập được lưu ở server mà chưa chấm. Chốt câu cuối vẫn tự hoàn thành theo quy tắc hiện tại. Gợi ý cách làm không chứa đáp án chưa được phép xem; hiện là hướng dẫn theo dạng bài, không phải nội dung AI sinh riêng cho từng câu.

## Quản trị

**Phản ánh người dùng** có bộ lọc trạng thái, nội dung câu, đường dẫn gặp lỗi, người gửi và phần phản hồi. Admin tổng xem tất cả; admin Tiếng Trung/tiểu học chỉ xử lý phạm vi tương ứng. Phản ánh tài khoản và thanh toán chuyển về admin tổng. Phản ánh không tự chỉnh hoặc gỡ câu hỏi. Quản trị viên cần kiểm tra rồi sửa tại trang nội dung như trước.

API mới: `/api/v1/feedback`, `/api/v1/learning/{search,wrong,week,goal,reminders}`, `/api/v1/chinese/sets/:id/quiz-plan`. Lịch sử cá nhân lấy user từ phiên đăng nhập. Tạo phản ánh có giới hạn tần suất. Trang nhập phản ánh hiện yêu cầu tài khoản đăng nhập, không có form công khai cho người chưa đăng nhập.

## Database và triển khai

Migration `026_learning_feedback.sql` tạo `learning_feedback` và `learning_goals`. Có bản MySQL và PostgreSQL; PostgreSQL bật RLS, không cho anon/authenticated truy cập trực tiếp. Backend kiểm tra quyền trước mọi thao tác. Migration không sửa bảng bài học hay tiến độ cũ.

MySQL: `npm --prefix backend run db:migrate`.

PostgreSQL: sau khi đã xác nhận `backend/.env.vercel` trỏ đúng database đích và có quyền cập nhật:

```powershell
node --input-type=module -e "process.loadEnvFile('backend/.env.vercel');process.argv.push('--apply');await import('./backend/scripts/apply-learning-upgrade.mjs')"
```

Hoặc chạy `backend/sql/postgres/026_learning_feedback.sql` trong transaction có `SET LOCAL search_path TO ttnava_stage, pg_catalog;` nếu đó là PGSCHEMA đang dùng. Script và migration dùng CREATE IF NOT EXISTS, không xóa dữ liệu. Preflight/deploy cần đủ hai bảng trước khi đưa code mới lên.

## Đề xuất để bám sách giáo khoa và từ đã học

Phân biệt **học theo bài**, **ôn đã học** và **kiểm tra tổng hợp**. Với SGK, nguồn phải gắn bộ sách → học kì → chủ đề → bài bằng metadata thật, rồi học sinh chọn bài đã học. Không suy ra nội dung đã học chỉ từ lớp hoặc ngày mở tài khoản. Khi thiếu câu ở bài đã chọn, hiển thị thiếu nội dung thay vì tự trộn bài khác.

Với tiếng Trung, bước tiếp theo nên gắn mỗi câu với các từ cần biết (kể cả từ trong lựa chọn nhiễu), rồi cho chọn nhóm từ đã học. Các Word hiện có chưa liên kết đầy đủ câu–từ, nên hiện tại không thể khẳng định quiz theo phần chỉ chứa từ đã thuộc. Bản này đưa ra xem trước, bảng từ mới và chế độ ôn chỉ câu đã làm để học sinh chủ động kiểm soát. Không tự gán nhãn thành thạo hoặc thay toàn bộ câu hỏi bằng suy đoán.

Không có chức năng giáo viên giao bài cho nhóm trong thay đổi này.
