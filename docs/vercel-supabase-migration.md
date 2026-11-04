# Chuyển TTNAVA từ Render/MySQL sang Vercel/Supabase

## Trạng thái ngày 04/11/2026

Nguồn dữ liệu đã chọn: **database đang cấu hình trên máy này**, gồm các bộ Toán, Tiếng Việt và Tiếng Anh vừa tạo/đăng. Không lấy dữ liệu Render làm nguồn và không tự gộp hai database.

Đã tạo project Supabase `njaasgcfgjismpmzoncb`, kiểm tra kết nối TLS với chứng chỉ và xuất bản sao nhất quán của MySQL/MariaDB trong XAMPP. Đã nhập và đối chiếu thành công **41 bảng, 275.927 bản ghi**, gồm nội dung nhị phân của tệp Word/ảnh, vào schema riêng `ttnava_stage`. Đã kiểm tra 66 khóa ngoại và bật RLS cho cả 41 bảng. Báo cáo nằm trong `supabase-import-report.json` cạnh snapshot. Chưa đổi kết nối ứng dụng và chưa triển khai Vercel. Website hiện vẫn dùng XAMPP; cần chuyển mã backend và kiểm thử trước khi đổi sang PostgreSQL.

| Nội dung nguồn | Số lượng |
|---|---:|
| Bảng dữ liệu | 41 |
| Tổng bản ghi trong snapshot | 275.927 |
| Câu hỏi Tiểu học | 40.230 |
| Chương trình/bài học | 912 |
| Word gốc Tiểu học | 821 |
| Word gốc Tiếng Trung | 2 |
| Tài khoản | 7 |

Snapshot có cả đáp án, tiến độ, lịch sử, kim cương, quyền học, đơn thanh toán, ảnh QR và nhật ký. Dữ liệu riêng tư nằm trong `backend/backups/` đã được Git bỏ qua; không đưa snapshot vào Git hoặc thư mục public.

Bản sao hoàn tất mới nhất khi viết tài liệu:

`backend/backups/platform-migration/2026-11-03T16-50-19-657Z/manifest.json`

Snapshot là **JSONL có metadata MySQL**, chưa phải dump PostgreSQL để nạp thẳng vào Supabase. Thư mục không có `manifest.json` hoàn tất là bản xuất chưa hoàn thành, không dùng để nhập.

## Kiến trúc đích

| Thành phần | Nơi chạy/lưu | Yêu cầu chuyển đổi |
|---|---|---|
| CSS, JavaScript, ảnh mascot, font | Vercel CDN | Chỉ đưa tài nguyên công khai vào `public/assets` |
| HTML của admin/học sinh | Vercel + kiểm tra quyền | Giữ bảo vệ trang, không công khai nguyên thư mục trang admin |
| API Express | Vercel Node.js Functions | Tách tạo app/server khỏi `listen()`; cấu hình đường dẫn và thời gian xử lý |
| Dữ liệu nghiệp vụ | Supabase PostgreSQL | Chuyển schema, câu SQL, transaction và mã migration/seed |
| Word, ảnh QR, ảnh bài tập | Supabase Storage, bucket private | Lưu object key, dung lượng và SHA-256 trong database |
| Tài khoản hiện có | PostgreSQL + backend đăng nhập hiện tại | Giữ ID, username và hash bcrypt; không bắt buộc dùng Supabase Auth |
| Thách đấu | REST + cơ chế cập nhật nhiều instance | Phải kiểm tra sảnh, lời mời, vào trận, kết quả và kết nối lại |

Vercel hiện hỗ trợ WebSocket/Socket.IO, nhưng client cần dùng WebSocket transport và dữ liệu/điều phối không được phụ thuộc một instance. `backend/src/realtime/emit.js` đang giữ `ioInstance` trong bộ nhớ: chỉ chuyển `server.js` sang Vercel có thể làm lời mời/kết quả không tới người nhận ở instance khác. Cần chọn cơ chế broadcast dùng chung hoặc hoàn thiện polling đang có cho cả sảnh và trận; không bỏ chức năng thách đấu.

Nguồn: [WebSocket trên Vercel](https://vercel.com/docs/functions/websockets).

## Các thay đổi mã còn phải thực hiện

### Phần backend đã kiểm tra bước đầu (04/11/2026)

- Có driver PostgreSQL riêng, TLS xác minh chứng chỉ, pool mặc định 1 kết nối, giao dịch giữ cùng connection và hoàn tác khi lỗi. Driver chỉ bật khi đặt rõ `DB_DRIVER=postgres`; `.env` đang chạy vẫn dùng MySQL.
- Đã chuyển truy vấn đăng nhập/tài khoản, danh sách khóa, quyền học, tạo đơn, duyệt đơn, cấp/thu hồi quyền và lưu QR sang SQL tương thích. Đã chỉnh các truy vấn luyện tập/thi thử liên quan thời gian, lưu đáp án và chống cộng thưởng lặp; phần này chưa đồng nghĩa toàn bộ chức năng đã chạy trên PostgreSQL.
- `node --test backend/tests/postgres-connection.node-check.mjs`: kiểm tra tham số, TLS và transaction, không cần database.
- `node --use-system-ca backend/scripts/check-postgres-core.mjs`: kiểm tra Supabase ở chế độ chỉ đọc, phiên đăng nhập, quyền học, danh mục, thống kê và một số API/ranh giới quyền.
- `node --use-system-ca backend/scripts/check-postgres-order.mjs`: chỉ dùng schema `ttnava_stage`, thử tạo/duyệt đơn và chống thưởng lặp trong giao dịch rồi hoàn tác; không giữ lại đơn, quyền hay kim cương thử nghiệm. Sequence ID có thể tăng dù giao dịch hoàn tác.
- Kiểm thử MySQL cho đăng nhập, thanh toán, luyện tập và bài thi vẫn đạt; `exam-scopes.test.js` cần chạy `--pool=threads` vì tiến trình worker dạng fork bị đóng bất thường trên Windows/Node hiện tại.

### Luồng học đã kiểm tra trên PostgreSQL

Đã chuyển các truy vấn upsert, JSON, xóa liên kết và chống ghi trùng của Tiếng Trung, bài tập tương tác và thách đấu. Đã giữ kiểu số an toàn cho bộ đếm và điểm; bổ sung transaction lồng bằng savepoint để có thể thử nhiều dịch vụ trong một giao dịch hoàn tác.

`node --use-system-ca backend/scripts/check-postgres-learning.mjs` đã chạy thành công luồng thực trên schema staging: tạo bộ Tiếng Trung, ôn từ không ghi trùng, quiz 20 câu, thưởng một lần, bài kiểm tra có thời gian, xóa nguồn vẫn giữ kết quả; tạo/sửa/làm/nộp bài tập tương tác; luyện tập 10 câu; lưu lại đáp án thi thử; tạo và kết thúc thách đấu với robot. Tất cả dữ liệu thử được hoàn tác. Đây là kiểm tra dịch vụ, chưa phải kiểm thử giao diện trình duyệt trên Vercel.

`prepare-postgres-runtime.mjs <snapshot-directory> --apply` đã bổ sung trigger `updated_at` cho 4 bảng có hành vi này trong MySQL và hai unique index không phân biệt hoa/thường cho username/email. Không sửa dữ liệu hiện có. Các API đọc đã đạt 19 kiểm tra trên Supabase. Kiểm thử MySQL riêng cho các phần vừa chuyển đạt 32 trường hợp; kiểm tra driver riêng đạt 5 trường hợp.

### Mã triển khai đã chuẩn bị (04/11/2026)

- `vercel.json` và `api/index.js`: chạy Express ở root repository, region Tokyo (`hnd1`) gần Supabase hiện tại (`ap-northeast-1`), Node 24; không mở port bằng `server.listen()` trên Vercel.
- `npm run build:vercel`: chỉ chép tài nguyên công khai vào `public/assets`. HTML admin/học sinh được giữ sau middleware đăng nhập và quyền khóa học, không đưa vào thư mục public.
- Tải Word 20 MB trực tiếp lên bucket private bằng signed upload URL. Backend kiểm tra tài khoản admin, thời hạn, định dạng, kích thước và SHA-256 trước khi phân tích/lưu. Key Storage không gửi xuống trình duyệt.
- Word/QR/ảnh được lưu bằng object key bất biến và kiểm tra byte/hash sau tải. Tải xuống qua URL ký 60 giây sau khi kiểm tra quyền. Bản byte trong PostgreSQL và XAMPP vẫn được giữ.
- Thách đấu trên Vercel dùng polling cho cả sảnh lẫn trận, tự tải lời mời mới; không phụ thuộc socket của một instance. Local vẫn có Socket.IO.
- Giới hạn đăng nhập/yêu cầu trên Vercel dùng bộ đếm PostgreSQL chung. Schema và UTC được đặt trong mỗi transaction để tương thích pooler 6543.
- Đã chạy **159/159 kiểm thử**, **5 kiểm tra driver**, kiểm tra luồng học/giao dịch hoàn tác qua pooler 6543 và trình duyệt Chromium cho trang khóa học admin/học sinh, chặn khách chưa đăng nhập.

**Storage đã hoàn tất:** bucket `ttnava-private` ở chế độ private, đã chép đủ **824 tệp / 5.647.230 byte** và đọc lại đối chiếu SHA-256. Báo cáo ở `backend/backups/storage-migration/report.json`; bản gốc vẫn còn trong XAMPP và PostgreSQL. Đã thử thành công bằng Chromium tải trực tiếp Word **17.829.562 byte**, API chỉ nhận **575 byte** thông tin tham chiếu và đọc được 4 câu hỏi. Truy cập public bị chặn, signed download trả đúng byte; tệp thử đã được dọn.

File `backend/.env.vercel` đã được tạo với kết quả `ready:true`. Cấu hình `vercel.json` đã được kiểm tra theo schema chính thức. Chưa Deploy lên Vercel; `.env` chạy local vẫn dùng XAMPP.

Đã xuất lại XAMPP ngày 04/11/2026 và đối chiếu với snapshot đã nhập: cả 41 bảng / 275.927 bản ghi vẫn khớp SHA-256. Snapshot kiểm tra mới nằm ở `backend/backups/platform-migration/2026-11-04T05-28-43-253Z/`.

Đã kiểm kê trên Supabase: **821 Word Tiểu học, 2 Word Tiếng Trung, 1 ảnh QR**, tổng 5.647.230 byte; chưa có ảnh worksheet. Có thêm hai bảng kỹ thuật `file_assets` và `request_limits`, tách khỏi 41 bảng nguồn đã nhập.

### Bước người dùng cần làm tiếp: Vercel

1. Ở trang New Project, sửa **Root Directory** từ `backend` thành **`.` / thư mục gốc**; chọn **Application Preset: Other**.
2. Mở **Environment Variables** → **Import .env**, chọn file riêng tư **`backend/.env.vercel`** đã tạo. Không đưa file này lên GitHub hoặc gửi vào chat.
3. Sau khi mã mới đã có trên GitHub, bấm **Deploy**. Gửi đường dẫn website sau khi hoàn tất để kiểm tra hoạt động trên domain thật.

Nguồn: [API keys của Supabase](https://supabase.com/docs/guides/getting-started/api-keys). Key này chỉ dùng phía backend; không đưa vào JavaScript của trình duyệt.

1. **PostgreSQL:** tạo migrations riêng; chuyển `mysql2`, dấu `?`, `ON DUPLICATE KEY`, `INSERT IGNORE`, `UTC_TIMESTAMP`, phép cộng khoảng thời gian, JSON, boolean/numeric, mã lỗi ràng buộc và kết quả `affectedRows/insertId`. Không thay một biến URL rồi coi là xong.
2. **Giữ quan hệ dữ liệu:** giữ nguyên ID, khóa ngoại, quy tắc cascade/restrict, unique indexes, số kim cương, quyền học và khóa giao dịch chống trả thưởng hai lần. Đối chiếu số dòng và các tổng nghiệp vụ sau nhập.
3. **Pool kết nối:** dùng kết nối pooled phù hợp serverless; giới hạn connection pool của mỗi instance, cấu hình TLS, không dùng prepared statement có tên với transaction pooler.
4. **Word và ảnh:** thay bốn cột nhị phân ở `chinese_documents.original`, `word_import_documents.original`, `course_payment_qr.image`, `worksheet_images.image` bằng tham chiếu Storage sau khi đã chuyển và đối chiếu byte/hash. Không xóa bản nguồn trước khi xác minh.
5. **Upload/download:** Word hiện cho phép 20 MB, trong khi Vercel Functions có giới hạn payload 4,5 MB. Browser phải tải trực tiếp lên Storage bằng signed upload URL; backend kiểm tra quyền, tệp và hash rồi mới lưu câu hỏi. Download qua signed URL ngắn hạn sau kiểm tra quyền. Không bật public bucket để né phân quyền.
6. **Trang và tài nguyên:** tài liệu Express của Vercel lưu ý `express.static()` không phục vụ static assets. Cần build tài nguyên công khai ra `public/**` và giữ các trang cần đăng nhập sau kiểm tra quyền.
7. **Thách đấu:** xử lý nhiều instance, ngắt/kết nối lại, lời mời mới ở sảnh và thời gian trận dựa trên database; giữ chức năng hiện có.
8. **Kiểm thử:** bộ kiểm thử MySQL, các luồng PostgreSQL, trình duyệt và Storage thực tế đã đạt. Còn smoke test trên domain Vercel sau Deploy.

Nguồn: [giới hạn Vercel Functions](https://vercel.com/docs/functions/limitations), [Express trên Vercel](https://vercel.com/docs/frameworks/backend/express), [kết nối PostgreSQL Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [hướng dẫn chuyển MySQL](https://supabase.com/kb/guides/migrate-from-mysql).

## Tạo project — người dùng thực hiện trong tài khoản của mình

### Supabase

1. Đăng nhập [Supabase Dashboard](https://supabase.com/dashboard), tạo project mới, ví dụ `ttnava`.
2. Chọn khu vực gần học sinh và backend, ưu tiên Singapore nếu khả dụng. Lưu mật khẩu database trong trình quản lý mật khẩu, không gửi vào chat.
3. Lấy **Project URL** và đường dẫn project để xác định đúng project. Connection string PostgreSQL pooled và khóa phía server sẽ đặt trong môi trường bảo mật ở bước tích hợp, không đưa vào Git/JavaScript trình duyệt.
4. Chưa nhập SQL MySQL hay upload snapshot vào bucket public. Schema và công cụ nhập PostgreSQL phải được chuẩn bị/kiểm tra trước.

### Vercel

1. Repository đã chọn: `thanh-tung-25/TTTNAVA`. Sau khi mã đã được đẩy lên GitHub, sửa **Root Directory** từ `backend` thành **`.` (root repository)**. Cấu hình ở `vercel.json` sẽ chọn preset **Other**, install/build/output theo mã nguồn.
2. Chạy `node backend/scripts/prepare-vercel-env.mjs --write` sau khi đã lưu key. Lệnh chỉ báo tên biến thiếu, không in secrets; kết quả phải có `ready:true`.
3. Trong Environment Variables, nhập file **`backend/.env.vercel`** vừa tạo. Đây là file riêng tư, đã được Git bỏ qua; không dùng file `.env.vercel.example` có placeholder. Giữ JWT secret hiện có để bảo toàn cơ chế tài khoản.
4. Không cần thêm `PORT`, biến MySQL/XAMPP hoặc lệnh migrate MySQL trên Vercel. Domain Vercel được dùng tự động; nếu có custom domain thì đặt thêm `APP_ORIGIN=https://domain-cua-ban`.
5. Chỉ Deploy sau khi chuyển đủ tệp sang Storage và kiểm tra upload/download thực tế. Sau Deploy kiểm tra `/api/v1/health`, đăng nhập, quyền học, tải Word và lời mời thách đấu trên hai trình duyệt.

Chỉ cần cung cấp lại **link project Supabase, tên tài khoản/team Vercel hoặc link project, và repo Git**. Không gửi mật khẩu/token bí mật trong chat.

## Gói dịch vụ và mục tiêu ổn định

Đổi nhà cung cấp không tự chứng minh nguyên nhân sự cố trên Render. Cần xem log và kiểm tra tải/giới hạn sau chuyển.

Supabase Free có thể tự tạm dừng sau thời gian ít hoạt động; gói trả phí không bị tạm dừng theo cơ chế này. Vercel Hobby dành cho cá nhân, phi thương mại; website bán khóa học cần chọn gói phù hợp điều kiện sử dụng. Chưa mua/nâng cấp dịch vụ trong phiên làm việc này.

Nguồn: [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [Vercel Hobby](https://vercel.com/docs/plans/hobby).

## Các bước chuyển dữ liệu và đổi website

1. Giữ XAMPP/MySQL hiện tại hoạt động; giữ bản sao này và các Word gốc.
2. Chuẩn bị adapter PostgreSQL, schema, Storage và cấu hình Vercel trên bản thử nghiệm.
3. Nhập dữ liệu nguồn vào project đích trống có kiểm tra. Đối chiếu số dòng, ID, tổng kim cương, đơn thanh toán, quyền học và hash tất cả tệp.
4. Chạy toàn bộ luồng nghiệp vụ bằng tài khoản thử trên deployment preview, không gửi thông báo/thanh toán thật.
5. Khi bản preview được duyệt, tạm ngừng ghi vào nguồn trong lúc lấy snapshot chốt và đồng bộ lần cuối. Snapshot hôm nay chưa phải bản chốt nếu có người tiếp tục dùng website.
6. Kiểm tra lại rồi mới đổi domain/production. Giữ nguồn và cấu hình cũ để quay lại nếu có lỗi.

## Công cụ đã chuẩn bị

```powershell
# Chỉ đọc database đang cấu hình ở backend/.env; không in thông tin kết nối
npm --prefix backend run migration:inventory

# Xuất snapshot nhất quán; mỗi lần tạo thư mục mới trong backend/backups/
npm --prefix backend run migration:export

# Kiểm tra hash, số dòng, khóa chính duy nhất và mã hóa binary từ đĩa
npm --prefix backend run migration:verify -- "E:\xampp_server\htdocs\TTTNAVA\backend\backups\platform-migration\2026-11-03T16-50-19-657Z"

# Kiểm kê tệp trước khi chuyển (chỉ đọc)
npm --prefix backend run storage:inventory

# Sau khi đã có SUPABASE_SECRET_KEY: tạo bucket private, chép và đọc lại xác minh
npm --prefix backend run storage:migrate

# Tạo file riêng tư để nhập vào Vercel; fail nếu còn thiếu biến
node backend/scripts/prepare-vercel-env.mjs --write

# Build tài nguyên công khai, không đưa trang bảo vệ hoặc secrets lên CDN
npm run build:vercel
```

Các lệnh này không chuyển database đang chạy sang Supabase và không triển khai website.
