# Lộ trình Tiếng Trung

## Cách dùng admin hiện tại

1. Vào **Quản lý Tiếng Trung → Bài học**, chọn HSK và bài. Chưa có bài thì bấm **+ Thêm bài học**, chỉ cần nhập tên.
2. Chọn file Word rồi bấm **Tải lên và kiểm tra**. Tên tài liệu tự lấy từ tên file.
3. Xem trực tiếp câu hỏi và đáp án. Chỉ bấm **Sửa câu hỏi** khi cần chỉnh. Danh sách chia trang, không hiện hàng trăm ô nhập cùng lúc.
4. Bấm **Cho học sinh xem** và xác nhận đã kiểm tra. Hệ thống lưu duyệt, xuất bản tài liệu và mở bài học. Nội dung thiếu đáp án hoặc chưa nhận diện vẫn phải sửa trước. Nếu chưa xong, bấm **Lưu bản nháp**.

Menu chính chỉ có Bài học, Học sinh Tiếng Trung và Tiến độ. Không cần qua trang tổng quan, quản lý cấp HSK, ngân hàng câu hỏi hoặc bước duyệt riêng. Mỗi file vẫn là một tài liệu riêng. Đổi tên tài liệu, tải file gốc và đọc lại Word nằm trong **Tùy chọn tài liệu**. Các URL cấu hình HSK/bài kiểm tra cũ vẫn được giữ để dùng khi cần, không xuất hiện trên menu chính. Phần mô tả nghiệp vụ và API bên dưới áp dụng cho dữ liệu hệ thống; thao tác admin thường ngày dùng bốn bước trên.

Giao diện đơn giản được kiểm tra bằng 3 luồng Playwright: tạo bài → nhập Word → chặn nội dung chưa hợp lệ → cho học sinh xem; tạo/sửa tài khoản học sinh Tiếng Trung; sửa câu hỏi trên hai trang rồi lưu, giữ nguyên trường bổ sung và hủy xác nhận xuất bản. Cả 3 luồng đạt, bao gồm bố cục 390px. Màn hình chính dùng `script.js`; phần cấu hình HSK/bài kiểm tra cũ được tách sang `advanced.js` và chỉ tải khi truy cập URL đó.

Module độc lập với chương trình lớp 1–5, dùng Express/MySQL, JavaScript ES modules, cookie đăng nhập và hai vai trò `admin`/`student` hiện có. Quiz/bài kiểm tra Tiếng Trung sử dụng quy tắc Kim Cương đã được người dùng xác nhận bên dưới.

## Chạy cục bộ

1. Mở MySQL trong XAMPP. Dùng cấu hình `backend/.env` hiện có (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `JWT_SECRET`, `APP_ORIGIN`, `PORT`). Không chia sẻ file này.
2. Chạy `npm --prefix backend install` nếu chưa có dependencies. Mammoth, Multer, mysql2 và Zod đã nằm trong package.json; không có thư viện mới bắt buộc.
3. Chạy `npm run db:migrate`. Migration `010_chinese.sql` chỉ thêm bảng `chinese_*` và danh mục HSK 1–9; không ghi đè dữ liệu cũ. Migration có thể được runner bỏ qua sau khi đã áp dụng.
4. Khởi động lại backend bằng `npm run dev` hoặc `npm start`. Frontend được Express phục vụ cùng origin; không cần server frontend riêng, không mở HTML trực tiếp bằng file://.
5. Admin: `/pages/admin/chinese/`. Học sinh: `/pages/student/chinese/`. Có liên kết trên thanh điều hướng và trang chủ học sinh.

Nếu cổng 3000 đang có một backend cũ, khởi động lại tiến trình đó để nạp route mới. Khi kiểm thử có thể dùng cổng khác mà không dừng backend đang sử dụng:

```powershell
$env:E2E_PORT='3108'
npx playwright test e2e/chinese.spec.js --project=desktop-chromium
```

## Nhập Word và xuất bản

Tạo bài ở HSK mong muốn; chọn Tài liệu & bộ nội dung, chọn HSK/bài, đặt tên và tải `.docx` tối đa 20 MB. `.doc` cần chuyển sang `.docx`. Giới hạn ZIP giải nén là 80 MB, tối đa 2.000 entries và 500.000 ký tự sau trích xuất. Không xử lý tài liệu Word có cấu trúc tùy ý bằng AI.

Migration `011_chinese_document_size.sql` đổi cột file gốc sang LONGBLOB để hỗ trợ file trên 16 MB. MySQL cần `max_allowed_packet=64M` trong mục `[mysqld]` của `E:\xampp_server\mysql\bin\my.ini`; đã cập nhật cấu hình trên máy này và áp dụng giá trị runtime. Khi cài ở máy khác, cập nhật cấu hình và khởi động lại MySQL trước khi nhập file lớn.

Màn hình tổng quan có hướng dẫn 3 bước; màn hình nhập đặt trước danh sách bộ, tự điền tên theo file và hướng dẫn tạo bài khi HSK chưa có bài. Trình biên tập thu gọn từng mục, có nút mở/thu gọn tất cả, thanh Lưu bản nháp / Xuất bản bộ và thông báo lỗi theo từng mục.

Mỗi lần nhập tạo tài liệu nguồn và bộ mới với UUID riêng, trong một transaction. File trùng SHA-256 gây cảnh báo; admin phải chủ động xác nhận tạo bộ mới. Không có chế độ ghi đè phiên bản. File gốc lưu trong BLOB, chỉ tải được qua API admin; không đặt trong thư mục public.

Tải [mẫu Word](../frontend/assets/templates/chinese-template.docx) từ màn hình nhập. Mẫu chứa hướng dẫn và ví dụ định dạng; không được tự seed vào hệ thống. Xóa hướng dẫn trước nhập hoặc xử lý các đoạn đó ở nhóm Chưa xác định. Có thể tái tạo mẫu bằng `python backend/scripts/create-chinese-template.py` (Python 3, thư viện chuẩn).

Các tiêu đề nguyên văn:

Ngoài định dạng bảng, hỗ trợ trực tiếp câu hỏi dạng đoạn văn:

```text
MÔN: Tiếng Trung
LỚP: HSK 1
CHỦ ĐỀ: Bài 1 你好
Câu 1. “你” có nghĩa là gì?
A. mười
B. bạn
C. bài học
D. già
Đáp án: B
Lời giải: 你 đọc là nǐ, nghĩa là bạn.
Độ khó: Dễ
```

Câu hỏi bắt đầu bằng “Câu <số>.”, lựa chọn A./B./C./D., đáp án là ký hiệu lựa chọn, lời giải và độ khó được giữ từ nguồn. Nhận tiêu đề in đậm, xuống dòng bằng Shift+Enter và các mức Dễ/Trung bình/Khó. Không suy ra từ vựng chỉ từ lời giải. Câu thiếu đáp án hoặc có ký hiệu không hợp lệ vẫn cần admin sửa, không tự đoán.

Trong trang bộ, nút “Duyệt tất cả câu hỏi” ở thanh thao tác cuối trang cho phép duyệt hàng loạt sau khi admin đã kiểm tra. Hộp xác nhận nêu rõ số câu và phạm vi toàn bộ bộ, bao gồm các câu đang bị lọc ẩn. Xác nhận sẽ lưu các chỉnh sửa hiện tại và trạng thái duyệt; không tự xuất bản, không áp dụng bộ khác. Sau đó bấm “Xuất bản bộ”. Các điều kiện bắt buộc như đáp án đúng, lựa chọn không trùng và nội dung chưa xác định vẫn được backend kiểm tra. Thông báo chờ duyệt được gộp theo số lượng thay vì liệt kê hàng trăm dòng.

Nếu bộ nháp đã nhập bằng bộ đọc cũ: mở bộ → “Phân tích lại file Word” → xác nhận. Thao tác giữ file gốc và bộ hiện tại, thay các mục nháp bằng kết quả đọc mới; các mục cũ được đánh dấu không hoạt động. Chỉ dùng cho bộ draft chưa có hoạt động học; không phân tích lại bộ published hoặc đã có lịch sử. Các sửa đổi thủ công của bản nháp sẽ được thay bằng nội dung nguồn, vì vậy cần xem thông báo xác nhận trước khi thực hiện. Câu hỏi sau phân tích vẫn chờ admin duyệt.

| Tiêu đề | Nội dung |
|---|---|
| `[TU VUNG]` | Bảng hoặc mỗi dòng phân cách các cột bằng dấu `\|` |
| `[CAU HOI]` | Bảng hoặc dòng phân cách cột bằng `\|` |
| `[NGU PHAP]` | Các đoạn văn |
| `[HOI THOAI]` | Các đoạn hội thoại |
| `[BAI DOC]` | Các đoạn bài đọc |

Cột từ vựng theo thứ tự: Hanzi, Pinyin, nghĩa, từ loại, ví dụ, pinyin ví dụ, nghĩa ví dụ, URL âm thanh, URL ảnh, mẹo nhớ, bộ thủ, nhóm (`main` hoặc `extended`). Chữ Hán và nghĩa bắt buộc; các cột sau được để trống. Không tự tạo pinyin hoặc bản dịch.

Cột câu hỏi theo thứ tự: loại, nội dung, lựa chọn, đáp án chấp nhận, giải thích, URL âm thanh, độ khó, danh sách vế phải để ghép (nếu có). Các lựa chọn, đáp án thay thế và vế phải ngăn bằng `;;`. Để trống cột vẫn cần giữ vị trí. Các loại: `choice`, `text`, `pinyin`, `matching`, `ordering`, `listening`, `dictation`, `fill`. Câu hỏi nhập từ Word luôn chờ admin duyệt.

Ghép cặp: lựa chọn là vế trái, `targets` là ngân hàng vế phải theo thứ tự bất kỳ. Đáp án theo thứ tự vế trái, ví dụ `你=Bạn | 好=Tốt`. Sắp xếp: lựa chọn là các từ, đáp án là câu hoàn chỉnh dùng đúng các từ đó. Phương án nhiễu và đáp án đều do admin nhập; không tự tạo bài luyện từ từ vựng.

Trong bộ: mở tab tương ứng để thêm/sửa/xóa/sắp xếp nội dung. Chọn loại mới của mục rồi chuyển tab để sửa các trường của loại đó. Bộ có breadcrumb, file nguồn và URL `?set=<uuid>` riêng. Lưu trạng thái draft để giữ nội dung chưa hoàn thiện, hoặc chọn published rồi lưu. Nội dung không xác định, câu chưa duyệt, thiếu đáp án, lựa chọn trùng hoặc đáp án không thuộc lựa chọn sẽ chặn xuất bản. Xóa mục thực tế là `active=0`; lịch sử không mất. Lưu thất bại giữ dữ liệu đang nhập.

Bài và bộ đều phải published mới xuất hiện trên API học sinh. Admin có bản xem trước ngay trong trang bộ. Câu hỏi Tiếng Trung chỉ nằm trong `chinese_items`; không ghi vào `questions` của lớp 1–5. Liên kết tới tài liệu nguồn đi qua `item.set_id → set.document_id`.

## Học, ôn tập và tiến độ

### Giao diện học sinh gọn

Trang Tiếng Trung mở thẳng danh sách bài của HSK đã học gần nhất (hoặc cấp đầu tiên có tài liệu). Chọn HSK ngay trên trang; mỗi tài liệu có nút **Thẻ lật**, **Quiz 20 câu**, và **Bài đọc** nếu có nội dung tương ứng. Tài liệu chưa đủ 20 câu thì nút quiz bị khóa và có thông báo rõ; vẫn học thẻ được. Không cần đi qua màn hình cấp → bài → bộ rồi mới chọn học.

Thẻ từ vựng lấy trực tiếp các mục vocabulary. Khi tài liệu chỉ có câu hỏi, dùng **Thẻ câu hỏi**: mặt trước là câu hỏi/lựa chọn, mặt sau là đáp án và lời giải nguồn, chỉ tải sau thao tác lật. Không suy diễn pinyin hoặc tạo từ vựng từ lời giải. Tài liệu có cả hai loại cho đổi loại thẻ trong Tùy chọn thẻ. Vị trí thẻ được lưu; lật thẻ câu hỏi không cộng điểm quiz hoặc biến thành tự đánh giá từ đã nhớ.

Quiz chọn ngẫu nhiên đúng 20 câu duy nhất rồi lưu bản chụp cố định. Mỗi màn hình có một câu: chọn/nhập đáp án → Kiểm tra → phản hồi → Câu tiếp theo. Kiểm tra câu cuối tự hoàn thành bài, tính điểm và Kim Cương; không còn bước nộp thừa. Có kết quả, ôn câu sai và làm lại. Bấm Quiz khi đang có lượt chưa hoàn thành sẽ tiếp tục đúng lượt đó, kể cả gửi yêu cầu khởi tạo đồng thời. Lượt đã hoàn thành mới được tạo lượt mới khi làm lại. Bài kiểm tra do admin cấu hình giữ số câu/thời gian riêng; không cho frontend thay số câu bằng `count`.

API bổ sung: GET `sets/:id/study/:itemId` dành cho học sinh, kiểm tra bài/bộ published và mục câu hỏi đang hoạt động, đã duyệt. POST attempts dùng `count:20` cho quiz với `set_id`; giá trị count khác bị từ chối. Endpoint luyện tập cũ không có count được giữ tương thích và không nhận thưởng mới; giao diện hiện tại chỉ tạo quiz 20 câu.

### Kim Cương và lượt đang làm

Quy tắc đã xác nhận: đúng 100% được +3; từ 70% đến dưới 100% được +1; dưới 70% bị −1. Chỉ trừ tới số dư 0. Áp dụng cho quiz 20 câu và bài kiểm tra Tiếng Trung mới. Thẻ lật/đánh dấu đã đọc không cộng/trừ Kim Cương. Điểm, biến động và ledger được lưu cùng transaction, khóa theo học sinh và lượt; chốt/nộp lặp không tạo thưởng/phạt trùng. Đủ câu tự chốt; nộp sớm hoặc hết giờ tính các câu chưa chốt là sai và áp dụng cùng quy tắc. Quy tắc được chụp trong snapshot, không tính lại phần thưởng lịch sử.

Migration `013_chinese_quiz_diamonds.sql` thêm `abandoned_at`, `diamonds_delta` và các loại ledger Tiếng Trung. Lượt dở trước migration được đóng mềm, ẩn khỏi danh sách đang làm, không chấm điểm hoặc phạt hồi tố; toàn bộ dữ liệu còn trong database. Kết quả đã hoàn thành giữ nguyên. Sau cập nhật chỉ duy trì một lượt đang làm cho mỗi học sinh và mỗi nguồn quiz/bài kiểm tra. Trang Kết quả tách phần Tiếp tục học khỏi danh sách đã hoàn thành, có cột Kim Cương. Header và lịch sử Kim Cương chung nhận biến động Tiếng Trung.

Đã kiểm thử backend 101/101. Playwright kiểm tra thẻ từ, đổi sang thẻ câu hỏi và tiếp tục sau tải lại, tài liệu chỉ có câu hỏi, quiz 20 câu trên 24 câu nguồn, hiển thị từng câu, kết quả 100/100, làm lại bằng attempt mới và bố cục 390px. Luồng tạo tài khoản học sinh Tiếng Trung cũng đạt. Các thành phần viết/ghi âm được tách sang `frontend/pages/student/chinese/learning-tools.js` và đặt trong phần mở rộng.

Quản lý Tiếng Trung → Học sinh Tiếng Trung mở danh sách tài khoản riêng. Chọn Thêm học sinh, nhập thông tin và chọn “Tiếng Trung — không theo lớp 1–5”. Tài khoản này lưu `profiles.grade=NULL`, vẫn có vai trò STUDENT, không bị gán một lớp tiểu học giả. Sau đăng nhập được đưa tới trang Tiếng Trung. Có thể sửa tài khoản qua lại giữa lựa chọn Tiếng Trung và lớp 1–5. Bộ lọc danh sách phân biệt tài khoản Tiếng Trung với tài khoản tiểu học; học sinh tiểu học vẫn truy cập lộ trình Tiếng Trung bình thường. Migration `012_chinese_students.sql` cho phép grade trống, không thay đổi dữ liệu hay quyền của tài khoản hiện có.

Đã kiểm thử trình duyệt `e2e/chinese-students.spec.js`: tạo học sinh Tiếng Trung, lọc danh sách, sửa thông tin và đăng nhập đi tới HSK mà không gán lớp tiểu học; 1/1 đạt.

Thẻ lật hỗ trợ mặt trước chữ Hán/nghĩa/pinyin, chọn nhóm từ, trộn, trước/sau, yêu thích và ba mức tự đánh giá. Nút thẻ dùng được bằng Enter/Space và cảm ứng. Vị trí được lưu ở server khi mở bộ hoặc chuyển từ. Sổ từ lọc theo trạng thái, HSK, bài, bộ. Ghi nhớ và yêu thích thuộc tài khoản đăng nhập; API không nhận user_id để quyết định chủ sở hữu.

Lịch ôn dùng UTC lưu trong MySQL, hiển thị theo múi giờ trình duyệt. Chưa nhớ: 10 phút; cần ôn: 1 ngày; đã nhớ: `min(30, 2^min(số lượt ôn,5))` ngày. Đánh dấu yêu thích không tăng lượt ôn. Một `event_id` chỉ áp dụng một lần, kể cả gửi đồng thời. Câu trả lời sai có liên kết từ vựng trong cùng bộ đưa từ đó vào cần ôn và tăng số lần sai. Kết quả luyện không biến thành tự đánh giá “Đã nhớ”.

Tiến độ bộ = (số từ đã tự đánh giá ít nhất một lần + số đoạn ngữ pháp/hội thoại/bài đọc xác nhận đã đọc + số câu hỏi đã chốt) / tổng số các mục hiện đang hoạt động trong bộ. Mỗi mục tính tối đa một lần; việc lật thẻ không tự tính hoàn thành. Tiến độ HSK/bài là trung bình tiến độ các bộ published thuộc phạm vi đó; không có bộ thì 0%. “Đã nhớ” chỉ là tự đánh giá, không phải điểm chứng nhận thành thạo.

Âm thanh dùng URL nội bộ hoặc HTTPS do admin nhập; không có nguồn và không có giọng Trung trên thiết bị thì không hiển thị nút phát âm. Ảnh hỗ trợ đường dẫn nội bộ hoặc HTTPS. Ghi âm yêu cầu người học chủ động cấp quyền microphone; bản ghi chỉ nằm trong trình duyệt, dừng tự động sau 60 giây, không upload. Canvas tự luyện viết không chấm nét, không nhận xét đúng/sai. Chưa tích hợp dịch vụ chấm phát âm hoặc dữ liệu thứ tự nét; không hiển thị điểm giả.

## Kiểm tra

Admin chọn rõ các bộ nguồn cho bài kiểm tra (một bộ, các bộ của bài, hoặc các bộ trong HSK). Câu hỏi lấy theo thứ tự bộ đã chọn và thứ tự trong bộ. Cấu hình tiêu đề, thời gian hoặc không giới hạn, phần trăm đạt, trạng thái. Các câu trọng số bằng nhau; điểm = số đúng / tổng số câu × 100. Kim Cương được tính theo quy tắc nêu trên.

Mỗi lượt có UUID và bản chụp đầy đủ câu hỏi, đáp án, giải thích, điều kiện đạt. Sửa nội dung gốc không đổi cách chấm lượt đang làm. Học sinh lưu/đổi lựa chọn trước Chốt; server khóa/chấm câu bằng transaction và khóa hàng. Chốt lại, gửi đồng thời hoặc nộp lại không nhân kết quả. Đáp án/giải thích chỉ trả sau Chốt hoặc khi bài đã kết thúc. Làm lại bắt đầu lượt mới qua nút Bắt đầu luyện tập/Bắt đầu bài kiểm tra. Lịch sử có kết quả, điểm, thời gian, câu đúng/sai, giải thích và nút chỉ ôn câu sai.

Chính sách riêng của module: hết `ends_at`, server khóa và chấm khi có request kế tiếp (giao diện tự tải lại đến hạn); câu chưa chốt tính sai, kể cả đã lưu lựa chọn. Nộp sớm cũng áp dụng quy tắc đó và có thông báo xác nhận. Không áp dụng khoảng dung sai 5 giây của bài thi lớp 1–5 và không sửa cơ chế thi chung. Chuẩn hóa đáp án: Unicode NFC, trim, thu gọn khoảng trắng, chữ thường; giữ nguyên dấu thanh.

## API và file

API gốc `/api/v1/chinese`. Dữ liệu trả theo envelope `{data: ...}`, lỗi dùng middleware hiện có.

| Phạm vi | API |
|---|---|
| Đã đăng nhập | GET catalog, GET sets/:id, GET tests; admin được xem nháp |
| Học sinh | GET notebook/history, PUT reviews/:id, PUT sets/:id/progress |
| Học sinh | POST attempts, GET attempts/:id, POST attempts/:id/answers, POST attempts/:id/finish |
| Admin | GET stats, PUT levels/:id, POST lessons, PUT lessons/:id |
| Admin | POST imports (multipart `file`, `level_id`, `lesson_id`, `title`, tùy chọn `allow_duplicate=true`) |
| Admin | PUT sets/:id, POST tests, PUT tests/:id, GET documents/:id |

Các file mới:

- `backend/sql/migrations/010_chinese.sql`: bảng, khóa ngoại, chỉ mục, danh mục HSK.
- `backend/src/routes/chinese.js`, `controllers/chinese-controller.js`, `repositories/chinese.js`, `validators/chinese.js`, `services/chinese.js`, `services/chinese-import.js`: API, lưu dữ liệu, kiểm tra và đọc Word.
- `frontend/pages/{admin,student}/chinese/{index.html,style.css,script.js}`: quản trị và học sinh.
- `frontend/assets/js/chinese-common.js`, `frontend/assets/css/chinese.css`: thành phần dùng chung.
- `frontend/assets/templates/chinese-template.docx`, `backend/scripts/create-chinese-template.py`: mẫu nhập và script tạo mẫu.
- `backend/tests/chinese.test.js`, `e2e/chinese.spec.js`: kiểm thử tích hợp và trình duyệt.
- `docs/chinese.md`: tài liệu này.

Các file tích hợp thay đổi: `backend/src/routes/index.js` (mount router), `backend/src/app.js` (cho phép media HTTPS/blob và ảnh HTTPS), `frontend/assets/js/ui-core.js` (menu), `frontend/pages/student/home/index.html` (lối vào), `playwright.config.js` (cổng kiểm thử tùy chọn), `README.md` (liên kết hướng dẫn).

## Kiểm thử thực tế

Đã chạy migration 010 thành công trên MySQL cục bộ. Bộ backend: `npm test`, 13 file / 101 tests đạt. Bao gồm kiểm thử hai file hai bộ riêng, cảnh báo trùng, chặn nháp/cha lưu trữ, quyền tải nguồn, chống sửa chéo bộ, ôn theo tài khoản, gửi ôn/chốt lặp đồng thời, không lộ đáp án, snapshot khi sửa câu và hết giờ. Các kiểm thử chương trình cũ vẫn đạt.

Kiểm thử Playwright mới đi qua nhập Word trên UI → xóa đoạn chưa xác định → duyệt câu → xuất bản → thẻ lật → tự đánh giá → tải lại → làm luyện tập → chốt → điểm 100 → lịch sử; kiểm tra tràn ngang ở 390px và lỗi JavaScript. Chạy bằng lệnh phía trên. Đã chạy thêm `e2e/auth.spec.js` và `e2e/mobile.spec.js` cùng luồng Tiếng Trung: tổng cộng 8/8 đạt, gồm trang chủ, luyện tập và ngân hàng câu hỏi hiện có ở 360px. Không gọi dịch vụ phát âm bên ngoài; khả năng phát âm/ghi âm phụ thuộc trình duyệt, thiết bị, quyền microphone và URL âm thanh thực tế.
