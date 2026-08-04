"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type EtudeLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function EtudeLogo({
  size = 96,
  className,
  priority = false,
}: EtudeLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="ETUDE"
      width={size}
      height={size}
      priority={priority}
      className={cn("select-none object-contain", className)}
    />
  );
}
