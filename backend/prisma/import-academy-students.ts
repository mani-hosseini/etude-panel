import { PrismaClient } from '@prisma/client';
import {
  upsertAcademyStudents,
  upsertAcademyTeacher,
} from './academy-students';

const prisma = new PrismaClient();

async function main() {
  const teacher = await upsertAcademyTeacher(prisma, {
    courseSlugs: ['piano', 'پیانو'],
  });
  const result = await upsertAcademyStudents(prisma, {
    courseSlugs: ['piano', 'پیانو'],
  });
  console.log(
    `Academy teacher: ${teacher.created ? 'created' : 'updated'} (${teacher.id}), courses ${teacher.assignedCourses}`,
  );
  console.log(
    `Academy students: created ${result.created}, updated ${result.updated}, courses ${result.enrolledCourses.join(', ') || 'none'}`,
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
