# ETUDE Panel

پنل هنرجویان آموزشگاه موسیقی **اتود** — ساخته‌شده با Next.js، TypeScript و Tailwind CSS.

## ویژگی‌ها

- فرم ورود حرفه‌ای با نام کاربری و رمز عبور (صفحه اصلی `/`)
- داشبورد هنرجو با تم رنگی لوگو اتود (`#0047FF`)
- بخش‌های دوره‌ها، برنامه کلاس‌ها و پروفایل
- داده و احراز هویت فعلاً **استاتیک** (localStorage)
- انیمیشن با Motion، فرم با React Hook Form + Zod

## اجرای پروژه

```bash
npm install
npm run dev
```

باز کردن: [http://localhost:3000](http://localhost:3000)

### ورود دمو

- نام کاربری: `student`
- رمز عبور: `etude123`

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
- Radix UI primitives
- Lucide icons
- Motion
- React Hook Form + Zod
- Vazirmatn + Outfit fonts
