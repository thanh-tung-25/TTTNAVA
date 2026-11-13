# Giao diện học Tiếng Trung theo từng bài

Luồng vào học: **Chọn khóa HSK → danh sách toàn bộ bài học → chọn chức năng của bài**. Bấm Vào học ở HSK 1 mở thẳng danh sách các bài thuộc HSK 1, không qua trang chọn hoạt động trung gian.

Danh sách lấy toàn bộ bài đã mở trong khóa từ danh mục hiện có. Nếu HSK 1 có 10 bài, cả 10 bài đều xuất hiện; bài chỉ có từ vựng, chỉ có luyện nói, chưa đủ 20 câu hoặc chưa có bộ nội dung vẫn giữ vị trí trong danh sách. Không lọc bài theo loại hoạt động và không tạo bài học giả để đủ số lượng.

Mỗi bài có ba nhóm chức năng cha. Bấm tên nhóm để mở các chức năng con ngay trong bài; bấm nhóm khác để thu nhóm trước. Bấm lại nhóm đang mở để thu gọn. Mỗi bài có trạng thái mở riêng.

| Nhóm cha | Chức năng con |
| --- | --- |
| Bài tập | Quiz 20 câu, Luyện nghe, Luyện vận dụng, Bài đọc |
| Nhận mặt chữ | Thẻ lật, Từ mới |
| Luyện nói với AI | Luyện nói theo bài, Giao tiếp với AI, Phố tiếng Trung |

Ban đầu chỉ hiện ba nhóm cha, các chức năng con nằm bên trong nhóm tương ứng. Mở nhóm không chuyển trang hoặc tạo lượt làm bài. Chọn chức năng con mới mở đúng công cụ của bài. Chỉ cung cấp công cụ tương ứng khi đã có dữ liệu; nhóm chưa có nội dung vẫn hiện ở trạng thái chưa dùng được.

Luồng hoạt động giữ như trước: bấm **Quiz 20 câu → bản đồ chọn chặng → Bắt đầu / tiếp tục**. Học sinh vẫn chọn chặng đã mở, xem trước câu hỏi, ôn nội dung đã học hoặc tiếp tục chặng đang làm. Sau khi hoàn thành, nút **Về bản đồ khám phá** mở lại màn chọn chặng. Thay đổi chỉ gom vị trí các công cụ vào ba nhóm, không tự bắt đầu hoặc tự chọn thay học sinh.

Giao tiếp với AI và Phố tiếng Trung nhận đúng mã bài đang chọn. Trong trang học chỉ hiện phần đã chọn, đã bỏ hàng menu chuyển chức năng bị trùng với ba nhóm ngoài danh sách. Nút quay lại dẫn về danh sách và cuộn đến đúng bài vừa học để chọn chức năng khác.

Sổ từ, kết quả học tập, bài kiểm tra và bài được giao nằm trong menu ảnh đại diện. Đã bỏ hàng bốn nút ở đầu danh sách bài học. Các tiện ích vẫn mở được từ mọi trang trong khóa Tiếng Trung. Thanh điều hướng chính có năm mục: Khóa học, Bài học, Thử sức, Xếp hạng, Cá nhân; đã bỏ mục Ôn luyện. Màn chọn khóa vẫn hiển thị, kể cả khi chỉ có một khóa được mở.

Mục **Xếp hạng** mở bảng kim cương riêng của Tiếng Trung. Tính kim cương dương đã nhận từ bài tập và thưởng nhiệm vụ của khóa Tiếng Trung, không gộp kim cương môn phổ thông. Thưởng nhiệm vụ phải khớp mã lượt nhận, đúng học sinh và thuộc khóa Tiếng Trung trong `student_quest_claims`; không cộng nhầm thưởng của khóa khác hoặc người khác. Có bảng tuần, tháng và toàn bộ thời gian; mốc tuần/tháng theo giờ Việt Nam, tuần bắt đầu thứ Hai. Học sinh có kim cương Tiếng Trung trước đây hoặc quyền học HSK còn hiệu lực được xếp hạng; không đưa phụ huynh, tài khoản đã xóa hoặc khóa vào bảng. Học sinh nhận ra dòng của mình và vị trí trong top 50; nếu ngoài top 50 thì không hiển thị thứ hạng giả. Bảng chỉ có tên hiển thị, ảnh đại diện và số kim cương. Khóa phổ thông giữ thanh bốn mục và bộ lọc lớp của bảng chung.

Giao diện điện thoại dùng ba nhóm cha trong cùng một hàng cho từng bài; nhóm đang mở có khung màu tương ứng bên dưới, các chức năng con xuống dòng theo chiều rộng màn hình. Giữ toàn bộ chức năng và dữ liệu học tập, thu gọn phần trình bày và các bước chuyển trang.

## Luyện nghe theo chặng

Bấm Luyện nghe để mở màn chọn chặng, mỗi chặng tối đa 10 mục từ trong bài. Các chặng chia theo thứ tự nội dung, không bỏ ngẫu nhiên phần từ còn lại. Chọn chặng rồi bấm Bắt đầu; âm thanh chỉ phát khi học sinh bấm nút nghe. Chặng cuối có thể ít hơn 10 từ, vẫn dùng lựa chọn nhiễu từ kho từ của bài.

Học sinh có thể trở lại màn chọn chặng, tiếp tục phần đang luyện, xem điểm khi hoàn thành và luyện lại. Tiến độ luyện nghe giữ trong lần mở trang hiện tại; tải lại hoặc rời trang sẽ đặt lại phần tự luyện này. Chưa bổ sung lịch sử luyện nghe hoặc đồng bộ tiến độ lên máy chủ, không tính Kim Cương. Quiz và chấm nói giữ quy trình và dữ liệu như trước.

## Phong cách hoạt hình 3D

Dùng hình gấu trúc 3D có sẵn của thương hiệu trong phần giới thiệu khóa, linh vật nhỏ ở từng bài, màu pastel và nút có mặt nổi. Danh sách dùng hai cột ở màn hình rộng, một cột trên điện thoại. Giao diện thẻ chữ, bảng từ, luyện nghe, Quiz, luyện nói, giao tiếp AI và Phố tiếng Trung đồng bộ chất liệu, màu và bóng đổ. Chuyển động trang trí tuân theo thiết lập giảm chuyển động của người dùng.

## Luyện nói trên điện thoại

Trong màn luyện nói theo bài, khung ghi âm, đồng hồ và các nút nghe câu hỏi nằm chung một khu vực. Thanh ghi âm giữ ở phía trên màn hình khi cuộn trong danh sách câu hỏi. Thu gọn hình trang trí và hướng dẫn lặp lại để dành chỗ cho thao tác. Bắt đầu ghi âm đưa màn hình đến khu vực nghe/trả lời; kết thúc đưa đến bản ghi để nghe lại và gửi AI chấm.

Chuyển giữa điện thoại và máy tính chỉ đổi vị trí của cùng một bộ điều khiển, không tạo thêm micro hoặc bắt đầu lại bản ghi. Màn hình rộng vẫn dùng hai cột nghe/ghi âm. Giữ nguyên giới hạn nghe, thứ tự giáo viên giao, thời gian ghi âm, tải bản ghi và cách gửi chấm AI.

Trong màn giao tiếp tự do với AI, ba nút Tạm dừng/Tiếp tục, Nói xong và Kết thúc nằm cùng một thanh ở đầu cuộc trò chuyện. Thanh này giữ vị trí khi cuộn xem chữ, bản dịch hoặc nhập câu trả lời. Thu nhỏ linh vật trong cuộc gọi để các điều khiển dễ nhìn trên màn hình thấp.

Thanh đầu trang và các mục điều hướng dùng chung phong cách pastel nổi: logo, kim cương, tài khoản, góp ý và trò chuyện có khung riêng; mục đang chọn có nền tím và biểu tượng màu. Giữ chiều cao thanh đầu trang và thanh điều hướng điện thoại; menu tài khoản trên điện thoại nằm trong màn hình và cuộn được phía trên thanh điều hướng. Áp dụng cho giao diện học sinh, gồm cả trang chọn khóa học.

## Kiểm tra

Các bộ kiểm tra dùng API giả lập, không sửa dữ liệu học sinh:

~~~powershell
npm run test:chinese-simple
npm run test:student-ui
npx playwright test --config playwright.chinese-journey.config.js
npx playwright test --config playwright.chinese-variety.config.js
npm run test:speaking
npm run test:ai-chat
~~~

Bộ kiểm tra chính có danh mục HSK 1 gồm 10 bài, trong đó có bài thiếu quiz, bài chỉ có từ vựng, bài chỉ có luyện nói và bài chưa có bộ nội dung; xác nhận không bài nào bị lọc mất. Kiểm tra nút Vào học từ thẻ khóa HSK 1, phân nhóm từng chức năng con, đóng/mở và chuyển nhóm, tiến độ bài tập, quay lại bài và giao diện 360 px, 390 px, máy tính.

Kiểm tra luyện nghe với 21 từ chia thành ba chặng 10/10/1, bắt đầu có chủ ý, đúng nội dung từng chặng, không tự phát âm thanh, tiếp tục lượt đang làm và hoàn thành chặng cuối một từ. Kiểm tra tiện ích chuyển vào menu tài khoản và giữ nguyên luồng chọn chặng Quiz.

Kiểm tra điều khiển nói trên màn hình 320×568, 360×800 và 390×844, gồm danh sách tám câu hỏi, cuộn đến câu cuối, chuyển kích thước khi đang ghi âm, nghe lại kết quả, cuộn xem hội thoại AI, tạm dừng/tiếp tục và kết thúc cuộc gọi. Dùng micro giả lập và phản hồi AI giả, không gửi bản ghi người dùng thật.

Ảnh bố cục mẫu: test-results/chinese-lessons-mobile-360.png, test-results/chinese-lessons-mobile-390.png và test-results/chinese-lessons-desktop.png. Ảnh chọn chặng nghe: test-results/chinese-listening-stages-mobile-390.png. Ảnh mở nhóm luyện nói: test-results/chinese-lesson-speaking-mobile-390.png. Kiểm tra giao diện không xác nhận trạng thái vận hành của dịch vụ AI thật.
