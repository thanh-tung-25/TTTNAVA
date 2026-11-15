# Thưởng kim cương khi học

Học sinh nhận thêm **1 kim cương khi hoàn thành hoạt động**. Mỗi hoạt động của một bài/chặng chỉ nhận một lần trong ngày theo giờ Việt Nam. Thưởng tự học mới giới hạn **20 kim cương/ngày cho mỗi hệ** Tiểu học, THCS, Tiếng Trung. Cách thưởng quiz, bài kiểm tra và nhiệm vụ có sẵn giữ nguyên.

| Hoạt động | Mốc hoàn thành |
| --- | --- |
| Từ mới, thẻ lật | Học và xác nhận 5 từ khác nhau; bài ít hơn 5 từ thì học hết |
| Luyện nghe | Trả lời hết chặng 10 từ; chặng cuối có thể ít hơn |
| Vận dụng | Làm hết lượt tối đa 10 câu của dạng đã chọn |
| Bài đọc, ngữ pháp, hội thoại | Xác nhận đã học hết các mục đọc của bài |
| Luyện viết chữ | Thực hành ít nhất 3 nét có chuyển động, tổng ít nhất 15 điểm |
| Ghi âm tự luyện | Ghi âm ít nhất 5 giây rồi hoàn thành lượt đọc |
| Chấm luyện nói | Hoàn thành lượt chấm với lời nói nhận diện được cho mọi câu |
| Giao tiếp AI | Hoàn thành 3 lượt trò chuyện thành công |
| Phố tiếng Trung | Hoàn thành đúng tất cả nhiệm vụ hiện hành của bài trong cùng ngày |
| Hoạt động tương tác | 5 tương tác khác nhau; một lượt thưởng cho góc tương tác của khóa/ngày |
| Buổi học | Hoàn thành đủ câu theo chế độ của buổi học |
| Phiếu bài tập | Trả lời tất cả câu và nộp; phần giáo viên chấm vẫn giữ quy trình cũ |
| Bài viết được giao | Nộp bài viết hợp lệ theo yêu cầu tối thiểu hiện hành |

Thưởng ghi nhận việc luyện tập, không thay cho điểm đúng/sai hoặc đánh giá chữ viết. Ghi âm tự luyện vẫn ở thiết bị; chứng cứ thưởng chỉ gửi thời lượng, không gửi âm thanh. Bản vẽ chỉ dùng kiểm tra lượt viết, không lưu các điểm nét vào kết quả lâu dài.

Máy chủ kiểm tra tài khoản, quyền vào khóa, nguồn bài đang xuất bản và kết quả hoàn thành. `study_activity_sessions` lưu nguồn đã chốt cho các phần tự luyện. Mỗi lần hoàn thành và cộng thưởng nằm trong cùng transaction, khóa hồ sơ và dùng khóa nhận thưởng duy nhất trong `student_quest_claims`. Tải lại, gửi lại hoặc mở nhiều tab không cộng lại cùng phần trong ngày. Admin và tài khoản phụ huynh không nhận thưởng.

Sổ kim cương dùng loại `quest_reward` tham chiếu nhiệm vụ và khóa học. Vì vậy tổng trên đầu trang và bảng xếp hạng Tiếng Trung nhận đúng hệ; ví chi tiêu vẫn là tổng toàn tài khoản. Không thêm kim cương hồi tố cho lịch sử thiếu bằng chứng.

Triển khai MySQL bằng migration `039_study_activity_sessions.sql`. PostgreSQL dùng `node --use-system-ca backend/scripts/prepare-study-rewards.mjs --production --apply`; công cụ lưu fingerprint và kiểm tra sổ kim cương trước/sau thay đổi schema, không sửa lịch sử.
