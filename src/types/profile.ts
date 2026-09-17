import type { LocalizedText } from "@/types/common";
import type {
  DatePeriod,
  Experience,
  SkillGroup,
  Philosophy,
  ApproachStep,
  Certification,
  Award,
} from "@/data/profile";

export type { DatePeriod };

/** 프로필 페이지의 GitHub 영역 설정. */
export interface ProfileGithubConfig {
  /** GitHub 사용자명. 비우면 소유자 저자 프로필의 GitHub 링크에서 뽑는다. */
  login?: string;
  /** 보여줄 저장소 이름 — 적은 순서대로 나온다. 비면 지표만 표시한다. */
  repos?: string[];
  /** 저장소를 더 끌어올 조직 이름. 공개 소속 조직은 적지 않아도 자동으로 잡히고,
      소속을 비공개로 둔 조직만 여기에 적으면 된다. */
  orgs?: string[];
  /** 이 영역 자체를 끄는 스위치. */
  enabled?: boolean;
}

/**
 * MEET 패널(몽이) 소개 문구.
 *
 * 예전에는 번역 파일(bunny.*)에만 있어서 설정에서 손댈 수 없었다. 사이트 문구가 아니라
 * 프로필 페이지의 내용이므로 다른 프로필 섹션과 같은 자리에 둔다.
 */
export interface BunnyProfile {
  name: LocalizedText;
  subtitle: LocalizedText;
  /** 소개 문단. 개수 제한 없음 — 예전의 story1~3 을 목록으로 폈다. */
  stories: LocalizedText[];
}

/**
 * Profile 패널에 떠 있는 정보 창의 내용.
 *
 * 자리(x·y·너비)는 레이아웃이라 코드에 남기고, 읽히는 값만 설정으로 뺀다.
 * key 는 창의 자리와 짝지어지는 식별자다 — 바꾸면 그 블록이 화면에서 사라진다.
 */
export interface ProfileInfoBlock {
  key: string;
  lines: { label: string; value: string }[];
}

/** Profile data blob stored in site_settings.config JSONB */
export interface ProfileData {
  experiences: Experience[];
  skillGroups: SkillGroup[];
  philosophy: Philosophy[];
  approachSteps: ApproachStep[];
  certifications: Certification[];
  awards: Award[];
  github?: ProfileGithubConfig;
  bunny?: BunnyProfile;
  infoBlocks?: ProfileInfoBlock[];
}
