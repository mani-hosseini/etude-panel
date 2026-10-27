"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { StarRating } from "@/components/ui/star-rating";
import { studioApi } from "@/lib/api/studio";
import { studioKeys } from "@/lib/api/studio-queries";
import { announceSaved } from "@/lib/save-feedback";

export function TeacherStudentStars({
  studentId,
  stars,
  size = "md",
  tone = "light",
}: {
  studentId: string;
  stars: number;
  size?: "sm" | "md";
  tone?: "light" | "onDark";
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(stars);

  useEffect(() => {
    setValue(stars);
  }, [stars]);

  const save = useMutation({
    mutationFn: (next: number) => studioApi.setStars(studentId, next),
    onSuccess: async () => {
      announceSaved("ستاره هنرجو ذخیره شد.");
      await queryClient.invalidateQueries({ queryKey: studioKeys.students });
      await queryClient.invalidateQueries({ queryKey: studioKeys.overview });
      await queryClient.invalidateQueries({
        queryKey: studioKeys.student(studentId),
      });
    },
  });

  return (
    <div
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <StarRating
        value={value}
        size={size}
        tone={tone}
        onChange={(next) => {
          setValue(next);
          save.mutate(next);
        }}
      />
    </div>
  );
}
