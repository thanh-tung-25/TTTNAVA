# Học tập dễ tiếp cận và hỗ trợ phụ huynh

## Nghe từng lựa chọn

Các màn hình luyện tập, thi thử, thách đấu, phiếu bài tập, quiz và vận dụng tiếng Trung có nút loa riêng cạnh lựa chọn. Nút nằm cạnh vùng chọn, không lồng trong nút/radio; nghe không làm chọn đáp án. Đúng/sai, thẻ xếp thứ tự và các nhãn nối cặp cũng có nút nghe phù hợp. Dùng cùng cơ chế đọc đề: chỉ phát khi bấm, có dừng, ưu tiên giọng cài sẵn và dự phòng MP3 qua backend. Không đọc hoặc suy ra đáp án đúng. Đọc đáp án/giải thích sau khi chấm không tự phát.

## Bé mới học

Nút **🌱 Bé mới học** đặt đầu phần nội dung của các trang học sinh. Bật sẽ tăng cỡ chữ/nút, giữ một câu đang làm trên màn hình và thêm hướng dẫn có thể nghe. Các lựa chọn là từ tên con vật được hỗ trợ (Việt/Anh/Trung) có hình đại diện tương ứng; số nguyên 1–10 có nhóm chấm để đếm. Nội dung không nhận diện giữ nguyên chữ, không tự gán tranh phỏng đoán. Giữ nguyên chữ và dữ liệu chấm điểm. Chế độ lưu trên trình duyệt, riêng từng tài khoản; không thay đổi cấp lớp hay quyền khóa học.

## Học hôm nay

Vào **Học tập → Học hôm nay**, hoặc **Thêm → Học hôm nay**. API chỉ dùng khóa đang chọn và đã được mở.

- Tiểu học: chọn chủ đề có câu từng sai và đủ 10 câu, ưu tiên đưa các câu sai trong chủ đề vào lượt mới. Khi chưa có dữ liệu sai, chọn một chủ đề đủ câu theo ngày. Lượt vẫn là luyện tập tiêu chuẩn 10 câu, dùng chấm điểm và Kim Cương hiện tại; không tạo cơ chế thưởng mới. Có thể tiếp tục lượt đang làm trong chủ đề được chọn.
- Tiếng Trung: tối đa 5 từ đến lịch ôn; khi chưa có thì lấy một nhóm từ của bài đã xuất bản. Sau đó mở phần vận dụng 10 câu hoặc thẻ học nếu bài chưa có vận dụng. Đây là gợi ý khoảng 10 phút, không ép thời gian hoặc tự đánh dấu đã thành thạo.

## Báo cáo cho phụ huynh

Vào **Học tập → Báo cáo cho phụ huynh**, hoặc **Thêm → Báo cáo phụ huynh**. Phụ huynh cùng xem trong tài khoản học sinh đang đăng nhập. Chưa có tài khoản phụ huynh/ghép con riêng và không có liên kết công khai chứa dữ liệu học sinh.

Báo cáo theo khóa trong 7 ngày: lượt hoàn thành, điểm trung bình các lượt đã chấm, môn đã học, lượt dưới 70 điểm nên ôn, hoạt động gần đây và lượt chờ chấm. Bao gồm luyện tập, thi thử, phiếu bài tập, thách đấu (tiểu học) hoặc quiz/kiểm tra tiếng Trung. Thời lượng là ước tính theo mốc mở/nộp, tối đa 30 phút/lượt, không phải số phút tương tác thực tế. Chưa có kết quả thì hiển thị trống, không tạo số liệu minh họa. Tự luyện không lưu server chưa tính vào báo cáo.

Có **In / lưu PDF** qua chức năng in của trình duyệt và **Tải bảng kết quả** dạng CSV của các hoạt động gần đây (tối đa 30 dòng). CSV bảo vệ các ô bắt đầu bằng ký hiệu công thức. API luôn dùng ID từ phiên đăng nhập, không nhận ID học sinh để xem người khác.

## Lời mời kết bạn

Khung chat có thẻ lời mời mới kèm ảnh và nút chấp nhận/từ chối ngay ở danh sách trò chuyện, tối đa 3 lời mời xem nhanh. Có nút xem tất cả khi còn nhiều. Badge tính cả tin chưa đọc và lời mời đang chờ. Không tự phát âm thanh thông báo.

## Kiểm tra cập nhật

Admin tổng vào **Kiểm tra cập nhật** để xem phiên bản backend/giao diện và danh sách bảng cần có. So sánh SHA trong `/assets/build-info.json` với API backend; thông báo nếu thiếu bảng hoặc khác phiên bản. Admin chuyên môn không được xem API kiểm tra hệ thống.

Build Vercel sẽ kiểm tra các bảng bắt buộc trước khi đóng gói; thiếu bảng thì dừng với thông báo tên bảng. Không tự chạy SQL hoặc sửa dữ liệu production trong build. Chạy các SQL migration PostgreSQL còn thiếu trước khi deploy; đặc biệt migration 023/024/025 cho vận dụng, chat và kết bạn.

Chạy kiểm tra chỉ đọc:

```powershell
npm run preflight:deploy
node backend/scripts/check-deployment.mjs --origin https://tttnava-backend.vercel.app
```

Lệnh không có `--origin` kiểm tra database đang cấu hình và file nguồn. Lệnh `--origin` kiểm tra các tài nguyên online và đối chiếu phiên bản; không chứng nhận mọi chức năng đã chạy. Cần thử âm thanh thật, đăng nhập và chat trên môi trường triển khai. Các phần hỗ trợ học tập mới không yêu cầu thêm bảng ngoài schema hiện tại.
