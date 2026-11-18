# Tra từ bằng chữ viết tay · bản localhost

Mở `http://localhost:3000/preview/handwriting/` rồi bấm **Thử viết tay**, không cần đăng nhập. Trang dùng cùng phông chữ, CSS, thanh điều hướng, gấu trúc, cửa sổ Tra từ và ô viết tay của ứng dụng. Máy tính có ô viết và kết quả cạnh nhau; điện thoại dùng cửa sổ gọn theo chiều dọc. Từ mẫu riêng không gọi API từ điển, không lưu yêu thích hay dữ liệu học sinh. Phát âm trên trang mẫu chỉ dùng giọng tiếng Trung cục bộ có sẵn trên thiết bị; thiếu giọng sẽ báo ngay.

Trong khóa Tiếng Trung, bấm Tra từ rồi nút bút viết cạnh ô tìm kiếm. Chọn chữ gợi ý để nối vào từ đang viết; tìm kiếm bằng chữ Latin được thay bằng chữ vừa chọn. Hoàn tác, xóa và nhận dạng lại đều nằm trên thiết bị. Đóng cửa sổ dừng worker. Từ điển chính vẫn chỉ tra từ đã xuất bản của khóa đang học.

Nhận dạng kết hợp `gugray/hanzi_lookup` và chỉ mục hình dáng 9.574 chữ xây từ dữ liệu medians của Make Me a Hanzi. Chỉ mục hình dáng dùng khoảng cách chamfer hai chiều, độc lập hướng và thứ tự nét; điểm từ bộ nhận dạng theo nét và từ vựng đang tra chỉ hỗ trợ xếp hạng. Không ép chữ cụ thể như 你 lên đầu. Hiện tám gợi ý đầu, có Xem thêm để chọn trong tối đa hai mươi chữ. Tọa độ được giữ đúng tỷ lệ ô viết; canvas trong giao diện học sinh ghi đè lưới và viền chung để không lệch tọa độ.

Các bản cố định và hash nằm trong `frontend/assets/vendor/hanzi-lookup/SOURCE.json` và `SHAPES-SOURCE.json`. Thư viện, chỉ mục, model WASM, giấy phép LGPL-3.0 và Arphic Public License đều lưu tại máy; nét vẽ chỉ ở bộ nhớ trình duyệt, không gửi tới API bên ngoài. Mã thư viện gốc được giữ nguyên. `backend/scripts/build-handwriting-shapes.mjs` tạo chỉ mục từ dữ liệu nét công khai, không dùng bản viết hay dữ liệu tài khoản của học sinh. Bản dữ liệu nguồn dùng khi tạo nằm trong backups bị bỏ qua bởi Git.

Đã chẩn đoán riêng mẫu 你 từ medians công khai: bộ cũ đứng đầu khi đúng thứ tự nhưng không còn 你 trong top 20 khi đảo hướng hoặc thứ tự nét. Khi bổ sung so hình dáng, 你 đứng đầu cho mẫu gốc và hai trường hợp đảo nét, đứng thứ hai khi co giãn lệch tỷ lệ. Đây là đối chiếu mẫu công khai tại máy; chất lượng với chữ viết thật vẫn cần người dùng xem thử.

Worker dùng WebAssembly có CSP riêng ở route `/assets/js/chinese-handwriting-worker.js`; CSP của trang giữ nguyên. Khi có phép triển khai Vercel sau này, cần đặt cùng CSP cho worker ở đường phục vụ static của Vercel trước khi phát hành. Trang mẫu chỉ được phục vụ trong môi trường development với hostname localhost.

Đây là thay đổi tại máy. Không commit, push hoặc triển khai khi chưa được người dùng cho phép. Không chạy bộ kiểm thử theo yêu cầu hiện tại.
