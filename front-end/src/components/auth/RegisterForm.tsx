"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Music2, UserRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AvatarPicker } from "@/components/auth/AvatarPicker";
import { StaffBackdrop } from "@/components/auth/StaffBackdrop";
import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy } from "@/constants/copy";
import { api } from "@/lib/api/client";
import {
  getServerSession,
  getSession,
  isPersianName,
  registerWithApi,
  subscribeSession,
} from "@/lib/auth";
import { cn } from "@/lib/utils";

const passwordRule = z
  .string()
  .min(8, "رمز عبور حداقل ۸ کاراکتر باشد")
  .regex(/[A-Za-zÀ-ÿ]/, "رمز عبور باید شامل حروف باشد")
  .regex(/[0-9]/, "رمز عبور باید شامل عدد باشد");

const schema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "نام حداقل ۲ حرف باشد")
      .refine(isPersianName, "نام را فارسی وارد کنید"),
    lastName: z
      .string()
      .trim()
      .min(2, "نام خانوادگی حداقل ۲ حرف باشد")
      .refine(isPersianName, "نام خانوادگی را فارسی وارد کنید"),
    password: passwordRule,
    confirmPassword: z.string().min(1, "تکرار رمز را وارد کنید"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "تکرار رمز عبور مطابقت ندارد",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const existingSession = useSyncExternalStore(
    subscribeSession,
    getSession,
    getServerSession,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const firstName = watch("firstName");
  const avatarInitial = firstName.trim().charAt(0) || "ه";

  useEffect(() => {
    if (existingSession) router.replace("/dashboard");
  }, [existingSession, router]);

  const onSubmit = async (values: FormValues) => {
    setAuthError(null);
    const result = await registerWithApi(
      values.firstName,
      values.lastName,
      values.password,
      values.confirmPassword,
    );
    if (!result.ok) {
      setAuthError(result.message || copy.register.error);
      return;
    }
    if (avatarFile) {
      try {
        await api.uploadAvatar(avatarFile);
      } catch {
        /* ثبت‌نام موفق بود؛ آپلود عکس بعداً از پروفایل ممکن است */
      }
    }
    router.push("/dashboard");
  };

  if (existingSession) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden">
        <StaffBackdrop />
        <div className="relative z-10">
          <EtudeLogo size={88} priority glow />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <StaffBackdrop />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col items-center justify-center px-4 py-10 lg:flex-row lg:gap-16 lg:px-8">
        <motion.aside
          className="mb-10 flex w-full max-w-md flex-col items-center text-center lg:mb-0"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <EtudeLogo size={148} priority glow className="mb-6" />
          <p className="font-display text-4xl font-bold tracking-[0.06em] text-brand md:text-5xl lg:text-6xl">
            {copy.brandFull}
          </p>
          <p className="mt-2 font-display text-sm font-medium tracking-[0.22em] text-brand-600 uppercase md:text-base">
            {copy.brandSlogan}
          </p>
          <p className="mt-4 text-lg font-medium text-brand-700">{copy.tagline}</p>
          <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
            {copy.brandBlurb}
          </p>
          <div className="mt-8 hidden items-center justify-center gap-3 text-sm text-brand-600 lg:flex">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white">
              <Music2 className="size-4" strokeWidth={1.75} />
            </span>
            <span>یک حساب برای همه دوره‌های شما</span>
          </div>
        </motion.aside>

        <motion.div
          className="w-full max-w-[440px]"
          initial={reduceMotion ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 p-7 shadow-[0_30px_80px_-40px_rgba(0,54,196,0.45)] backdrop-blur-md sm:p-9">
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-foreground">
                {copy.register.title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {copy.register.subtitle}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <AvatarPicker
                value={avatarFile}
                onChange={setAvatarFile}
                fallbackInitial={avatarInitial}
                disabled={isSubmitting}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{copy.register.firstName}</Label>
                  <div className="relative">
                    <UserRound
                      className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      strokeWidth={1.75}
                    />
                    <Input
                      id="firstName"
                      autoComplete="given-name"
                      className={cn(
                        "pr-10",
                        errors.firstName && "border-destructive focus-visible:ring-destructive/30",
                      )}
                      aria-invalid={Boolean(errors.firstName)}
                      {...register("firstName")}
                    />
                  </div>
                  {errors.firstName ? (
                    <p className="text-xs text-destructive">
                      {errors.firstName.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{copy.register.lastName}</Label>
                  <div className="relative">
                    <UserRound
                      className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      strokeWidth={1.75}
                    />
                    <Input
                      id="lastName"
                      autoComplete="family-name"
                      className={cn(
                        "pr-10",
                        errors.lastName && "border-destructive focus-visible:ring-destructive/30",
                      )}
                      aria-invalid={Boolean(errors.lastName)}
                      {...register("lastName")}
                    />
                  </div>
                  {errors.lastName ? (
                    <p className="text-xs text-destructive">
                      {errors.lastName.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{copy.register.password}</Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={cn(
                      "pr-10 pl-11",
                      errors.password && "border-destructive focus-visible:ring-destructive/30",
                    )}
                    aria-invalid={Boolean(errors.password)}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground"
                    aria-label="نمایش رمز"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {copy.passwordHint}
                </p>
                {errors.password ? (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {copy.register.confirmPassword}
                </Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={cn(
                      "pr-10",
                      errors.confirmPassword &&
                        "border-destructive focus-visible:ring-destructive/30",
                    )}
                    aria-invalid={Boolean(errors.confirmPassword)}
                    {...register("confirmPassword")}
                  />
                </div>
                {errors.confirmPassword ? (
                  <p className="text-xs text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>

              {authError ? (
                <p
                  className={cn(
                    "rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-destructive",
                  )}
                >
                  {authError}
                </p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? copy.register.submitting : copy.register.submit}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              {copy.register.hasAccount}{" "}
              <Link href="/login" className="font-semibold text-brand">
                {copy.register.goLogin}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
