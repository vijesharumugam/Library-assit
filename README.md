# Library Assist

A full‑stack, role‑based Library Management web application with a modern React UI, Express/TypeScript API, MongoDB (via Prisma), session authentication, push notifications, and optional AI‑assisted search/chat.

## Features
- **Authentication & Roles**: Session-based auth (Passport Local) with `STUDENT`, `LIBRARIAN`, and `ADMIN` roles.
- **Books Management**: Create, update, delete, list, and bulk import from Excel/CSV.
- **Borrowing & Returns**: Track transactions, due dates, and returns; automatic availability updates.
- **Book Requests (Students)**: Students request books; librarians/admins approve/reject.
- **Extension Requests**: Students request due-date extensions; librarians/admins approve/reject with audit fields.
- **Notifications**: In‑app notifications and Web Push (with service worker) for due/overdue and admin messages.
- **AI Assistant**: Optional Gemini-powered intelligent search and student chat assistant.
- **Modern UI**: React 18, Vite, TailwindCSS, Radix UI, shadcn-style components.

## Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS, Radix UI components
- **Backend**: Node.js, Express, TypeScript, Passport (sessions), Web Push
- **Database**: MongoDB with Prisma ORM
- **AI (optional)**: Google Generative AI (Gemini)
- **Build/Tooling**: Vite, esbuild, TypeScript, PostCSS, Tailwind

## Project Structure
```
Library-assit/
├─ client/                # React app (Vite)
│  ├─ public/             # PWA assets, service worker
│  └─ src/                # Components, pages, hooks, lib
├─ server/                # Express API (TypeScript)
│  ├─ index.ts            # App bootstrap, vite/static in prod
│  ├─ routes.ts           # All REST routes
│  ├─ auth.ts             # Passport session auth
│  ├─ storage.ts          # Data access helpers
│  ├─ db.ts               # Prisma client init
│  ├─ push-service.ts     # Web Push helpers
│  ├─ ai-service.ts       # Gemini-backed chat/search helpers
│  └─ vite.ts             # Dev middleware/static serving
├─ shared/
│  └─ schema.ts           # Zod schemas & enums
├─ prisma/
│  └─ schema.prisma       # Prisma + MongoDB models
├─ package.json
├─ vite.config.ts         # Vite config (client build)
├─ tailwind.config.ts
├─ tsconfig.json
├─ render.yaml            # Render deployment definition
├─ .env                   # Local environment variables (not committed)
└─ README.md
```

## Requirements
- Node.js 18+ (recommended LTS)
- MongoDB connection (Atlas or local)

## Environment Variables
Create a `.env` in the project root (`Library-assit/.env`). Values below are examples; do not commit secrets.

```
# Server
NODE_ENV=development
PORT=5000
SESSION_SECRET=super-secret-change-me
COOKIE_DOMAIN=yourdomain.com          # only in production if using a custom domain

# Database (Prisma MongoDB)
MONGODB_URI=mongodb+srv://user:pass@cluster/dbname?retryWrites=true&w=majority

# Web Push (for notifications)
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:admin@yourdomain.com

# Google Gemini (optional AI features)
GEMINI_API_KEY=your_gemini_api_key
```

Notes:
- `SESSION_SECRET` is required; the server will throw if missing.
- `COOKIE_DOMAIN` should be set in production if you use a custom domain and HTTPS.
- Push notifications require valid VAPID keys and HTTPS in production.
- AI features are optional; without `GEMINI_API_KEY`, the app uses enhanced text search fallbacks.

## Installation
```
npm install
```

## Development
Runs the API and serves the client via Vite middleware in development.
```
# Start dev server
npm run dev

# Type checks
npm run check
```
The server will bind to `PORT` (default 5000). In dev, Vite is attached for hot reloading.

## Build & Production
```
# Build client (Vite) and server (esbuild)
npm run build

# Start production server (serves API + built client)
npm start
```
The production server serves static assets for the built client and exposes the REST API on the same port.

## Database
- Prisma is configured for MongoDB. Ensure `MONGODB_URI` is set before running the app.
- Prisma client is initialized in `server/db.ts`; connections are gracefully closed on exit.

## Authentication
- Local username/password with Passport sessions.
- Registration: `POST /api/register`
- Login: `POST /api/login`
- Logout: `POST /api/logout`
- Current user: `GET /api/user`

## Key Endpoints (Overview)
- **Books**
  - `GET /api/books` (auth)
  - `GET /api/books/available` (auth)
  - `POST /api/books` (librarian/admin)
  - `PUT /api/books/:id` (librarian/admin)
  - `DELETE /api/books/:id` (librarian/admin)
  - `POST /api/books/bulk-upload` (librarian/admin) — multipart file upload (.xlsx/.xls/.csv)
  - `GET /api/books/search/intelligent?query=...` (auth) — enhanced text search (Gemini optional)
- **Transactions**
  - `GET /api/transactions` (librarian/admin)
  - `GET /api/transactions/active` (librarian/admin)
  - `GET /api/transactions/user/:userId` (auth with access control)
  - `GET /api/transactions/my` (auth)
  - `POST /api/transactions/borrow` (librarian/admin)
  - `POST /api/transactions/:id/return` (librarian/admin)
- **Book Requests (Students)**
  - `POST /api/book-requests` (student)
  - `GET /api/book-requests/my` (student)
  - `GET /api/book-requests` (librarian/admin)
  - `GET /api/book-requests/pending` (librarian/admin)
  - `POST /api/book-requests/:id/approve` (librarian/admin)
  - `POST /api/book-requests/:id/reject` (librarian/admin)
- **Extension Requests**
  - `POST /api/extension-requests` (student)
  - `GET /api/extension-requests/my` (student)
  - `GET /api/extension-requests` (librarian/admin)
  - `GET /api/extension-requests/pending` (librarian/admin)
  - `POST /api/extension-requests/:id/approve` (librarian/admin)
  - `POST /api/extension-requests/:id/reject` (librarian/admin)
- **Notifications & Push**
  - `GET /api/notifications` (auth)
  - `POST /api/notifications` (librarian/admin) — also sends push when configured
  - `PUT /api/notifications/:id/read` (auth)
  - `PUT /api/notifications/read-all` (auth)
  - `DELETE /api/notifications/clear-all` (auth)
  - `POST /api/push/subscribe` (auth)
  - `DELETE /api/push/unsubscribe/:id` (auth)
  - `GET /api/push/vapid-public-key` (public)
- **AI Chat (Students)**
  - `POST /api/ai-chat` (student)
  - `DELETE /api/ai-chat/history` (student)

## Bulk Upload Format
Upload an Excel/CSV with headers that map to the following (flexible):
- Required: `title`, `author`, `category`, `totalCopies`
- Optional: `isbn`, `description`, `publisher`
The importer accepts common variants like `Title`, `Author`, `ISBN Number`, `Total Copies`, etc., and validates with Zod.

## Push Notifications
- Service worker located at `client/public/sw.js`.
- Requires valid `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.
- Production requires HTTPS for push to work in most browsers.

## Deployment
- Render: `render.yaml`, `render-build.sh`, `start-render.js` provided. Configure env vars in your Render service (web service, Node).
- Ensure environment variables are set in your deployment provider (see above).

## Scripts (package.json)
- `npm run dev` — Start dev server (tsx + Vite middleware)
- `npm run build` — Build client (Vite) and server (esbuild)
- `npm start` — Run production server from `dist`
- `npm run check` — TypeScript checks

## Security Notes
- In production, cookies are `secure`, `sameSite=strict`, and the app trusts proxy headers.
- Do not log or commit secrets. Use your hosting provider’s secret manager.

## License
MIT
