import type { CalendarOccasionKind } from '@prisma/client';

/**
 * Official public holidays of 1405, transcribed from the national calendar
 * extracted by the Calendar Center of the Institute of Geophysics, University
 * of Tehran (تقویم رسمی کشور سال ۱۴۰۵). Only days marked تعطیل are included.
 * Lunar dates are not calculated.
 */
export const OFFICIAL_1405_SOURCE =
  'تقویم رسمی سال ۱۴۰۵، شورای مرکز تقویم مؤسسه ژئوفیزیک دانشگاه تهران';

export const OFFICIAL_1405_HOLIDAYS: Array<{
  month: number;
  day: number;
  title: string;
  kind: CalendarOccasionKind;
}> = [
  { month: 1, day: 1, title: 'عید سعید فطر و آغاز نوروز', kind: 'RELIGIOUS' },
  { month: 1, day: 2, title: 'تعطیل به مناسبت عید فطر و نوروز', kind: 'OFFICIAL' },
  { month: 1, day: 3, title: 'عید نوروز', kind: 'NATIONAL' },
  { month: 1, day: 4, title: 'عید نوروز', kind: 'NATIONAL' },
  { month: 1, day: 12, title: 'روز جمهوری اسلامی ایران', kind: 'NATIONAL' },
  { month: 1, day: 13, title: 'روز طبیعت', kind: 'NATIONAL' },
  { month: 1, day: 25, title: 'شهادت حضرت امام جعفر صادق علیه‌السلام', kind: 'RELIGIOUS' },
  { month: 3, day: 6, title: 'عید سعید قربان', kind: 'RELIGIOUS' },
  { month: 3, day: 14, title: 'عید سعید غدیر خم و رحلت حضرت امام خمینی', kind: 'RELIGIOUS' },
  { month: 3, day: 15, title: 'قیام ۱۵ خرداد', kind: 'NATIONAL' },
  { month: 4, day: 3, title: 'تاسوعای حسینی', kind: 'RELIGIOUS' },
  { month: 4, day: 4, title: 'عاشورای حسینی', kind: 'RELIGIOUS' },
  { month: 5, day: 13, title: 'اربعین حسینی', kind: 'RELIGIOUS' },
  { month: 5, day: 21, title: 'رحلت حضرت رسول اکرم و شهادت امام حسن مجتبی', kind: 'RELIGIOUS' },
  { month: 5, day: 22, title: 'شهادت حضرت امام رضا علیه‌السلام', kind: 'RELIGIOUS' },
  { month: 5, day: 30, title: 'شهادت امام حسن عسکری و آغاز امامت حضرت ولی‌عصر', kind: 'RELIGIOUS' },
  { month: 6, day: 8, title: 'ولادت حضرت رسول اکرم و امام جعفر صادق', kind: 'RELIGIOUS' },
  { month: 8, day: 22, title: 'شهادت حضرت فاطمه زهرا', kind: 'RELIGIOUS' },
  { month: 10, day: 2, title: 'ولادت حضرت امام علی علیه‌السلام', kind: 'RELIGIOUS' },
  { month: 10, day: 16, title: 'مبعث حضرت رسول اکرم', kind: 'RELIGIOUS' },
  { month: 11, day: 4, title: 'ولادت حضرت قائم', kind: 'RELIGIOUS' },
  { month: 11, day: 22, title: 'پیروزی انقلاب اسلامی ایران', kind: 'NATIONAL' },
  { month: 12, day: 9, title: 'شهادت حضرت امام علی علیه‌السلام', kind: 'RELIGIOUS' },
  { month: 12, day: 19, title: 'عید سعید فطر', kind: 'RELIGIOUS' },
  { month: 12, day: 20, title: 'تعطیل به مناسبت عید سعید فطر', kind: 'OFFICIAL' },
  { month: 12, day: 29, title: 'روز ملی شدن صنعت نفت ایران', kind: 'NATIONAL' },
];
