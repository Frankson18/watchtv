"use client";

import { posterUrl } from "@/lib/images";
import { useState } from "react";

export default function Poster({
  path,
  alt,
  size = "w185",
  className = "",
}: {
  path: string | null;
  alt: string;
  size?: "w92" | "w154" | "w185" | "w342" | "w500";
  className?: string;
}) {
  const [err, setErr] = useState(false);
  const src = posterUrl(path, size);
  if (!src || err) {
    return (
      <div
        className={`bg-bg-elev-2 rounded-md flex items-center justify-center text-text-tertiary text-[10px] font-medium px-2 text-center ${className}`}
      >
        {alt.slice(0, 24) || "—"}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErr(true)}
      className={`rounded-md object-cover ${className}`}
    />
  );
}