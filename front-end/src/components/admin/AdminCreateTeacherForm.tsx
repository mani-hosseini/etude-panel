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
import { audienceError } from "@/lib/api/errors";
import { announceSaved } from "@/lib/save-feedback";

type AdminCreateTeacherFormProps = {
  onClose: () => void;
};

export function AdminCreateTeacherForm({
  onClose,
}: AdminCreateTeacherFormProps) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [title, setTitle] = useState("استاد پیانو");
  const [instrument, setInstrument] = useState("پیانو");
  const [room, setRoom] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      adminApi.createTeacher({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nationalId: nationalId.trim(),
        title: title.trim(),
        instrument: instrument.trim(),
        room: room.trim() || undefined,
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined,
      }),
    onSuccess: async () => {
      announceSaved("استاد ثبت شد.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
      onClose();
    },
    onError: (err) => {
      setError(audienceError(err, "ثبت استاد انجام نشد."));
    },
  });

  return (
    <Card className="rounded-2xl border-brand/20 bg-brand/5 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">استاد جدید</h3>
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

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          create.mutate();
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <div className="space-y-1.5">
          <Label htmlFor="teacher-firstName">نام</Label>
          <Input
            id="teacher-firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="rounded-xl bg-white"
            required
            minLength={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="teacher-lastName">نام خانوادگی</Label>
          <Input
            id="teacher-lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="rounded-xl bg-white"
            required
            minLength={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="teacher-nationalId">کد ملی</Label>
          <Input
            id="teacher-nationalId"
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
          <Label htmlFor="teacher-title">عنوان</Label>
          <Input
            id="teacher-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl bg-white"
            placeholder="استاد پیانو"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="teacher-instrument">ساز</Label>
          <Input
            id="teacher-instrument"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            className="rounded-xl bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="teacher-room">اتاق / استودیو</Label>
          <Input
            id="teacher-room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="rounded-xl bg-white"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="teacher-phone">تلفن</Label>
          <Input
            id="teacher-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-xl bg-white"
            dir="ltr"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="teacher-bio">معرفی کوتاه</Label>
          <Input
            id="teacher-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="rounded-xl bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button
            type="submit"
            className="rounded-xl"
            disabled={create.isPending}
          >
            <Plus className="size-4" />
            {create.isPending ? "در حال ثبت…" : "ثبت استاد"}
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
