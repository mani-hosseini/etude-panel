import { CourseStatus, PrismaClient, Role, SessionStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { uniqueSlug } from '../src/common/utils/slug';
import {
  RASHIDIAN_MONDAY_STUDENTS,
  RASHIDIAN_TEACHER,
} from './rashidian-monday';

const prisma = new PrismaClient();
const CLASS_DAYS = ['دوشنبه'];
const COURSE_TITLE = 'پیانو رشیدیان';

async function upsertTeacher() {
  const nationalId = RASHIDIAN_TEACHER.nationalId;
  const passwordHash = await argon2.hash(nationalId);
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { nationalId },
        {
          firstName: RASHIDIAN_TEACHER.firstName,
          lastName: RASHIDIAN_TEACHER.lastName,
        },
      ],
    },
  });
  if (existing && existing.role === Role.ADMIN) {
    throw new Error('Cannot overwrite admin account with teacher import');
  }
  const data = {
    firstName: RASHIDIAN_TEACHER.firstName,
    lastName: RASHIDIAN_TEACHER.lastName,
    displayName: `${RASHIDIAN_TEACHER.firstName} ${RASHIDIAN_TEACHER.lastName}`,
    nationalId,
    passwordHash,
    passwordPlain: nationalId,
    role: Role.TEACHER,
    title: RASHIDIAN_TEACHER.title,
    instrument: RASHIDIAN_TEACHER.instrument,
    isActive: true,
  };
  return existing
    ? prisma.user.update({ where: { id: existing.id }, data })
    : prisma.user.create({ data });
}

async function upsertCourse(teacher: {
  id: string;
  displayName: string;
  lastName: string;
}) {
  const existing = await prisma.course.findFirst({
    where: {
      OR: [
        { slug: 'پیانو-رشیدیان' },
        { slug: 'piano-rashidian' },
        { title: COURSE_TITLE, teacherId: teacher.id },
      ],
    },
  });
  const days = CLASS_DAYS;
  const payload = {
    title: COURSE_TITLE,
    subtitle: 'کلاس دوشنبه پیانو با استاد بابک رشیدیان',
    instrument: 'پیانو',
    teacher: `استاد ${teacher.displayName}`,
    teacherShort: teacher.lastName,
    day: days.join('، '),
    days,
    time: '۱۲:۳۰ تا ۲۱:۰۰',
    timeShort: '۱۲:۳۰ تا ۲۱',
    duration: '۳۰ دقیقه',
    room: 'آکادمی اتود',
    level: '',
    focus: 'کلاس خصوصی پیانو · دوشنبه',
    sessionsTotal: 8,
    weeklyHours: 2,
    status: CourseStatus.ACTIVE,
    isActive: true,
    teacherId: teacher.id,
  };
  const slug = await uniqueSlug(
    COURSE_TITLE,
    async (value) =>
      Boolean(
        await prisma.course.findFirst({
          where: {
            slug: value,
            ...(existing ? { NOT: { id: existing.id } } : {}),
          },
        }),
      ),
  );
  if (existing) {
    return prisma.course.update({
      where: { id: existing.id },
      data: { ...payload, slug },
    });
  }
  const course = await prisma.course.create({
    data: { ...payload, slug, sortOrder: 3 },
  });
  await prisma.courseSession.createMany({
    data: Array.from({ length: 8 }, (_, index) => ({
      courseId: course.id,
      number: index + 1,
      title: '',
      summary: 'محتوای این جلسه پس از برگزاری کلاس فعال می‌شود.',
      topics: [],
      status: index === 0 ? SessionStatus.AVAILABLE : SessionStatus.LOCKED,
      durationLabel: payload.duration,
      dateLabel: index === 0 ? 'آزاد' : 'قفل',
    })),
  });
  return course;
}

async function upsertStudents(course: { id: string; days: string[] }) {
  const joined = await prisma.achievement.findUnique({
    where: { code: 'joined' },
    select: { id: true },
  });
  let created = 0;
  let updated = 0;
  for (const student of RASHIDIAN_MONDAY_STUDENTS) {
    const passwordHash = await argon2.hash(student.nationalId);
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { nationalId: student.nationalId },
          { firstName: student.firstName, lastName: student.lastName },
        ],
      },
    });
    if (existing && existing.role !== Role.STUDENT) {
      console.warn(
        `Skip ${student.firstName} ${student.lastName}: existing ${existing.role}`,
      );
      continue;
    }
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            firstName: student.firstName,
            lastName: student.lastName,
            displayName: `${student.firstName} ${student.lastName}`,
            nationalId: student.nationalId,
            phone: student.phone ?? existing.phone,
            passwordHash,
            passwordPlain: student.nationalId,
            role: Role.STUDENT,
            isActive: true,
            studentCode: existing.studentCode || student.nationalId,
          },
        })
      : await prisma.user.create({
          data: {
            firstName: student.firstName,
            lastName: student.lastName,
            displayName: `${student.firstName} ${student.lastName}`,
            nationalId: student.nationalId,
            phone: student.phone,
            passwordHash,
            passwordPlain: student.nationalId,
            role: Role.STUDENT,
            level: '1',
            studentCode: student.nationalId,
          },
        });
    if (existing) updated += 1;
    else created += 1;
    if (joined) {
      await prisma.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId: user.id,
            achievementId: joined.id,
          },
        },
        update: {},
        create: { userId: user.id, achievementId: joined.id },
      });
    }
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      update: { classDays: course.days },
      create: {
        userId: user.id,
        courseId: course.id,
        classDays: course.days,
      },
    });
  }
  return { created, updated };
}

async function main() {
  const teacher = await upsertTeacher();
  const course = await upsertCourse(teacher);
  const students = await upsertStudents(course);
  console.log(
    `Teacher: ${teacher.displayName} (${teacher.nationalId}) id=${teacher.id}`,
  );
  console.log(`Course: ${course.title} slug=${course.slug} day=${course.day}`);
  console.log(
    `Students: created ${students.created}, updated ${students.updated}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
