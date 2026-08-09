import { cn } from "@/lib/utils";

type PianoKeysBarProps = {
  className?: string;
};

export function PianoKeysBar({ className }: PianoKeysBarProps) {
  return (
    <div
      aria-hidden
      className={cn("piano-stripe h-2 w-full overflow-hidden rounded-full", className)}
    />
  );
}
