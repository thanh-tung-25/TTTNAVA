# Chấm AI bài luyện nói Tiếng Trung

Luồng hiện tại: ghi âm → AI chấm → kết quả về admin. Học sinh chỉ dùng micro; tải bản ghi là tùy chọn. Mặc định AI tắt cho tới khi có API, không tự tạo điểm giả.

Web tự thu âm và phát lại được. Bản hiện tại dùng **một tài khoản GroqCloud, một khóa API**: Whisper Large V3 nhận diện lời nói tiếng Trung, GPT-OSS 120B chấm ý trả lời và từ/ngữ pháp trên văn bản. Không cần Azure, OpenAI Platform hoặc ứng dụng học sinh cài thêm. Bản này không chấm phát âm/thanh điệu hay độ trôi chảy.

Groq có Free Plan, không cần nâng lên Developer để thử. [Hạn mức công bố](https://console.groq.com/docs/rate-limits) tại ngày 12/11/2026: Whisper 20 yêu cầu/phút, 2.000/ngày, 7.200 giây âm thanh/giờ, 28.800 giây/ngày; GPT-OSS 120B 30 yêu cầu/phút, 1.000/ngày, 8.000 token/phút và 200.000 token/ngày. Hạn mức thật phải xem trong tài khoản; có thể thay đổi, không phải dùng không giới hạn. Với 5–10 em/ngày, 10–20 câu/em là quy mô hợp lý để thử trước, không phải bảo đảm đủ mọi lượt hoặc mọi giờ cao điểm.

## Dữ liệu và quyền riêng tư

Bản ghi chỉ nằm trong bộ nhớ trình duyệt, học sinh tự chọn tải. Rời trang mà chưa tải thì bản ghi mất. Trình duyệt chỉ ghi giọng từ micro và không xin quyền camera; phần ghép hình/xuất video đã được bỏ. Khi chấm, hệ thống lấy các khoảng trả lời sau khi đề phát xong, loại khoảng phát đề khỏi âm thanh gửi đi. Tai nghe giúp tránh tiếng loa lọt vào mic.

Chỉ khi học sinh bấm **AI chấm bài & gửi cô**, âm thanh mới được gửi, theo từng đoạn WAV PCM mono 16 kHz tối đa 25 giây / 800.044 byte. Backend dùng `multer.memoryStorage()`, gọi trực tiếp Groq `/openai/v1/audio/transcriptions`, không ghi âm thanh vào ổ đĩa, database, Storage, hàng đợi hoặc log. Buffer đầu vào và buffer multipart đều được ghi đè bằng 0 trong `finally` kể cả khi lỗi. Không dùng API Files, Batch hoặc fine-tuning. Âm thanh im lặng số hoàn toàn không được gửi đi.

Sau khi chấm xong, backend không giữ âm thanh và trình duyệt xóa các mảng PCM tạm. Bản ghi gốc vẫn ở trong trang để học sinh nghe lại hoặc tự tải nếu muốn. Nếu lỗi, giữ bản ghi tạm trên trình duyệt để thử lại. Rời trang giải phóng bản ghi; không tự tải và không bắt buộc tải trước khi rời. Chỉ cảnh báo rời trang khi đang ghi âm hoặc gửi chấm.

Theo [chính sách dữ liệu Groq](https://console.groq.com/docs/your-data), mọi khách hàng có thể bật **Zero Data Retention (ZDR)** trong **Data Controls** để không lưu nội dung đầu vào/đầu ra cho chẩn đoán hệ thống và kiểm soát lạm dụng; metadata sử dụng dịch vụ vẫn được giữ, không chứa nội dung đó. Nếu chưa bật, nội dung có thể được ghi lại tối đa 30 ngày trong các trường hợp nêu trong chính sách. **Phải bật ZDR trước khi gửi âm thanh học sinh thật.** App giữ AI ở trạng thái chưa cấu hình cho tới khi chủ web xác nhận điều này bằng biến môi trường; biến đó là xác nhận thủ công, không tự bật hoặc kiểm chứng cài đặt tài khoản Groq.

Database chỉ lưu mã lượt, tài khoản/bài/cấp/thời gian, snapshot câu hỏi/tiêu chí, transcript, điểm, nhận xét và hash chống gửi lại âm thanh. Hai bảng mới không có media/BLOB/URL video hoặc âm thanh. Dịch vụ AI chấm nội dung chỉ nhận văn bản câu hỏi, transcript và tiêu chí; không nhận âm thanh/video hay các trường tài khoản. Tên riêng có thể có trong chính câu nói; chính sách xử lý văn bản của API này cần phù hợp với lựa chọn vận hành của chủ app.

## Cấu hình khi có API

1. Đăng ký tại [GroqCloud](https://console.groq.com/), giữ **Free Plan**, tạo một khóa tại **API Keys**. Không cần nạp tiền hoặc thêm thẻ để dùng hạn mức Free. Chỉ nhập khóa vào backend, không đưa vào Word, frontend, chat hoặc Git.
2. Vào **Settings → Data Controls**, bật **Zero Data Retention** cho toàn tổ chức. Kiểm tra đã bật trước khi xác nhận trong cấu hình backend. Hai API dùng cùng khóa Groq; không dùng khóa đã tạo trên OpenAI Platform. Endpoint được cố định về `https://api.groq.com` trong code, không cần nhập URL.
3. Điền các biến trong `backend/.env`:

```dotenv
CHINESE_SPEAKING_AI_ENABLED=false
GROQ_API_KEY=
GROQ_ZERO_DATA_RETENTION_CONFIRMED=false
CHINESE_SPEAKING_DAILY_LIMIT=5
```

4. Sau khi đã bật ZDR trên Groq, đổi `GROQ_ZERO_DATA_RETENTION_CONFIRMED=true`, điền khóa riêng, đặt `CHINESE_SPEAKING_AI_ENABLED=true` rồi khởi động lại backend. Mỗi học sinh mặc định 5 lượt mới/ngày UTC, có thể đặt 1–50. Lượt đã tạo nhưng chưa chấm xong vẫn tính vào giới hạn. Thử lại cùng bản ghi dùng cùng mã, không tạo thêm lượt và không gọi lại nhận diện cho đoạn đã hoàn tất. Khi chạm quota Groq, app báo chờ ít nhất một phút; nếu hết quota ngày thì chờ ngày tiếp theo. Chấm văn bản theo nhóm nhỏ tối đa 3 câu, lưu tiến độ chữ vào snapshot riêng; thử lại tiếp từ nhóm chưa hoàn tất, không gửi lại nhóm đã chấm. Tiêu chí hoặc câu trả lời quá dài cho mức 8K token/phút sẽ báo cô cần rút gọn, không tự cắt tiêu chí để tạo điểm.
5. Vào **Tiếng Trung → bài học → Luyện nói**, bật **AI chấm bài và gửi kết quả cho cô**, thêm **Đáp án tham khảo** / **Tiêu chí chấm** nếu cần, rồi **Cho học sinh xem**. Tài liệu cũ mặc định chưa bật AI. Đáp án và tiêu chí được ẩn với học sinh trước khi chấm.
6. Học sinh ghi âm → nghe từng câu → trả lời → dừng → bấm chấm AI. Tải bản ghi là lựa chọn riêng. Nếu chưa có API hoặc cô chưa bật AI, nút chấm báo trạng thái thật.
7. Admin tổng hoặc admin Tiếng Trung vào **Tiếng Trung → Kết quả luyện nói** để xem tối đa 100 lượt gần nhất, lọc học sinh/cấp/trạng thái và mở kết quả từng câu. Trang này không có bản ghi âm/video. Mã lượt khớp mã trên màn hình và tên tệp ghi âm học sinh tự tải, dùng để đối chiếu thủ công, không phải chữ ký chống chỉnh sửa tệp.

Word vẫn nhận câu hỏi đơn như trước, có thể bổ sung:

```text
Câu 1. 你叫什么名字？
Nghĩa: Bạn tên là gì?
Đáp án tham khảo: 我叫安。
Tiêu chí chấm: Chấp nhận tên thật của học sinh.
```

Hoặc hàng bảng `Câu hỏi | Nghĩa tiếng Việt | Đáp án tham khảo | Tiêu chí chấm`; các cột sau câu hỏi không bắt buộc.

## Câu hỏi luyện nói theo 6 bài HSK 1

Đã biên soạn 60 câu hỏi nghe và tự trả lời, 10 câu cho mỗi bài, dựa trên từ vựng và hội thoại đang có: chào hỏi; tên/họ/quốc tịch; làm quen/danh thiếp; đi lại; ăn uống; công việc/học tập. Nguồn được duyệt nằm trong `backend/src/data/chinese-speaking-lessons-1-6.js`; bản giáo viên xem đầy đủ và 6 file Word nằm trong `tai-lieu/tieng-trung-luyen-noi/`. Mỗi câu có nghĩa, đáp án tham khảo và tiêu chí riêng; học sinh không nhận ba trường này trước khi chấm. Những câu hỏi có nhiều đáp án chấp nhận cả ý khẳng định/phủ định, tên và địa điểm khác mẫu; học sinh chưa đi làm vẫn có thể trả lời đúng câu hỏi công việc.

`node backend/scripts/replace-chinese-speaking-lessons-1-6.mjs` chỉ rà soát. Thêm `--export-word` để tạo và đọc lại kiểm tra 6 file Word. Chỉ khi cần cập nhật local, thêm `--apply`: script kiểm tra đúng sáu tài liệu nguồn HSK1 đã xuất bản, sao lưu phần luyện nói cũ vào `backend/backups/`, rồi cập nhật cả sáu trong một transaction. Nội dung bị sửa từ cửa sổ khác sau bước rà soát làm hủy toàn bộ lượt cập nhật. Script từ chối database online. Chạy lại không thêm câu trùng hoặc ghi lại dữ liệu đã đúng.

Chỉ phần `dialogue` có `practice=speaking` được thay; giữ ID câu cũ nếu có và không xóa lịch sử. Quiz, từ vựng, bài đọc, hội thoại vận dụng, tài liệu Word gốc và các bản chụp kết quả giữ nguyên. Giữ lựa chọn câu và thời lượng đã có; bài chưa cấu hình mặc định giao 3 câu/90 giây, theo thứ tự, bật chấm AI. Trong lần áp dụng local đầu tiên, bài 1 giữ 4 câu đang giao, các bài 2–6 mặc định 3 câu; admin có thể chọn lại trong ngân hàng 10 câu. Cần tải lại cửa sổ admin đang mở trước khi chỉnh tiếp để tránh lưu lại bản nội dung cũ.

## Chấm điểm

Whisper nhận câu trả lời tự do với `language=zh`, không ép nhận diện theo câu hỏi hay một đáp án mẫu, không dịch sang tiếng Anh. Tham khảo [Groq speech-to-text](https://console.groq.com/docs/speech-to-text).

Điểm câu mới: **đúng ý 60%, từ/ngữ pháp 40%**, từ API văn bản. Không suy ra điểm phát âm, thanh điệu, tốc độ nói hoặc độ trôi chảy từ transcript. UI chỉ hiện hai tiêu chí thực sự được chấm. Kết quả cũ đã có bốn tiêu chí vẫn giữ nguyên điểm và cách hiển thị theo trọng số đã lưu; không tính lại lịch sử.

Nhận xét tối đa 3 lỗi cụ thể, có câu sửa tiếng Trung và pinyin. Chấp nhận các câu trả lời hợp lý, gồm tên riêng khác ví dụ. Thiếu câu trả lời hoặc không nhận diện được được đánh dấu **Cần cô xem lại**, không bịa điểm. Điểm tổng chỉ có khi mọi câu được giao đủ dữ liệu chấm. Nhận diện có thể sai và mô hình có thể tự sửa lỗi phát âm thành chữ đúng, vì vậy đây không phải chứng nhận phát âm. Giáo viên đánh giá cuối cùng. Cần thử giọng trẻ em, mic điện thoại, môi trường ồn và nhiều đáp án đúng với giáo viên trước khi dùng điểm chính thức.

## Database và vận hành

MySQL cục bộ: `npm run db:migrate` thêm migration 034 và hai bảng `chinese_speaking_submissions`, `chinese_speaking_clips`. Không sửa bài học hoặc lượt học cũ. Xóa tài liệu giữ kết quả theo snapshot; xóa tài khoản học sinh xóa cả kết quả/đoạn kết quả qua khóa ngoại.

PostgreSQL có SQL tại `backend/sql/postgres/034_chinese_speaking_assessment.sql`, có RLS và thu hồi quyền trực tiếp của PUBLIC/anon/authenticated. Khi có yêu cầu triển khai riêng, chạy `node backend/scripts/prepare-chinese-speaking-assessment-postgres.mjs --apply` bằng kết nối backend trong schema ứng dụng. Không có `--apply` chỉ kiểm tra hai bảng. Cần cột `chinese_sets.speaking_settings` của migration 033. Không tự triển khai hoặc thay đổi máy chủ.

Khi được yêu cầu đưa bản hiện tại lên Vercel, `prepare-chinese-speaking-vercel-env.mjs --write` chỉ bổ sung bốn biến Groq vào file riêng tư `.env.vercel`, giữ nguyên các biến khác; vẫn cần cập nhật chúng trong môi trường Production của Vercel và tạo deployment mới. `check-speaking-assessment-postgres.mjs` kiểm tra luồng dữ liệu PostgreSQL bằng phản hồi AI giả rồi rollback toàn bộ tài khoản/bài/điểm mẫu. `deploy-chinese-speaking-postgres.mjs` mặc định chỉ đọc, đối chiếu đúng project Supabase đã cấu hình và sáu tài liệu nguồn; `--apply` sao lưu, cập nhật 60 câu cùng lựa chọn/thời lượng local và bổ sung các từ còn thiếu của bài 1–2 trong một transaction, đối chiếu hash để giữ lịch sử và các mục cũ. Cần triển khai backend mới đã ẩn trường tham khảo trước khi cập nhật câu hỏi production.

API tính từ `/api/v1/chinese/`: GET `speaking/availability`, POST `sets/:id/speaking-submissions`, POST `speaking-submissions/:id/clips/:question/:chunk` (multipart `audio`), POST `speaking-submissions/:id/finish`, GET `speaking-submissions/:id`. Admin dùng GET `speaking-results` và GET `speaking-submissions/:id`.

Backend kiểm tra chủ bài nộp, đăng ký HSK, câu hỏi nguồn thật, hạn mức, thời lượng và định dạng WAV; điểm không nhận từ client. Giao dịch/lease/hash chống gửi trùng, thay âm thanh cũ và chấm trùng đồng thời. API không trả khóa hay chi tiết lỗi riêng của nhà cung cấp. Lượt xử lý gián đoạn quá 2 phút có thể thử lại; không có công việc nền giữ âm thanh để chấm sau.

## Kiểm tra

Kiểm tra kết nối thật mà không in khóa hoặc ghi dữ liệu học sinh:

```sh
node --use-system-ca backend/scripts/check-chinese-speaking-groq.mjs
node --use-system-ca backend/scripts/check-chinese-speaking-groq.mjs --test-text
node --use-system-ca backend/scripts/check-chinese-speaking-groq.mjs --test-audio
```

Lệnh đầu chỉ kiểm tra cấu hình và quyền truy cập model. `--test-text` gọi Groq để chấm hai câu hư cấu; `--test-audio` dùng giọng đọc câu hỏi hiện có và Playwright đã cài để tạo/giải mã câu máy đọc “我叫小明。” trong bộ nhớ rồi gửi nhận diện. Không mở micro, không tạo tệp âm thanh, không ghi kết quả mẫu vào database. Các tùy chọn thử thật dùng hạn mức API. Kết quả chỉ in trạng thái, điểm/nhận xét mẫu hoặc câu nhận diện; không in khóa, header hay lỗi thô của nhà cung cấp.

- `npm --prefix backend test -- chinese-speaking-assessment.test.js --pool=threads`: cấu hình tắt, quyền, HSK thu hồi, WAV/không nhận video, quota, idempotency, xóa buffer, điểm server, lỗi/thử lại, âm thanh chưa rõ và giữ/xóa kết quả theo tài liệu/tài khoản.
- `npm run test:speaking`: MediaRecorder thật với micro giả lập, không xin quyền camera, đoạn WAV thật, chỉ gửi khi bấm chấm, học sinh/admin xem cùng kết quả, tải bản ghi tùy chọn, lỗi giữ bản ghi, chưa cấu hình và điện thoại.
- `npx playwright test --config playwright.applied.config.js chinese-admin-speaking.spec.js`: nhập Word → bật AI/soạn tiêu chí → xem trước → xuất bản, ẩn dữ liệu tham khảo với học sinh.

Các kiểm thử tự động giả lập phản hồi nhà cung cấp. Trong phiên cấu hình, chủ web đã bật Global ZDR trên Groq và tự lưu khóa vào `backend/.env`; kiểm tra trực tiếp đã xác nhận quyền truy cập hai model, chấm đúng hai câu mẫu và nhận diện đúng câu máy đọc. Chưa đo độ chính xác trên giọng học sinh/micro thật hoặc dùng điểm làm đánh giá chính thức. Tạo tài khoản, thêm phương thức thanh toán, cấu hình production, commit/push và deploy chỉ thực hiện khi có yêu cầu của chủ web. Cấu hình local và production độc lập; đẩy code không tự chuyển câu hỏi hoặc khóa API lên website online.
