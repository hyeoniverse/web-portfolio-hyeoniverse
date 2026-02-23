import {
  experiences,
  skillGroups,
  philosophy,
  approachSteps,
  certifications,
  awards,
} from "@/data/profile";
import type { ProfileData } from "@/types/profile";

const staticProfileData: ProfileData = {
  experiences,
  skillGroups,
  philosophy,
  approachSteps,
  certifications,
  awards,
};

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

    const config = data.config as Partial<ProfileData>;

    // 각 섹션에 대해 DB 데이터가 있으면 사용, 없으면 정적 fallback
    return {
      experiences: config.experiences ?? staticProfileData.experiences,
      skillGroups: config.skillGroups ?? staticProfileData.skillGroups,
      philosophy: config.philosophy ?? staticProfileData.philosophy,
      approachSteps: config.approachSteps ?? staticProfileData.approachSteps,
      certifications: config.certifications ?? staticProfileData.certifications,
      awards: config.awards ?? staticProfileData.awards,
    };
  } catch {
    return staticProfileData;
  }
}
