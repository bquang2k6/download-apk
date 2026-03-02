# 📦 Locket Wan – Download APK Server

Hệ thống website download APK sử dụng **Node.js + Express + Google Drive API**.  
Giao diện giống Google Drive, hỗ trợ desktop + mobile, filter file, breadcrumb và download trực tiếp từ Google Drive.

---

## 🚀 Tính năng chính

### 📂 File Explorer
- Liệt kê file & thư mục từ Google Drive
- Breadcrumb điều hướng thư mục
- Sắp xếp: thư mục trước, file sau
- Hiển thị:
  - Tên
  - Ngày cập nhật
  - Dung lượng
  - Tác vụ tải

---

### 📱 Mobile UI nâng cao
- Thanh filter theo loại file:
  - APK
  - Ảnh
  - Video
  - Âm nhạc
  - Tài liệu
  - File nén
  - Code
  - Exe/App
- Chip hiển thị số lượng file
- Icon riêng theo từng loại
- Responsive tối ưu điện thoại

---

### 🔐 Bảo mật
- Chỉ cho phép truy cập file trong `FIXED_FOLDER_ID`
- Kiểm tra cha thư mục (recursive check)
- Không lộ toàn bộ Google Drive
- Download stream trực tiếp từ Drive (không redirect link ngoài)

---

### 📘 Trang hướng dẫn cài đặt

Trang riêng `/huong-dan.html`:
- Hướng dẫn cài file APK Android
- Có hình minh hoạ từng bước
- Nút quay lại trang chủ

---

## 🏗 Kiến trúc hệ thống

```
├── public/
│   ├── index.html        # File Explorer chính
│   ├── huong-dan.html    # Hướng dẫn cài APK
│   └── assets...
│
├── server.js             # Express + Google Drive API
├── package.json
├── .env
└── README.md
```

---

## ⚙️ Yêu cầu

- Node.js >= 16
- Google Cloud Project
- Đã bật Google Drive API

---

## 🔑 Cấu hình Google Drive API

### 1️⃣ Tạo OAuth Client

1. Vào **Google Cloud Console**
2. Tạo Project mới
3. Vào **APIs & Services → Credentials**
4. Chọn **Create Credentials → OAuth Client ID**
5. Application type: **Web application**
6. Thêm Redirect URI:

```
https://developers.google.com/oauthplayground
```

Lưu lại:
- `CLIENT_ID`
- `CLIENT_SECRET`

---

### 2️⃣ Bật Google Drive API

Vào:

```
APIs & Services → Library
```

Enable:

```
Google Drive API
```

---

### 3️⃣ Lấy Refresh Token

1. Vào OAuth 2.0 Playground  
2. Tick **Use your own OAuth credentials**
3. Nhập `Client ID` & `Client Secret`
4. Scope:

```
https://www.googleapis.com/auth/drive
```

5. Authorize → Exchange token  
6. Copy **Refresh Token**

---

## 🔧 Environment Variables

Tạo file `.env`:

```env
YOUR_CLIENT_ID=xxxx
YOUR_CLIENT_SECRET=xxxx
YOUR_REDIRECT_URI=https://developers.google.com/oauthplayground
YOUR_REFRESH_TOKEN=xxxx
PORT=3001
```

---

## 🔒 Cấu hình Folder công khai

Trong `server.js`:

```js
const FIXED_FOLDER_ID = "YOUR_FOLDER_ID";
```

Chỉ các file bên trong folder này mới được truy cập.

---

## ▶️ Chạy dự án

```bash
npm install
npm start
```

Hoặc:

```bash
node server.js
```

Server chạy tại:

```
http://localhost:3001
```

---

## 🧠 Ghi chú

- Không public file `.env`
- Nên deploy bằng:
  - Render
  - Railway
  - VPS
- Không commit `CLIENT_SECRET` lên GitHub

---

## 📜 License

MIT License