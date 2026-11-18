# Kim cương trên thanh đầu trang theo hệ học

`GET /api/v1/diamonds/summary` giữ `total`, `week`, `month`, `recent` của ví chung và bổ sung `programs.primary`, `programs.secondary`, `programs.chinese`, mỗi mục gồm `total`, `week`, `month`. Phản hồi riêng tư, không lưu cache.

Nguồn phân loại là hoạt động đã nhận thưởng: luyện tập/bài thi theo lớp của chủ đề, thách đấu theo lớp của trận, nhiệm vụ theo khóa học trong bản ghi nhận thưởng và quiz Tiếng Trung theo loại giao dịch. Tiểu học cộng lớp 1–5, THCS cộng lớp 6–9, Tiếng Trung cộng tất cả cấp HSK. Đối chiếu chủ sở hữu của lượt học/nhận thưởng; không dùng lớp hiện tại của tài khoản hay khóa đang chọn để phân loại lịch sử. Quyền học bị thu hồi không làm mất phần thưởng đã nhận.

Ví chung tính toàn bộ sổ giao dịch. Chi phí đổi vật phẩm cũ không có nguồn hệ học, do đó không trừ tùy ý vào một hệ. Giao dịch thiếu nguồn vẫn nằm trong ví chung. Không sửa bảng kim cương hoặc lịch sử để thực hiện thay đổi hiển thị này.

Trang khóa học chọn hệ theo `?program=primary|secondary|chinese`, cập nhật ngay khi bấm thẻ và giữ lựa chọn khi tải lại. “Xem tất cả” hiện ví chung. Các trang học sinh còn lại chọn hệ theo khóa đã vào học; học HSK 1 hay HSK 2 đều hiện tổng Tiếng Trung. Bộ nhớ đệm giữ riêng tổng chung và ba tổng theo hệ. Phản hồi cũ không được ghi đè lần đồng bộ mới; nhận thưởng rồi gọi `syncDiamondTotal()` sẽ cập nhật đủ ba tổng.

Nút TTNAVA trên trang chọn khóa giữ hệ đang xem; từ khóa Tiểu học/THCS quay lại danh sách của đúng hệ. Ô kim cương có nhãn hệ học khi hiện thành tích, hoặc “Ví chung” khi hiện số dư, và dẫn đến lịch sử cộng/trừ. Trang kim cương trình bày riêng số dư và số đã kiếm của ba hệ.

Chức năng đổi vật phẩm đã ngừng: API mua trả 410, giao diện chỉ cho sử dụng trang trí đã sở hữu. Các lượt đổi cũ được hoàn đúng số đã trừ bằng dòng `store_refund`, cùng `profile_id/ref_type/ref_id` với lượt mua. Ràng buộc duy nhất chống hoàn trùng. Hoàn trả chỉ tăng ví chung; không cộng lại thành tích hệ học, thưởng tuần/tháng, bảng xếp hạng hay thống kê kim cương được thưởng.

`backend/scripts/refund-store-diamonds.mjs --target=production --apply` áp dụng migration 043 và hoàn toàn bộ lượt mua chưa được hoàn trong một giao dịch PostgreSQL. Script khóa giao dịch khi ghi, lưu bản sao sổ và đối soát từng số dư, kiểm tra băm giữ nguyên các dòng cũ cùng hồ sơ, tiến độ, quyền học, vật phẩm và tùy chọn. Bỏ `--apply` chỉ xuất dự kiến; không gửi yêu cầu mua hay chạy kiểm thử. Bản sao nằm trong thư mục `backend/backups/diamond-refunds/` bị loại khỏi Git.

Kiểm thử: `backend/tests/diamond-programs.test.js` bao phủ đủ lớp 1–9, bài thi, thách đấu, nhiệm vụ, điều chỉnh âm, ví chung, mốc tuần/tháng, nguồn thiếu/khác học sinh; `e2e/diamond-programs.spec.js` kiểm tra điện thoại/máy tính, đổi hệ, tải lại, tải chậm, nhận thưởng và các trang khác. Kiểm tra bảng xếp hạng Tiếng Trung riêng để giữ nguyên cách tính đã chốt.
