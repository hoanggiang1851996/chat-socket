# SupaChat 💬

Web chat real-time với bạn bè, thả icon troll, dùng full Supabase.
Không cần email — nhập biệt danh là chat luôn (Supabase Anonymous Auth).

## Tính năng
- Nhập biệt danh + chọn avatar emoji là vào chat
- Tìm & kết bạn theo biệt danh
- Chat 1-1 real-time (Supabase Realtime)
- Emoji picker + thả reaction troll vào từng tin nhắn 🤡💩
- Hiển thị trạng thái online

## Cài đặt Supabase (bắt buộc)
1. Tạo project tại https://supabase.com
2. Vào **SQL Editor**, dán toàn bộ nội dung `supabase-schema.sql` và Run
3. Bật đăng nhập ẩn danh: **Authentication → Sign In / Providers → Anonymous → Enable**
4. Lấy khóa ở **Project Settings → API**:
   - `Project URL`
   - `anon public key`
5. Tạo file `.env` (copy từ `.env.example`) và điền:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

## Chạy app
Máy này dùng Node 18 ở ổ D. Chạy nhanh bằng:
```
dev.bat
```
Hoặc thủ công:
```
npm install
npm run dev
```
Mở http://localhost:5173

## Test chat với "bạn bè"
Mở 2 cửa sổ trình duyệt (1 thường + 1 ẩn danh), mỗi bên nhập 1 biệt danh khác nhau,
tìm nhau qua ô tìm kiếm, kết bạn → chấp nhận → chat real-time.
