# TTNAVA — Báo cáo phát triển và hướng dẫn sử dụng

**Cập nhật: 23/11/2026, giờ Việt Nam.**

TTNAVA là website học tập tiếng Việt dành cho học sinh Tiểu học, THCS, THPT và người học Tiếng Trung. Hệ thống kết hợp kiến thức theo bài, ví dụ, luyện tập, quiz, bài kiểm tra, đề thi, giao bài và theo dõi kết quả. Giáo viên quản lý nội dung; phụ huynh xem báo cáo khi đã được học sinh đồng ý liên kết.

Báo cáo này mô tả kết quả đã triển khai, cách dùng, số liệu có hồ sơ và các phần còn phụ thuộc cấu hình. Nó thay thế mô tả giai đoạn đầu chỉ có trắc nghiệm Tiểu học. Nhật ký quyết định và hồ sơ tiếp nối nằm trong [TIEN_DO_DU_AN.md](TIEN_DO_DU_AN.md).

- **Website:** https://tttnava-backend.vercel.app
- **Mã nguồn:** GitHub `thanh-tung-25/TTTNAVA`, nhánh `main`.
- **Quản trị nội dung:** `/pages/admin/questions/`.
- **Đối chiếu bản đang chạy:** trường `release` trong `/api/v1/health` và `/assets/build-info.json` phải giống nhau.
- **Cập nhật trong bản này:** tải đề Word ngay tại Đề thi, tự đọc sau khi chọn tệp, sửa bản xem trước rồi lưu thành đề nháp; viết lại README thành báo cáo.

## 1. Mục tiêu và phạm vi sản phẩm

Ứng dụng phục vụ một quy trình liên tục: đăng ký tài khoản, nhận quyền học, chọn khóa, học từng phần, làm bài và xem kết quả. Việc học trên điện thoại được ưu tiên; giao diện có linh vật, thẻ nội dung, nút nghe và điều hướng theo phần.

| Nhóm người dùng | Các công việc đã có |
| --- | --- |
| Học sinh | Đăng ký/xác minh Gmail, đăng nhập, chọn khóa, học và luyện theo bài, làm kiểm tra/đề thi, nộp bài được giao, xem lịch sử và góp ý. |
| Giáo viên/admin | Quản lý học sinh trong phạm vi được giao, soạn và nhập nội dung, xuất bản/ẩn bài, giao bài, xem bài nộp, thống kê và xử lý phản ánh. |
| Admin tổng | Quản lý cả ba cấp và Tiếng Trung, chính sách khóa học, cấp quyền miễn phí và cấu hình MoMo. |
| Phụ huynh | Liên kết với con theo cơ chế đồng ý, chọn khóa và khoảng thời gian để xem tình hình học. |

Admin Tiểu học, THCS, THPT và Tiếng Trung có phạm vi riêng. Hạn chế được kiểm tra ở máy chủ, không chỉ dựa vào việc ẩn nút trên giao diện.

## 2. Chương trình Tiểu học, THCS và THPT

### 2.1. Nội dung và cách tổ chức

| Chương trình | Kết quả đã thực hiện |
| --- | --- |
| Tiểu học, lớp 1–5 | Có khóa học, danh mục môn/chủ đề/bài, ngân hàng câu hỏi, bài tập tương tác, quiz và bài kiểm tra. |
| THCS, lớp 6–9 | Có hệ thống theo lớp; đã bổ sung Toán, Ngữ văn Kết nối tri thức và Tiếng Anh Global Success theo phạm vi tài liệu nhập. |
| THPT, lớp 10–12 | Có 9 môn: Toán, Ngữ văn, Tiếng Anh, Vật lí, Hóa học, Sinh học, Lịch sử, Địa lí, Giáo dục kinh tế và pháp luật. |
| Cây chương trình THPT | Gói mục lục gồm 27 tổ hợp lớp–môn, 239 chương/chủ đề và 1.082 mục học. |
| Nội dung THPT | Đã soạn kiến thức, công thức/quy tắc, ví dụ và câu hỏi; manifest gói nguồn ghi nhận 3.246 câu. |
| Dữ liệu học theo bài | Gói học gọn có manifest 1.622 nhóm hướng dẫn và 17.202 câu bổ sung. Đây là số của gói nguồn, không phải phép đếm câu duy nhất đang xuất bản trên web. |

Ngữ văn THCS đã có 40 chủ đề và 273 mục học trong gói nội dung; Tiếng Anh THCS được tổ chức theo Unit/Review. Toán 9 đã bổ sung mục lục hai tập với 10 chương, 29 bài và 10 mục Luyện tập chung.

Nội dung tự biên soạn không phải bản sao toàn văn SGK. Có đủ mục học không đồng nghĩa tất cả bài đã được giáo viên thẩm định. Không cộng số câu của các manifest thành tổng ngân hàng vì có các lần đồng bộ, gộp nhóm và loại trùng.

### 2.2. Trải nghiệm học sinh

Học sinh chọn khóa, môn rồi mở bài cần học. Các phần chính gồm **Cần nhớ / công thức**, **Ví dụ hướng dẫn**, **Quiz theo bài** và **Bài tập tương tác**. Quiz của bài cần ít nhất 20 câu khác nhau đã đăng và kiến thức đã xuất bản.

Ngữ văn và Tiếng Anh từ lớp 6 trở lên gộp các phần cùng chương/chủ đề/Unit để học sinh không phải đi qua danh sách quá vụn. Tiến độ được trình bày theo phần trăm của từng phần; bấm linh vật để xem chi tiết. Số lượt hoàn thành không được dùng thay cho mức độ bao phủ kiến thức.

Xem [THCS](docs/secondary-school.md), [THPT](docs/high-school.md), [Trải nghiệm học sinh](docs/student-experience.md).

## 3. Hệ thống Tiếng Trung

### 3.1. Nội dung theo bài và khóa HSK

Có cấu trúc khóa HSK, bài học và bộ từ; nội dung thực tế người học thấy phụ thuộc các bài/bộ đã được xuất bản. Các phần đã có gồm:

- Từ mới, chữ Hán, pinyin, nghĩa, thẻ lật và sổ từ.
- Nghe, đọc, ngữ pháp, hội thoại, ôn tập và quiz.
- Luyện vận dụng với điền từ, lựa chọn hội thoại và các hoạt động liên quan.
- Ghi âm tự luyện, bài luyện nói gửi cô và hội thoại với AI.
- Nhiệm vụ Phố Tiếng Trung và các hoạt động trong phạm vi bài đã có dữ liệu.

Đã sửa cách tạo bài vận dụng để giảm lặp một vài từ và dùng phương án nhiễu gần với câu đúng hơn. Chấm điền từ đã được bổ sung chuẩn hóa đáp án; phản ánh câu hỏi có thêm ngữ cảnh để kiểm tra lỗi “viết đúng nhưng bị tính sai”.

### 3.2. Tra từ và nhận dạng chữ viết tay nội bộ

Nút tra từ nằm gần nút đổi khóa. Có thể tìm bằng chữ Hán, pinyin hoặc nghĩa tiếng Việt.

Người học nhớ mặt chữ có thể viết trực tiếp lên màn hình. Bộ nhận dạng giữ dữ liệu từng nét, chuẩn hóa khung chữ, xét số nét và hướng nét rồi so khớp với mẫu bằng DTW. Gợi ý cập nhật khi nhấc bút; có hoàn tác, xóa và chọn chữ để tiếp tục tra nghĩa/cách đọc.

Dữ liệu nét được xử lý trên thiết bị cho chức năng này, không gửi tới AI nhận dạng bên ngoài. Chưa huấn luyện CNN/BiGRU riêng và chưa thể bảo đảm nhận đúng mọi chữ viết tay thực tế. Số nét là một tín hiệu kết hợp với hình dáng, không phải căn cứ duy nhất để kết luận.

### 3.3. Hai luồng luyện nói khác nhau

| Luồng | Hành vi |
| --- | --- |
| Hội thoại AI tự luyện | Trò chuyện theo bài, nhận lời đáp/giọng đọc; linh vật chuyển động miệng khi âm thanh phát. Có tạm dừng, kết thúc và cách nhập chữ dự phòng. Phiên bản này không lưu hội thoại thành báo cáo gửi cô. |
| Bài luyện nói gửi cô | Nghe câu hỏi, ghi âm câu trả lời, nhận diện và chấm nội dung khi dịch vụ được cấu hình; lưu kết quả theo luồng bài nộp. |

AI đang hỗ trợ đánh giá nội dung và ngữ pháp; chưa chấm đầy đủ phát âm, thanh điệu hay độ trôi chảy. Giọng nói và hội thoại dùng dịch vụ bên ngoài theo cấu hình, khác với chức năng nhận dạng chữ viết tay nội bộ.

Tài liệu: [Tiếng Trung](docs/chinese.md), [Cách học](docs/chinese-simple-learning.md), [Hội thoại AI](docs/chinese-ai-chat.md), [Chấm luyện nói](docs/chinese-speaking-ai.md), [Tra chữ viết tay](docs/handwriting-local.md).

## 4. Quản trị nội dung chung cho ba cấp

Admin vào **Nội dung học tập → cấp → lớp → môn**, sau đó chọn **Bài học / Bài kiểm tra / Đề thi**. Giao diện dùng thẻ bài, linh vật và cách chia phần gần với giao diện học sinh.

### 4.1. Bài học

| Phần trên thẻ bài | Công cụ dành cho giáo viên |
| --- | --- |
| Cần nhớ / công thức | Thêm/sửa mục kiến thức, công thức, điều kiện và những chỗ dễ nhầm. |
| Ví dụ hướng dẫn | Thêm đề ví dụ và cách giải. |
| Quiz theo bài | Thêm từng câu hoặc nhập Word vào ngân hàng của bài; xem số câu đã đăng và số còn thiếu. |
| Bộ bài tập | Tạo bộ câu hỏi tương tác và xếp vào bài. |

Kiến thức và ví dụ có thể lưu nháp, đăng hoặc ẩn. Có thể đăng kiến thức trước rồi bổ sung ví dụ sau. Mở một bài chưa có nội dung không tự ghi bản nháp vào database; chỉ lưu khi giáo viên xác nhận.

Với bài/Unit gồm nhiều phần, kiến thức và ví dụ dùng chung. Khi thêm câu hỏi hoặc bộ bài tập, chọn phần nhận nội dung mới để lưu đúng vị trí bên dưới.

### 4.2. Chỉ rõ nội dung sẽ đi đâu

Khung **HỌC SINH SẼ THẤY Ở** hiển thị lớp, môn và vị trí đích. Trình soạn câu hỏi, nhập Word và thông báo lưu cũng dùng vị trí này.

- **Nháp:** giáo viên tiếp tục sửa, học sinh chưa thấy.
- **Đã đăng:** học sinh có quyền học có thể mở nội dung trong đúng mục.
- **Đang ẩn:** dừng hiển thị cho các lượt học mới, giữ dữ liệu liên quan theo quy trình hiện có.
- **Xem như học sinh:** xem nội dung mà không tạo bài làm hoặc điểm thử.

Chuyển phần khi bộ bài đang sửa chưa lưu có bước xác nhận. Kiến thức có mã phiên bản để từ chối ghi đè từ bản soạn cũ nếu nơi khác đã sửa bài. **Quản lý nâng cao** chứa năm học, lịch sử nhập Word, bài chờ chấm và nội dung chưa xếp bài.

Hướng dẫn thao tác: [Quản trị cấp 1–2–3](docs/admin-school-workspace.md).

## 5. Phân biệt Quiz, Bài kiểm tra và Đề thi

| Loại | Nguồn câu hỏi | Cách quản lý |
| --- | --- | --- |
| Quiz theo bài | Ngân hàng của bài/Unit đã xuất bản | Vào Bài học, chọn bài rồi mở Quiz. Mỗi chặng 20 câu. |
| Bài kiểm tra | Ngân hàng đã đăng trong phạm vi chủ đề/học kì/cả năm | Vào Bài kiểm tra để xem số câu sẵn sàng và mở nguồn cần bổ sung. |
| Đề thi | Bộ đề cố định do giáo viên soạn hoặc nhập | Vào Đề thi, lọc giữa/cuối kì hoặc Đề khác. |

Bài kiểm tra theo chủ đề cần 30 câu và có 30 phút; theo học kì cần 50 câu và có 50 phút; cả năm cần 50 câu và có 60 phút. Giao diện admin chỉ rõ số còn thiếu. Đề thi cố định có thời gian và cách tính điểm riêng.

## 6. Tải đề trắc nghiệm từ Word

### 6.1. Luồng tải trực tiếp mới

1. Vào **Nội dung học tập → lớp → môn → Đề thi**.
2. Bấm **Tải đề thi từ Word** ngay trên danh sách, không cần tạo đề trống trước.
3. Chọn tệp `.docx`; hệ thống tự đọc theo cùng bộ đọc đang dùng cho nhập Quiz.
4. Xem và sửa đề bài, lựa chọn, đáp án, lời giải ngay trong bản xem trước.
5. Điền tên đề, thời gian và đợt thi. Nếu bên ngoài đã chọn đợt thì cửa sổ điền sẵn.
6. Bấm **Lưu đề nháp**. Đề mới nằm đúng lớp–môn–đợt thi và mở trong trình soạn.
7. Kiểm tra, bổ sung ảnh/đáp án nếu cần, rồi bấm **Đăng bài** để học sinh làm.

Chọn tệp hoặc đóng cửa sổ chưa xác nhận không tạo đề. Lưu lỗi giữ bản xem trước để sửa/thử lại. Nhập đề không thêm câu vào ngân hàng Quiz và không tự gắn đề vào một bài học.

### 6.2. Cách trình bày Word

Bộ đọc hỗ trợ văn bản theo bố cục giống nhập Quiz:

```text
Câu 1. Kết quả của phép tính 2 + 3 là bao nhiêu?
A. 4
B. 5
C. 6
D. 7
Đáp án: B
Lời giải: Cộng 2 với 3 được 5.
```

Mẫu mới: [mau-de-thi-trac-nghiem.docx](frontend/assets/templates/mau-de-thi-trac-nghiem.docx). Có nút tải mẫu trong cửa sổ nhập. Trình soạn đề đang có vẫn cho **Nhập Word theo mẫu** để thêm câu vào bản đang sửa; mẫu hỗn hợp trước đây ở [mau-nhap-de-thi.docx](frontend/assets/templates/mau-nhap-de-thi.docx).

### 6.3. Đáp án, điểm và giới hạn

- Tệp tối đa **20 MB**, một đề tối đa **50 câu/ý**.
- Hỗ trợ câu chọn một đáp án, điền đáp án; đề chấm điểm từng ý nhận thêm đúng/sai đơn.
- Câu nhiều đáp án và nhóm đúng/sai THPT bốn ý cần dùng công cụ soạn phù hợp để giữ đúng cách chấm.
- Đề tạo từ ô tải Word mới dùng thang **10 điểm**, chia điểm theo các câu. Giáo viên có thể chỉnh điểm sau khi lưu.
- Thiếu đáp án thì giữ trống trong nháp; không tự chọn A hay tự giải đoán. Hệ thống chặn xuất bản khi chưa đủ đáp án hợp lệ.
- Đọc văn bản Word không đồng nghĩa đọc mọi kiểu Word/PDF. Đề scan, hình, công thức ảnh và MathType phức tạp cần tải ảnh hoặc biên tập thêm.
- Không tự chuyển lớp/môn theo chữ trong tài liệu; phạm vi giáo viên chọn trên giao diện là đích lưu.

## 7. Soạn đề, làm bài và chấm kết quả

Có thể nhập tay câu trắc nghiệm, nhóm đúng/sai, đáp án ngắn và các ý tự luận nhập kết quả. Công cụ nhập tay và công cụ nhập đề sử dụng chung cấu trúc lưu, kiểm tra dữ liệu và cách chấm.

Các chức năng đã có:

- Điểm tối đa cho từng câu/ý của đề nhà trường; hỗ trợ cách chấm đúng/sai theo từng ý hoặc quy tắc THPT phù hợp.
- Nhận các cách viết tương đương của số, phân số, tập hợp và biểu thức trong phạm vi thuật toán hỗ trợ.
- Tự luận nhập đáp số vẫn được chấm tự động. Bài viết/vẽ tự do là loại riêng, có thể cần giáo viên chấm.
- Lưu tiến trình và giới hạn thời gian, nộp bài rồi xem đáp án/cách làm.
- Đáp án, giải thích và ảnh lời giải được bảo vệ trước khi nộp.
- Ảnh đề và ảnh lời giải tải riêng; mỗi ảnh PNG/JPEG tối đa 2 MB, mỗi câu tối đa 8 ảnh hướng dẫn giải.
- Snapshot nội dung đi cùng lượt làm, tránh việc sửa đề mới làm thay đổi điểm/lời giải của bài đã nộp.

Xem [Bài tập tương tác](docs/worksheets.md).

## 8. Các bộ đề đã nhập có báo cáo

| Đợt tài liệu | Số đề | Số câu/ý |
| --- | ---: | ---: |
| Hóa 12 giữa kì I | 10 | 277 |
| Toán 12 THPT Chuyên Sơn Tây | 1 | 22 |
| Bộ 9 đề Toán 12 giữa kì I | 9 | 197 |
| Toán 6 Nam Định, gồm các mã đề | 17 | 412 |
| Các gói ZIP Toán lớp 9, 11, 12 | 69 | 1.541 |
| **Tổng năm đợt trên** | **106** | **2.449** |

Đây là tổng các đợt nhập có báo cáo, không phải toàn bộ đề/câu hỏi của website. Báo cáo và tài liệu nguồn ở `backend/backups/` trên máy làm việc, được loại khỏi Git và thư mục static.

Đợt 69 đề gồm 5 đề lớp 9, 10 đề lớp 11 và 54 đề lớp 12; có 2.337 ảnh, trong đó 868 ảnh hướng dẫn giải. Đợt này đã đối chiếu bảo toàn dữ liệu có trước trong 92 bảng. Tài liệu ma trận/hướng dẫn chấm và bản trùng không được coi thành đề mới độc lập.

Đáp án được cung cấp đã được giữ; những chỗ thiếu được bổ sung theo yêu cầu đã xác nhận. Chi tiết từng đợt nằm trong [file tiến độ](TIEN_DO_DU_AN.md).

## 9. Tài khoản, Gmail và quên mật khẩu

Đã có đăng ký công khai bằng Gmail và OTP tại `/pages/register/`. Tài khoản được tạo sau xác minh; đăng ký tài khoản không tự mở toàn bộ khóa trả phí.

Dưới màn hình đăng nhập có **Quên mật khẩu**: nhập email đã đăng ký, nhận mã xác thực, xác minh rồi đặt mật khẩu mới. Mã có thời hạn, giới hạn gửi/nhập và chỉ dùng một lần. Đổi mật khẩu làm các phiên cũ hết hiệu lực, giữ khóa học và kết quả.

Admin có tìm học sinh theo tên/Gmail trong phạm vi được phép, quản lý trạng thái, khóa/mở và hỗ trợ đặt lại mật khẩu. Có nhật ký quản trị và cơ chế xóa/khôi phục theo quy trình.

Chưa đủ hồ sơ để khẳng định yêu cầu xóa toàn bộ tài khoản cũ không có Gmail đã hoàn tất. Lượt cập nhật Word/README này không chạy xóa tài khoản.

Xem [Đăng ký Gmail](docs/gmail-registration.md), [Tài khoản và phân quyền](docs/admin-roles.md).

## 10. Khóa học, miễn phí và thanh toán MoMo

Quyền học được quản lý theo từng khóa, độc lập với lớp ghi trong hồ sơ học sinh.

| Cách nhận khóa | Cách hoạt động |
| --- | --- |
| Thanh toán | Khóa có học phí/thời hạn; checkout MoMo và IPN có xác minh chữ ký để cấp quyền trên máy chủ. |
| Đợt miễn phí | Admin mở lịch nhận đăng ký; học sinh bấm đăng ký khóa trong đợt để nhận một năm từ ngày đăng ký khóa. |
| Cấp miễn phí riêng | Admin tổng chọn học sinh, khóa, thời hạn và ghi chú; có gia hạn/thu hồi theo quyền được cấp. |

Nhóm người dùng cũ được hiển thị theo chính sách miễn phí đã thống nhất, tính từ đăng ký từng khóa; không dùng ngày tạo tài khoản thay thế. Không tạo giao dịch MoMo giả để thể hiện quyền chuyển tiếp.

Luồng QR/chuyển khoản và duyệt thanh toán thủ công cũ đã ngừng sử dụng; lịch sử cũ được giữ để đối chiếu. Việc hết quyền học không xóa bài làm đã có.

**Trạng thái vận hành:** code MoMo và màn hình cấu hình đã có. Snapshot kiểm tra chỉ đọc được ghi trong hồ sơ ngày 23/11 chưa có tài khoản MoMo đang dùng; chủ web còn phải cấu hình thông tin thật và xác nhận giao dịch thực tế. Báo cáo này không khẳng định đã nghiệm thu thanh toán tiền thật.

Xem phần chính sách mới ở đầu [Khóa học và MoMo](docs/courses.md); các mô tả QR/duyệt tay phía sau tài liệu đó là lịch sử.

## 11. Phụ huynh, giao bài và phản ánh

| Chức năng | Kết quả đã thực hiện |
| --- | --- |
| Góc phụ huynh | Tổng quan học tập, nhịp học, kết quả và lịch sử theo con/khóa/khoảng thời gian. |
| Liên kết với con | Nhập mã, chờ học sinh đồng ý; chỉ mở báo cáo trong liên kết có hiệu lực và có thể thu hồi. |
| Giao bài | Giáo viên giao bài trong phạm vi quản lý, xem bài nộp và nhận xét. |
| Phản ánh câu hỏi | Học sinh gửi nội dung kèm ngữ cảnh, câu trả lời và vị trí gặp lỗi. |
| Phản hồi admin | Có trạng thái xử lý, đang lưu/đã lưu/lỗi và hạn chế ghi đè khi sửa đồng thời. |
| Hộp thư góp ý | Học sinh xem lịch sử; phản hồi mới có số chưa đọc để nhận biết. |
| Nhật ký truy cập | Admin xem trong phạm vi được phép; dữ liệu thiếu không bị suy ra thành kết luận chưa học. |
| Trò chuyện | Có chat, kết bạn và thông báo; chat trên Vercel dùng HTTP polling. Cuộc gọi/Push phụ thuộc cấu hình và quyền thiết bị. |

Học sinh có thể cài ứng dụng web theo khả năng trình duyệt. PWA không đồng nghĩa mọi nội dung có thể học ngoại tuyến.

Tài liệu: [Hỗ trợ học tập/phụ huynh](docs/learning-support.md), [Học tập và phản ánh](docs/study-hub.md), [Chat](docs/chat.md), [Cuộc gọi](docs/chat-calls.md), [Lịch sử truy cập](docs/user-access-history.md), [Cài ứng dụng](docs/app-install.md).

## 12. Kim cương và các chức năng đã bỏ

Kim cương được hiển thị theo chương trình để tránh nhầm với tổng ví. Cơ chế thưởng học tập có kiểm tra ở máy chủ và tham chiếu chống cộng trùng; thưởng không thay cho điểm kiến thức.

Chức năng mua/đổi vật phẩm đã bị gỡ theo yêu cầu. Vật phẩm cũ còn sở hữu không đồng nghĩa cửa hàng mua lại đang hoạt động. Có công cụ hoàn kim cương theo giao dịch gốc, kèm đối chiếu và chống hoàn trùng; hồ sơ tiến độ có kết quả hoàn của đợt đã thực hiện.

Robot/thách đấu không còn là luồng học hiện hành. Ý tưởng luyện viết từ theo nghĩa Việt rồi AI chấm đã được người dùng bỏ; không liệt kê nó thành chức năng hoàn tất. Tra chữ viết tay để tìm nghĩa/cách đọc là chức năng riêng đã có.

Xem [Thưởng học tập](docs/learning-rewards.md), [Kim cương theo chương trình](docs/diamond-programs.md).

## 13. Kiến trúc và môi trường triển khai

| Thành phần | Công nghệ và vai trò |
| --- | --- |
| Giao diện | HTML, CSS, JavaScript ES Modules, thiết kế cho điện thoại và máy tính. |
| Máy chủ | Node.js 24 theo cấu hình dự án, Express 5, Zod và các service nghiệp vụ. |
| Website online | Vercel Functions, PostgreSQL/Supabase và kho tệp riêng tư. |
| Chạy local | Express; hỗ trợ MySQL/MariaDB trong XAMPP hoặc PostgreSQL được cấu hình riêng. |
| Nhập Word | Mammoth đọc văn bản, bộ phân tích câu hỏi dùng chung với Quiz. |
| So biểu thức | Nerdamer 1.1.13, nạp `all.js`, kết hợp các bộ chuẩn hóa/đối chiếu đáp án. |
| Kiểm tra | Node test, Vitest/Supertest và Playwright; phạm vi tùy bộ kiểm tra. |

Local và online không tự đồng bộ dữ liệu hai chiều. Push code không tự đưa database local, tài liệu nguồn hoặc khóa API lên production.

Đã xử lý lỗi Vercel **Division by zero** khi tracer cũ phân tích Nerdamer 2.x. Không nâng lại thư viện này mà chưa kiểm tra đóng gói API; dựng CSS/JS thành công riêng chưa đủ chứng minh function được đóng gói.

Mã HTML học sinh/admin được phục vụ qua Express có kiểm tra đăng nhập; build static chỉ xuất tài nguyên. Các module/CSS được gắn mã release để giảm lỗi dùng file cache cũ sau cập nhật.

## 14. Bảo vệ dữ liệu và nguyên tắc vận hành

- Mật khẩu băm, cookie đăng nhập HttpOnly, kiểm tra quyền theo vai trò/phạm vi, cùng xác thực dữ liệu trên máy chủ.
- OTP có thời hạn và giới hạn thử; cấu hình mail và khóa bí mật không trả về frontend.
- Đáp án/lời giải và tệp riêng tư có kiểm soát truy cập; không đặt backup có đáp án vào thư mục public.
- Giao dịch điểm/thưởng/thanh toán có kiểm tra tính hợp lệ và cơ chế chống xử lý trùng trong từng luồng.
- Lượt làm giữ snapshot. Sửa bài mới không được viết lại kết quả đã nộp.
- Không dùng tài khoản thật của học sinh để tạo điểm/lịch sử thử.
- Các đợt nhập hoặc chuyển đổi dữ liệu phải xác định phạm vi, sao lưu/đối chiếu; không seed đè toàn bộ production.
- Bản quản trị và bản tải Word này không cần migration, không sửa hồ sơ, quyền học, điểm hay kim cương.

Các biện pháp trên mô tả cơ chế đã có trong ứng dụng, không thay cho kết quả kiểm toán bảo mật độc lập.

## 15. Kiểm tra đã thực hiện cho bản cập nhật này

| Nhóm | Kết quả và phạm vi |
| --- | --- |
| Node | 24 kiểm tra: lưu kiến thức, phiên bản đồng thời, nhập Word, bộ mẫu thật, điểm 10, đáp án thiếu và các cách chấm đề. |
| Trình duyệt | 14 kiểm tra với API giả lập: ba cấp học, phân quyền, Unit, thêm câu, nhập Word trong đề và từ danh sách, sửa xem trước, lưu lỗi/thử lại, hủy không tạo đề và xuất bản. |
| Điện thoại | Kiểm tra bố cục ở 390 px, gồm ô tải Word và cửa sổ xem trước. |
| Dữ liệu thật của bản quản trị trước | Chỉ truy vấn READ ONLY danh mục lớp 1/6/12 và phạm vi Toán 12; không tạo lượt làm hoặc ghi dữ liệu thử. |
| Build/phát hành | Dựng tài nguyên, kiểm tra đóng gói và đối chiếu release API/giao diện theo quy trình triển khai. |

Lệnh chạy lại các kiểm tra không dùng database học sinh:

```powershell
node --test backend/tests/school-admin-authoring.node-test.mjs backend/tests/school-exam-word.node-test.mjs backend/tests/worksheet-exams.node-test.mjs backend/tests/worksheet-school-exams.node-test.mjs backend/tests/worksheet-expression-solutions.node-test.mjs
npx playwright test --config playwright.school-admin.config.js
npm run build:vercel
node backend/scripts/check-deployment.mjs --origin https://tttnava-backend.vercel.app
```

Nếu máy chưa có Chromium, cài bằng `npx playwright install chromium` trước khi chạy Playwright.

`npm test` và một số bộ E2E khác có bước tạo/migrate/seed/dọn dữ liệu test. Chỉ chạy khi đã xác nhận cấu hình database test tách biệt; không coi chúng là kiểm tra chỉ đọc trên production. Không suy rộng kết quả mock thành kết quả gửi mail, thanh toán, micro hoặc Push trên mọi thiết bị thật.

## 16. Những phần còn chờ hoặc cần tiếp tục đánh giá

| Việc | Trạng thái cần theo dõi |
| --- | --- |
| MoMo thật | Nhập tài khoản/khóa kết nối và xác nhận thanh toán thực tế. |
| Mail đăng ký/quên mật khẩu | Theo dõi gửi/nhận thật, lỗi nhà cung cấp và hạn mức theo cấu hình đang dùng. |
| Tài khoản cũ không Gmail | Chưa đủ hồ sơ hoàn tất; cần xác định đúng phạm vi trước thao tác xóa. |
| Chất lượng nội dung | Giáo viên rà soát kiến thức, ví dụ và câu tự biên soạn theo từng bài. |
| Viết tay | Thử thêm chữ/nét viết thực tế trên điện thoại và xử lý phản hồi nhận sai. |
| AI luyện nói | Đánh giá giọng người học thật; hiện không phải công cụ chấm phát âm/thanh điệu đầy đủ. |
| Cuộc gọi và Push | Cần cấu hình TURN/Push, quyền thiết bị và kiểm tra qua mạng/thiết bị thực tế. |
| Nhập tài liệu phức tạp | Word dạng scan, hình hoặc MathType chưa được đọc tự động đầy đủ. |
| Tài liệu chức năng cũ | Một số file còn phần lịch sử; ưu tiên ngày cập nhật và báo cáo này khi có khác biệt. |

## 17. Chạy và cấu hình trên máy phát triển

Cần Node.js 24 theo `.nvmrc`, npm và database local đã được chuẩn bị. Các lệnh dưới dành cho môi trường phát triển, không phải quy trình ghi đè website đang có người học.

```powershell
npm ci
npm --prefix backend ci
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
```

Điền cấu hình vào file local, tạo database riêng và chạy migration tương ứng theo [Kiến trúc](docs/architecture.md) / [Chuyển Vercel–Supabase](docs/vercel-supabase-migration.md). Trên môi trường mới, dùng các script seed chương trình cần thiết; không chạy seed chỉ để làm mới giao diện.

```powershell
npm run dev
# hoặc
npm start
```

Mặc định mở `http://localhost:3000`. Script `npm run seed:admin` hỗ trợ tạo admin đầu tiên bằng cấu hình `BOOTSTRAP_ADMIN_*`; không đưa mật khẩu thật vào README hoặc Git.

| Nhóm cấu hình | Các biến/chỗ cấu hình chính |
| --- | --- |
| Máy chủ/đăng nhập | `NODE_ENV`, `PORT`, `APP_ORIGIN`, `JWT_SECRET`, `COOKIE_SECURE`. |
| MySQL local | `DB_DRIVER=mysql`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`. |
| PostgreSQL | `DB_DRIVER=postgres`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSCHEMA`, cấu hình chứng chỉ. |
| Kho tệp | Cấu hình Supabase Storage trong môi trường máy chủ; không đặt secret key trong JS frontend. |
| Gmail/OTP | `REGISTRATION_ENABLED`, `REGISTRATION_MAIL_PROVIDER`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`; quên mật khẩu dùng dịch vụ gửi tài khoản hiện có. |
| AI luyện nói | Cờ bật, khóa Groq và xác nhận ZDR theo tài liệu luyện nói; không tự bật bằng việc đẩy code. |
| MoMo | Nhập thông tin kết nối qua khu vực quản trị được phân quyền. |
| Cuộc gọi/Push | Các biến TURN và Web Push theo tài liệu tương ứng. |

Bí mật nằm trong môi trường triển khai hoặc các file được Git bỏ qua. Local và Vercel có cấu hình độc lập.

## 18. Cấu trúc mã nguồn và tài liệu

```text
TTTNAVA/
├─ frontend/
│  ├─ assets/                 CSS, JS, linh vật, mẫu Word
│  └─ pages/                  đăng nhập, đăng ký, học sinh, admin, phụ huynh
├─ backend/
│  ├─ src/                    routes, services, xác thực, phân quyền, database
│  ├─ scripts/                migration, nhập liệu, đối chiếu và phát hành
│  ├─ sql/                    migration/schema theo môi trường
│  ├─ seed-data/              mục lục và nguồn nội dung
│  ├─ tests/                  các bộ kiểm tra nghiệp vụ
│  └─ backups/                hồ sơ cục bộ; không đưa vào Git/public
├─ e2e/                       kiểm tra trình duyệt
├─ docs/                      hướng dẫn theo chức năng
├─ TIEN_DO_DU_AN.md            tiến độ, quyết định và bằng chứng
├─ vercel.json                cấu hình triển khai hiện tại
└─ README.md                  báo cáo này
```

Các tài liệu bắt đầu nhanh:

| Cần tìm | Tài liệu |
| --- | --- |
| Tổng thể và việc còn chờ | [TIEN_DO_DU_AN.md](TIEN_DO_DU_AN.md) |
| Quản trị và tải đề Word | [admin-school-workspace.md](docs/admin-school-workspace.md) |
| Soạn/làm bài tập | [worksheets.md](docs/worksheets.md) |
| THCS / THPT | [secondary-school.md](docs/secondary-school.md), [high-school.md](docs/high-school.md) |
| Tiếng Trung / viết tay | [chinese.md](docs/chinese.md), [handwriting-local.md](docs/handwriting-local.md) |
| Tài khoản / Gmail | [admin-roles.md](docs/admin-roles.md), [gmail-registration.md](docs/gmail-registration.md) |
| Miễn phí / MoMo | [courses.md](docs/courses.md) |
| Phụ huynh / phản ánh | [learning-support.md](docs/learning-support.md), [study-hub.md](docs/study-hub.md) |
| Kiến trúc / triển khai | [architecture.md](docs/architecture.md), [vercel-supabase-migration.md](docs/vercel-supabase-migration.md) |

## 19. Cách cập nhật báo cáo ở lần tiếp theo

Mỗi đợt cần ghi rõ chức năng mới, phạm vi dữ liệu, kết quả kiểm tra, bản phát hành và phần còn chờ. Không đánh dấu hoàn tất chỉ vì có giao diện, script hoặc bản sao lưu trước thao tác. Số liệu nhập đề phải gắn với báo cáo của đợt; trạng thái mail, AI và thanh toán phải phân biệt giữa code đã có, cấu hình đã nhập và vận hành thực tế.

Hồ sơ bản quản trị đã phát hành ở `backend/backups/admin-school-workspace/release.json`; hồ sơ bản tải Word ở `backend/backups/exam-word-upload/release.json` trên máy làm việc. Kiểm tra online bằng hai endpoint release để xác nhận giao diện và API cùng phiên bản.
