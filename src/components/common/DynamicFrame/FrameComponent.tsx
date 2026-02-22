"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";

export interface FrameComponentProps {
  video?: string;
  image?: string;
  width: number | string;
  height: number | string;
  className?: string;
  mediaSize: number;
  borderThickness: number;
  borderSize: number;
  showFrame: boolean;
  autoplayMode: "all" | "hover";
  isHovered: boolean;
}

export function FrameComponent({
  video,
  image,
  width,
  height,
  className = "",
  mediaSize,
  borderThickness,
  borderSize,
  showFrame,
  autoplayMode,
  isHovered,
}: FrameComponentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!video) return;
    if (autoplayMode === "all") {
      videoRef.current?.play().catch(() => {});
    } else if (autoplayMode === "hover") {
      if (isHovered) {
        videoRef.current?.play().catch(() => {});
      } else {
        videoRef.current?.pause();
      }
    }
  }, [isHovered, autoplayMode, video]);

  return (
    <div
      className={`relative ${className}`}
      style={{
        width,
        height,
        transition: "width 0.3s ease-in-out, height 0.3s ease-in-out",
      }}
    >
      <div className="relative w-full h-full overflow-hidden">
        {/* Media with Border */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            zIndex: 1,
            transition: "all 0.3s ease-in-out",
            padding: showFrame ? `${borderThickness}px` : "0",
            width: showFrame ? `${borderSize}%` : "100%",
            height: showFrame ? `${borderSize}%` : "100%",
            left: showFrame ? `${(100 - borderSize) / 2}%` : "0",
            top: showFrame ? `${(100 - borderSize) / 2}%` : "0",
          }}
        >
          <div
            className="w-full h-full overflow-hidden"
            style={{
              transform: `scale(${mediaSize})`,
              transformOrigin: "center",
              transition: "transform 0.3s ease-in-out",
            }}
          >
            {image ? (
              <Image
                className="w-full h-full object-cover"
                src={image}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized
              />
            ) : video ? (
              <video
                className="w-full h-full object-cover"
                src={video}
                loop
                muted
                playsInline
                preload="none"
                autoPlay={
                  autoplayMode === "all" ||
                  (autoplayMode === "hover" && isHovered)
                }
                ref={videoRef}
                onMouseEnter={(e) => {
                  if (autoplayMode === "hover") {
                    e.currentTarget.play().catch(() => {});
                  }
                }}
                onMouseLeave={(e) => {
                  if (autoplayMode === "hover") {
                    e.currentTarget.pause();
                  }
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
