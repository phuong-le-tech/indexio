"use client";

import { useState } from "react";
import { LinkIcon } from "@/components/ui/Icon";

interface LinkThumbnailProps {
  imageUrl: string | null;
  faviconUrl: string | null;
  host: string;
}

// Fixed 16:9 box in every state, so a late-loading image never shifts the grid.
export function LinkThumbnail({ imageUrl, faviconUrl, host }: LinkThumbnailProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [faviconFailed, setFaviconFailed] = useState(false);
  const showImage = imageUrl !== null && imageUrl !== failedImageUrl;

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-[var(--color-inset)]">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote scraped images from arbitrary hosts; next/image would need an allowlist
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedImageUrl(imageUrl)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-[var(--color-ink-3)]">
          {faviconUrl && !faviconFailed ? (
            // eslint-disable-next-line @next/next/no-img-element -- tiny remote favicon
            <img
              src={faviconUrl}
              alt=""
              width={28}
              height={28}
              referrerPolicy="no-referrer"
              onError={() => setFaviconFailed(true)}
              className="h-7 w-7 rounded-[var(--radius-sm)]"
            />
          ) : (
            <LinkIcon size={26} />
          )}
          <span className="max-w-full truncate font-mono text-[length:var(--text-xs)]">{host}</span>
        </div>
      )}
    </div>
  );
}
