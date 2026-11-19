# BizFlow 3D

BizFlow 3D là ứng dụng web hỗ trợ quản lý hoạt động kinh doanh cho hộ kinh doanh và cửa hàng bán lẻ. Hệ thống kết hợp các màn hình quản lý với không gian cửa hàng 3D tương tác, giúp người dùng bán hàng, theo dõi tồn kho, quản lý khách hàng, công nợ và báo cáo trên cùng một nền tảng.

## Chức năng chính

- **Cửa hàng 3D:** di chuyển giữa khu trưng bày, kho và văn phòng; tương tác với sản phẩm, quầy bán hàng và các cửa sổ nghiệp vụ trong không gian 3D.
- **Sản phẩm và danh mục:** quản lý thông tin, hình ảnh, đơn vị tính, giá bán và trạng thái sản phẩm.
- **Bán hàng:** tạo và xác nhận đơn hàng, theo dõi lịch sử đơn, xuất hóa đơn PDF; hỗ trợ tiền mặt, chuyển khoản và thanh toán qua Stripe.
- **Kho hàng:** nhập kho, xem tồn kho, lịch sử giao dịch và cảnh báo hàng sắp hết.
- **Khách hàng và công nợ:** quản lý hồ sơ, hạn mức tín dụng, thời hạn thanh toán, ghi nhận thu nợ và lịch sử thanh toán.
- **Báo cáo và kế toán:** thống kê doanh thu, sản phẩm bán chạy, công nợ; ghi sổ tự động, lập báo cáo tài chính và đối soát dữ liệu kế toán.
- **Nhân viên:** tạo tài khoản, đặt lại mật khẩu, thay đổi trạng thái và phân quyền theo vai trò.
- **Quản trị nền tảng:** quản lý cửa hàng, gói đăng ký, thông báo, cấu hình và thống kê hệ thống.
- **Thời gian thực:** đồng bộ các thay đổi nghiệp vụ và thông báo qua Socket.IO.

## Vai trò người dùng

| Vai trò | Phạm vi sử dụng |
| --- | --- |
| `admin` | Quản trị cửa hàng trên nền tảng, gói đăng ký, thông báo và thống kê hệ thống. |
| `owner` | Quản lý hoạt động cửa hàng, sản phẩm, kho, khách hàng, nhân viên, báo cáo và kế toán. |
| `employee` | Sử dụng cửa hàng 3D, tạo và xem đơn hàng, quản lý khách hàng trong phạm vi được cấp quyền. |

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Giao diện | Tailwind CSS 4, Radix UI, Lucide, Motion |
| Không gian 3D | Three.js, React Three Fiber, Drei, React Spring |
| Dữ liệu và biểu mẫu | TanStack Query, Zustand, Axios, React Hook Form, Zod |
| Biểu đồ và xuất dữ liệu | Recharts, jsPDF, SheetJS (`xlsx`) |
| Backend | Node.js, Express 5, TypeScript |
| Cơ sở dữ liệu | PostgreSQL, truy vấn SQL qua driver `pg` |
| Cache và xác thực | Redis, JWT, bcryptjs |
| Thời gian thực | Socket.IO |
| Tích hợp | Cloudinary cho hình ảnh, Stripe cho thanh toán |

Backend tổ chức theo Clean Architecture: `core` chứa nghiệp vụ và các interface repository; `adapters` xử lý HTTP và kiểm tra đầu vào; `frameworks` triển khai cơ sở dữ liệu, cache, thanh toán và máy chủ. Các thành phần được kết nối tại `backend/src/config/diContainer.ts`.

## Cấu trúc dự án

```text
BizFlow-3D/
├── backend/
│   ├── src/
│   │   ├── core/                 # Entities, use cases, repository interfaces
│   │   ├── adapters/             # Controllers, middleware, validators
│   │   ├── frameworks/
│   │   │   ├── database/         # PostgreSQL, migrations, seed, repositories
│   │   │   ├── express/          # HTTP server và API routes
│   │   │   ├── redis/            # Cache và refresh token
│   │   │   ├── websocket/        # Socket.IO và sự kiện nghiệp vụ
│   │   │   ├── payment/          # Stripe
│   │   │   └── services/         # Cloudinary
│   │   └── config/               # Cấu hình và dependency injection
│   ├── tests/
│   └── .env.example
├── frontend/
│   ├── public/                   # Tài nguyên tĩnh và font chữ
│   └── src/
│       ├── app/                  # Đăng nhập, đăng ký và các trang quản lý
│       ├── components/           # UI, layout, không gian và biểu đồ 3D
│       ├── hooks/                # Truy vấn dữ liệu và kết nối thời gian thực
│       ├── lib/                  # API client, phiên đăng nhập, xuất báo cáo
│       ├── stores/               # Trạng thái xác thực
│       └── config/               # Điều hướng theo vai trò
└── README.md
```

## Cài đặt và chạy cục bộ

### 1. Chuẩn bị

- Node.js và npm; khuyến nghị Node.js 22 LTS.
- PostgreSQL hỗ trợ kết nối SSL, chẳng hạn Neon. Mã kết nối hiện bật SSL cho cả môi trường phát triển.
- Redis đang chạy và có URL kết nối.
- Trình duyệt hỗ trợ WebGL để sử dụng không gian 3D.
- Tài khoản Cloudinary nếu cần tải ảnh; khóa Stripe nếu cần thử thanh toán Stripe.

Cài dependency riêng cho từng ứng dụng từ thư mục gốc:

```bash
npm --prefix backend install
npm --prefix frontend install
```

`package.json` ở thư mục gốc không khai báo npm workspaces hay lệnh chạy chung cho hai ứng dụng.

### 2. Cấu hình backend

Sao chép [backend/.env.example](backend/.env.example) thành `backend/.env`. Với PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

Chỉnh các giá trị trong `backend/.env` theo môi trường của bạn:

```dotenv
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/bizflow?sslmode=require
REDIS_URL=redis://localhost:6379

JWT_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-another-long-random-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug
LOW_STOCK_THRESHOLD=10
```

Dùng hai khóa JWT riêng biệt do bạn tự tạo. File `.env` được bỏ qua bởi Git; không đưa thông tin kết nối hoặc khóa bí mật vào mã nguồn.

Các biến tích hợp bổ sung:

| Biến | Mục đích |
| --- | --- |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Thông tin kết nối Cloudinary để tải ảnh. |
| `CLOUDINARY_FOLDER` | Thư mục ảnh, mặc định `bizflow/products`. |
| `STRIPE_SECRET_KEY` | Khóa bí mật Stripe; dùng khóa test khi phát triển. |
| `STRIPE_WEBHOOK_SECRET` | Khóa xác minh webhook Stripe. |
| `STRIPE_CURRENCY` | Loại tiền tệ, mặc định `vnd`. |

Webhook Stripe nhận yêu cầu tại `POST /api/v1/webhooks/stripe`. Khi thử thanh toán cục bộ, cần chuyển tiếp webhook về backend để hệ thống nhận kết quả thanh toán.

### 3. Cấu hình frontend

Tạo file `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

URL API bao gồm `/api/v1`; URL Socket.IO là địa chỉ gốc của backend. Khởi động lại frontend sau khi đổi cấu hình môi trường.

### 4. Khởi tạo cơ sở dữ liệu

Tạo cơ sở dữ liệu PostgreSQL và điền đúng `DATABASE_URL`, sau đó chạy:

```bash
npm --prefix backend run migrate
npm --prefix backend run seed
```

Migration thực thi các file SQL trong `backend/src/frameworks/database/migrations/` theo thứ tự tên file. Trình chạy hiện không lưu lịch sử migration và sẽ đọc lại toàn bộ file mỗi lần chạy. Nên thực hiện lần đầu trên cơ sở dữ liệu phát triển trống. Seed là bước tùy chọn để tạo cấu hình, tài khoản, cửa hàng và danh mục mẫu; chạy lại có thể tạo thêm dữ liệu.

Tài khoản phát triển sau khi seed thành công:

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Quản trị viên | `admin@bizflow.com` | `Admin@123` |
| Chủ cửa hàng mẫu | `owner@bizflow.com` | `Admin@123` |

Đây là tài khoản mẫu cho môi trường phát triển. Thay mật khẩu nếu sử dụng trên môi trường được chia sẻ. Bạn cũng có thể tạo cửa hàng qua trang `/register`.

### 5. Chạy ứng dụng

Mở hai terminal riêng từ thư mục gốc.

**Terminal backend:**

```bash
npm --prefix backend run dev
```

**Terminal frontend:**

```bash
npm --prefix frontend run dev
```

Truy cập:

- Giao diện: [http://localhost:3000](http://localhost:3000).
- Đăng nhập: [http://localhost:3000/login](http://localhost:3000/login).
- Kiểm tra HTTP backend: [http://localhost:3001/health](http://localhost:3001/health).
- API base URL: `http://localhost:3001/api/v1`.

Endpoint `/health` trả về trạng thái HTTP của ứng dụng; không thay thế việc kiểm tra kết nối PostgreSQL và Redis.

## Kiểm tra và build

Chạy các lệnh sau từ thư mục gốc:

| Lệnh | Mục đích |
| --- | --- |
| `npm --prefix frontend test` | Kiểm thử logic 3D, hooks và các hàm hỗ trợ. |
| `npm --prefix frontend run typecheck` | Kiểm tra kiểu TypeScript của frontend. |
| `npm --prefix backend run test:realtime` | Chạy các file `backend/tests/*.test.ts` bằng Node test runner qua `tsx`, bao gồm cả kiểm thử kế toán. |
| `npm --prefix backend run test:accounting` | Chạy riêng các kiểm thử kế toán. |
| `npm --prefix frontend run build` | Build ứng dụng Next.js. |
| `npm --prefix backend run build` | Biên dịch backend sang thư mục `backend/dist/`. |

Kiểm thử tích hợp PostgreSQL trong `accounting-database.test.ts` mặc định được bỏ qua. Để bật, đặt `RUN_ACCOUNTING_DB_TESTS=1` và cấu hình `DATABASE_URL` trỏ tới cơ sở dữ liệu kiểm thử đã migrate; tài khoản kết nối cần quyền tạo schema.

**Lưu ý về script hiện có:** backend khai báo `start` là `node dist/index.js`, trong khi entry point theo cấu trúc biên dịch là `dist/frameworks/express/index.js`. Frontend khai báo `lint` là `next lint`; với cấu hình ESLint hiện có, có thể chạy trực tiếp `npx eslint .` trong thư mục `frontend`. Cần kiểm tra và điều chỉnh các script này trước khi dùng trong quy trình triển khai hoặc CI.

## Tra cứu API và nghiệp vụ

Các route được khai báo tại `backend/src/frameworks/express/routes/` và gắn dưới tiền tố `/api/v1`:

| Nhóm route | Nội dung |
| --- | --- |
| `/auth` | Đăng ký, đăng nhập và quản lý phiên. |
| `/products`, `/inventory` | Sản phẩm, danh mục và kho hàng. |
| `/orders`, `/customers`, `/debts` | Bán hàng, khách hàng và công nợ. |
| `/reports`, `/accounting` | Thống kê và kế toán. |
| `/stores`, `/employees` | Cửa hàng và nhân viên. |
| `/admin`, `/announcements` | Quản trị nền tảng và thông báo. |
| `/upload`, `/webhooks` | Tải tệp và tiếp nhận webhook. |

Các API yêu cầu đăng nhập sử dụng header `Authorization: Bearer <access_token>`. Quyền truy cập được kiểm tra tại middleware và các route tương ứng.

Để tìm hiểu một luồng nghiệp vụ, bắt đầu từ route, theo controller trong `backend/src/adapters/controllers/`, sau đó đến use case trong `backend/src/core/usecases/`. Giao diện tương ứng nằm trong `frontend/src/app/` và các hook gọi API trong `frontend/src/hooks/`.
