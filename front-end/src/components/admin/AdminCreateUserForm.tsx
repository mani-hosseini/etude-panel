"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/api/admin-client";
import { adminQueryKeys } from "@/lib/api/admin-queries";
import { ApiError } from "@/lib/api/http";

type AdminCreateUserFormProps = {
  onClose: () => void;
};

export function AdminCreateUserForm({ onClose }: AdminCreateUserFormProps) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      adminApi.createStudent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        studentCode: studentCode.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "ثبت هنرجو ناموفق بود.");
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
          <Label htmlFor="create-password">رمز عبور</Label>
          <Input
            id="create-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl bg-white"
            required
            minLength={8}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="create-studentCode">کد هنرجو (اختیاری)</Label>
          <Input
            id="create-studentCode"
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value)}
            className="rounded-xl bg-white"
            dir="ltr"
          />
        </div>

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
