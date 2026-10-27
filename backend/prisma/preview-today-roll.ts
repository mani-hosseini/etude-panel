import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TODAY = 'سه‌شنبه';

async function main() {
  const course = await prisma.course.findFirst({
    where: {
      OR: [{ slug: 'piano-rashidian' }, { title: 'پیانو رشیدیان' }],
    },
    include: {
      lessons: true,
    },
  });
  if (!course) {
    throw new Error('دوره پیانو رشیدیان پیدا نشد.');
  }

  const days = Array.from(
    new Set([...(course.days ?? []), course.day, TODAY].filter(Boolean)),
  );
  await prisma.course.update({
    where: { id: course.id },
    data: { days, day: days.join('، ') },
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: course.id },
    select: { id: true, classDays: true },
  });
  for (const row of enrollments) {
    await prisma.enrollment.update({
      where: { id: row.id },
      data: {
        classDays: Array.from(
          new Set([...(row.classDays ?? []), ...days, TODAY]),
        ),
      },
    });
  }

  const sourceLesson =
    course.lessons.find((item) => item.day === 'دوشنبه') ?? course.lessons[0];
  const hasTodayLesson = course.lessons.some((item) => item.day === TODAY);
  if (sourceLesson && !hasTodayLesson) {
    await prisma.scheduleLesson.create({
      data: {
        courseId: course.id,
        title: sourceLesson.title,
        teacher: sourceLesson.teacher,
        day: TODAY,
        dateLabel: 'پیش‌نمایش امروز',
        time: sourceLesson.time,
        room: sourceLesson.room,
        type: sourceLesson.type,
        duration: sourceLesson.duration,
        note: 'دیتای موقت برای دیدن رول امروز',
        status: sourceLesson.status,
        sortOrder: sourceLesson.sortOrder,
      },
    });
  }

  const after = await prisma.course.findUnique({
    where: { id: course.id },
    select: {
      title: true,
      days: true,
      _count: { select: { enrollments: true } },
      lessons: { select: { day: true, title: true } },
    },
  });
  console.log(JSON.stringify(after, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
