import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * 커버가 없는 글의 공유 카드(1200×630) — 글 제목으로 그린다.
 * 공유 카드(og:image)가 비면 링크 미리보기가 사이트 기본 그림만 보여, 글마다 무엇인지 알 수 없었다.
 * public/og-default.png 와 같은 결(어두운 바탕 · 점 격자 · 액센트 빛 · 왼쪽 위 브랜드)로 맞춘다.
 *
 * next/og(satori)는 글자를 글꼴 윤곽선으로 그려 시스템 글꼴을 읽지 않는다 — 한글을 그리려면 글꼴 파일이 있어야 한다.
 * 사이트 본문 글꼴(Pretendard)을 node_modules 에서 읽는다(woff — satori 는 woff2 를 못 읽는다).
 * 배포 묶음에 들어가게 next.config 의 outputFileTracingIncludes 에 같은 경로를 둔다.
 */
export const OG_SIZE = { width: 1200, height: 630 };

export const PRETENDARD_WOFF = "node_modules/pretendard/dist/web/static/woff";

export interface PostCardInput {
  title: string;
  /** 카테고리 이름(백엔드 등) — 비면 숨긴다 */
  category?: string;
  /** 태그 — 앞의 셋만 */
  tags?: string[];
  /** YYYY-MM-DD */
  date?: string;
  siteName: string;
  /** 오른쪽 아래 주소(hyeoniverse.com) */
  host: string;
  /** 브랜드 액센트(#rrggbb) */
  accent: string;
}

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 500 | 700; style: "normal" }[]> | null = null;
function loadFonts() {
  // 1MB 남짓한 글꼴 둘 — 인스턴스마다 한 번만 읽는다
  fontsPromise ??= Promise.all([
    readFile(join(process.cwd(), PRETENDARD_WOFF, "Pretendard-Medium.woff")),
    readFile(join(process.cwd(), PRETENDARD_WOFF, "Pretendard-Bold.woff")),
  ]).then(([medium, bold]) => [
    { name: "Pretendard", data: medium, weight: 500, style: "normal" },
    { name: "Pretendard", data: bold, weight: 700, style: "normal" },
  ]);
  return fontsPromise;
}

/** 제목 길이에 따라 글자 크기 — 세 줄 안에 들게 */
function titleSize(title: string): number {
  const n = [...title].length;
  if (n <= 18) return 76;
  if (n <= 34) return 64;
  if (n <= 52) return 54;
  return 46;
}

/** 4점 별(사이트 로고의 ✦) */
function Star({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 0 C12.9 7.2 16.8 11.1 24 12 C16.8 12.9 12.9 16.8 12 24 C11.1 16.8 7.2 12.9 0 12 C7.2 11.1 11.1 7.2 12 0 Z" fill={color} />
    </svg>
  );
}

export async function renderPostCard(input: PostCardInput): Promise<ImageResponse> {
  const { title, category, tags = [], date, siteName, host, accent } = input;
  const fonts = await loadFonts();
  const brand = siteName.toUpperCase();
  // 사이트 이름이 HYEONIVERSE 면 로고처럼 IVERSE 를 액센트로
  const split = brand.endsWith("IVERSE") && brand.length > 6 ? brand.length - 6 : brand.length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "64px 80px",
          background: "#0b0b0c",
          backgroundImage: `radial-gradient(circle at 0% 0%, ${accent}33 0%, transparent 38%), radial-gradient(circle at 100% 100%, ${accent}2b 0%, transparent 42%), radial-gradient(circle, #ffffff14 1.2px, transparent 1.2px)`,
          backgroundSize: "100% 100%, 100% 100%, 28px 28px",
          color: "#f5f5f0",
          fontFamily: "Pretendard",
        }}
      >
        {/* 브랜드 */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Star color="#ffffff" size={40} />
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: 3 }}>
            <span>{brand.slice(0, split)}</span>
            <span style={{ color: accent }}>{brand.slice(split)}</span>
          </div>
        </div>

        {/* 본문 — 카테고리 · 제목 */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "auto", gap: 26 }}>
          {category ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 28, fontWeight: 500, color: "#a1a1aa" }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: accent }} />
              <span>{category}</span>
            </div>
          ) : null}
          {/* 단어마다 감싼다 — satori 는 word-break: keep-all 을 따르지 않아 한글 단어 한가운데서 줄을 바꿨다.
              세 줄을 넘으면 잘리게 높이를 묶는다(lineClamp 는 블록 글자에만 걸려 여기선 못 쓴다) */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              columnGap: Math.round(titleSize(title) * 0.28),
              fontSize: titleSize(title),
              fontWeight: 700,
              lineHeight: 1.28,
              letterSpacing: -1,
              maxWidth: 1040,
              maxHeight: Math.ceil(titleSize(title) * 1.28 * 3),
              overflow: "hidden",
            }}
          >
            {title.split(/\s+/).filter(Boolean).map((word, i) => (
              <span key={i}>{word}</span>
            ))}
          </div>
        </div>

        {/* 아래 — 태그 · 날짜 · 주소 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, fontWeight: 500, color: "#a1a1aa" }}>
          {tags.slice(0, 3).map((tag) => (
            <div key={tag} style={{ display: "flex", padding: "6px 16px", borderRadius: 999, border: "1.5px solid #ffffff2e", color: "#d4d4d8" }}>
              #{tag}
            </div>
          ))}
          <div style={{ display: "flex", marginLeft: "auto", alignItems: "center", gap: 14 }}>
            {date ? <span>{date.replace(/-/g, ". ")}</span> : null}
            {date ? <span style={{ color: "#52525b" }}>·</span> : null}
            <div style={{ width: 10, height: 10, borderRadius: 5, background: accent }} />
            <span>{host}</span>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
