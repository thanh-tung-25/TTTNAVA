# Khóa học và xác nhận thanh toán

## MoMo và đợt học miễn phí (18/11/2026)

Trang quản trị có bốn mục: **Quyền học**, **Khóa học**, **Giao dịch**, **Kết nối MoMo**. Trong Quyền học có hai danh sách **Đã thanh toán** và **Được cấp miễn phí**. Admin tổng đặt giá/thời hạn trả phí và lịch nhận đăng ký miễn phí cho từng khóa; admin Tiếng Trung chỉ xem dữ liệu HSK trong phạm vi cũ. Đợt miễn phí là khoảng thời gian học sinh bấm đăng ký **khóa học**, áp dụng cho cả tài khoản cũ và mới. Nút **Đăng ký miễn phí** gọi `POST /api/v1/courses/:id/register-free`, cấp một năm lịch từ thời điểm máy chủ nhận đăng ký khóa (29/2 sang 28/2 năm sau). Không tính theo ngày tạo tài khoản, không đợi MoMo và không tự đăng ký hàng loạt khóa khi tạo tài khoản hoặc mở danh sách. Học sinh nhận xong có thể Vào học; admin nhìn thấy trong Được cấp miễn phí. Kết thúc đợt dừng nhận đăng ký mới; quyền đã cấp vẫn tồn tại đến hạn riêng. Lịch mới thay lịch hiện hành và giữ bản cũ trong `course_free_periods`. Tắt đợt không thu hồi các quyền đã cấp.

Migration `044_course_free_registrations.sql` thêm biên nhận duy nhất theo học sinh/đợt. Máy chủ khóa tài khoản và khóa học để xử lý đăng ký, kiểm tra đợt còn mở, không bị khóa/thu hồi, rồi ghi biên nhận, quyền miễn phí và nhật ký cùng giao dịch. Bấm lại không cộng thêm thời hạn, kể cả gửi từ nhiều thiết bị; hết một năm trong cùng đợt không được tự nhận lại. Quyền trả phí và quà tặng riêng còn hiệu lực được giữ nguyên. Phần thời gian của đợt vẫn chỉ dùng để nhận đăng ký.

Nhóm học sinh đang sử dụng được xếp vào **Được cấp miễn phí**, thời hạn **một năm lịch từ ngày đăng ký từng khóa**, giữ nguyên giờ/phút/giây. Metadata `course_registration_free` và `course_free_grants` quản lý nhóm chuyển tiếp. Lấy ngày đăng ký gốc từ đơn cũ đã duyệt của chính khóa; nếu không có thì dùng ngày cấp quyền học gốc, rồi ngày cấp quà khi đó là lần đăng ký đầu tiên. Các khóa đang mở của từng người được giữ; tài khoản chưa từng có quyền học nhận khóa cơ bản đúng lớp hoặc HSK 1 khi chuyển tiếp. Không mở lại khóa đã thu hồi. Chính sách một năm được ưu tiên khi đọc quyền cũ, còn hồ sơ, ngày tạo tài khoản, quyền gốc, đơn hàng, số tiền, tiến độ, điểm, kim cương, ghi âm và lịch sử đều nguyên vẹn. Thanh toán MoMo thật phát sinh sau này ưu tiên quyền trả phí. `deploy-course-momo.mjs --free-registration --apply` sửa một lần các mốc metadata đã lấy nhầm ngày tạo tài khoản; chỉ sửa quà tự cấp đúng khoảng chuyển tiếp, giữ các quà admin đã chỉnh riêng. Có sao lưu metadata, đối soát từng trường được phép đổi và kiểm tra băm dữ liệu gốc trong cùng giao dịch.

Nút **Cấp miễn phí** trong Quyền học dành cho admin tổng: nhập/chọn tên đăng nhập của học sinh đã đăng ký, chọn một hoặc nhiều khóa, ngày bắt đầu/kết thúc và ghi chú. Mặc định cấp từ hôm nay; có chọn nhanh 7/30/90 ngày hoặc một năm từ ngày bắt đầu bạn chọn. Sau khi lưu tự mở danh sách **Được cấp miễn phí**, với thời hạn, người cấp, ghi chú, Gia hạn và Thu hồi. Đây là quyền tặng riêng, tách với đợt nhận đăng ký chung. `course_free_grants` lưu quyền riêng, không sửa `course_enrollments`, nhãn đã thanh toán, đơn hàng hoặc dữ liệu học tập. Gia hạn giữ thời gian đang còn và mở rộng khoảng được cấp; không rút ngắn khoảng miễn phí còn hiệu lực. Khóa đã có quyền trả phí đủ đến hết thời gian tặng được bỏ qua. Khi quyền trả phí ngắn hơn thời gian tặng, hai quyền cùng tồn tại, ưu tiên hiển thị quyền trả phí đang có. Thu hồi quyền tặng chỉ tác động quyền tặng; việc cấp, gia hạn, thu hồi đều lưu nhật ký. Hết hạn được kiểm tra ở máy chủ, lịch sử học không bị xóa. Các khóa có quyền tặng hợp lệ vẫn có thể mua qua MoMo để tiếp tục học. API cấp riêng chỉ dành cho admin tổng; tài khoản phụ huynh/bot/đã xóa không nhận quyền tặng học sinh.

Migration `041_course_free_grants.sql` chỉ tạo một bảng trống, không tự cấp quyền cho ai. Áp dụng bằng `node backend/scripts/deploy-course-momo.mjs --target=production --free-grants --apply` hoặc đổi đích thành `--target=local`. Công cụ sao lưu và đối chiếu dữ liệu cũ trong cùng snapshot, không phát sinh giao dịch tiền hay chạy kiểm thử chức năng.

Migration `040_course_momo.sql` trước đó chỉ tạo năm bảng mới và nhãn `course_paid_access.origin=existing` cho quyền chuyển tiếp. Dấu mốc cố định tránh thêm người mới khi chạy lại. Bản ghi này vẫn nguyên vẹn; chính sách một năm mới ở migration 042 quyết định việc hiển thị nhóm cũ là miễn phí. Không tạo giao dịch tiền giả, không sửa nguồn/thời hạn/thu hồi của quyền gốc, đơn cũ, hồ sơ, tiến độ, điểm, kim cương hoặc lịch sử. Công cụ `node backend/scripts/deploy-course-momo.mjs --target=production --apply` áp dụng riêng migration 040 cho Supabase đã cấu hình. Đổi đích thành `--target=local` để áp dụng MySQL. Không có `--apply` chỉ đọc số lượng. Không phát sinh thanh toán khi triển khai.

Admin có thể thêm MoMo sau tại **Kết nối MoMo**: Partner Code, Access Key, Secret Key, môi trường và công tắc bật. Khóa được mã hóa AES-256-GCM ở máy chủ bằng khóa dẫn xuất riêng từ `PAYMENT_CONFIG_ENCRYPTION_KEY`, hoặc JWT_SECRET hiện có nếu chưa đặt biến riêng; không được trả lại cho trình duyệt hoặc ghi vào log. Thay khóa mã hóa cần nhập lại cấu hình, và cần giữ khóa cũ để hoàn tất đơn đang chờ. Mỗi đơn giữ phiên bản kết nối gốc để thay tài khoản mới không phá callback của tài khoản cũ. Chỉ Production đã bật mới cho học sinh tạo đơn; Sandbox không mở quyền học thật. Trang cấu hình không tự gọi MoMo hoặc tự xác nhận tài khoản đã được MoMo duyệt.

Checkout tạo đơn trước khi chuyển đến trang MoMo, giữ nguyên học phí/thời hạn trong đơn. Khóa 1.000–50.000.000đ dùng API `captureWallet`; mỗi lần thử lại dùng cùng requestId. Tài khoản MoMo for Business cần được MoMo duyệt nhận tiền thật. IPN công khai là `/api/v1/payments/momo/ipn`; máy chủ xác thực HMAC-SHA256 với khóa của chính đơn, đối chiếu partner/request/order/số tiền và chỉ ghi nhận resultCode=0. Callback lặp được xử lý một lần theo đơn và mã giao dịch duy nhất. Ghi nhận thanh toán, cấp quyền, nhãn đã thanh toán và nhật ký nằm cùng giao dịch DB. Trang quay về không được dùng để tự mở khóa bằng tham số URL. Kiểm tra lại giao dịch gọi API query trực tiếp tới máy chủ MoMo qua HTTPS, tối đa một lần/30 giây/đơn. Đơn hủy nhưng có xác nhận tiền vào hợp lệ vẫn được ghi nhận để không mất tiền/quyền của người học; không hoàn tiền tự động.

Khi thanh toán thật thành công, gói mới nối tiếp thời gian miễn phí hoặc trả phí còn lại; nếu không còn quyền học thì bắt đầu lúc xác nhận. Quyền trả phí vĩnh viễn được giữ nguyên. Đợt miễn phí không ghi đè quyền trả phí. Yêu cầu chuyển khoản thủ công từ trước chỉ được giữ để xem lịch sử. Giao diện, mã xử lý, API tải QR/cấu hình chuyển khoản và API duyệt thanh toán thủ công cũ đã được gỡ. Không xóa dữ liệu QR, hướng dẫn hoặc đơn hàng đã lưu trong DB. Luồng đăng ký mới chỉ dùng MoMo, không nhận lời khai đã chuyển khoản để cấp quyền.

Danh sách đăng ký của admin và học sinh dùng chung `course-order-history.js`: bản ghi chuyển khoản cũ thuộc nhóm `course_registration_free` được trình bày là `display_status='admin_free'`, học phí hiển thị 0đ, kèm thời hạn và trạng thái thu hồi của quyền miễn phí hiện tại. Bộ lọc Đã thanh toán không chứa nhóm này; có bộ lọc Được cấp miễn phí riêng. Các trường gốc `status`, `amount_vnd`, mã giao dịch và ghi chú được giữ nguyên, chỉ nằm trong thông tin đăng ký cũ. Đơn có bản ghi MoMo luôn giữ đúng trạng thái thanh toán của chính đơn, kể cả tài khoản từng được cấp miễn phí; không dùng quyền miễn phí để đổi nhãn đơn MoMo mới. Đây là phép đọc, không migration hoặc cập nhật dữ liệu người dùng.

Sau lần rà soát ngày 18/11, danh sách giao bài và các chỉ số học tập dùng cùng điều kiện `course-access-policy.js` với quyền vào học: gồm quyền trả phí hợp lệ và quyền miễn phí riêng còn hiệu lực, áp dụng chính sách một năm cho nhóm cũ. Danh sách và thống kê cùng lấy một nguồn học sinh, không thêm trùng khi một người có cả hai quyền, vẫn giữ giới hạn quản lý của admin và loại tài khoản phụ huynh/đã xóa/đang bị khóa. Các truy vấn này chỉ đọc; không viết lại tiến độ hoặc kết quả đã có.

Gói trả phí mới nối tiếp quyền còn lại: mốc tính thời lượng là thời điểm muộn nhất giữa lúc xác nhận, ngày kết thúc miễn phí đang có và ngày kết thúc gói trả phí chưa hết hạn (gồm gói đã mua đang chờ bắt đầu). Với lần mua đầu trong khi đang miễn phí, ngày bắt đầu gói trả phí là ngày hết miễn phí, và học sinh tiếp tục dùng quyền tặng đến lúc đó. Mua tiếp nhiều lần giữ ngày bắt đầu gói đã mua, cộng thêm vào cuối thời gian còn lại. Quyền trả phí vĩnh viễn được giữ nguyên. Callback lặp vẫn không cộng thời gian lần nữa. Chỉ áp dụng khi có xác nhận thanh toán mới; không cập nhật lại đơn hay quyền học cũ trong lúc triển khai. Trang khóa học hiển thị gói đã mua đang chờ bắt đầu, ngày hết hạn dự kiến trước thanh toán và lời nhắc trong bảy ngày cuối của quyền học liên tục; đã có gói nối tiếp thì tính cả gói đó khi nhắc.

Phần dưới mô tả cơ chế trước khi chuyển sang MoMo, dùng để đối chiếu lịch sử.

Học sinh đăng nhập vào `/pages/student/courses/`, chọn Tiểu học hoặc Tiếng Trung. Mọi tài khoản đều xem được 14 khóa. Khóa chưa được cấp quyền chỉ mở trang giới thiệu; bài học và API được kiểm tra quyền ở máy chủ.

## Giá ban đầu

- Lớp 1–5: 250.000đ / mỗi lớp, vĩnh viễn, gồm các môn tiểu học và chức năng luyện tập, bài kiểm tra theo lớp.
- HSK 1–9: lần lượt 1.000.000đ–9.000.000đ / cấp. Hiện để vĩnh viễn; admin có thể chỉnh thời hạn.
- Giá và thời hạn được chốt vào đơn khi gửi. Sửa cấu hình khóa không thay đổi đơn đã gửi hoặc quyền đã cấp.

## Vận hành

1. Chạy `npm run db:migrate` rồi khởi động lại backend.
2. Vào **Quản trị → Khóa học & thanh toán** (`/pages/admin/courses/`).
3. Nhập hướng dẫn chuyển khoản thực tế: ngân hàng, tài khoản, chủ tài khoản, mẫu nội dung chuyển tiền; áp dụng cho các khóa hoặc sửa riêng từng khóa.
   Trong tab **QR & học phí**, ở mục **Ảnh QR của bạn**, tải ảnh QR từ ứng dụng ngân hàng (PNG/JPEG/WebP, tối đa 2 MB). Chọn QR chung hoặc QR riêng cho từng khóa; QR riêng được ưu tiên. QR được lưu trong database, không cần dịch vụ QR bên ngoài.
4. Học sinh/phụ huynh chuyển tiền theo hướng dẫn rồi gửi tên người chuyển, mã/nội dung giao dịch, ghi chú.
5. Admin đối soát trong ngân hàng và ở mục **Duyệt đăng ký** bấm **Mở khóa**; có thể thêm ghi chú, hoặc dùng ghi chú xác nhận mặc định. Hệ thống không xác minh giao dịch ngân hàng tự động.
6. Học sinh bấm **Cập nhật** hoặc tải lại trang chọn khóa, sau đó **Vào học**. Có thể dùng **Đổi khóa** để chuyển sang khóa khác.

Chưa có hướng dẫn chuyển khoản thì chưa nhận đăng ký. Yêu cầu chờ duyệt không cấp quyền. Mỗi người chỉ có một yêu cầu đang chờ cho mỗi khóa; hủy hoặc từ chối xong có thể đăng ký lại. Việc duyệt và cấp quyền nằm trong cùng transaction, chống duyệt trùng. Từ chối cần ghi lý do; học sinh xem được phản hồi của chính mình.

Một tài khoản có thể sở hữu đồng thời nhiều khóa ở cả Tiểu học và Tiếng Trung. Mỗi khóa có yêu cầu và trạng thái riêng. Mua thêm không thu hồi quyền hoặc xóa tiến độ ở khóa cũ. Trong khóa đang học, bấm **Đổi khóa** để chọn hoặc đăng ký khóa khác.

Số yêu cầu chờ duyệt được hiển thị trên menu admin **Khóa học & thanh toán**, cập nhật mỗi 30 giây khi trang đang hiển thị. Admin mở trang này, bấm **Cập nhật** để xem đầy đủ người gửi, khóa, tiền, mã/nội dung giao dịch và ghi chú. Không gửi email/SMS và không yêu cầu ứng dụng ngân hàng kết nối website trong chế độ này.

Admin Tiếng Trung có menu **Đăng ký Tiếng Trung** dùng chung giao diện duyệt đăng ký. Chỉ hiển thị các học phần HSK 1–9 và số yêu cầu HSK đang chờ; được duyệt, từ chối và xem quyền học / lịch sử của các học phần này. Việc xét duyệt dựa trên chương trình của khóa đã đăng ký, không dựa vào khối lớp của học sinh. Các khóa Tiểu học, THCS, cấu hình giá, QR và cấp/thu hồi quyền thủ công vẫn thuộc admin tổng. Bàn phím chuyển tab bỏ qua mục cấu hình được ẩn với admin Tiếng Trung.

Ảnh QR tĩnh chỉ chứa thông tin do admin cung cấp; website không tự sửa số tiền hoặc nội dung trong ảnh. Màn hình thanh toán hiển thị riêng số tiền và nội dung gợi ý `TTNAVA <tên đăng nhập> <mã khóa>` để phụ huynh nhập trong ứng dụng ngân hàng. Tiền đi trực tiếp tới ngân hàng của admin, không đi qua website. Admin phải đối chiếu người nhận, số tiền và giao dịch thực tế trước khi mở khóa. Để xác nhận tự động cần tích hợp dịch vụ thanh toán/ngân hàng có thông báo giao dịch được xác thực; tải QR lên không tạo ra kết nối đó.

Duyệt đăng ký tự động cấp quyền, không cần nhập lại thông tin học sinh. Tab Quyền học hiển thị các khóa đã mở và nút Thu hồi cho từng dòng; form cấp quyền thủ công đã được bỏ khỏi giao diện. Admin vẫn có thể đặt thời hạn hoặc tạm ngừng khóa trong cấu hình khóa. Thay đổi quyền và kết quả xét duyệt được lưu nhật ký. Khi hết hạn/thu hồi, API nội dung, thẻ, quiz, đáp án, bài luyện và bài thi bị chặn; lịch sử kết quả vẫn được giữ.

## Tài khoản cũ

Migration 014 chỉ chạy một lần: giữ khóa đúng lớp hiện tại cho học sinh tiểu học; giữ HSK 1–9 cho tài khoản Tiếng Trung cũ để không mất quyền đang có. Các quyền này có nguồn `legacy` trong admin. Tài khoản mới không tự được cấp khóa. Admin có thể thu hồi quyền cũ nếu cần chuyển sang trả phí. Không xóa lịch sử, điểm hay kim cương.

## Kiểm thử

- `npm test`: backend, gồm phân quyền, đóng băng giá đơn, duyệt trùng, thu hồi/hết hạn, truy cập trực tiếp và bảo vệ nội dung.
- `npm run test:student-ui`: giao diện học sinh với API giả lập.
- `npm run test:courses`: đăng nhập → chọn khóa → gửi yêu cầu → admin duyệt → vào học lớp khác lớp hồ sơ → thu hồi. Chạy trên `kids_learning_test`, cổng 3110, không giao dịch tiền thật. Cần chạy `npm test` trước để chuẩn bị schema test.

`.env` không được đưa lên Git. Môi trường triển khai cần chạy migration trên database riêng và cấu hình hướng dẫn thanh toán trước khi nhận đăng ký.
# Hiển thị QR và cửa sổ thanh toán

Migration `019_payment_qr_crop.sql` thêm `course_payment_qr.crop_json` để chỉ
hiển thị vùng mã QR của ảnh chụp màn hình. Ảnh gốc trong cơ sở dữ liệu giữ nguyên;
giao diện cắt khung nhìn bằng tọa độ, không vẽ lại mã. Tải ảnh mới sẽ xóa tọa độ
của ảnh cũ để tránh cắt sai. Khóa có QR riêng dùng đúng tọa độ của QR riêng,
không dùng nhầm tọa độ của QR chung.

Cửa sổ đăng ký khóa học chia QR và thông tin chuyển khoản thành hai cột trên
máy tính, một cột trên điện thoại. Ghi chú là phần thu gọn không bắt buộc.
Luồng gửi yêu cầu và xác nhận thủ công bởi admin giữ nguyên.
