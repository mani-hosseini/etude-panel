import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AdminTaskKind,
  AdminTaskStatus,
  CourseInterest,
  Prisma,
  ReferralSource,
  RegistrationLeadStatus,
  TimePreference,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLeadDto,
  CreateLeadNoteDto,
  CreateTaskDto,
  UpdateTaskDto,
  UpsertLeadDto,
  type CourseInterestDto,
  type LeadStatusDto,
  type ReferralSourceDto,
  type TimePreferenceDto,
} from './dto/registration.dto';

const STATUS_TO_DB: Record<LeadStatusDto, RegistrationLeadStatus> = {
  consulting: RegistrationLeadStatus.CONSULTING,
  deciding: RegistrationLeadStatus.DECIDING,
  enrolled: RegistrationLeadStatus.ENROLLED,
  lost: RegistrationLeadStatus.LOST,
};

const STATUS_FROM_DB: Record<RegistrationLeadStatus, LeadStatusDto> = {
  CONSULTING: 'consulting',
  DECIDING: 'deciding',
  ENROLLED: 'enrolled',
  LOST: 'lost',
};

const REFERRAL_TO_DB: Record<ReferralSourceDto, ReferralSource> = {
  instagram: ReferralSource.INSTAGRAM,
  google: ReferralSource.GOOGLE,
  student_referral: ReferralSource.STUDENT_REFERRAL,
  friend_family: ReferralSource.FRIEND_FAMILY,
  ads: ReferralSource.ADS,
  website: ReferralSource.WEBSITE,
  inbound_call: ReferralSource.INBOUND_CALL,
  walk_in: ReferralSource.WALK_IN,
  other: ReferralSource.OTHER,
};

const REFERRAL_FROM_DB: Record<ReferralSource, ReferralSourceDto> = {
  INSTAGRAM: 'instagram',
  GOOGLE: 'google',
  STUDENT_REFERRAL: 'student_referral',
  FRIEND_FAMILY: 'friend_family',
  ADS: 'ads',
  WEBSITE: 'website',
  INBOUND_CALL: 'inbound_call',
  WALK_IN: 'walk_in',
  OTHER: 'other',
};

const INTEREST_TO_DB: Record<CourseInterestDto, CourseInterest> = {
  piano: CourseInterest.PIANO,
  theory: CourseInterest.THEORY,
  both: CourseInterest.BOTH,
  undecided: CourseInterest.UNDECIDED,
};

const INTEREST_FROM_DB: Record<CourseInterest, CourseInterestDto> = {
  PIANO: 'piano',
  THEORY: 'theory',
  BOTH: 'both',
  UNDECIDED: 'undecided',
};

const TIME_TO_DB: Record<TimePreferenceDto, TimePreference> = {
  morning: TimePreference.MORNING,
  evening: TimePreference.EVENING,
  flexible: TimePreference.FLEXIBLE,
};

const TIME_FROM_DB: Record<TimePreference, TimePreferenceDto> = {
  MORNING: 'morning',
  EVENING: 'evening',
  FLEXIBLE: 'flexible',
};

const DISTRICT_LABEL: Record<string, string> = {
  '1': 'منطقه ۱',
  '2': 'منطقه ۲',
  '3': 'منطقه ۳',
  '4': 'منطقه ۴',
  '5': 'منطقه ۵',
  '6': 'منطقه ۶',
  '7': 'منطقه ۷',
  '8': 'منطقه ۸',
  '9': 'منطقه ۹',
  '10': 'منطقه ۱۰',
  '11': 'منطقه ۱۱',
  '12': 'منطقه ۱۲',
  '13': 'منطقه ۱۳',
  '14': 'منطقه ۱۴',
  '15': 'منطقه ۱۵',
  '16': 'منطقه ۱۶',
  '17': 'منطقه ۱۷',
  '18': 'منطقه ۱۸',
  '19': 'منطقه ۱۹',
  '20': 'منطقه ۲۰',
  '21': 'منطقه ۲۱',
  '22': 'منطقه ۲۲',
  other: 'خارج از تهران',
};

const INTEREST_LABEL: Record<CourseInterestDto, string> = {
  piano: 'پیانو',
  theory: 'سلفژ و تئوری',
  both: 'پیانو و تئوری',
  undecided: 'هنوز مشخص نیست',
};

const leadInclude = {
  notes: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.RegistrationLeadInclude;

type LeadRecord = Prisma.RegistrationLeadGetPayload<{ include: typeof leadInclude }>;

function dateOnly(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function toIsoDate(value: Date | null | undefined) {
  if (!value) return '';
  return value.toISOString().slice(0, 10);
}

function mapLead(lead: LeadRecord) {
  return {
    id: lead.id,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    contactDate: toIsoDate(lead.contactDate),
    firstName: lead.firstName,
    lastName: lead.lastName,
    phone: lead.phone,
    secondaryPhone: lead.secondaryPhone,
    parentName: lead.parentName,
    age: lead.age,
    district: lead.district,
    referralSource: REFERRAL_FROM_DB[lead.referralSource],
    status: STATUS_FROM_DB[lead.status],
    interest: INTEREST_FROM_DB[lead.interest],
    preferredDays: lead.preferredDays,
    timePreference: TIME_FROM_DB[lead.timePreference],
    followUpDate: toIsoDate(lead.followUpDate),
    notes: lead.notes.map((note) => ({
      id: note.id,
      at: note.createdAt.toISOString(),
      text: note.text,
    })),
  };
}

function mapTask(task: {
  id: string;
  kind: AdminTaskKind;
  status: AdminTaskStatus;
  title: string;
  body: string;
  dueDate: Date | null;
  phone: string | null;
  leadId: string | null;
  createdAt: Date;
  doneAt: Date | null;
}) {
  return {
    id: task.id,
    kind: task.kind === AdminTaskKind.ENROLLMENT ? 'enrollment' : 'manual',
    status: task.status === AdminTaskStatus.DONE ? 'done' : 'open',
    title: task.title,
    body: task.body,
    dueDate: toIsoDate(task.dueDate),
    phone: task.phone ?? undefined,
    leadId: task.leadId ?? undefined,
    createdAt: task.createdAt.toISOString(),
    doneAt: task.doneAt?.toISOString(),
  };
}

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

@Injectable()
export class RegistrationService {
  constructor(private readonly prisma: PrismaService) {}

  async listLeads() {
    const leads = await this.prisma.registrationLead.findMany({
      include: leadInclude,
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    return { leads: leads.map(mapLead) };
  }

  async getLead(id: string) {
    const lead = await this.prisma.registrationLead.findUnique({
      where: { id },
      include: leadInclude,
    });
    if (!lead) throw new NotFoundException('این پرونده پیدا نشد.');
    return mapLead(lead);
  }

  async createLead(dto: CreateLeadDto) {
    const lead = await this.prisma.registrationLead.create({
      data: {
        contactDate: dateOnly(dto.contactDate),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone.trim(),
        secondaryPhone: dto.secondaryPhone?.trim() ?? '',
        parentName: dto.parentName?.trim() ?? '',
        age: dto.age?.trim() ?? '',
        district: dto.district.trim(),
        referralSource: dto.referralSource
          ? REFERRAL_TO_DB[dto.referralSource]
          : ReferralSource.INBOUND_CALL,
        status: dto.status
          ? STATUS_TO_DB[dto.status]
          : RegistrationLeadStatus.CONSULTING,
        interest: dto.interest
          ? INTEREST_TO_DB[dto.interest]
          : CourseInterest.PIANO,
        preferredDays: dto.preferredDays ?? [],
        timePreference: dto.timePreference
          ? TIME_TO_DB[dto.timePreference]
          : TimePreference.FLEXIBLE,
        followUpDate: dto.followUpDate ? dateOnly(dto.followUpDate) : null,
        notes: dto.note?.trim()
          ? { create: { text: dto.note.trim() } }
          : undefined,
      },
      include: leadInclude,
    });
    if (lead.status === RegistrationLeadStatus.ENROLLED) {
      await this.upsertEnrollmentTask(lead);
    }
    return this.getLead(lead.id);
  }

  async updateLead(id: string, dto: UpsertLeadDto) {
    const current = await this.prisma.registrationLead.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('این پرونده پیدا نشد.');

    const nextStatus = dto.status ? STATUS_TO_DB[dto.status] : current.status;
    const data: Prisma.RegistrationLeadUpdateInput = {
      ...(dto.contactDate ? { contactDate: dateOnly(dto.contactDate) } : {}),
      ...(dto.firstName != null ? { firstName: dto.firstName.trim() } : {}),
      ...(dto.lastName != null ? { lastName: dto.lastName.trim() } : {}),
      ...(dto.phone != null ? { phone: dto.phone.trim() } : {}),
      ...(dto.secondaryPhone != null
        ? { secondaryPhone: dto.secondaryPhone.trim() }
        : {}),
      ...(dto.parentName != null ? { parentName: dto.parentName.trim() } : {}),
      ...(dto.age != null ? { age: dto.age.trim() } : {}),
      ...(dto.district != null ? { district: dto.district.trim() } : {}),
      ...(dto.referralSource
        ? { referralSource: REFERRAL_TO_DB[dto.referralSource] }
        : {}),
      ...(dto.status ? { status: nextStatus } : {}),
      ...(dto.interest ? { interest: INTEREST_TO_DB[dto.interest] } : {}),
      ...(dto.preferredDays ? { preferredDays: dto.preferredDays } : {}),
      ...(dto.timePreference
        ? { timePreference: TIME_TO_DB[dto.timePreference] }
        : {}),
      ...(dto.followUpDate === undefined
        ? {}
        : {
            followUpDate:
              dto.followUpDate === null ? null : dateOnly(dto.followUpDate),
          }),
    };

    const lead = await this.prisma.registrationLead.update({
      where: { id },
      data,
      include: leadInclude,
    });
    if (lead.status === RegistrationLeadStatus.ENROLLED) {
      await this.upsertEnrollmentTask(lead);
    }
    return mapLead(lead);
  }

  async deleteLead(id: string) {
    try {
      await this.prisma.registrationLead.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('این پرونده پیدا نشد.');
      }
      throw error;
    }
    return { deleted: true };
  }

  async addNote(id: string, dto: CreateLeadNoteDto) {
    const lead = await this.prisma.registrationLead.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!lead) throw new NotFoundException('این پرونده پیدا نشد.');
    await this.prisma.registrationLeadNote.create({
      data: { leadId: id, text: dto.text.trim() },
    });
    return this.getLead(id);
  }

  async listTasks() {
    const tasks = await this.prisma.adminTask.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return { tasks: tasks.map(mapTask) };
  }

  async createTask(dto: CreateTaskDto) {
    const task = await this.prisma.adminTask.create({
      data: {
        kind: AdminTaskKind.MANUAL,
        title: dto.title.trim(),
        body: dto.body?.trim() ?? '',
        dueDate: dto.dueDate ? dateOnly(dto.dueDate) : null,
      },
    });
    return mapTask(task);
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    const current = await this.prisma.adminTask.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('این تسک پیدا نشد.');

    const nextStatus =
      dto.status === 'done'
        ? AdminTaskStatus.DONE
        : dto.status === 'open'
          ? AdminTaskStatus.OPEN
          : current.status;

    const task = await this.prisma.adminTask.update({
      where: { id },
      data: {
        ...(dto.title != null ? { title: dto.title.trim() } : {}),
        ...(dto.body != null ? { body: dto.body.trim() } : {}),
        ...(dto.dueDate === undefined
          ? {}
          : { dueDate: dto.dueDate ? dateOnly(dto.dueDate) : null }),
        status: nextStatus,
        doneAt:
          nextStatus === AdminTaskStatus.DONE
            ? (current.doneAt ?? new Date())
            : null,
      },
    });
    return mapTask(task);
  }

  async deleteTask(id: string) {
    try {
      await this.prisma.adminTask.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('این تسک پیدا نشد.');
      }
      throw error;
    }
    return { deleted: true };
  }

  private async upsertEnrollmentTask(
    lead: Pick<
      LeadRecord,
      'id' | 'firstName' | 'lastName' | 'phone' | 'district' | 'interest'
    >,
  ) {
    const name = fullName(lead.firstName, lead.lastName);
    const extra = [
      DISTRICT_LABEL[lead.district] ?? '',
      INTEREST_LABEL[INTEREST_FROM_DB[lead.interest]],
    ]
      .filter(Boolean)
      .join(' · ');
    const body = extra
      ? `هنرجو ثبت‌نام شد؛ به دوره و سایت اضافه شود. ${extra}`
      : 'هنرجو ثبت‌نام شد؛ به دوره و سایت اضافه شود.';
    const title = `ثبت «${name}» در سایت`;

    const existing = await this.prisma.adminTask.findUnique({
      where: {
        leadId_kind: { leadId: lead.id, kind: AdminTaskKind.ENROLLMENT },
      },
    });
    if (existing) {
      if (existing.status === AdminTaskStatus.DONE) return;
      await this.prisma.adminTask.update({
        where: { id: existing.id },
        data: { title, body, phone: lead.phone },
      });
      return;
    }
    await this.prisma.adminTask.create({
      data: {
        kind: AdminTaskKind.ENROLLMENT,
        status: AdminTaskStatus.OPEN,
        title,
        body,
        phone: lead.phone,
        leadId: lead.id,
      },
    });
  }
}
