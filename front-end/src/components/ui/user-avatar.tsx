"use client";

import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { copy } from "@/constants/copy";
import { resolveAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  avatarUrl: string | null | undefined;
  alt: string;
  className?: string;
};

/** Uploaded photo, or the Etude logo if missing/broken. */
export function UserAvatar({ avatarUrl, alt, className }: UserAvatarProps) {
  const resolved = resolveAvatarUrl(avatarUrl);
  const [src, setSrc] = useState(resolved);

  useEffect(() => {
    setSrc(resolved);
  }, [resolved]);

  return (
    <Avatar className={cn("rounded-full ring-1 ring-slate-200", className)}>
      <AvatarImage
        src={src}
        alt={alt}
        className="object-cover"
        onError={() => {
          if (src !== copy.defaultAvatar) setSrc(copy.defaultAvatar);
        }}
      />
      <AvatarFallback className="bg-white p-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={copy.defaultAvatar}
          alt=""
          className="size-full object-cover"
        />
      </AvatarFallback>
    </Avatar>
  );
}
