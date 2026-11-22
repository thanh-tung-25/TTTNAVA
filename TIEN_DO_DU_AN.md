# TTNAVA — Tổng hợp công việc và tiến độ

Cập nhật tài liệu: **23/11/2026**, theo giờ Việt Nam.

Đây là điểm bắt đầu để nắm chúng ta đang xây dựng gì, đã làm được gì, việc nào đã lên web và việc nào còn chờ. Bản này được tổng hợp từ lịch sử làm việc, mã nguồn, Git, tài liệu chức năng và báo cáo nhập dữ liệu. Nó không thay thế báo cáo kiểm thử chi tiết của từng chức năng.

## 1. Trạng thái gần nhất

| Nội dung | Trạng thái đã xác nhận |
| --- | --- |
| Website | https://tttnava-backend.vercel.app |
| Mã nguồn | GitHub `thanh-tung-25/TTTNAVA`, nhánh `main` |
| Bản nhập đề đã đối chiếu API và giao diện | `0d7f7f3834638c656446892af6dea03d2b4ca83c`, ngày 22/11/2026; 69 đề Toán, 1.541 câu/ý, 2.337 ảnh |
| Bản quản trị ngày 23/11/2026 | Mã đi cùng tài liệu này: giao diện chung cấp 1–2–3, tách Bài học/Bài kiểm tra/Đề thi; SHA đang chạy xem tại `/api/v1/health` và `/assets/build-info.json` |
| Dữ liệu cũ trong đợt nhập 69 đề | Đã đối chiếu 92 bảng; bản ghi có sẵn giữ nguyên |
| Thanh toán MoMo | Đã có chức năng và màn hình cấu hình; kiểm tra chỉ đọc khi lập tài liệu này xác nhận **chưa có cấu hình tài khoản MoMo đang dùng** |
| Dữ liệu trong bản cập nhật quản trị | Không migration/seed; không sửa hồ sơ, quyền học, bài làm, điểm hay kim cương. Database thật chỉ kiểm tra bằng READ ONLY. |

Các kết quả triển khai nêu trên là lần xác minh đã lưu ngày 22/11, không phải một lần kiểm thử lại toàn bộ website vào ngày 23/11. Việc kiểm tra MoMo và hoàn kim cương trong lượt tổng hợp này chỉ dùng truy vấn đọc, không phát sinh giao dịch.

Riêng bản quản trị ngày 23/11 đã chạy 21 kiểm tra Node, 11 kiểm tra trình duyệt với API giả lập, truy vấn danh mục thật ở chế độ chỉ đọc và dựng bản Vercel. Chi tiết chức năng và phạm vi xác minh: [Quản trị cấp 1–2–3](docs/admin-school-workspace.md). Hồ sơ phát hành: `backend/backups/admin-school-workspace/`.

## 2. Mục tiêu sản phẩm đã thống nhất

- Một website học tập tiếng Việt cho Tiểu học, THCS, THPT và Tiếng Trung.
- Học sinh chọn khóa, chọn môn/bài rồi học kiến thức, xem ví dụ, luyện tập, làm quiz hoặc đề thi.
- Giao diện dễ dùng trên điện thoại, có linh vật đồng hành, nghe nội dung và xem tiến độ theo từng phần.
- Giáo viên/admin có thể tự soạn, nhập tài liệu, sửa nội dung, giao bài và phản hồi cho học sinh.
- Phụ huynh xem được tình hình học của con sau khi liên kết được học sinh đồng ý.
- Từng khóa có thể nhận đăng ký trả phí qua MoMo, mở đợt miễn phí hoặc được admin cấp miễn phí riêng.
- Giữ nguyên dữ liệu người đang dùng khi cập nhật hệ thống; thao tác đặc biệt như hoàn kim cương phải có đối chiếu và nhật ký riêng.

## 3. Những phần đã làm

“Đã có trong bản phát hành” dưới đây có nghĩa mã chức năng đã được đưa vào nhánh phát hành hiện tại. Việc gửi email, gọi AI hay thanh toán thật còn phụ thuộc cấu hình và dịch vụ tương ứng; không suy ra rằng mọi tình huống đều đã được thử trên mọi điện thoại.

### 3.1. Chương trình Tiểu học, THCS và THPT

| Phần | Kết quả |
| --- | --- |
| Tiểu học lớp 1–5 | Có hệ thống khóa, chương trình, nội dung học, ngân hàng câu hỏi, luyện tập, bài kiểm tra và quản trị nội dung. Nội dung theo từng môn được bổ sung qua các đợt làm việc trước. |
| THCS lớp 6–9 | Đã thêm khóa và chương trình theo lớp; có Toán, Ngữ văn Kết nối tri thức và Tiếng Anh Global Success theo phạm vi tài liệu đã nhập. |
| THPT lớp 10–12 | Đã thêm 9 môn, 27 tổ hợp lớp–môn, 239 chương/chủ đề và 1.082 mục học từ mục lục được cung cấp. |
| Nội dung THPT | Đã soạn thêm kiến thức, mục tiêu, ví dụ có giải thích và câu hỏi luyện tập; không chỉ dừng ở việc tạo mục lục. |
| Cách vào học | Đã tổ chức lại theo môn và bài, có **Cần nhớ / công thức**, **Ví dụ hướng dẫn**, **Quiz 20 câu** để tiếp cận thuận tiện hơn. |
| Tiến độ | Đã đồng bộ cách ghi nhận độ bao phủ bài học; bấm linh vật để mở chi tiết tiến độ từng phần. Số lượt hoàn thành không được dùng thay cho phần trăm kiến thức đã học. |
| Quản trị | Đã tổ chức chung ba cấp theo lớp–môn, ba mục Bài học/Bài kiểm tra/Đề thi. Thẻ bài có kiến thức/công thức, ví dụ, quiz, bộ bài tập; có lưu nháp, xem trước và vị trí học sinh sẽ thấy. Đề thi phân theo giữa/cuối kì, nhập tay hoặc Word theo mẫu. |

Nội dung tự biên soạn không phải toàn văn SGK. Phạm vi mục lục và chất lượng kiến thức cần được giáo viên tiếp tục rà soát trong quá trình sử dụng; việc đã nhập đủ mục không đồng nghĩa mọi bài đã được thẩm định thủ công.

Tài liệu: [THCS](docs/secondary-school.md), [THPT](docs/high-school.md), [Quản trị cấp 1–2–3](docs/admin-school-workspace.md), [Bài tập tương tác và nhập nội dung](docs/worksheets.md).

### 3.2. Tiếng Trung

| Phần | Kết quả |
| --- | --- |
| Lộ trình | Có hệ thống khóa HSK, bài học, bộ từ, thẻ học, sổ từ, ôn tập và kiểm tra. Mức nội dung thực tế phụ thuộc bài/bộ đã được xuất bản. |
| Đồng bộ nội dung | Đã có các đợt đồng bộ từ vựng, công cụ học, tài liệu Word và quiz tích lũy cho HSK 1. |
| Luyện vận dụng | Đã sửa cách sinh bài điền từ và lựa chọn hội thoại để giảm lặp vài từ, dùng phương án nhiễu gần nội dung đúng hơn. |
| Chấm điền từ | Đã sửa chuẩn hóa đáp án Tiếng Trung và bổ sung thông tin câu trả lời trong phản ánh để kiểm tra lỗi “viết đúng nhưng bị tính sai”. |
| Điều hướng | Đã chỉnh giao diện học trên điện thoại và giảm hiện tượng bố cục nhảy khi chuyển trang. |
| Luyện nói với AI | Có hội thoại giọng nói theo bài; linh vật mấp máy miệng theo lúc giọng đọc thực sự phát. Có tạm dừng, kết thúc và cách nhập chữ dự phòng. |
| Bài luyện nói gửi cô | Có luồng thu âm, chấm nội dung bằng AI khi được bật/cấu hình, gửi kết quả cho giáo viên. Đây là chức năng riêng với hội thoại tự luyện. |
| Tra từ | Có cửa sổ tra chữ Hán, pinyin và tiếng Việt; nút tra từ đặt sát nút đổi khóa. |
| Tra chữ viết tay | Đã triển khai nhận dạng nội bộ từ dữ liệu nét: đếm nét, chuẩn hóa hình, đặc trưng hướng và DTW; cập nhật gợi ý sau khi nhấc bút. |

Phần viết tay ưu tiên nhóm đúng số nét; có nhóm lệch một nét để người học chủ động chọn. Nét viết được xử lý trên thiết bị, không gửi đến AI nhận dạng bên ngoài. Chưa huấn luyện CNN/BiGRU riêng; khả năng nhận chữ viết thực tế vẫn cần tiếp tục đánh giá bằng phản hồi người dùng.

Hội thoại và chấm bài luyện nói dùng dịch vụ AI bên ngoài theo cấu hình hiện có. Yêu cầu “nhận dạng nội bộ” ở đây áp dụng cho **tra chữ viết tay**, không phải tuyên bố toàn bộ AI của website đều chạy cục bộ. Chấm nội dung câu trả lời chưa phải đánh giá đầy đủ phát âm và thanh điệu.

Tài liệu: [Tiếng Trung](docs/chinese.md), [Cách học](docs/chinese-simple-learning.md), [Hội thoại AI](docs/chinese-ai-chat.md), [Chấm luyện nói](docs/chinese-speaking-ai.md), [Viết tay](docs/handwriting-local.md), [Học đường phố](docs/chinese-street.md).

### 3.3. Bài kiểm tra, đề thi và các bộ đề đã nhập

Đã tách hai lối vào:

- **Bài kiểm tra:** bài được tạo từ ngân hàng câu hỏi theo chủ đề, học kì hoặc cả năm.
- **Đề thi:** các đề cố định do giáo viên tự soạn hoặc nhập từ tài liệu, có đợt thi và thời gian riêng.

Đề thi có bộ lọc **Giữa kì I, Cuối kì I, Giữa kì II, Cuối kì II, Đề khác**. Menu học sinh đã có lối vào Đề thi.

Các đợt nhập có báo cáo xác nhận:

| Bộ tài liệu | Số đề | Số câu/ý trong bộ | Báo cáo |
| --- | ---: | ---: | --- |
| Hóa 12 giữa kì I | 10 | 277 | [Báo cáo](backend/backups/chemistry-exams/production-import-report.json) |
| Toán 12 THPT Chuyên Sơn Tây | 1 | 22 | [Báo cáo](backend/backups/math-son-tay/production-import-report.json) |
| Bộ 9 đề Toán 12 giữa kì I | 9 | 197 | [Báo cáo](backend/backups/math-midterm-nine/production-import-report.json) |
| Toán 6 Nam Định, gồm các mã đề | 17 | 412 | [Báo cáo](backend/backups/math6-namdinh/production-import-report.json) |
| Sáu gói ZIP mới: Toán lớp 9, 11, 12 | 69 | 1.541 | [Báo cáo](backend/backups/math-batches-2026/production-import-report.json) |
| **Tổng các đợt trên** | **106** | **2.449** | Không phải tổng toàn bộ ngân hàng câu hỏi của website |

Chi tiết đợt 69 đề vừa hoàn tất:

- Lớp 9: 5 đề thi vào lớp 10, trong **Toán → Đề thi → Đề khác** của khóa Lớp 9.
- Lớp 11: 10 đề giữa kì I.
- Lớp 12: 54 đề, gồm giữa kì I, cuối kì I và các đề khảo sát/tốt nghiệp thuộc Đề khác.
- Có 2.337 ảnh đề/lời giải; ảnh được lưu trong kho riêng tư.
- Giữ đáp án được cung cấp; chỉ tự bổ sung các chỗ thiếu theo yêu cầu đã xác nhận.
- Đã loại các bản trùng trong gói tổng hợp; tài liệu ma trận và hướng dẫn chấm không bị tạo thành đề độc lập.

Các chức năng chấm/soạn đề đã thêm:

- Trắc nghiệm lựa chọn; đúng/sai theo từng ý; đáp án ngắn và các ý tự luận nhập kết quả.
- Điểm riêng cho từng câu/ý của đề nhà trường; có lựa chọn cách chia điểm đúng/sai.
- Chấp nhận các cách viết tương đương của số, phân số, tập hợp và biểu thức đại số trong phạm vi bộ đối chiếu hỗ trợ.
- Tự luận nhập đáp án vẫn được chấm tự động; cách làm/hướng dẫn hiện sau khi nộp. Bài yêu cầu viết/vẽ tự do là loại khác và có thể cần giáo viên chấm.
- Ẩn đáp án, giải thích và tham chiếu ảnh lời giải trước khi nộp; truy cập ảnh lời giải cần bài nộp phù hợp.
- Màn hình nhập tay dùng chung cấu trúc và cách chấm với đề được nhập bằng công cụ; admin có thể tải riêng ảnh đề và ảnh lời giải.
- Lượt làm giữ snapshot nội dung để chỉnh sửa đề sau này không viết lại kết quả cũ.

Bằng chứng đợt cuối: [Trạng thái hoàn tất](backend/backups/math-batches-2026/completion-state.json), [Đối chiếu online](backend/backups/math-batches-2026/production-verification.json), [Danh mục 69 đề](backend/backups/math-batches-2026/exam-catalog.csv). Các đường dẫn trong `backend/backups/` chỉ có trên máy làm việc, không được đưa vào Git hoặc nội dung công khai.

### 3.4. Tài khoản, đăng ký và quên mật khẩu

- Đã có đăng ký Gmail và xác minh OTP; đây là thay đổi so với thiết kế ban đầu chỉ cho admin tạo tài khoản.
- Đã thêm **Quên mật khẩu** dưới phần đăng nhập: dùng email đã đăng ký, xác minh mã rồi đặt mật khẩu mới.
- Có giới hạn gửi/nhập mã, thời hạn và kiểm tra ở máy chủ; không công khai mật khẩu hoặc mã xác thực trong tài liệu.
- Admin có quản lý học sinh, tìm theo Gmail, khóa/mở khóa và đặt lại mật khẩu trong phạm vi được phân quyền.
- Có cơ chế xóa an toàn/khôi phục tài khoản và nhật ký quản trị; chức năng này không đồng nghĩa đã thực hiện yêu cầu xóa hàng loạt tài khoản không có Gmail.

**Điểm chưa đủ bằng chứng để kết luận:** trong hồ sơ đang tổng hợp chưa tìm thấy báo cáo xác nhận hoàn tất đợt xóa tài khoản cũ không có Gmail. Không đánh dấu yêu cầu đó là đã xong và không tự chạy xóa trong lượt lập tài liệu này. Nếu tiếp tục, cần thống kê chỉ đọc và xác định đúng phạm vi được chủ web cho phép, đồng thời giữ nguyên tài khoản đã có email.

Tài liệu: [Đăng ký Gmail](docs/gmail-registration.md), [Quản trị và tài khoản](docs/admin-roles.md). Mã chính: `password-reset*.js`, `password-reset-core.js`, migration `047_password_reset.sql`.

### 3.5. Khóa học, đợt miễn phí và MoMo

Chính sách cuối đã thống nhất là **theo từng khóa học**:

- Khóa có cấu hình học phí/thời hạn để nhận thanh toán MoMo.
- Admin có thể mở đợt nhận đăng ký miễn phí với ngày bắt đầu/kết thúc.
- Học sinh đăng ký khóa trong đợt miễn phí được quyền học **một năm tính từ ngày đăng ký khóa học**, không tính từ ngày tạo tài khoản.
- Admin có chức năng cấp miễn phí riêng cho một học sinh theo thời hạn.
- Đã đồng bộ cách trình bày nhóm đăng ký cũ sang quyền miễn phí theo chính sách đã chốt; không tạo giao dịch tiền giả và không sửa lịch sử thanh toán MoMo thật thành miễn phí.
- Đã sửa lối đăng ký để học sinh có thể nhận khóa khi đang có đợt miễn phí.
- Đã gỡ luồng QR/chuyển khoản và duyệt thanh toán thủ công cũ khỏi luồng sử dụng hiện tại; bản ghi cũ vẫn được giữ để xem lịch sử.

MoMo đã có màn hình nhập thông tin kết nối, checkout và IPN xác thực chữ ký; việc xác nhận thanh toán và cấp quyền được xử lý trên máy chủ. **Tại lần kiểm tra chỉ đọc khi lập tài liệu này, chưa có tài khoản MoMo được cấu hình.** Chủ web còn phải nhập tài khoản MoMo for Business và xác nhận luồng thanh toán thật trước khi coi phần vận hành thanh toán là hoàn tất.

Tài liệu: [Khóa học, miễn phí và MoMo](docs/courses.md). Đọc phần chính sách mới ở đầu tài liệu; các phần QR/duyệt tay ở phía sau là lịch sử.

### 3.6. Kim cương và vật phẩm

- Đã điều chỉnh ví/kim cương hiển thị theo chương trình đang chọn, tránh nhầm giữa ví chung và số của hệ học.
- Đã gỡ chức năng đổi/mua vật phẩm theo yêu cầu; không dùng lại mô tả mua vật phẩm trong tài liệu cũ như hành vi hiện tại.
- Có công cụ hoàn kim cương theo giao dịch gốc, chống hoàn trùng và có đối chiếu dữ liệu.
- Kiểm tra chỉ đọc khi lập bản tổng hợp xác nhận **2 giao dịch mua cũ của 1 tài khoản đã được hoàn đủ 40 KC**, không còn giao dịch trong nhóm này bị thiếu khoản hoàn tương ứng.
- Các giao dịch hoàn là phần việc được yêu cầu riêng; không phải thay đổi số dư ngẫu nhiên trong các đợt cập nhật nội dung.

Tài liệu liên quan: [Thưởng học tập](docs/learning-rewards.md), [Kim cương theo chương trình](docs/diamond-programs.md). Công cụ: `backend/scripts/refund-store-diamonds.mjs`; hồ sơ đối chiếu riêng tại `backend/backups/diamond-refunds/`.

### 3.7. Phụ huynh, góp ý, giao bài và giao tiếp

| Phần | Kết quả |
| --- | --- |
| Góc phụ huynh | Đã thiết kế lại để xem tổng quan của con, nhịp học, kết quả, việc cần ôn và lịch sử theo khóa/khoảng thời gian. |
| Quyền xem của phụ huynh | Liên kết bằng mã và chỉ mở báo cáo sau khi học sinh đồng ý; có thể thu hồi. Không mở công khai dữ liệu của con. |
| Giao bài | Admin giao bài cho học sinh thuộc phạm vi quản lý, xem bài nộp và nhận xét. Quyền học miễn phí/trả phí được dùng nhất quán trong danh sách. |
| Phản ánh nội dung | Học sinh gửi phản ánh kèm câu hỏi, ngữ cảnh và đường dẫn; admin lọc và xử lý trong phạm vi được giao. |
| Phản hồi của admin | Đã chỉnh giao diện, trạng thái đang lưu/đã lưu, phản hồi lỗi và xác nhận kết quả lưu; hạn chế ghi đè khi có sửa đồng thời. |
| Hộp thư phản ánh của học sinh | Có lịch sử phản ánh, phản hồi và số chưa đọc/badge để nhận biết câu trả lời mới. |
| Chat và kết bạn | Có hệ thống trò chuyện, lời mời, thông báo và các chức năng liên quan theo tài liệu riêng. |
| Nhật ký truy cập | Admin xem hoạt động truy cập trong phạm vi được phép; dữ liệu chưa ghi nhận không được kết luận thành “chưa từng học”. |

Tài liệu: [Trải nghiệm học sinh](docs/student-experience.md), [Hỗ trợ học tập/phụ huynh](docs/learning-support.md), [Học tập và phản ánh](docs/study-hub.md), [Chat](docs/chat.md), [Cuộc gọi](docs/chat-calls.md), [Lịch sử truy cập](docs/user-access-history.md).

### 3.8. Hạ tầng và triển khai

- Website online dùng **Vercel + PostgreSQL/Supabase + kho tệp riêng tư**. XAMPP/MySQL là môi trường local được hỗ trợ; dữ liệu local và online không tự đồng bộ hai chiều.
- Mã nguồn giao diện nằm trong `frontend/`; API và nghiệp vụ nằm trong `backend/src/`.
- Nội dung có đáp án, PDF/Word nguồn, backup và bí mật cấu hình được giữ ngoài gói static công khai/Git theo cấu hình hiện tại.
- Các đợt nhập lớn dùng công cụ riêng, chỉ thêm dữ liệu trong phạm vi cho phép, đối chiếu dữ liệu cũ trước và sau; không seed đè toàn bộ production.
- Đã xử lý cache theo bản phát hành và đối chiếu SHA giữa `/api/v1/health` với `/assets/build-info.json`.
- Sự cố **Vercel “Division by zero” ngày 22/11 đã được giải quyết**. Đã tái hiện lỗi ở bước phân tích Nerdamer 2.1.0 bằng tracer cũ; bản phát hành dùng Nerdamer **1.1.13**, nạp `all.js`, rút gọn hiệu chính xác khi so biểu thức và dọn trạng thái biểu thức sau mỗi lần so.
- Không nâng lại Nerdamer lên 2.x mà chưa kiểm tra bước đóng gói Vercel; build tài nguyên frontend thành công riêng chưa đủ chứng minh đóng gói API thành công.

Tài liệu: [Kiến trúc](docs/architecture.md), [API](docs/api.md), [Chuyển Vercel/Supabase](docs/vercel-supabase-migration.md), [Cài ứng dụng lên thiết bị](docs/app-install.md). Những tài liệu này có cả mô tả các giai đoạn cũ; phải đối chiếu ngày và phần cập nhật trước khi áp dụng.

## 4. Việc còn chờ hoặc cần xác nhận

| Việc | Trạng thái và bước tiếp theo |
| --- | --- |
| Kết nối MoMo thật | Chờ chủ web cấu hình tài khoản; chưa ghi nhận giao dịch thật thành công trong đợt tổng hợp này. |
| Xóa tài khoản cũ không có Gmail | Chưa có bằng chứng hoàn tất trong hồ sơ đã đọc; cần đối chiếu lại phạm vi trước bất kỳ thao tác xóa nào. |
| Gửi OTP/quên mật khẩu ngoài thực tế | Code đã có; tiếp tục theo dõi việc nhận mail thật, lỗi gửi và hạn mức bằng tài khoản được phép thử. |
| Chất lượng nhận dạng viết tay | Đã lên web; cần thêm phản hồi trên nét viết và điện thoại thực tế, không chỉ dữ liệu nét tham chiếu. |
| Chất lượng nội dung học | Nội dung đã bổ sung; giáo viên tiếp tục rà soát theo bài, đặc biệt câu tự biên soạn và chỗ đã tự bổ sung đáp án. |
| Micro, giọng đọc và giao diện điện thoại | Đã có xử lý trong ứng dụng; vẫn cần đánh giá trên các thiết bị thực tế. |
| Tài liệu cũ | Đã tạo bản tổng hợp này và đặt liên kết ở README; chưa viết lại toàn bộ tài liệu theo chức năng. |

**Không còn treo:** lỗi đóng gói Division by zero và đợt nhập 69 đề đã hoàn tất, không cần người dùng kết nối Vercel chỉ để tiếp tục hai việc này. Hướng dẫn kết nối trong trao đổi trước là tình trạng lúc chưa đọc được log, không phải việc còn thiếu hiện nay.

## 5. Quyết định đã thay đổi hoặc ý tưởng đã bỏ

- Luyện viết từ theo nghĩa Việt rồi AI chấm: người dùng đã nói bỏ, không coi là phần việc phải triển khai. Tra chữ viết tay để tìm cách đọc/nghĩa là chức năng khác và đã thực hiện.
- Quy tắc miễn phí một năm cuối cùng tính từ **đăng ký khóa học**, không phải tạo tài khoản.
- Nhóm học sinh cũ hiển thị theo chính sách miễn phí đã chốt sau cùng; yêu cầu trước đó “đưa vào đã thanh toán” không phải quy tắc hiện hành cho nhóm này.
- Đã bỏ thách đấu/Robot/đấu trường khỏi luồng sử dụng, thay bằng bài kiểm tra; mô tả thách đấu trong README/tài liệu giai đoạn đầu là lịch sử.
- Đã bỏ đổi/mua vật phẩm và luồng duyệt chuyển khoản thủ công; không khôi phục chúng chỉ vì còn bảng dữ liệu hoặc mô tả cũ.
- Viết tay ban đầu chỉ được thử local; sau đó người dùng đã cho phép lên web và đã phát hành. Hạn chế “chỉ localhost” của giai đoạn đầu không phải trạng thái phát hành cuối.

## 6. Nguyên tắc khi tiếp tục công việc

1. Không sửa/xóa hồ sơ, email, mật khẩu, bài làm, điểm, lịch sử hoặc kim cương của người dùng ngoài đúng thao tác đã được yêu cầu và xác định phạm vi.
2. Bảo toàn snapshot lượt làm; sửa nội dung mới không viết lại kết quả cũ.
3. Với bộ đề mới: giữ đáp án được cung cấp; chỉ tự bổ sung đáp án thiếu khi đã được giao. Ghi rõ chỗ sửa lỗi nguồn nếu có.
4. Không đặt đáp án/lời giải vào dữ liệu công khai trước khi học sinh nộp bài.
5. Không đưa `.env`, khóa MoMo/AI, mật khẩu mail, bản sao dữ liệu người dùng hoặc gói đề có đáp án vào Git hay thư mục public.
6. Quyền cập nhật Git và web đã được cấp cho các đợt phát hành trong lịch sử và được áp dụng cho bản quản trị này; nếu một yêu cầu mới giới hạn local/không push thì tuân theo giới hạn mới đó.
7. Không dùng tài khoản thật của học sinh để tạo lịch sử/điểm thử. Kiểm tra phù hợp với thay đổi, dùng môi trường tách biệt hoặc API giả lập khi cần.
8. Khi phát hành: xác nhận đúng SHA của cả API và giao diện trước khi nhập dữ liệu cần tính năng mới.

## 7. Hồ sơ và cách tiếp tục ở phiên sau

| Cần tìm | Nơi đọc |
| --- | --- |
| Tổng quan và việc còn chờ | File `TIEN_DO_DU_AN.md` này |
| Quản trị nội dung cấp 1–2–3 | [Hướng dẫn quản trị](docs/admin-school-workspace.md), hồ sơ `backend/backups/admin-school-workspace/` |
| Cách cài/chạy và mục lục tài liệu | [README.md](README.md) |
| Hướng dẫn theo chức năng | Thư mục [docs](docs/) |
| Lịch sử thay đổi mã | `git log`, đặc biệt các commit bên dưới |
| Bộ đề và bằng chứng nhập dữ liệu | `backend/backups/`, các báo cáo đã liên kết trong mục 3.3 |
| Trạng thái đợt 69 đề | `backend/backups/math-batches-2026/completion-state.json` |
| Chi tiết sửa lỗi đóng gói | `backend/backups/math-batches-2026/bundling-fix.json` |

Các mốc mã nguồn giúp đối chiếu:

| Commit | Công việc |
| --- | --- |
| `f6fbcbc`, `c1eafa4`, `498eaaa` | MoMo, cấp miễn phí riêng và đăng ký khóa trong đợt miễn phí |
| `daedf8f` | Gỡ mua vật phẩm và thêm hoàn kim cương có đối chiếu |
| `8578499` | Nhận dạng chữ viết tay theo nét/DTW |
| `63319ed`, `b6fd8e7` | THPT và giao diện kiến thức, ví dụ, quiz theo bài |
| `83c8ec8` | Quên mật khẩu qua Gmail xác minh |
| `aa2f075` | Tiến độ theo phần, mở bằng linh vật |
| `0392d5b`, `eea77d9` | Chấm điền từ, phản hồi góp ý và số chưa đọc |
| `821534b`, `73302cf` | Phân biệt Đề thi/Bài kiểm tra và chấm đáp án tự luận theo trọng số |
| `58b3b07`, `32e9bb4` | Ảnh lời giải riêng tư, chấm biểu thức và giao diện nhập tay |
| `0d7f7f3` | Sửa lỗi đóng gói Vercel; bản đã xác nhận đăng bộ 69 đề |

Khi hoàn tất công việc mới, cập nhật ngày, kết quả, trạng thái phát hành, bằng chứng và mục còn chờ trong file này. Không chuyển một mục sang “đã xong” chỉ vì có code hoặc có backup trước thao tác; cần nêu rõ đã xác minh đến bước nào.
