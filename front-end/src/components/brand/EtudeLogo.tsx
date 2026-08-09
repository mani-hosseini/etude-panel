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
      src="/etude-logo.png"
      alt="ETUDE"
      width={size}
      height={size}
      priority={priority}
      sizes={`${size}px`}
      className={cn("select-none object-contain bg-transparent", className)}
    />
  );
}
