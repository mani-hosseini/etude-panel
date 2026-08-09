"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminLoginWithApi,
  getAdminSession,
} from "@/lib/auth/admin-auth";
import { adminRoutes } from "@/lib/routes";

const schema = z.object({
  email: z.string().trim().email("ایمیل معتبر وارد کنید."),
  password: z.string().min(8, "رمز عبور حداقل ۸ کاراکتر باشد."),
});

type FormValues = z.infer<typeof schema>;

export function AdminLoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (getAdminSession()) {
      router.replace(adminRoutes.root);
    }
  }, [router]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await adminLoginWithApi(values.email, values.password);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    router.push(adminRoutes.root);
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#eef1f8] px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
        <div className="h-1.5 bg-brand" />
        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <EtudeLogo size={56} />
            <p className="mt-4 font-display text-sm font-bold tracking-[0.22em] text-brand">
              ETUDE
            </p>
            <h1 className="mt-2 text-xl font-bold text-slate-900">
              ورود مدیر سیستم
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              کنترل‌پنل مدیریت محتوا و کاربران
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">ایمیل</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                dir="ltr"
                className="rounded-xl text-left"
                placeholder="admin@etude.academy"
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">رمز عبور</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  dir="ltr"
                  className="rounded-xl pe-10 text-left"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 left-2 inline-flex items-center text-slate-400"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "مخفی کردن رمز" : "نمایش رمز"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            {formError ? (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {formError}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full rounded-xl"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  در حال ورود…
                </>
              ) : (
                "ورود به پنل ادمین"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
