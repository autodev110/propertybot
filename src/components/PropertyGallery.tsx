"use client";

import { useMemo, useState } from "react";

interface PropertyGalleryProps {
  photos?: string[];
  className?: string;
}

function cx(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function dedupePhotos(list?: string[]) {
  if (!list || list.length === 0) return [];
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const url = raw.trim();
    if (!url.startsWith("http")) continue;
    const normalized = url.split("?")[0];
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    cleaned.push(url);
  }
  return cleaned;
}

export function PropertyGallery({ photos, className }: PropertyGalleryProps) {
  const images = useMemo(() => dedupePhotos(photos), [photos]);
  const [start, setStart] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (typeof window !== "undefined") {
    // Debug logging to surface missing photos
    console.info("[PropertyGallery] render", {
      totalPhotos: images.length,
      sample: images.slice(0, 5),
    });
  }

  const showControls = images.length > 3;
  const visible =
    images.length === 0
      ? []
      : Array.from({ length: Math.min(3, images.length) }, (_, idx) => {
          const absoluteIdx = (start + idx) % images.length;
          return { src: images[absoluteIdx], absoluteIdx };
        });

  const handlePrev = () => {
    if (!images.length) return;
    setStart((prev) => (prev - 3 + images.length) % images.length);
  };

  const handleNext = () => {
    if (!images.length) return;
    setStart((prev) => (prev + 3) % images.length);
  };

  const openLightbox = (absoluteIdx: number) => {
    setLightboxIdx(absoluteIdx);
  };

  const closeLightbox = () => setLightboxIdx(null);

  const stepLightbox = (delta: number) => {
    if (lightboxIdx === null || images.length === 0) return;
    const next = (lightboxIdx + delta + images.length) % images.length;
    setLightboxIdx(next);
  };

  return (
    <div className={cx("relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900", className)}>
      <div className="flex items-center gap-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200">
        <span>Gallery</span>
        {images.length > 0 && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-100">
            {images.length} photos
          </span>
        )}
      </div>
      <div className="relative flex min-h-[200px] items-stretch bg-black">
        {visible.length > 0 ? (
          visible.map(({ src, absoluteIdx }, idx) => (
            <button
              type="button"
              key={`${src}-${idx}`}
              className="relative h-full flex-1 overflow-hidden"
              onClick={() => openLightbox(absoluteIdx)}
            >
              <div className="relative h-full w-full">
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <img
                    src={src}
                    alt="Property"
                    className="h-full w-full object-cover transition duration-300 ease-out hover:scale-[1.03]"
                    loading={idx === 0 ? "eager" : "lazy"}
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
              </div>
            </button>
          ))
        ) : (
          <div className="flex w-full flex-1 items-center justify-center bg-slate-800 text-sm text-slate-200">
            No photos available
          </div>
        )}

        {showControls && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-900 shadow-md transition hover:bg-white"
              onClick={handlePrev}
              aria-label="Previous photos"
            >
              ←
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-900 shadow-md transition hover:bg-white"
              onClick={handleNext}
              aria-label="Next photos"
            >
              →
            </button>
          </>
        )}
      </div>

      {lightboxIdx !== null && images[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
          onClick={closeLightbox}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[lightboxIdx]}
              alt="Property full view"
              className="h-full w-full max-h-[80vh] object-contain bg-slate-900"
            />
            <button
              className="absolute right-3 top-3 rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-slate-900 shadow hover:bg-white"
              onClick={closeLightbox}
            >
              Close
            </button>
            {images.length > 1 && (
              <>
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-900 shadow hover:bg-white"
                  onClick={() => stepLightbox(-1)}
                  aria-label="Previous photo"
                >
                  ←
                </button>
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-900 shadow hover:bg-white"
                  onClick={() => stepLightbox(1)}
                  aria-label="Next photo"
                >
                  →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
