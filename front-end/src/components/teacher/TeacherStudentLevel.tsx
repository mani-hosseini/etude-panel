"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { StudentLevelSelect } from "@/components/admin/StudentLevelSelect";
import { audienceError } from "@/lib/api/errors";
import { studioApi } from "@/lib/api/studio";
import { studioKeys } from "@/lib/api/studio-queries";
import { announceSaved } from "@/lib/save-feedback";
import { parseStudentLevel } from "@/lib/student-level";

export function TeacherStudentLevel({
  studentId,
  level,
}: {
  studentId: string;
  level: number | string | null | undefined;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(String(parseStudentLevel(level)));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(String(parseStudentLevel(level)));
  }, [level]);

  const save = useMutation({
    mutationFn: (next: number) => studioApi.setLevel(studentId, next),
    onSuccess: async (result) => {
      setError(null);
      setValue(String(result.level));
      announceSaved(`سطح هنرجو ${result.level} ذخیره شد.`);
      await queryClient.invalidateQueries({ queryKey: studioKeys.students });
      await queryClient.invalidateQueries({ queryKey: studioKeys.overview });
      await queryClient.invalidateQueries({
        queryKey: studioKeys.student(studentId),
      });
    },
    onError: (err) => {
      setValue(String(parseStudentLevel(level)));
      setError(audienceError(err, "سطح هنرجو ذخیره نشد."));
    },
  });

  return (
    <div
      className="space-y-1.5"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <StudentLevelSelect
        value={value}
        disabled={save.isPending}
        onValueChange={(next) => {
          setValue(next);
          save.mutate(Number(next));
        }}
      />
      {error ? <p className="text-[11px] text-rose-600">{error}</p> : null}
    </div>
  );
}
