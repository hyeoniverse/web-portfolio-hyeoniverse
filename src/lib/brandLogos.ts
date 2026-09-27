/* 브랜드 로고 기본 경로 + 숏(favicon·네비)/풀(로딩 스크린) 상호 폴백.
   site.config 의 brand 기본값이 이 상수들을 쓰므로 여기서 site.config 를 import 하면 순환이다. */

// 기본 로고 = public 자산. 이름의 dark/light 는 잉크 색(라이트 테마 = 어두운 잉크).
export const DEFAULT_LOGO_SHORT = "/images/logo/mark-dark/tight.png";
export const DEFAULT_LOGO_SHORT_DARK = "/images/logo/mark-light/tight.png";
export const DEFAULT_LOGO_FULL = "/images/logo/wordmark-dark.svg";
export const DEFAULT_LOGO_FULL_DARK = "/images/logo/wordmark-light.svg";

type BrandLogoFields = {
  logoShortUrl?: string;
  logoShortDarkUrl?: string;
  logoFullUrl?: string;
  logoFullDarkUrl?: string;
  logoShortColor?: string;
  logoShortColorDark?: string;
  logoFullColor?: string;
  logoFullColorDark?: string;
};

type LogoSlot = { light: string; dark: string; colorLight: string; colorDark: string };

export interface ResolvedBrandLogos {
  /** favicon·네비게이션이 쓰는 숏 로고 */
  short: LogoSlot;
  /** 로딩 스크린이 쓰는 풀 로고 */
  full: LogoSlot;
}

/** 숏/풀 중 한쪽만 커스텀 업로드돼 있으면 그 업로드본을 양쪽에 쓴다 — 마크만 올리면
 *  로딩 스크린도 그 마크, 워드마크만 올리면 favicon·네비도 그 워드마크. "커스텀"의 판정은
 *  값이 코드 기본(public 경로)과 다른 것. 리컬러 색은 자산을 가져온 슬롯의 색을 따라간다. */
export function resolveBrandLogos(brand: BrandLogoFields): ResolvedBrandLogos {
  const shortSlot: LogoSlot = {
    light: brand.logoShortUrl ?? "",
    dark: brand.logoShortDarkUrl ?? "",
    colorLight: brand.logoShortColor ?? "",
    colorDark: brand.logoShortColorDark ?? "",
  };
  const fullSlot: LogoSlot = {
    light: brand.logoFullUrl ?? "",
    dark: brand.logoFullDarkUrl ?? "",
    colorLight: brand.logoFullColor ?? "",
    colorDark: brand.logoFullColorDark ?? "",
  };
  const shortCustom =
    (!!shortSlot.light && shortSlot.light !== DEFAULT_LOGO_SHORT) ||
    (!!shortSlot.dark && shortSlot.dark !== DEFAULT_LOGO_SHORT_DARK);
  const fullCustom =
    (!!fullSlot.light && fullSlot.light !== DEFAULT_LOGO_FULL) ||
    (!!fullSlot.dark && fullSlot.dark !== DEFAULT_LOGO_FULL_DARK);
  return {
    short: !shortCustom && fullCustom ? fullSlot : shortSlot,
    full: !fullCustom && shortCustom ? shortSlot : fullSlot,
  };
}
