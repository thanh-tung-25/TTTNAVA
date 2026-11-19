# Tra từ bằng chữ viết tay · bản localhost

Mở `http://localhost:3000/preview/handwriting/` rồi bấm **Thử viết tay**, không cần đăng nhập. Trang dùng cùng phông chữ, CSS, thanh điều hướng, gấu trúc, cửa sổ Tra từ và ô viết tay của ứng dụng. Máy tính có ô viết và kết quả cạnh nhau; điện thoại dùng cửa sổ gọn theo chiều dọc. Từ mẫu riêng không gọi API từ điển, không lưu yêu thích hay dữ liệu học sinh. Phát âm trên trang mẫu chỉ dùng giọng tiếng Trung cục bộ có sẵn trên thiết bị; thiếu giọng sẽ báo ngay.

Trong khóa Tiếng Trung, bấm Tra từ rồi nút bút viết cạnh ô tìm kiếm. Chọn chữ gợi ý để nối vào từ đang viết; tìm kiếm bằng chữ Latin được thay bằng chữ vừa chọn. Hoàn tác, xóa và nhận dạng lại đều nằm trên thiết bị. Đóng cửa sổ dừng worker. Từ điển chính vẫn chỉ tra từ đã xuất bản của khóa đang học.

Nhận dạng kết hợp `gugray/hanzi_lookup` và chỉ mục hình dáng/nét của 9.574 chữ xây từ dữ liệu medians của Make Me a Hanzi. Nhóm mặc định chỉ xét chữ **đúng số nét đang viết**. Người học có thể chủ động chuyển sang nhóm lệch một nét; nhóm đó chỉ có N−1 hoặc N+1 nét, không trộn chữ hơn nhiều nét vào nhóm chính. Mỗi gợi ý hiện cả số nét để đối chiếu. Tám gợi ý đầu có thể mở rộng thành tối đa hai mươi chữ trong cùng nhóm.

Phiên bản chỉ mục v2 lưu hình từng nét, chiều dài, phân bố hướng ngang/dọc/chéo, nét chấm và nét có gập/móc. Hướng được phân nhóm mềm để dung nạp nét ngang/dọc hơi nghiêng. Bộ ghép nét tìm phép ghép một-một có chi phí thấp nhất, độc lập thứ tự và chiều đi bút, rồi kết hợp với hình tổng thể và các thông tin hỗ trợ. Chỉ giải mã hình nét của các chữ nằm trong nhóm số nét đang cần để giảm bộ nhớ. Không có quy tắc ép riêng 你 hay 我 lên đầu. Tọa độ được giữ đúng tỷ lệ ô viết; canvas trong giao diện học sinh ghi đè lưới và viền chung để không lệch tọa độ.

Các bản cố định và hash nằm trong `frontend/assets/vendor/hanzi-lookup/SOURCE.json` và `SHAPES-V2-SOURCE.json`; worker dùng `shapes-v2.bin`. Thư viện, chỉ mục, model WASM, giấy phép LGPL-3.0 và Arphic Public License đều lưu tại máy; nét vẽ chỉ ở bộ nhớ trình duyệt, không gửi tới API bên ngoài. Mã thư viện gốc được giữ nguyên. `backend/scripts/build-handwriting-shapes.mjs --cached` tạo chỉ mục từ dữ liệu công khai đã lưu tại máy, không truy cập mạng, không dùng bản viết hay dữ liệu tài khoản học sinh. Bản dữ liệu nguồn dùng khi tạo nằm trong backups bị bỏ qua bởi Git.

Đối chiếu 31 chữ từ medians công khai, mỗi chữ ở dạng gốc và đổi thứ tự/hướng nét: 62 trường hợp đều đứng đầu; nhóm chính luôn đúng N nét và nhóm lân cận luôn lệch đúng một nét. Khi phỏng lại bảy đường nét nhìn thấy trong ảnh người dùng gửi, 我 đứng đầu và toàn bộ gợi ý chính có bảy nét. Đây là đối chiếu dữ liệu tham chiếu và nét phỏng theo ảnh, không phải bản tọa độ bút gốc; chất lượng trên chữ viết thực tế vẫn cần người dùng xem thử.

Worker dùng WebAssembly có CSP riêng ở route `/assets/js/chinese-handwriting-worker.js`; CSP của trang giữ nguyên. Khi có phép triển khai Vercel sau này, cần đặt cùng CSP cho worker ở đường phục vụ static của Vercel trước khi phát hành. Trang mẫu chỉ được phục vụ trong môi trường development với hostname localhost.

Đây là thay đổi tại máy. Không commit, push hoặc triển khai khi chưa được người dùng cho phép. Không chạy bộ kiểm thử theo yêu cầu hiện tại.
