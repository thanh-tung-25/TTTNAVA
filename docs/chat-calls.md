# Gọi thoại/video trong chat

Gọi riêng 1–1 giữa hai người đã chấp nhận kết bạn, kế thừa phạm vi tài khoản của chat. Cuộc gọi nhóm chưa được hỗ trợ. Hai biểu tượng gọi thoại/video xuất hiện trong phòng nhắn riêng khi máy chủ đã bật dịch vụ. Menu chat có cài đặt nhận cuộc gọi, đăng ký thông báo trên thiết bị và lịch sử cuộc gọi. Người dùng có thể báo cáo cuộc gọi; chỉ admin super xem và xử lý báo cáo, không có chức năng nghe/xem nội dung cuộc gọi.

## Triển khai

1. Cài dependencies: `npm ci --prefix backend --ignore-scripts`.
2. MySQL: `npm run db:migrate`. PostgreSQL: áp dụng `backend/sql/postgres/038_chat_calls.sql` vào **đúng schema đang dùng**, trước khi bật tính năng. Không áp dụng file MySQL cho PostgreSQL. Migration PostgreSQL bật RLS và thu hồi quyền của anon/authenticated; chỉ backend truy cập các bảng này.
3. Tạo TURN key trong Cloudflare Realtime TURN. Điền `CLOUDFLARE_TURN_KEY_ID` và `CLOUDFLARE_TURN_API_TOKEN` trong environment máy chủ/Vercel. Không đưa khóa vào frontend, Git hoặc nội dung chat. Tham khảo https://developers.cloudflare.com/realtime/turn/generate-credentials/ .
4. Giữ `CHAT_CALLS_ENABLED=false` đến khi đã có schema và khóa hợp lệ. Đặt `CHAT_CALLS_ENABLED=true` trên môi trường kiểm thử, triển khai frontend/backend cùng phiên bản, rồi thử hai tài khoản trên hai thiết bị (Wi-Fi và 4G).
5. Nếu cần thông báo khi đóng website, chạy `node backend/scripts/generate-chat-push-keys.mjs`. Lệnh tạo file Git-ignored `backend/.env.chat-push`, không in khóa và không ghi đè file đã có. Copy ba biến `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT` vào environment máy chủ. Không tự tạo cặp khóa mới sau mỗi lần deploy; đổi khóa có thể buộc người dùng đăng ký lại thông báo. File này không tự nạp vào ứng dụng.
6. Người dùng chủ động vào **Cài đặt cuộc gọi → Bật thông báo cuộc gọi** trên từng thiết bị. iPhone/iPad cần web app trên Màn hình chính và phiên bản hỗ trợ Web Push. Đây là thông báo hệ thống mở website, không phải màn hình cuộc gọi native. Không bảo đảm thông báo đến khi hệ điều hành chặn hoặc thiết bị mất mạng.

Không cần một máy chủ WebSocket riêng: signaling và heartbeat qua HTTPS, trạng thái lưu SQL nên hoạt động qua nhiều Vercel function. Camera/micro và media WebRTC chạy tại thiết bị; không giữ HTTP request suốt thời lượng cuộc gọi. `/chat-sw.js` là service worker chỉ xử lý push, không cache trang riêng tư hay API.

## Giới hạn mặc định

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `CHAT_CALL_MAX_SECONDS` | 900 | Tối đa 15 phút kể từ lúc nhận cuộc gọi |
| `CHAT_CALL_MAX_CONCURRENT` | 5 | Tối đa 5 cặp gọi/đang gọi đến cùng lúc trên website |
| `CHAT_CALL_MONTHLY_MINUTES` | 3000 | Ngân sách thời gian gọi cho toàn website, tháng UTC |

Mỗi tài khoản có tối đa một cuộc gọi đang chờ/đang diễn ra. Chuông chờ 45 giây; quá 45 giây không có heartbeat sẽ hết phiên. Tối đa 3 cuộc gọi mới/người/phút, dùng SQL cho giới hạn này nên không bị reset bởi Vercel cold start. Khi có người chặn, hủy kết bạn, khóa tài khoản hoặc tắt nhận cuộc gọi, lần kiểm tra tiếp theo dừng cuộc gọi ở ứng dụng. Tab bị hệ điều hành treo có thể mất heartbeat và phải gọi lại.

Khóa chung SQL đảm bảo kiểm tra dung lượng và giữ chỗ ngân sách là nguyên tử khi nhiều function tạo cuộc gọi đồng thời. Ngân sách giữ trước thời lượng tối đa; kết thúc sẽ tính lại thời gian từ lúc tạo đến kết thúc. Đây là **giới hạn sử dụng trong ứng dụng**, không phải giới hạn GB hoặc hóa đơn Cloudflare. Khóa TURN tạm thời vẫn có thể được dùng đến khi hết hạn; ứng dụng không thể dùng heartbeat để bảo đảm ngắt một client đã bị sửa mã. Cần kiểm soát billing/usage phía nhà cung cấp riêng nếu muốn giới hạn tiền tuyệt đối. Tắt nhận cuộc gọi chỉ chặn chiều gọi đến; người dùng vẫn chủ động gọi đi được.

## Bảo mật và dữ liệu

- Mọi API gọi cần xác thực, kiểm tra hai bên, quyền nhìn thấy tài khoản/phòng, quan hệ bạn bè và trạng thái chặn. Chỉ phía nhận được accept. Thiết bị nhận được ràng buộc bằng client ID ngẫu nhiên, không tự chuyển cuộc gọi sang tab khác.
- Chỉ yêu cầu camera/micro sau thao tác gọi hoặc nhận. Từ chối cuộc gọi không mở media. Kết thúc, lỗi quyền truy cập, rời trang hoặc đăng xuất đều đóng peer connection và dừng track. Nếu người dùng còn đang xử lý hộp cấp quyền khi cuộc gọi hết hạn, track trả về sau đó cũng bị dừng.
- Media WebRTC được mã hóa giữa hai thiết bị. Ép `iceTransportPolicy: relay` để peer không nhận IP trực tiếp của nhau; Cloudflare xử lý IP và thời điểm kết nối, không giải mã nội dung media. Xem https://developers.cloudflare.com/realtime/turn/faq/ .
- Chỉ cấp thông tin TURN tạm thời cho đúng thiết bị trong cuộc gọi còn hiệu lực. Khóa Cloudflare gốc và VAPID private key chỉ ở máy chủ. Frontend không kết nối trực tiếp Cloudflare API để tạo khóa.
- SDP tạm thời nằm trong SQL trong lúc thiết lập cuộc gọi, xóa khi cuộc gọi kết thúc/hết hạn được phát hiện. SDP không phải audio/video. Không dùng MediaRecorder, không lưu nội dung cuộc gọi, không phân tích nội dung bằng AI. Lịch sử giữ thời gian, đối tác, loại gọi và kết quả; báo cáo lưu lý do người dùng nhập.
- Push chỉ chứa loại thông báo và mã cuộc gọi; màn hình khóa chỉ hiện thông báo chung. Endpoint được giới hạn nhà cung cấp push HTTPS cho Chrome, Firefox, Apple và Windows để tránh SSRF. Khóa subscription gắn với tài khoản/thiết bị, được gỡ khi tắt thông báo hoặc đăng xuất trên thiết bị đó. Push endpoint và key không được trả qua API danh sách hoặc ghi log.
- Không có cơ chế ngăn tuyệt đối người bên kia ghi lại màn hình hoặc thiết bị bị chiếm quyền. Mã hóa đường truyền không thay thế bảo vệ tài khoản và chống XSS.

## Kiểm tra

`npm --prefix backend test -- chat-calls.test.js chat.test.js`: database MySQL kiểm thử riêng, kiểm tra phân quyền, ràng buộc thiết bị, trạng thái, credential, giới hạn đồng thời/ngân sách, chặn, khóa tài khoản, thời hạn, báo cáo và push/logout. Không chạy test này bằng environment production.

`npx playwright test --config playwright.calls.config.js`: giao diện thật, API/signaling mô phỏng, camera/micro giả lập Chromium. Kiểm tra chấp nhận/từ chối, cấp quyền thất bại, ngắt track, điều khiển ở màn hình 320–390px và chat cũ. Không chứng minh media truyền qua TURN thật hoặc push tới iOS/Android thật.

Đã kiểm tra migration PostgreSQL và các thao tác tạo/gửi tín hiệu/nhận/poll/kết thúc/lịch sử/xóa SDP bằng dữ liệu giả trong schema tạm riêng. Schema kiểm thử được xóa sau khi chạy, không sửa schema ứng dụng.

Trước khi bật production: hai thiết bị gọi qua Wi-Fi/4G, hai chiều hình/tiếng, mute/camera, hết thời hạn, mất mạng, chặn/hủy kết bạn khi đang gọi, chuông báo ngoài website, đăng xuất trên thiết bị dùng chung và thử tài khoản không thuộc cuộc gọi. Chỉ bật khi các phép thử thực tế này đạt.
