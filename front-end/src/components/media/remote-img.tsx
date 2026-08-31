"use client";

import { useEffect, useState, type ReactNode } from "react";

type RemoteImgProps = {
  src: string;
  alt: string;
  className?: string;
  fallback: ReactNode;
};

/** `<img>` that swaps to `fallback` when the file 404s or fails to load. */
export function RemoteImg({ src, alt, className, fallback }: RemoteImgProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
