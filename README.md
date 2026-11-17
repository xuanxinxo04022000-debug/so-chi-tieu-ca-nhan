# Sổ chi tiêu cá nhân

Ứng dụng React + Vite, Supabase Auth/Database/Realtime và Netlify. Dữ liệu lưu trên Supabase nên đăng nhập cùng một tài khoản ở các thiết bị sẽ xem và chỉnh sửa cùng một sổ chi tiêu.

## 1. Tạo cơ sở dữ liệu Supabase

1. Tạo project tại https://supabase.com (gói Free đủ để bắt đầu).
2. Mở **SQL Editor → New query**.
3. Sao chép toàn bộ nội dung `supabase-schema.sql`, bấm **Run**.
4. Vào **Project Settings → API** (hoặc API Keys), sao chép **Project URL** và **anon / publishable public key**. Không dùng `service_role` key ở frontend.

Bảng bật Row Level Security (RLS): mỗi tài khoản chỉ được đọc, thêm, sửa và xóa giao dịch có `user_id` của chính mình.

## 2. Chạy thử trên máy

Cài Node.js phiên bản LTS, sau đó trong thư mục dự án:

```bash
npm install
cp .env.example .env
```

Mở `.env` và điền:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Chạy:

```bash
npm run dev
```

Build kiểm tra:

```bash
npm run build
```

## 3. Deploy lên Netlify

### Cách đơn giản

1. Đưa toàn bộ thư mục dự án lên một GitHub repository.
2. Vào https://app.netlify.com → **Add new site → Import an existing project** và chọn repository.
3. Build command: `npm run build`; Publish directory: `dist` (đã khai báo trong `netlify.toml`).
4. Vào **Site configuration → Environment variables**, thêm hai biến:
   - `VITE_SUPABASE_URL` = Project URL Supabase
   - `VITE_SUPABASE_ANON_KEY` = anon/public key Supabase
5. Trigger deploy lại. Netlify sẽ cấp cho bạn một đường link `*.netlify.app`.

Bạn cũng có thể kéo thả thư mục `dist` lên Netlify Drop sau khi build, nhưng vẫn cần cấu hình biến môi trường và build lại khi đổi cấu hình; kết nối GitHub thuận tiện hơn.

## 4. Sử dụng

- Đăng ký một tài khoản bằng email và mật khẩu trong app, xác nhận email nếu Supabase yêu cầu, rồi đăng nhập.
- Nhập nhanh ví dụ: `Ăn sáng 35k`, `Đổ xăng 70 nghìn`, `Lương 15 triệu`.
- App nhận diện số tiền theo `k/nghìn/ngàn`, `triệu/tr`; từ khóa thu nhập như `lương`, `thưởng`, `nhận`, `thu` sẽ được phân loại là khoản thu. Các trường hợp khác mặc định là khoản chi.
- Có thể sửa loại giao dịch, nội dung, số tiền, danh mục và ngày; lọc theo ngày/khoảng ngày, loại giao dịch và tìm kiếm.

## Lưu ý về phân loại tự động

Bản hiện tại phân loại bằng bộ từ khóa tiếng Việt chạy ngay trong trình duyệt, không gửi nội dung giao dịch tới dịch vụ AI bên ngoài. Đây là cách đơn giản, nhanh và không phát sinh phí AI; các khoản không rõ nghĩa sẽ vào nhóm **Khác** để bạn có thể chỉnh sửa. Có thể mở rộng sang AI sau này nếu muốn.

## Đồng bộ và bảo mật

- Supabase là nơi lưu dữ liệu tập trung; Netlify chỉ lưu trữ website.
- Đăng nhập cùng email trên nhiều thiết bị để dùng chung dữ liệu.
- Realtime giúp màn hình đang mở nhận thay đổi từ thiết bị khác.
- Không chia sẻ mật khẩu; không đưa Supabase `service_role` key vào frontend. Chỉ dùng URL và public anon/publishable key cùng chính sách RLS trong file SQL.
