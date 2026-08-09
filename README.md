# ETUDE Panel

پنل هنرجویان آموزشگاه موسیقی **اتود**.

## ساختار

```
etude-panel/
├── front-end/   # Next.js student panel
└── backend/     # NestJS REST API + Prisma + PostgreSQL
```

## Frontend

```bash
cd front-end
npm install
cp .env.example .env.local
npm run dev
```

- App: http://localhost:3000
- نیاز به Backend روی `NEXT_PUBLIC_API_URL` (پیش‌فرض `http://localhost:4000/api/v1`)

### ورود دمو (پس از seed)

- نام: `آوا`
- نام خانوادگی: `محمدی`
- رمز: `etudepiano123`

## Backend

مستندات کامل: [backend/README.md](backend/README.md)

```bash
cd backend
npm install
cp .env.example .env
# PostgreSQL لازم است (Docker Compose داخل backend)
npm run db:up
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

- API: http://localhost:4000/api/v1
- Swagger: http://localhost:4000/docs
