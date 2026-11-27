import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { CalendarCoverage, CalendarOccasionKind } from '@prisma/client';
import { toGregorian } from 'jalaali-js';
import { PrismaService } from '../prisma/prisma.service';
import {
  CalendarCoverageName,
  StoredOccasion,
  TEHRAN_TIME_ZONE,
  buildJalaliMonth,
  clockText,
  describeCivilDay,
  gregorianFromJalali,
  isoDate,
  tehranDateTime,
} from './calendar.engine';
import { ImportCalendarYearDto, UpsertOccasionDto } from './dto/calendar.dto';
import { OFFICIAL_1405_HOLIDAYS, OFFICIAL_1405_SOURCE } from './official-1405';

const coverageName: Record<CalendarCoverage, CalendarCoverageName> = {
  UNKNOWN: 'unknown',
  HOLIDAYS: 'holidays',
  COMPLETE: 'complete',
};

@Injectable()
export class CalendarService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const existing = await this.prisma.calendarYearRecord.findUnique({
      where: { year: 1405 },
    });
    if (existing) return;
    await this.importYear({
      year: 1405,
      coverage: CalendarCoverage.HOLIDAYS,
      source: OFFICIAL_1405_SOURCE,
      occasions: OFFICIAL_1405_HOLIDAYS.map((item) => ({
        ...item,
        isOfficialHoliday: true,
      })),
    });
  }

  async now() {
    const instant = new Date();
    const tehran = tehranDateTime(instant);
    const described = await this.describe(
      tehran.year,
      tehran.month,
      tehran.day,
    );
    return {
      timezone: TEHRAN_TIME_ZONE,
      epochMs: instant.getTime(),
      time: clockText(tehran.hour, tehran.minute, tehran.second),
      ...described,
    };
  }

  async day(year?: number, month?: number, day?: number) {
    if (year == null && month == null && day == null) return this.now();
    if (year == null || month == null || day == null) {
      throw new BadRequestException('سال، ماه و روز شمسی را با هم بفرستید.');
    }
    const gregorian = gregorianFromJalali(year, month, day);
    if (!gregorian) throw new BadRequestException('تاریخ شمسی نامعتبر است.');
    const described = await this.describe(
      gregorian.year,
      gregorian.month,
      gregorian.day,
    );
    return { timezone: TEHRAN_TIME_ZONE, ...described };
  }

  async month(year: number, month: number) {
    const { coverage, occasions } = await this.yearBundle(year);
    try {
      return {
        timezone: TEHRAN_TIME_ZONE,
        ...buildJalaliMonth({ year, month, coverage, occasions }),
      };
    } catch {
      throw new BadRequestException('ماه شمسی نامعتبر است.');
    }
  }

  async listOccasions(year: number) {
    const record = await this.prisma.calendarYearRecord.findUnique({
      where: { year },
    });
    const rows = await this.prisma.calendarOccasion.findMany({
      where: { jalaliYear: year },
      orderBy: [{ jalaliMonth: 'asc' }, { jalaliDay: 'asc' }, { title: 'asc' }],
    });
    return {
      year,
      coverage: record ? coverageName[record.coverage] : 'unknown',
      source: record?.source ?? null,
      updatedAt: record?.updatedAt.toISOString() ?? null,
      occasions: rows.map((row) => this.mapOccasion(row)),
    };
  }

  async createOccasion(dto: UpsertOccasionDto) {
    const row = await this.writeOccasion(dto);
    await this.touchYear(dto.year, dto.source);
    return this.mapOccasion(row);
  }

  async updateOccasion(id: string, dto: UpsertOccasionDto) {
    const existing = await this.prisma.calendarOccasion.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('مناسبت یافت نشد.');
    await this.prisma.calendarOccasion.delete({ where: { id } });
    const row = await this.writeOccasion(dto);
    await this.touchYear(dto.year, dto.source);
    return this.mapOccasion(row);
  }

  async deleteOccasion(id: string) {
    const existing = await this.prisma.calendarOccasion.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('مناسبت یافت نشد.');
    await this.prisma.calendarOccasion.delete({ where: { id } });
    return { deleted: true };
  }

  async importYear(dto: ImportCalendarYearDto) {
    const data = dto.occasions.map((item) => {
      const gregorian = gregorianFromJalali(dto.year, item.month, item.day);
      if (!gregorian) {
        throw new BadRequestException(
          `تاریخ ${dto.year}/${item.month}/${item.day} نامعتبر است.`,
        );
      }
      const date = toGregorian(dto.year, item.month, item.day);
      return {
        gregorianDate: new Date(Date.UTC(date.gy, date.gm - 1, date.gd)),
        jalaliYear: dto.year,
        jalaliMonth: item.month,
        jalaliDay: item.day,
        title: item.title.trim(),
        kind: item.kind,
        isOfficialHoliday: item.isOfficialHoliday,
        source: dto.source.trim(),
      };
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.calendarOccasion.deleteMany({ where: { jalaliYear: dto.year } });
      if (data.length > 0) {
        await tx.calendarOccasion.createMany({ data });
      }
      await tx.calendarYearRecord.upsert({
        where: { year: dto.year },
        create: {
          year: dto.year,
          coverage: dto.coverage,
          source: dto.source.trim(),
        },
        update: {
          coverage: dto.coverage,
          source: dto.source.trim(),
        },
      });
    });

    return this.listOccasions(dto.year);
  }

  private async describe(year: number, month: number, day: number) {
    const jalali = describeCivilDay({
      year,
      month,
      day,
      coverage: 'unknown',
      occasions: [],
    }).jalali;
    const bundle = await this.yearBundle(jalali.year);
    return describeCivilDay({
      year,
      month,
      day,
      coverage: bundle.coverage,
      occasions: bundle.occasions,
    });
  }

  private async yearBundle(year: number) {
    const [record, rows] = await Promise.all([
      this.prisma.calendarYearRecord.findUnique({ where: { year } }),
      this.prisma.calendarOccasion.findMany({ where: { jalaliYear: year } }),
    ]);
    const occasions: StoredOccasion[] = rows.map((row) => ({
      jalaliYear: row.jalaliYear,
      jalaliMonth: row.jalaliMonth,
      jalaliDay: row.jalaliDay,
      title: row.title,
      kind: row.kind,
      isOfficialHoliday: row.isOfficialHoliday,
      source: row.source,
    }));
    return {
      coverage: record ? coverageName[record.coverage] : 'unknown',
      occasions,
    };
  }

  private async writeOccasion(dto: UpsertOccasionDto) {
    const gregorian = gregorianFromJalali(dto.year, dto.month, dto.day);
    if (!gregorian) throw new BadRequestException('تاریخ شمسی نامعتبر است.');
    const source =
      dto.source?.trim() ||
      'ثبت موردی مدیر سیستم';
    return this.prisma.calendarOccasion.create({
      data: {
        gregorianDate: new Date(
          Date.UTC(gregorian.year, gregorian.month - 1, gregorian.day),
        ),
        jalaliYear: dto.year,
        jalaliMonth: dto.month,
        jalaliDay: dto.day,
        title: dto.title.trim(),
        kind: dto.kind,
        isOfficialHoliday: dto.isOfficialHoliday,
        source,
      },
    });
  }

  private async touchYear(year: number, source?: string) {
    const text = source?.trim() || 'ثبت موردی مدیر سیستم';
    await this.prisma.calendarYearRecord.upsert({
      where: { year },
      create: { year, coverage: CalendarCoverage.UNKNOWN, source: text },
      update: { source: text },
    });
  }

  private mapOccasion(row: {
    id: string;
    jalaliYear: number;
    jalaliMonth: number;
    jalaliDay: number;
    gregorianDate: Date;
    title: string;
    kind: CalendarOccasionKind;
    isOfficialHoliday: boolean;
    source: string;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      year: row.jalaliYear,
      month: row.jalaliMonth,
      day: row.jalaliDay,
      date: isoDate(
        row.gregorianDate.getUTCFullYear(),
        row.gregorianDate.getUTCMonth() + 1,
        row.gregorianDate.getUTCDate(),
      ),
      title: row.title,
      kind: row.kind.toLowerCase(),
      isOfficialHoliday: row.isOfficialHoliday,
      source: row.source,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
