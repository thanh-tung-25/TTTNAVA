# Đồng bộ nội dung tiếng Trung từ XAMPP lên website

Nguồn là MySQL XAMPP `kids_learning`; đích là schema `ttnava_stage` của project Supabase đã cấu hình trong `backend/.env.vercel`, website `tttnava-backend.vercel.app`. Khóa và chuỗi kết nối chỉ nằm trong các file môi trường riêng tư, không đưa vào Git hoặc tài liệu SQL công khai.

`backend/scripts/sync-chinese-production.mjs` mặc định chỉ đọc. Script ghép 10 bài HSK 1 theo thứ tự và kiểm tra đúng file Word/checksum; ghép từng từ/câu theo nội dung, giữ nguyên ID online để bảo toàn lịch sử. Script không thêm/xóa ngân hàng từ hoặc câu quiz, không chép tài khoản, quyền học hoặc kết quả học sinh từ XAMPP.

Trước khi phát hành lần đầu:

1. `node backend/scripts/seed-chinese-ai-chat.mjs` bổ sung tình huống AI còn thiếu trên XAMPP, giữ cấu hình cô đã sửa.
2. `node backend/scripts/seed-chinese-street.mjs` bổ sung nhiệm vụ Phố tiếng Trung còn thiếu trên XAMPP.
3. `node --use-system-ca backend/scripts/sync-chinese-production.mjs` xuất bản đối chiếu chỉ đọc cùng mã `fingerprint`.
4. Kiểm tra danh sách thay đổi, rồi khi được chủ web yêu cầu phát hành, chạy `node --use-system-ca backend/scripts/sync-chinese-production.mjs --apply --expected <fingerprint-vừa-kiểm-tra>`.

Lệnh áp dụng sao lưu nội dung online trước khi sửa vào `backend/backups/chinese-production-sync/`, thêm schema PostgreSQL 035/036, cập nhật thứ tự/nội dung mục cần đổi, hoạt động của bài và cấu hình AI/Phố tiếng Trung. Các bước chạy trong một transaction. Nếu nguồn/đích thay đổi sau bản đối chiếu hoặc kiểm tra sau cập nhật không khớp, transaction rollback. Những bảng tài khoản, quyền học, kim cương và lịch sử được so sánh fingerprint trước–sau trong cùng snapshot.

Backup chứa nội dung cũ của bài, bộ từ/câu, hoạt động và cấu hình; các bảng thông tin học sinh chỉ có fingerprint, không sao chép dữ liệu cá nhân vào backup này. Mã bài online có thể khác XAMPP ở bài 3–6; đây là chủ ý giữ ID đang được lịch sử online tham chiếu. Khi đối chiếu, cần so nội dung, không yêu cầu hai database có cùng UUID.

Schema được chuẩn bị trước khi phát hành code để kiểm tra build Vercel không bị thiếu bảng. Sau khi bản phát hành mới sẵn sàng, đối chiếu release frontend/backend, truy cập học sinh/admin, kiểm tra 10 tình huống AI và 30 nhiệm vụ trong phố. Việc kiểm tra online chỉ dùng tài khoản sẵn có, không tạo tài khoản hoặc kết quả giả, không gọi AI để thử âm thanh học sinh.

Đây là đồng bộ một lần theo yêu cầu. Sửa dữ liệu trên XAMPP không tự đẩy lên online; những lần đồng bộ sau vẫn cần xem bản đối chiếu và lưu backup. Khi khôi phục, dùng các ID/nội dung trong backup để cập nhật đúng mục đã thay đổi, giữ nguyên tài khoản và lịch sử hiện tại; không khôi phục đè toàn bộ database.
