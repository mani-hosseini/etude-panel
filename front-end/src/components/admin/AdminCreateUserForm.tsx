"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";

import { StudentLevelSelect } from "@/components/admin/StudentLevelSelect";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/api/admin-client";
import {
  adminQueryKeys,
  useAdminCoursesQuery,
} from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { announceSaved } from "@/lib/save-feedback";
import { cn } from "@/lib/utils";

type AdminCreateUserFormProps = {
  onClose: () => void;
};

export function AdminCreateUserForm({ onClose }: AdminCreateUserFormProps) {
  const queryClient = useQueryClient();
  const coursesQuery = useAdminCoursesQuery({ limit: 100 });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [level, setLevel] = useState("1");
  const [courseSlugs, setCourseSlugs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const courses = coursesQuery.data?.courses ?? [];

  const toggleCourse = (slug: string) => {
    setCourseSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  };

  const create = useMutation({
    mutationFn: async () => {
      const user = await adminApi.createStudent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nationalId: nationalId.trim(),
        level,
      });
      for (const slug of courseSlugs) {
        await adminApi.enrollUser(user.id, slug);
      }
      return user;
    },
    onSuccess: async () => {
      announceSaved("هنرجو ثبت شد.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
      onClose();
    },
    onError: (err) => {
      setError(audienceError(err, "ثبت هنرجو انجام نشد."));
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate();
  };

  return (
    <Card className="rounded-2xl border-brand/20 bg-brand/5 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">هنرجوی جدید</h3>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 rounded-xl"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="create-firstName">نام</Label>
          <Input
            id="create-firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="rounded-xl bg-white"
            required
            minLength={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="create-lastName">نام خانوادگی</Label>
          <Input
            id="create-lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="rounded-xl bg-white"
            required
            minLength={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="create-nationalId">کد ملی</Label>
          <Input
            id="create-nationalId"
            inputMode="numeric"
            dir="ltr"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            className="rounded-xl bg-white text-left"
            placeholder="نام کاربری و رمز ورود"
            required
            minLength={8}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="create-level">سطح هنرجو</Label>
          <StudentLevelSelect
            id="create-level"
            value={level}
            onValueChange={setLevel}
          />
        </div>

        {courses.length > 0 ? (
          <div className="space-y-2 sm:col-span-2">
            <Label>دوره‌های شروع</Label>
            <p className="text-xs text-slate-500">
              همین حالا هر دوره‌ای که این هنرجو باید ببیند را انتخاب کنید.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {courses.map((course) => {
                const checked = courseSlugs.includes(course.slug);
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => toggleCourse(course.slug)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-right transition",
                      checked
                        ? "border-brand bg-brand/5 text-slate-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    )}
                  >
                    <p className="text-sm font-semibold">{course.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {course.teacher} · {course.instrument}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button
            type="submit"
            className="rounded-xl"
            disabled={create.isPending}
          >
            <Plus className="size-4" />
            {create.isPending ? "در حال ثبت…" : "ثبت هنرجو"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={onClose}
          >
            انصراف
          </Button>
        </div>
      </form>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </Card>
  );
}
