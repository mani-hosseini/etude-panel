import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { LessonLogQueryDto } from './dto/lesson-log.dto';

const personSelect = { id: true, displayName: true } as const;

const CATEGORY_ORDER = [
  'تکنیک',
  'گام',
  'هانون',
  'تئوری موسیقی',
  'تئوری',
  'سلفژ',
  'قطعه',
];

type Person = { id: string; displayName: string };

type LogRow = {
  id: string;
  teacher: Person;
  student: Person;
  course: { id: string; slug: string; title: string } | null;
  session: { id: string; number: number; title: string } | null;
  term: number;
  category: string;
  title: string;
  lessons: string;
  note: string;
  teacherNote: string;
  enteredAt: string;
  updatedAt: string;
};

@Injectable()
export class LessonLogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: LessonLogQueryDto) {
    const where = this.where(query);

    const [rows, teachers, students, categoryRows] = await Promise.all([
      this.prisma.practiceAssignmentTarget.findMany({
        where,
        include: {
          student: { select: personSelect },
          assignment: {
            include: {
              teacher: { select: personSelect },
              course: { select: { id: true, slug: true, title: true } },
              session: { select: { id: true, number: true, title: true } },
            },
          },
        },
      }),
      this.prisma.user.findMany({
        where: { role: Role.TEACHER, givenAssignments: { some: {} } },
        select: personSelect,
        orderBy: { displayName: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { role: Role.STUDENT, assignmentTargets: { some: {} } },
        select: personSelect,
        orderBy: { displayName: 'asc' },
      }),
      this.prisma.practiceAssignment.groupBy({
        by: ['category'],
        orderBy: { category: 'asc' },
      }),
    ]);

    const heldMarks = await this.prisma.attendanceRecord.findMany({
      where: { heldOn: { not: null } },
      select: { studentId: true, meetingKey: true, term: true, heldOn: true },
    });
    const heldOn = new Map(
      heldMarks
        .filter((mark) => mark.heldOn)
        .map((mark) => [
          `${mark.studentId}:${mark.meetingKey}:${mark.term}`,
          mark.heldOn!.toISOString().slice(0, 10),
        ]),
    );
    const pairs = this.studentPairs(
      rows.map((row) => this.mapRow(row)),
      heldOn,
    );
    const skip = (query.page - 1) * query.limit;
    const pagePairs = pairs.slice(skip, skip + query.limit);

    return {
      groups: this.packTeachers(pagePairs),
      meta: buildPaginationMeta(pairs.length, query.page, query.limit),
      lessonCount: rows.length,
      teachers,
      students,
      categories: categoryRows.map((row) => row.category).filter(Boolean),
    };
  }

  private studentPairs(rows: LogRow[], heldOn: Map<string, string>) {
    const pairMap = new Map<
      string,
      { teacher: Person; student: Person; lessons: LogRow[] }
    >();
    for (const row of rows) {
      const key = `${row.teacher.id}:${row.student.id}`;
      const pair = pairMap.get(key);
      if (pair) pair.lessons.push(row);
      else pairMap.set(key, { teacher: row.teacher, student: row.student, lessons: [row] });
    }

    return [...pairMap.values()]
      .sort((a, b) => {
        const byTeacher = a.teacher.displayName.localeCompare(
          b.teacher.displayName,
          'fa',
        );
        if (byTeacher !== 0) return byTeacher;
        return a.student.displayName.localeCompare(b.student.displayName, 'fa');
      })
      .map((pair) => this.packStudent(pair, heldOn));
  }

  private packStudent(
    pair: {
      teacher: Person;
      student: Person;
      lessons: LogRow[];
    },
    heldOn: Map<string, string>,
  ) {
    const sessionMap = new Map<
      string,
      {
        id: string;
        courseTitle: string | null;
        sessionNumber: number | null;
        heldOn: string | null;
        term: number;
        lessons: Array<{
          id: string;
          category: string;
          title: string;
          lessons: string;
          note: string;
          enteredAt: string;
          updatedAt: string;
        }>;
      }
    >();

    for (const row of pair.lessons) {
      const id = `${row.course?.id ?? 'none'}:${row.term}:${row.session?.id ?? 'none'}`;
      const note = [row.note, row.teacherNote]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' · ');
      const lesson = {
        id: row.id,
        category: row.category,
        title: row.title.trim(),
        lessons: row.lessons.trim(),
        note,
        enteredAt: row.enteredAt,
        updatedAt: row.updatedAt,
      };
      const session = sessionMap.get(id);
      if (session) session.lessons.push(lesson);
      else {
        sessionMap.set(id, {
          id,
          courseTitle: row.course?.title ?? null,
        sessionNumber: row.session?.number ?? null,
        heldOn: row.session
          ? heldOn.get(`${pair.student.id}:${row.session.id}:${row.term}`) ?? null
          : null,
        term: row.term,
          lessons: [lesson],
        });
      }
    }

    const sessions = [...sessionMap.values()]
      .map((session) => ({
        ...session,
        lessons: session.lessons.sort(
          (a, b) =>
            this.categoryRank(a.category) - this.categoryRank(b.category) ||
            a.title.localeCompare(b.title, 'fa'),
        ),
      }))
      .sort(
        (a, b) =>
          a.term - b.term ||
          (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0),
      );

    const latestAt = pair.lessons.reduce(
      (latest, row) => (row.updatedAt > latest ? row.updatedAt : latest),
      pair.lessons[0]?.updatedAt ?? '',
    );

    return {
      id: `${pair.teacher.id}:${pair.student.id}`,
      teacher: pair.teacher,
      student: pair.student,
      lessonCount: pair.lessons.length,
      latestAt,
      sessions,
    };
  }

  private packTeachers(
    pairs: Array<{
      id: string;
      teacher: Person;
      student: Person;
      lessonCount: number;
      latestAt: string;
      sessions: Array<{
        id: string;
        courseTitle: string | null;
        sessionNumber: number | null;
        heldOn: string | null;
        term: number;
        lessons: Array<{
          id: string;
          category: string;
          title: string;
          lessons: string;
          note: string;
          enteredAt: string;
          updatedAt: string;
        }>;
      }>;
    }>,
  ) {
    const groups: Array<{
      teacher: Person;
      students: Array<Omit<(typeof pairs)[number], 'teacher'>>;
    }> = [];
    for (const pair of pairs) {
      const { teacher, ...student } = pair;
      const last = groups[groups.length - 1];
      if (!last || last.teacher.id !== teacher.id) {
        groups.push({ teacher, students: [student] });
      } else {
        last.students.push(student);
      }
    }
    return groups;
  }

  private categoryRank(category: string) {
    const index = CATEGORY_ORDER.indexOf(category.trim());
    return index === -1 ? CATEGORY_ORDER.length : index;
  }

  private where(query: LessonLogQueryDto): Prisma.PracticeAssignmentTargetWhereInput {
    const filters: Prisma.PracticeAssignmentTargetWhereInput[] = [];
    if (query.teacherId) {
      filters.push({ assignment: { teacherId: query.teacherId } });
    }
    if (query.studentId) {
      filters.push({ studentId: query.studentId });
    }
    const category = query.category?.trim();
    if (category) {
      filters.push({ assignment: { category } });
    }
    const search = query.search?.trim().slice(0, 80);
    if (search) {
      filters.push({
        OR: [
          {
            student: {
              displayName: { contains: search, mode: 'insensitive' },
            },
          },
          {
            assignment: {
              title: { contains: search, mode: 'insensitive' },
            },
          },
          {
            assignment: {
              source: { contains: search, mode: 'insensitive' },
            },
          },
          {
            assignment: {
              category: { contains: search, mode: 'insensitive' },
            },
          },
          {
            assignment: {
              note: { contains: search, mode: 'insensitive' },
            },
          },
          { teacherNote: { contains: search, mode: 'insensitive' } },
          {
            assignment: {
              teacher: {
                displayName: { contains: search, mode: 'insensitive' },
              },
            },
          },
          {
            assignment: {
              course: { title: { contains: search, mode: 'insensitive' } },
            },
          },
        ],
      });
    }
    return filters.length > 0 ? { AND: filters } : {};
  }

  private mapRow(row: {
    id: string;
    teacherNote: string;
    student: Person;
    assignment: {
      term: number;
      category: string;
      title: string;
      source: string;
      note: string;
      createdAt: Date;
      updatedAt: Date;
      teacher: Person;
      course: { id: string; slug: string; title: string } | null;
      session: { id: string; number: number; title: string } | null;
    };
  }): LogRow {
    const assignment = row.assignment;
    return {
      id: row.id,
      teacher: assignment.teacher,
      student: row.student,
      course: assignment.course,
      session: assignment.session,
      term: assignment.term,
      category: assignment.category,
      title: assignment.title,
      lessons: assignment.source,
      note: assignment.note,
      teacherNote: row.teacherNote,
      enteredAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
    };
  }
}
