# Nâng cấp trải nghiệm học sinh

Phạm vi được yêu cầu: trang chủ cá nhân hóa, điều hướng chung, buổi học ngắn, ôn và tiến bộ theo dữ liệu thật, thành tích/bạn đồng hành/vật phẩm, hoạt động từng môn, lưu nháp/cài đặt, bài trải nghiệm, giao bài và phụ huynh liên kết có xác nhận.

Các lối vào:

- Học sinh: **Trang chủ → Bài học → Bài kiểm tra → Cá nhân**, thống nhất trên ba chương trình. Trang chủ có bài đang dở, nhiệm vụ, thống kê tuần và gợi ý ôn.
- **Học hôm nay**: chọn 5/10/15 phút, bài đang học trên lớp, lượt khám phá 5 câu, hoặc ôn lỗi. Số câu phụ thuộc nội dung đã xuất bản; thời lượng là lựa chọn ước lượng, không phải bộ đếm ép học sinh.
- **Tiến bộ**: theo chủ đề/bộ từ. Nhãn “vững” cần đạt ít nhất 80% trong hai ngày khác nhau. Lịch ôn là quy tắc đơn giản, chưa phải mô hình đo năng lực được chuẩn hóa.
- **Bài kiểm tra**: đi thẳng đến kiểm tra chủ đề/học kì/cả năm của lớp đang học, hoặc bài kiểm tra Tiếng Trung. Các luồng thử thách tuần, đấu bạn và Robot đã được gỡ bỏ cả giao diện và API.
- **Cá nhân**: màn hình đầu chỉ có thẻ tài khoản, bốn mục “Cài đặt học”, “Thành tích & trang trí”, “Bài viết đã lưu”, “Liên kết phụ huynh” và hai liên kết chữ đến lịch sử/đổi khóa. Không lặp danh sách buổi học gần đây hoặc trải toàn bộ biểu mẫu, vật phẩm trên trang. Mỗi mục mở bảng chi tiết, là hộp thoại ở máy tính và bảng từ dưới lên ở điện thoại, đóng bằng nút hoặc Escape và trả lại vị trí bàn phím.
- Cài đặt học chỉ lưu thời lượng, cỡ chữ và tốc độ đọc. Tên bạn đồng hành, hiệu ứng và vật phẩm nằm trong Trang trí; lưu một nhóm không ghi đè nhóm còn lại. Cấp bạn đồng hành tăng mỗi 5 buổi học hoàn thành trên toàn tài khoản. Vật phẩm dùng số dư ví chung trong bảng đổi vật phẩm; thanh đầu trang vẫn hiển thị kim cương theo hệ đang học.
- Dữ liệu thành tích/vật phẩm và bài viết được tải khi mở mục tương ứng. Yêu cầu phụ huynh chờ xác nhận vẫn báo ngay trên hàng “Liên kết phụ huynh”. Đóng bảng bài viết giữ bản nháp của thẻ trình duyệt, chờ các lần lưu đang chạy; mở lại có thể tiếp tục viết. API lưu và kiểm tra phiên bản bài viết giữ nguyên.
- Admin: **Giao bài & phản hồi**, chọn khóa, học sinh thuộc phạm vi quản lý, bộ câu hỏi hoặc bài viết; xem bài đã nộp, nhận xét và cho điểm. Có số liệu sử dụng buổi học cá nhân trong phạm vi được quản lý.
- Phụ huynh: đăng ký tại cùng trang Gmail, chọn “Phụ huynh”. Học sinh tạo mã ghép trong Cá nhân, phụ huynh nhập mã, học sinh đồng ý rồi báo cáo mới mở. Hai bên có thể thu hồi liên kết. Mã ghép không phải link mời đăng ký.
- Khách: `/pages/demo/`, 5 câu minh họa tự biên soạn, không mở ngân hàng khóa học và không ghi thành tích tài khoản.

Hoạt động theo môn là bộ khởi đầu: phân số/trục số/mua hàng; phương trình/đồ thị/tam giác có đỉnh kéo được; đọc tìm bằng chứng/lập dàn ý/xếp câu; hội thoại/nghe điền từ/ghi âm; từ vựng tiếng Trung đã xuất bản/thanh điệu/12 mẫu chữ viết. Ghi âm chỉ lưu tạm trong trang trên thiết bị. Các hoạt động có [thưởng hoàn thành](learning-rewards.md), không thay đổi điểm năng lực; tự luận do học sinh tự đối chiếu hoặc giáo viên nhận xét, phát âm tự luyện chưa được AI chấm.

Lưu trữ và phân quyền:

- Máy chủ giữ đáp án, chấm câu, cập nhật kỹ năng và thưởng; không nhận điểm hay giá vật phẩm do trình duyệt khai. Quest mỗi ngày/mỗi khóa nhận một lần, mua vật phẩm không thể trừ tiền hai lần hoặc làm âm ví. Bảng xếp hạng tính kim cương kiếm được; ví tính cả vật phẩm đã đổi.
- Buổi học, bản nháp và bài viết thuộc tài khoản; sửa đồng thời có kiểm tra revision. Thẻ trình duyệt giữ phần đang gõ để khôi phục sau tải lại nếu phiên bản trên máy chủ còn khớp. Đồng bộ thiết bị khác cần mạng và lần lưu thành công; chưa có chế độ học toàn bộ offline.
- Sổ lỗi dùng câu trả lời gần nhất của cả luồng cũ và buổi học mới. Báo cáo 7 ngày gộp các lượt học; thời gian chỉ là ước tính, đã ghi rõ trong báo cáo.
- Admin Tiếng Trung tiếp tục không thấy học sinh riêng do admin tổng tạo. Người tự đăng ký vẫn dùng quy tắc chia sẻ hiện có. Mỗi API nội dung kiểm tra quyền học; bài chưa đủ câu đã xuất bản sẽ báo rõ để giáo viên bổ sung.
- Tài khoản phụ huynh có usage mode riêng, không được nâng quyền admin. Gmail đã xác minh và liên kết được học sinh đồng ý đều bắt buộc để đọc báo cáo. Không có API đọc bài riêng trong gallery của học sinh cho phụ huynh.

Triển khai: migration `032_student_experience.sql` cho MySQL và PostgreSQL, thêm 14 bảng, `profiles.account_kind` và hai lý do sổ kim cương. Các bảng PostgreSQL bật RLS, thu hồi quyền truy cập trực tiếp của `PUBLIC`, `anon`, `authenticated`; API máy chủ quản lý quyền đọc/ghi. Migration chỉ thêm cấu trúc và mở rộng enum, giữ lịch sử học và dữ liệu thương mại.

Kiểm chứng: toàn bộ backend, 6 luồng trình duyệt thật trên desktop/mobile, 36 hồi quy giao diện học sinh và 8 kiểm tra phân quyền admin. `node --use-system-ca backend/scripts/check-student-experience.mjs` chạy đối chiếu PostgreSQL bằng fixture luôn rollback; `npm run build:vercel` kiểm tra đóng gói tài nguyên. Chạy kiểm thử tích hợp MySQL tuần tự vì dùng chung cơ sở dữ liệu test.

Dữ liệu nét chữ được giữ nguyên từ [Hanzi Writer Data](https://github.com/chanind/hanzi-writer-data), bắt nguồn từ Make Me A Hanzi và phông Arphic; xem README và giấy phép đi kèm tại `frontend/assets/data/hanzi/`. Không tải mã thực thi bên thứ ba vào trình duyệt cho hoạt động này.
