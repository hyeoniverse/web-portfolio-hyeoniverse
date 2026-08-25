import {
  experiences,
  skillGroups,
  philosophy,
  approachSteps,
  certifications,
  awards,
  bunnyProfile,
  profileInfoBlocks,
} from "@/data/profile";
import type { DatePeriod, Experience, Certification, Award } from "@/data/profile";
import type { ProfileData } from "@/types/profile";

const staticProfileData: ProfileData = {
  experiences,
  skillGroups,
  philosophy,
  approachSteps,
  certifications,
  awards,
  bunny: bunnyProfile,
  infoBlocks: profileInfoBlocks,
};

/* ── Migration helpers (old → new DatePeriod) ── */

/** 구 LocalizedText period → DatePeriod */
function migratePeriodText(period: unknown): DatePeriod {
  if (
    period &&
    typeof period === "object" &&
    "format" in (period as Record<string, unknown>)
  ) {
    return period as DatePeriod;
  }

  // Old LocalizedText: { ko: "2024 - 현재", en: "2024 - Present" }
  const text =
    (period as Record<string, string>)?.ko ||
    (period as Record<string, string>)?.en ||
    "";

  const rangeMatch = text.match(/^(\d{4})\s*[-–]\s*(.+)$/);
  if (rangeMatch) {
    const start = rangeMatch[1];
    const endText = rangeMatch[2].trim();
    const ongoing = endText === "현재" || endText === "Present";
    return {
      start,
      end: ongoing ? undefined : endText,
      ongoing: ongoing || undefined,
      format: "year",
    };
  }

  return { start: text, format: "year" };
}

/** 구 year: string → DatePeriod */
function migrateYear(item: Record<string, unknown>): DatePeriod {
  if (item.period && typeof item.period === "object" && "format" in (item.period as Record<string, unknown>)) {
    return item.period as DatePeriod;
  }
  const year = (item.year as string) || "";
  return { start: year, format: "year" };
}

function migrateExperiences(raw: unknown[]): Experience[] {
  return raw.map((item) => {
    const exp = item as Record<string, unknown>;
    return {
      ...exp,
      period: migratePeriodText(exp.period),
    } as Experience;
  });
}

function migrateCertifications(raw: unknown[]): Certification[] {
  return raw.map((item) => {
    const cert = item as Record<string, unknown>;
    return {
      period: migrateYear(cert),
      name: cert.name,
      issuer: cert.issuer,
    } as Certification;
  });
}

function migrateAwards(raw: unknown[]): Award[] {
  return raw.map((item) => {
    const award = item as Record<string, unknown>;
    return {
      period: migrateYear(award),
      name: award.name,
      organization: award.organization,
    } as Award;
  });
}

/**
 * Fetch profile data — Supabase 설정 시 DB에서, 아니면 정적 데이터에서 반환.
 */
export async function getProfileData(): Promise<ProfileData> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return staticProfileData;
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("site_settings")
      .select("config")
      .eq("id", "profile")
      .single();

    if (error || !data?.config) {
      return staticProfileData;
    }

    // 새 형식: { data, savedDefaults } / 레거시: 전체 ProfileData
    const raw = data.config as Record<string, unknown>;
    const config = (raw.data && raw.savedDefaults
      ? raw.data
      : raw) as Record<string, unknown[]>;

    // 각 섹션에 대해 DB 데이터가 있으면 사용 (마이그레이션 적용), 없으면 정적 fallback
    return {
      experiences: config.experiences
        ? migrateExperiences(config.experiences)
        : staticProfileData.experiences,
      skillGroups: (config.skillGroups as ProfileData["skillGroups"]) ?? staticProfileData.skillGroups,
      github: (config.github as unknown as ProfileData["github"]) ?? staticProfileData.github,
      philosophy: (config.philosophy as ProfileData["philosophy"]) ?? staticProfileData.philosophy,
      approachSteps: (config.approachSteps as ProfileData["approachSteps"]) ?? staticProfileData.approachSteps,
      certifications: config.certifications
        ? migrateCertifications(config.certifications)
        : staticProfileData.certifications,
      awards: config.awards
        ? migrateAwards(config.awards)
        : staticProfileData.awards,
      bunny: (config.bunny as unknown as ProfileData["bunny"]) ?? staticProfileData.bunny,
      infoBlocks:
        (config.infoBlocks as unknown as ProfileData["infoBlocks"]) ?? staticProfileData.infoBlocks,
    };
  } catch {
    return staticProfileData;
  }
}
