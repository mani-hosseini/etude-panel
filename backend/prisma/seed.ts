import {
  CourseStatus,
  LessonStatus,
  PrismaClient,
  Role,
  SessionStatus,
  SlideKind,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { slides as session1Slides } from './data/session-1-slides';

const prisma = new PrismaClient();

function mapKind(kind?: string): SlideKind {
  switch (kind) {
    case 'cover':
      return SlideKind.COVER;
    case 'visual':
      return SlideKind.VISUAL;
    case 'outro':
      return SlideKind.OUTRO;
    default:
      return SlideKind.LESSON;
  }
}

async function main() {
  const adminEmail =
    process.env.SEED_ADMIN_EMAIL?.toLowerCase() ?? 'admin@etude.academy';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'AdminEtude!2026';

  await prisma.refreshToken.deleteMany();
  await prisma.sessionProgress.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.slide.deleteMany();
  await prisma.scheduleLesson.deleteMany();
  await prisma.practiceTip.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.courseSession.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const adminHash = await argon2.hash(adminPassword);

  await prisma.user.create({
    data: {
      firstName: 'مدیر',
      lastName: 'سیستم',
      displayName: 'مدیر سیستم',
      email: adminEmail,
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  const theory = await prisma.course.create({
    data: {
      slug: 'theory-basics',
      title: 'مستر کلاس تئوری موسیقی',
      subtitle: 'حامل، کلید سل، ارزش زمانی و میزان‌های ساده',
      instrument: 'تئوری',
      teacher: 'استاد بهرام دهقانیار',
      teacherShort: 'بهرام دهقانیار',
      day: 'پنج‌شنبه',
      time: '۱۱ تا ۱۳',
      timeShort: '۱۱ تا ۱۳',
      duration: '۱۲۰ دقیقه',
      room: 'سالن اصلی اتود',
      level: '',
      focus: 'حامل، کلید سل، ارزش زمانی و میزان‌های ساده',
      sessionsTotal: 10,
      weeklyHours: 2,
      status: CourseStatus.ACTIVE,
      certificateReady: false,
      accessNote: 'مخصوص هنرجویان ثبت‌نام‌شده آموزشگاه اتود',
      sortOrder: 1,
      isActive: true,
    },
  });

  const piano = await prisma.course.create({
    data: {
      slug: 'piano-beginner',
      title: 'پیانو مبتدی',
      subtitle: 'تکنیک پایه، دست‌گذاری و قطعات ساده',
      instrument: 'پیانو',
      teacher: 'استاد مریم نوری',
      teacherShort: 'مریم نوری',
      day: 'سه‌شنبه',
      time: '۱۶:۰۰ — ۱۷:۳۰',
      timeShort: '۱۶ تا ۱۷:۳۰',
      duration: '۹۰ دقیقه',
      room: 'کلاس پیانو ۱',
      level: 'مبتدی',
      focus: 'وضعیت نشستن، انگشت‌گذاری و ریتم ساده',
      sessionsTotal: 12,
      weeklyHours: 2,
      status: CourseStatus.ACTIVE,
      certificateReady: false,
      sortOrder: 2,
      isActive: true,
    },
  });

  const solfege = await prisma.course.create({
    data: {
      slug: 'solfege-intro',
      title: 'سلفژ مقدماتی',
      subtitle: 'شنوایی، خواندن نت و هماهنگی صدا',
      instrument: 'سلفژ',
      teacher: 'استاد کیان رضایی',
      teacherShort: 'کیان رضایی',
      day: 'یکشنبه',
      time: '۱۰:۰۰ — ۱۱:۰۰',
      timeShort: '۱۰ تا ۱۱',
      duration: '۶۰ دقیقه',
      room: 'کلاس گروهی',
      level: 'مقدماتی',
      focus: 'فاصله‌ها و خواندن ملودی ساده',
      sessionsTotal: 8,
      weeklyHours: 1,
      status: CourseStatus.UPCOMING,
      certificateReady: false,
      sortOrder: 3,
      isActive: true,
    },
  });

  // فعلاً هنرجوی تست ساخته نمی‌شود — ثبت‌نام از فرانت

  const theorySessions = [];
  for (let number = 1; number <= 10; number++) {
    const session = await prisma.courseSession.create({
      data: {
        courseId: theory.id,
        number,
        title: number === 1 ? 'پایه‌های نت‌خوانی و ریتم' : '',
        summary:
          number === 1
            ? 'آشنایی با ارتعاش و صدا، حامل، کلید سل، نت‌خوانی، علائم تغییردهنده، ارزش زمانی و میزان‌نما.'
            : 'محتوای این جلسه پس از برگزاری کلاس فعال می‌شود.',
        topics:
          number === 1
            ? [
                'صدا و ارتعاش',
                'حامل و کلید سل',
                'نت‌خوانی روی خط و بین خط',
                'ریتم و میزان‌نما',
              ]
            : [],
        status:
          number === 1
            ? SessionStatus.AVAILABLE
            : number === 2
              ? SessionStatus.UPCOMING
              : SessionStatus.LOCKED,
        durationLabel: '۱۲۰ دقیقه',
        dateLabel:
          number === 1
            ? '۱۴۰۵/۰۵/۱۵'
            : number === 2
              ? 'پنج‌شنبهٔ بعد'
              : 'قفل',
      },
    });
    theorySessions.push(session);
  }

  await prisma.slide.createMany({
    data: session1Slides.map((slide, index) => ({
      sessionId: theorySessions[0]!.id,
      sourceId: slide.id,
      sortOrder: index + 1,
      chapter: slide.chapter,
      title: slide.title,
      goal: slide.goal,
      body: slide.body,
      bullets: slide.bullets,
      terms: slide.terms,
      mistakes: slide.mistakes,
      imageHint: slide.imageHint,
      imageId: slide.imageId,
      funFact: slide.funFact,
      kind: mapKind(slide.kind),
    })),
  });

  await prisma.scheduleLesson.createMany({
    data: theorySessions.map((session, index) => {
      const number = index + 1;
      const status =
        number === 1
          ? LessonStatus.DONE
          : number === 2
            ? LessonStatus.NEXT
            : LessonStatus.PLANNED;
      const ordinals = [
        '',
        'اول',
        'دوم',
        'سوم',
        'چهارم',
        'پنجم',
        'ششم',
        'هفتم',
        'هشتم',
        'نهم',
        'دهم',
      ];
      const ordinal = ordinals[number] ?? String(number);
      return {
        courseId: theory.id,
        sessionId: session.id,
        title: session.title
          ? `جلسهٔ ${ordinal} — ${session.title}`
          : `جلسهٔ ${ordinal}`,
        teacher: theory.teacher,
        day: theory.day,
        dateLabel: session.dateLabel,
        time: theory.time,
        room: theory.room,
        duration: theory.duration,
        note:
          status === LessonStatus.DONE
            ? 'برگزار شده · اسلایدها آماده است'
            : status === LessonStatus.NEXT
              ? 'محتوا پس از برگزاری جلسه فعال می‌شود'
              : 'برنامهٔ آینده',
        status,
        sortOrder: number,
      };
    }),
  });

  await prisma.scheduleLesson.create({
    data: {
      courseId: piano.id,
      title: 'پیانو — تمرین دست راست',
      teacher: piano.teacher,
      day: piano.day,
      dateLabel: 'این هفته',
      time: piano.time,
      room: piano.room,
      duration: piano.duration,
      note: 'تمرکز روی انگشت‌گذاری',
      status: LessonStatus.NEXT,
      sortOrder: 1,
      type: 'PRIVATE',
    },
  });

  for (let number = 1; number <= 12; number++) {
    await prisma.courseSession.create({
      data: {
        courseId: piano.id,
        number,
        title: number === 1 ? 'آشنایی با کیبورد و وضعیت نشستن' : '',
        summary:
          number === 1
            ? 'وضعیت بدن، دست‌گذاری و نت‌های سفید میانی.'
            : 'محتوای این جلسه پس از برگزاری کلاس فعال می‌شود.',
        topics:
          number === 1 ? ['وضعیت نشستن', 'انگشت‌گذاری', 'نت‌های سفید'] : [],
        status: number === 1 ? SessionStatus.UPCOMING : SessionStatus.LOCKED,
        durationLabel: '۹۰ دقیقه',
        dateLabel: number === 1 ? 'سه‌شنبهٔ جاری' : 'قفل',
      },
    });
  }

  for (let number = 1; number <= 8; number++) {
    await prisma.courseSession.create({
      data: {
        courseId: solfege.id,
        number,
        title: '',
        summary: 'این دوره به‌زودی آغاز می‌شود.',
        topics: [],
        status: SessionStatus.LOCKED,
        durationLabel: '۶۰ دقیقه',
        dateLabel: 'به‌زودی',
      },
    });
  }

  await prisma.practiceTip.createMany({
    data: [
      {
        courseId: theory.id,
        text: 'اسلایدهای جلسهٔ اول تئوری را یک‌بار مرور کنید.',
        sortOrder: 1,
      },
      {
        courseId: theory.id,
        text: 'نام نت‌های روی خط و بین خط را بلند تکرار کنید.',
        sortOrder: 2,
      },
      {
        courseId: piano.id,
        text: 'هر روز ۱۰ دقیقه فقط روی وضعیت دست و انگشت‌گذاری کار کنید.',
        sortOrder: 1,
      },
    ],
  });

  await prisma.achievement.createMany({
    data: [
      {
        code: 'joined',
        title: 'عضویت در اتود',
        description: 'ثبت‌نام در پنل هنرجویی آموزشگاه موسیقی اتود',
      },
      {
        code: 'a2',
        title: 'اولین جلسه برگزار شد',
        description: 'شروع مسیر یادگیری با جلسهٔ اول تئوری',
      },
      {
        code: 'a3',
        title: 'هنرجوی فعال',
        description: 'دسترسی به دوره‌های ثبت‌شده در پنل',
      },
    ],
  });

  console.log('Seed completed:');
  console.log(`  Admin: ${adminEmail}`);
  console.log(`  Master class course (admin grants access): ${theory.slug} (${theory.teacher})`);
  console.log(`  No demo student — register from frontend`);
  console.log(`  Theory slides: ${session1Slides.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
