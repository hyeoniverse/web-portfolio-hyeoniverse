"use client";

import Image from "next/image";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import shared from "../AboutSection.module.css";
import local from "./VisualBreakPanel.module.css";

export default function VisualBreakPanel() {
  const cfg = useSiteConfig();
  const src = cfg.about.visualBreakImage
    || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=1000&fit=crop";
  return (
    <div className={`${shared.breakPanel} ${local.visualBreak}`}>
      <Image
        src={src}
        alt="Visual break"
        fill
        sizes="50vw"
        style={{ objectFit: "cover" }}
      />
    </div>
  );
}
