import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SupportMessageAuthor,
  SupportTicketStatus,
  SupportUnit,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  SUPPORT_UNITS,
  type AdminSupportQueryDto,
  type CreateSupportMessageDto,
  type CreateSupportTicketDto,
  type SupportStatusDto,
  type SupportUnitDto,
  type UpdateSupportTicketDto,
} from './dto/support.dto';

const UNIT_TO_DB: Record<SupportUnitDto, SupportUnit> = {
  education: SupportUnit.EDUCATION,
  finance: SupportUnit.FINANCE,
  reception: SupportUnit.RECEPTION,
  tech: SupportUnit.TECH,
};

const UNIT_FROM_DB: Record<SupportUnit, SupportUnitDto> = {
  EDUCATION: 'education',
  FINANCE: 'finance',
  RECEPTION: 'reception',
  TECH: 'tech',
};

const STATUS_TO_DB: Record<SupportStatusDto, SupportTicketStatus> = {
  pending: SupportTicketStatus.PENDING,
  replied: SupportTicketStatus.REPLIED,
  closed: SupportTicketStatus.CLOSED,
};

const STATUS_FROM_DB: Record<SupportTicketStatus, SupportStatusDto> = {
  PENDING: 'pending',
  REPLIED: 'replied',
  CLOSED: 'closed',
};

const AUTHOR_FROM_DB: Record<SupportMessageAuthor, 'student' | 'staff'> = {
  STUDENT: 'student',
  STAFF: 'staff',
};

const ticketInclude = {
  student: {
    select: { id: true, displayName: true },
  },
  messages: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.SupportTicketInclude;

type TicketRecord = Prisma.SupportTicketGetPayload<{
  include: typeof ticketInclude;
}>;

function mapTicket(ticket: TicketRecord) {
  return {
    id: ticket.id,
    unitId: UNIT_FROM_DB[ticket.unit],
    studentId: ticket.student.id,
    studentName: ticket.student.displayName,
    title: ticket.title,
    status: STATUS_FROM_DB[ticket.status],
    unreadForStudent: ticket.unreadForStudent,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    messages: ticket.messages.map((message) => ({
      id: message.id,
      author: AUTHOR_FROM_DB[message.author],
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async listStudent(studentId: string) {
    const rows = await this.prisma.supportTicket.findMany({
      where: { studentId },
      include: ticketInclude,
      orderBy: [{ unreadForStudent: 'desc' }, { updatedAt: 'desc' }],
    });
    return { tickets: rows.map(mapTicket) };
  }

  async getStudent(studentId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: ticketInclude,
    });
    if (!ticket || ticket.studentId !== studentId) {
      throw new NotFoundException('این تیکت پیدا نشد.');
    }
    return mapTicket(ticket);
  }

  async createStudent(studentId: string, dto: CreateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        studentId,
        unit: UNIT_TO_DB[dto.unitId],
        title: dto.title.trim(),
        status: SupportTicketStatus.PENDING,
        unreadForStudent: false,
        messages: {
          create: {
            author: SupportMessageAuthor.STUDENT,
            body: dto.body.trim(),
          },
        },
      },
      include: ticketInclude,
    });
    return mapTicket(ticket);
  }

  async replyStudent(
    studentId: string,
    id: string,
    dto: CreateSupportMessageDto,
  ) {
    const ticket = await this.requireTicket(id);
    if (ticket.studentId !== studentId) {
      throw new NotFoundException('این تیکت پیدا نشد.');
    }
    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new BadRequestException('این تیکت بسته است.');
    }
    await this.prisma.supportMessage.create({
      data: {
        ticketId: id,
        author: SupportMessageAuthor.STUDENT,
        body: dto.body.trim(),
      },
    });
    return this.updateTicket(id, {
      status: SupportTicketStatus.PENDING,
      unreadForStudent: false,
    });
  }

  async markStudentSeen(studentId: string, id: string) {
    const ticket = await this.requireTicket(id);
    if (ticket.studentId !== studentId) {
      throw new NotFoundException('این تیکت پیدا نشد.');
    }
    if (!ticket.unreadForStudent) {
      return this.getStudent(studentId, id);
    }
    return this.updateTicket(id, { unreadForStudent: false });
  }

  async listAdmin(query: AdminSupportQueryDto) {
    const where: Prisma.SupportTicketWhereInput = {};
    if (query.unit) where.unit = UNIT_TO_DB[query.unit];
    if (query.status) where.status = STATUS_TO_DB[query.status];
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { student: { displayName: { contains: search, mode: 'insensitive' } } },
        { messages: { some: { body: { contains: search, mode: 'insensitive' } } } },
      ];
    }
    const rows = await this.prisma.supportTicket.findMany({
      where,
      include: ticketInclude,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 300,
    });
    return { tickets: rows.map(mapTicket) };
  }

  async statsAdmin() {
    const [pending, replied, closed, waiting] = await Promise.all([
      this.prisma.supportTicket.count({
        where: { status: SupportTicketStatus.PENDING },
      }),
      this.prisma.supportTicket.count({
        where: { status: SupportTicketStatus.REPLIED },
      }),
      this.prisma.supportTicket.count({
        where: { status: SupportTicketStatus.CLOSED },
      }),
      this.prisma.supportTicket.findMany({
        where: { status: SupportTicketStatus.PENDING },
        select: { unit: true, updatedAt: true },
      }),
    ]);
    const pendingByUnit = Object.fromEntries(
      SUPPORT_UNITS.map((unit) => [unit, 0]),
    ) as Record<SupportUnitDto, number>;
    let waitSum = 0;
    const now = Date.now();
    for (const ticket of waiting) {
      pendingByUnit[UNIT_FROM_DB[ticket.unit]] += 1;
      waitSum += Math.max(0, now - ticket.updatedAt.getTime());
    }
    const avgWaitMinutes =
      waiting.length === 0
        ? 0
        : Math.round(waitSum / waiting.length / 60_000);
    return {
      pending,
      replied,
      closed,
      avgWaitMinutes,
      pendingByUnit,
    };
  }

  async getAdmin(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: ticketInclude,
    });
    if (!ticket) throw new NotFoundException('این تیکت پیدا نشد.');
    return mapTicket(ticket);
  }

  async replyAdmin(id: string, dto: CreateSupportMessageDto) {
    const ticket = await this.requireTicket(id);
    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new BadRequestException('این تیکت بسته است. اول بازگشایی کنید.');
    }
    await this.prisma.supportMessage.create({
      data: {
        ticketId: id,
        author: SupportMessageAuthor.STAFF,
        body: dto.body.trim(),
      },
    });
    return this.updateTicket(id, {
      status: SupportTicketStatus.REPLIED,
      unreadForStudent: true,
    });
  }

  async updateAdmin(id: string, dto: UpdateSupportTicketDto) {
    await this.requireTicket(id);
    return this.updateTicket(id, { status: STATUS_TO_DB[dto.status] });
  }

  private async requireTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });
    if (!ticket) throw new NotFoundException('این تیکت پیدا نشد.');
    return ticket;
  }

  private async updateTicket(
    id: string,
    data: Prisma.SupportTicketUpdateInput,
  ) {
    const ticket = await this.prisma.supportTicket.update({
      where: { id },
      data,
      include: ticketInclude,
    });
    return mapTicket(ticket);
  }
}
