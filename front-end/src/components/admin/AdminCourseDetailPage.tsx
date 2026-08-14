"use client";

import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CourseSessionsPanel } from "@/components/admin/course/CourseSessionsPanel";
import { CourseTipsPanel } from "@/components/admin/course/CourseTipsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminCourseQuery } from "@/lib/api/admin-queries";
import { ApiError } from "@/lib/api/http";
import { toFa } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";

export function AdminCourseDetailPage({ courseSlug }: { courseSlug: string }) {
  const courseQuery = useAdminCourseQuery(courseSlug);

  if (courseQuery.isPending) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <Card className="rounded-2xl border-rose-200 bg-rose-50">
        <CardContent className="p-8 text-center text-sm text-rose-700">
          {courseQuery.error instanceof ApiError
            ? courseQuery.error.message
            : "دوره یافت نشد"}
        </CardContent>
      </Card>
    );
  }

  const course = courseQuery.data;

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <AdminPageHeader
        backHref={adminRoutes.courses}
        backLabel="بازگشت به دوره‌ها"
        title={course.title}
        description={course.subtitle}
        actions={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={adminRoutes.courseEdit(course.slug)}>
              ویرایش مشخصات
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap justify-start gap-2">
        <Badge className="rounded-lg bg-brand/10 text-brand hover:bg-brand/10">
          {toFa(course.sessionsCount)} جلسه
        </Badge>
        <Badge variant="outline" className="rounded-lg">
          {toFa(course.enrollmentsCount)} هنرجو
        </Badge>
        <Badge variant="secondary" className="rounded-lg">
          {course.teacher}
        </Badge>
      </div>

      <Tabs defaultValue="sessions" dir="rtl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sessions">جلسات</TabsTrigger>
          <TabsTrigger value="tips">نکات تمرین</TabsTrigger>
          <TabsTrigger value="settings">تنظیمات</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <CourseSessionsPanel
            courseId={course.id}
            courseSlug={course.slug}
            sessions={course.sessions}
          />
        </TabsContent>
        <TabsContent value="tips">
          <CourseTipsPanel courseId={course.id} />
        </TabsContent>
        <TabsContent value="settings">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="space-y-2 p-5 text-sm text-slate-600">
              <p>
                وضعیت: {course.isActive ? "فعال" : "غیرفعال"}
              </p>
              <p>
                اسلاگ:{" "}
                <span className="font-mono" dir="ltr">
                  {course.slug}
                </span>
              </p>
              <p className="text-xs text-slate-400">
                برای ویرایش کامل مشخصات از دکمه «ویرایش مشخصات» استفاده کنید.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
