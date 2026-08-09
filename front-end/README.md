# ETUDE Panel (Frontend)

پنل هنرجویان آموزشگاه موسیقی **اتود** — Next.js + TypeScript + Tailwind.

## پیش‌نیاز

Backend باید در حال اجرا باشد:

```bash
cd ../backend
npm run start:dev
```

## اجرا

```bash
npm install
cp .env.example .env.local
npm run dev
```

باز کردن: [http://localhost:3000](http://localhost:3000)

### ورود دمو (پس از seed)

- نام: `آوا`
- نام خانوادگی: `محمدی`
- رمز: `etudepiano123`

یا از `/register` حساب جدید بسازید.

Auth از طریق REST API (`NEXT_PUBLIC_API_URL`) انجام می‌شود.

## اسکریپت‌ها

| دستور | توضیح |
| --- | --- |
| `npm run dev` | سرور توسعه |
| `npm run build` | بیلد production |
| `npm run start` | اجرای بیلد |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## استک

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- React Hook Form + Zod
- Motion
