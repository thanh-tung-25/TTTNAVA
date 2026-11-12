# Phố tiếng Trung

Học sinh vào **Tiếng Trung → Phố tiếng Trung**, hoặc bấm **Phố tiếng Trung** trong thẻ của từng bài. Phố HSK 1 có 8 địa điểm và 30 nhiệm vụ cho 10 bài. Bài 1–3 cùng ở trường; các bài tiếp theo lần lượt ở công viên, nhà hàng, văn phòng, ngân hàng, tiệm bánh, rạp phim và ngôi nhà.

Học sinh bấm nghe hoặc nghe chậm, sau đó chọn lời đáp hay chạm đúng địa điểm trên bản đồ. Chữ Trung được ẩn mặc định; **Hiện chữ khi cần** cho phép tiếp tục nếu máy thiếu giọng Trung. Đáp án và lời giải không được trả về trước khi làm đúng. Lựa chọn sai chỉ gợi ý nghe lại, không lộ đáp án. Tất cả câu hỏi và lời giải đã soạn sẵn; tính năng không gọi Groq hoặc dịch vụ AI nào, không thu micro/camera và không lưu media.

## Tiến độ và sao

- Đúng lần đầu: 3 sao; sau một lần sai: 2 sao; sau hai lần sai trở lên: 1 sao.
- Tiến độ lưu theo tài khoản, bài và nội dung nhiệm vụ. Tải lại trang sẽ mở nhiệm vụ chưa hoàn thành đầu tiên.
- Luyện lại giữ nguyên sao đã đạt, không cộng sao trùng và không giảm sao cũ. Đây là sao trong Phố tiếng Trung, không cộng vào ví kim cương hoặc điểm thi.
- Gửi lại cùng mã lượt trả về kết quả cũ. Khóa hàng tài khoản bảo đảm các yêu cầu đồng thời không cộng sai tiến độ.
- Nếu cô sửa nội dung, nhiệm vụ dùng một phiên bản tiến độ riêng. Kết quả phiên bản trước vẫn có trong DB; màn hình và báo cáo chỉ tính nội dung hiện tại.

## Admin

Admin tổng và admin Tiếng Trung có cùng bản đồ tại **Tiếng Trung → Phố tiếng Trung**. Chọn bài để nghe/xem thử, sửa ngay ở **Soạn ngay nhiệm vụ đang xem**:

- Chọn địa điểm, mở/tạm dừng bài trong phố.
- Sửa tên, hướng dẫn, câu nghe tiếng Trung và lời giải.
- Chọn dạng trả lời: chọn câu (2–4 phương án) hoặc chạm bản đồ.
- Chọn đáp án, thêm/bỏ nhiệm vụ (1–6 nhiệm vụ/bài), xem thử rồi lưu.
- Bài đang nháp có thể soạn và xem thử, học sinh chỉ thấy khi bài học được xuất bản.

Nút **Xem thử phần vừa sửa** sử dụng nội dung đang soạn; chỉ **Lưu nhiệm vụ cho bài này** mới cập nhật nội dung học sinh nhận. Hai cửa sổ sửa cùng bài được kiểm tra revision để tránh ghi đè thay đổi. Thử bài của admin không ghi sao/tiến độ. Mục **Tiến độ học sinh trong phố** hiển thị người học, bài, số nhiệm vụ hoàn thành, sao, số lần thử sai trước khi hoàn thành và thời gian gần nhất.

## Giọng đọc và bản đồ

Đọc bằng giọng `zh` có trên thiết bị, ưu tiên `zh-CN`; không có fallback tới API đọc online của app. Nếu máy không có giọng Trung, app báo rõ và cho mở chữ. Giọng của hệ điều hành có thể cần mạng riêng. Thử trên điện thoại thật để kiểm tra âm thanh và quyền phát của trình duyệt. Chuyển tab, đổi nhiệm vụ hoặc rời trang đều dừng đọc.

Bản đồ luôn giữ hai cột theo cùng thứ tự để các câu “bên trái/bên phải” đúng trên mọi thiết bị: nhà hàng ở bên trái ngân hàng, văn phòng ở bên trái tiệm bánh, rạp phim ở bên trái ngôi nhà. Các câu hỏi địa điểm dùng quan hệ này. Nếu cô sửa lời chỉ đường, cần xem thử để chắc câu còn khớp vị trí tòa nhà. Tám hình SVG được vẽ riêng cho tính năng; không thay logo và không có hình cú.

## Cập nhật và kiểm tra

1. MySQL: chạy `npm --prefix backend run db:migrate` để thêm migration `036_chinese_street.sql`.
   Để nạp nội dung mặc định vào bảng XAMPP local, chạy `node backend/scripts/seed-chinese-street.mjs`. Script chỉ thêm bài còn thiếu, giữ nguyên nội dung cô đã sửa, không đụng tiến độ học sinh; đồng thời tạo `tai-lieu/pho-tieng-trung/pho-tieng-trung-xampp.sql` để kiểm tra/nhập bằng phpMyAdmin. File dành riêng cho database `kids_learning` trên MySQL/MariaDB, không dùng cho PostgreSQL online.
2. PostgreSQL: chạy `backend/sql/postgres/036_chinese_street.sql` trong đúng schema trước khi phát hành code. Hai bảng mới có RLS và không cấp quyền trực tiếp cho `anon`/`authenticated`.
3. Kiểm thử backend: `cd backend` rồi `npx vitest run tests/chinese-street.test.js --config vitest.config.js`.
4. Kiểm thử giao diện: `npm run test:street`. Dữ liệu UI giả lập, không ghi tài khoản/kết quả online hoặc gọi AI.
5. Hình SVG có sẵn trong source; tái tạo nếu cần: `node backend/scripts/build-chinese-street-art.mjs`.
6. Build hiện có tự sao chép CSS/JS/hình mới. `npm run preflight:deploy` kiểm tra các bảng và module bắt buộc. Không có khóa API hoặc cấu hình Groq mới cần nhập.
