"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Music2, UserRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";

import { StaffBackdrop } from "@/components/auth/StaffBackdrop";
import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy } from "@/constants/copy";
import {
  getServerSession,
  getSession,
  isPersianName,
  loginWithApi,
  normalizeNationalId,
  sessionHome,
  subscribeSession,
} from "@/lib/auth";
import { cn } from "@/lib/utils";

const nationalSchema = z.object({
  username: z
    .string()
    .trim()
    .min(8, "نام کاربری همان کد ملی است")
    .refine(
      (value) => /^\d{8,16}$/.test(normalizeNationalId(value)),
      "نام کاربری را با کد ملی وارد کنید",
    ),
  password: z
    .string()
    .min(8, "رمز عبور همان کد ملی است")
    .refine(
      (value) => /^\d{8,16}$/.test(normalizeNationalId(value)),
      "رمز عبور را با کد ملی وارد کنید",
    ),
});

const nameSchema = z.object({
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
  password: z.string().min(1, "رمز عبور را وارد کنید"),
});

type NationalValues = z.infer<typeof nationalSchema>;
type NameValues = z.infer<typeof nameSchema>;
type LoginMode = "national" | "name";

export function LoginForm() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const existingSession = useSyncExternalStore(
    subscribeSession,
    getSession,
    getServerSession,
  );
  const [mode, setMode] = useState<LoginMode>("national");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const nationalForm = useForm<NationalValues>({
    resolver: zodResolver(nationalSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { username: "", password: "" },
  });
  const nameForm = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { firstName: "", lastName: "", password: "" },
  });

  useEffect(() => {
    if (existingSession) {
      router.replace(sessionHome(existingSession));
    }
  }, [existingSession, router]);

  const switchMode = (next: LoginMode) => {
    setMode(next);
    setAuthError(null);
    setShowPassword(false);
  };

  const onNationalSubmit = async (values: NationalValues) => {
    setAuthError(null);
    const result = await loginWithApi({
      username: values.username,
      password: values.password,
    });
    if (!result.ok) {
      setAuthError(result.message || copy.login.error);
      return;
    }
    const session = getSession();
    router.push(session ? sessionHome(session) : "/dashboard");
  };

  const onNameSubmit = async (values: NameValues) => {
    setAuthError(null);
    const result = await loginWithApi({
      firstName: values.firstName,
      lastName: values.lastName,
      password: values.password,
    });
    if (!result.ok) {
      setAuthError(result.message || copy.login.error);
      return;
    }
    const session = getSession();
    router.push(session ? sessionHome(session) : "/dashboard");
  };

  const isSubmitting =
    mode === "national"
      ? nationalForm.formState.isSubmitting
      : nameForm.formState.isSubmitting;

  if (existingSession) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden">
        <StaffBackdrop />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <EtudeLogo size={88} priority glow />
          <div className="h-1 w-28 overflow-hidden rounded-full bg-brand-100">
            <motion.div
              className="h-full w-1/2 rounded-full bg-brand"
              animate={reduceMotion ? undefined : { x: ["-100%", "200%"] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
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
            <span>تئوری، پیانو، سلفژ و دوره‌های بیشتر</span>
          </div>
        </motion.aside>

        <motion.div
          className="w-full max-w-[440px]"
          initial={reduceMotion ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 p-7 shadow-[0_30px_80px_-40px_rgba(0,54,196,0.45)] backdrop-blur-md sm:p-9">
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-foreground">
                {copy.login.title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "national"
                  ? copy.login.subtitleNational
                  : copy.login.subtitleName}
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-brand-50 p-1">
              <button
                type="button"
                onClick={() => switchMode("national")}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:text-sm",
                  mode === "national"
                    ? "bg-white text-brand shadow-sm"
                    : "text-brand-700 hover:bg-white/60",
                )}
              >
                {copy.login.modeNational}
              </button>
              <button
                type="button"
                onClick={() => switchMode("name")}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:text-sm",
                  mode === "name"
                    ? "bg-white text-brand shadow-sm"
                    : "text-brand-700 hover:bg-white/60",
                )}
              >
                {copy.login.modeName}
              </button>
            </div>

            {mode === "national" ? (
              <form
                onSubmit={nationalForm.handleSubmit(onNationalSubmit)}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-2">
                  <Label htmlFor="username">{copy.login.username}</Label>
                  <div className="relative">
                    <UserRound
                      className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      strokeWidth={1.75}
                    />
                    <Input
                      id="username"
                      autoComplete="username"
                      inputMode="numeric"
                      dir="ltr"
                      placeholder="کد ملی"
                      className={cn(
                        "pr-10 text-left",
                        nationalForm.formState.errors.username &&
                          "border-destructive focus-visible:ring-destructive/30",
                      )}
                      aria-invalid={Boolean(nationalForm.formState.errors.username)}
                      {...nationalForm.register("username")}
                    />
                  </div>
                  {nationalForm.formState.errors.username ? (
                    <p className="text-xs text-destructive">
                      {nationalForm.formState.errors.username.message}
                    </p>
                  ) : null}
                </div>

                <PasswordField
                  showPassword={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  error={nationalForm.formState.errors.password?.message}
                  numeric
                  register={nationalForm.register("password")}
                />

                {authError ? <AuthError message={authError} /> : null}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? copy.login.submitting : copy.login.submit}
                </Button>
              </form>
            ) : (
              <form
                onSubmit={nameForm.handleSubmit(onNameSubmit)}
                className="space-y-4"
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{copy.login.firstName}</Label>
                    <div className="relative">
                      <UserRound
                        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        strokeWidth={1.75}
                      />
                      <Input
                        id="firstName"
                        autoComplete="given-name"
                        placeholder="مثلاً آوا"
                        className={cn(
                          "pr-10",
                          nameForm.formState.errors.firstName &&
                            "border-destructive focus-visible:ring-destructive/30",
                        )}
                        aria-invalid={Boolean(nameForm.formState.errors.firstName)}
                        {...nameForm.register("firstName")}
                      />
                    </div>
                    {nameForm.formState.errors.firstName ? (
                      <p className="text-xs text-destructive">
                        {nameForm.formState.errors.firstName.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">{copy.login.lastName}</Label>
                    <div className="relative">
                      <UserRound
                        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        strokeWidth={1.75}
                      />
                      <Input
                        id="lastName"
                        autoComplete="family-name"
                        placeholder="مثلاً محمدی"
                        className={cn(
                          "pr-10",
                          nameForm.formState.errors.lastName &&
                            "border-destructive focus-visible:ring-destructive/30",
                        )}
                        aria-invalid={Boolean(nameForm.formState.errors.lastName)}
                        {...nameForm.register("lastName")}
                      />
                    </div>
                    {nameForm.formState.errors.lastName ? (
                      <p className="text-xs text-destructive">
                        {nameForm.formState.errors.lastName.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                <PasswordField
                  showPassword={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  error={nameForm.formState.errors.password?.message}
                  register={nameForm.register("password")}
                />

                {authError ? <AuthError message={authError} /> : null}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? copy.login.submitting : copy.login.submit}
                </Button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-destructive">
      {message}
    </p>
  );
}

function PasswordField({
  showPassword,
  onToggle,
  error,
  numeric,
  register,
}: {
  showPassword: boolean;
  onToggle: () => void;
  error?: string;
  numeric?: boolean;
  register: UseFormRegisterReturn;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="password">{copy.login.password}</Label>
      <div className="relative">
        <Lock
          className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.75}
        />
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          inputMode={numeric ? "numeric" : undefined}
          dir={numeric ? "ltr" : undefined}
          className={cn(
            "pr-10 pl-11",
            numeric && "text-left",
            error && "border-destructive focus-visible:ring-destructive/30",
          )}
          aria-invalid={Boolean(error)}
          {...register}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label={showPassword ? "مخفی کردن رمز" : "نمایش رمز"}
        >
          {showPassword ? (
            <EyeOff className="size-4" strokeWidth={1.75} />
          ) : (
            <Eye className="size-4" strokeWidth={1.75} />
          )}
        </button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
