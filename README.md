# BizFlow 3D

Nền tảng hỗ trợ chuyển đổi số cho hộ kinh doanh với giao diện Web 3D tương tác.

## Công nghệ

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Kiến trúc:** Clean Architecture
- **Database:** PostgreSQL (Neon)
- **Cache:** Redis
- **ORM:** pg (native driver)
- **Xác thực:** JWT (jsonwebtoken)
- **Logging:** Winston
- **WebSocket:** Socket.IO

### Frontend
- **Framework:** Next.js (App Router)
- **UI Library:** Shadcn UI + Tailwind CSS
- **State Management:** Tanstack Query + Zustand
- **Form:** React Hook Form + Zod
- **Charts:** Recharts
- **3D:** Three.js (React Three Fiber + Drei)
- **HTTP Client:** Axios

### AI
- **NLP:** OpenAI GPT / Google Gemini
- **STT:** Google Speech-to-Text / Whisper

## Cấu trúc thư mục

```
bizflow-3d/
├── backend/           # Backend API (Clean Architecture)
│   └── src/
│       ├── core/      # Entities, Use Cases
│       ├── adapters/  # Controllers, Presenters, Middleware
│       ├── frameworks/# Database, Redis, WebSocket, Express
│       └── config/    # Environment config
├── frontend/          # Next.js Web App
│   └── src/
│       ├── app/       # App Router pages
│       ├── components/# UI Components
│       ├── lib/       # Utilities, API client
│       └── hooks/     # Custom hooks
├── docs/              # Documentation
├── scripts/           # Utility scripts
└── plan.md            # Development plan
```

## Cài đặt

### Yêu cầu
- Node.js >= 18
- PostgreSQL (Neon)
- Redis

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your config
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Tài liệu
- [Kế hoạch phát triển](plan.md)
- [Tài liệu API](docs/api.md)
