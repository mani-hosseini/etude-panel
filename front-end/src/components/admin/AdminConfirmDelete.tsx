"use client";

import { Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type AdminConfirmDeleteProps = {
  title: string;
  description: string;
  onConfirm: () => void;
  disabled?: boolean;
  triggerLabel?: string;
  iconOnly?: boolean;
};

export function AdminConfirmDelete({
  title,
  description,
  onConfirm,
  disabled,
  triggerLabel = "حذف",
  iconOnly = true,
}: AdminConfirmDeleteProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size={iconOnly ? "icon" : "sm"}
          variant="ghost"
          disabled={disabled}
          className={
            iconOnly
              ? "size-9 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              : "rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          }
        >
          <Trash2 className="size-4" />
          {iconOnly ? null : triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">انصراف</AlertDialogCancel>
          <AlertDialogAction
            className="rounded-xl bg-rose-600 hover:bg-rose-700"
            onClick={onConfirm}
          >
            حذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
