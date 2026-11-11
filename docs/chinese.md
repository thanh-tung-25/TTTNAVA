# Lộ trình Tiếng Trung

## Nghe câu hỏi

Nút **Nghe câu hỏi** dùng chung cho luyện tập, kiểm tra, thi đấu, các dạng phiếu bài tập và tiếng Trung (quiz, thẻ học, vận dụng, ôn kết quả). Chỉ đọc khi bấm; bấm lại để dừng. Nếu thiết bị có giọng phù hợp, dùng giọng đó ở tốc độ 0,8. Nếu thiếu giọng, thiếu API đọc, hoặc giọng báo lỗi, tự tải MP3 qua backend và phát ở tốc độ 0,85; người dùng không cần cài giọng. Câu Việt và chữ Hán chọn ngôn ngữ tương ứng, môn tiếng Anh dùng ngôn ngữ mặc định tiếng Anh. Đọc phần đề được truyền riêng, không đọc đáp án hoặc lời giải. Dừng và hủy tải khi chuyển câu, ẩn màn hình làm bài hoặc rời trang. Dữ liệu chỉ có trong hình ảnh không thể tự đọc; cần đề bằng chữ.

Mã dùng chung: `frontend/assets/js/question-audio.js`; endpoint POST `/api/v1/question-audio` yêu cầu đăng nhập, giới hạn tần suất, đoạn tối đa 180 ký tự và chỉ cho vi-VN/en-US/zh-CN. Backend dùng nguồn MP3 Google Translate cố định, cache tối đa 100 đoạn trong bộ nhớ và gộp yêu cầu đang tải trùng. Chỉ gửi đoạn đề cần đọc sau khi người dùng bấm nghe. Cần mạng từ backend đến nguồn âm thanh; nguồn này không có cam kết SLA và có thể giới hạn truy cập. Nếu trình duyệt chặn phát sau khi tải, hiện điều khiển phát trực tiếp; lỗi mạng được báo và có thể bấm thử lại. Khi triển khai cần cập nhật cả backend và frontend. Phiếu bài tập giữ thông tin môn trong snapshot để chọn giọng đúng, nút nghe vẫn hoạt động khi xem bài đã nộp.

Đề câu hỏi không kèm pinyin trong ngoặc ngay sau chữ Hán: `“请问” (qǐngwèn) có nghĩa là gì?` hiển thị thành `“请问” có nghĩa là gì?`. Áp dụng cả câu đã lưu, lượt quiz đang làm, thẻ câu hỏi, xem trước chặng và ôn kết quả; nút nghe cũng dùng đề đã bỏ phần phiên âm này. Câu hỏi yêu cầu nhận diện/nhập pinyin, lựa chọn đáp án, lời giải và pinyin trong phần học từ vựng vẫn được giữ. Bộ tạo tài liệu và luồng nhập/lưu câu hỏi dùng cùng quy tắc để không thêm lại gợi ý này.

## Luyện nói và tải video về máy

Trong từng bài, chọn **Luyện nói**. Ưu tiên câu hỏi tiếng Trung từ Word đã xuất bản cho tài liệu đang học. Khi chưa có nguồn Word luyện nói riêng, dùng câu thoại từ các hoạt động Hội thoại đã xuất bản của chính bài đó. Bỏ câu trùng và câu dài quá 180 ký tự, trộn tối đa 10 câu mỗi lượt. Không tự sinh câu hỏi ngoài nội dung đã đăng.

Admin vào **Quản lý Tiếng Trung → chọn bài → Luyện nói → Tải lên và kiểm tra**. File Word đã chứa câu hỏi tiếng Trung; hệ thống giữ nguyên câu và đọc bằng giọng Trung, không dịch tự động. Mỗi đoạn/dòng hoặc một hàng bảng là một câu, có thể đánh số `Câu 1. 你叫什么名字？`. Tải mẫu tại `frontend/assets/templates/chinese-speaking-template.docx`. Dòng `Nghĩa: ...` kế tiếp hoặc cột nghĩa là thông tin tùy chọn để cô kiểm tra, không gửi về API học sinh, không đọc và không ghép vào video. Phần chưa nhận diện được giữ lại để cô chủ động sửa/xóa trước khi đăng. Câu luyện nói không cần lựa chọn, đáp án hay lời giải quiz.

Trang admin có các mục **Thẻ lật, Từ mới, Luyện nghe, Quiz 20 câu, Bài đọc, Luyện vận dụng, Luyện nói**, cùng tên với học sinh. Nhãn **Nội dung sẽ hiện ở** chỉ rõ HSK → bài → mục. Từ mới và Luyện nghe dùng chung nguồn từ vựng. Mỗi tài liệu ghi các mục học sinh sẽ thấy. Nút **Xem như học sinh** dùng nội dung đang soạn, chưa cần lưu; dùng chung trình luyện nghe, vận dụng và ghi hình với học sinh, không tạo tiến độ hay lượt thi. Bấm **Tiếp tục soạn** để sửa, **Lưu bản nháp** hoặc **Cho học sinh xem** để đăng.

Câu Word luyện nói lưu bằng loại `dialogue` hiện có, gắn `data.practice="speaking"`; không thêm bảng hoặc migration. Chúng không xuất hiện trong Bài đọc, thẻ câu hỏi hoặc Quiz và không tính vào tiến độ đọc. API nhập Word nhận `destination=general|vocabulary|question|reading|speaking`; Word tổng hợp có thể dùng mục `[LUYEN NOI]`. Đọc lại nguồn Word của bộ thuần luyện nói tự giữ đúng loại câu. Chỉ giáo viên được tải nguồn Word; video học sinh vẫn chỉ tạo cục bộ.

Học sinh bấm **Bật camera & micro**, sau đó **Bắt đầu quay**. Câu hỏi được đọc tự động bằng tiếng Trung và được nghe lại thêm một lần. Trong khi quay, màn hình không hiện câu chữ, pinyin, nghĩa hoặc đáp án. Video tự dừng sau 30 giây; có thể dừng sớm hoặc quay lại. Câu hỏi chữ Hán, tên/tài khoản học sinh, bài học, số câu, thời gian Việt Nam, tên miền và mã lượt được vẽ trực tiếp vào khung hình xuất ra; âm thanh gồm cả câu hỏi và microphone. Mã lượt hỗ trợ đối chiếu, không phải chữ ký xác minh hay bảo đảm chống chỉnh sửa tệp.

Bấm **Tải video về máy**, kiểm tra tệp rồi tự gửi qua Zalo. Phải bấm tải trước khi chuyển câu; bản ghi chỉ nằm tạm trong bộ nhớ trình duyệt và có nhắc trước khi rời trang nếu chưa tải. Không upload bản ghi, không lưu bản ghi vào database, Storage, localStorage hoặc IndexedDB. API chỉ nhận văn bản câu hỏi để cung cấp giọng đọc qua endpoint âm thanh hiện có. Tắt camera, rời màn hình hoặc rời trang sẽ dừng thiết bị; nếu chỉ chuyển sang màn hình khác khi đang quay thì giữ bản ghi dở để tải xuống.

Cần HTTPS hoặc localhost, quyền camera/microphone và trình duyệt hỗ trợ MediaRecorder, Canvas capture và Web Audio. Ưu tiên MP4 nếu trình duyệt hỗ trợ, dự phòng WebM; cần kiểm tra khả năng mở/gửi tệp trên điện thoại và phiên bản Zalo thực tế. Video ghép và nén trên thiết bị; không cần kho tệp mới hoặc thay đổi database. Mã nằm ở `frontend/assets/js/chinese-speaking*.js`, giao diện tại `frontend/assets/css/chinese-speaking.css`. Kiểm tra bằng `npm run test:speaking`, gồm camera giả lập, video thật tải được, chữ ghép trong khung hình, giới hạn nghe/quay, lỗi quyền/giọng đọc, dừng thiết bị, không upload media và bố cục 390px.

## Quản lý hoạt động vận dụng

Giao diện admin dùng thanh bên chung tại `admin-navigation.js` và `admin-unified.css`, giữ đúng menu theo phạm vi quản trị. Riêng mục Học sinh khi đang soạn Tiếng Trung giữ bộ lọc `program=chinese`. Trên điện thoại, menu mở bằng nút điều hướng, hỗ trợ Escape và giữ focus trong menu.

Trang Bài học admin và học sinh dùng chung `renderChineseLessons`: cùng chọn HSK, nhóm linh vật, các chặng và thẻ tài liệu. Admin thấy cả bài nháp và mọi mục nội dung, kể cả mục trống; mỗi nút mở đúng màn soạn của tài liệu. Thanh tiến độ học được thay bằng số nội dung và trạng thái đăng. Thêm bài, sửa tên, thứ tự, trạng thái và khôi phục bài lưu trữ thực hiện ngay tại danh sách bài.

Trong tài liệu, chọn **Từ mới / Luyện nghe / Quiz / Bài đọc / Luyện nói** chỉ sửa nội dung thuộc phần đó. **Thêm từ mới**, **Thêm câu hỏi**, **Thêm bài đọc** tạo đúng loại dữ liệu và mở ngay ô nhập. Khi lưu, các phần khác được giữ nguyên. Nhập Word tạo một tài liệu mới trong đúng bài/phần và đưa tới bước kiểm tra. Lưu hoặc đăng xong trở lại đúng phần đang soạn; thay đổi chưa lưu có nhắc khi rời trang. Màn soạn vận dụng, luyện nói, bài kiểm tra, cấp HSK và tiến độ dùng chung khung quản trị mới. **Xem như học sinh** dùng bản đang sửa và không ghi kết quả học.

Kiểm tra giao diện mới bằng `npm run test:admin-ui` (API giả lập, không ghi database), gồm ánh xạ admin–học sinh, thêm nội dung không làm mất phần khác, soạn từ bài trống, đăng bài, giao diện điện thoại và quyền menu. Luồng nhập Word, vận dụng và ghi hình vẫn có trong `playwright.applied.config.js`.

Khi chuẩn bị các bài tiếng Trung tiếp theo, luôn chuẩn bị cả hoạt động vận dụng phù hợp nội dung nguồn, cùng từ vựng và bộ câu hỏi. Mỗi dạng cần ít nhất 10 câu để có lượt luyện đầy đủ. Kiểm tra phần vận dụng đã xuất bản ở đúng bài/HSK khi bàn giao; không chỉ lưu file Word. Các bài Q1 1–6 có mẫu 40 hoạt động/bài: mỗi dạng xếp câu, sửa lỗi, điền từ, hội thoại có 10 câu. Tên tiếng Việt “Xin Chào” và “Hỏi tên, Hỏi họ, Quốc tịch” cũng nhận đúng mẫu bài 1–2, không dựa riêng vào số thứ tự để đoán bài.

Mỗi lượt lấy ngẫu nhiên tối đa 10 câu không lặp từ dạng được chọn; lượt tổng hợp lấy 10 câu từ toàn bộ nội dung. Luyện lại tạo lượt trộn mới, giữ nguyên dạng đã chọn. Nếu admin chỉ đăng ít hơn 10 câu thì hiển thị đúng số câu sẵn có, không lặp câu để đủ số lượng. Script `node backend/scripts/expand-chinese-activities.mjs` bổ sung ngân hàng câu cho bài Q1 hiện có và giữ nguyên nội dung đã soạn.

Dạng **Hội thoại** yêu cầu nghe câu thoại và chọn câu đáp lại phù hợp, không hiện bản dịch tiếng Việt của đáp án hay pinyin trước khi kiểm tra. Nút **Nghe câu hỏi** chỉ đọc câu nói của người đối thoại bằng tiếng Trung. Quy tắc này áp dụng cả với hoạt động đã lưu trước đây có bản dịch trong `prompt`, `hint` hoặc `meaning`, không cần sửa dữ liệu trong database. Đáp án, pinyin và lời giải chỉ hiện sau khi bấm **Kiểm tra**.

Phần làm bài Tiếng Trung không hiện nút **Gợi ý**, **Gợi ý cách làm**, lời giải trước khi kiểm tra hoặc gợi ý từ bắt đầu câu. Áp dụng cho quiz, kiểm tra, luyện nghe, vận dụng và buổi học cá nhân; công cụ phản ánh câu hỏi không tự chèn lại các gợi ý chung. Câu xếp từ/ghép cặp vẫn có danh sách từ cần làm, câu điền từ giữ ngữ cảnh để xác định đáp án, câu kiểm tra pinyin giữ nội dung cần thiết của đề, và phần học từ vựng vẫn có đầy đủ nghĩa/phiên âm. Điểm vận dụng tính theo số câu trả lời đúng trong lượt.

Vào **Quản lý Tiếng Trung → Bài học → chọn bài → Quản lý hoạt động vận dụng**. Soạn chủ đề, thêm hoạt động theo bốn dạng **Xếp câu, Sửa lỗi, Điền từ, Hội thoại**; nhập đáp án và lời giải sau kiểm tra. Mỗi bài tối đa 100 hoạt động. Dạng xếp câu nhập từng từ theo thứ tự câu đúng, mỗi dòng một từ, gồm cả dấu câu; đáp án tự ghép và các từ được trộn khi học. Dạng điền từ nhận một từ/cụm từ đáp án, so sánh sau chuẩn hóa Unicode, khoảng trắng ngoài và chữ thường, giữ dấu thanh.

Admin có thể đổi thứ tự, bỏ hoạt động, **Xem thử** mà chưa lưu, **Lưu bản nháp** hoặc **Cho học sinh xem**. Lưu nháp một bộ đang đăng sẽ ẩn bộ đó, có hộp xác nhận. Xuất bản bắt buộc có chủ đề, hoạt động, đáp án và lời giải hợp lệ. Bản lưu có revision để chặn ghi đè từ cửa sổ khác. Những bài Q1 có tên phù hợp có nút **Nạp mẫu Q1 cho bài này**, gồm 40 hoạt động mẫu để chỉnh sửa trước khi lưu. Mẫu không phải nguồn tự động cho giao diện học sinh.

Nội dung lưu trong bảng `chinese_activities`, thuộc bài học và dùng chung cho mọi tài liệu trong bài; dùng được ở mọi cấp HSK. Học sinh chỉ thấy bộ đã xuất bản khi cả bài học, tài liệu đều published và khóa học được mở. API chi tiết tài liệu trả `activities`; catalog trả `activity_count`. Bản nháp không được trả cho học sinh. Xóa bài học xóa luôn bộ hoạt động. Tài liệu không cần chứa câu hỏi quiz để có phần vận dụng.

API admin: GET/PUT `lessons/:id/activities`, POST `lessons/:id/activities/preview`. Mã giao diện dùng chung ở `frontend/assets/js/chinese-applied-practice.js`, biên tập ở `frontend/pages/admin/chinese/activities-editor.js`. Lượt tự luyện vẫn chỉ tính kết quả trong phiên, không lưu lịch sử hay thay đổi Kim Cương.

Cài đặt MySQL: chạy `npm run db:migrate` để thêm migration 023. Có thể chạy `node backend/scripts/migrate-chinese-activities.mjs` một lần để chuyển các mẫu Q1 cũ sang dữ liệu cho các bài có tên phù hợp; không ghi đè bộ đã có. PostgreSQL có SQL tương ứng tại `backend/sql/postgres/023_chinese_activities.sql`, cần áp dụng vào schema ứng dụng trước khi triển khai mã mới.

Kiểm tra: `npm --prefix backend test -- chinese-activities.test.js` kiểm tra quyền admin, draft/publish, preview không lưu, khóa học, bài ẩn, tranh chấp và xóa bài. `npx playwright test --config playwright.applied.config.js` kiểm tra frontend thật với API giả lập: 240 hoạt động mẫu, không lộ gợi ý/lời giải trước khi kiểm tra, câu sai, từ trùng, admin soạn cả bốn dạng → xem thử → lưu → tải lại → xuất bản → học sinh điền từ → ẩn lại, ở 390px. Không thay đổi dữ liệu thật của người dùng.

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

## Đồng bộ nội dung XAMPP và website Vercel

Các tính năng Từ mới ba cột, luyện nghe, quiz theo phần, sổ câu sai và phản ánh người dùng được mô tả trong [Góc ôn tập và phản ánh](study-hub.md).

Deploy code không tự chuyển bài học từ MySQL XAMPP sang PostgreSQL Supabase. Tạo bảng cũng chưa tạo nội dung: cần kiểm tra cả bài published, bộ published và dữ liệu luyện vận dụng.

Các nguồn Word bài 3–6 nằm trong `tai-lieu/tieng-trung-bai-3-6/`. Script `backend/scripts/import-chinese-q1-lessons-3-6.mjs` nhập vào HSK1, kiểm tra trùng theo bài và SHA của tài liệu; không thay bài 1–2. Script `backend/scripts/migrate-chinese-activities.mjs` bổ sung phần vận dụng cho bài chưa có, giữ nguyên phần đã được admin chỉnh sửa. Mỗi dạng trong mẫu hiện tại có 10 câu.

Chỉ khi đã xác nhận `backend/.env.vercel` trỏ đúng database đích, chạy tại thư mục gốc dự án:

```powershell
node --input-type=module -e "process.loadEnvFile('backend/.env.vercel');await import('./backend/scripts/import-chinese-q1-lessons-3-6.mjs')"
node --input-type=module -e "process.loadEnvFile('backend/.env.vercel');await import('./backend/scripts/migrate-chinese-activities.mjs')"
```

Sau đó kiểm tra HSK1 trên website có đủ 6 bài và mỗi bài có Luyện vận dụng. Cập nhật nội dung database không cần redeploy nếu code mới đã có trên website. Không chép đè toàn bộ database XAMPP lên Supabase vì sẽ ảnh hưởng tài khoản và lịch sử online.

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
