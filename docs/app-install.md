# Ghim TTNAVA lên màn hình điện thoại

Mở website bằng Safari trên iPhone hoặc Chrome trên Android, chọn **Thêm vào Màn hình chính**. Biểu tượng dùng logo TTNAVA hiện tại, tên ngắn là **TTNAVA**. Với lối tắt đã ghim trước bản cập nhật này, xóa lối tắt cũ rồi thêm lại để lấy tên và icon mới.

Metadata được thêm chung khi Express trả HTML, gồm trang giới thiệu, đăng nhập, đăng ký, học thử, admin, học sinh và phụ huynh. Tiêu đề từng trang trên trình duyệt vẫn được giữ. Manifest công khai tại `/manifest.webmanifest`, Apple Touch Icon tại `/apple-touch-icon.png`; cả hai đều có đường dẫn tương ứng trên CDN Vercel. Các trang admin/học sinh tiếp tục yêu cầu đăng nhập và không được xuất vào thư mục public.

`frontend/assets/manifest.webmanifest` đặt `name` và `short_name` là `TTNAVA`, mở từ `/` để dùng luồng vào ứng dụng theo tài khoản hiện có. Icon PNG có kích thước 192, 512 và maskable 512 cho Android; PNG 180 dành cho iPhone; favicon PNG/ICO 32. Logo gốc được giữ nguyên. Có thể xuất lại kích thước bằng `node backend/scripts/create-app-icons.mjs` khi thay logo; script này cần bộ Playwright dùng cho phát triển, không chạy lúc deploy.

Kiểm tra bằng `npm --prefix backend test -- app-metadata --pool=threads`, `node backend/scripts/check-app-manifest.mjs` và `npm run build:vercel`. Không thêm service worker hoặc cache trang có dữ liệu tài khoản.

Tham khảo: [Apple: Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html), [Chrome: Add a web app manifest](https://web.dev/articles/add-manifest).
