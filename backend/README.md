# Etude Panel API

Backend Production-Ready برای پنل هنرجویی اتود (NestJS + PostgreSQL + Prisma).

## Stack

- Node.js + TypeScript (strict)
- NestJS 11
- PostgreSQL 16
- Prisma 6
- JWT (Access + Refresh)
- Argon2
- Swagger / OpenAPI
- Helmet, CORS, Rate Limiting
- Pino logging

## Quick Start

### 1) Prerequisites

- Node.js 20+
- Docker (برای PostgreSQL)

### 2) Install

```bash
cd backend
npm install
cp .env.example .env
```

### 3) Database

```bash
npm run db:up
npx prisma migrate dev --name init
npm run prisma:seed
```

یا یکجا:

```bash
npm run setup
```

> اگر migrate قبلاً ساخته شده: `npm run prisma:migrate:deploy && npm run prisma:seed`

### 4) Development

```bash
npm run start:dev
```

- API: `http://localhost:4000/api/v1`
- Health: `http://localhost:4000/api/v1/health`
- Swagger: `http://localhost:4000/docs`

### 5) Production

```bash
npm run build
npm run prisma:migrate:deploy
npm run start:prod
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Access token secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token secret (min 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | e.g. `7d` |
| `PORT` | Default `4000` |
| `CORS_ORIGIN` | Comma-separated origins |
| `SEED_ADMIN_EMAIL` | Seed admin email |
| `SEED_ADMIN_PASSWORD` | Seed admin password |
| `SEED_STUDENT_PASSWORD` | Seed student password |

## Seed Accounts

After seeding:

- **Student login (matches frontend form):**
  - firstName: `آوا`
  - lastName: `محمدی`
  - password: `etudepiano123` (or `SEED_STUDENT_PASSWORD`)
- **Admin:**
  - email: `admin@etude.academy`
  - password: `AdminEtude!2026` (or env overrides)

## Main Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | ثبت‌نام هنرجو |
| POST | `/auth/login` | Public | Student login |
| POST | `/auth/admin/login` | Public | Admin login |
| POST | `/auth/refresh` | Public | Refresh tokens |
| POST | `/auth/logout` | Bearer | Logout |
| GET | `/auth/me` | Bearer | Current user |
| POST | `/auth/register/student` | Admin | Create student |
| GET | `/dashboard` | Bearer | Multi-course dashboard |
| GET | `/courses` | Bearer | Enrolled courses |
| GET | `/courses/:id` | Bearer | Course detail |
| GET | `/sessions?courseId=` | Bearer | Sessions for a course |
| GET | `/sessions/:id` | Bearer | Session detail |
| GET | `/sessions/:id/slides` | Bearer | Slides (available only) |
| GET | `/schedule?courseId=` | Bearer | Schedule |
| GET | `/profile` | Bearer | Student profile |
| GET | `/users` | Admin | لیست کاربران |
| GET | `/users/stats` | Admin | آمار کاربران |
| GET | `/users/:id` | Admin | جزئیات کاربر |
| PATCH | `/users/:id` | Admin | ویرایش کاربر |
| POST | `/users/:id/reset-password` | Admin | ریست رمز |
| POST | `/users/:id/activate` | Admin | فعال‌سازی |
| POST | `/users/:id/deactivate` | Admin | غیرفعال‌سازی |
| POST | `/users/:id/enrollments` | Admin | ثبت در دوره |
| DELETE | `/users/:id/enrollments/:courseId` | Admin | حذف از دوره |
| GET | `/health` | Public | Health check |

Response envelope:

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 10 }
}
```

## Testing

```bash
npm test
```

## Frontend Integration

Frontend should call API with:

```
Authorization: Bearer <accessToken>
```

Set in frontend:

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Login body matches current UI:

```json
{
  "firstName": "آوا",
  "lastName": "محمدی",
  "password": "etudepiano123"
}
```

Session fields returned as `session.firstName/lastName/displayName/loggedInAt` for drop-in compatibility.
