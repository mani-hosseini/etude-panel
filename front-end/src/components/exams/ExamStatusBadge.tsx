import { Badge } from "@/components/ui/badge";

export type ExamStatusValue = "DRAFT" | "PUBLISHED" | "CLOSED";

export const EXAM_STATUS_LABEL: Record<ExamStatusValue, string> = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "فعال",
  CLOSED: "بسته‌شده",
};

const EXAM_STATUS_VARIANT: Record<
  ExamStatusValue,
  "secondary" | "success" | "warning"
> = {
  DRAFT: "secondary",
  PUBLISHED: "success",
  CLOSED: "warning",
};

export function ExamStatusBadge({ status }: { status: ExamStatusValue }) {
  return (
    <Badge variant={EXAM_STATUS_VARIANT[status]}>
      {EXAM_STATUS_LABEL[status]}
    </Badge>
  );
}
